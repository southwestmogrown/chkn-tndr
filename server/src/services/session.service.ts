/**
 * Session service — owns the lifecycle of a swiping session:
 *   LOBBY → SWIPING → TALLYING → COMPLETE
 *
 * Also computes vote tallies and determines the winner.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { placesService } from "./places.service";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type { VoteTally } from "../types";

export class SessionService {
  // ─── Session lifecycle ──────────────────────────────────────────────────────

  async createSession(
    groupId: string,
    latitude: number,
    longitude: number,
    radiusMeters?: number,
  ) {
    const radius = radiusMeters ?? env.DEFAULT_SEARCH_RADIUS_METERS;

    // Fetch restaurants from Google Places
    const cards = await placesService.getNearbyRestaurants(
      latitude,
      longitude,
      radius,
      env.MAX_RESTAURANTS_PER_SESSION,
    );

    if (cards.length === 0) {
      throw new Error(
        "No restaurants found near your location. Try increasing the search radius.",
      );
    }

    // Create the session and link restaurants in one transaction
    const session = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const session = await tx.session.create({
          data: {
            groupId,
            latitude,
            longitude,
            radiusMeters: radius,
            status: "LOBBY",
          },
        });

        await tx.sessionRestaurant.createMany({
          data: cards.map((card, idx) => ({
            sessionId: session.id,
            restaurantId: card.id,
            ordinal: idx,
          })),
        });

        return session;
      },
    );

    logger.info("Session created", {
      sessionId: session.id,
      restaurants: cards.length,
    });
    return { session, cards };
  }

  async startSession(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { status: "SWIPING" },
    });
  }

  async completeSession(
    sessionId: string,
  ): Promise<{ winner: VoteTally; tally: VoteTally[] }> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "TALLYING" },
    });

    const tally = await this.computeTally(sessionId);
    const winner = tally[0];

    if (!winner) throw new Error("No votes cast in this session");

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETE",
        winnerPlaceId: winner.placeId,
        completedAt: new Date(),
      },
    });

    logger.info("Session complete", { sessionId, winner: winner.name });
    return { winner, tally };
  }

  // ─── Voting ─────────────────────────────────────────────────────────────────

  async castVote(
    sessionId: string,
    restaurantId: string,
    userId: string,
    direction: "LEFT" | "RIGHT",
  ) {
    return prisma.vote.upsert({
      where: {
        sessionId_restaurantId_userId: { sessionId, restaurantId, userId },
      },
      create: { sessionId, restaurantId, userId, direction },
      update: { direction },
    });
  }

  async getYesCount(sessionId: string, restaurantId: string): Promise<number> {
    return prisma.vote.count({
      where: { sessionId, restaurantId, direction: "RIGHT" },
    });
  }

  // ─── Tally ───────────────────────────────────────────────────────────────────

  async computeTally(sessionId: string): Promise<VoteTally[]> {
    const sessionRestaurants = await prisma.sessionRestaurant.findMany({
      where: { sessionId },
      include: { restaurant: true },
    });

    const votes = await prisma.vote.groupBy({
      by: ["restaurantId", "direction"],
      where: { sessionId },
      _count: { direction: true },
    });

    const uniqueVoters = await prisma.vote.findMany({
      where: { sessionId },
      distinct: ["userId"],
      select: { userId: true },
    });
    const totalVoters = uniqueVoters.length;

    const voteMap = new Map<string, { yes: number; no: number }>();
    for (const v of votes) {
      if (!voteMap.has(v.restaurantId))
        voteMap.set(v.restaurantId, { yes: 0, no: 0 });
      const entry = voteMap.get(v.restaurantId)!;
      if (v.direction === "RIGHT") entry.yes += v._count.direction;
      else entry.no += v._count.direction;
    }

    const tally: VoteTally[] = sessionRestaurants.map(
      (sr: {
        restaurantId: string;
        restaurant: { placeId: string; name: string; photoUrl: string | null };
      }) => {
        const counts = voteMap.get(sr.restaurantId) ?? { yes: 0, no: 0 };
        return {
          restaurantId: sr.restaurantId,
          placeId: sr.restaurant.placeId,
          name: sr.restaurant.name,
          photoUrl: sr.restaurant.photoUrl,
          yesVotes: counts.yes,
          noVotes: counts.no,
          totalVoters,
          percentage:
            totalVoters > 0 ? Math.round((counts.yes / totalVoters) * 100) : 0,
        };
      },
    );

    return tally.sort(
      (a, b) => b.yesVotes - a.yesVotes || b.percentage - a.percentage,
    );
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async getSessionWithCards(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        group: { include: { members: { include: { user: true } } } },
        restaurants: {
          orderBy: { ordinal: "asc" },
          include: { restaurant: true },
        },
      },
    });
    return session;
  }

  async hasUserVotedOnAll(sessionId: string, userId: string): Promise<boolean> {
    const total = await prisma.sessionRestaurant.count({
      where: { sessionId },
    });
    const voted = await prisma.vote.count({ where: { sessionId, userId } });
    return voted >= total;
  }
}

export const sessionService = new SessionService();
