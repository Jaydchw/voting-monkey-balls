"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FullscreenModal } from "./fullscreen-modal";
import { ModalSurface } from "./modal-surface";
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
  const [locked, setLocked] = useState(false);

  if (!open) {
    return null;
  }

  const cappedStake = Math.min(bananas, Math.max(minStake, selected.stake));
  const expectedWinnings = cappedStake * 2;

  const total = Math.max(1, redHealth + blueHealth);
  const distribution = {
    redPct: Math.round((redHealth / total) * 100),
    bluePct: 100 - Math.round((redHealth / total) * 100),
  };

  const lockSelection = (side: "red" | "blue") => {
    if (cappedStake < minStake || cappedStake > bananas) {
      return;
    }

    onSelectSide(side);
    setLocked(true);
    onConfirm();
  };

  const presets = [20, 30, 50, 100];
  const pressButtonClass =
    "border-2 border-black rounded-none bg-white shadow-[0_4px_0_0_rgba(0,0,0,1)] active:translate-y-[3px] active:shadow-[0_1px_0_0_rgba(0,0,0,1)]";

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-5xl"
      zIndexClassName="z-50"
    >
      <ModalSurface>
        <div className="px-3 py-3 sm:px-4 sm:py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
              {countdown > 0 ? `Pre-round (${countdown}s)` : "Pre-round"}
            </p>
            <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase mt-1">
              Pick Winner
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-sm sm:text-base font-black">
            <Image
              src="/Banana.svg"
              alt="Banana"
              width={18}
              height={18}
              className="w-4 h-auto sm:w-5"
            />
            <span>{bananas}</span>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              className="p-3 sm:p-4 text-left border-4 rounded-none transition-all duration-150 shadow-[0_5px_0_0_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[0_2px_0_0_rgba(0,0,0,1)] border-black bg-white hover:bg-red-50"
              onClick={() => lockSelection("red")}
            >
              <p className="text-[10px] font-black uppercase tracking-wider">
                {distribution.redPct}% pressure
              </p>
              <p className="text-2xl sm:text-3xl font-black text-red-700 mt-1">
                RED
              </p>
            </button>
            <button
              type="button"
              className="p-3 sm:p-4 text-left border-4 rounded-none transition-all duration-150 shadow-[0_5px_0_0_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[0_2px_0_0_rgba(0,0,0,1)] border-black bg-white hover:bg-blue-50"
              onClick={() => lockSelection("blue")}
            >
              <p className="text-[10px] font-black uppercase tracking-wider">
                {distribution.bluePct}% pressure
              </p>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                BLUE
              </p>
            </button>
          </div>

          <div className="mt-3 p-3 sm:p-4 bg-zinc-50">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                Stake
              </p>
              <p className="text-base sm:text-lg font-black">{cappedStake}</p>
            </div>

            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {presets.map((preset, index) => (
                <button
                  key={preset}
                  type="button"
                  className={`relative isolate h-10 overflow-hidden border-2 border-black bg-linear-to-b from-yellow-100 to-yellow-200 text-sm font-black text-zinc-900 shadow-[0_4px_0_0_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0.75 active:shadow-[0_1px_0_0_rgba(0,0,0,1)] ${index === 3 ? "hidden sm:block" : ""}`}
                  onClick={() =>
                    onSelectStake(Math.min(bananas, Math.max(minStake, preset)))
                  }
                >
                  <span className="absolute -right-2 -top-1 opacity-15 pointer-events-none">
                    <Image src="/Banana.svg" alt="" width={26} height={26} />
                  </span>
                  {preset}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={`h-9 px-3 text-sm font-black ${pressButtonClass}`}
                onClick={() =>
                  onSelectStake(Math.max(minStake, selected.stake - 5))
                }
              >
                -5
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`h-9 px-3 text-sm font-black ${pressButtonClass}`}
                onClick={() =>
                  onSelectStake(Math.min(bananas, selected.stake + 5))
                }
                disabled={bananas <= selected.stake}
              >
                +5
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`h-9 ml-auto px-3 text-sm font-black ${pressButtonClass}`}
                onClick={onSkip}
              >
                Skip
              </Button>
            </div>
          </div>

          <p className="mt-2 text-xs font-black uppercase text-zinc-700">
            Expected return: {expectedWinnings}
          </p>
        </div>
      </ModalSurface>

      {locked && (
        <FullscreenModal
          open={locked}
          maxWidthClassName="max-w-md"
          zIndexClassName="z-60"
          overlayClassName="bg-black/40"
        >
          <ModalSurface className="p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
              Locked In
            </p>
            <h3 className="text-lg sm:text-xl font-black uppercase mt-1">
              {selected.side.toUpperCase()} | {cappedStake}
            </h3>
            <p className="text-sm font-bold text-zinc-700 mt-2">
              This selection is active. Wait for the timer, or cancel to change.
            </p>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className={`h-9 px-3 text-sm font-black ${pressButtonClass}`}
                onClick={() => setLocked(false)}
              >
                Cancel And Change
              </Button>
            </div>
          </ModalSurface>
        </FullscreenModal>
      )}
    </FullscreenModal>
  );
}
