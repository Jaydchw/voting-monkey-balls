"use client";

import type { Icon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ModifierIcon } from "./modifier-icon";

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
  if (modifiers.length === 0) {
    return { background: `linear-gradient(to right, ${from}, ${to})` };
  }
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
  const label = ballId === "red" ? "Red" : "Blue";
  const ringClass = getRingClass(modifiers);
  const indicatorStyle = getIndicatorStyle(ballId, modifiers);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <Badge
          className={`text-2xl px-4 py-3.5 leading-none border-4 border-black rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] uppercase font-black tracking-widest ${
            ballId === "red"
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {label}
        </Badge>
        <span className="text-xl font-black uppercase">
          {Math.round(health)} HP
        </span>
      </div>

      <Progress
        value={health}
        className={`h-10 border-4 border-black rounded-none bg-zinc-100 shadow-[4px_4px_0_0_rgba(0,0,0,1)] **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200 ${ringClass}`}
        indicatorStyle={indicatorStyle}
      />

      <div className="flex gap-1 flex-wrap min-h-8">
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
    </div>
  );
}
