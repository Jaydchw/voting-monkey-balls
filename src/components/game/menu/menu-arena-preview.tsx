"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GameApi } from "@/components/game/arena/game-board";
import {
  MODIFIER_CATALOG,
  ARENA_MODIFIER_CATALOG,
  WEAPON_CATALOG,
} from "@/game/catalog";

const GameBoard = dynamic(() => import("@/components/game/arena/game-board"), {
  ssr: false,
});

function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function MenuArenaPreview() {
  const gameApiRef = useRef<GameApi | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [redHealth, setRedHealth] = useState(100);
  const [blueHealth, setBlueHealth] = useState(100);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyRandomLoadout = useCallback((api: GameApi) => {
    const modifiers = pickRandom(
      MODIFIER_CATALOG,
      Math.floor(Math.random() * 2) + 1,
    );
    const weapons = pickRandom(
      WEAPON_CATALOG,
      Math.floor(Math.random() * 2) + 1,
    );
    const arenas = pickRandom(
      ARENA_MODIFIER_CATALOG,
      Math.floor(Math.random() * 2) + 1,
    );

    for (const mod of modifiers) {
      api.addModifier("red", mod.create());
      api.addModifier("blue", mod.create());
    }
    for (const weapon of weapons) {
      api.addWeapon("red", weapon.create());
      api.addWeapon("blue", weapon.create());
    }
    for (const arena of arenas) {
      api.addArenaModifier(arena.create());
    }
  }, []);

  const handleGameReady = useCallback(
    (api: GameApi) => {
      gameApiRef.current = api;
      setTimeout(() => applyRandomLoadout(api), 300);
    },
    [applyRandomLoadout],
  );

  const resetGame = useCallback(() => {
    gameApiRef.current = null;
    setRedHealth(100);
    setBlueHealth(100);
    setGameKey((k) => k + 1);
  }, []);

  const handleBallDied = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(resetGame, 2500);
  }, [resetGame]);

  useEffect(() => {
    resetTimerRef.current = setTimeout(resetGame, 30000);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [gameKey, resetGame]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const redPct = Math.max(0, redHealth);
  const bluePct = Math.max(0, blueHealth);

  return (
    <div className="flex flex-col gap-3 select-none pointer-events-none">
      <div className="flex items-center gap-3 px-1">
        <span className="text-xs font-black uppercase tracking-widest text-red-600 w-8">
          RED
        </span>
        <div className="flex-1 h-3 bg-zinc-200 border-2 border-black overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${redPct}%` }}
          />
        </div>
        <span className="text-xs font-black tabular-nums w-8 text-right">
          {Math.round(redHealth)}
        </span>
      </div>

      <div className="flex items-center gap-3 px-1">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600 w-8">
          BLU
        </span>
        <div className="flex-1 h-3 bg-zinc-200 border-2 border-black overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${bluePct}%` }}
          />
        </div>
        <span className="text-xs font-black tabular-nums w-8 text-right">
          {Math.round(blueHealth)}
        </span>
      </div>

      <div className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <GameBoard
          key={gameKey}
          onRedHealthChange={setRedHealth}
          onBlueHealthChange={setBlueHealth}
          onBallDied={handleBallDied}
          onGameReady={handleGameReady}
        />
      </div>

      <p className="text-center text-xs font-black uppercase tracking-widest text-zinc-400">
        Live Match Preview
      </p>
    </div>
  );
}
