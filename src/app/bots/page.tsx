"use client";

import dynamic from "next/dynamic";

const BotsGameBoardPanel = dynamic(
  () => import("@/components/game/bots-game-board-panel"),
  { ssr: false },
);

export default function BotsPage() {
  return <BotsGameBoardPanel />;
}
