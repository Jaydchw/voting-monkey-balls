"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { generateRoomCode } from "@/lib/multiplayer";

const HostMultiplayerPanel = dynamic(
  () => import("../../components/game/panels/host-multiplayer-panel"),
  { ssr: false },
);

export default function HostPage() {
  const router = useRouter();
  const [roomCode] = useState(() => generateRoomCode());
  return (
    <HostMultiplayerPanel
      roomCode={roomCode}
      onExit={() => router.push("/")}
    />
  );
}
