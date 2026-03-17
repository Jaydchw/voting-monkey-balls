"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

type RoundHeaderProps = {
  roundNumber: number;
  roundsTotal: number;
  timeLeftSeconds: number;
};

export function RoundHeader({
  roundNumber,
  roundsTotal,
  timeLeftSeconds,
}: RoundHeaderProps) {
  const isUrgent = timeLeftSeconds <= 30 && timeLeftSeconds > 0;
  const isCritical = timeLeftSeconds <= 10 && timeLeftSeconds > 0;

  return (
    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <Link href="/">
        <Button
          variant="secondary"
          className="border-4 border-black rounded-none font-black uppercase tracking-widest"
        >
          Back
        </Button>
      </Link>

      <div className="flex flex-col items-center gap-1 absolute left-1/2 -translate-x-1/2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
          Round {roundNumber} of {roundsTotal}
        </p>
        <motion.div
          key={`${isCritical}-${isUrgent}`}
          className={`font-black tabular-nums text-3xl sm:text-4xl leading-none px-5 py-1.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
            isCritical
              ? "bg-red-500 text-white"
              : isUrgent
                ? "bg-orange-400 text-black"
                : "bg-yellow-300 text-black"
          }`}
          animate={
            isCritical
              ? { scale: [1, 1.07, 1] }
              : isUrgent
                ? { scale: [1, 1.03, 1] }
                : { scale: 1 }
          }
          transition={
            isCritical
              ? { duration: 0.42, repeat: Infinity }
              : isUrgent
                ? { duration: 0.85, repeat: Infinity }
                : {}
          }
        >
          {formatTimer(timeLeftSeconds)}
        </motion.div>
      </div>

      <div className="w-[72px]" />
    </div>
  );
}
