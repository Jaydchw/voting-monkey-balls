"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Bet = { side: "red" | "blue"; stake: number };

type BetResult = { won: boolean; pnl: number };

type MainBetUI = {
  open: boolean;
  countdown: number;
  selectedSide: "red" | "blue";
  selectedStake: number;
  maxStake: number;
  currentBet: Bet | null;
  result: BetResult | null;
  onSelectSide: (s: "red" | "blue") => void;
  onSetStake: (n: number) => void;
  onPlace: () => void;
  onSkip: () => void;
};

type MicrobetUI = {
  open: boolean;
  countdown: number;
  selectedSide: "red" | "blue";
  selectedStake: number;
  maxStake: number;
  active: Bet | null;
  result: BetResult | null;
  onSelectSide: (s: "red" | "blue") => void;
  onSetStake: (n: number) => void;
  onPlace: () => void;
  onSkip: () => void;
};

export type PlayerPanelProps = {
  bananas: number;
  mainBet: MainBetUI;
  microbet: MicrobetUI;
};

function SideToggle({
  selected,
  onChange,
}: {
  selected: "red" | "blue";
  onChange: (s: "red" | "blue") => void;
}) {
  return (
    <div className="flex gap-0">
      <button
        className={`flex-1 py-2 border-4 border-black font-black uppercase text-sm transition-colors ${
          selected === "red"
            ? "bg-red-500 text-white border-red-800"
            : "bg-white text-black hover:bg-red-50"
        }`}
        onClick={() => onChange("red")}
      >
        Red
      </button>
      <button
        className={`flex-1 py-2 border-4 border-l-2 border-black font-black uppercase text-sm transition-colors ${
          selected === "blue"
            ? "bg-blue-500 text-white border-blue-800"
            : "bg-white text-black hover:bg-blue-50"
        }`}
        onClick={() => onChange("blue")}
      >
        Blue
      </button>
    </div>
  );
}

function StakeControl({
  stake,
  max,
  step = 5,
  onChange,
}: {
  stake: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-0">
      <button
        className="w-10 h-10 border-4 border-black font-black text-xl flex items-center justify-center hover:bg-zinc-100"
        onClick={() => onChange(Math.max(1, stake - step))}
      >
        −
      </button>
      <span className="flex-1 text-center font-black text-lg border-y-4 border-black py-1">
        {stake}b
      </span>
      <button
        className="w-10 h-10 border-4 border-black font-black text-xl flex items-center justify-center hover:bg-zinc-100"
        onClick={() => onChange(Math.min(max, stake + step))}
      >
        +
      </button>
    </div>
  );
}

export function PlayerPanel({ bananas, mainBet, microbet }: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Balance */}
      <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-yellow-300">
        <p className="text-xs font-black uppercase tracking-widest mb-1">
          Your Bananas
        </p>
        <p className="text-4xl font-black tabular-nums">{bananas} 🍌</p>
      </Card>

      {/* Main bet */}
      <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
        <h2 className="text-sm font-black uppercase tracking-widest mb-3">
          Main Bet
        </h2>

        {mainBet.open && (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase text-orange-600 border-2 border-orange-400 bg-orange-50 px-2 py-1">
              Window closes in {mainBet.countdown}s
            </p>
            <SideToggle
              selected={mainBet.selectedSide}
              onChange={mainBet.onSelectSide}
            />
            <StakeControl
              stake={mainBet.selectedStake}
              max={mainBet.maxStake}
              onChange={mainBet.onSetStake}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 border-4 border-black rounded-none font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                onClick={mainBet.onPlace}
                disabled={bananas < mainBet.selectedStake || bananas === 0}
              >
                Place Bet
              </Button>
              <Button
                variant="secondary"
                className="border-4 border-black rounded-none font-black uppercase"
                onClick={mainBet.onSkip}
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        {!mainBet.open && mainBet.result && (
          <div
            className={`border-4 border-black p-3 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${
              mainBet.result.won ? "bg-green-300" : "bg-red-200"
            }`}
          >
            <p className="font-black uppercase text-xl">
              {mainBet.result.won
                ? `WIN +${mainBet.result.pnl}b 🎉`
                : `LOSS −${Math.abs(mainBet.result.pnl)}b`}
            </p>
          </div>
        )}

        {!mainBet.open && !mainBet.result && mainBet.currentBet && (
          <div
            className={`border-4 border-black p-3 ${
              mainBet.currentBet.side === "red" ? "bg-red-100" : "bg-blue-100"
            }`}
          >
            <p className="text-xs font-black uppercase text-zinc-500 mb-1">
              Active Bet
            </p>
            <p className="font-black uppercase text-lg">
              {mainBet.currentBet.side.toUpperCase()} —{" "}
              {mainBet.currentBet.stake}b
            </p>
          </div>
        )}

        {!mainBet.open && !mainBet.result && !mainBet.currentBet && (
          <p className="text-xs text-zinc-400 italic">No bet this round.</p>
        )}
      </Card>

      {/* Microbet */}
      <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
        <h2 className="text-sm font-black uppercase tracking-widest mb-1">
          Microbet
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          Which side deals more damage next interval?
        </p>

        {microbet.open && (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase text-purple-600 border-2 border-purple-400 bg-purple-50 px-2 py-1">
              Open for {microbet.countdown}s
            </p>
            <SideToggle
              selected={microbet.selectedSide}
              onChange={microbet.onSelectSide}
            />
            <StakeControl
              stake={microbet.selectedStake}
              max={Math.min(microbet.maxStake, 10)}
              step={1}
              onChange={microbet.onSetStake}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 border-4 border-black rounded-none font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                onClick={microbet.onPlace}
                disabled={bananas < microbet.selectedStake || bananas === 0}
              >
                Bet
              </Button>
              <Button
                variant="secondary"
                className="border-4 border-black rounded-none font-black uppercase"
                onClick={microbet.onSkip}
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        {!microbet.open && microbet.result && (
          <div
            className={`border-2 border-black p-2 text-center ${
              microbet.result.won ? "bg-green-200" : "bg-red-100"
            }`}
          >
            <p className="font-black text-sm uppercase">
              {microbet.result.won
                ? `WIN +${microbet.result.pnl}b`
                : `LOSS −${Math.abs(microbet.result.pnl)}b`}
            </p>
          </div>
        )}

        {!microbet.open && !microbet.result && microbet.active && (
          <div
            className={`border-2 border-black p-2 ${
              microbet.active.side === "red" ? "bg-red-100" : "bg-blue-100"
            }`}
          >
            <p className="text-xs font-black uppercase">
              Betting {microbet.active.side.toUpperCase()} —{" "}
              {microbet.active.stake}b
            </p>
          </div>
        )}

        {!microbet.open && !microbet.result && !microbet.active && (
          <p className="text-xs text-zinc-400 italic">
            Waiting for next interval...
          </p>
        )}
      </Card>
    </div>
  );
}
