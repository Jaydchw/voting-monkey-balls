import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Mountains, Sparkle, Sword, Star } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
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
        <div className="absolute inset-0 h-40 sm:h-52 border-4 border-black bg-linear-to-br from-yellow-100 to-amber-200 flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-center">
            <p className="text-5xl font-black opacity-40">?</p>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1 text-zinc-600">
              Draw Event
            </p>
          </div>
        </div>
      }
      front={
        <div
          className={[
            "relative h-40 sm:h-52 border-4 flex flex-col overflow-hidden",
            "transition-all duration-150 transform-[rotateY(180deg)] backface-hidden",
            option.selected
              ? ["border-black", style.selected].join(" ")
              : "border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5",
          ].join(" ")}
        >
          <div className="px-2.5 pt-2.5 pb-1.5 flex items-center justify-between bg-zinc-50">
            <span
              className={[
                "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 border-2",
                style.badge,
              ].join(" ")}
            >
              <CategoryIcon size={8} />
              {option.category}
            </span>
            <div className="flex items-center gap-0.5">
              {stars.map((i) => (
                <Star key={i} size={9} weight="fill" className={style.label} />
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1 p-2">
            {isArena ? (
              <div
                className={[
                  "flex-1 border-2 p-2 flex flex-col justify-center",
                  style.arenaSide,
                ].join(" ")}
              >
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-0.5">
                  Arena Effect
                </p>
                <p className="text-xs font-black leading-snug">
                  {displayText ?? "No effect"}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={["flex-1 border-2 p-2", style.blueSide].join(" ")}
                >
                  <p className="text-[9px] font-black uppercase tracking-wider text-blue-600 mb-0.5">
                    Blue Gets
                  </p>
                  <p className="text-[11px] font-black text-blue-900 leading-snug">
                    {option.blueLabel ?? "No effect"}
                  </p>
                </div>
                <div
                  className={["flex-1 border-2 p-2", style.redSide].join(" ")}
                >
                  <p className="text-[9px] font-black uppercase tracking-wider text-red-600 mb-0.5">
                    Red Gets
                  </p>
                  <p className="text-[11px] font-black text-red-900 leading-snug">
                    {option.redLabel ?? "No effect"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="px-2.5 pb-2 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-zinc-400">
              {votePercent}%
            </span>
            {option.selected && (
              <span className="text-[9px] font-black uppercase text-black bg-yellow-300 px-1.5 py-0.5 border-2 border-black">
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
        <div className="p-4 sm:p-7 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                {countdown > 0 ? `Event Vote · ${countdown}s` : "Event Vote"}
              </p>
              <h2 className="text-xl sm:text-3xl font-black uppercase mt-0.5">
                Draw Event Cards
              </h2>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2 border-4 border-black px-3 py-2 bg-yellow-300">
                <Image src="/Banana.svg" alt="Banana" width={14} height={14} />
                <span className="text-sm font-black tabular-nums">
                  {bananas}
                </span>
              </div>
              <div className="bg-zinc-50 border-2 border-zinc-200 p-2 w-32">
                <BlockSlider
                  label="Vote"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
      }, 1200),
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

  const categoryColor =
    revealedOption.category === "weapon"
      ? "#ef4444"
      : revealedOption.category === "modifier"
        ? "#8b5cf6"
        : "#06b6d4";

  return (
    <FullscreenModal
      open={open && Boolean(revealedOption)}
      maxWidthClassName="max-w-lg"
      zIndexClassName="z-60"
    >
      <div className="w-full bg-white p-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
          Vote Settled {countdown > 0 ? `· ${countdown}s` : ""}
        </p>

        <div className="relative h-24 mt-2">
          <motion.div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            animate={
              phase === "revealed"
                ? { scale: [1, 1.15, 1.05], rotate: [0, -4, 4, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Image
              src={monkeyImageSrc}
              alt="Monkey"
              width={112}
              height={112}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
            />
          </motion.div>
        </div>

        <div className="flex items-end justify-center gap-2 sm:gap-3 h-24 mt-1">
          {[0, 1, 2].map((cardIndex) => {
            const isPicked = cardIndex === pickedIndex;
            const isRevealed = phase === "revealed" && isPicked;
            return (
              <motion.div
                key={cardIndex}
                animate={
                  isPicked && phase === "revealed"
                    ? {
                        y: [-2, -12, -8],
                        scale: [1, 1.12, 1.08],
                        boxShadow: [
                          "4px 4px 0px 0px rgba(0,0,0,1)",
                          `0px 0px 24px 6px ${categoryColor}88`,
                          `0px 0px 16px 4px ${categoryColor}66`,
                        ],
                      }
                    : isPicked
                      ? { y: -4, scale: 1.04 }
                      : { y: 0, scale: 1 }
                }
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={[
                  "w-14 sm:w-20 h-18 sm:h-24 border-4 flex items-center justify-center transition-colors duration-300",
                  isRevealed
                    ? "border-black bg-yellow-300"
                    : "border-black bg-linear-to-br from-yellow-100 to-amber-200",
                ].join(" ")}
              >
                {!isRevealed ? (
                  <p className="text-xl font-black opacity-30">?</p>
                ) : (
                  <motion.p
                    className="text-[10px] font-black uppercase tracking-wide px-1 text-center"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 280 }}
                  >
                    Winner
                  </motion.p>
                )}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {phase === "revealed" && (
            <motion.div
              key="revealed-text"
              className="mt-4"
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <motion.p
                className="text-[10px] font-black uppercase tracking-[0.3em]"
                style={{ color: categoryColor }}
              >
                {categoryLabel}
              </motion.p>
              <motion.h3
                className="text-lg sm:text-2xl font-black uppercase mt-1"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                {revealedOption.label}
              </motion.h3>

              <motion.div
                className="mt-2 flex justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.06, type: "spring" }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "thinking" && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Counting votes...
            </p>
            <motion.div
              className="flex justify-center gap-2 mt-2"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-zinc-300"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.15,
                    repeat: Infinity,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </div>
    </FullscreenModal>
  );
}
