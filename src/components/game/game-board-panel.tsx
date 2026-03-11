"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const GameBoard = dynamic(() => import("@/components/game/game-board"), {
  ssr: false,
});

const STARTING_HEALTH = 100;
const ROUND_DURATION_SECONDS = 120;

export default function GameBoardPanel() {
  const [redHealth, setRedHealth] = useState(STARTING_HEALTH);
  const [blueHealth, setBlueHealth] = useState(STARTING_HEALTH);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-4xl mx-auto">
      <div className="mb-6 w-44 border-4 border-black bg-yellow-300 py-2 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <span className="inline-block w-full text-3xl font-black tabular-nums tracking-wide">
          {timerLabel}
        </span>
      </div>

      <div className="w-full mb-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-6 w-full">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
              <Badge
                variant="destructive"
                className="w-fit text-2xl px-4 py-3.5 leading-none border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest"
              >
                Red
              </Badge>
              <span className="text-xl font-black uppercase">
                {redHealth} HP
              </span>
            </div>
            <Progress
              value={redHealth}
              className="h-10 border-4 border-black rounded-none bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200 **:data-[slot=progress-indicator]:bg-linear-to-r **:data-[slot=progress-indicator]:from-red-700 **:data-[slot=progress-indicator]:to-red-500"
            />
          </div>

          <div className="flex items-center justify-center">
            <span className="text-5xl font-black">VS</span>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
              <Badge className="w-fit text-2xl px-4 py-3.5 leading-none border-4 border-black bg-primary text-primary-foreground rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest">
                Blue
              </Badge>
              <span className="text-xl font-black uppercase">
                {blueHealth} HP
              </span>
            </div>
            <Progress
              value={blueHealth}
              className="h-10 border-4 border-black rounded-none bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200 **:data-[slot=progress-indicator]:bg-linear-to-r **:data-[slot=progress-indicator]:from-blue-700 **:data-[slot=progress-indicator]:to-blue-500"
            />
          </div>
        </div>
      </div>

      <Card className="border-8 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden p-0">
        <GameBoard
          onRedHealthChange={setRedHealth}
          onBlueHealthChange={setBlueHealth}
        />
      </Card>
    </div>
  );
}
