"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import type { GameApi } from "@/components/game/game-board";

const GameBoard = dynamic(() => import("@/components/game/game-board"), {
  ssr: false,
});

const CIRCLE_ARENA_SIZE = 410;

type ArenaBoardProps = {
  gameKey: number;
  isCircleArena: boolean;
  onRedHealthChange: (health: number) => void;
  onBlueHealthChange: (health: number) => void;
  onBallDied: (id: "red" | "blue") => void;
  onGameReady: (api: GameApi) => void;
  onWallCollision?: (ballId: "red" | "blue") => void;
  onBallCollision?: () => void;
};

export function ArenaBoard({
  gameKey,
  isCircleArena,
  onRedHealthChange,
  onBlueHealthChange,
  onBallDied,
  onGameReady,
  onWallCollision,
  onBallCollision,
}: ArenaBoardProps) {
  return (
    <Card
      className={`border-8 border-black p-0 shadow-[16px_16px_0_0_rgba(0,0,0,1)] overflow-hidden ${
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
      <div className={isCircleArena ? "flex items-center justify-center" : ""}>
        <GameBoard
          key={gameKey}
          onRedHealthChange={onRedHealthChange}
          onBlueHealthChange={onBlueHealthChange}
          onBallDied={onBallDied}
          onGameReady={onGameReady}
          onWallCollision={onWallCollision}
          onBallCollision={onBallCollision}
        />
      </div>
    </Card>
  );
}
