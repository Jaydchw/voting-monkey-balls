import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function JoinPage() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-white text-black font-sans relative">
      <Link href="/">
        <Button
          className="absolute top-8 left-8 border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase tracking-widest"
          variant="secondary"
        >
          Back to Menu
        </Button>
      </Link>
      <h1 className="text-4xl font-black uppercase mb-8">Join Game</h1>
      <input
        type="text"
        placeholder="Enter Room Code"
        className="text-2xl p-4 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 outline-none focus:ring-4 focus:ring-primary uppercase text-center"
      />
      <Button className="text-2xl px-12 py-8 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase font-black tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
        Enter Arena
      </Button>
    </div>
  );
}
