"use client";

import Image from "next/image";
import { Crown } from "@phosphor-icons/react";
import { BlockButton } from "@/components/ui/block-button";
import { FullscreenModal } from "@/components/game/modals/fullscreen-modal";
import type { MicroBetKind } from "@/bots/types";
import type {
  MicrobetDraft,
  MicrobetsModalProps,
} from "@/components/game/modals/types";

const STAKE_PER_CLICK = 5;

const KIND_COLORS: Record<
  MicroBetKind,
  { border: string; bg: string; hover: string; badge: string; activeBg: string }
> = {
  redDamageToBlue: {
    border: "border-red-400",
    bg: "bg-red-50",
    hover: "hover:bg-red-100",
    badge: "bg-red-500",
    activeBg: "bg-red-100",
  },
  blueDamageToRed: {
    border: "border-blue-400",
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    badge: "bg-blue-500",
    activeBg: "bg-blue-100",
  },
  redWallHits: {
    border: "border-red-300",
    bg: "bg-red-50",
    hover: "hover:bg-red-100",
    badge: "bg-red-400",
    activeBg: "bg-red-100",
  },
  blueWallHits: {
    border: "border-blue-300",
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    badge: "bg-blue-400",
    activeBg: "bg-blue-100",
  },
  ballCollisions: {
    border: "border-yellow-400",
    bg: "bg-yellow-50",
    hover: "hover:bg-yellow-100",
    badge: "bg-yellow-500",
    activeBg: "bg-yellow-100",
  },
};

