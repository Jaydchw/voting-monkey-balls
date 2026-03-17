"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Shield, Sword } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ModifierIcon } from "@/components/game/hud/modifier-icon";

export type ActiveModifier = {
  name: string;
  icon: Icon;
  quality: number;
};

const MODIFIER_RING_CLASS: Record<string, string> = {
  Armored: "ring-4 ring-yellow-400",
  Regen: "ring-4 ring-green-400",
  Berserker: "ring-4 ring-orange-500",
  Overcharge: "ring-4 ring-yellow-300",
  Leech: "ring-4 ring-red-400",
  Magnetic: "ring-4 ring-cyan-400",
  "Growth Hormones": "ring-4 ring-lime-400",
  Baby: "ring-4 ring-pink-300",
  Mitosis: "ring-4 ring-purple-400",
  Snake: "ring-4 ring-violet-400",
  Spikes: "ring-4 ring-zinc-400",
  "Twin Hearts": "ring-4 ring-rose-400",
  "Rapid Fire": "ring-4 ring-sky-400",
  "Stunning Strikes": "ring-4 ring-cyan-500",
  "Caustic Payload": "ring-4 ring-emerald-500",
  "Projectile Deflector": "ring-4 ring-teal-400",
  "Artillery Specialist": "ring-4 ring-amber-400",
  "Duelist Specialist": "ring-4 ring-fuchsia-400",
  "Lucky Evade": "ring-4 ring-indigo-400",
  "Phase Shift": "ring-4 ring-cyan-300",
};

const MODIFIER_HEX_COLOR: Record<string, string> = {
  Armored: "#facc15",
  Regen: "#4ade80",
  Berserker: "#f97316",
  Overcharge: "#fde047",
  Leech: "#f87171",
  Magnetic: "#22d3ee",
  "Growth Hormones": "#a3e635",
  Baby: "#f9a8d4",
  Mitosis: "#c084fc",
  Snake: "#a78bfa",
  Spikes: "#a1a1aa",
  "Twin Hearts": "#fb7185",
  "Rapid Fire": "#38bdf8",
  "Stunning Strikes": "#06b6d4",
  "Caustic Payload": "#34d399",
  "Projectile Deflector": "#14b8a6",
  "Artillery Specialist": "#f59e0b",
  "Duelist Specialist": "#d946ef",
  "Lucky Evade": "#6366f1",
  "Phase Shift": "#22d3ee",
};

const BALL_BASE: Record<"red" | "blue", [string, string]> = {
  red: ["#b91c1c", "#ef4444"],
  blue: ["#1d4ed8", "#3b82f6"],
};

function getRingClass(modifiers: ActiveModifier[]): string {
  if (modifiers.length === 0) return "";
  const best = [...modifiers].sort((a, b) => b.quality - a.quality)[0];
  return MODIFIER_RING_CLASS[best.name] ?? "";
}

function getIndicatorStyle(
  ballId: "red" | "blue",
  modifiers: ActiveModifier[],
): React.CSSProperties {
  const [from, to] = BALL_BASE[ballId];
  if (modifiers.length === 0)
    return { background: `linear-gradient(to right, ${from}, ${to})` };
  const modColors = [
    ...new Set(
      modifiers
        .map((m) => MODIFIER_HEX_COLOR[m.name])
        .filter((c): c is string => Boolean(c)),
    ),
  ];
  return {
    background: `linear-gradient(to right, ${[from, ...modColors].join(", ")})`,
  };
}

type DamagePopup = {
  id: number;
  amount: number;
  x: number;
};

type BattleBarProps = {
  ballId: "red" | "blue";
  health: number;
  modifiers?: ActiveModifier[];
  weapons?: ActiveModifier[];
};

