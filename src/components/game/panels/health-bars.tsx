"use client";

import { motion } from "framer-motion";
import { BattleBar, type ActiveModifier } from "./battle-bar";

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
        className="text-4xl font-black text-center self-center pt-2"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
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
