"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from "framer-motion";
import { useMenuAudio } from "@/components/menu-audio-context";

const MenuArenaPreview = dynamic(
  () =>
    import("@/components/game/menu/menu-arena-preview").then((m) => ({
      default: m.MenuArenaPreview,
    })),
  { ssr: false },
);

const NAV_BTN_BASE =
  "w-full py-5 px-6 border-4 border-black font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 text-left flex items-center justify-between group";

const DEV_BTN_BASE =
  "w-full py-3 border-4 border-black font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all";

const DIVIDER_LINE = "flex-1 h-0.5 bg-black";

const COLOR_MAP: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  success: "bg-green-400 text-black hover:bg-green-300",
  ghost: "bg-white text-black border-black hover:bg-zinc-100",
};

const CLAP_TIMES = [0.5, 1.5, 2.5, 3.25, 3.5, 4.5, 5.5, 7.25, 7.5];
const CLAP_WINDOW = 0.08;
const SYLLABLE_TIMES = [2.0, 2.5, 3.0, 3.25, 3.5];
const SYLLABLE_HIT_DURATION = [0.2, 0.2, 0.1, 0.1, 0.4];
const SUBTITLE_BEAT_TIMES = [2.0, 2.5, 3.0, 3.25, 3.5];

const BEAT_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const BEAT_ANIMATE = {
  scale: [1, 1.018, 0.993, 1],
  y: [0, -3, 0.8, 0],
};

const BEAT_IDLE = { scale: 1, y: 0 };

type SwayValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
};

function NavButton({
  href,
  children,
  variant = "primary",
  onActivate,
  clapPulse,
  sway,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "success" | "ghost";
  onActivate?: () => void;
  clapPulse: boolean;
  sway: SwayValues;
}) {
  return (
    <Link href={href} className="w-full" onClick={onActivate}>
      <motion.button
        className={[NAV_BTN_BASE, COLOR_MAP[variant]].join(" ")}
        animate={clapPulse ? BEAT_ANIMATE : BEAT_IDLE}
        transition={BEAT_TRANSITION}
        style={{ x: sway.x, y: sway.y }}
      >
        <span>{children}</span>
        <span className="text-2xl opacity-40 group-hover:opacity-80 transition-opacity">
          →
        </span>
      </motion.button>
    </Link>
  );
}

function Divider({ label, clapPulse }: { label: string; clapPulse: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-3 my-1"
      animate={clapPulse ? { opacity: [0.45, 0.85, 0.45] } : { opacity: 0.45 }}
      transition={BEAT_TRANSITION}
    >
      <div className={DIVIDER_LINE} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">
        {label}
      </span>
      <div className={DIVIDER_LINE} />
    </motion.div>
  );
}

function Syl({
  i,
  active,
  className,
  children,
  isPrimary,
}: {
  i: number;
  active: number;
  className?: string;
  children: string;
  isPrimary?: boolean;
}) {
  const isHit = active === i;
  const baseColor = isPrimary ? "var(--color-primary)" : "#000000";
  const hitColor = "#facc15";

  return (
    <motion.span
      className={`inline-block relative ${className ?? ""}`}
      animate={
        isHit
          ? {
              scale: [1, 1.38, 0.92, 1.22, 0.96, 1.12],
              y: [0, -24, -4, -16, -2, -10],
              color: hitColor,
              textShadow: [
                "0 0 0px transparent",
                "0 0 12px #facc1566",
                "0 0 6px #facc1533",
                "0 0 4px #facc1522",
                "0 0 2px #facc1511",
                "0 0 0px transparent",
              ],
            }
          : {
              scale: 1,
              y: 0,
              color: baseColor,
              textShadow: "0 0 0px transparent",
            }
      }
      transition={
        isHit
          ? {
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
              scale: {
                duration: 0.55,
                times: [0, 0.2, 0.35, 0.5, 0.7, 1],
                ease: "easeOut",
              },
              y: {
                duration: 0.55,
                times: [0, 0.2, 0.35, 0.5, 0.7, 1],
                ease: "easeOut",
              },
            }
          : { duration: 0.4, ease: "easeOut" }
      }
      style={{ display: "inline-block", originX: 0.5, originY: 1 }}
    >
      {isHit && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.3, 0], scale: [0.6, 2.0, 2.4] }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(circle, #facc1533 0%, transparent 70%)",
            borderRadius: "50%",
            left: "-50%",
            top: "-50%",
            width: "200%",
            height: "200%",
          }}
        />
      )}
      {children}
    </motion.span>
  );
}

