/**
 * useSocket — manages the Socket.io connection for a session.
 * Automatically re-emits join when the connection is established.
 */

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth.store";
import { useSessionStore } from "../store/session.store";
import type { ServerToClientEvents, ClientToServerEvents } from "../types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(sessionId: string | null) {
  const socketRef = useRef<AppSocket | null>(null);
  const token = useAuthStore((s) => s.token);
  const { markStarted, markReady, markComplete, updateYesCount } =
    useSessionStore();

  useEffect(() => {
    if (!sessionId || !token) return;

    const socket: AppSocket = io({
      path: "/socket.io",
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("session:join", { sessionId, token });
    });

    socket.on("session:memberReady", (payload) => {
      markReady(payload);
    });

    socket.on("session:started", () => {
      markStarted();
    });

    socket.on("session:voteReceived", ({ restaurantId, yesCount }) => {
      updateYesCount(restaurantId, yesCount);
    });

    socket.on("session:complete", ({ winner, tally }) => {
      markComplete(winner, tally);
    });

    return () => {
      socket.emit("session:leave", { sessionId });
      socket.disconnect();
    };
  }, [sessionId, token]);

  function emitReady() {
    if (sessionId) socketRef.current?.emit("session:ready", { sessionId });
  }

  function emitVote(restaurantId: string, direction: "LEFT" | "RIGHT") {
    if (sessionId)
      socketRef.current?.emit("session:vote", {
        sessionId,
        restaurantId,
        direction,
      });
  }

  return { emitReady, emitVote };
}
