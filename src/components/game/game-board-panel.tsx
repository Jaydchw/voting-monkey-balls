"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Icon } from "@phosphor-icons/react";
import {
  Asterisk,
  ArrowsIn,
  ArrowsOut,
  Drop,
  Fire,
  Ghost,
  GitFork,
  Heart,
  Lightning,
  Magnet,
  Shield,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GameApi } from "@/components/game/game-board";
import type { BallModifier } from "@/game/ball-modifier";
import { RegenModifier } from "@/game/ball-modifiers/regen";
import { SpikesModifier } from "@/game/ball-modifiers/spikes";
import { ArmoredModifier } from "@/game/ball-modifiers/armored";
import { BerserkerModifier } from "@/game/ball-modifiers/berserker";
import { MagneticModifier } from "@/game/ball-modifiers/magnetic";
import { LeechModifier } from "@/game/ball-modifiers/leech";
import { OverchargeModifier } from "@/game/ball-modifiers/overcharge";
import { GrowthHormonesModifier } from "@/game/ball-modifiers/growth-hormones";
import { BabyModifier } from "@/game/ball-modifiers/baby";
import { MitosisModifier } from "@/game/ball-modifiers/mitosis";
import { PoltergeistModifier } from "@/game/ball-modifiers/poltergeist";

const GameBoard = dynamic(() => import("@/components/game/game-board"), {
  ssr: false,
});

const STARTING_HEALTH = 100;
const ROUND_DURATION_SECONDS = 120;

type ModifierMeta = { label: string; icon: Icon; factory: () => BallModifier };

const MODIFIERS: ModifierMeta[] = [
  { label: "Regen", icon: Heart, factory: () => new RegenModifier() },
  { label: "Spikes", icon: Asterisk, factory: () => new SpikesModifier() },
  { label: "Armored", icon: Shield, factory: () => new ArmoredModifier() },
  { label: "Berserker", icon: Fire, factory: () => new BerserkerModifier() },
  { label: "Magnetic", icon: Magnet, factory: () => new MagneticModifier() },
  { label: "Leech", icon: Drop, factory: () => new LeechModifier() },
  {
    label: "Overcharge",
    icon: Lightning,
    factory: () => new OverchargeModifier(),
  },
  {
    label: "Growth",
    icon: ArrowsOut,
    factory: () => new GrowthHormonesModifier(),
  },
  { label: "Baby", icon: ArrowsIn, factory: () => new BabyModifier() },
  { label: "Mitosis", icon: GitFork, factory: () => new MitosisModifier() },
  {
    label: "Poltergeist",
    icon: Ghost,
    factory: () => new PoltergeistModifier(),
  },
];

export default function GameBoardPanel() {
  const [redHealth, setRedHealth] = useState(STARTING_HEALTH);
  const [blueHealth, setBlueHealth] = useState(STARTING_HEALTH);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const gameApiRef = useRef<GameApi | null>(null);
  const handleGameReady = useCallback((api: GameApi) => {
    gameApiRef.current = api;
  }, []);
  const [winner, setWinner] = useState<"red" | "blue" | null>(null);
  const handleBallDied = useCallback((id: "red" | "blue") => {
    setWinner(id);
  }, []);

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
          onBallDied={handleBallDied}
          onGameReady={handleGameReady}
        />
      </Card>

      {winner && (
        <div
          className="mt-6 w-full py-4 text-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          style={{ backgroundColor: winner === "red" ? "#fee2e2" : "#dbeafe" }}
        >
          <span
            className="text-3xl font-black uppercase tracking-widest"
            style={{ color: winner === "red" ? "#b91c1c" : "#1d4ed8" }}
          >
            {winner === "red" ? "Red" : "Blue"} Wins!
          </span>
        </div>
      )}

      <div className="mt-8 w-full border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-xs font-black uppercase tracking-widest mb-4">
          Modifiers (Test)
        </p>
        <div className="grid grid-cols-2 gap-6">
          {(["red", "blue"] as const).map((ballId) => (
            <div key={ballId} className="flex flex-col gap-2">
              <span
                className={`text-sm font-black uppercase tracking-widest ${
                  ballId === "red" ? "text-red-600" : "text-blue-600"
                }`}
              >
                {ballId === "red" ? "Red" : "Blue"} Ball
              </span>
              <div className="flex gap-2 flex-wrap">
                {MODIFIERS.map((mod) => {
                  const IconComp = mod.icon;
                  return (
                    <Button
                      key={mod.label}
                      variant="outline"
                      className="border-4 border-black rounded-none font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                      onClick={() =>
                        gameApiRef.current?.addModifier(ballId, mod.factory())
                      }
                    >
                      <IconComp size={15} weight="bold" />
                      {mod.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
