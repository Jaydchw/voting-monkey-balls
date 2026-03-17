"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lightning, TrendUp, Wind } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export type AppliedEffect = {
  label: string;
  category: string;
  icons: Icon[];
};

type ActivityFeedProps = {
  latestVoteSummary: string | null;
  latestMicrobetSummary: string | null;
  appliedEffects: AppliedEffect[];
};

export function ActivityFeed({
  latestVoteSummary,
  latestMicrobetSummary,
  appliedEffects,
}: ActivityFeedProps) {
  return (
    <section className="bg-white px-2 py-1">
      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-zinc-700">
        Vote + Betting Feed
      </h2>
      <div className="space-y-3 divide-y divide-zinc-200/80">
        <AnimatePresence mode="wait">
          <motion.div
            key={latestVoteSummary ?? "no-vote"}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.22 }}
            className="px-1 pb-3"
          >
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-zinc-600">
              <Lightning size={13} weight="fill" /> Latest Vote
            </p>
            <p className="text-sm">
              {latestVoteSummary ?? "Voting starts at 01:50."}
            </p>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={latestMicrobetSummary ?? "no-microbet"}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.25, delay: 0.04 }}
            className="px-1 py-3"
          >
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-zinc-600">
              <TrendUp size={13} weight="fill" /> Latest Microbets
            </p>
            <p className="text-sm">
              {latestMicrobetSummary ?? "No microbet interval yet."}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="px-1 pt-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-zinc-600">
            <Wind size={13} weight="fill" /> Applied Effects
          </p>
          <div className="divide-y divide-zinc-200/70">
            <AnimatePresence initial={false}>
              {appliedEffects.map((effect, index) => (
                <motion.div
                  key={`${effect.label}-${index}`}
                  initial={{
                    opacity: 0,
                    x: -10,
                    height: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    height: "auto",
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  <div className="flex items-center gap-1 shrink-0">
                    {effect.icons.map((IconComp, iconIndex) => (
                      <motion.span
                        key={`${effect.label}-icon-${iconIndex}`}
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          delay: index * 0.04 + iconIndex * 0.05,
                          type: "spring",
                          stiffness: 320,
                        }}
                      >
                        <IconComp size={14} weight="bold" />
                      </motion.span>
                    ))}
                  </div>
                  <span className="text-xs">{effect.label}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {appliedEffects.length === 0 && (
              <p className="text-xs text-zinc-500">No effects applied yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
