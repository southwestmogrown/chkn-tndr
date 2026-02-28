/**
 * Socket.io event handlers for real-time session management.
 *
 * Room strategy: each session gets its own Socket.io room `session:{sessionId}`.
 * A ready-set tracks who has pressed "I'm ready" before swiping begins.
 * All members must be ready for the session to auto-start.
 */

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { sessionService } from "../services/session.service";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";

// In-memory ready sets: sessionId → Set<userId>
const readySets = new Map<string, Set<string>>();

export function registerSessionSocket(
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
) {
  io.on("connection", (socket) => {
    logger.debug("Socket connected", { socketId: socket.id });

    // ─── session:join ──────────────────────────────────────────────────────────

    socket.on("session:join", async ({ sessionId, token }) => {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as {
          userId: string;
          displayName: string;
        };

        // Confirm session exists
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: { group: { include: { members: true } } },
        });
        if (!session) throw new Error("Session not found");

        const isMember = session.group.members.some(
          (m) => m.userId === payload.userId,
        );
        if (!isMember) throw new Error("Not a group member");

        // Attach socket metadata
        socket.data.userId = payload.userId;
        socket.data.sessionId = sessionId;
        socket.data.displayName = payload.displayName;

        await socket.join(`session:${sessionId}`);

        // Broadcast to other members
        socket.to(`session:${sessionId}`).emit("session:memberJoined", {
          userId: payload.userId,
          displayName: payload.displayName,
        });

        logger.info("User joined session", {
          userId: payload.userId,
          sessionId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Join failed";
        socket.emit("session:error", { message });
      }
    });

    // ─── session:ready ─────────────────────────────────────────────────────────

    socket.on("session:ready", async ({ sessionId }) => {
      try {
        const userId = socket.data.userId;
        if (!userId) throw new Error("Not authenticated");

        if (!readySets.has(sessionId)) readySets.set(sessionId, new Set());
        readySets.get(sessionId)!.add(userId);

        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: { group: { include: { members: true } } },
        });
        if (!session) throw new Error("Session not found");

        const totalCount = session.group.members.length;
        const readyCount = readySets.get(sessionId)!.size;

        io.to(`session:${sessionId}`).emit("session:memberReady", {
          userId,
          readyCount,
          totalCount,
        });

        // Auto-start when everyone is ready (or after 60s timeout in prod)
        if (readyCount >= totalCount) {
          await sessionService.startSession(sessionId);
          io.to(`session:${sessionId}`).emit("session:started", { sessionId });
          logger.info("Session started", { sessionId });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ready failed";
        socket.emit("session:error", { message });
      }
    });

    // ─── session:vote ──────────────────────────────────────────────────────────

    socket.on(
      "session:vote",
      async ({ sessionId, restaurantId, direction }) => {
        try {
          const userId = socket.data.userId;
          if (!userId) throw new Error("Not authenticated");

          await sessionService.castVote(
            sessionId,
            restaurantId,
            userId,
            direction,
          );

          if (direction === "RIGHT") {
            const yesCount = await sessionService.getYesCount(
              sessionId,
              restaurantId,
            );
            io.to(`session:${sessionId}`).emit("session:voteReceived", {
              restaurantId,
              yesCount,
            });
          }

          // Check if all members have voted on all restaurants
          const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: { group: { include: { members: true } } },
          });

          if (session?.status === "SWIPING") {
            const allDone = await Promise.all(
              session.group.members.map((m) =>
                sessionService.hasUserVotedOnAll(sessionId, m.userId),
              ),
            );

            if (allDone.every(Boolean)) {
              const result = await sessionService.completeSession(sessionId);
              io.to(`session:${sessionId}`).emit("session:complete", result);
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Vote failed";
          socket.emit("session:error", { message });
        }
      },
    );

    // ─── session:leave ─────────────────────────────────────────────────────────

    socket.on("session:leave", ({ sessionId }) => {
      socket.leave(`session:${sessionId}`);
      if (socket.data.userId) {
        socket.to(`session:${sessionId}`).emit("session:memberLeft", {
          userId: socket.data.userId,
        });
      }
    });

    // ─── disconnect ────────────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      const { userId, sessionId } = socket.data;
      if (sessionId && userId) {
        socket
          .to(`session:${sessionId}`)
          .emit("session:memberLeft", { userId });
        readySets.get(sessionId)?.delete(userId);
      }
      logger.debug("Socket disconnected", { socketId: socket.id });
    });
  });
}
