"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Cards, CheckCircle, TrendUp } from "@phosphor-icons/react";
import type { MatchPhase } from "@/multiplayer/protocol";

type PhaseScreenProps = {
  phase: MatchPhase | null;
  countdown: number;
  maxSeconds: number;
  playersReady?: number;
  playersTotal?: number;
  waitForAll?: boolean;
};

type PhaseConfig = {
  bg: string;
  stripeBg: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
};

const PHASE_CONFIG: Partial<Record<MatchPhase, PhaseConfig>> = {
  prematch: {
    bg: "bg-yellow-400",
    stripeBg: "bg-yellow-500",
    label: "Place Your Bets",
    sublabel: "Main bet phase",
    icon: <Coins size={52} weight="fill" className="text-white" />,
  },
  vote: {
    bg: "bg-violet-500",
    stripeBg: "bg-violet-600",
    label: "Vote Now",
    sublabel: "Draw event cards",
    icon: <Cards size={52} weight="fill" className="text-white" />,
  },
  reveal: {
    bg: "bg-violet-400",
    stripeBg: "bg-violet-500",
    label: "Applying Result",
    sublabel: "Vote resolved",
    icon: <CheckCircle size={52} weight="fill" className="text-white" />,
  },
  microbet: {
    bg: "bg-orange-500",
    stripeBg: "bg-orange-600",
    label: "Microbets",
    sublabel: "Interval betting",
    icon: <TrendUp size={52} weight="fill" className="text-white" />,
  },
};

export function PhaseScreen({
  phase,
  countdown,
  maxSeconds,
  playersReady,
  playersTotal,
  waitForAll,
}: PhaseScreenProps) {
  const [stripes, setStripes] = useState<number[]>([]);
  const [prevPhase, setPrevPhase] = useState<MatchPhase | null>(null);

  if (phase !== prevPhase) {
    setPrevPhase(phase);
    setStripes([]);
  }

  useEffect(() => {
    if (!phase) return;
    const t = setTimeout(() => setStripes([0, 1, 2, 3, 4, 5, 6, 7]), 50);
    return () => clearTimeout(t);
  }, [phase]);

  if (!phase) return null;
  const config = PHASE_CONFIG[phase];
  if (!config) return null;

  const pct =
    maxSeconds > 0 && countdown > 0
      ? Math.max(0, Math.min(1, countdown / maxSeconds))
      : 0;

  const showPlayerCount =
    playersTotal !== undefined && playersReady !== undefined && waitForAll;

  const allReady = showPlayerCount && playersReady >= (playersTotal ?? 0);

  return (
    <AnimatePresence>
      <motion.div
        key={phase}
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden ${config.bg}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
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

        <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center select-none">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{
              scale: [0, 1.3, 0.9, 1.1, 1],
              rotate: [-20, 8, -4, 4, 0],
            }}
            transition={{ delay: 0.1, duration: 0.65, ease: "easeOut" }}
          >
            {config.icon}
          </motion.div>

          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.75 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{
              delay: 0.12,
              type: "spring",
              stiffness: 200,
              damping: 14,
            }}
          >
            <div className="inline-block border-4 border-white px-4 py-1.5 mb-3 bg-white/20">
              <span className="text-xs font-black uppercase tracking-[0.4em] text-white">
                {config.sublabel}
              </span>
            </div>

            <motion.div
              className="border-8 border-white bg-white/10 px-10 py-5 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
              animate={{ scale: [1, 1.025, 1] }}
              transition={{
                delay: 0.7,
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <p
                className="text-white font-black uppercase tracking-tight leading-none"
                style={{ fontSize: "clamp(3rem, 12vw, 6rem)", lineHeight: 1 }}
              >
                {config.label}
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 200,
              damping: 18,
            }}
            className="flex flex-col items-center gap-2"
          >
            {showPlayerCount && (
              <div className="flex items-center gap-3">
                {Array.from({ length: playersTotal ?? 0 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-4 h-4 border-2 border-white rounded-full ${
                      i < (playersReady ?? 0) ? "bg-white" : "bg-white/30"
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.06, type: "spring" }}
                  />
                ))}
              </div>
            )}

            {showPlayerCount && (
              <motion.p
                className="text-white/80 font-black uppercase tracking-[0.35em] text-sm"
                animate={
                  allReady
                    ? { scale: [1, 1.08, 1] }
                    : { opacity: [0.6, 1, 0.6] }
                }
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {allReady
                  ? "All ready!"
                  : `${playersReady} / ${playersTotal} ready`}
              </motion.p>
            )}

            {!showPlayerCount && (
              <motion.p
                className="text-white/70 font-black uppercase tracking-[0.35em] text-sm"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ delay: 0.8, duration: 1.4, repeat: Infinity }}
              >
                {countdown > 0
                  ? `${countdown}s remaining`
                  : "Waiting on players..."}
              </motion.p>
            )}
          </motion.div>
        </div>

        {pct > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-2 bg-white/40"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: pct }}
            style={{ originX: 0 }}
            transition={{ duration: 0.4, ease: "linear" }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
