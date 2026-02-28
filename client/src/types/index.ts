// ─── Domain types mirrored from server/src/types/index.ts ────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  owner: Pick<User, "id" | "displayName" | "avatarUrl">;
  members: Array<{
    id: string;
    userId: string;
    user: Pick<User, "id" | "displayName" | "avatarUrl">;
  }>;
  createdAt: string;
}

export interface RestaurantCard {
  id: string;
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  photoUrl: string | null;
  types: string[];
  openNow: boolean | null;
  googleMapsUrl: string | null;
  distance?: number;
}

export interface Session {
  id: string;
  groupId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: "LOBBY" | "SWIPING" | "TALLYING" | "COMPLETE";
  winnerPlaceId: string | null;
  createdAt: string;
  group: Group;
  restaurants: Array<{
    id: string;
    ordinal: number;
    restaurant: RestaurantCard;
  }>;
}

export interface VoteTally {
  restaurantId: string;
  placeId: string;
  name: string;
  photoUrl: string | null;
  yesVotes: number;
  noVotes: number;
  totalVoters: number;
  percentage: number;
}

// ─── Socket event payloads ─────────────────────────────────────────────────────

export interface MemberJoinedPayload {
  userId: string;
  displayName: string;
}
export interface MemberLeftPayload {
  userId: string;
}
export interface MemberReadyPayload {
  userId: string;
  readyCount: number;
  totalCount: number;
}
export interface SessionStartedPayload {
  sessionId: string;
}
export interface VoteReceivedPayload {
  restaurantId: string;
  yesCount: number;
}
export interface SessionCompletePayload {
  winner: VoteTally;
  tally: VoteTally[];
}
export interface SessionErrorPayload {
  message: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  token: string | null;
}
