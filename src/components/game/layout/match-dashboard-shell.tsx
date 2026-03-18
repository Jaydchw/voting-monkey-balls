"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type MatchDashboardShellProps = {
  header: ReactNode;
  leftPanel?: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  overlay?: ReactNode;
  floatingAction?: ReactNode;
  reserveLeftSpace?: boolean;
};

export function MatchDashboardShell({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  overlay,
  floatingAction,
  reserveLeftSpace = false,
}: MatchDashboardShellProps) {
  const hasLeftPanel = Boolean(leftPanel);
  const useThreeColumnFrame = hasLeftPanel || reserveLeftSpace;

  return (
    <div className="relative w-screen min-h-screen overflow-x-clip bg-white text-black p-6 md:p-10">
      {overlay}
      <div className="relative z-10 max-w-475 mx-auto">
        {header}
        <div
          className={
            useThreeColumnFrame
              ? "grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-6"
              : "grid grid-cols-1 xl:grid-cols-[auto_320px] gap-6"
          }
        >
          {hasLeftPanel ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="min-w-0"
            >
              {leftPanel}
            </motion.div>
          ) : useThreeColumnFrame ? (
            <div className="hidden xl:block" aria-hidden="true" />
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.03 }}
            className="min-w-0"
          >
            {centerPanel}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
            className="min-w-0"
          >
            {rightPanel}
          </motion.div>
        </div>
      </div>
      {floatingAction}
    </div>
  );
}
