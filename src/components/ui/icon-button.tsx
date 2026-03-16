"use client";

import type { InputHTMLAttributes } from "react";

type BlockSliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  valueLabel?: string;
};

export function BlockSlider({
  label,
  valueLabel,
  className = "",
  ...props
}: BlockSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      {(label || valueLabel) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              {label}
            </span>
          )}
          {valueLabel && (
            <span className="text-sm font-black tabular-nums text-black">
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        className={["w-full accent-black", className].join(" ")}
        {...props}
      />
    </div>
  );
}