export default function MainMenu() {
  const { setActive, getLoopInfo } = useMenuAudio();
  const [activeWord, setActiveWord] = useState(-1);
  const [subtitlePulse, setSubtitlePulse] = useState(false);
  const [clapPulse, setClapPulse] = useState(false);
  const rafRef = useRef<number>(0);
  const subtitleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClapRef = useRef(-1);
  const lastSubtitleBeatRef = useRef(-1);

  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const springConfig = { stiffness: 40, damping: 18, mass: 1.2 };
  const mouseX = useSpring(rawMouseX, springConfig);
  const mouseY = useSpring(rawMouseY, springConfig);

  const zeroX = useMotionValue(0);
  const zeroY = useMotionValue(0);

  const badgeSway: SwayValues = {
    x: useTransform(mouseX, [-1, 1], [-3, 3]),
    y: useTransform(mouseY, [-1, 1], [-1.5, 1.5]),
  };
  const titleSway: SwayValues = {
    x: useTransform(mouseX, [-1, 1], [-5, 5]),
    y: useTransform(mouseY, [-1, 1], [-2.5, 2.5]),
  };
  const navSway: SwayValues = {
    x: useTransform(mouseX, [-1, 1], [-4, 4]),
    y: useTransform(mouseY, [-1, 1], [-1.5, 1.5]),
  };
  const arenaSway: SwayValues = {
    x: useTransform(mouseX, [-1, 1], [3, -3]),
    y: useTransform(mouseY, [-1, 1], [1.5, -1.5]),
  };

  const noSway: SwayValues = { x: zeroX, y: zeroY };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      rawMouseX.set((e.clientX / window.innerWidth) * 2 - 1);
      rawMouseY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [rawMouseX, rawMouseY]);

  useEffect(() => {
    setActive(false);
  }, [setActive]);

  useEffect(() => {
    const tick = () => {
      const { loopPosition, isPlaying } = getLoopInfo();

      if (!isPlaying) {
        setActiveWord(-1);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      let next = -1;
      for (let i = 0; i < SYLLABLE_TIMES.length; i++) {
        if (
          loopPosition >= SYLLABLE_TIMES[i] &&
          loopPosition < SYLLABLE_TIMES[i] + SYLLABLE_HIT_DURATION[i]
        ) {
          next = i;
          break;
        }
      }
      setActiveWord((prev) => (prev === next ? prev : next));

      let subtitleBeat = -1;
      for (let i = 0; i < SUBTITLE_BEAT_TIMES.length; i++) {
        if (
          loopPosition >= SUBTITLE_BEAT_TIMES[i] &&
          loopPosition < SUBTITLE_BEAT_TIMES[i] + 0.15
        ) {
          subtitleBeat = i;
          break;
        }
      }
      if (subtitleBeat !== -1 && subtitleBeat !== lastSubtitleBeatRef.current) {
        lastSubtitleBeatRef.current = subtitleBeat;
        setSubtitlePulse(true);
        if (subtitleTimeoutRef.current)
          clearTimeout(subtitleTimeoutRef.current);
        subtitleTimeoutRef.current = setTimeout(
          () => setSubtitlePulse(false),
          150,
        );
      } else if (subtitleBeat === -1) {
        lastSubtitleBeatRef.current = -1;
      }

      let clapBeat = -1;
      for (let i = 0; i < CLAP_TIMES.length; i++) {
        if (
          loopPosition >= CLAP_TIMES[i] &&
          loopPosition < CLAP_TIMES[i] + CLAP_WINDOW
        ) {
          clapBeat = i;
          break;
        }
      }
      if (clapBeat !== -1 && clapBeat !== lastClapRef.current) {
        lastClapRef.current = clapBeat;
        setClapPulse(true);
        if (clapTimeoutRef.current) clearTimeout(clapTimeoutRef.current);
        clapTimeoutRef.current = setTimeout(() => setClapPulse(false), 150);
      } else if (clapBeat === -1) {
        lastClapRef.current = -1;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
      if (clapTimeoutRef.current) clearTimeout(clapTimeoutRef.current);
    };
  }, [getLoopInfo]);

  const handleActivate = () => setActive(true);

  return (
    <div className="w-screen min-h-screen bg-white text-black font-sans overflow-x-hidden">
      <div className="max-w-350 mx-auto min-h-screen grid grid-cols-1 xl:grid-cols-[520px_1fr] gap-0">
        <div className="flex flex-col justify-center px-8 md:px-16 py-16 xl:py-0 xl:border-r-4 xl:border-black">
          <div className="mb-10">
            <motion.div
              className="inline-block border-4 border-black px-3 py-1 mb-4 bg-yellow-300"
              style={{ x: badgeSway.x, y: badgeSway.y }}
              animate={clapPulse ? BEAT_ANIMATE : BEAT_IDLE}
              transition={BEAT_TRANSITION}
            >
              <span className="text-xs font-black uppercase tracking-[0.3em]">
                Three Thing Game
              </span>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-6xl font-black uppercase leading-none tracking-tight mb-3 select-none"
              style={{ x: titleSway.x, y: titleSway.y }}
            >
              <span className="inline-flex gap-[0.02em]">
                <Syl i={0} active={activeWord}>
                  Vo
                </Syl>
                <Syl i={1} active={activeWord}>
                  ting
                </Syl>
              </span>
              <br />
              <span className="inline-flex gap-[0.02em]">
                <Syl i={2} active={activeWord} isPrimary>
                  Mon
                </Syl>
                <Syl i={3} active={activeWord} isPrimary>
                  key
                </Syl>
              </span>
              <br />
              <Syl i={4} active={activeWord}>
                Balls
              </Syl>
            </motion.h1>

            <motion.p
              className="text-sm font-bold text-zinc-500 uppercase tracking-widest"
              style={{ x: badgeSway.x, y: badgeSway.y }}
              animate={
                subtitlePulse
                  ? { opacity: 1, letterSpacing: "0.15em" }
                  : { opacity: 0.6, letterSpacing: "0.2em" }
              }
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              Voting · Monkey · Balls
            </motion.p>
          </div>

          <motion.div
            className="flex flex-col gap-3 w-full max-w-sm"
            style={{ x: navSway.x, y: navSway.y }}
          >
            <NavButton
              href="/host"
              variant="primary"
              onActivate={handleActivate}
              clapPulse={clapPulse}
              sway={noSway}
            >
              Host Game
            </NavButton>
            <NavButton
              href="/join"
              variant="danger"
              onActivate={handleActivate}
              clapPulse={clapPulse}
              sway={noSway}
            >
              Join Game
            </NavButton>

            <Divider label="Freeplay" clapPulse={clapPulse} />

            <NavButton
              href="/singleplayer"
              variant="success"
              onActivate={handleActivate}
              clapPulse={clapPulse}
              sway={noSway}
            >
              Singleplayer
            </NavButton>
            <NavButton
              href="/bots"
              variant="ghost"
              onActivate={handleActivate}
              clapPulse={clapPulse}
              sway={noSway}
            >
              Watch Bots
            </NavButton>

            <Divider label="Dev" clapPulse={clapPulse} />

            <motion.div
              className="grid grid-cols-3 gap-2"
              animate={clapPulse ? BEAT_ANIMATE : BEAT_IDLE}
              transition={BEAT_TRANSITION}
            >
              <Link href="/test">
                <button
                  className={[
                    DEV_BTN_BASE,
                    "bg-cyan-300 text-black hover:bg-cyan-200",
                  ].join(" ")}
                >
                  Test
                </button>
              </Link>
              <Link href="/cards">
                <button
                  className={[
                    DEV_BTN_BASE,
                    "bg-pink-300 text-black hover:bg-pink-200",
                  ].join(" ")}
                >
                  Cards
                </button>
              </Link>
              <Link href="/audio-test">
                <button
                  className={[
                    DEV_BTN_BASE,
                    "bg-yellow-300 text-black hover:bg-yellow-200",
                  ].join(" ")}
                >
                  Audio
                </button>
              </Link>
            </motion.div>

            <motion.div
              animate={clapPulse ? BEAT_ANIMATE : BEAT_IDLE}
              transition={BEAT_TRANSITION}
            >
              <Link href="/character-test">
                <button
                  className={[
                    DEV_BTN_BASE,
                    "bg-orange-300 text-black hover:bg-orange-200",
                  ].join(" ")}
                >
                  Character Select
                </button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            className="mt-10 text-xs font-bold text-zinc-400 uppercase tracking-wide"
            style={{ x: badgeSway.x }}
            animate={
              clapPulse ? { opacity: [0.4, 0.6, 0.4] } : { opacity: 0.4 }
            }
            transition={BEAT_TRANSITION}
          >
            By Jayden Holdsworth &amp; Archie Hull
          </motion.p>
        </div>

        <div className="hidden xl:flex flex-col items-center justify-center px-16 bg-zinc-50">
          <motion.div
            style={{ width: 664, x: arenaSway.x, y: arenaSway.y }}
            animate={clapPulse ? BEAT_ANIMATE : BEAT_IDLE}
            transition={BEAT_TRANSITION}
          >
            <MenuArenaPreview />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
