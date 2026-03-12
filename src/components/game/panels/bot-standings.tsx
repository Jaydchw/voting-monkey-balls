"use client";

import { Card } from "@/components/ui/card";
import type { BotState } from "@/bots/types";

type BotStandingsProps = {
  leaderboard: BotState[];
  latestLog: string[];
};

export function BotStandings({ leaderboard, latestLog }: BotStandingsProps) {
  const topFive = leaderboard.slice(0, 5);

  return (
    <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <h2 className="text-sm font-black uppercase tracking-widest mb-3">
        Bot Standings
      </h2>
      <div className="space-y-2">
        {topFive.map((bot, index) => (
          <div
            key={bot.id}
            className="border-2 border-black px-3 py-2 flex items-center justify-between"
          >
            <span className="font-bold uppercase text-sm">
              #{index + 1} {bot.name}
            </span>
            <span className="font-black">{bot.bananas}b</span>
          </div>
        ))}
      </div>

      <h3 className="text-xs font-black uppercase tracking-widest mt-5 mb-2">
        Recent Engine Logs
      </h3>
      <div className="space-y-2">
        {latestLog.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className="text-xs leading-5 border-b border-black/20 pb-1"
          >
            {line}
          </p>
        ))}
        {latestLog.length === 0 && <p className="text-xs">No logs yet.</p>}
      </div>
    </Card>
  );
}
