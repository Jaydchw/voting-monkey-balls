"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { MenuAudioController } from "@/lib/menu-audio";

type LoopInfo = { loopPosition: number; loopDuration: number; isPlaying: boolean };

type MenuAudioContextValue = {
  setActive: (active: boolean) => void;
  pauseForGame: () => void;
  resumeFromGame: () => void;
  getLoopInfo: () => LoopInfo;
};

const MenuAudioContext = createContext<MenuAudioContextValue>({
  setActive: () => {},
  pauseForGame: () => {},
  resumeFromGame: () => {},
  getLoopInfo: () => ({ loopPosition: 0, loopDuration: 8, isPlaying: false }),
});

export function useMenuAudio() {
  return useContext(MenuAudioContext);
}

export function MenuAudioProvider({ children }: { children: React.ReactNode }) {
  const controllerRef = useRef<MenuAudioController | null>(null);

  useEffect(() => {
    const ctrl = new MenuAudioController();
    controllerRef.current = ctrl;
    void ctrl.load();

    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, []);

  const setActive = useCallback((active: boolean) => {
    controllerRef.current?.setActive(active);
  }, []);

  const pauseForGame = useCallback(() => {
    controllerRef.current?.pauseForGame();
  }, []);

  const resumeFromGame = useCallback(() => {
    controllerRef.current?.resumeFromGame();
  }, []);

  const getLoopInfo = useCallback((): LoopInfo => {
    return controllerRef.current?.getLoopInfo() ?? { loopPosition: 0, loopDuration: 8, isPlaying: false };
  }, []);

  return (
    <MenuAudioContext.Provider
      value={{ setActive, pauseForGame, resumeFromGame, getLoopInfo }}
    >
      {children}
    </MenuAudioContext.Provider>
  );
}
