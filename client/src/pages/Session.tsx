/**
 * Session page — the main swiping experience.
 *
 * LOBBY   → GroupLobby (pre-game waiting room)
 * SWIPING → CardStack  (drag-to-swipe cards)
 * TALLYING / COMPLETE → ResultsScreen
 */

import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { api } from "../services/api";
import { useSocket } from "../hooks/useSocket";
import { useSessionStore } from "../store/session.store";
import { useAuthStore } from "../store/auth.store";

import { Header } from "../components/Header";
import { GroupLobby } from "../components/GroupLobby";
import { CardStack } from "../components/CardStack";
import { ResultsScreen } from "../components/ResultsScreen";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const {
    session,
    currentCardIndex,
    isStarted,
    isComplete,
    winner,
    tally,
    readyState,
    setSession,
    advanceCard,
    reset,
  } = useSessionStore();

  // Fetch session data
  const { data, isLoading, error } = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.sessions.get(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data) setSession(data);
  }, [data]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [id]);

  // Socket
  const { emitReady, emitVote } = useSocket(id ?? null);

  // Cards from session
  const cards = (session?.restaurants ?? [])
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((sr) => sr.restaurant);

  async function handleSwipe(direction: "LEFT" | "RIGHT") {
    const card = cards[currentCardIndex];
    if (!card || !id) return;

    try {
      emitVote(card.id, direction);
      await api.sessions.vote(id, card.id, direction);
    } catch {
      toast.error("Vote failed, try again");
    }

    advanceCard();
  }

  if (!user) return <Navigate to="/" replace />;
  if (!id) return <Navigate to="/home" replace />;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Session not found.
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (isComplete && winner) {
    return <ResultsScreen winner={winner} tally={tally} />;
  }

  // ── Swiping ──────────────────────────────────────────────────────────────────
  if (isStarted || session.status === "SWIPING") {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col items-center pt-2 pb-8 px-4">
          <CardStack
            cards={cards}
            currentIndex={currentCardIndex}
            onSwipe={handleSwipe}
          />
        </main>
      </div>
    );
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-sm mx-auto w-full pt-2">
        <GroupLobby
          session={session}
          readyState={readyState}
          onReady={emitReady}
          currentUserId={user.id}
        />
      </main>
    </div>
  );
}