function colorizeLabel(text: string, playerBetSide?: "red" | "blue" | null) {
  return text.split(/(Red|Blue)/g).map((part, i) => {
    if (part === "Red") {
      return (
        <span key={i} className="text-red-600 inline-flex items-center gap-0.5">
          {part}
          {playerBetSide === "red" && (
            <Crown size={9} weight="fill" className="text-yellow-500" />
          )}
        </span>
      );
    }
    if (part === "Blue") {
      return (
        <span
          key={i}
          className="text-blue-600 inline-flex items-center gap-0.5"
        >
          {part}
          {playerBetSide === "blue" && (
            <Crown size={9} weight="fill" className="text-yellow-500" />
          )}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function calcOdds(kind: MicroBetKind): number {
  const prob: Record<MicroBetKind, number> = {
    redDamageToBlue: 0.5,
    blueDamageToRed: 0.5,
    redWallHits: 0.5,
    blueWallHits: 0.5,
    ballCollisions: 0.45,
  };
  return Number((0.92 / prob[kind]).toFixed(2));
}

type MarketPreset = {
  id: string;
  kind: MicroBetKind;
  outcome: boolean;
  proposition: string;
};

const MARKET_PRESETS: readonly MarketPreset[] = [
  {
    id: "red-dmg",
    kind: "redDamageToBlue",
    outcome: true,
    proposition: "Red outdamages Blue",
  },
  {
    id: "blue-dmg",
    kind: "blueDamageToRed",
    outcome: true,
    proposition: "Blue outdamages Red",
  },
  {
    id: "red-wall",
    kind: "redWallHits",
    outcome: true,
    proposition: "Red more wall hits",
  },
  {
    id: "blue-wall",
    kind: "blueWallHits",
    outcome: true,
    proposition: "Blue more wall hits",
  },
  {
    id: "coll-hit",
    kind: "ballCollisions",
    outcome: true,
    proposition: "Collisions hit 10+",
  },
  {
    id: "coll-under",
    kind: "ballCollisions",
    outcome: false,
    proposition: "Under 10 collisions",
  },
];

export function MicrobetsModal({
  open,
  countdown,
  bananas,
  placedBets,
  onDraftChange,
  onAddQuickBet,
  onRemoveBet,
  onConfirm,
  onSkip,
  playerBetSide,
}: MicrobetsModalProps) {
  if (!open) return null;

  const getCount = (preset: MarketPreset): number =>
    placedBets.filter(
      (b) => b.kind === preset.kind && b.outcome === preset.outcome,
    ).length;

  const getTotalStake = (preset: MarketPreset): number =>
    placedBets
      .filter((b) => b.kind === preset.kind && b.outcome === preset.outcome)
      .reduce((s, b) => s + b.stake, 0);

  const handleAdd = (preset: MarketPreset) => {
    if (bananas < STAKE_PER_CLICK) return;
    const draft: MicrobetDraft = {
      kind: preset.kind,
      outcome: preset.outcome,
      stake: STAKE_PER_CLICK,
    };
    onDraftChange(draft);
    onAddQuickBet(draft);
  };

  const handleRemoveOne = (preset: MarketPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const matching = placedBets.filter(
      (b) => b.kind === preset.kind && b.outcome === preset.outcome,
    );
    if (matching.length > 0) {
      onRemoveBet(matching[matching.length - 1].id);
    }
  };

  const totalStake = placedBets.reduce((s, b) => s + b.stake, 0);
  const hasBets = totalStake > 0;
  const canAfford = bananas >= STAKE_PER_CLICK;

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
                {countdown > 0
                  ? `Microbet Market · ${countdown}s`
                  : "Microbet Market"}
              </p>
              <h2 className="text-xl sm:text-3xl font-black uppercase mt-0.5">
                Place Your Bets
              </h2>
              <p className="text-[10px] font-bold text-zinc-400 mt-0.5 uppercase tracking-wide">
                Tap to add {STAKE_PER_CLICK}🍌 · tap − to undo
              </p>
              {playerBetSide && (
                <p className="text-[10px] font-black uppercase tracking-wide mt-1 inline-flex items-center gap-1">
                  <Crown size={10} weight="fill" className="text-yellow-500" />
                  <span>
                    You bet on{" "}
                    <span
                      className={
                        playerBetSide === "red"
                          ? "text-red-600"
                          : "text-blue-600"
                      }
                    >
                      {playerBetSide.toUpperCase()}
                    </span>
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 border-4 border-black px-3 py-2 bg-yellow-300 shrink-0">
              <Image src="/Banana.svg" alt="Banana" width={16} height={16} />
              <span className="text-base font-black tabular-nums">
                {bananas}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
            {MARKET_PRESETS.map((preset) => {
              const odds = calcOdds(preset.kind);
              const count = getCount(preset);
              const stake = getTotalStake(preset);
              const colors = KIND_COLORS[preset.kind];
              const hasAny = count > 0;

              return (
                <div key={preset.id} className="relative">
                  <button
                    onClick={() => handleAdd(preset)}
                    disabled={!canAfford}
                    className={[
                      "w-full text-left p-2.5 sm:p-3 border-4 transition-all",
                      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      "active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      colors.border,
                      hasAny ? colors.activeBg : colors.bg,
                      canAfford ? colors.hover : "",
                      hasAny ? "ring-2 ring-black ring-offset-1" : "",
                    ].join(" ")}
                  >
                    <p className="text-xs sm:text-sm font-black leading-tight pr-6">
                      {colorizeLabel(preset.proposition, playerBetSide)}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">
                        {odds.toFixed(2)}x
                      </p>
                      {hasAny && (
                        <p className="text-[10px] font-black text-yellow-700">
                          {stake}🍌 ×{count}
                        </p>
                      )}
                    </div>
                  </button>

                  {hasAny && (
                    <button
                      onClick={(e) => handleRemoveOne(preset, e)}
                      className={[
                        "absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center",
                        "text-[11px] font-black text-white border-2 border-white",
                        "active:scale-90 transition-transform",
                        colors.badge,
                      ].join(" ")}
                      aria-label="Remove one bet"
                    >
                      −
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-zinc-400">
              {hasBets ? (
                <>
                  Total: <span className="text-yellow-700">{totalStake}</span>🍌
                </>
              ) : (
                "No bets placed yet"
              )}
            </p>
            <div className="flex gap-2">
              <BlockButton variant="muted" size="sm" onClick={onSkip}>
                Skip
              </BlockButton>
              <BlockButton
                variant={hasBets ? "success" : "ghost"}
                size="sm"
                disabled={!hasBets}
                onClick={onConfirm}
              >
                Lock In
              </BlockButton>
            </div>
          </div>
        </div>
      </div>
    </FullscreenModal>
  );
}
