"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VoteEventModalProps } from "./betting-types";

type IconLike = (props: { size?: number; className?: string }) => ReactNode;

type VoteCardOption = {
  key: string;
  title: string;
  category: "weapon" | "modifier" | "arena";
  label: ReactNode;
  qualityScore: number;
  icons: IconLike[];
  redLabel?: string;
  blueLabel?: string;
  arenaLabel?: string;
  projectedVotes: number;
  selected: boolean;
  onSelect: () => void;
};

const MONKEY_THINKING_IMAGE = "/monkey%20reactions/thinking_nobg/thinking.png";
const MONKEY_HAPPY_IMAGE = "/monkey%20reactions/thinking_nobg/thumbs.png";
const MONKEY_SHOCK_IMAGE = "/monkey%20reactions/thinking_nobg/scared.png";
const MONKEY_SMUG_IMAGE = "/monkey%20reactions/thinking_nobg/ahaha.png";
const MONKEY_IDEA_IMAGE = "/monkey%20reactions/thinking_nobg/idea.png";

function colorizeKeywords(text: string): ReactNode {
  return text.split(/(Blue|Red)/g).map((part, index) => {
    if (part === "Blue") {
      return (
        <span key={`kw-${index}`} className="text-blue-600">
          {part}
        </span>
      );
    }
    if (part === "Red") {
      return (
        <span key={`kw-${index}`} className="text-red-600">
          {part}
        </span>
      );
    }
    return <span key={`kw-${index}`}>{part}</span>;
  });
}

function getOptionMainLabel(option: {
  label?: string;
  option?: { label?: string };
}): ReactNode {
  const raw = option.option?.label ?? option.label ?? "Unknown";
  return colorizeKeywords(raw);
}

function getOptionCategory(option: {
  category?: "weapon" | "modifier" | "arena";
}): "weapon" | "modifier" | "arena" {
  return option.category ?? "weapon";
}

function isIconLike(value: unknown): value is IconLike {
  return typeof value === "function";
}

function getOptionIcons(option: unknown): IconLike[] {
  const safeOption = option as {
    option?: {
      red?: { icon?: unknown };
      blue?: { icon?: unknown };
      arena?: { icon?: unknown };
    };
  };
  const icons: IconLike[] = [];
  const redIcon = safeOption.option?.red?.icon;
  const blueIcon = safeOption.option?.blue?.icon;
  const arenaIcon = safeOption.option?.arena?.icon;

  if (isIconLike(redIcon)) icons.push(redIcon);
  if (isIconLike(blueIcon)) icons.push(blueIcon);
  if (isIconLike(arenaIcon)) icons.push(arenaIcon);

  return icons;
}

function getQualityScore(option: {
  qualityScore?: number;
  option?: {
    qualityScore?: number;
    red?: { quality?: number };
    blue?: { quality?: number };
    arena?: { quality?: number };
  };
}): number {
  const nested = option.option;
  if (typeof nested?.qualityScore === "number") {
    return nested.qualityScore;
  }
  if (typeof option.qualityScore === "number") {
    return option.qualityScore;
  }
  if (
    typeof nested?.red?.quality === "number" &&
    typeof nested?.blue?.quality === "number"
  ) {
    return nested.red.quality + nested.blue.quality;
  }
  if (typeof nested?.arena?.quality === "number") {
    return nested.arena.quality;
  }
  return 1;
}

function getOptionDescriptions(option: {
  redLabel?: string;
  blueLabel?: string;
  arenaLabel?: string;
  option?: {
    red?: { label?: string };
    blue?: { label?: string };
    arena?: { label?: string };
  };
}): Pick<VoteCardOption, "redLabel" | "blueLabel" | "arenaLabel"> {
  const redLabel = option.option?.red?.label ?? option.redLabel;
  const blueLabel = option.option?.blue?.label ?? option.blueLabel;
  const arenaLabel = option.option?.arena?.label ?? option.arenaLabel;

  return {
    redLabel,
    blueLabel,
    arenaLabel,
  };
}

