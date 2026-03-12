import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MainMenu() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-white text-black font-sans p-8">
      <h1 className="text-6xl font-black mb-12 tracking-widest uppercase text-center border-b-8 border-black pb-4">
        Voting Monkey Balls
      </h1>

      <Card className="flex flex-col gap-6 p-8 border-8 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] w-full max-w-md bg-white">
        <Link href="/host" className="w-full">
          <Button className="w-full text-2xl py-8 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
            Host
          </Button>
        </Link>
        <Link href="/join" className="w-full">
          <Button className="w-full text-2xl py-8 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Join
          </Button>
        </Link>
        <div className="border-t-4 border-black pt-4">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-center">
            Freeplay
          </p>
        </div>
        <Link href="/singleplayer" className="w-full">
          <Button className="w-full text-2xl py-8 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-green-400 text-black hover:bg-green-300">
            Singleplayer
          </Button>
        </Link>
        <Link href="/bots" className="w-full">
          <Button className="w-full text-2xl py-8 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-white text-black hover:bg-gray-100">
            Watch Bots
          </Button>
        </Link>
        <div className="border-t-4 border-black pt-4">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-center">
            Dev
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/test" className="flex-1">
            <Button className="w-full py-6 border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-cyan-300 text-black hover:bg-cyan-200 text-sm">
              Test
            </Button>
          </Link>
          <Link href="/audio-test" className="flex-1">
            <Button className="w-full py-6 border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-yellow-300 text-black hover:bg-yellow-200 text-sm">
              Audio
            </Button>
          </Link>
        </div>
      </Card>

      <p className="mt-16 text-lg font-bold uppercase tracking-wide text-center">
        Created by Jayden Holdsworth and Archie Hull for the Three Thing Game
        Jam
      </p>
    </div>
  );
}
