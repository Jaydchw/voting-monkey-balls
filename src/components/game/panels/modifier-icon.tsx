"use client";

import type { Icon } from "@phosphor-icons/react";
import { motion } from "framer-motion";

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
  const seed = Array.from(`${name}-${variant}`).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const delay = (seed % 8) * 0.08;

  return (
    <motion.span
      title={name}
      className={`inline-flex items-center justify-center h-8 ${
        variant === "weapon" ? "px-1.5" : "w-8"
      }`}
      initial={{ opacity: 0, y: 3 }}
      animate={{
        opacity: 1,
        y: [0, -2, 0],
      }}
      transition={{
        opacity: { duration: 0.2 },
        y: {
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
      }}
    >
      <IconComp
        size={variant === "weapon" ? 16 : 18}
        weight="fill"
        color={QUALITY_COLOR[quality] ?? "#71717a"}
      />
    </motion.span>
  );
}
