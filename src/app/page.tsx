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
        <Link href="/bots" className="w-full">
          <Button className="w-full text-2xl py-8 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-white text-black hover:bg-gray-100">
            Bots
          </Button>
        </Link>
      </Card>

      <p className="mt-16 text-lg font-bold uppercase tracking-wide text-center">
        Created by Jayden Holdsworth and Archie Hull for the Three Thing Game
        Jam
      </p>
    </div>
  );
}
