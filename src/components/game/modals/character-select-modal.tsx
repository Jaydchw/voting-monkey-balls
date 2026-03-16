"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FullscreenModal } from "@/components/game/modals/fullscreen-modal";
import { ModalSurface } from "@/components/game/modals/modal-surface";
import {
  DEFAULT_MONKEY_COLOR,
  DEFAULT_MONKEY_SVG,
  MONKEY_CHARACTER_COLORS,
  MONKEY_CHARACTER_SVGS,
  type MonkeySvgType,
} from "@/lib/monkey-characters";

type CharacterSelectModalProps = {
  open: boolean;
  playerName: string;
  onConfirm: (value: { svgType: string; color: string }) => void;
};

export function CharacterSelectModal({
  open,
  playerName,
  onConfirm,
}: CharacterSelectModalProps) {
  const [selectedCharacter, setSelectedCharacter] =
    useState<MonkeySvgType>(DEFAULT_MONKEY_SVG);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_MONKEY_COLOR);
  const [svgStrings, setSvgStrings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    Promise.all(
      MONKEY_CHARACTER_SVGS.map(async (file) => {
        const response = await fetch(`/monkey reactions/emoji/${file}`);
        const svg = await response.text();
        return [file, svg] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setSvgStrings(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setSvgStrings({});
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <FullscreenModal
      open={open}
      maxWidthClassName="max-w-5xl"
      zIndexClassName="z-60"
      overlayClassName="bg-white/96"
    >
      <ModalSurface className="p-3 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
          Pre-Match Character Select
        </p>
        <h2 className="text-xl sm:text-4xl font-black uppercase mt-2">
          {playerName}, pick your monkey
        </h2>

        <div className="mt-5 space-y-5">
          <Card className="border-0 rounded-none p-4 sm:border-4 sm:border-black">
            <p className="text-xs font-black uppercase tracking-widest mb-3">
              Pick a color
            </p>
            <div className="flex flex-wrap gap-3">
              {MONKEY_CHARACTER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-4 border-black ${selectedColor === color ? "ring-4 ring-yellow-400" : ""}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </Card>

          <Card className="border-0 rounded-none p-4 sm:border-4 sm:border-black">
            <p className="text-xs font-black uppercase tracking-widest mb-3">
              Pick your monkey character
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {MONKEY_CHARACTER_SVGS.map((svg) => {
                const raw = svgStrings[svg];
                const thumb = raw
                  ? raw
                      .replace(/#7f512e/gi, selectedColor)
                      .replace(
                        "<svg",
                        '<svg style="width:100%;height:100%;object-fit:contain;display:block;"',
                      )
                  : null;

                return (
                  <button
                    key={svg}
                    type="button"
                    onClick={() => setSelectedCharacter(svg)}
                    className={`bg-transparent p-1 h-24 w-24 flex items-center justify-center ${selectedCharacter === svg ? "ring-4 ring-yellow-400" : ""}`}
                    aria-label={`Select character ${svg}`}
                  >
                    {thumb ? (
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: thumb }}
                      />
                    ) : (
                      <span className="text-[10px] font-black uppercase text-zinc-500">
                        Loading
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-end px-4 sm:px-0">
            <Button
              type="button"
              className="w-full sm:w-auto border-2 border-transparent rounded-none font-black uppercase text-base sm:text-lg px-6 py-5 sm:border-4 sm:border-black"
              onClick={() =>
                onConfirm({ svgType: selectedCharacter, color: selectedColor })
              }
            >
              Lock Character
            </Button>
          </div>
        </div>
      </ModalSurface>
    </FullscreenModal>
  );
}
