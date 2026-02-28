import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./db/prisma";
import { registerSessionSocket } from "./socket/session.socket";

import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import sessionRoutes from "./routes/session.routes";

import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types";

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
const httpServer = http.createServer(app);

// ─── Security & parsing middleware ────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Rate limiting ────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, { cors: { origin: env.CLIENT_ORIGIN, credentials: true } });

registerSessionSocket(io);

// ─── Global error handler ─────────────────────────────────────────────────────

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error("Unhandled error", { err });
    res.status(500).json({ error: "Internal server error" });
  },
);

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function main() {
  await prisma.$connect();
  logger.info("Connected to database");

  httpServer.listen(env.PORT, () => {
    logger.info(`🍗 Chikn Tndr API listening on port ${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error("Failed to start server", { err });
  process.exit(1);
});
