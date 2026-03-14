"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PreMatchModalProps } from "./betting-types";

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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-4xl border-4 border-black rounded-none p-4 md:p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)] bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
              Pre-round decision ({countdown}s)
            </p>
            <h2 className="text-2xl md:text-5xl font-black uppercase mt-1">
              Pick Red Or Blue
            </h2>
          </div>
          <Image
            src={
              selected.stake >= minStake * 2
                ? "/monkey%20reactions/thinking_nobg/money.png"
                : "/monkey%20reactions/thinking_nobg/thinking.png"
            }
            alt="Monkey reaction"
            width={84}
            height={84}
            className="w-16 h-16 md:w-20 md:h-20 object-contain"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3 mt-4">
          <div className="border-4 border-black bg-red-100 p-2 md:p-3 text-center">
            <p className="text-[10px] md:text-xs font-black uppercase">Red HP</p>
            <p className="text-xl md:text-2xl font-black text-red-700">{redHealth}</p>
          </div>
          <div className="border-4 border-black bg-blue-100 p-2 md:p-3 text-center">
            <p className="text-[10px] md:text-xs font-black uppercase">Blue HP</p>
            <p className="text-xl md:text-2xl font-black text-blue-700">{blueHealth}</p>
          </div>
          <div className="border-4 border-black bg-yellow-300 p-2 md:p-3 text-center">
            <p className="text-[10px] md:text-xs font-black uppercase">Bananas</p>
            <p className="text-xl md:text-2xl font-black">{bananas}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            className={`border-8 p-4 rounded-none text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${selected.side === "red" ? "border-black bg-red-200" : "border-black bg-white"}`}
            onClick={() => onSelectSide("red")}
          >
            <p className="text-[11px] font-black uppercase tracking-widest">Team</p>
            <p className="text-3xl font-black mt-1 text-red-700 uppercase">Red</p>
          </button>

          <button
            className={`border-8 p-4 rounded-none text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${selected.side === "blue" ? "border-black bg-blue-200" : "border-black bg-white"}`}
            onClick={() => onSelectSide("blue")}
          >
            <p className="text-[11px] font-black uppercase tracking-widest">Team</p>
            <p className="text-3xl font-black mt-1 text-blue-700 uppercase">Blue</p>
          </button>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600 mb-2">
            Wager
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map((step) => (
              <Button
                key={step}
                variant="outline"
                className="border-4 border-black rounded-none font-black uppercase h-10"
                onClick={() =>
                  onSelectStake(
                    Math.min(bananas, Math.max(minStake, selected.stake + step)),
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
              onClick={() => onSelectStake(Math.max(minStake, selected.stake - 5))}
            >
              -5
            </Button>
            <div className="flex-1 border-4 border-black bg-yellow-200 text-center py-2 font-black text-2xl">
              {selected.stake}
            </div>
            <Button
              variant="outline"
              className="border-4 border-black rounded-none font-black uppercase h-11 px-4"
              onClick={() => onSelectStake(Math.min(bananas, selected.stake + 5))}
              disabled={bananas <= selected.stake}
            >
              +5
            </Button>
          </div>
          <p className="text-[11px] mt-2 font-black uppercase text-zinc-600">
            Minimum stake: {minStake}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            className="h-12 border-4 border-black rounded-none font-black uppercase text-base"
            onClick={onSkip}
          >
            Skip
          </Button>
          <Button
            className="h-12 border-4 border-black rounded-none font-black uppercase text-base bg-yellow-300 text-black hover:bg-yellow-200"
            onClick={onConfirm}
            disabled={selected.stake < minStake || selected.stake > bananas}
          >
            Lock Bet
          </Button>
        </div>
      </Card>
    </div>
  );
}
