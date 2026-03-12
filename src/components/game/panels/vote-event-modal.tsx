"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VoteOption } from "@/bots/types";
import type { VoteEventModalProps } from "./betting-types";

function getOptionLabel(option: VoteOption): string {
  return option.option.label;
}

function getOptionIcons(option: VoteOption) {
  if (option.category === "arena") {
    return [option.option.arena.icon];
  }
  return [option.option.blue.icon, option.option.red.icon];
}

export function VoteEventModal({
  open,
  countdown,
  redHealth,
  blueHealth,
  bananas,
  voteWindow,
  selection,
  votePower,
  onSelectOption,
  onVotePowerChange,
  onConfirm,
}: VoteEventModalProps) {
  if (!open || !voteWindow) {
    return null;
  }

  const projectedA =
    voteWindow.voteSplit.optionA + (selection === 0 ? votePower : 0);
  const projectedB =
    voteWindow.voteSplit.optionB + (selection === 1 ? votePower : 0);
  const total = Math.max(1, projectedA + projectedB);
  const oddsA = (projectedA / total) * 100;
  const oddsB = (projectedB / total) * 100;
  const favorite = oddsA >= oddsB ? "Option A" : "Option B";

  return (
    <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-6">
      <Card className="w-full max-w-260 border-4 border-black rounded-none p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)] bg-white">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
          Event vote ({countdown}s)
        </p>
        <h2 className="text-3xl font-black uppercase mt-2">
          Pause: Choose Next Event
        </h2>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="border-2 border-black p-3">
            <p className="text-xs font-black uppercase">Red HP</p>
            <p className="text-2xl font-black text-red-700">{redHealth}</p>
          </div>
          <div className="border-2 border-black p-3">
            <p className="text-xs font-black uppercase">Blue HP</p>
            <p className="text-2xl font-black text-blue-700">{blueHealth}</p>
          </div>
          <div className="border-2 border-black p-3 bg-yellow-200">
            <p className="text-xs font-black uppercase">Your Bananas</p>
            <p className="text-2xl font-black">{bananas}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          {[voteWindow.optionA, voteWindow.optionB].map((option, index) => {
            const selected = selection === index;
            const icons = getOptionIcons(option);
            const optionVotes = index === 0 ? projectedA : projectedB;
            const optionOdds = index === 0 ? oddsA : oddsB;
            return (
              <button
                key={`${getOptionLabel(option)}-${index}`}
                className={`border-4 p-4 text-left ${
                  selected
                    ? "border-black bg-yellow-100"
                    : "border-zinc-500 bg-white"
                }`}
                onClick={() => onSelectOption(index as 0 | 1)}
              >
                <p className="text-xs font-black uppercase tracking-widest">
                  Option {index === 0 ? "A" : "B"}
                </p>
                <div className="flex items-center gap-2 my-2">
                  {icons.map((IconComp, iconIndex) => (
                    <IconComp
                      key={`${index}-${iconIndex}`}
                      size={16}
                      weight="bold"
                    />
                  ))}
                </div>
                <p className="text-sm font-bold">{getOptionLabel(option)}</p>
                <p className="mt-3 text-xs uppercase font-black">
                  Votes: {optionVotes} | Odds: {optionOdds.toFixed(1)}%
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-2 border-black p-3">
          <p className="text-xs font-black uppercase tracking-widest">
            Vote Power (Banana Spend)
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Spend more to push odds toward your selected option.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="outline"
              className="border-2 border-black rounded-none"
              onClick={() => onVotePowerChange(Math.max(0, votePower - 5))}
            >
              -5
            </Button>
            <div className="flex-1 border-2 border-black py-2 text-center font-black">
              {votePower} bananas
            </div>
            <Button
              variant="outline"
              className="border-2 border-black rounded-none"
              onClick={() =>
                onVotePowerChange(Math.min(bananas, votePower + 5))
              }
            >
              +5
            </Button>
          </div>
          <p className="mt-2 text-xs font-black uppercase text-zinc-700">
            Current favorite: {favorite}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            className="border-4 border-black rounded-none font-black uppercase"
            onClick={onConfirm}
            disabled={votePower > bananas}
          >
            Cast Vote + Continue
          </Button>
        </div>
      </Card>
    </div>
  );
}
