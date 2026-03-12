"use client";

import { BattleBar, type ActiveModifier } from "./battle-bar";

type HealthBarsProps = {
  redHealth: number;
  blueHealth: number;
  redModifiers?: ActiveModifier[];
  blueModifiers?: ActiveModifier[];
  redWeapons?: ActiveModifier[];
  blueWeapons?: ActiveModifier[];
};

export function HealthBars({
  redHealth,
  blueHealth,
  redModifiers = [],
  blueModifiers = [],
  redWeapons = [],
  blueWeapons = [],
}: HealthBarsProps) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-4 mb-5">
      <BattleBar
        ballId="red"
        health={redHealth}
        modifiers={redModifiers}
        weapons={redWeapons}
      />

      <div className="text-4xl font-black text-center self-center pt-2">VS</div>

      <BattleBar
        ballId="blue"
        health={blueHealth}
        modifiers={blueModifiers}
        weapons={blueWeapons}
      />
    </div>
  );
}