export function BattleBar({
  ballId,
  health,
  modifiers = [],
  weapons = [],
}: BattleBarProps) {
  const prevHealthRef = useRef(health);
  const [damageTick, setDamageTick] = useState(0);
  const [damageDelta, setDamageDelta] = useState(0);
  const [isHealing, setIsHealing] = useState(false);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const popupIdRef = useRef(0);
  const healTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevHealthRef.current;
    const diff = prev - health;

    if (diff > 0) {
      setDamageDelta(diff);
      setDamageTick((v) => v + 1);

      popupIdRef.current += 1;
      const id = popupIdRef.current;
      const x = 15 + Math.random() * 55;
      setDamagePopups((p) => [
        ...p.slice(-4),
        { id, amount: Math.round(diff), x },
      ]);
      const timeout = setTimeout(() => {
        setDamagePopups((p) => p.filter((popup) => popup.id !== id));
      }, 1000);
      return () => clearTimeout(timeout);
    }

    if (diff < 0) {
      if (healTimeoutRef.current) clearTimeout(healTimeoutRef.current);
      setIsHealing(true);
      healTimeoutRef.current = setTimeout(() => setIsHealing(false), 700);
    }

    prevHealthRef.current = health;
  }, [health]);

  useEffect(() => {
    prevHealthRef.current = health;
  }, []);

  const label = ballId === "red" ? "Red" : "Blue";
  const ringClass = getRingClass(modifiers);
  const indicatorStyle = getIndicatorStyle(ballId, modifiers);
  const isCritical = health > 0 && health <= 25;
  const isDying = health > 0 && health <= 10;
  const isDead = health <= 0;
  const showHeavyDamage = damageDelta >= 10;
  const showMassiveDamage = damageDelta >= 20;
  const ballColor = ballId === "red" ? "#ef4444" : "#3b82f6";

  const shakeKeyframes = showMassiveDamage
    ? [0, -14, 14, -10, 10, -7, 7, -4, 4, -2, 2, 0]
    : showHeavyDamage
      ? [0, -8, 8, -5, 5, -3, 3, 0]
      : [0, -3, 3, -2, 2, 0];

  const shakeDuration = showMassiveDamage
    ? 0.55
    : showHeavyDamage
      ? 0.38
      : 0.22;

  const barTransition =
    damageDelta >= 20
      ? "width 0.08s cubic-bezier(0.1, 0.9, 0.2, 1)"
      : damageDelta >= 10
        ? "width 0.18s ease-out"
        : damageDelta > 0
          ? "width 0.28s ease-out"
          : "width 0.5s ease-out";

  return (
    <div className="flex flex-col gap-2 w-full relative">
      <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
        <AnimatePresence>
          {damagePopups.map((popup) => (
            <motion.div
              key={popup.id}
              className="absolute font-black select-none pointer-events-none"
              style={{
                left: `${popup.x}%`,
                top: "2px",
                fontSize:
                  popup.amount >= 20
                    ? "1.6rem"
                    : popup.amount >= 10
                      ? "1.2rem"
                      : "0.95rem",
                color:
                  popup.amount >= 20
                    ? "#fbbf24"
                    : popup.amount >= 10
                      ? "#f87171"
                      : "#fca5a5",
                textShadow:
                  "0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)",
                lineHeight: 1,
                zIndex: 30,
              }}
              initial={{
                opacity: 1,
                y: 0,
                scale: popup.amount >= 15 ? 1.5 : 1,
              }}
              animate={{ opacity: 0, y: -58, scale: 0.6 }}
              exit={{}}
              transition={{ duration: 0.95, ease: "easeOut" }}
            >
              -{popup.amount}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        key={`shake-${damageTick}`}
        animate={{ x: damageTick > 0 ? shakeKeyframes : 0 }}
        transition={{ duration: shakeDuration, ease: "easeOut" }}
        className="flex flex-col gap-2 w-full"
      >
        <div className="flex items-center justify-between">
          <motion.div
            animate={
              isDead
                ? { opacity: [1, 0.3, 1], scale: [1, 0.9, 1] }
                : isDying
                  ? { scale: [1, 1.07, 1] }
                  : { scale: 1, opacity: 1 }
            }
            transition={
              isDead
                ? { duration: 0.85, repeat: Infinity }
                : isDying
                  ? { duration: 0.42, repeat: Infinity }
                  : {}
            }
          >
            <Badge
              className={`text-xl px-3 py-2 leading-none border-0 rounded-none shadow-none uppercase font-black tracking-widest inline-flex items-center gap-1.5 ${
                ballId === "red"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <Shield size={16} weight="fill" />
              {label}
            </Badge>
          </motion.div>

          <motion.span
            key={`hp-${damageTick}-${isHealing ? "heal" : "dmg"}`}
            className="text-xl font-black uppercase inline-flex items-center gap-1.5 tabular-nums"
            initial={
              damageTick > 0
                ? {
                    scale: 1.3,
                    color: showMassiveDamage ? "#fbbf24" : ballColor,
                  }
                : { scale: 1 }
            }
            animate={{ scale: 1, color: isDying ? ballColor : "#000000" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <motion.span
              animate={
                isHealing
                  ? { rotate: [-15, 15, -10, 10, 0], scale: [1, 1.4, 1] }
                  : isCritical
                    ? { scale: [1, 1.25, 1] }
                    : {}
              }
              transition={
                isHealing
                  ? { duration: 0.4 }
                  : isCritical
                    ? { duration: 0.48, repeat: Infinity }
                    : {}
              }
            >
              <Heart
                size={17}
                weight="fill"
                className={ballId === "red" ? "text-red-600" : "text-blue-600"}
              />
            </motion.span>
            {Math.round(health)} HP
          </motion.span>
        </div>

        <div className="relative">
          <motion.div
            key={`bar-glow-${damageTick}`}
            animate={
              showMassiveDamage
                ? {
                    boxShadow: [
                      `0 0 0px ${ballColor}00`,
                      `0 0 28px ${ballColor}dd`,
                      `0 0 14px ${ballColor}88`,
                      `0 0 0px ${ballColor}00`,
                    ],
                  }
                : showHeavyDamage
                  ? {
                      boxShadow: [
                        `0 0 0px ${ballColor}00`,
                        `0 0 14px ${ballColor}99`,
                        `0 0 0px ${ballColor}00`,
                      ],
                    }
                  : isHealing
                    ? {
                        boxShadow: [
                          "0 0 0px #22c55e00",
                          "0 0 18px #22c55eaa",
                          "0 0 0px #22c55e00",
                        ],
                      }
                    : isDying
                      ? {
                          boxShadow: [
                            `0 0 6px ${ballColor}44`,
                            `0 0 18px ${ballColor}99`,
                            `0 0 6px ${ballColor}44`,
                          ],
                        }
                      : { boxShadow: "none" }
            }
            transition={
              isDying && !showHeavyDamage
                ? { duration: 0.65, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.45 }
            }
          >
            <Progress
              value={health}
              className={`h-10 border-0 rounded-none bg-zinc-100 shadow-none **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200 ${ringClass}`}
              indicatorStyle={{
                ...indicatorStyle,
                transition: barTransition,
              }}
            />
          </motion.div>

          <AnimatePresence>
            {showHeavyDamage && (
              <motion.div
                key={`flash-${damageTick}`}
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: showMassiveDamage ? 0.7 : 0.45 }}
                animate={{ opacity: 0 }}
                exit={{}}
                transition={{ duration: showMassiveDamage ? 0.28 : 0.18 }}
                style={{ background: "white", mixBlendMode: "overlay" }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isCritical && !isDead && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.22, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  background: `linear-gradient(to right, ${ballColor}66, transparent 60%)`,
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isHealing && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.35, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                style={{
                  background:
                    "linear-gradient(to right, #22c55e66, transparent 60%)",
                }}
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showHeavyDamage && (
            <motion.div
              key={`burst-${damageTick}`}
              className="absolute pointer-events-none"
              style={{ top: "40px", left: 0, right: 0, height: "40px" }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.5 }}
            >
              {Array.from({ length: showMassiveDamage ? 10 : 6 }).map(
                (_, i) => {
                  const total = showMassiveDamage ? 10 : 6;
                  const spread = showMassiveDamage ? 28 : 18;
                  return (
                    <motion.span
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        top: "50%",
                        left: "50%",
                        width: showMassiveDamage ? "10px" : "7px",
                        height: showMassiveDamage ? "10px" : "7px",
                        backgroundColor: showMassiveDamage
                          ? "#fbbf24"
                          : ballColor,
                      }}
                      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                      animate={{
                        x: (i - total / 2) * spread,
                        y: -18 - Math.abs(i - total / 2) * 6,
                        scale: 0,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.48, ease: "easeOut" }}
                    />
                  );
                },
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-1 flex-wrap min-h-8">
          {modifiers.length > 0 && (
            <span className="inline-flex items-center mr-1 text-zinc-600">
              <Heart size={14} weight="fill" />
            </span>
          )}
          {modifiers.map((mod, i) => (
            <ModifierIcon
              key={i}
              name={mod.name}
              icon={mod.icon}
              quality={mod.quality}
              variant="modifier"
            />
          ))}
        </div>

        <div className="flex gap-1 flex-wrap min-h-8">
          {weapons.length > 0 && (
            <span className="inline-flex items-center mr-1 text-zinc-600">
              <Sword size={14} weight="fill" />
            </span>
          )}
          {weapons.map((weapon, i) => (
            <ModifierIcon
              key={`${weapon.name}-${i}`}
              name={weapon.name}
              icon={weapon.icon}
              quality={weapon.quality}
              variant="weapon"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
