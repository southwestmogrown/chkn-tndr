/**
 * GroupLobby — shown in SessionStatus.LOBBY
 * Members see who has joined and clicked "I'm ready!"
 */

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Session, MemberReadyPayload } from "../types";

interface GroupLobbyProps {
  session: Session;
  readyState: MemberReadyPayload | null;
  onReady: () => void;
  currentUserId: string;
}

export function GroupLobby({
  session,
  readyState,
  onReady,
  currentUserId: _uid,
}: GroupLobbyProps) {
  const totalCount = readyState?.totalCount ?? session.group.members.length;
  const readyCount = readyState?.readyCount ?? 0;
  const allReady = readyCount >= totalCount;

  function copyInvite() {
    navigator.clipboard.writeText(session.group.inviteCode);
    toast.success(`Invite code copied: ${session.group.inviteCode}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-8 px-6 pt-4 pb-8"
    >
      <div className="text-center">
        <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-1">
          Group
        </p>
        <h2 className="font-display font-black text-3xl text-white">
          {session.group.name}
        </h2>
        <button
          onClick={copyInvite}
          className="mt-2 flex items-center gap-2 mx-auto text-brand-400 hover:text-brand-300 text-sm font-medium"
        >
          <Share2 size={14} />
          Invite:{" "}
          <span className="font-mono font-bold">
            {session.group.inviteCode}
          </span>
        </button>
      </div>

      {/* Ready counter */}
      <div className="glass rounded-2xl px-8 py-5 text-center">
        <p className="text-5xl font-display font-black text-white mb-1">
          {readyCount}
          <span className="text-gray-500">/{totalCount}</span>
        </p>
        <p className="text-gray-400 text-sm">members ready</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalCount }).map((_, i) => (
            <motion.div
              key={i}
              animate={i < readyCount ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {i < readyCount ? (
                <CheckCircle2 size={20} className="text-yes" />
              ) : (
                <Circle size={20} className="text-gray-600" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div className="w-full max-w-xs space-y-2">
        {session.group.members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 glass rounded-xl px-4 py-3"
          >
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center font-bold text-sm">
              {m.user.displayName[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-200">
              {m.user.displayName}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!allReady && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onReady}
          className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-white font-display font-black text-lg shadow-lg hover:shadow-brand-500/30 transition-shadow"
        >
          I'm Ready! 🍗
        </motion.button>
      )}

      {allReady && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-2 text-yes"
        >
          <span className="text-4xl">🚀</span>
          <p className="font-display font-bold text-lg">Starting…</p>
        </motion.div>
      )}
    </motion.div>
  );
}
