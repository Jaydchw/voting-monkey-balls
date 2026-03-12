"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MicroBetKind } from "@/bots/types";
import type {
  MicrobetDraft,
  MicrobetsModalProps,
  PendingPlayerMicrobet,
} from "./betting-types";

const KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red does more damage to Blue",
  blueDamageToRed: "Blue does more damage to Red",
  redWallHits: "Red wall hits",
  blueWallHits: "Blue wall hits",
  ballCollisions: "Ball collisions",
};

const KIND_MAX: Record<MicroBetKind, number> = {
  redDamageToBlue: 40,
  blueDamageToRed: 40,
  redWallHits: 20,
  blueWallHits: 20,
  ballCollisions: 20,
};

function calcOdds(kind: MicroBetKind, min: number, max: number): number {
  const cap = KIND_MAX[kind];
  const width = Math.max(1, max - min + 1);
  const probability = Math.min(0.95, Math.max(0.05, width / (cap + 1)));
  return Number((0.92 / probability).toFixed(2));
}

function estimatePayout(stake: number, odds: number): number {
  return Math.floor(stake * odds);
}

function buildSimpleQuickDrafts(bananas: number): MicrobetDraft[] {
  const baseStake = Math.max(
    2,
    Math.min(bananas, Math.max(5, Math.floor(bananas * 0.08))),
  );
  return [
    {
      kind: "blueDamageToRed",
      min: 10,
      max: 24,
      stake: baseStake,
    },
    {
      kind: "redDamageToBlue",
      min: 10,
      max: 24,
      stake: baseStake,
    },
  ];
}