function getCategoryTheme(category: VoteCardOption["category"]): {
  shell: string;
  inner: string;
  text: string;
  chip: string;
  divider: string;
  watermark: string;
  splitBlue: string;
  splitRed: string;
} {
  if (category === "weapon") {
    return {
      shell: "bg-gradient-to-b from-red-100 via-orange-50 to-red-50",
      inner: "bg-red-50/85",
      text: "text-red-800",
      chip: "bg-red-200 text-red-900",
      divider: "bg-gradient-to-b from-red-500 to-orange-500",
      watermark: "text-red-300/35",
      splitBlue: "from-red-50 to-orange-100/40",
      splitRed: "from-orange-100/40 to-red-50",
    };
  }
  if (category === "modifier") {
    return {
      shell: "bg-gradient-to-b from-violet-100 via-fuchsia-50 to-violet-50",
      inner: "bg-violet-50/85",
      text: "text-violet-800",
      chip: "bg-violet-200 text-violet-900",
      divider: "bg-gradient-to-b from-violet-500 to-fuchsia-500",
      watermark: "text-violet-300/35",
      splitBlue: "from-violet-50 to-fuchsia-100/35",
      splitRed: "from-fuchsia-100/35 to-violet-50",
    };
  }
  return {
    shell: "bg-gradient-to-b from-cyan-100 via-sky-50 to-cyan-50",
    inner: "bg-cyan-50/85",
    text: "text-cyan-800",
    chip: "bg-cyan-200 text-cyan-900",
    divider: "bg-gradient-to-b from-cyan-500 to-sky-500",
    watermark: "text-cyan-300/35",
    splitBlue: "from-cyan-50 to-sky-100/35",
    splitRed: "from-sky-100/35 to-cyan-50",
  };
}

function getQualityBadge(qualityScore: number): {
  label: string;
  tone: string;
  cardTone: string;
  borderTone: string;
  glowTone: string;
} {
  if (qualityScore >= 8) {
    return {
      label: "Legendary",
      tone: "bg-amber-200 text-amber-900",
      cardTone: "from-amber-50/80 via-yellow-50/70 to-orange-50/70",
      borderTone: "border-amber-700",
      glowTone: "shadow-[0_6px_0_0_rgba(161,98,7,1)]",
    };
  }
  if (qualityScore >= 6) {
    return {
      label: "Epic",
      tone: "bg-purple-200 text-purple-900",
      cardTone: "from-violet-50/80 via-fuchsia-50/70 to-violet-100/60",
      borderTone: "border-violet-700",
      glowTone: "shadow-[0_6px_0_0_rgba(109,40,217,1)]",
    };
  }
  if (qualityScore >= 4) {
    return {
      label: "Rare",
      tone: "bg-blue-200 text-blue-900",
      cardTone: "from-sky-50/80 via-blue-50/70 to-cyan-100/60",
      borderTone: "border-blue-700",
      glowTone: "shadow-[0_6px_0_0_rgba(29,78,216,1)]",
    };
  }
  if (qualityScore >= 2) {
    return {
      label: "Uncommon",
      tone: "bg-emerald-200 text-emerald-900",
      cardTone: "from-emerald-50/80 via-lime-50/70 to-emerald-100/60",
      borderTone: "border-emerald-700",
      glowTone: "shadow-[0_6px_0_0_rgba(4,120,87,1)]",
    };
  }
  return {
    label: "Common",
    tone: "bg-zinc-200 text-zinc-900",
    cardTone: "from-zinc-100/80 via-zinc-50/70 to-stone-100/60",
    borderTone: "border-zinc-700",
    glowTone: "shadow-[0_6px_0_0_rgba(63,63,70,1)]",
  };
}

function chooseMonkeyReaction(option: VoteCardOption): string {
  if (option.category === "weapon") {
    return MONKEY_SMUG_IMAGE;
  }
  if (option.category === "modifier") {
    return MONKEY_IDEA_IMAGE;
  }
  if (option.qualityScore >= 8) {
    return MONKEY_SHOCK_IMAGE;
  }
  return MONKEY_HAPPY_IMAGE;
}

