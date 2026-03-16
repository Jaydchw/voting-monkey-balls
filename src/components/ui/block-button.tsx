"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type BlockButtonVariant =
  | "primary"
  | "danger"
  | "success"
  | "warning"
  | "ghost"
  | "muted"
  | "cyan"
  | "pink"
  | "orange";

type BlockButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANT_CLASSES: Record<BlockButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  success: "bg-green-400 text-black hover:bg-green-300",
  warning: "bg-yellow-300 text-black hover:bg-yellow-200",
  ghost: "bg-white text-black hover:bg-zinc-100",
  muted: "bg-zinc-100 text-black hover:bg-zinc-200",
  cyan: "bg-cyan-300 text-black hover:bg-cyan-200",
  pink: "bg-pink-300 text-black hover:bg-pink-200",
  orange: "bg-orange-300 text-black hover:bg-orange-200",
};

const SIZE_CLASSES: Record<BlockButtonSize, string> = {
  sm: "py-2 px-3 text-xs",
  md: "py-3 px-4 text-sm",
  lg: "py-4 px-5 text-base",
  xl: "py-5 px-6 text-lg",
};

const SHADOW_CLASSES: Record<BlockButtonSize, string> = {
  sm: "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
  md: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
  lg: "shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
  xl: "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
};

type BlockButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BlockButtonVariant;
  size?: BlockButtonSize;
  children: ReactNode;
  fullWidth?: boolean;
};

export function BlockButton({
  variant = "ghost",
  size = "md",
  children,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: BlockButtonProps) {
  return (
    <button
      disabled={disabled}
      className={[
        "border-4 border-black font-black uppercase tracking-widest transition-all duration-100",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        disabled ? "" : SHADOW_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