function DraftEditor({
  draft,
  bananas,
  onDraftChange,
}: {
  draft: MicrobetDraft;
  bananas: number;
  onDraftChange: (draft: MicrobetDraft) => void;
}) {
  const maxCap = KIND_MAX[draft.kind];
  const odds = calcOdds(draft.kind, draft.min, draft.max);
  const payout = estimatePayout(draft.stake, odds);

  return (
    <Card className="border-4 border-black rounded-none p-3 bg-white">
      <p className="text-xs font-black uppercase tracking-widest mb-2">
        Custom Microbet
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-black uppercase">
          Market
          <select
            className="mt-1 w-full border-2 border-black rounded-none p-2 text-sm font-bold"
            value={draft.kind}
            onChange={(event) => {
              const kind = event.target.value as MicroBetKind;
              const cap = KIND_MAX[kind];
              onDraftChange({
                ...draft,
                kind,
                min: Math.min(draft.min, cap),
                max: Math.min(draft.max, cap),
              });
            }}
          >
            {(Object.keys(KIND_LABEL) as MicroBetKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-black uppercase">
          Stake
          <input
            type="number"
            min={1}
            max={Math.max(1, bananas)}
            value={draft.stake}
            className="mt-1 w-full border-2 border-black rounded-none p-2 text-sm font-bold"
            onChange={(event) =>
              onDraftChange({
                ...draft,
                stake: Math.max(
                  1,
                  Math.min(bananas, Number(event.target.value) || 1),
                ),
              })
            }
          />
        </label>

        <label className="text-xs font-black uppercase">
          Min
          <input
            type="number"
            min={0}
            max={maxCap}
            value={draft.min}
            className="mt-1 w-full border-2 border-black rounded-none p-2 text-sm font-bold"
            onChange={(event) => {
              const min = Math.max(
                0,
                Math.min(maxCap, Number(event.target.value) || 0),
              );
              onDraftChange({
                ...draft,
                min,
                max: Math.max(min, draft.max),
              });
            }}
          />
        </label>

        <label className="text-xs font-black uppercase">
          Max
          <input
            type="number"
            min={draft.min}
            max={maxCap}
            value={draft.max}
            className="mt-1 w-full border-2 border-black rounded-none p-2 text-sm font-bold"
            onChange={(event) => {
              const max = Math.max(
                draft.min,
                Math.min(maxCap, Number(event.target.value) || draft.min),
              );
              onDraftChange({ ...draft, max });
            }}
          />
        </label>
      </div>

      <p className="text-xs mt-2 font-black uppercase text-zinc-600">
        Odds {odds.toFixed(2)}x | Est payout {payout}
      </p>
    </Card>
  );
}

function QueuedList({
  placed,
  onRemove,
}: {
  placed: PendingPlayerMicrobet[];
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="border-4 border-black rounded-none p-3 bg-white">
      <p className="text-xs font-black uppercase tracking-widest mb-2">
        Queued Bets
      </p>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {placed.map((bet) => (
          <div key={bet.id} className="border-2 border-black p-2 bg-zinc-50">
            <p className="text-xs font-black">{KIND_LABEL[bet.kind]}</p>
            <p className="text-xs text-zinc-700 mt-1">
              Range {bet.min}-{bet.max} | Stake {bet.stake} |{" "}
              {bet.odds.toFixed(2)}x
            </p>
            <Button
              variant="outline"
              className="mt-2 border-2 border-black rounded-none h-8 px-3 text-xs font-black uppercase"
              onClick={() => onRemove(bet.id)}
            >
              Remove
            </Button>
          </div>
        ))}
        {placed.length === 0 && (
          <p className="text-xs text-zinc-600">No microbets queued yet.</p>
        )}
      </div>
    </Card>
  );
}

export function MicrobetsModal({
  open,
  countdown,
  redHealth,
  blueHealth,
  bananas,
  insights,
  draft,
  placedBets,
  onDraftChange,
  onAddBet,
  onAddQuickBet,
  onRemoveBet,
  onConfirm,
  onSkip,
}: MicrobetsModalProps) {
  if (!open) {
    return null;
  }

  const quickDrafts = buildSimpleQuickDrafts(bananas);

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <Card className="w-full h-full border-0 rounded-none bg-white p-4 md:p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
            Microbet market ({countdown}s)
          </p>
          <h2 className="text-2xl md:text-5xl font-black uppercase mt-1">
            Build Microbets
          </h2>

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

          <Card className="mt-4 border-4 border-black rounded-none p-3 bg-zinc-50">
            <p className="text-xs font-black uppercase tracking-widest mb-2">
              Quick Bets
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickDrafts.map((quickDraft, index) => {
                const odds = calcOdds(
                  quickDraft.kind,
                  quickDraft.min,
                  quickDraft.max,
                );
                return (
                  <Button
                    key={`${quickDraft.kind}-${index}`}
                    variant="outline"
                    className="h-auto min-h-16 border-2 border-black rounded-none font-black text-left justify-start whitespace-normal p-3"
                    onClick={() => onAddQuickBet(quickDraft)}
                    disabled={quickDraft.stake > bananas}
                  >
                    <span className="text-xs uppercase leading-5">
                      {KIND_LABEL[quickDraft.kind]} | {quickDraft.min}-
                      {quickDraft.max} | {quickDraft.stake} @ {odds.toFixed(2)}x
                    </span>
                  </Button>
                );
              })}
            </div>
          </Card>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <DraftEditor
                draft={draft}
                bananas={bananas}
                onDraftChange={onDraftChange}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  className="border-4 border-black rounded-none font-black uppercase bg-yellow-300 text-black hover:bg-yellow-200"
                  onClick={onAddBet}
                  disabled={draft.stake > bananas}
                >
                  Add Custom
                </Button>
                <Button
                  variant="outline"
                  className="border-4 border-black rounded-none font-black uppercase"
                  onClick={onSkip}
                >
                  Skip
                </Button>
              </div>
              <QueuedList placed={placedBets} onRemove={onRemoveBet} />
            </div>

            <Card className="border-4 border-black rounded-none p-3 bg-zinc-50">
              <p className="text-xs font-black uppercase tracking-widest mb-2">
                Market Feed
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {insights.map((insight) => (
                  <div
                    key={insight.kind}
                    className="border-2 border-black p-2 bg-white"
                  >
                    <p className="text-xs font-black">
                      {KIND_LABEL[insight.kind]}
                    </p>
                    <p className="text-xs text-zinc-700 mt-1">
                      {insight.count} bets | {insight.totalStake} staked | avg{" "}
                      {insight.averageTarget.toFixed(1)}
                    </p>
                  </div>
                ))}
                {insights.length === 0 && (
                  <p className="text-xs text-zinc-600">
                    No market activity yet this pause.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              className="h-12 border-4 border-black rounded-none font-black uppercase text-base bg-pink-200 text-black hover:bg-pink-100"
              onClick={onConfirm}
            >
              Confirm And Resume
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
