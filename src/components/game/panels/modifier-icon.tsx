"use client";

import type { Icon } from "@phosphor-icons/react";

const QUALITY_COLOR: Record<number, string> = {
  1: "#71717a",
  2: "#3b82f6",
  3: "#a855f7",
  4: "#f59e0b",
  5: "#ef4444",
};

type ModifierIconProps = {
  name: string;
  icon: Icon;
  quality: number;
  variant?: "modifier" | "weapon";
};

export function ModifierIcon({
  name,
  icon: IconComp,
  quality,
  variant = "modifier",
}: ModifierIconProps) {
  return (
    <span
      title={name}
      className={`inline-flex items-center justify-center h-8 border-2 border-black ${
        variant === "weapon" ? "px-2 bg-amber-100" : "w-8 bg-white"
      }`}
    >
      <IconComp
        size={variant === "weapon" ? 16 : 18}
        weight="bold"
        color={QUALITY_COLOR[quality] ?? "#71717a"}
      />
    </span>
  );
}
