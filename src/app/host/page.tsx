"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HostPage() {
  const joinedPlayers = ["MonkeyA", "MonkeyB", "MonkeyC"];

  return (
    <div className="w-screen min-h-screen flex flex-col items-center justify-center bg-white text-black font-sans relative p-8">
      <Link href="/">
        <Button
          className="absolute top-8 left-8 border-4 border-black rounded-none font-bold uppercase tracking-widest"
          variant="secondary"
        >
          Back to Menu
        </Button>
      </Link>

      <div className="w-full max-w-xl border-8 border-black bg-white p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl font-black uppercase mb-6 border-b-4 border-black pb-3">
          Host Lobby
        </h1>

        <div className="text-3xl font-black uppercase mb-8 border-4 border-black px-6 py-3 bg-yellow-400 w-fit">
          Room Code: ABCD
        </div>

        <h2 className="text-2xl font-black uppercase mb-3">Joined Players</h2>
        <ul className="mb-8 border-4 border-black bg-muted p-4 space-y-2 min-h-40">
          {joinedPlayers.map((player) => (
            <li
              key={player}
              className="text-lg font-bold uppercase border-b-2 border-black/30 pb-1 last:border-b-0"
            >
              {player}
            </li>
          ))}
        </ul>

        <Button className="w-full text-2xl py-8 border-4 border-black rounded-none uppercase font-black tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
          Start Game
        </Button>
      </div>
    </div>
  );
}
