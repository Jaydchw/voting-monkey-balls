"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Robot, Play } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BananaInline } from "@/components/ui/banana-inline";

const MIN_BOTS = 0;
const MAX_BOTS = 20;

export default function SingleplayerPage() {
  const [botCount, setBotCount] = useState(0);
  const playHref = useMemo(
    () => `/singleplayer/play?bots=${botCount}`,
    [botCount],
  );

  return (
    <div className="w-screen min-h-screen bg-white text-black p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-wide">
            Singleplayer Settings
          </h1>
          <Link href="/">
            <Button
              variant="outline"
              className="border-2 border-black rounded-none font-black uppercase"
            >
              Back
            </Button>
          </Link>
        </div>

        <section className="border-t border-zinc-200 p-5">
          <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
            <Robot size={14} weight="fill" /> Bot Count
          </p>
          <p className="mt-2 text-sm text-zinc-700">
            Configure how many bots join the match before you launch.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <input
              type="range"
              min={MIN_BOTS}
              max={MAX_BOTS}
              step={1}
              value={botCount}
              className="flex-1 accent-black"
              onChange={(event) =>
                setBotCount(
                  Math.max(
                    MIN_BOTS,
                    Math.min(MAX_BOTS, Number(event.target.value) || 0),
                  ),
                )
              }
            />
            <p className="w-20 text-right text-2xl font-black tabular-nums">
              <BananaInline iconSize={18}>{botCount}</BananaInline>
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Link href={playHref}>
              <Button className="rounded-xl border border-black/15 font-semibold uppercase inline-flex items-center gap-1.5">
                <Play size={14} weight="fill" /> Start Match
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
