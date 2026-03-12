"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PreMatchModalProps } from "./betting-types";

function getBaseMonkey(side: "red" | "blue", stake: number, minStake: number) {
  if (stake >= minStake * 2) {
    return "/monkey%20reactions/thinking_nobg/money.png";
  }
  return side === "red"
    ? "/monkey%20reactions/thinking_nobg/scared.png"
    : "/monkey%20reactions/thinking_nobg/cheeky.png";
}

export function PrematchBetModal({
  open,
  countdown,
  redHealth,
  blueHealth,
  bananas,
  selected,
  minStake,
  onSelectSide,
  onSelectStake,
  onConfirm,
  onSkip,
}: PreMatchModalProps) {
  const [monkeyMoodIndex, setMonkeyMoodIndex] = useState(0);

  const monkeyPool = useMemo(() => {
    const base = getBaseMonkey(selected.side, selected.stake, minStake);
    return [
      base,
      "/monkey%20reactions/thinking_nobg/hm.png",
      "/monkey%20reactions/thinking_nobg/thumbs.png",
      "/monkey%20reactions/thinking_nobg/thinking.png",
    ].filter((src, index, arr) => arr.indexOf(src) === index);
  }, [minStake, selected.side, selected.stake]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <Card className="w-full h-full border-0 rounded-none bg-white p-4 md:p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
                Pre-round decision ({countdown}s)
              </p>
              <h2 className="text-2xl md:text-5xl font-black uppercase mt-1">
                Pick Your Winner
              </h2>
            </div>
            <button
              type="button"
              className="border-4 border-black bg-yellow-200 p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              onClick={() =>
                setMonkeyMoodIndex((prev) => (prev + 1) % monkeyPool.length)
              }
              aria-label="Change monkey reaction"
            >
              <Image
                src={monkeyPool[monkeyMoodIndex]}
                alt="Monkey reaction"
                width={84}
                height={84}
                className="w-16 h-16 md:w-20 md:h-20 object-contain"
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 mt-4">
            <div className="border-4 border-black bg-red-100 p-2 md:p-3 text-center">
              <p className="text-[10px] md:text-xs font-black uppercase">
                Red HP
              </p>
              <p className="text-xl md:text-2xl font-black text-red-700">
                {redHealth}
              </p>
            </div>
            <div className="border-4 border-black bg-blue-100 p-2 md:p-3 text-center">
              <p className="text-[10px] md:text-xs font-black uppercase">
                Blue HP
              </p>
              <p className="text-xl md:text-2xl font-black text-blue-700">
                {blueHealth}
              </p>
            </div>
            <div className="border-4 border-black bg-yellow-300 p-2 md:p-3 text-center">
              <p className="text-[10px] md:text-xs font-black uppercase">
                Bananas
              </p>
              <p className="text-xl md:text-2xl font-black">{bananas}</p>
            </div>
          </div>

          <div className="mt-5 min-h-52 relative">
            <div className="absolute inset-x-0 top-0 flex justify-center animate-[shuffleWrap_920ms_ease-out_forwards]">
              <div className="relative w-48 h-64 overflow-visible">
                <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200" />
                <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200 animate-[shuffleA_900ms_ease-in-out_forwards]" />
                <div className="absolute inset-0 border-8 border-black rounded-none bg-blue-200 animate-[shuffleB_900ms_ease-in-out_forwards]" />
                <div className="absolute inset-0 border-8 border-black rounded-none bg-pink-200 animate-[shuffleC_900ms_ease-in-out_forwards]" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                className={`opacity-0 translate-y-8 animate-[cardReveal_500ms_ease-out_forwards] [animation-delay:980ms] border-8 p-4 rounded-none text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${selected.side === "red" ? "border-black bg-red-200" : "border-black bg-white"}`}
                onClick={() => onSelectSide("red")}
              >
                <p className="text-[11px] font-black uppercase tracking-widest">
                  Card 1
                </p>
                <p className="text-2xl font-black mt-1 text-red-700 uppercase">
                  Red Wins
                </p>
                <p className="text-xs font-bold text-zinc-700 mt-2">
                  High pressure opener.
                </p>
              </button>

              <button
                className={`opacity-0 translate-y-8 animate-[cardReveal_500ms_ease-out_forwards] [animation-delay:1080ms] border-8 p-4 rounded-none text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${selected.side === "blue" ? "border-black bg-blue-200" : "border-black bg-white"}`}
                onClick={() => onSelectSide("blue")}
              >
                <p className="text-[11px] font-black uppercase tracking-widest">
                  Card 2
                </p>
                <p className="text-2xl font-black mt-1 text-blue-700 uppercase">
                  Blue Wins
                </p>
                <p className="text-xs font-bold text-zinc-700 mt-2">
                  Counter momentum.
                </p>
              </button>

              <button
                className="opacity-0 translate-y-8 animate-[cardReveal_500ms_ease-out_forwards] [animation-delay:1180ms] border-8 border-black p-4 rounded-none text-left bg-zinc-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                onClick={onSkip}
              >
                <p className="text-[11px] font-black uppercase tracking-widest">
                  Card 3
                </p>
                <p className="text-2xl font-black mt-1 uppercase">Skip Round</p>
                <p className="text-xs font-bold text-zinc-700 mt-2">
                  Hold bankroll for later.
                </p>
              </button>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600 mb-2">
              Stake
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 25, 50].map((step) => (
                <Button
                  key={step}
                  variant="outline"
                  className="border-4 border-black rounded-none font-black uppercase h-10"
                  onClick={() =>
                    onSelectStake(
                      Math.min(
                        bananas,
                        Math.max(minStake, selected.stake + step),
                      ),
                    )
                  }
                  disabled={bananas <= selected.stake}
                >
                  +{step}
                </Button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                className="border-4 border-black rounded-none font-black uppercase h-11 px-4"
                onClick={() =>
                  onSelectStake(Math.max(minStake, selected.stake - 5))
                }
              >
                -5
              </Button>
              <div className="flex-1 border-4 border-black bg-yellow-200 text-center py-2 font-black text-2xl">
                {selected.stake}
              </div>
              <Button
                variant="outline"
                className="border-4 border-black rounded-none font-black uppercase h-11 px-4"
                onClick={() =>
                  onSelectStake(Math.min(bananas, selected.stake + 5))
                }
                disabled={bananas <= selected.stake}
              >
                +5
              </Button>
            </div>
            <p className="text-[11px] mt-2 font-black uppercase text-zinc-600">
              Minimum stake: {minStake}
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              className="h-12 border-4 border-black rounded-none font-black uppercase text-base bg-yellow-300 text-black hover:bg-yellow-200"
              onClick={onConfirm}
              disabled={selected.stake < minStake || selected.stake > bananas}
            >
              Lock Bet
            </Button>
          </div>
        </div>
      </Card>

      <style>{`
        @keyframes shuffleA {
          0% { transform: translate(0, 0) rotate(0deg); z-index: 3; }
          30% { transform: translate(-120px, -12px) rotate(-12deg); z-index: 2; }
          65% { transform: translate(90px, 8px) rotate(9deg); z-index: 1; }
          100% { transform: translate(-12px, -4px) rotate(-6deg); z-index: 1; }
        }
        @keyframes shuffleB {
          0% { transform: translate(0, 0) rotate(0deg); z-index: 2; }
          35% { transform: translate(110px, -10px) rotate(11deg); z-index: 3; }
          70% { transform: translate(-95px, 6px) rotate(-8deg); z-index: 2; }
          100% { transform: translate(12px, -4px) rotate(6deg); z-index: 2; }
        }
        @keyframes shuffleC {
          0% { transform: translate(0, 0) rotate(0deg); z-index: 1; }
          25% { transform: translate(0, -75px) rotate(4deg); z-index: 4; }
          60% { transform: translate(0, 65px) rotate(-4deg); z-index: 2; }
          100% { transform: translate(0, 8px) rotate(0deg); z-index: 4; }
        }
        @keyframes shuffleWrap {
          0% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
        @keyframes cardReveal {
          0% { opacity: 0; transform: translateY(32px); }
          100% { opacity: 1; transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}
