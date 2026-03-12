"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { generateRoomCode } from "@/lib/multiplayer";

const HostMultiplayerPanel = dynamic(
  () => import("../../components/game/host-multiplayer-panel"),
  { ssr: false },
);

export default function HostPage() {
  const [roomCode] = useState(() => generateRoomCode());
  return <HostMultiplayerPanel roomCode={roomCode} onExit={() => {}} />;
}
