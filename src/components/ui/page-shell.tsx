"use client";

import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div
      className={[
        "w-screen min-h-screen bg-white text-black font-sans",
        className,
      ]
        .join(" ")
        .trim()}
    >
      {children}
    </div>
  );
}
