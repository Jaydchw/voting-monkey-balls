"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FullscreenModal } from "./fullscreen-modal";
import { ModalSurface } from "./modal-surface";
import type { MicroBetKind } from "@/bots/types";
import type {
  MicrobetDraft,
  MicrobetsModalProps,
  PendingPlayerMicrobet,
} from "./betting-types";

const KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red outdamages Blue",
  blueDamageToRed: "Blue outdamages Red",
  redWallHits: "Red gets more wall hits",
  blueWallHits: "Blue gets more wall hits",
  ballCollisions: "Collisions hit 10+",
};

const pressButtonClass =
  "border-2 border-black rounded-none bg-white shadow-[0_4px_0_0_rgba(0,0,0,1)] active:translate-y-[3px] active:shadow-[0_1px_0_0_rgba(0,0,0,1)]";

type MarketPreset = {
  id: string;
  kind: MicroBetKind;
  outcome: boolean;
  proposition: string;
};

const MARKET_PRESETS: readonly MarketPreset[] = [
  {
    id: "red-dmg-vs-blue",
    kind: "redDamageToBlue",
    outcome: true,
    proposition: "Red outdamages Blue",
  },
  {
    id: "blue-dmg-vs-red",
    kind: "blueDamageToRed",
    outcome: true,
    proposition: "Blue outdamages Red",
  },
  {
    id: "red-wall-vs-blue",
    kind: "redWallHits",
    outcome: true,
    proposition: "Red gets more wall hits",
  },
  {
    id: "blue-wall-vs-red",
    kind: "blueWallHits",
    outcome: true,
    proposition: "Blue gets more wall hits",
  },
  {
    id: "collisions-hit",
    kind: "ballCollisions",
    outcome: true,
    proposition: "Collisions hit 10+",
  },
  {
    id: "collisions-under",
    kind: "ballCollisions",
    outcome: false,
    proposition: "Collisions stay under 10",
  },
];

function emphasizeMatchupText(text: string): React.ReactNode {
  return text.split(/(Red|Blue|stake|Stake)/g).map((part, index) => {
    if (part === "Red") {
      return (
        <span key={`part-${index}`} className="text-red-600">
          {part}
        </span>
      );
    }
    if (part === "Blue") {
      return (
        <span key={`part-${index}`} className="text-blue-600">
          {part}
        </span>
      );
    }
    if (part.toLowerCase() === "stake") {
      return (
        <span key={`part-${index}`} className="text-yellow-700">
          {part}
        </span>
      );
    }
    return <span key={`part-${index}`}>{part}</span>;
  });
}

function calcOdds(kind: MicroBetKind): number {
  const probabilityByKind: Record<MicroBetKind, number> = {
    redDamageToBlue: 0.5,
    blueDamageToRed: 0.5,
    redWallHits: 0.5,
    blueWallHits: 0.5,
    ballCollisions: 0.45,
  };
  return Number((0.92 / probabilityByKind[kind]).toFixed(2));
}

function QueuedList({
  placed,
  onRemove,
}: {
  placed: PendingPlayerMicrobet[];
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="border-0 sm:border-2 sm:border-black rounded-none p-3 bg-white ring-0">
      <p className="text-xs font-black uppercase tracking-widest mb-2">
        Locked Bets (Tap To Remove)
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {placed.map((bet) => (
          <button
            key={bet.id}
            type="button"
            className="w-full text-left border-2 border-black/40 p-2.5 bg-zinc-50 rounded-none transition-colors hover:bg-zinc-100"
            onClick={() => onRemove(bet.id)}
            title="Tap to remove"
          >
            <p className="text-sm font-black leading-tight">
              {emphasizeMatchupText(KIND_LABEL[bet.kind])}
            </p>
            <p className="text-xs text-zinc-700 mt-1 leading-relaxed">
              {bet.outcome ? "Outcome: TRUE" : "Outcome: FALSE"} |{" "}
              <span className="text-yellow-700 font-black">
                Stake {bet.stake}
              </span>{" "}
              | {bet.odds.toFixed(2)}x
            </p>
          </button>
        ))}
        {placed.length === 0 && (
          <p className="text-xs text-zinc-600">No locked bets yet.</p>
        )}
      </div>
    </Card>
  );
}

export function MicrobetsModal({
  open,
  countdown,
  bananas,
  insights,
  draft,
  placedBets,
  onDraftChange,
  onAddQuickBet,
  onRemoveBet,
  onSkip,
}: MicrobetsModalProps) {
  void insights;
  const queuedStakeTotal = placedBets.reduce((sum, bet) => sum + bet.stake, 0);

  if (!open) {
    return null;
  }

  const lockPreset = (preset: MarketPreset) => {
    const lockedDraft: MicrobetDraft = {
      kind: preset.kind,
      outcome: preset.outcome,
      stake: Math.max(1, Math.min(bananas, draft.stake)),
    };
    onDraftChange(lockedDraft);
    onAddQuickBet(lockedDraft);
  };

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-350"
      zIndexClassName="z-50"
    >
      <ModalSurface>
        <div className="px-3 py-3 sm:px-4 sm:py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
              {countdown > 0
                ? `Microbet market (${countdown}s)`
                : "Microbet market"}
            </p>
            <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase mt-1">
              Tap To Lock Bets
            </h2>
            <p className="text-xs sm:text-sm font-bold text-zinc-700 mt-2 leading-relaxed">
              Pick exactly what you believe will happen. One tap locks it.
            </p>
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
          <Card className="p-3 bg-zinc-50 ring-0 border-0 sm:border sm:border-black/20">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Stake per click
              </p>
              <p className="text-lg font-black text-yellow-700">
                {draft.stake}
              </p>
            </div>
            <input
              type="range"
              min={1}
              max={Math.max(1, bananas)}
              step={1}
              value={Math.max(1, Math.min(bananas, draft.stake))}
              className="mt-3 w-full accent-black"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  stake: Math.max(
                    1,
                    Math.min(bananas, Number(event.target.value)),
                  ),
                })
              }
            />
          </Card>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {MARKET_PRESETS.map((preset) => {
              const odds = calcOdds(preset.kind);
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="text-left p-3 rounded-none border-2 border-black bg-white transition-all duration-150 shadow-[0_4px_0_0_rgba(0,0,0,1)] hover:bg-zinc-50 active:translate-y-0.75 active:shadow-[0_1px_0_0_rgba(0,0,0,1)]"
                  onClick={() => lockPreset(preset)}
                >
                  <p className="text-sm font-black leading-tight">
                    {emphasizeMatchupText(preset.proposition)}
                  </p>
                  <p className="text-xs font-bold text-zinc-700 mt-1 leading-relaxed">
                    <span className="text-yellow-700">Stake {draft.stake}</span>{" "}
                    | {odds.toFixed(2)}x odds
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <QueuedList placed={placedBets} onRemove={onRemoveBet} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-zinc-700">
              Locked <span className="text-yellow-700">stake</span> total:{" "}
              {queuedStakeTotal}
            </p>
            <Button
              variant="outline"
              className={`h-11 font-black uppercase ${pressButtonClass}`}
              onClick={onSkip}
            >
              Continue
            </Button>
          </div>
        </div>
      </ModalSurface>
    </FullscreenModal>
  );
}
