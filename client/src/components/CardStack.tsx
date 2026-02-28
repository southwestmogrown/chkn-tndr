/**
 * CardStack — renders the top 3 cards in a stacked layout.
 * The top card is draggable; the rest are decorative background cards.
 */

import { X, Heart } from "lucide-react";
import { SwipeCard } from "./SwipeCard";
import type { RestaurantCard } from "../types";

interface CardStackProps {
  cards: RestaurantCard[];
  currentIndex: number;
  onSwipe: (direction: "LEFT" | "RIGHT") => void;
}

const VISIBLE_CARDS = 3;

export function CardStack({ cards, currentIndex, onSwipe }: CardStackProps) {
  const visible = cards.slice(currentIndex, currentIndex + VISIBLE_CARDS);
  const remaining = cards.length - currentIndex;

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 flex-1 min-h-0 text-center px-8">
        <span className="text-6xl">🎉</span>
        <p className="font-display text-2xl font-bold text-white">
          All done swiping!
        </p>
        <p className="text-gray-400 text-sm">
          Waiting for other group members to finish…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Progress */}
      <div className="w-full max-w-sm px-4 shrink-0">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{currentIndex} done</span>
          <span>{remaining} left</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-300"
            style={{ width: `${(currentIndex / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-sm h-[460px] overflow-hidden">
        {[...visible].reverse().map((card, reverseIdx) => {
          const stackOffset = VISIBLE_CARDS - 1 - reverseIdx;
          return (
            <SwipeCard
              key={card.id}
              card={card}
              stackOffset={stackOffset}
              onSwipe={stackOffset === 0 ? onSwipe : () => {}}
            />
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-10 pt-4">
        <button
          onClick={() => onSwipe("LEFT")}
          className="action-btn-no"
          aria-label="Nope"
        >
          <X size={28} strokeWidth={3} />
        </button>

        <span className="text-2xl select-none">🍗</span>

        <button
          onClick={() => onSwipe("RIGHT")}
          className="action-btn-yes"
          aria-label="Yum!"
        >
          <Heart size={26} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
