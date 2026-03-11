"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Icon } from "@phosphor-icons/react";
import {
  Asterisk,
  ArrowsClockwise,
  ArrowsIn,
  ArrowsOut,
  DotsNine,
  Drop,
  Fire,
  Gauge,
  Ghost,
  GitFork,
  Heart,
  Lightning,
  Magnet,
  Shield,
  Shuffle,
  Target,
  Wind,
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
import { SnakeModifier } from "@/game/ball-modifiers/snake";
import type { ArenaModifier } from "@/game/arena-modifier";
import { SpeedBoostModifier } from "@/game/arena-modifiers/speed-boost";
import { PortalModifier } from "@/game/arena-modifiers/portal";
import { CircleArenaModifier } from "@/game/arena-modifiers/circle-arena";
import { TurbulenceModifier } from "@/game/arena-modifiers/turbulence";
import { VortexModifier } from "@/game/arena-modifiers/vortex";
import { BumpersModifier } from "@/game/arena-modifiers/bumpers";

const GameBoard = dynamic(() => import("@/components/game/game-board"), {
  ssr: false,
});

type ModifierState = { name: string; icon: string; quality: number };

const PHOSPHOR_ICON_MAP: Partial<Record<string, Icon>> = {
  heart: Heart,
  asterisk: Asterisk,
  shield: Shield,
  fire: Fire,
  magnet: Magnet,
  drop: Drop,
  lightning: Lightning,
  arrowsOut: ArrowsOut,
  arrowsIn: ArrowsIn,
  gitFork: GitFork,
  ghost: Ghost,
  target: Target,
};

const MODIFIER_RING_CLASS: Record<string, string> = {
  Armored: "ring-4 ring-yellow-400",
  Regen: "ring-4 ring-green-400",
  Berserker: "ring-4 ring-orange-500",
  Overcharge: "ring-4 ring-yellow-300",
  Leech: "ring-4 ring-red-400",
  Magnetic: "ring-4 ring-cyan-400",
  "Growth Hormones": "ring-4 ring-lime-400",
  Baby: "ring-4 ring-pink-300",
  Mitosis: "ring-4 ring-purple-400",
  Snake: "ring-4 ring-violet-400",
  Spikes: "ring-4 ring-zinc-400",
};

function getHealthBarRing(modifiers: ModifierState[]): string {
  if (modifiers.length === 0) return "";
  const best = [...modifiers].sort((a, b) => b.quality - a.quality)[0];
  return MODIFIER_RING_CLASS[best.name] ?? "";
}

const QUALITY_ICON_COLOR: Record<number, string> = {
  1: "#71717a",
  2: "#3b82f6",
  3: "#a855f7",
  4: "#f59e0b",
};

const MODIFIER_HEX_COLOR: Record<string, string> = {
  Armored: "#facc15",
  Regen: "#4ade80",
  Berserker: "#f97316",
  Overcharge: "#fde047",
  Leech: "#f87171",
  Magnetic: "#22d3ee",
  "Growth Hormones": "#a3e635",
  Baby: "#f9a8d4",
  Mitosis: "#c084fc",
  Snake: "#a78bfa",
  Spikes: "#a1a1aa",
};

const BALL_BASE_COLORS: Record<"red" | "blue", [string, string]> = {
  red: ["#b91c1c", "#ef4444"],
  blue: ["#1d4ed8", "#3b82f6"],
};

function getHealthBarIndicatorStyle(
  ballId: "red" | "blue",
  modifiers: ModifierState[],
) {
  const [baseFrom, baseTo] = BALL_BASE_COLORS[ballId];
  if (modifiers.length === 0) {
    return { background: `linear-gradient(to right, ${baseFrom}, ${baseTo})` };
  }
  const modColors = [
    ...new Set(
      modifiers
        .map((m) => MODIFIER_HEX_COLOR[m.name])
        .filter((c): c is string => Boolean(c)),
    ),
  ];
  return {
    background: `linear-gradient(to right, ${[baseFrom, ...modColors].join(", ")})`,
  };
}

const STARTING_HEALTH = 100;
const ROUND_DURATION_SECONDS = 120;
const CIRCLE_ARENA_SIZE = 410;

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
    label: "Snake",
    icon: Ghost,
    factory: () => new SnakeModifier(),
  },
];

type ArenaMeta = { label: string; icon: Icon; factory: () => ArenaModifier };

