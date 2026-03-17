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
    audioCtrlRef.current = new GameAudioController();
    pauseForGame();

    return () => {
      audioCtrlRef.current?.dispose();
      audioCtrlRef.current = null;
      resumeFromGame();
    };
  }, [pauseForGame, resumeFromGame]);

  return <>{children(audioCtrlRef)}</>;
}
