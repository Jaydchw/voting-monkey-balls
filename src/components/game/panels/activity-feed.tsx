"use client";

import { Card } from "@/components/ui/card";
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
    <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
      <h2 className="text-sm font-black uppercase tracking-widest mb-3">
        Vote + Betting Feed
      </h2>
      <div className="space-y-3">
        <div className="border-2 border-black p-3">
          <p className="text-xs font-black uppercase mb-1">Latest Vote</p>
          <p className="text-sm">
            {latestVoteSummary ?? "Voting starts at 01:50."}
          </p>
        </div>

        <div className="border-2 border-black p-3">
          <p className="text-xs font-black uppercase mb-1">Latest Microbets</p>
          <p className="text-sm">
            {latestMicrobetSummary ?? "No microbet interval yet."}
          </p>
        </div>

        <div className="border-2 border-black p-3">
          <p className="text-xs font-black uppercase mb-2">Applied Effects</p>
          <div className="space-y-2">
            {appliedEffects.map((effect, index) => (
              <div
                key={`${effect.label}-${index}`}
                className="flex items-center gap-2 border-b border-black/20 pb-1"
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
              </div>
            ))}
            {appliedEffects.length === 0 && (
              <p className="text-xs">No effects applied yet.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