function VoteCard({
  option,
  votePercent,
  revealed,
  onPick,
  index,
}: {
  option: VoteCardOption;
  votePercent: number;
  revealed: boolean;
  onPick: () => void;
  index: number;
}) {
  const theme = getCategoryTheme(option.category);
  const quality = getQualityBadge(option.qualityScore);
  const WatermarkIcon = option.icons[0];

  return (
    <button
      type="button"
      disabled={!revealed}
      className={`w-full rounded-none text-left transition-all duration-500 perspective-distant ${
        revealed
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-6 pointer-events-none"
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
      onClick={onPick}
    >
      <div
        className="relative w-full transform-3d transition-transform duration-700"
        style={{
          transform: revealed
            ? "rotateY(180deg) translate3d(0px,0px,0px)"
            : "rotateY(0deg) translate3d(0px,-6px,0px)",
        }}
      >
        <Card className="absolute inset-0 h-56 rounded-none border-2 border-black bg-yellow-200 ring-0 backface-hidden shadow-[0_6px_0_0_rgba(0,0,0,1)]">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-black leading-none">🂠</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                Draw Event
              </p>
            </div>
          </div>
        </Card>

        <Card
          className={`relative h-56 rounded-none border-2 p-2.5 ring-0 transform-[rotateY(180deg)] backface-hidden transition-all duration-150 bg-linear-to-b ${quality.cardTone} ${quality.borderTone} ${quality.glowTone} ${theme.shell} ${
            option.selected
              ? "translate-y-1 shadow-[0_2px_0_0_rgba(0,0,0,1)]"
              : "active:translate-y-1 active:shadow-[0_2px_0_0_rgba(0,0,0,1)]"
          }`}
        >
          <div
            className={`relative h-full border-2 border-black/70 ${theme.inner} p-2 overflow-hidden`}
          >
            {WatermarkIcon && (
              <div className={`absolute -right-1 -bottom-2 ${theme.watermark}`}>
                <WatermarkIcon size={64} className="drop-shadow-none" />
              </div>
            )}

            <div className="relative flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-900">
                {option.title}
              </p>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${quality.tone}`}
              >
                {quality.label}
              </span>
            </div>

            <div className="relative mt-1.5 h-2 bg-zinc-200 border border-black/40 overflow-hidden">
              <div
                className="h-full bg-black"
                style={{ width: `${votePercent}%` }}
              />
            </div>

            <div className="relative mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-zinc-800">
                {option.icons.map((Icon, index) => (
                  <Icon
                    key={`${option.key}-icon-${index}`}
                    size={14}
                    className="text-black/85"
                  />
                ))}
              </div>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${theme.chip}`}
              >
                {votePercent}%
              </span>
            </div>

            <p
              className={`relative mt-1 text-xs sm:text-sm font-black ${theme.text} leading-snug`}
            >
              {option.label}
            </p>

            {option.category !== "arena" && (
              <div className="relative mt-2 h-19 border border-black/35 bg-white/70 backdrop-blur-[1px]">
                <div className="absolute left-1/2 top-2 bottom-2 -translate-x-1/2 w-px bg-zinc-900/30" />
                <div
                  className={`absolute left-1/2 top-5 -translate-x-1/2 w-4 h-7 rounded-full ${theme.divider} border border-black/20`}
                />

                <div className="h-full grid grid-cols-2">
                  <div
                    className={`px-2 py-2 bg-linear-to-b ${theme.splitBlue} flex flex-col justify-center items-start`}
                  >
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-700">
                      Blue Gets
                    </p>
                    <p className="mt-0.5 text-[11px] sm:text-xs font-black text-blue-800 leading-tight">
                      {option.blueLabel ?? "No effect"}
                    </p>
                  </div>

                  <div
                    className={`px-2 py-2 bg-linear-to-b ${theme.splitRed} flex flex-col justify-center items-start`}
                  >
                    <p className="text-[9px] font-black uppercase tracking-wider text-red-700">
                      Red Gets
                    </p>
                    <p className="mt-0.5 text-[11px] sm:text-xs font-black text-red-800 leading-tight">
                      {option.redLabel ?? "No effect"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {option.category === "arena" && (
              <div className="relative mt-2 p-2 border border-black/35 bg-white/75">
                <p className="text-[9px] font-black uppercase tracking-wider text-cyan-700">
                  Arena Modifier
                </p>
                {option.arenaLabel && (
                  <p className="text-[12px] sm:text-[13px] font-black text-cyan-800 leading-tight mt-1">
                    {option.arenaLabel}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </button>
  );
}

function SharedVoteModal({
  open,
  countdown,
  bananas,
  votePower,
  options,
  onVotePowerChange,
  onConfirm,
}: {
  open: boolean;
  countdown: number;
  bananas: number;
  votePower: number;
  options: readonly [VoteCardOption, VoteCardOption, VoteCardOption];
  onVotePowerChange: (amount: number) => void;
  onConfirm: () => void;
}) {
  const [monkeyImageSrc, setMonkeyImageSrc] = useState(MONKEY_THINKING_IMAGE);
  const [shuffling, setShuffling] = useState(true);
  const [revealedCount, setRevealedCount] = useState(0);

  const leadingOptionIndex = useMemo(() => {
    let bestIndex = 0;
    let bestVotes = options[0].projectedVotes;
    for (let index = 1; index < options.length; index += 1) {
      if (options[index].projectedVotes > bestVotes) {
        bestIndex = index;
        bestVotes = options[index].projectedVotes;
      }
    }
    return bestIndex;
  }, [options]);

  const totalProjectedVotes = Math.max(
    1,
    options[0].projectedVotes +
      options[1].projectedVotes +
      options[2].projectedVotes,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const resetTimer = window.setTimeout(() => {
      setShuffling(true);
      setRevealedCount(0);
      setMonkeyImageSrc(MONKEY_THINKING_IMAGE);
    }, 0);

    const shuffleTimer = window.setTimeout(() => {
      setShuffling(false);
    }, 900);
    const reactionTimer = window.setTimeout(() => {
      setMonkeyImageSrc(chooseMonkeyReaction(options[leadingOptionIndex]));
    }, 1250);
    const reveal1 = window.setTimeout(() => setRevealedCount(1), 1500);
    const reveal2 = window.setTimeout(() => setRevealedCount(2), 1820);
    const reveal3 = window.setTimeout(() => setRevealedCount(3), 2140);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(shuffleTimer);
      window.clearTimeout(reactionTimer);
      window.clearTimeout(reveal1);
      window.clearTimeout(reveal2);
      window.clearTimeout(reveal3);
    };
  }, [leadingOptionIndex, open, options]);

  if (!open) {
    return null;
  }

  const pickVote = (option: VoteCardOption) => {
    option.onSelect();
    window.setTimeout(() => {
      onConfirm();
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-100/95 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-4xl">
        <Card className="mx-auto w-full rounded-none bg-white ring-0 border-0 shadow-none sm:border-4 sm:border-black">
          <div className="px-3 py-3 sm:px-4 sm:py-4 border-b-2 border-black/20 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
                {countdown > 0 ? `Event vote (${countdown}s)` : "Event vote"}
              </p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase mt-1">
                Draw Event Cards
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-black">
              <Image
                src="/Banana.svg"
                alt="Banana"
                width={18}
                height={18}
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span>{bananas}</span>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="relative h-24 sm:h-28 mb-3 -mt-2 sm:-mt-3">
              <Image
                src={monkeyImageSrc}
                alt="Monkey"
                width={136}
                height={136}
                className="absolute left-1/2 -top-2 sm:-top-3 -translate-x-1/2 w-24 h-24 sm:w-28 sm:h-28 object-contain"
              />
              <div className="absolute left-1/2 top-9 sm:top-10 -translate-x-1/2 flex">
                <div
                  className={`w-14 h-18 sm:w-16 sm:h-20 border-4 border-black bg-yellow-200 -rotate-12 transition-transform duration-200 ${shuffling ? "-translate-y-1" : "translate-y-0"}`}
                />
                <div
                  className={`w-14 h-18 sm:w-16 sm:h-20 border-4 border-black bg-blue-200 -ml-8 sm:-ml-9 transition-transform duration-200 ${shuffling ? "translate-y-1" : "translate-y-0"}`}
                />
                <div
                  className={`w-14 h-18 sm:w-16 sm:h-20 border-4 border-black bg-pink-200 -ml-8 sm:-ml-9 rotate-12 transition-transform duration-200 ${shuffling ? "-translate-y-1" : "translate-y-0"}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {options.map((option, index) => (
                <VoteCard
                  key={option.key}
                  option={option}
                  index={index}
                  votePercent={Math.round(
                    (option.projectedVotes / totalProjectedVotes) * 100,
                  )}
                  revealed={revealedCount > index}
                  onPick={() => pickVote(option)}
                />
              ))}
            </div>

            <div className="mt-3 p-3 bg-zinc-50 border border-black/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                  Vote Power Stake
                </p>
                <p className="text-base sm:text-lg font-black text-amber-700">
                  {votePower}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3 border-2 border-black rounded-none bg-white text-sm font-black shadow-[0_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[0_1px_0_0_rgba(0,0,0,1)]"
                  onClick={() => onVotePowerChange(Math.max(1, votePower - 5))}
                >
                  -5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3 border-2 border-black rounded-none bg-white text-sm font-black shadow-[0_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[0_1px_0_0_rgba(0,0,0,1)]"
                  onClick={() =>
                    onVotePowerChange(Math.min(bananas, votePower + 5))
                  }
                >
                  +5
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function VoteEventModal({
  open,
  countdown,
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
  const projectedC =
    voteWindow.voteSplit.optionC + (selection === 2 ? votePower : 0);

  const voteCards = [
    {
      key: "option-a",
      title: "Card 1",
      category: getOptionCategory(voteWindow.optionA),
      label: getOptionMainLabel(voteWindow.optionA),
      qualityScore: getQualityScore(voteWindow.optionA),
      icons: getOptionIcons(voteWindow.optionA),
      ...getOptionDescriptions(voteWindow.optionA),
      projectedVotes: projectedA,
      selected: selection === 0,
      onSelect: () => onSelectOption(0),
    },
    {
      key: "option-b",
      title: "Card 2",
      category: getOptionCategory(voteWindow.optionB),
      label: getOptionMainLabel(voteWindow.optionB),
      qualityScore: getQualityScore(voteWindow.optionB),
      icons: getOptionIcons(voteWindow.optionB),
      ...getOptionDescriptions(voteWindow.optionB),
      projectedVotes: projectedB,
      selected: selection === 1,
      onSelect: () => onSelectOption(1),
    },
    {
      key: "option-c",
      title: "Card 3",
      category: getOptionCategory(voteWindow.optionC),
      label: getOptionMainLabel(voteWindow.optionC),
      qualityScore: getQualityScore(voteWindow.optionC),
      icons: getOptionIcons(voteWindow.optionC),
      ...getOptionDescriptions(voteWindow.optionC),
      projectedVotes: projectedC,
      selected: selection === 2,
      onSelect: () => onSelectOption(2),
    },
  ] as const;

  return (
    <SharedVoteModal
      open={open}
      countdown={countdown}
      bananas={bananas}
      votePower={Math.max(1, votePower)}
      options={voteCards}
      onVotePowerChange={onVotePowerChange}
      onConfirm={onConfirm}
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
  const [phase, setPhase] = useState<"thinking" | "choosing" | "revealed">(
    "thinking",
  );
  const [pickedIndex, setPickedIndex] = useState(1);
  const [monkeyImageSrc, setMonkeyImageSrc] = useState(MONKEY_THINKING_IMAGE);

  useEffect(() => {
    if (!open || !revealedOption) {
      return;
    }

    const pool = [
      MONKEY_THINKING_IMAGE,
      MONKEY_IDEA_IMAGE,
      MONKEY_SMUG_IMAGE,
      MONKEY_SHOCK_IMAGE,
    ];

    const resetTimer = window.setTimeout(() => {
      setPhase("thinking");
      setMonkeyImageSrc(MONKEY_THINKING_IMAGE);
      setPickedIndex(Math.floor(Math.random() * 3));
    }, 0);

    let poolIndex = 0;
    const monkeyCycle = window.setInterval(() => {
      poolIndex = (poolIndex + 1) % pool.length;
      setMonkeyImageSrc(pool[poolIndex]);
    }, 260);

    const chooseTimer = window.setTimeout(() => {
      setPhase("choosing");
      setMonkeyImageSrc(MONKEY_IDEA_IMAGE);
    }, 1050);

    const revealTimer = window.setTimeout(() => {
      setPhase("revealed");
      setMonkeyImageSrc(
        chooseMonkeyReaction({
          key: "reveal",
          title: "Reveal",
          category: revealedOption.category,
          label: revealedOption.label,
          qualityScore: 8,
          icons: [],
          projectedVotes: 0,
          selected: true,
          onSelect: () => undefined,
        }),
      );
    }, 1900);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(monkeyCycle);
      window.clearTimeout(chooseTimer);
      window.clearTimeout(revealTimer);
    };
  }, [open, revealedOption]);

  if (!open || !revealedOption) {
    return null;
  }

  const revealCategoryLabel =
    revealedOption.category === "weapon"
      ? "Weapon Effect"
      : revealedOption.category === "modifier"
        ? "Ball Modifier"
        : "Arena Modifier";

  return (
    <div className="fixed inset-0 z-60 bg-zinc-100/95 flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-3xl rounded-none p-4 sm:p-5 bg-white text-center ring-0 border-4 border-black shadow-[0_8px_0_0_rgba(0,0,0,1)]">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-600">
          Vote settled {countdown > 0 ? `(${countdown}s)` : ""}
        </p>

        <div className="relative h-28 sm:h-32 mt-1">
          <Image
            src={monkeyImageSrc}
            alt="Monkey reveal"
            width={160}
            height={160}
            className={`absolute left-1/2 top-0 -translate-x-1/2 w-28 h-28 sm:w-32 sm:h-32 object-contain transition-transform duration-300 ${phase === "revealed" ? "scale-105" : "scale-100"}`}
          />
        </div>

        <div className="mt-1 flex items-end justify-center gap-2 sm:gap-3 h-28 sm:h-32">
          {[0, 1, 2].map((cardIndex) => {
            const isPicked = cardIndex === pickedIndex;
            const isRevealed = phase === "revealed" && isPicked;

            return (
              <div
                key={`reveal-card-${cardIndex}`}
                className={`w-20 sm:w-24 h-28 sm:h-32 border-4 border-black rounded-none bg-yellow-200 flex items-center justify-center transition-all duration-500 ${
                  isPicked && phase !== "thinking"
                    ? "-translate-y-2"
                    : "translate-y-0"
                } ${isRevealed ? "bg-emerald-100 scale-105" : ""}`}
                style={{
                  transform: isRevealed
                    ? "rotateY(180deg) translateY(-8px)"
                    : undefined,
                }}
              >
                {!isRevealed ? (
                  <p className="text-2xl font-black">🂠</p>
                ) : (
                  <p className="text-[11px] sm:text-xs font-black uppercase tracking-wide px-1">
                    Winner
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div
          className={`mt-4 transition-all duration-400 ${phase === "revealed" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-zinc-600">
            {revealCategoryLabel}
          </p>
          <h3 className="text-xl sm:text-3xl font-black uppercase mt-1 text-zinc-900">
            {revealedOption.label}
          </h3>
        </div>
      </Card>
    </div>
  );
}
