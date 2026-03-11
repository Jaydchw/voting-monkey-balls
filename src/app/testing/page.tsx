import Link from "next/link";
import { Button } from "@/components/ui/button";
import GameBoardPanel from "@/components/game/game-board-panel";

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
      <h1 className="text-4xl font-black uppercase text-destructive border-b-8 border-destructive pb-4 mb-8">
        Testing Zone
      </h1>
      <p className="text-xl font-bold uppercase mb-6">
        Secret testing playground
      </p>
      <GameBoardPanel />
    </div>
  );
}
