"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMenuAudio } from "@/components/menu-audio-context";
import { GameAudioController } from "@/lib/game-audio";

export type GameAudioHandle = GameAudioController;

type GamePanelBaseProps = {
  children: (
    audioCtrl: React.MutableRefObject<GameAudioController | null>,
  ) => ReactNode;
};

export function GamePanelBase({ children }: GamePanelBaseProps) {
  const { pauseForGame, resumeFromGame } = useMenuAudio();
  const audioCtrlRef = useRef<GameAudioController | null>(null);

  useEffect(() => {
    const ctrl = new GameAudioController();
    audioCtrlRef.current = ctrl;

    pauseForGame();

    void ctrl.loadRound(1);

    return () => {
      ctrl.dispose();
      audioCtrlRef.current = null;
      resumeFromGame();
    };
  }, [pauseForGame, resumeFromGame]);

  return <>{children(audioCtrlRef)}</>;
}
