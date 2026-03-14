"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VoteEventModalProps } from "./betting-types";

type VoteCardOption = {
  key: string;
  title: string;
  label: string;
  projectedVotes: number;
  selected: boolean;
  onSelect: () => void;
};

type SharedVoteModalProps = {
  open: boolean;
  countdown: number;
  redHealth: number;
  blueHealth: number;
  bananas: number;
  votePower: number;
  options: readonly [VoteCardOption, VoteCardOption, VoteCardOption];
  onVotePowerChange: (amount: number) => void;
  onConfirm: () => void;
  confirmLabel: string;
  isRemote?: boolean;
};

function VoteOptionCards({
  countdown,
  options,
  monkeyMode,
}: {
  countdown: number;
  options: readonly [VoteCardOption, VoteCardOption, VoteCardOption];
  monkeyMode: "thinking" | "money";
}) {
  const [monkeyMoodIndex, setMonkeyMoodIndex] = useState(0);

  const monkeyPool = useMemo(() => {
    const base =
      monkeyMode === "money"
        ? "/monkey%20reactions/thinking_nobg/money.png"
        : "/monkey%20reactions/thinking_nobg/thinking.png";

    return [
      base,
      "/monkey%20reactions/thinking_nobg/cheeky.png",
      "/monkey%20reactions/thinking_nobg/hm.png",
    ].filter((src, index, arr) => arr.indexOf(src) === index);
  }, [monkeyMode]);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
            Event vote ({countdown}s)
          </p>
          <h2 className="text-2xl md:text-5xl font-black uppercase mt-1">
            Pick Event Cards
          </h2>
        </div>
        <button
          type="button"
          className="border-4 border-black bg-cyan-200 p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          onClick={() =>
            setMonkeyMoodIndex((previous) => (previous + 1) % monkeyPool.length)
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

      <div className="mt-5 min-h-52 relative">
        <div className="absolute inset-x-0 top-0 flex justify-center animate-[shuffleWrap_920ms_ease-out_forwards]">
          <div className="relative w-48 h-64 overflow-visible">
            <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200" />
            <div className="absolute inset-0 border-8 border-black rounded-none bg-yellow-200 animate-[shuffleA_900ms_ease-in-out_forwards]" />
            <div className="absolute inset-0 border-8 border-black rounded-none bg-blue-200 animate-[shuffleB_900ms_ease-in-out_forwards]" />
            <div className="absolute inset-0 border-8 border-black rounded-none bg-pink-200 animate-[shuffleC_900ms_ease-in-out_forwards]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {options.map((option, index) => (
            <button
              key={option.key}
              className={`opacity-0 translate-y-8 animate-[cardReveal_500ms_ease-out_forwards] border-8 p-4 rounded-none text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
                index === 0
                  ? "[animation-delay:980ms]"
                  : index === 1
                    ? "[animation-delay:1080ms]"
                    : "[animation-delay:1180ms]"
              } ${option.selected ? "border-black bg-cyan-200" : "border-black bg-white"}`}
              onClick={option.onSelect}
            >
              <p className="text-[11px] font-black uppercase tracking-widest">
                {option.title}
              </p>
              <p className="text-lg font-black uppercase mt-1">{option.label}</p>
              <p className="text-xs font-bold mt-2 text-zinc-700">
                Projected votes: {option.projectedVotes}
              </p>
            </button>
          ))}
        </div>
      </div>

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
    </>
  );
}

function getOptionLabel(option: { label: string } | { option: { label: string } }): string {
  if ("label" in option) {
    return option.label;
  }
  return option.option.label;
}

export function SharedVoteModal({
  open,
  countdown,
  redHealth,
  blueHealth,
  bananas,
  votePower,
  options,
  onVotePowerChange,
  onConfirm,
  confirmLabel,
  isRemote = false,
}: SharedVoteModalProps) {
  if (!open) {
    return null;
  }

  const [weapon, modifier, arena] = options;
  const projectedA = weapon.projectedVotes;
  const projectedB = modifier.projectedVotes;
  const projectedC = arena.projectedVotes;

  return (
    <div
      className={
        isRemote
          ? "fixed inset-0 z-50 bg-white"
          : "fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-6"
      }
    >
      <Card
        className={
          isRemote
            ? "w-full h-full border-0 rounded-none bg-white p-4 md:p-6 overflow-y-auto"
            : "w-full max-w-260 border-4 border-black rounded-none p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)] bg-white max-h-[92vh] overflow-y-auto"
        }
      >
        <div className={isRemote ? "max-w-6xl mx-auto" : ""}>
          <VoteOptionCards
            countdown={countdown}
            options={options}
            monkeyMode={votePower >= 20 ? "money" : "thinking"}
          />

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
                onClick={() => onVotePowerChange(Math.min(bananas, votePower + 5))}
              >
                +5
              </Button>
            </div>
            <p className="mt-2 text-xs font-black uppercase text-zinc-700">
              Current leader: {projectedA >= projectedB && projectedA >= projectedC ? "Weapon" : projectedB >= projectedA && projectedB >= projectedC ? "Modifier" : "Arena"}
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              className="border-4 border-black rounded-none font-black uppercase"
              onClick={onConfirm}
              disabled={votePower > bananas}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
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
  confirmLabel = "Cast Vote + Continue",
  isRemote = false,
}: VoteEventModalProps) {
  if (!open || !voteWindow) {
    return null;
  }

  const projectedA = voteWindow.voteSplit.optionA + (selection === 0 ? votePower : 0);
  const projectedB = voteWindow.voteSplit.optionB + (selection === 1 ? votePower : 0);
  const projectedC = voteWindow.voteSplit.optionC + (selection === 2 ? votePower : 0);

  const voteCards = [
    {
      key: "weapon",
      title: "Card 1 - Weapon",
      label: getOptionLabel(voteWindow.optionA),
      projectedVotes: projectedA,
      selected: selection === 0,
      onSelect: () => onSelectOption(0),
    },
    {
      key: "modifier",
      title: "Card 2 - Modifier",
      label: getOptionLabel(voteWindow.optionB),
      projectedVotes: projectedB,
      selected: selection === 1,
      onSelect: () => onSelectOption(1),
    },
    {
      key: "arena",
      title: "Card 3 - Arena",
      label: getOptionLabel(voteWindow.optionC),
      projectedVotes: projectedC,
      selected: selection === 2,
      onSelect: () => onSelectOption(2),
    },
  ] as const;

  return (
    <SharedVoteModal
      open={open}
      countdown={countdown}
      redHealth={redHealth}
      blueHealth={blueHealth}
      bananas={bananas}
      votePower={votePower}
      options={voteCards}
      onVotePowerChange={onVotePowerChange}
      onConfirm={onConfirm}
      confirmLabel={confirmLabel}
      isRemote={isRemote}
    />
  );
}

export function VoteRevealModal({
  open,
  countdown,
  revealedOption,
}: {
  open: boolean;
  countdown: number;
  revealedOption: {
    category: "weapon" | "modifier" | "arena";
    label: string;
  } | null;
}) {
  if (!open || !revealedOption) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-8 border-black rounded-none p-6 md:p-8 bg-white text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
          Vote settled ({countdown}s)
        </p>
        <h3 className="text-3xl md:text-4xl font-black uppercase mt-2">
          {revealedOption.category === "weapon"
            ? "Weapon Applied"
            : revealedOption.category === "modifier"
              ? "Ball Modifier Applied"
              : "Arena Modifier Applied"}
        </h3>
        <p className="text-base md:text-lg font-black uppercase mt-3 text-zinc-800">
          {revealedOption.label}
        </p>
      </Card>
    </div>
  );
}
