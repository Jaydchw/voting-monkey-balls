"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Robot, Play } from "@phosphor-icons/react";

const MIN_BOTS = 0;
const MAX_BOTS = 20;

const STEPPER_BTN =
  "w-12 h-12 border-4 border-black font-black text-xl flex items-center justify-center hover:bg-zinc-100 active:translate-y-0.5 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";

const START_BTN =
  "w-full py-5 border-4 border-black font-black uppercase tracking-widest text-xl bg-green-400 text-black hover:bg-green-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3";

export default function SingleplayerPage() {
  const [botCount, setBotCount] = useState(0);
  const playHref = useMemo(
    () => `/singleplayer/play?bots=${botCount}`,
    [botCount],
  );

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
          <div className="inline-block border-4 border-black px-3 py-1 mb-3 bg-green-400 text-black">
            <span className="text-xs font-black uppercase tracking-[0.3em]">
              Freeplay
            </span>
          </div>
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
            Single
            <br />
            player
          </h1>
        </div>

        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col gap-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">
              <Robot size={14} weight="fill" />
              Bot Count
            </p>

            <div className="flex items-center gap-4">
              <button
                className={STEPPER_BTN}
                onClick={() => setBotCount((c) => Math.max(MIN_BOTS, c - 1))}
              >
                −
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min={MIN_BOTS}
                  max={MAX_BOTS}
                  step={1}
                  value={botCount}
                  className="w-full accent-black"
                  onChange={(e) =>
                    setBotCount(
                      Math.max(
                        MIN_BOTS,
                        Math.min(MAX_BOTS, Number(e.target.value) || 0),
                      ),
                    )
                  }
                />
              </div>

              <button
                className={STEPPER_BTN}
                onClick={() => setBotCount((c) => Math.min(MAX_BOTS, c + 1))}
              >
                +
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {botCount === 0
                  ? "No bots — just you and the match"
                  : `${botCount} bot${botCount === 1 ? "" : "s"} will join`}
              </p>
              <span className="text-3xl font-black tabular-nums">
                {botCount}
              </span>
            </div>
          </div>

          <Link href={playHref}>
            <button className={START_BTN}>
              <Play size={20} weight="fill" />
              Start Match
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
