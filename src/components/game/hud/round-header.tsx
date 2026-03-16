"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

type RoundHeaderProps = {
  roundNumber: number;
  roundsTotal: number;
  timeLeftSeconds: number;
};

export function RoundHeader({
  roundNumber,
  roundsTotal,
  timeLeftSeconds,
}: RoundHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <Link href="/">
        <Button
          variant="secondary"
          className="border-4 border-black rounded-none font-black uppercase tracking-widest"
        >
          Back
        </Button>
      </Link>
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <Badge className="border-4 border-black rounded-none px-4 py-2 text-lg uppercase font-black bg-yellow-300 text-black">
          Round {roundNumber}/{roundsTotal}
        </Badge>
        <Badge className="border-4 border-black rounded-none px-4 py-2 text-lg uppercase font-black bg-cyan-300 text-black">
          {formatTimer(timeLeftSeconds)}
        </Badge>
      </div>
    </div>
  );
}
