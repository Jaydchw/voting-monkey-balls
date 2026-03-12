"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Icon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GameApi } from "@/components/game/game-board";
import type { BallModifier } from "@/game/ball-modifier";
import type { Weapon } from "@/game/weapon";
import {
  MODIFIER_CATALOG,
  ARENA_MODIFIER_CATALOG,
  WEAPON_CATALOG,
} from "@/game/catalog";

const GameBoard = dynamic(() => import("@/components/game/game-board"), {
  ssr: false,
});

type ModifierState = { name: string; icon: Icon; quality: number };

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
  "Twin Hearts": "ring-4 ring-rose-400",
  "Rapid Fire": "ring-4 ring-sky-400",
  "Stunning Strikes": "ring-4 ring-cyan-500",
  "Caustic Payload": "ring-4 ring-emerald-500",
  "Projectile Deflector": "ring-4 ring-teal-400",
  "Artillery Specialist": "ring-4 ring-amber-400",
  "Duelist Specialist": "ring-4 ring-fuchsia-400",
  "Lucky Evade": "ring-4 ring-indigo-400",
  "Phase Shift": "ring-4 ring-cyan-300",
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
  "Twin Hearts": "#fb7185",
  "Rapid Fire": "#38bdf8",
  "Stunning Strikes": "#06b6d4",
  "Caustic Payload": "#34d399",
  "Projectile Deflector": "#14b8a6",
  "Artillery Specialist": "#f59e0b",
  "Duelist Specialist": "#d946ef",
  "Lucky Evade": "#6366f1",
  "Phase Shift": "#22d3ee",
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
  const [redWeapons, setRedWeapons] = useState<ModifierState[]>([]);
  const [blueWeapons, setBlueWeapons] = useState<ModifierState[]>([]);
  const [isCircleArena, setIsCircleArena] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const handleBallDied = useCallback((id: "red" | "blue") => {
    setWinner(id === "red" ? "blue" : "red");
  }, []);
  const handleClearAll = useCallback(() => {
    setGameKey((k) => k + 1);
    setRedHealth(STARTING_HEALTH);
    setBlueHealth(STARTING_HEALTH);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setWinner(null);
    setRedModifiers([]);
    setBlueModifiers([]);
    setRedWeapons([]);
    setBlueWeapons([]);
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

  const addModifierToBall = useCallback(
    (ballId: "red" | "blue", modifier: BallModifier) => {
      gameApiRef.current?.addModifier(ballId, modifier);
      const setter = ballId === "red" ? setRedModifiers : setBlueModifiers;
      setter((prev) => [
        ...prev,
        { name: modifier.name, icon: modifier.icon, quality: modifier.quality },
      ]);
    },
    [],
  );

  const addWeaponToBall = useCallback(
    (ballId: "red" | "blue", weapon: Weapon) => {
      gameApiRef.current?.addWeapon(ballId, weapon);
      const setter = ballId === "red" ? setRedWeapons : setBlueWeapons;
      setter((prev) => [
        ...prev,
        { name: weapon.name, icon: weapon.icon, quality: weapon.quality },
      ]);
    },
    [],
  );

  const renderBallControls = (ballId: "red" | "blue") => (
    <div className="flex flex-col gap-2">
      <span
        className={`text-sm font-black uppercase tracking-widest ${
          ballId === "red" ? "text-red-600" : "text-blue-600"
        }`}
      >
        {ballId === "red" ? "Red" : "Blue"} Ball
      </span>
      <div className="flex gap-2 flex-wrap">
        {MODIFIER_CATALOG.map((mod) => {
          const IconComp = mod.icon;
          return (
            <Button
              key={mod.label}
              variant="outline"
              className="border-4 border-black rounded-none font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
              onClick={() => addModifierToBall(ballId, mod.create())}
            >
              <IconComp size={15} weight="bold" />
              {mod.label}
            </Button>
          );
        })}
      </div>

      <span
        className={`mt-2 text-sm font-black uppercase tracking-widest ${
          ballId === "red" ? "text-red-600" : "text-blue-600"
        }`}
      >
        {ballId === "red" ? "Red" : "Blue"} Weapons
      </span>
      <div className="flex gap-2 flex-wrap">
        {WEAPON_CATALOG.map((weapon) => {
          const IconComp = weapon.icon;
          return (
            <Button
              key={weapon.label}
              variant="outline"
              className="border-4 border-black rounded-none font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 bg-amber-100"
              onClick={() => addWeaponToBall(ballId, weapon.create())}
            >
              <IconComp size={15} weight="bold" />
              {weapon.label}
            </Button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-390 mx-auto">
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
                const IconComp = mod.icon;
                return (
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
                );
              })}
            </div>
            <div className="flex gap-1 flex-wrap min-h-8">
              {redWeapons.map((weapon, i) => {
                const IconComp = weapon.icon;
                return (
                  <span
                    key={`${weapon.name}-${i}`}
                    title={weapon.name}
                    className="inline-flex items-center justify-center px-2 h-8 border-2 border-black bg-amber-100"
                  >
                    <IconComp
                      size={16}
                      weight="bold"
                      color={QUALITY_ICON_COLOR[weapon.quality] ?? "#71717a"}
                    />
                  </span>
                );
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
                const IconComp = mod.icon;
                return (
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
                );
              })}
            </div>
            <div className="flex gap-1 flex-wrap min-h-8">
              {blueWeapons.map((weapon, i) => {
                const IconComp = weapon.icon;
                return (
                  <span
                    key={`${weapon.name}-${i}`}
                    title={weapon.name}
                    className="inline-flex items-center justify-center px-2 h-8 border-2 border-black bg-amber-100"
                  >
                    <IconComp
                      size={16}
                      weight="bold"
                      color={QUALITY_ICON_COLOR[weapon.quality] ?? "#71717a"}
                    />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-end mb-4">
        <Button
          variant="outline"
          className="border-4 border-black rounded-none font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          onClick={handleClearAll}
        >
          Clear All
        </Button>
      </div>

      <div className="w-full grid grid-cols-1 xl:grid-cols-[300px_auto_300px] gap-6 items-start justify-center">
        <Card className="border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none xl:max-h-130 xl:overflow-y-auto">
          <p className="text-xs font-black uppercase tracking-widest mb-3">
            Red Controls
          </p>
          {renderBallControls("red")}
        </Card>

        <div className="flex flex-col items-center">
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
              className={
                isCircleArena ? "flex items-center justify-center" : ""
              }
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
              style={{
                backgroundColor: winner === "red" ? "#fee2e2" : "#dbeafe",
              }}
            >
              <span
                className="text-3xl font-black uppercase tracking-widest"
                style={{ color: winner === "red" ? "#b91c1c" : "#1d4ed8" }}
              >
                {winner === "red" ? "Red" : "Blue"} Wins!
              </span>
            </div>
          )}

          <Card className="mt-6 w-full border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <p className="text-xs font-black uppercase tracking-widest mb-4">
              Arena Modifiers
            </p>
            <div className="flex gap-2 flex-wrap">
              {ARENA_MODIFIER_CATALOG.map((mod) => {
                const IconComp = mod.icon;
                return (
                  <Button
                    key={mod.label}
                    variant="outline"
                    className="border-4 border-black rounded-none font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                    onClick={() => {
                      gameApiRef.current?.addArenaModifier(mod.create());
                      if (mod.label === "Circle Arena") setIsCircleArena(true);
                    }}
                  >
                    <IconComp size={15} weight="bold" />
                    {mod.label}
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none xl:max-h-130 xl:overflow-y-auto">
          <p className="text-xs font-black uppercase tracking-widest mb-3">
            Blue Controls
          </p>
          {renderBallControls("blue")}
        </Card>
      </div>
    </div>
  );
}
