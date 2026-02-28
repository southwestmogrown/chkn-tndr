// ─── Shared domain types (also mirrored in client/src/types/index.ts) ─────────

export interface RestaurantCard {
  id: string;
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null; // 0–4
  photoUrl: string | null;
  types: string[];
  openNow: boolean | null;
  googleMapsUrl: string | null;
  distance?: number; // metres from search origin
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

export interface ServerToClientEvents {
  "session:memberJoined": (payload: {
    userId: string;
    displayName: string;
  }) => void;
  "session:memberLeft": (payload: { userId: string }) => void;
  "session:memberReady": (payload: {
    userId: string;
    readyCount: number;
    totalCount: number;
  }) => void;
  "session:started": (payload: { sessionId: string }) => void;
  "session:voteReceived": (payload: {
    restaurantId: string;
    yesCount: number;
  }) => void;
  "session:complete": (payload: {
    winner: VoteTally;
    tally: VoteTally[];
  }) => void;
  "session:error": (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  "session:join": (payload: { sessionId: string; token: string }) => void;
  "session:ready": (payload: { sessionId: string }) => void;
  "session:vote": (payload: {
    sessionId: string;
    restaurantId: string;
    direction: "LEFT" | "RIGHT";
  }) => void;
  "session:leave": (payload: { sessionId: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  sessionId: string;
  displayName: string;
}
