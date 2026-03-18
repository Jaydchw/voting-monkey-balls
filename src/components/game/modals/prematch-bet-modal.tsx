"use client";

import { useState } from "react";
import Image from "next/image";
import { BlockButton } from "@/components/ui/block-button";
import { BlockSlider } from "@/components/ui/block-slider";
import { BlockCard } from "@/components/ui/block-card";
import { FullscreenModal } from "@/components/game/modals/fullscreen-modal";
import type { PreMatchModalProps } from "@/components/game/modals/types";

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

  if (!open) return null;

  const cappedStake = Math.min(bananas, Math.max(minStake, selected.stake));
  const expectedWinnings = cappedStake * 2;
  const total = Math.max(1, redHealth + blueHealth);
  const redPct = Math.round((redHealth / total) * 100);
  const bluePct = 100 - redPct;

  const lockSelection = (side: "red" | "blue") => {
    if (cappedStake < minStake || cappedStake > bananas) return;
    onSelectSide(side);
    setLocked(true);
    onConfirm();
  };

  const presets = [20, 30, 50, 100];

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-2xl"
      zIndexClassName="z-50"
    >
      <div className="w-full bg-white">
        <div className="p-4 sm:p-7 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                {countdown > 0 ? `Pre-round · ${countdown}s` : "Pre-round"}
              </p>
              <h2 className="text-xl sm:text-3xl font-black uppercase mt-0.5">
                Pick Your Side
              </h2>
            </div>
            <div className="flex items-center gap-2 border-4 border-black px-3 py-2 bg-yellow-300 shrink-0">
              <Image src="/Banana.svg" alt="Banana" width={16} height={16} />
              <span className="text-base font-black tabular-nums">
                {bananas}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={() => lockSelection("red")}
              className="p-3 sm:p-5 border-4 border-black bg-white hover:bg-red-50 text-left shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {redPct}% pressure
              </p>
              <p className="text-2xl sm:text-4xl font-black text-red-600 mt-0.5">
                RED
              </p>
              <p className="text-xs font-bold text-zinc-400 mt-0.5 uppercase">
                {redHealth} HP
              </p>
            </button>

            <button
              onClick={() => lockSelection("blue")}
              className="p-3 sm:p-5 border-4 border-black bg-white hover:bg-blue-50 text-left shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {bluePct}% pressure
              </p>
              <p className="text-2xl sm:text-4xl font-black text-blue-600 mt-0.5">
                BLUE
              </p>
              <p className="text-xs font-bold text-zinc-400 mt-0.5 uppercase">
                {blueHealth} HP
              </p>
            </button>
          </div>

          <BlockCard
            shadow="none"
            tinted
            className="p-3 sm:p-4 border-2 flex flex-col items-center gap-3"
          >
            <p className="self-start text-xs font-black uppercase tracking-widest text-zinc-500">
              Stake
            </p>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() =>
                    onSelectStake(Math.min(bananas, Math.max(minStake, preset)))
                  }
                  className={[
                    "py-2 border-4 border-black text-xs sm:text-sm font-black transition-all",
                    "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
                    cappedStake === preset
                      ? "bg-yellow-300"
                      : "bg-yellow-100 hover:bg-yellow-200",
                  ].join(" ")}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full">
              <button
                onClick={() =>
                  onSelectStake(Math.max(minStake, selected.stake - 5))
                }
                className="w-10 h-10 sm:w-11 sm:h-11 border-4 border-black font-black text-lg flex items-center justify-center bg-white hover:bg-zinc-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all shrink-0"
              >
                −
              </button>
              <BlockSlider
                min={minStake}
                max={Math.max(minStake, bananas)}
                step={1}
                value={cappedStake}
                valueLabel={String(cappedStake)}
                onChange={(e) =>
                  onSelectStake(
                    Math.max(
                      minStake,
                      Math.min(bananas, Number(e.target.value)),
                    ),
                  )
                }
                className="flex-1"
              />
              <button
                onClick={() =>
                  onSelectStake(Math.min(bananas, selected.stake + 5))
                }
                disabled={bananas <= selected.stake}
                className="w-10 h-10 sm:w-11 sm:h-11 border-4 border-black font-black text-lg flex items-center justify-center bg-white hover:bg-zinc-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all shrink-0 disabled:opacity-40"
              >
                +
              </button>
            </div>

            <p className="self-end text-xs font-black uppercase text-zinc-400">
              Win returns <span className="text-black">{expectedWinnings}</span>
            </p>
          </BlockCard>

          <div className="flex justify-end">
            <BlockButton variant="muted" size="sm" onClick={onSkip}>
              Skip Round
            </BlockButton>
          </div>
        </div>
      </div>

      {locked && (
        <FullscreenModal
          open={locked}
          maxWidthClassName="max-w-sm"
          zIndexClassName="z-60"
          overlayClassName="bg-black/50"
        >
          <div className="w-full bg-white p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
              Locked In
            </p>
            <h3 className="text-xl font-black uppercase">
              {selected.side.toUpperCase()} · {cappedStake}
            </h3>
            <p className="text-sm font-bold text-zinc-400 mt-2 mb-4">
              Waiting for the timer to expire...
            </p>
            <BlockButton
              variant="ghost"
              size="sm"
              onClick={() => setLocked(false)}
              fullWidth
            >
              Cancel &amp; Change
            </BlockButton>
          </div>
        </FullscreenModal>
      )}
    </FullscreenModal>
  );
}
