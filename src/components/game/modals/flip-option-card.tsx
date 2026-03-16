"use client";

import type { ReactNode } from "react";

type FlipOptionCardProps = {
  index: number;
  revealed: boolean;
  disabled?: boolean;
  onPick: () => void;
  back: ReactNode;
  front: ReactNode;
};

export function FlipOptionCard({
  index,
  revealed,
  disabled,
  onPick,
  back,
  front,
}: FlipOptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
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
        {back}
        {front}
      </div>
    </button>
  );
}
