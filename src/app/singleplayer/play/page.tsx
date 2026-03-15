"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SingleplayerPanel = dynamic(
  () => import("@/components/game/singleplayer-panel"),
  { ssr: false },
);

const MIN_BOTS = 0;
const MAX_BOTS = 20;

export default function SingleplayerPlayPage() {
  const [initialBotCount, setInitialBotCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parsedBots = Number(params.get("bots"));
    const clamped = Number.isFinite(parsedBots)
      ? Math.max(MIN_BOTS, Math.min(MAX_BOTS, Math.floor(parsedBots)))
      : 0;
    setInitialBotCount(clamped);
  }, []);

  return <SingleplayerPanel initialBotCount={initialBotCount} />;
}
