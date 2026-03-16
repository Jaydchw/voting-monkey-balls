"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { normalizeRoomCode } from "@/lib/multiplayer";
import {
  getPlayerNameValidationError,
  sanitizePlayerName,
} from "@/lib/name-validation";

const JoinRemotePanel = dynamic(
  () => import("../../components/game/panels/join-remote-panel"),
  { ssr: false },
);

const INPUT_BASE =
  "w-full p-4 border-4 border-black bg-white text-xl font-black outline-none focus:ring-4 focus:ring-primary/30 transition-all";

const PRIMARY_BTN =
  "w-full py-5 border-4 border-black font-black uppercase tracking-widest text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 bg-primary text-primary-foreground hover:bg-primary/90 active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";

const DISABLED_BTN =
  "w-full py-5 border-4 border-black font-black uppercase tracking-widest text-xl bg-zinc-200 text-zinc-400 cursor-not-allowed";

function InputField({
  label,
  value,
  onChange,
  placeholder,
  error,
  centered = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string | null;
  centered?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={[
          INPUT_BASE,
          centered ? "text-center tracking-[0.3em] uppercase" : "",
          error ? "border-red-500" : "",
        ].join(" ")}
      />
      {error && (
        <p className="text-xs font-black uppercase tracking-wide text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function JoinPage() {
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    if (typeof window === "undefined") return "";
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
  const canJoin = normalizedCode.length >= 4 && !nameError;

  return (
    <div className="w-screen min-h-screen bg-white text-black font-sans flex flex-col items-center justify-center p-6 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
      >
        <span className="text-lg">←</span>
        <span>Back</span>
      </Link>

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

        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col gap-6">
          <InputField
            label="Your Name"
            value={playerNameInput}
            onChange={setPlayerNameInput}
            placeholder="Enter your name"
            error={playerNameInput.length > 0 ? nameError : null}
          />

          <InputField
            label="Room Code"
            value={roomCodeInput}
            onChange={(v) => setRoomCodeInput(normalizeRoomCode(v))}
            placeholder="XXXX"
            centered
          />

          <button
            className={canJoin ? PRIMARY_BTN : DISABLED_BTN}
            disabled={!canJoin}
            onClick={() => {
              if (!canJoin) return;
              setJoinedRoomCode(normalizedCode);
              setJoinedPlayerName(sanitizedName);
            }}
          >
            Enter Arena
          </button>
        </div>

        {normalizedCode.length >= 4 && (
          <p className="mt-4 text-center text-xs font-black uppercase tracking-widest text-zinc-400">
            Joining room <span className="text-black">{normalizedCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}
