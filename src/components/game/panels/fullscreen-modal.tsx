"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type FullscreenModalProps = {
  open: boolean;
  children: ReactNode;
  maxWidthClassName?: string;
  zIndexClassName?: string;
  overlayClassName?: string;
  panelClassName?: string;
  onBackdropClick?: () => void;
};

export function FullscreenModal({
  open,
  children,
  maxWidthClassName = "max-w-4xl",
  zIndexClassName = "z-50",
  overlayClassName = "bg-zinc-100/95",
  panelClassName,
  onBackdropClick,
}: FullscreenModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} ${overlayClassName} overflow-y-auto flex items-center justify-center p-0 sm:p-4`}
      onClick={onBackdropClick}
    >
      <div
        className={`w-full min-h-full sm:min-h-0 ${maxWidthClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Card
          className={`w-full min-h-full sm:min-h-0 rounded-none border-0 shadow-none bg-white sm:border-4 sm:border-black ${
            panelClassName ?? ""
          }`}
        >
          {children}
        </Card>
      </div>
    </div>
  );
}
