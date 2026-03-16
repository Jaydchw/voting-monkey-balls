"use client";

import type { InputHTMLAttributes } from "react";

type BlockInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
  hint?: string;
  centered?: boolean;
};

export function BlockInput({
  label,
  error,
  hint,
  centered = false,
  className = "",
  ...props
}: BlockInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
          {label}
        </label>
      )}
      <input
        className={[
          "w-full p-4 border-4 border-black bg-white text-xl font-black",
          "outline-none focus:ring-4 focus:ring-primary/30 transition-all",
          centered ? "text-center tracking-[0.2em]" : "",
          error ? "border-red-500" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && (
        <p className="text-xs font-black uppercase tracking-wide text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
          {hint}
        </p>
      )}
    </div>
  );
}
