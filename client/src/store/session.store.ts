import { create } from "zustand";
import type { Session, VoteTally, MemberReadyPayload } from "../types";

interface SessionStore {
  // Active session state
  session: Session | null;
  currentCardIndex: number;
  readyState: MemberReadyPayload | null;
  isStarted: boolean;
  isComplete: boolean;
  winner: VoteTally | null;
  tally: VoteTally[];

  // Live yes-vote counts keyed by restaurantId
  yesCountMap: Record<string, number>;

  // Actions
  setSession: (session: Session) => void;
  advanceCard: () => void;
  markStarted: () => void;
  markReady: (payload: MemberReadyPayload) => void;
  markComplete: (winner: VoteTally, tally: VoteTally[]) => void;
  updateYesCount: (restaurantId: string, count: number) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  currentCardIndex: 0,
  readyState: null,
  isStarted: false,
  isComplete: false,
  winner: null,
  tally: [],
  yesCountMap: {},
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
  setSession: (session) => set({ session }),
  advanceCard: () => set((s) => ({ currentCardIndex: s.currentCardIndex + 1 })),
  markStarted: () => set({ isStarted: true }),
  markReady: (payload) => set({ readyState: payload }),
  markComplete: (winner, tally) => set({ isComplete: true, winner, tally }),
  updateYesCount: (restaurantId, count) =>
    set((s) => ({ yesCountMap: { ...s.yesCountMap, [restaurantId]: count } })),
  reset: () => set(initialState),
}));
