import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("displayName").trim().isLength({ min: 2, max: 30 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, displayName } = req.body as {
      email: string;
      password: string;
      displayName: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  },
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    res.json({ token: signToken(user), user: safeUser(user) });
  },
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: safeUser(user) });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(user: { id: string; email: string; displayName: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, displayName: user.displayName },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

function safeUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const { id, email, displayName, avatarUrl } = user;
  return { id, email, displayName, avatarUrl };
}

export default router;
