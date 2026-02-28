/**
 * SwipeCard — single animated restaurant card.
 *
 * Dragging left → red "NOPE" badge fades in
 * Dragging right → green "YUM!" badge fades in
 * Release past threshold → card flies off & onSwipe fires
 */

import { motion, useMotionValue, useTransform } from "framer-motion";
import { MapPin, Star, DollarSign, Clock } from "lucide-react";
import { useSwipe } from "../hooks/useSwipe";
import type { RestaurantCard } from "../types";

interface SwipeCardProps {
  card: RestaurantCard;
  onSwipe: (direction: "LEFT" | "RIGHT") => void;
  /** Cards below the top card — rendered at reduced scale/offset */
  stackOffset?: number;
}

const PRICE_LABELS = ["Free", "$", "$$", "$$$", "$$$$"];

export function SwipeCard({ card, onSwipe, stackOffset = 0 }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const yesOpacity = useTransform(x, [0, 100, 200], [0, 0.8, 1]);
  const nopeOpacity = useTransform(x, [-200, -100, 0], [1, 0.8, 0]);

  const { controls, handleDragEnd } = useSwipe({ onSwipe });

  const scaleOffset = 1 - stackOffset * 0.04;
  const yOffset = stackOffset * 12;

  return (
    <motion.div
      className="swipe-card absolute inset-x-0"
      style={{
        x,
        rotate,
        scale: scaleOffset,
        y: yOffset,
        zIndex: 10 - stackOffset,
        originX: 0.5,
        originY: 1,
      }}
      animate={controls}
      drag={stackOffset === 0 ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      data-dragging="true"
      whileTap={{ cursor: "grabbing" }}
    >
      {/* ── Photo ── */}
      <div className="relative w-full aspect-[3/4] bg-gray-800">
        {card.photoUrl ? (
          <img
            src={card.photoUrl}
            alt={card.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl bg-gradient-to-br from-brand-800 to-brand-600">
            🍽️
          </div>
        )}

        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* ── NOPE badge ── */}
        <motion.div
          className="absolute top-8 left-6 px-4 py-2 rounded-xl border-4 border-no text-no font-display text-3xl font-black rotate-[-15deg] uppercase tracking-widest"
          style={{ opacity: nopeOpacity }}
        >
          Nope
        </motion.div>

        {/* ── YUM badge ── */}
        <motion.div
          className="absolute top-8 right-6 px-4 py-2 rounded-xl border-4 border-yes text-yes font-display text-3xl font-black rotate-[15deg] uppercase tracking-widest"
          style={{ opacity: yesOpacity }}
        >
          Yum!
        </motion.div>

        {/* ── Open / Closed chip ── */}
        {card.openNow !== null && (
          <div
            className={`absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              card.openNow
                ? "bg-yes/20 text-yes border border-yes/40"
                : "bg-no/20 text-no border border-no/40"
            }`}
          >
            <Clock size={12} />
            {card.openNow ? "Open" : "Closed"}
          </div>
        )}

        {/* ── Card info overlay ── */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-shadow">
          <h2 className="font-display font-black text-2xl leading-tight mb-1 text-white">
            {card.name}
          </h2>

          <div className="flex items-center gap-2 text-gray-300 text-sm mb-3">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{card.address}</span>
            {card.distance !== undefined && (
              <span className="ml-auto shrink-0 text-gray-400">
                {card.distance < 1000
                  ? `${Math.round(card.distance)}m`
                  : `${(card.distance / 1000).toFixed(1)}km`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Star rating */}
            {card.rating !== null && (
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                <Star size={13} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-white">
                  {card.rating.toFixed(1)}
                </span>
                {card.userRatingsTotal !== null && (
                  <span className="text-xs text-gray-400">
                    ({card.userRatingsTotal.toLocaleString()})
                  </span>
                )}
              </div>
            )}

            {/* Price */}
            {card.priceLevel !== null && (
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                <DollarSign size={13} className="text-brand-400" />
                <span className="text-sm font-semibold text-brand-300">
                  {PRICE_LABELS[card.priceLevel] ?? "?"}
                </span>
              </div>
            )}

            {/* Type chips */}
            {card.types.slice(0, 2).map((t) => (
              <span
                key={t}
                className="text-xs text-gray-300 bg-white/10 px-2 py-1 rounded-lg capitalize"
              >
                {t.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
