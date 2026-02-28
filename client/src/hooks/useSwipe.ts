/**
 * useSwipe — returns MotionProps for Framer Motion drag-to-swipe behaviour.
 * Fires onSwipe('LEFT' | 'RIGHT') when velocity or offset threshold is met.
 */

import { useAnimation } from "framer-motion";

const VELOCITY_THRESHOLD = 500; // px/s
const OFFSET_THRESHOLD = 100; // px

interface UseSwipeOptions {
  onSwipe: (direction: "LEFT" | "RIGHT") => void;
}

export function useSwipe({ onSwipe }: UseSwipeOptions) {
  const controls = useAnimation();

  async function handleDragEnd(
    _: unknown,
    info: { velocity: { x: number }; offset: { x: number } },
  ) {
    const { x: vx } = info.velocity;
    const { x: ox } = info.offset;

    if (vx > VELOCITY_THRESHOLD || ox > OFFSET_THRESHOLD) {
      await controls.start({
        x: 600,
        opacity: 0,
        transition: { duration: 0.25 },
      });
      onSwipe("RIGHT");
    } else if (vx < -VELOCITY_THRESHOLD || ox < -OFFSET_THRESHOLD) {
      await controls.start({
        x: -600,
        opacity: 0,
        transition: { duration: 0.25 },
      });
      onSwipe("LEFT");
    } else {
      controls.start({
        x: 0,
        rotate: 0,
        transition: { type: "spring", stiffness: 300 },
      });
    }
  }

  return { controls, handleDragEnd };
}
