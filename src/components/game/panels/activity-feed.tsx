"use client";

import { motion } from "framer-motion";
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="px-1 pb-3"
        >
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-zinc-600">
            <Lightning size={13} weight="fill" /> Latest Vote
          </p>
          <p className="text-sm">
            {latestVoteSummary ?? "Voting starts at 01:50."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.04 }}
          className="px-1 py-3"
        >
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-zinc-600">
            <TrendUp size={13} weight="fill" /> Latest Microbets
          </p>
          <p className="text-sm">
            {latestMicrobetSummary ?? "No microbet interval yet."}
          </p>
        </motion.div>

        <div className="px-1 pt-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-zinc-600">
            <Wind size={13} weight="fill" /> Applied Effects
          </p>
          <div className="divide-y divide-zinc-200/70">
            {appliedEffects.map((effect, index) => (
              <motion.div
                key={`${effect.label}-${index}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className="flex items-center gap-2 py-2"
              >
                <div className="flex items-center gap-1 shrink-0">
                  {effect.icons.map((IconComp, iconIndex) => (
                    <IconComp
                      key={`${effect.label}-${iconIndex}`}
                      size={14}
                      weight="bold"
                    />
                  ))}
                </div>
                <span className="text-xs">{effect.label}</span>
              </motion.div>
            ))}
            {appliedEffects.length === 0 && (
              <p className="text-xs text-zinc-500">No effects applied yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
