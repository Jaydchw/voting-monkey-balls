"use client";

import type { HTMLAttributes, ReactNode } from "react";

type BlockCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  shadow?: "sm" | "md" | "lg" | "none";
  tinted?: boolean;
};

const SHADOW_CLASSES = {
  none: "",
  sm: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
  md: "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
  lg: "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
};

export function BlockCard({
  children,
  shadow = "md",
  tinted = false,
  className = "",
  ...props
}: BlockCardProps) {
  return (
    <div
      className={[
        "border-4 border-black",
        tinted ? "bg-zinc-50" : "bg-white",
        SHADOW_CLASSES[shadow],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
