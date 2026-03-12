"use client";

import dynamic from "next/dynamic";

const SingleplayerPanel = dynamic(
  () => import("@/components/game/singleplayer-panel"),
  { ssr: false },
);

export default function SingleplayerPage() {
  return <SingleplayerPanel />;
}
