import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Mountains, Sparkle, Sword, Star } from "@phosphor-icons/react";
import { BlockSlider } from "@/components/ui/block-slider";
import { FullscreenModal } from "@/components/game/modals/fullscreen-modal";
import { FlipOptionCard } from "@/components/game/modals/flip-option-card";
import { ShuffleMonkey } from "@/components/game/modals/shuffle-monkey";
import type { VoteEventModalProps } from "@/components/game/modals/types";

type IconLike = (props: { size?: number; className?: string }) => ReactNode;

const CATEGORY_ICON_MAP = {
  weapon: Sword,
  modifier: Sparkle,
  arena: Mountains,
} as const;

type VoteCardOption = {
  key: string;
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

const CATEGORY_STYLE = {
  weapon: {
    label: "text-red-700",
    badge: "bg-red-100 text-red-700 border-red-300",
    border: "border-red-200",
    redSide: "bg-red-100 border-red-300",
    blueSide: "bg-blue-50 border-blue-200",
    arenaSide: "bg-orange-50 border-orange-200",
    glow: "shadow-[0_0_0_3px_rgba(239,68,68,0.25)]",
    selected: "border-red-500 shadow-[6px_6px_0px_0px_rgba(239,68,68,0.5)]",
  },
  modifier: {
    label: "text-violet-700",
    badge: "bg-violet-100 text-violet-700 border-violet-300",
    border: "border-violet-200",
    redSide: "bg-red-100 border-red-300",
    blueSide: "bg-blue-50 border-blue-200",
    arenaSide: "bg-violet-50 border-violet-200",
    glow: "shadow-[0_0_0_3px_rgba(139,92,246,0.25)]",
    selected: "border-violet-500 shadow-[6px_6px_0px_0px_rgba(139,92,246,0.5)]",
  },
  arena: {
    label: "text-cyan-700",
    badge: "bg-cyan-100 text-cyan-700 border-cyan-300",
    border: "border-cyan-200",
    redSide: "bg-red-100 border-red-300",
    blueSide: "bg-blue-50 border-blue-200",
    arenaSide: "bg-cyan-50 border-cyan-200",
    glow: "shadow-[0_0_0_3px_rgba(6,182,212,0.25)]",
    selected: "border-cyan-500 shadow-[6px_6px_0px_0px_rgba(6,182,212,0.5)]",
  },
};

const QUALITY_STARS = (score: number) => {
  const capped = Math.min(5, Math.max(1, Math.round(score / 2)));
  return Array.from({ length: capped }, (_, i) => i);
};

function colorizeKeywords(text: string): ReactNode {
  return text.split(/(Blue|Red)/g).map((part, i) => {
    if (part === "Blue")
      return (
        <span key={i} className="text-blue-600">
          {part}
        </span>
      );
    if (part === "Red")
      return (
        <span key={i} className="text-red-600">
          {part}
        </span>
      );
    return <span key={i}>{part}</span>;
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
  const safe = option as {
    icon?: unknown;
    option?: {
      icon?: unknown;
      red?: { icon?: unknown };
      blue?: { icon?: unknown };
      arena?: { icon?: unknown };
    };
  };
  return [
    safe.icon,
    safe.option?.icon,
    safe.option?.red?.icon,
    safe.option?.blue?.icon,
    safe.option?.arena?.icon,
  ]
    .filter(isIconLike)
    .slice(0, 4);
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
  const n = option.option;
  if (typeof n?.qualityScore === "number") return n.qualityScore;
  if (typeof option.qualityScore === "number") return option.qualityScore;
  if (
    typeof n?.red?.quality === "number" &&
    typeof n?.blue?.quality === "number"
  )
    return n.red.quality + n.blue.quality;
  if (typeof n?.arena?.quality === "number") return n.arena.quality;
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
  return {
    redLabel: option.option?.red?.label ?? option.redLabel,
    blueLabel: option.option?.blue?.label ?? option.blueLabel,
    arenaLabel: option.option?.arena?.label ?? option.arenaLabel,
  };
}

function chooseMonkeyReaction(option: VoteCardOption): string {
  if (option.category === "weapon") return MONKEY_SMUG_IMAGE;
  if (option.category === "modifier") return MONKEY_IDEA_IMAGE;
  if (option.qualityScore >= 8) return MONKEY_SHOCK_IMAGE;
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
  const style = CATEGORY_STYLE[option.category];
  const CategoryIcon = CATEGORY_ICON_MAP[option.category];
  const stars = QUALITY_STARS(option.qualityScore);
  const isArena = option.category === "arena";
  const displayText = isArena ? (option.arenaLabel ?? option.label) : null;

  return (
    <FlipOptionCard
      index={index}
      revealed={revealed}
      disabled={!revealed}
      onPick={onPick}
      back={
        <div className="absolute inset-0 h-64 sm:h-72 border-4 border-black bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-center">
            <p className="text-6xl font-black opacity-40">?</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2 text-zinc-600">
              Draw Event
            </p>
          </div>
        </div>
      }
      front={
        <div
          className={[
            "relative h-64 sm:h-72 border-4 flex flex-col overflow-hidden",
            "transition-all duration-150 [transform:rotateY(180deg)] backface-hidden",
            option.selected
              ? ["border-black", style.selected].join(" ")
              : "border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5",
          ].join(" ")}
        >
          <div
            className={[
              "px-3 pt-3 pb-2 flex items-center justify-between",
              option.selected ? "bg-zinc-50" : "bg-zinc-50",
            ].join(" ")}
          >
            <span
              className={[
                "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 border-2",
                style.badge,
              ].join(" ")}
            >
              <CategoryIcon size={9} />
              {option.category}
            </span>
            <div className="flex items-center gap-1">
              {stars.map((i) => (
                <Star key={i} size={10} weight="fill" className={style.label} />
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1.5 p-2.5">
            {isArena ? (
              <div
                className={[
                  "flex-1 border-2 p-3 flex flex-col justify-center",
                  style.arenaSide,
                ].join(" ")}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                  Arena Effect
                </p>
                <p className="text-sm font-black leading-snug">
                  {displayText ?? "No effect"}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={["flex-1 border-2 p-2.5", style.blueSide].join(
                    " ",
                  )}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1">
                    Blue Gets
                  </p>
                  <p className="text-xs font-black text-blue-900 leading-snug">
                    {option.blueLabel ?? "No effect"}
                  </p>
                </div>
                <div
                  className={["flex-1 border-2 p-2.5", style.redSide].join(" ")}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1">
                    Red Gets
                  </p>
                  <p className="text-xs font-black text-red-900 leading-snug">
                    {option.redLabel ?? "No effect"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="px-3 pb-2.5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-zinc-400">
              {votePercent}% votes
            </span>
            {option.selected && (
              <span className="text-[10px] font-black uppercase text-black bg-yellow-300 px-2 py-0.5 border-2 border-black">
                Picked ✓
              </span>
            )}
          </div>
        </div>
      }
    />
  );
}

function SharedVoteModal({
  open,
  countdown,
  bananas,
  votePower,
  options,
  selection,
  onVotePowerChange,
  onConfirm,
}: {
  open: boolean;
  countdown: number;
  bananas: number;
  votePower: number;
  options: readonly [VoteCardOption, VoteCardOption, VoteCardOption];
  selection: 0 | 1 | 2 | null;
  onVotePowerChange: (amount: number) => void;
  onConfirm: (option: 0 | 1 | 2) => void;
}) {
  const [monkeyImageSrc, setMonkeyImageSrc] = useState(MONKEY_THINKING_IMAGE);
  const [shuffling, setShuffling] = useState(true);
  const [revealedCount, setRevealedCount] = useState(0);

  const totalVotes = Math.max(
    1,
    options[0].projectedVotes +
      options[1].projectedVotes +
      options[2].projectedVotes,
  );

  useEffect(() => {
    if (!open) return;
    const timers = [
      window.setTimeout(() => {
        setShuffling(true);
        setRevealedCount(0);
        setMonkeyImageSrc(MONKEY_THINKING_IMAGE);
      }, 0),
      window.setTimeout(() => setShuffling(false), 900),
      window.setTimeout(() => setRevealedCount(1), 1500),
      window.setTimeout(() => setRevealedCount(2), 1820),
      window.setTimeout(() => setRevealedCount(3), 2140),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [open]);

  useEffect(() => {
    if (selection !== null && selection !== undefined) {
      const picked = options[selection];
      if (picked) {
        const t = window.setTimeout(
          () => setMonkeyImageSrc(chooseMonkeyReaction(picked)),
          0,
        );
        return () => window.clearTimeout(t);
      }
    }
  }, [selection, options]);

  if (!open) return null;

  const pickVote = (option: VoteCardOption, idx: 0 | 1 | 2) => {
    option.onSelect();
    onConfirm(idx);
  };

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-3xl"
      zIndexClassName="z-50"
    >
      <div className="w-full bg-white">
        <div className="p-5 sm:p-7 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                {countdown > 0 ? `Event Vote · ${countdown}s` : "Event Vote"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black uppercase mt-1">
                Draw Event Cards
              </h2>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2 border-4 border-black px-3 py-2 bg-yellow-300">
                <Image src="/Banana.svg" alt="Banana" width={16} height={16} />
                <span className="text-base font-black tabular-nums">
                  {bananas}
                </span>
              </div>
              <div className="bg-zinc-50 border-2 border-zinc-200 p-2 w-36">
                <BlockSlider
                  label="Vote Stake"
                  valueLabel={String(votePower)}
                  min={1}
                  max={Math.max(1, bananas)}
                  step={1}
                  value={Math.max(1, Math.min(bananas, votePower))}
                  onChange={(e) =>
                    onVotePowerChange(
                      Math.max(1, Math.min(bananas, Number(e.target.value))),
                    )
                  }
                />
              </div>
            </div>
          </div>

          <ShuffleMonkey
            monkeyImageSrc={monkeyImageSrc}
            shuffling={shuffling}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {options.map((option, index) => (
              <VoteCard
                key={option.key}
                option={option}
                index={index}
                votePercent={Math.round(
                  (option.projectedVotes / totalVotes) * 100,
                )}
                revealed={revealedCount > index}
                onPick={() => pickVote(option, index as 0 | 1 | 2)}
              />
            ))}
          </div>
        </div>
      </div>
    </FullscreenModal>
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
  if (!open || !voteWindow) return null;

  const projA =
    voteWindow.voteSplit.optionA + (selection === 0 ? votePower : 0);
  const projB =
    voteWindow.voteSplit.optionB + (selection === 1 ? votePower : 0);
  const projC =
    voteWindow.voteSplit.optionC + (selection === 2 ? votePower : 0);

  const voteCards = [
    {
      key: "option-a",
      category: getOptionCategory(voteWindow.optionA),
      label: getOptionMainLabel(voteWindow.optionA),
      qualityScore: getQualityScore(voteWindow.optionA),
      icons: getOptionIcons(voteWindow.optionA),
      ...getOptionDescriptions(voteWindow.optionA),
      projectedVotes: projA,
      selected: selection === 0,
      onSelect: () => onSelectOption(0),
    },
    {
      key: "option-b",
      category: getOptionCategory(voteWindow.optionB),
      label: getOptionMainLabel(voteWindow.optionB),
      qualityScore: getQualityScore(voteWindow.optionB),
      icons: getOptionIcons(voteWindow.optionB),
      ...getOptionDescriptions(voteWindow.optionB),
      projectedVotes: projB,
      selected: selection === 1,
      onSelect: () => onSelectOption(1),
    },
    {
      key: "option-c",
      category: getOptionCategory(voteWindow.optionC),
      label: getOptionMainLabel(voteWindow.optionC),
      qualityScore: getQualityScore(voteWindow.optionC),
      icons: getOptionIcons(voteWindow.optionC),
      ...getOptionDescriptions(voteWindow.optionC),
      projectedVotes: projC,
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
      selection={selection}
      onVotePowerChange={onVotePowerChange}
      onConfirm={onConfirm}
    />
  );
}

export function VoteRevealModal({
  open,
  countdown,
  pickedOptionIndex,
  revealedOption,
}: {
  open: boolean;
  countdown: number;
  pickedOptionIndex: 0 | 1 | 2 | null;
  revealedOption: {
    category: "weapon" | "modifier" | "arena";
    label: string;
  } | null;
}) {
  const [phase, setPhase] = useState<"thinking" | "revealed">("thinking");
  const [pickedIndex, setPickedIndex] = useState(1);
  const [monkeyImageSrc, setMonkeyImageSrc] = useState(MONKEY_THINKING_IMAGE);

  useEffect(() => {
    if (!open || !revealedOption) return;
    const timers = [
      window.setTimeout(() => {
        setPhase("thinking");
        setMonkeyImageSrc(MONKEY_THINKING_IMAGE);
        setPickedIndex(pickedOptionIndex ?? 1);
      }, 0),
      window.setTimeout(() => {
        setPhase("revealed");
        setMonkeyImageSrc(
          chooseMonkeyReaction({
            key: "r",
            category: revealedOption.category,
            label: revealedOption.label,
            qualityScore: 8,
            icons: [],
            projectedVotes: 0,
            selected: true,
            onSelect: () => undefined,
          }),
        );
      }, 1500),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [open, pickedOptionIndex, revealedOption]);

  if (!open || !revealedOption) return null;

  const categoryLabel =
    revealedOption.category === "weapon"
      ? "Weapon Effect"
      : revealedOption.category === "modifier"
        ? "Ball Modifier"
        : "Arena Modifier";

  return (
    <FullscreenModal
      open={open && Boolean(revealedOption)}
      maxWidthClassName="max-w-lg"
      zIndexClassName="z-60"
    >
      <div className="w-full bg-white p-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
          Vote Settled {countdown > 0 ? `· ${countdown}s` : ""}
        </p>

        <div className="relative h-28 mt-2">
          <Image
            src={monkeyImageSrc}
            alt="Monkey"
            width={128}
            height={128}
            className={[
              "absolute left-1/2 top-0 -translate-x-1/2 w-24 h-24 sm:w-28 sm:h-28 object-contain transition-transform duration-300",
              phase === "revealed" ? "scale-110" : "scale-100",
            ].join(" ")}
          />
        </div>

        <div className="flex items-end justify-center gap-3 h-24 mt-2">
          {[0, 1, 2].map((cardIndex) => {
            const isPicked = cardIndex === pickedIndex;
            const isRevealed = phase === "revealed" && isPicked;
            return (
              <div
                key={cardIndex}
                className={[
                  "w-16 sm:w-20 h-20 sm:h-24 border-4 flex items-center justify-center transition-all duration-500",
                  isPicked && phase !== "thinking"
                    ? "-translate-y-2 scale-105"
                    : "",
                  isRevealed
                    ? "border-black bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "border-black bg-gradient-to-br from-yellow-100 to-amber-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                ].join(" ")}
              >
                {!isRevealed ? (
                  <p className="text-2xl font-black opacity-30">?</p>
                ) : (
                  <p className="text-[10px] font-black uppercase tracking-wide px-1">
                    Winner
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div
          className={[
            "mt-4 transition-all duration-400",
            phase === "revealed"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2",
          ].join(" ")}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
            {categoryLabel}
          </p>
          <h3 className="text-xl sm:text-2xl font-black uppercase mt-1">
            {revealedOption.label}
          </h3>
        </div>
      </div>
    </FullscreenModal>
  );
}
