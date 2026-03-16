"use client";

import type { InputHTMLAttributes } from "react";

type BlockSliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  valueLabel?: string;
};

export function BlockSlider({
  label,
  valueLabel,
  min = 0,
  max = 100,
  value,
  className = "",
  style,
  ...props
}: BlockSliderProps) {
  const numMin = Number(min);
  const numMax = Number(max);
  const numValue = Number(value ?? 0);
  const pct =
    numMax > numMin ? ((numValue - numMin) / (numMax - numMin)) * 100 : 0;

  return (
    <div className={["flex flex-col gap-2", className].join(" ")}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              {label}
            </span>
          )}
          {valueLabel !== undefined && (
            <span className="text-sm font-black tabular-nums text-black border-2 border-black bg-yellow-300 px-2 py-0.5 min-w-8 text-center">
              {valueLabel}
            </span>
          )}
        </div>
      )}

      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-3 border-4 border-black bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-black transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          value={value}
          style={style}
          className={[
            "absolute inset-x-0 w-full h-3 opacity-0 cursor-pointer",
          ].join(" ")}
          {...props}
        />

        <div
          className="absolute w-5 h-6 border-4 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
