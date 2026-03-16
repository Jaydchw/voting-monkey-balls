"use client";

import type { ReactNode } from "react";

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
  overlayClassName = "bg-white",
  panelClassName,
  onBackdropClick,
}: FullscreenModalProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} ${overlayClassName} overflow-y-auto flex items-center justify-center p-0 sm:p-4`}
      onClick={onBackdropClick}
    >
      <div
        className={`w-full min-h-full sm:min-h-0 ${maxWidthClassName} ${panelClassName ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
