"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type ModalSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function ModalSurface({ children, className = "" }: ModalSurfaceProps) {
  return (
    <Card
      className={`mx-auto w-full rounded-2xl bg-white border-0 shadow-none ${className}`}
    >
      {children}
    </Card>
  );
}
