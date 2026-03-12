"use client";

type TimerDisplayProps = {
  seconds: number;
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function TimerDisplay({ seconds }: TimerDisplayProps) {
  return (
    <div className="w-44 border-4 border-black bg-yellow-300 py-2 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <span className="inline-block w-full text-3xl font-black tabular-nums tracking-wide">
        {formatTimer(seconds)}
      </span>
    </div>
  );
}
