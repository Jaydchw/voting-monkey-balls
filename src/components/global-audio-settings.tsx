"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { GearSix, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FullscreenModal } from "@/components/game/panels/fullscreen-modal";
import {
  getAudioSettings,
  setAudioSettings,
  subscribeAudioSettings,
  type AudioSettings,
} from "@/lib/audio-settings";

type VolumeSettingKey = keyof Pick<
  AudioSettings,
  "masterVolume" | "sfxVolume" | "musicVolume"
>;

function formatVolumePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function AudioSettingsDialog({
  open,
  settings,
  onClose,
  onChange,
}: {
  open: boolean;
  settings: AudioSettings;
  onClose: () => void;
  onChange: (key: VolumeSettingKey, value: number) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-md"
      zIndexClassName="z-[2147483647]"
      overlayClassName="bg-black/45"
      onBackdropClick={onClose}
    >
      <Card
        className="w-full rounded-none border-0 bg-white shadow-none sm:border-0"
        role="dialog"
        aria-modal="true"
        aria-label="Audio settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-3 border-b-2 border-black/25 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-black uppercase">Settings</h3>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-9 rounded-none border-2 border-black bg-white p-0"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-black uppercase tracking-wide text-zinc-800">
                Master Volume
              </label>
              <span className="text-sm font-black text-zinc-700">
                {formatVolumePercent(settings.masterVolume)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(settings.masterVolume * 100)}
              onChange={(event) =>
                onChange("masterVolume", Number(event.target.value) / 100)
              }
              className="w-full accent-black"
              aria-label="Master volume"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-black uppercase tracking-wide text-zinc-800">
                Sound Effects
              </label>
              <span className="text-sm font-black text-zinc-700">
                {formatVolumePercent(settings.sfxVolume)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(event) =>
                onChange("sfxVolume", Number(event.target.value) / 100)
              }
              className="w-full accent-black"
              aria-label="Sound effects volume"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-black uppercase tracking-wide text-zinc-800">
                Music
              </label>
              <span className="text-sm font-black text-zinc-700">
                {formatVolumePercent(settings.musicVolume)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(event) =>
                onChange("musicVolume", Number(event.target.value) / 100)
              }
              className="w-full accent-black"
              aria-label="Music volume"
            />
          </div>
        </div>
      </Card>
    </FullscreenModal>
  );
}

export function GlobalAudioSettings() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioSettings, setAudioSettingsState] = useState<AudioSettings>(() =>
    getAudioSettings(),
  );

  useEffect(() => {
    const unsubscribe = subscribeAudioSettings((latest) => {
      setAudioSettingsState(latest);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [settingsOpen]);

  if (!isClient || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div
        className="fixed top-3 right-3 sm:top-4 sm:right-4"
        style={{ zIndex: 2147483647 }}
      >
        <Button
          type="button"
          variant="outline"
          className="h-10 w-10 rounded-none border-2 border-black bg-white p-0 shadow-[0_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[0_1px_0_0_rgba(0,0,0,1)]"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          <GearSix size={20} weight="bold" />
        </Button>
      </div>

      <AudioSettingsDialog
        open={settingsOpen}
        settings={audioSettings}
        onClose={() => setSettingsOpen(false)}
        onChange={(key, value) => {
          const next = setAudioSettings({ [key]: value });
          setAudioSettingsState(next);
        }}
      />
    </>,
    document.body,
  );
}
