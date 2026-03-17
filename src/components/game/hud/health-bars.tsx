"use client";

import { motion } from "framer-motion";
import {
  BattleBar,
  type ActiveModifier,
} from "@/components/game/hud/battle-bar";

type HealthBarsProps = {
  redHealth: number;
  blueHealth: number;
  redModifiers?: ActiveModifier[];
  blueModifiers?: ActiveModifier[];
  redWeapons?: ActiveModifier[];
  blueWeapons?: ActiveModifier[];
};

export function HealthBars({
  redHealth,
  blueHealth,
  redModifiers = [],
  blueModifiers = [],
  redWeapons = [],
  blueWeapons = [],
}: HealthBarsProps) {
  const diff = Math.abs(redHealth - blueHealth);
  const redIsWinning = redHealth > blueHealth;
  const isDramatic = diff > 40 && redHealth > 0 && blueHealth > 0;
  const bothCritical =
    redHealth <= 25 && blueHealth <= 25 && redHealth > 0 && blueHealth > 0;

  const vsColor = isDramatic
    ? redIsWinning
      ? "#ef4444"
      : "#3b82f6"
    : "#000000";

  return (
    <motion.div
      className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-4 mb-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <BattleBar
        ballId="red"
        health={redHealth}
        modifiers={redModifiers}
        weapons={redWeapons}
      />

      <motion.div
        className="text-4xl font-black text-center self-center pt-2 select-none"
        animate={
          bothCritical
            ? {
                scale: [1, 1.18, 1],
                color: ["#ef4444", "#3b82f6", "#ef4444"],
              }
            : isDramatic
              ? {
                  scale: [1, 1.1, 1],
                  color: [vsColor, vsColor, vsColor],
                }
              : {
                  scale: [1, 1.06, 1],
                  color: ["#000000", "#000000", "#000000"],
                }
        }
        transition={
          bothCritical
            ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" }
            : isDramatic
              ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
        }
      >
        VS
      </motion.div>

      <BattleBar
        ballId="blue"
        health={blueHealth}
        modifiers={blueModifiers}
        weapons={blueWeapons}
      />
    </motion.div>
  );
}
