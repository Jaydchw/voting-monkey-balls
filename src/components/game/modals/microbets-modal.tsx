"use client";

import Image from "next/image";
import { BlockButton } from "@/components/ui/block-button";
import { FullscreenModal } from "@/components/game/modals/fullscreen-modal";
import type { MicroBetKind } from "@/bots/types";
import type {
  MicrobetDraft,
  MicrobetsModalProps,
} from "@/components/game/modals/types";

const STAKE_PER_CLICK = 5;

const KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red outdamages Blue",
  blueDamageToRed: "Blue outdamages Red",
  redWallHits: "Red gets more wall hits",
  blueWallHits: "Blue gets more wall hits",
  ballCollisions: "Collisions hit 10+",
};

const KIND_COLORS: Record<
  MicroBetKind,
  { border: string; bg: string; hover: string; badge: string }
> = {
  redDamageToBlue: {
    border: "border-red-400",
    bg: "bg-red-50",
    hover: "hover:bg-red-100",
    badge: "bg-red-500",
  },
  blueDamageToRed: {
    border: "border-blue-400",
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    badge: "bg-blue-500",
  },
  redWallHits: {
    border: "border-red-300",
    bg: "bg-red-50",
    hover: "hover:bg-red-100",
    badge: "bg-red-400",
  },
  blueWallHits: {
    border: "border-blue-300",
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    badge: "bg-blue-400",
  },
  ballCollisions: {
    border: "border-yellow-400",
    bg: "bg-yellow-50",
    hover: "hover:bg-yellow-100",
    badge: "bg-yellow-500",
  },
};

function colorizeLabel(text: string) {
  return text.split(/(Red|Blue)/g).map((part, i) => {
    if (part === "Red")
      return (
        <span key={i} className="text-red-600">
          {part}
        </span>
      );
    if (part === "Blue")
      return (
        <span key={i} className="text-blue-600">
          {part}
        </span>
      );
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
    proposition: "Red gets more wall hits",
  },
  {
    id: "blue-wall",
    kind: "blueWallHits",
    outcome: true,
    proposition: "Blue gets more wall hits",
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
    proposition: "Collisions stay under 10",
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
    e.preventDefault();
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

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-2xl"
      zIndexClassName="z-50"
    >
      <div className="w-full bg-white">
        <div className="p-5 sm:p-7 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                {countdown > 0
                  ? `Microbet Market · ${countdown}s`
                  : "Microbet Market"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black uppercase mt-1">
                Place Your Bets
              </h2>
              <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wide">
                Each tap stakes {STAKE_PER_CLICK} bananas · right-click to undo
              </p>
            </div>
            <div className="flex items-center gap-2 border-4 border-black px-3 py-2 bg-yellow-300 shrink-0">
              <Image src="/Banana.svg" alt="Banana" width={18} height={18} />
              <span className="text-lg font-black tabular-nums">{bananas}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {MARKET_PRESETS.map((preset) => {
              const odds = calcOdds(preset.kind);
              const count = getCount(preset);
              const stake = getTotalStake(preset);
              const colors = KIND_COLORS[preset.kind];
              const hasAny = count > 0;

              return (
                <button
                  key={preset.id}
                  onClick={() => handleAdd(preset)}
                  onContextMenu={(e) => handleRemoveOne(preset, e)}
                  className={[
                    "relative text-left p-3 border-4 transition-all",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
                    colors.border,
                    colors.bg,
                    colors.hover,
                    hasAny ? "ring-2 ring-black ring-offset-1" : "",
                  ].join(" ")}
                >
                  {hasAny && (
                    <div
                      className={[
                        "absolute -top-2.5 -right-2.5 min-w-6 h-6 px-1.5 rounded-full",
                        "flex items-center justify-center",
                        "text-[11px] font-black text-white border-2 border-white",
                        colors.badge,
                      ].join(" ")}
                    >
                      ×{count}
                    </div>
                  )}
                  <p className="text-sm font-black leading-tight pr-4">
                    {colorizeLabel(preset.proposition)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      {odds.toFixed(2)}x odds
                    </p>
                    {hasAny && (
                      <p className="text-xs font-black text-yellow-700">
                        {stake} staked
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase text-zinc-400">
              {hasBets ? (
                <>
                  Total staked:{" "}
                  <span className="text-yellow-700">{totalStake}</span> bananas
                </>
              ) : (
                "No bets placed yet"
              )}
            </p>
            <div className="flex gap-2">
              {hasBets && (
                <BlockButton variant="ghost" size="sm" onClick={onSkip}>
                  Skip
                </BlockButton>
              )}
              <BlockButton
                variant={hasBets ? "success" : "ghost"}
                size="sm"
                onClick={hasBets ? onConfirm : onSkip}
              >
                {hasBets ? "Confirm & Lock In" : "Skip"}
              </BlockButton>
            </div>
          </div>
        </div>
      </div>
    </FullscreenModal>
  );
}
