"use client";

import { motion } from "framer-motion";
import { Crown, Pulse } from "@phosphor-icons/react";
import { BananaInline } from "@/components/ui/banana-inline";
import type { BotState } from "@/bots/types";

type BotStandingsProps = {
  leaderboard: BotState[];
  latestLog: string[];
};

export function BotStandings({ leaderboard, latestLog }: BotStandingsProps) {
  const topFive = leaderboard.slice(0, 5);

  return (
    <section className="bg-white px-2 py-1">
      <h2 className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-zinc-700">
        <Crown size={16} weight="fill" />
        Bot Standings
      </h2>
      <div className="divide-y divide-zinc-200/80">
        {topFive.map((bot, index) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-center justify-between px-1 py-2.5"
          >
            <span className="text-sm font-semibold uppercase">
              #{index + 1} {bot.name}
            </span>
            <BananaInline className="text-xs font-bold">
              {bot.bananas}
            </BananaInline>
          </motion.div>
        ))}
      </div>

      <h3 className="mt-5 mb-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-zinc-500">
        <Pulse size={13} weight="fill" />
        Recent Engine Logs
      </h3>
      <div className="divide-y divide-zinc-200/70">
        {latestLog.map((line, index) => (
          <motion.p
            key={`${line}-${index}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="px-1 py-2 text-xs leading-5"
          >
            {line}
          </motion.p>
        ))}
        {latestLog.length === 0 && (
          <p className="text-xs text-zinc-500">No logs yet.</p>
        )}
      </div>
    </section>
  );
}
