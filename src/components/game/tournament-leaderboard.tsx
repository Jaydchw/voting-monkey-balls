"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Medal, Trophy, Star } from "@phosphor-icons/react";
import Image from "next/image";
import { CharacterAvatar } from "@/components/game/character/character-avatar";

export type LeaderboardEntry = {
  id: string;
  name: string;
  bananas: number;
  characterSvg?: string;
  characterColor?: string;
  isPlayer?: boolean;
};

type TournamentLeaderboardProps = {
  entries: LeaderboardEntry[];
  onPlayAgain?: () => void;
  onExit?: () => void;
};

const PODIUM_ORDER = [1, 0, 2];

const PODIUM_CONFIG = [
  {
    label: "1ST",
    height: 180,
    avatarSize: 96,
    bg: "bg-yellow-300",
    textColor: "text-yellow-900",
    shadow: "shadow-[8px_8px_0px_0px_rgba(234,179,8,0.7)]",
    glow: "0 0 60px rgba(250,204,21,0.55)",
    icon: <Trophy size={40} weight="fill" className="text-yellow-400" />,
  },
  {
    label: "2ND",
    height: 130,
    avatarSize: 76,
    bg: "bg-zinc-200",
    textColor: "text-zinc-700",
    shadow: "shadow-[6px_6px_0px_0px_rgba(161,161,170,0.5)]",
    glow: "0 0 30px rgba(212,212,216,0.3)",
    icon: <Medal size={30} weight="fill" className="text-zinc-400" />,
  },
  {
    label: "3RD",
    height: 100,
    avatarSize: 64,
    bg: "bg-orange-200",
    textColor: "text-orange-900",
    shadow: "shadow-[6px_6px_0px_0px_rgba(251,146,60,0.45)]",
    glow: "0 0 24px rgba(251,146,60,0.3)",
    icon: <Medal size={26} weight="fill" className="text-orange-400" />,
  },
];

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
};

const CONFETTI_COLORS = [
  "#facc15",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#06b6d4",
];

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const spawn = () => {
      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          id: nextIdRef.current++,
          x: Math.random() * canvas.width,
          y: -10,
          vx: (Math.random() - 0.5) * 5,
          vy: Math.random() * 3 + 1.5,
          color:
            CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: Math.random() * 10 + 5,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.18,
        });
      }
    };

    const spawnInterval = setInterval(spawn, 60);
    const stopSpawn = setTimeout(() => clearInterval(spawnInterval), 4500);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(
        (p) => p.y < canvas.height + 20,
      );
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearInterval(spawnInterval);
      clearTimeout(stopSpawn);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return canvasRef;
}

