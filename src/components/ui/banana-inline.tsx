"use client";

import type { ReactNode } from "react";
import Image from "next/image";

type BananaInlineProps = {
  children: ReactNode;
  className?: string;
  iconSize?: number;
};

export function BananaInline({
  children,
  className,
  iconSize = 14,
}: BananaInlineProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-yellow-600",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <Image
        src="/Banana.svg"
        alt="Banana"
        width={iconSize}
        height={iconSize}
        className="h-auto w-[1em]"
      />
      {children}
    </span>
  );
}
