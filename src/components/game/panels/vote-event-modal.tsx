import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Mountains, Sparkle, Sword } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { FullscreenModal } from "./fullscreen-modal";
import { FlipOptionCard } from "./flip-option-card";
import { ModalSurface } from "./modal-surface";
import { ShuffleMonkey } from "./shuffle-monkey";
import type { VoteEventModalProps } from "./betting-types";

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
    icon?: unknown;
    option?: {
      icon?: unknown;
      red?: { icon?: unknown };
      blue?: { icon?: unknown };
      arena?: { icon?: unknown };
    };
  };
  const icons: IconLike[] = [];
  const rootIcon = safeOption.icon;
  const optionIcon = safeOption.option?.icon;
  const redIcon = safeOption.option?.red?.icon;
  const blueIcon = safeOption.option?.blue?.icon;
  const arenaIcon = safeOption.option?.arena?.icon;

  if (isIconLike(rootIcon)) icons.push(rootIcon);
  if (isIconLike(optionIcon)) icons.push(optionIcon);
  if (isIconLike(redIcon)) icons.push(redIcon);
  if (isIconLike(blueIcon)) icons.push(blueIcon);
  if (isIconLike(arenaIcon)) icons.push(arenaIcon);

  return icons.slice(0, 4);
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
  accent: string;
  progressTrack: string;
  progressFill: string;
  iconRing: string;
} {
  if (category === "weapon") {
    return {
      shell: "bg-gradient-to-b from-red-100 via-orange-50 to-rose-100",
      inner: "bg-white/82",
      text: "text-red-900",
      chip: "bg-red-100 text-red-900",
      divider: "from-red-500/80 to-orange-500/80",
      watermark: "text-red-300/35",
      splitBlue: "from-blue-50 to-blue-100/70",
      splitRed: "from-red-50 to-red-100/70",
      accent: "text-red-700",
      progressTrack: "bg-red-100",
      progressFill: "from-red-500 to-orange-500",
      iconRing: "bg-red-100 text-red-700",
    };
  }
  if (category === "modifier") {
    return {
      shell: "bg-gradient-to-b from-violet-100 via-fuchsia-50 to-purple-100",
      inner: "bg-white/82",
      text: "text-violet-900",
      chip: "bg-violet-100 text-violet-900",
      divider: "from-violet-500/80 to-fuchsia-500/80",
      watermark: "text-violet-300/35",
      splitBlue: "from-blue-50 to-blue-100/70",
      splitRed: "from-red-50 to-red-100/70",
      accent: "text-violet-700",
      progressTrack: "bg-violet-100",
      progressFill: "from-violet-500 to-fuchsia-500",
      iconRing: "bg-violet-100 text-violet-700",
    };
  }
  return {
    shell: "bg-gradient-to-b from-cyan-100 via-sky-50 to-blue-100",
    inner: "bg-white/82",
    text: "text-cyan-900",
    chip: "bg-cyan-100 text-cyan-900",
    divider: "from-cyan-500/80 to-sky-500/80",
    watermark: "text-cyan-300/35",
    splitBlue: "from-blue-50 to-blue-100/70",
    splitRed: "from-red-50 to-red-100/70",
    accent: "text-cyan-700",
    progressTrack: "bg-cyan-100",
    progressFill: "from-cyan-500 to-sky-500",
    iconRing: "bg-cyan-100 text-cyan-700",
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
  const CategoryIcon = CATEGORY_ICON_MAP[option.category];
  const WatermarkIcon = option.icons[0] ?? CategoryIcon;
  const arenaText = option.arenaLabel ?? option.label;
  const blueText = option.category === "arena" ? arenaText : option.blueLabel;
  const redText = option.category === "arena" ? arenaText : option.redLabel;

  return (
    <FlipOptionCard
      index={index}
      revealed={revealed}
      disabled={!revealed}
      onPick={onPick}
      back={
        <Card className="absolute inset-0 h-64 sm:h-72 rounded-xl sm:rounded-2xl border-0 bg-linear-to-b from-amber-200 via-yellow-100 to-amber-200 ring-1 ring-black/5 backface-hidden shadow-[0_12px_24px_-14px_rgba(0,0,0,0.55)]">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-black leading-none">🂠</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-3 text-zinc-700">
                Draw Event
              </p>
            </div>
          </div>
        </Card>
      }
      front={
        <Card
          className={`relative h-64 sm:h-72 rounded-xl sm:rounded-2xl border-0 p-2 ring-1 ring-black/6 transform-[rotateY(180deg)] backface-hidden transition-all duration-150 ${theme.shell} ${
            option.selected
              ? "-translate-y-0.5"
              : "hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          <div
            className={`relative h-full rounded-lg sm:rounded-xl ${theme.inner} p-2 overflow-hidden`}
          >
            {WatermarkIcon && (
              <div
                className={`absolute -right-1 -bottom-2 ${theme.watermark} pointer-events-none`}
              >
                <WatermarkIcon size={68} className="drop-shadow-none" />
              </div>
            )}

            <div className="relative flex h-full flex-col">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-700">
                    <CategoryIcon size={12} className={theme.accent} />
                    {option.category}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-600">
                    {votePercent}%
                  </span>
                </div>
              </div>

              <div className="mt-2.5 grow rounded-lg sm:rounded-xl bg-white/80 p-2">
                <div
                  className={`rounded-lg bg-linear-to-b ${theme.splitBlue} px-2.5 py-2 min-h-15.5`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                    Blue Gets
                  </p>
                  <p className="mt-1 text-xs font-black text-blue-900 leading-tight">
                    {blueText ?? "No effect"}
                  </p>
                </div>

                <div
                  className={`mt-2 rounded-lg bg-linear-to-b ${theme.splitRed} px-2.5 py-2 min-h-15.5`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                    Red Gets
                  </p>
                  <p className="mt-1 text-xs font-black text-red-900 leading-tight">
                    {redText ?? "No effect"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
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
    const reveal1 = window.setTimeout(() => setRevealedCount(1), 1500);
    const reveal2 = window.setTimeout(() => setRevealedCount(2), 1820);
    const reveal3 = window.setTimeout(() => setRevealedCount(3), 2140);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(shuffleTimer);
      window.clearTimeout(reveal1);
      window.clearTimeout(reveal2);
      window.clearTimeout(reveal3);
    };
  }, [open]);

  useEffect(() => {
    if (selection !== null && selection !== undefined) {
      const pickedOption = options[selection];
      if (pickedOption) {
        const reactionTimer = window.setTimeout(() => {
          setMonkeyImageSrc(chooseMonkeyReaction(pickedOption));
        }, 0);
        return () => window.clearTimeout(reactionTimer);
      }
    }
  }, [selection, options]);

  if (!open) {
    return null;
  }

  const pickVote = (option: VoteCardOption, optionIndex: 0 | 1 | 2) => {
    option.onSelect();
    onConfirm(optionIndex);
  };

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-4xl"
      zIndexClassName="z-50"
    >
      <ModalSurface>
        <div className="px-3 py-3 sm:px-4 sm:py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
              {countdown > 0 ? `Event vote (${countdown}s)` : "Event vote"}
            </p>
            <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase mt-1">
              Draw Event Cards
            </h2>
          </div>
          <div className="min-w-36.25">
            <div className="flex items-center justify-end gap-1 text-xs sm:text-base font-black">
              <Image
                src="/Banana.svg"
                alt="Banana"
                width={18}
                height={18}
                className="w-4 h-auto sm:w-5"
              />
              <span>{bananas}</span>
            </div>
            <div className="mt-1 rounded-lg bg-zinc-50 px-2 py-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-600">
                <span>Stake</span>
                <span>{votePower}</span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.max(1, bananas)}
                step={1}
                value={Math.max(1, Math.min(bananas, votePower))}
                className="mt-1.5 w-full accent-black"
                onChange={(event) =>
                  onVotePowerChange(
                    Math.max(1, Math.min(bananas, Number(event.target.value))),
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className="p-2.5 sm:p-4">
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
                  (option.projectedVotes / totalProjectedVotes) * 100,
                )}
                revealed={revealedCount > index}
                onPick={() => pickVote(option, index as 0 | 1 | 2)}
              />
            ))}
          </div>
        </div>
      </ModalSurface>
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
  const [phase, setPhase] = useState<"thinking" | "choosing" | "revealed">(
    "thinking",
  );
  const [pickedIndex, setPickedIndex] = useState(1);
  const [monkeyImageSrc, setMonkeyImageSrc] = useState(MONKEY_THINKING_IMAGE);

  useEffect(() => {
    if (!open || !revealedOption) {
      return;
    }

    const resetTimer = window.setTimeout(() => {
      setPhase("thinking");
      setMonkeyImageSrc(MONKEY_THINKING_IMAGE);
      setPickedIndex(pickedOptionIndex ?? 1);
    }, 0);

    const revealTimer = window.setTimeout(() => {
      setPhase("revealed");
      setMonkeyImageSrc(
        chooseMonkeyReaction({
          key: "reveal",
          category: revealedOption.category,
          label: revealedOption.label,
          qualityScore: 8,
          icons: [],
          projectedVotes: 0,
          selected: true,
          onSelect: () => undefined,
        }),
      );
    }, 1500);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(revealTimer);
    };
  }, [open, pickedOptionIndex, revealedOption]);

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
    <FullscreenModal
      open={open && Boolean(revealedOption)}
      maxWidthClassName="max-w-3xl"
      zIndexClassName="z-60"
    >
      <ModalSurface className="p-3 sm:p-5 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-600">
          Vote settled {countdown > 0 ? `(${countdown}s)` : ""}
        </p>

        <div className="relative h-24 sm:h-32 mt-1">
          <Image
            src={monkeyImageSrc}
            alt="Monkey reveal"
            width={160}
            height={160}
            className={`absolute left-1/2 top-0 -translate-x-1/2 w-24 h-24 sm:w-32 sm:h-32 object-contain transition-transform duration-300 ${phase === "revealed" ? "scale-105" : "scale-100"}`}
          />
        </div>

        <div className="mt-1 flex items-end justify-center gap-1.5 sm:gap-3 h-24 sm:h-32">
          {[0, 1, 2].map((cardIndex) => {
            const isPicked = cardIndex === pickedIndex;
            const isRevealed = phase === "revealed" && isPicked;

            return (
              <div
                key={`reveal-card-${cardIndex}`}
                className={`w-16 sm:w-24 h-24 sm:h-32 rounded-lg sm:rounded-xl ring-1 ring-black/10 bg-yellow-200 flex items-center justify-center transition-all duration-500 ${
                  isPicked && phase !== "thinking"
                    ? "-translate-y-2 scale-103"
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
          <h3 className="text-lg sm:text-2xl font-black uppercase mt-1 text-zinc-900">
            {revealedOption.label}
          </h3>
        </div>
      </ModalSurface>
    </FullscreenModal>
  );
}