function PodiumSlot({
  entry,
  placeIdx,
  visible,
}: {
  entry: LeaderboardEntry;
  placeIdx: number;
  visible: boolean;
}) {
  const config = PODIUM_CONFIG[placeIdx];
  const isFirst = placeIdx === 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="flex flex-col items-center flex-1"
          style={{ maxWidth: isFirst ? 210 : 170 }}
          initial={{ y: 140, opacity: 0, scale: 0.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.div
            className="mb-3"
            initial={{ scale: 0, rotate: -25 }}
            animate={
              isFirst
                ? { scale: [0, 1.5, 0.85, 1.2, 1], rotate: [-25, 12, -6, 6, 0] }
                : { scale: [0, 1.2, 0.9, 1], rotate: 0 }
            }
            transition={{
              delay: 0.2,
              duration: isFirst ? 0.8 : 0.5,
              ease: "easeOut",
            }}
          >
            {config.icon}
          </motion.div>

          <motion.div
            className="relative mb-3"
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.12,
              type: "spring",
              stiffness: 320,
              damping: 18,
            }}
          >
            {entry.isPlayer && (
              <motion.div
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
                initial={{ opacity: 0, y: 8, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 400 }}
              >
                <div className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-[0.25em] px-2.5 py-1 border-2 border-white whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  ★ YOU ★
                </div>
              </motion.div>
            )}

            <div
              className={`border-4 border-black ${entry.isPlayer ? "ring-4 ring-primary ring-offset-2 ring-offset-transparent" : ""}`}
              style={{
                boxShadow: config.glow,
              }}
            >
              {entry.characterSvg ? (
                <CharacterAvatar
                  svgType={entry.characterSvg}
                  color={entry.characterColor}
                  size={config.avatarSize}
                />
              ) : (
                <div
                  className="bg-zinc-100 flex items-center justify-center"
                  style={{
                    width: config.avatarSize,
                    height: config.avatarSize,
                  }}
                >
                  <Crown
                    size={config.avatarSize * 0.38}
                    weight="fill"
                    className="text-zinc-400"
                  />
                </div>
              )}
            </div>

            {isFirst && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  boxShadow: "0 0 40px 10px rgba(250,204,21,0.3)",
                  borderRadius: 0,
                }}
              />
            )}
          </motion.div>

          <motion.p
            className={`text-xs font-black uppercase tracking-widest text-center mb-2 max-w-full truncate px-1 ${entry.isPlayer ? "text-primary" : "text-black"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38 }}
          >
            {entry.name}
          </motion.p>

          <motion.div
            className={`w-full border-4 border-black ${config.bg} ${config.shadow} flex flex-col items-center justify-start gap-1.5 px-2 pt-5`}
            style={{ height: config.height, transformOrigin: "bottom" }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              delay: 0.06,
              type: "spring",
              stiffness: 240,
              damping: 22,
            }}
          >
            <span
              className={`text-4xl font-black uppercase tracking-widest leading-none ${config.textColor}`}
            >
              {config.label}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Image src="/Banana.svg" alt="Banana" width={16} height={16} />
              <span
                className={`text-sm font-black tabular-nums ${config.textColor}`}
              >
                {entry.bananas}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TournamentLeaderboard({
  entries,
  onPlayAgain,
  onExit,
}: TournamentLeaderboardProps) {
  const [visiblePodium, setVisiblePodium] = useState<number[]>([]);
  const [showTitle, setShowTitle] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const canvasRef = useConfetti(confettiActive);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setShowTitle(true), 150));
    timers.push(setTimeout(() => setConfettiActive(true), 500));

    PODIUM_ORDER.forEach((placeIdx, i) => {
      if (!top3[placeIdx]) return;
      timers.push(
        setTimeout(
          () => {
            setVisiblePodium((prev) => [...prev, placeIdx]);
          },
          650 + i * 650,
        ),
      );
    });

    const totalPodiumMs =
      650 + PODIUM_ORDER.filter((_, i) => !!top3[PODIUM_ORDER[i]]).length * 650;
    timers.push(setTimeout(() => setShowRest(true), totalPodiumMs + 600));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10"
      />

      <div className="relative z-20 min-h-full flex flex-col items-center justify-start px-4 py-10">
        <AnimatePresence>
          {showTitle && (
            <motion.div
              className="text-center mb-12"
              initial={{ y: -80, opacity: 0, scale: 0.75 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
            >
              <motion.div className="inline-flex items-center gap-2.5 border-4 border-black px-5 py-2 mb-6 bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Star size={14} weight="fill" className="text-black" />
                <span className="text-xs font-black uppercase tracking-[0.4em] text-black">
                  Tournament Complete
                </span>
                <Star size={14} weight="fill" className="text-black" />
              </motion.div>

              <h1 className="text-7xl md:text-8xl font-black uppercase leading-none tracking-tight text-black">
                Final
                <br />
                <motion.span
                  className="text-primary inline-block"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Results
                </motion.span>
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {top3.length > 0 && (
          <div className="w-full max-w-2xl mb-12">
            <div className="flex items-end justify-center gap-4 md:gap-8">
              {PODIUM_ORDER.map((placeIdx) => {
                const entry = top3[placeIdx];
                if (!entry)
                  return (
                    <div
                      key={`empty-${placeIdx}`}
                      className="flex-1 max-w-[170px]"
                    />
                  );
                return (
                  <PodiumSlot
                    key={entry.id}
                    entry={entry}
                    placeIdx={placeIdx}
                    visible={visiblePodium.includes(placeIdx)}
                  />
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showRest && rest.length > 0 && (
            <motion.div
              className="w-full max-w-md mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-0.5 bg-black" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Other Results
                </span>
                <div className="flex-1 h-0.5 bg-black" />
              </div>
              <div className="flex flex-col gap-2">
                {rest.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: i * 0.08,
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                    }}
                    className={`flex items-center gap-3 border-4 border-black px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                      entry.isPlayer ? "bg-primary/10" : "bg-white"
                    }`}
                  >
                    <span className="text-xs font-black text-zinc-400 w-6 tabular-nums shrink-0">
                      #{i + 4}
                    </span>
                    <div className={`border-2 border-black shrink-0`}>
                      {entry.characterSvg ? (
                        <CharacterAvatar
                          svgType={entry.characterSvg}
                          color={entry.characterColor}
                          size={44}
                        />
                      ) : (
                        <div className="w-11 h-11 bg-zinc-100 flex items-center justify-center">
                          <Crown
                            size={18}
                            weight="fill"
                            className="text-zinc-400"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-black uppercase truncate ${entry.isPlayer ? "text-primary" : "text-black"}`}
                      >
                        {entry.name}
                      </p>
                      {entry.isPlayer && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">
                          That&apos;s you!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Image
                        src="/Banana.svg"
                        alt="Banana"
                        width={14}
                        height={14}
                      />
                      <span className="text-sm font-black tabular-nums text-black">
                        {entry.bananas}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRest && (
            <motion.div
              className="flex gap-4 mt-2 pb-16"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45 }}
            >
              {onPlayAgain && (
                <motion.button
                  onClick={onPlayAgain}
                  className="border-4 border-black bg-green-400 text-black font-black uppercase tracking-widest px-8 py-4 text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-green-300 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Play Again
                </motion.button>
              )}
              {onExit && (
                <motion.button
                  onClick={onExit}
                  className="border-4 border-black bg-white text-black font-black uppercase tracking-widest px-8 py-4 text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Exit
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
