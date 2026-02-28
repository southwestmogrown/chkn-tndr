import { Router, Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { nanoid } from "nanoid";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// ─── POST /api/groups — create a group ────────────────────────────────────────

router.post(
  "/",
  [body("name").trim().isLength({ min: 2, max: 50 })],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name } = req.body as { name: string };
    const ownerId = req.user!.userId;

    const inviteCode = nanoid(8).toUpperCase();

    const group = await prisma.group.create({
      data: {
        name,
        inviteCode,
        ownerId,
        members: { create: { userId: ownerId } },
      },
      include: { members: { include: { user: true } } },
    });

    res.status(201).json({ group });
  },
);

// ─── GET /api/groups — list my groups ─────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: req.user!.userId } } },
    include: {
      owner: { select: { id: true, displayName: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      },
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ groups });
});

// ─── GET /api/groups/:id — get a single group ─────────────────────────────────

router.get(
  "/:id",
  [param("id").isString()],
  async (req: Request, res: Response): Promise<void> => {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, displayName: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
        sessions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const isMember = group.members.some((m) => m.userId === req.user!.userId);
    if (!isMember) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    res.json({ group });
  },
);

// ─── POST /api/groups/join — join via invite code ─────────────────────────────

router.post(
  "/join",
  [body("inviteCode").trim().isLength({ min: 6, max: 12 })],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { inviteCode } = req.body as { inviteCode: string };
    const userId = req.user!.userId;

    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });
    if (!group) {
      res.status(404).json({ error: "Invalid invite code" });
      return;
    }

    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId } },
      create: { groupId: group.id, userId },
      update: {},
    });

    res.json({ group });
  },
);

// ─── DELETE /api/groups/:id/leave ─────────────────────────────────────────────

router.delete(
  "/:id/leave",
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    if (group.ownerId === userId) {
      res
        .status(400)
        .json({
          error: "Owner cannot leave. Transfer ownership or delete the group.",
        });
      return;
    }

    await prisma.groupMember.deleteMany({ where: { groupId, userId } });
    res.json({ message: "Left group" });
  },
);

export default router;
