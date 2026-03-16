"use client";

import type { ReactNode } from "react";

type BadgeColor =
  | "yellow"
  | "primary"
  | "danger"
  | "success"
  | "cyan"
  | "pink"
  | "orange"
  | "black";

const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  yellow: "bg-yellow-300 text-black",
  primary: "bg-primary text-primary-foreground",
  danger: "bg-destructive text-destructive-foreground",
  success: "bg-green-400 text-black",
  cyan: "bg-cyan-300 text-black",
  pink: "bg-pink-300 text-black",
  orange: "bg-orange-300 text-black",
  black: "bg-black text-white",
};

type SectionBadgeProps = {
  children: ReactNode;
  color?: BadgeColor;
};

export function SectionBadge({
  children,
  color = "yellow",
}: SectionBadgeProps) {
  return (
    <div
      className={[
        "inline-block border-4 border-black px-3 py-1",
        BADGE_COLOR_CLASSES[color],
      ].join(" ")}
    >
      <span className="text-xs font-black uppercase tracking-[0.3em]">
        {children}
      </span>
    </div>
  );
}

type PageHeaderProps = {
  badge?: ReactNode;
  badgeColor?: BadgeColor;
  title: ReactNode;
  subtitle?: string;
  className?: string;
};

export function PageHeader({
  badge,
  badgeColor = "yellow",
  title,
  subtitle,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={["mb-8", className].join(" ")}>
      {badge && (
        <div className="mb-3">
          <SectionBadge color={badgeColor}>{badge}</SectionBadge>
        </div>
      )}
      <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm font-bold text-zinc-500 uppercase tracking-widest">
          {subtitle}
        </p>
      )}
    </div>
  );
}

type BackLinkProps = {
  href: string;
  label?: string;
};

export function BackLink({ href, label = "Back" }: BackLinkProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
    >
      <span className="text-lg">←</span>
      <span>{label}</span>
    </a>
  );
}

type DividerProps = {
  label?: string;
};

export function BlockDivider({ label }: DividerProps) {
  if (!label) {
    return <div className="h-0.5 bg-black my-2" />;
  }
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-0.5 bg-black" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">
        {label}
      </span>
      <div className="flex-1 h-0.5 bg-black" />
    </div>
  );
}
