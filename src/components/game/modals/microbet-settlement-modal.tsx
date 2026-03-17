"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { FullscreenModal } from "@/components/game/modals/fullscreen-modal";
import type { MicroBetKind } from "@/bots/types";

const KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red outdamages Blue",
  blueDamageToRed: "Blue outdamages Red",
  redWallHits: "Red gets more wall hits",
  blueWallHits: "Blue gets more wall hits",
  ballCollisions: "Collisions hit 10+",
};

export type SettlementEntry = {
  kind: MicroBetKind;
  outcome: boolean;
  stake: number;
  payout: number;
  won: boolean;
};

type MicrobetSettlementModalProps = {
  open: boolean;
  settlements: SettlementEntry[];
  netChange: number;
  totalBananas: number;
  onContinue: () => void;
};

const MONKEY_WIN = "/monkey%20reactions/thinking_nobg/ahaha.png";
const MONKEY_LOSS = "/monkey%20reactions/thinking_nobg/swear.png";
const MONKEY_NEUTRAL = "/monkey%20reactions/thinking_nobg/hm.png";

export function MicrobetSettlementModal({
  open,
  settlements,
  netChange,
  totalBananas,
  onContinue,
}: MicrobetSettlementModalProps) {
  if (!open) return null;

  const winsCount = settlements.filter((s) => s.won).length;
  const lossCount = settlements.filter((s) => !s.won).length;
  const hasBets = settlements.length > 0;
  const isNet0 = netChange === 0;
  const isWin = netChange > 0;

  const monkeyImage = !hasBets
    ? MONKEY_NEUTRAL
    : isNet0
      ? MONKEY_NEUTRAL
      : isWin
        ? MONKEY_WIN
        : MONKEY_LOSS;

  const headlineColor = isWin
    ? "#16a34a"
    : netChange < 0
      ? "#dc2626"
      : "#71717a";
  const headlineText = !hasBets
    ? "No microbets placed"
    : isNet0
      ? "Break even"
      : isWin
        ? `+${netChange} bananas!`
        : `${netChange} bananas`;

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-md"
      zIndexClassName="z-60"
      overlayClassName="bg-black/60"
    >
      <motion.div
        className="w-full bg-white"
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        <div className="p-5 sm:p-7 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={
                isWin
                  ? { rotate: [-6, 6, -4, 4, 0], scale: [1, 1.15, 1] }
                  : netChange < 0
                    ? { rotate: [0, -4, 4, -2, 0], scale: [1, 0.92, 1] }
                    : {}
              }
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Image
                src={monkeyImage}
                alt="Monkey reaction"
                width={72}
                height={72}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              />
            </motion.div>

            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1">
                Interval Settlement
              </p>
              <motion.h2
                className="text-2xl sm:text-3xl font-black uppercase leading-none"
                style={{ color: headlineColor }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                {headlineText}
              </motion.h2>
              {hasBets && (
                <motion.p
                  className="text-xs font-bold text-zinc-500 mt-1 uppercase tracking-wide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {winsCount}W · {lossCount}L across {settlements.length} bet
                  {settlements.length !== 1 ? "s" : ""}
                </motion.p>
              )}
            </div>
          </div>

          {hasBets && (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              <AnimatePresence>
                {settlements.map((entry, i) => (
                  <motion.div
                    key={`${entry.kind}-${i}`}
                    initial={{ opacity: 0, x: entry.won ? -16 : 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.1 + i * 0.07,
                      type: "spring",
                      stiffness: 300,
                      damping: 26,
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 border-l-4 ${
                      entry.won
                        ? "border-green-400 bg-green-50"
                        : "border-red-300 bg-red-50"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-xs font-black uppercase text-zinc-800 truncate">
                        {KIND_LABEL[entry.kind]}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">
                        {entry.outcome ? "YES" : "NO"} · staked {entry.stake}
                      </p>
                    </div>
                    <motion.div
                      className={`ml-3 shrink-0 text-right`}
                      initial={{ scale: 1.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.07, type: "spring" }}
                    >
                      <p
                        className={`text-lg font-black ${
                          entry.won ? "text-green-700" : "text-red-500"
                        }`}
                      >
                        {entry.won ? `+${entry.payout}` : `-${entry.stake}`}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">
                        {entry.won ? "win" : "loss"}
                      </p>
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!hasBets && (
            <p className="text-sm text-zinc-500 text-center py-4 border-2 border-dashed border-zinc-200">
              You didn't place any microbets last interval.
            </p>
          )}

          <div className="flex items-center justify-between pt-1 border-t-2 border-zinc-100">
            <div className="flex items-center gap-2">
              <Image src="/Banana.svg" alt="Banana" width={16} height={16} />
              <span className="text-sm font-black tabular-nums">
                {totalBananas} bananas
              </span>
            </div>
            <motion.button
              onClick={onContinue}
              className="border-4 border-black px-4 py-2 font-black uppercase tracking-widest text-sm bg-yellow-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Next Round →
            </motion.button>
          </div>
        </div>
      </motion.div>
    </FullscreenModal>
  );
}
