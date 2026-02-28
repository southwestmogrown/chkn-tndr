/**
 * ResultsScreen — full-screen victory reveal + vote tally.
 */

import { motion } from "framer-motion";
import { MapPin, Star, ExternalLink, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { VoteTally } from "../types";

interface ResultsScreenProps {
  winner: VoteTally;
  tally: VoteTally[];
}

export function ResultsScreen({ winner, tally }: ResultsScreenProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col pb-10"
    >
      {/* Hero */}
      <div className="relative">
        {winner.photoUrl ? (
          <img
            src={winner.photoUrl}
            alt={winner.name}
            className="w-full h-72 object-cover"
          />
        ) : (
          <div className="w-full h-72 bg-gradient-to-br from-brand-800 to-brand-600 flex items-center justify-center text-8xl">
            🍽️
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Winner badge */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="absolute top-6 left-6 flex items-center gap-2 bg-yellow-400 text-yellow-900 font-display font-black px-4 py-2 rounded-2xl text-lg shadow-lg"
        >
          <Trophy size={20} />
          Tonight's Pick!
        </motion.div>

        <div className="absolute bottom-5 left-5 right-5">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-display font-black text-4xl text-white text-shadow leading-tight"
          >
            {winner.name}
          </motion.h1>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-4 mt-2"
          >
            <div className="flex items-center gap-1 text-yes font-bold text-lg">
              <span>❤️</span>
              {winner.yesVotes} votes
            </div>
            <div className="glass px-3 py-1 rounded-xl text-white font-semibold">
              {winner.percentage}% approval
            </div>
          </motion.div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 mt-4 flex gap-3">
        {winner.placeId && (
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${winner.placeId}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-500 text-white font-display font-bold text-lg hover:bg-brand-400 transition-colors"
          >
            <MapPin size={18} />
            Get Directions
          </a>
        )}
        <button
          onClick={() => navigate("/home")}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl glass text-gray-300 font-semibold hover:text-white transition-colors"
        >
          <ExternalLink size={16} />
          Done
        </button>
      </div>

      {/* Tally table */}
      <div className="px-5 mt-8">
        <h3 className="font-display font-bold text-lg text-gray-400 mb-4">
          Full Tally
        </h3>
        <div className="space-y-3">
          {tally.map((item, rank) => (
            <motion.div
              key={item.restaurantId}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * rank }}
              className={`glass rounded-2xl p-4 flex items-center gap-4 ${
                rank === 0 ? "border-yellow-400/40 bg-yellow-400/5" : ""
              }`}
            >
              <span className="text-2xl font-display font-black text-gray-500 w-6 text-center">
                {rank === 0
                  ? "🥇"
                  : rank === 1
                    ? "🥈"
                    : rank === 2
                      ? "🥉"
                      : `${rank + 1}`}
              </span>

              {item.photoUrl ? (
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center text-xl shrink-0">
                  🍽️
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{item.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {item.yesVotes}/{item.totalVoters} yes votes
                </p>
              </div>

              {/* Bar */}
              <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yes rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="text-sm font-bold text-yes w-10 text-right">
                {item.percentage}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
