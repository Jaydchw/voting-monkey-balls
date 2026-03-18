"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BlockButton } from "@/components/ui/block-button";
import { BlockInput } from "@/components/ui/block-input";
import { BlockCard } from "@/components/ui/block-card";
import { normalizeRoomCode, generateRoomCode } from "@/lib/multiplayer";
import {
  loadPlayerSession,
  clearPlayerSession,
} from "@/lib/multiplayer-session";
import {
  getPlayerNameValidationError,
  sanitizePlayerName,
} from "@/lib/name-validation";
import dynamic from "next/dynamic";

const JoinRemotePanel = dynamic(
  () => import("@/components/game/panels/join-remote-panel"),
  { ssr: false },
);

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roomCode, setRoomCode] = useState(() => {
    const fromUrl = searchParams.get("code");
    if (fromUrl) return normalizeRoomCode(fromUrl);
    const session = loadPlayerSession();
    if (session) return session.roomCode;
    return "";
  });

  const [playerName, setPlayerName] = useState(() => {
    const session = loadPlayerSession();
    if (session) return session.playerName;
    return "";
  });

  const [playerToken] = useState(() => {
    const session = loadPlayerSession();
    if (session) return session.playerToken;
    return `player-${generateRoomCode(8)}-${Date.now()}`;
  });

  const [joined, setJoined] = useState(() => {
    const session = loadPlayerSession();
    return Boolean(session && session.roomCode && session.playerName);
  });

  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleJoin = () => {
    const sanitized = sanitizePlayerName(playerName);
    const nameValidation = getPlayerNameValidationError(sanitized);
    if (nameValidation) {
      setNameError(nameValidation);
      return;
    }
    const normalized = normalizeRoomCode(roomCode);
    if (normalized.length < 4) {
      setCodeError("Room code must be at least 4 characters.");
      return;
    }
    setPlayerName(sanitized);
    setRoomCode(normalized);
    setNameError(null);
    setCodeError(null);
    setJoined(true);
  };

  if (joined && roomCode && playerName) {
    return (
      <JoinRemotePanel
        roomCode={roomCode}
        playerName={playerName}
        playerToken={playerToken}
        onExit={() => {
          clearPlayerSession();
          setJoined(false);
        }}
      />
    );
  }

  return (
    <div className="w-screen min-h-screen bg-white text-black font-sans flex flex-col items-center justify-center p-6 relative">
      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
      >
        <span className="text-lg">←</span>
        <span>Back</span>
      </button>

      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="inline-block border-4 border-black px-3 py-1 mb-3 bg-destructive text-destructive-foreground">
            <span className="text-xs font-black uppercase tracking-[0.3em]">
              Multiplayer
            </span>
          </div>
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
            Join
            <br />
            Game
          </h1>
        </div>

        <BlockCard shadow="lg" className="p-6 flex flex-col gap-5">
          <BlockInput
            label="Room Code"
            placeholder="ABCD"
            value={roomCode}
            centered
            error={codeError}
            onChange={(e) => {
              setCodeError(null);
              setRoomCode(normalizeRoomCode(e.target.value));
            }}
            maxLength={8}
          />

          <BlockInput
            label="Player Name"
            placeholder="Your name"
            value={playerName}
            error={nameError}
            onChange={(e) => {
              setNameError(null);
              setPlayerName(e.target.value);
            }}
            maxLength={20}
          />

          <BlockButton
            variant="danger"
            size="xl"
            fullWidth
            onClick={handleJoin}
            disabled={!roomCode || !playerName}
          >
            Join Room →
          </BlockButton>
        </BlockCard>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen min-h-screen flex items-center justify-center bg-white">
          <p className="text-sm font-black uppercase tracking-widest text-zinc-400">
            Loading...
          </p>
        </div>
      }
    >
      <JoinPageInner />
    </Suspense>
  );
}
