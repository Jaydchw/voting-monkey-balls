"use client";

import dynamic from "next/dynamic";

const SingleplayerPanel = dynamic(
  () => import("@/components/game/panels/singleplayer-panel"),
  { ssr: false },
);

const MIN_BOTS = 0;
const MAX_BOTS = 20;

function clampBots(value: number): number {
  return Number.isFinite(value)
    ? Math.max(MIN_BOTS, Math.min(MAX_BOTS, Math.floor(value)))
    : 0;
}

export default function SingleplayerPlayPage() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const initialBotCount = clampBots(Number(params.get("bots")));
  const characterSelectEnabled = params.get("characterSelect") !== "0";

  return (
    <SingleplayerPanel
      initialBotCount={initialBotCount}
      characterSelectEnabled={characterSelectEnabled}
    />
  );
}
