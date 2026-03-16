"use client";

import { useEffect, useState } from "react";
import { BlockButton } from "@/components/ui/block-button";
import { BlockCard } from "@/components/ui/block-card";
import { FullscreenModal } from "@/components/game/modals/fullscreen-modal";
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
        const res = await fetch(`/monkey reactions/emoji/${file}`);
        const svg = await res.text();
        return [file, svg] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setSvgStrings(Object.fromEntries(entries));
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
      maxWidthClassName="max-w-3xl"
      zIndexClassName="z-60"
      overlayClassName="bg-white/96"
    >
      <div className="w-full bg-white p-5 sm:p-7">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
            Pre-Match
          </p>
          <h2 className="text-2xl sm:text-4xl font-black uppercase mt-1">
            {playerName}, pick your monkey
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          <BlockCard shadow="none" tinted className="p-4 border-2">
            <p className="text-xs font-black uppercase tracking-widest mb-3 text-zinc-500">
              Pick a Colour
            </p>
            <div className="flex flex-wrap gap-3">
              {MONKEY_CHARACTER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={[
                    "w-10 h-10 rounded-full border-4 border-black transition-all",
                    selectedColor === color
                      ? "ring-4 ring-offset-2 ring-black scale-110"
                      : "hover:scale-105",
                  ].join(" ")}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </BlockCard>

          <BlockCard shadow="none" tinted className="p-4 border-2">
            <p className="text-xs font-black uppercase tracking-widest mb-3 text-zinc-500">
              Pick Your Monkey
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
                    onClick={() => setSelectedCharacter(svg)}
                    className={[
                      "h-20 w-full border-4 border-black p-1 flex items-center justify-center transition-all",
                      "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none",
                      selectedCharacter === svg
                        ? "bg-yellow-300 ring-4 ring-black"
                        : "bg-white hover:bg-zinc-50",
                    ].join(" ")}
                    aria-label={`Select ${svg}`}
                  >
                    {thumb ? (
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: thumb }}
                      />
                    ) : (
                      <span className="text-[10px] font-black uppercase text-zinc-400">
                        Loading
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </BlockCard>

          <div className="flex justify-end">
            <BlockButton
              variant="success"
              size="lg"
              onClick={() =>
                onConfirm({ svgType: selectedCharacter, color: selectedColor })
              }
            >
              Lock Character →
            </BlockButton>
          </div>
        </div>
      </div>
    </FullscreenModal>
  );
}
