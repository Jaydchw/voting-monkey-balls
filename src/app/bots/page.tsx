import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BotsPage() {
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
      <h1 className="text-4xl font-black uppercase">Bots Placeholder</h1>
    </div>
  );
}
