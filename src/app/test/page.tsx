"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const GameBoardPanel = dynamic(
  () => import("@/components/game/game-board-panel"),
  { ssr: false },
);

export default function TestingPage() {
  return (
    <div className="w-screen min-h-screen flex flex-col items-center justify-start bg-white text-black font-sans relative py-12 px-6">
      <Link href="/">
        <Button
          className="absolute top-8 left-8 border-4 border-black rounded-none font-bold uppercase tracking-widest"
          variant="secondary"
        >
          Back to Menu
        </Button>
      </Link>
      <GameBoardPanel />
    </div>
  );
}
