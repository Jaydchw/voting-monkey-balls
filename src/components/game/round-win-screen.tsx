"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BallId } from "@/bots/types";

type RoundWinScreenProps = {
  winner: BallId | null;
  roundNumber: number;
  roundsTotal: number;
  isFinal: boolean;
};

const WINNER_CONFIG = {
  red: {
    bg: "bg-red-500",
    accent: "bg-red-600",
    text: "text-white",
    label: "RED",
    shadow: "shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
    stripeBg: "bg-red-600",
  },
  blue: {
    bg: "bg-primary",
    accent: "bg-blue-700",
    text: "text-white",
    label: "BLUE",
    shadow: "shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
    stripeBg: "bg-blue-700",
  },
};

export function RoundWinScreen({
  winner,
  roundNumber,
  roundsTotal,
  isFinal,
}: RoundWinScreenProps) {
  const [stripes, setStripes] = useState<number[]>([]);

  useEffect(() => {
    if (!winner) return;
    const t = setTimeout(() => setStripes([0, 1, 2, 3, 4, 5, 6, 7]), 50);
    return () => clearTimeout(t);
  }, [winner]);

  if (!winner) return null;

  const config = WINNER_CONFIG[winner];

  return (
    <AnimatePresence>
      <motion.div
        key={`win-${roundNumber}-${winner}`}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden ${config.bg}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 0.18 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {stripes.map((_, i) => (
            <motion.div
              key={i}
              className={`absolute top-0 bottom-0 ${config.stripeBg} opacity-30`}
              style={{ left: `${i * 12.5}%`, width: "6%" }}
              initial={{ scaleY: 0, originY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                delay: i * 0.04,
                type: "spring",
                stiffness: 300,
                damping: 24,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center select-none">
          <motion.div
            initial={{ y: -60, opacity: 0, scale: 0.7 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{
              delay: 0.1,
              type: "spring",
              stiffness: 220,
              damping: 14,
            }}
          >
            <div className="inline-block border-4 border-white px-5 py-1.5 mb-4 bg-white/20">
              <span className="text-xs font-black uppercase tracking-[0.4em] text-white">
                {isFinal
                  ? "Final Round"
                  : `Round ${roundNumber} of ${roundsTotal}`}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              delay: 0.15,
              type: "spring",
              stiffness: 180,
              damping: 12,
            }}
            className="flex flex-col items-center"
          >
            <motion.div
              className={`border-8 border-white bg-white/10 px-10 py-6 ${config.shadow}`}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{
                delay: 0.6,
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <p className="text-white font-black uppercase tracking-widest text-xl mb-1 opacity-80">
                Winner
              </p>
              <p
                className="text-white font-black uppercase tracking-tight leading-none"
                style={{ fontSize: "clamp(5rem, 18vw, 10rem)", lineHeight: 1 }}
              >
                {config.label}
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.35,
              type: "spring",
              stiffness: 200,
              damping: 18,
            }}
          >
            <motion.p
              className="text-white/70 font-black uppercase tracking-[0.35em] text-sm"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ delay: 0.8, duration: 1.4, repeat: Infinity }}
            >
              {isFinal ? "Tournament Over" : "Next round starting..."}
            </motion.p>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-0 left-0 right-0 h-2 bg-white/40"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          style={{ originX: 1 }}
          transition={{ delay: 0.2, duration: 2.3, ease: "linear" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
