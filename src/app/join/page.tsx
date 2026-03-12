"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { normalizeRoomCode } from "@/lib/multiplayer";
import {
  getPlayerNameValidationError,
  sanitizePlayerName,
} from "@/lib/name-validation";

const JoinRemotePanel = dynamic(
  () => import("../../components/game/join-remote-panel"),
  { ssr: false },
);

export default function JoinPage() {
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const params = new URLSearchParams(window.location.search);
    return normalizeRoomCode(params.get("code") ?? "");
  });
  const [playerNameInput, setPlayerNameInput] = useState("");
  const [joinedRoomCode, setJoinedRoomCode] = useState<string | null>(null);
  const [joinedPlayerName, setJoinedPlayerName] = useState<string | null>(null);

  if (joinedRoomCode && joinedPlayerName) {
    return (
      <JoinRemotePanel
        roomCode={joinedRoomCode}
        playerName={joinedPlayerName}
        onExit={() => {
          setJoinedRoomCode(null);
          setJoinedPlayerName(null);
        }}
      />
    );
  }

  const normalizedCode = normalizeRoomCode(roomCodeInput);
  const sanitizedName = sanitizePlayerName(playerNameInput);
  const nameError = getPlayerNameValidationError(playerNameInput);

  return (
    <div className="w-screen min-h-screen flex flex-col items-center justify-center bg-white text-black font-sans relative p-8">
      <Link href="/">
        <Button
          className="absolute top-8 left-8 border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase tracking-widest"
          variant="secondary"
        >
          Back to Menu
        </Button>
      </Link>

      <Card className="w-full max-w-xl border-8 border-black rounded-none p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl font-black uppercase mb-6 border-b-4 border-black pb-3">
          Join Game
        </h1>

        <label className="text-xs font-black uppercase tracking-widest">
          Player Name
        </label>
        <input
          type="text"
          value={playerNameInput}
          placeholder="Your Name"
          onChange={(event) => setPlayerNameInput(event.target.value)}
          className="mt-2 text-2xl p-4 border-4 border-black rounded-none mb-6 outline-none focus:ring-4 focus:ring-primary uppercase"
        />
        {nameError && (
          <p className="-mt-4 mb-5 text-xs font-black uppercase text-red-600">
            {nameError}
          </p>
        )}

        <label className="text-xs font-black uppercase tracking-widest">
          Room Code
        </label>
        <input
          type="text"
          value={roomCodeInput}
          placeholder="Enter Room Code"
          onChange={(event) =>
            setRoomCodeInput(normalizeRoomCode(event.target.value))
          }
          className="mt-2 text-2xl p-4 border-4 border-black rounded-none mb-8 outline-none focus:ring-4 focus:ring-primary uppercase text-center"
        />

        <Button
          className="w-full text-2xl py-8 border-4 border-black rounded-none uppercase font-black tracking-widest bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            setJoinedRoomCode(normalizedCode);
            setJoinedPlayerName(sanitizedName);
          }}
          disabled={normalizedCode.length < 4 || Boolean(nameError)}
        >
          Enter Arena
        </Button>
      </Card>
    </div>
  );
}
