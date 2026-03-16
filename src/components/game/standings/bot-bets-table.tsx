"use client";

import { motion } from "framer-motion";
import { DiceFive } from "@phosphor-icons/react";
import { BananaInline } from "@/components/ui/banana-inline";
import type { BotState } from "@/bots/types";

type BotBetsTableProps = {
  bots: BotState[];
};

export function BotBetsTable({ bots }: BotBetsTableProps) {
  return (
    <section className="bg-white px-2 py-1">
      <h2 className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-zinc-700">
        <DiceFive size={16} weight="fill" />
        Bot Bets
      </h2>
      <div className="max-h-72 divide-y divide-zinc-200/80 overflow-y-auto pr-1">
        {bots.map((bot, index) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="flex items-center gap-2 px-1 py-2.5"
          >
            <span className="text-xs font-bold uppercase flex-1 truncate">
              {bot.name}
            </span>
            <BananaInline className="shrink-0 text-xs font-bold">
              {bot.bananas}
            </BananaInline>
            {bot.mainBet ? (
              <span
                className={`px-2 py-0.5 text-xs font-bold uppercase shrink-0 ${bot.mainBet.side === "red" ? "text-red-700" : "text-blue-700"}`}
              >
                {bot.mainBet.side} {bot.mainBet.stake}
                {bot.mainBet.swapped && " ↕"}
              </span>
            ) : (
              <span className="shrink-0 text-xs italic text-zinc-400">
                no bet
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
