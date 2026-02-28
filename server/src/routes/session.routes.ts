import { Router, Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { prisma } from "../db/prisma";
import { authenticate } from "../middleware/auth.middleware";
import { sessionService } from "../services/session.service";

const router = Router();
router.use(authenticate);

// ─── POST /api/sessions — start a new swiping session ─────────────────────────

router.post(
  "/",
  [
    body("groupId").isString().notEmpty(),
    body("latitude").isFloat({ min: -90, max: 90 }),
    body("longitude").isFloat({ min: -180, max: 180 }),
    body("radiusMeters").optional().isInt({ min: 500, max: 50000 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { groupId, latitude, longitude, radiusMeters } = req.body as {
      groupId: string;
      latitude: number;
      longitude: number;
      radiusMeters?: number;
    };

    // Verify requester is a group member
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user!.userId } },
    });
    if (!membership) {
      res.status(403).json({ error: "You are not in this group" });
      return;
    }

    try {
      const result = await sessionService.createSession(
        groupId,
        latitude,
        longitude,
        radiusMeters,
      );
      res.status(201).json(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      res.status(502).json({ error: message });
    }
  },
);

// ─── GET /api/sessions/:id — fetch session + card stack ───────────────────────

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const session = await sessionService.getSessionWithCards(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const isGroupMember = session.group.members.some(
    (m: { userId: string }) => m.userId === req.user!.userId,
  );
  if (!isGroupMember) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json({ session });
});

// ─── GET /api/sessions/:id/tally — get current vote tally ────────────────────

router.get("/:id/tally", async (req: Request, res: Response): Promise<void> => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const tally = await sessionService.computeTally(req.params.id);
  res.json({ tally });
});

// ─── POST /api/sessions/:id/vote — cast a single vote ─────────────────────────

router.post(
  "/:id/vote",
  [
    param("id").isString(),
    body("restaurantId").isString().notEmpty(),
    body("direction").isIn(["LEFT", "RIGHT"]),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { restaurantId, direction } = req.body as {
      restaurantId: string;
      direction: "LEFT" | "RIGHT";
    };

    const vote = await sessionService.castVote(
      req.params.id,
      restaurantId,
      req.user!.userId,
      direction,
    );

    const yesCount = await sessionService.getYesCount(
      req.params.id,
      restaurantId,
    );
    res.json({ vote, yesCount });
  },
);

export default router;
