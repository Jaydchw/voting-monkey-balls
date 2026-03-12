"use client";

import { Card } from "@/components/ui/card";
import type { BotState } from "@/bots/types";

type BotBetsTableProps = {
  bots: BotState[];
};

export function BotBetsTable({ bots }: BotBetsTableProps) {
  return (
    <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <h2 className="text-sm font-black uppercase tracking-widest mb-3">
        Bot Bets
      </h2>
      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
        {bots.map((bot) => (
          <div
            key={bot.id}
            className="border-2 border-black px-2 py-1.5 flex items-center gap-2"
          >
            <span className="text-xs font-bold uppercase flex-1 truncate">
              {bot.name}
            </span>
            <span className="text-xs font-black text-zinc-500 shrink-0">
              {bot.bananas}b
            </span>
            {bot.mainBet ? (
              <span
                className={`border-2 border-black px-2 py-0.5 text-xs font-black uppercase shrink-0 ${
                  bot.mainBet.side === "red"
                    ? "bg-red-500 text-white border-red-800"
                    : "bg-blue-500 text-white border-blue-800"
                }`}
              >
                {bot.mainBet.side} {bot.mainBet.stake}b
                {bot.mainBet.swapped && " ↕"}
              </span>
            ) : (
              <span className="text-xs text-zinc-400 shrink-0 italic">
                no bet
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