const ARENA_MODIFIERS: ArenaMeta[] = [
  {
    label: "Speed Boost",
    icon: Gauge,
    factory: () => new SpeedBoostModifier(),
  },
  { label: "Portal", icon: Shuffle, factory: () => new PortalModifier() },
  {
    label: "Circle Arena",
    icon: Target,
    factory: () => new CircleArenaModifier(),
  },
  { label: "Turbulence", icon: Wind, factory: () => new TurbulenceModifier() },
  {
    label: "Vortex",
    icon: ArrowsClockwise,
    factory: () => new VortexModifier(),
  },
  { label: "Bumpers", icon: DotsNine, factory: () => new BumpersModifier() },
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
  const [redModifiers, setRedModifiers] = useState<ModifierState[]>([]);
  const [blueModifiers, setBlueModifiers] = useState<ModifierState[]>([]);
  const [isCircleArena, setIsCircleArena] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const handleBallDied = useCallback((id: "red" | "blue") => {
    setWinner(id);
  }, []);
  const handleClearAll = useCallback(() => {
    setGameKey((k) => k + 1);
    setRedHealth(STARTING_HEALTH);
    setBlueHealth(STARTING_HEALTH);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setWinner(null);
    setRedModifiers([]);
    setBlueModifiers([]);
    setIsCircleArena(false);
    gameApiRef.current = null;
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
              className={`h-10 border-4 border-black rounded-none bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200 ${getHealthBarRing(redModifiers)}`}
              indicatorStyle={getHealthBarIndicatorStyle("red", redModifiers)}
            />
            <div className="flex gap-1 flex-wrap mt-1 min-h-8">
              {redModifiers.map((mod, i) => {
                const IconComp = PHOSPHOR_ICON_MAP[mod.icon];
                return IconComp ? (
                  <span
                    key={i}
                    title={mod.name}
                    className="inline-flex items-center justify-center w-8 h-8 border-2 border-black bg-white"
                  >
                    <IconComp
                      size={18}
                      weight="bold"
                      color={QUALITY_ICON_COLOR[mod.quality] ?? "#71717a"}
                    />
                  </span>
                ) : null;
              })}
            </div>
          </div>

          <div className="flex items-center justify-center md:self-start md:pt-12">
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
              className={`h-10 border-4 border-black rounded-none bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200 ${getHealthBarRing(blueModifiers)}`}
              indicatorStyle={getHealthBarIndicatorStyle("blue", blueModifiers)}
            />
            <div className="flex gap-1 flex-wrap mt-1 min-h-8">
              {blueModifiers.map((mod, i) => {
                const IconComp = PHOSPHOR_ICON_MAP[mod.icon];
                return IconComp ? (
                  <span
                    key={i}
                    title={mod.name}
                    className="inline-flex items-center justify-center w-8 h-8 border-2 border-black bg-white"
                  >
                    <IconComp
                      size={18}
                      weight="bold"
                      color={QUALITY_ICON_COLOR[mod.quality] ?? "#71717a"}
                    />
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>

      <Card
        className={`border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden p-0 ${
          isCircleArena
            ? "rounded-full flex items-center justify-center"
            : "rounded-none"
        }`}
        style={
          isCircleArena
            ? { width: CIRCLE_ARENA_SIZE, height: CIRCLE_ARENA_SIZE }
            : undefined
        }
      >
        <div
          className={isCircleArena ? "flex items-center justify-center" : ""}
        >
          <GameBoard
            key={gameKey}
            onRedHealthChange={setRedHealth}
            onBlueHealthChange={setBlueHealth}
            onBallDied={handleBallDied}
            onGameReady={handleGameReady}
          />
        </div>
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
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-black uppercase tracking-widest">
            Modifiers (Test)
          </p>
          <Button
            variant="outline"
            className="border-4 border-black rounded-none font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </div>
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
                      onClick={() => {
                        const m = mod.factory();
                        gameApiRef.current?.addModifier(ballId, m);
                        const setter =
                          ballId === "red" ? setRedModifiers : setBlueModifiers;
                        setter((prev) => [
                          ...prev,
                          { name: m.name, icon: m.icon, quality: m.quality },
                        ]);
                      }}
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

        <div className="mt-4 border-t-4 border-black pt-4">
          <p className="text-xs font-black uppercase tracking-widest mb-4">
            Arena Modifiers
          </p>
          <div className="flex gap-2 flex-wrap">
            {ARENA_MODIFIERS.map((mod) => {
              const IconComp = mod.icon;
              return (
                <Button
                  key={mod.label}
                  variant="outline"
                  className="border-4 border-black rounded-none font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                  onClick={() => {
                    gameApiRef.current?.addArenaModifier(mod.factory());
                    if (mod.label === "Circle Arena") setIsCircleArena(true);
                  }}
                >
                  <IconComp size={15} weight="bold" />
                  {mod.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
