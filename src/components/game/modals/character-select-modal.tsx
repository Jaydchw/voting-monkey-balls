"use client";

import { useEffect, useMemo, useState } from "react";

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

const COLOR_NAMES: Record<string, string> = {
  "#FFD600": "GOLD",
  "#FFB300": "AMBER",
  "#FF7043": "CORAL",
  "#8D6E63": "BARK",
  "#4E342E": "ESPRESSO",
  "#90CAF9": "SKY",
  "#C5E1A5": "SAGE",
  "#F06292": "ROSE",
  "#1976D2": "COBALT",
  "#D32F2F": "CRIMSON",
  "#7B1FA2": "VIOLET",
  "#0097A7": "TEAL",
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
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [step, setStep] = useState<"color" | "character">("color");

  useEffect(() => {
    if (!open) return;
    let rafId2: number;
    const rafId1 = requestAnimationFrame(() => {
      setStep("color");
      rafId2 = requestAnimationFrame(() => setIsAnimatingIn(true));
    });
    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      setIsAnimatingIn(false);
    };
  }, [open]);

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

  const previewSvg = useMemo(() => {
    const raw = svgStrings[selectedCharacter];
    if (!raw) return null;
    return raw
      .replace(/#7f512e/gi, selectedColor)
      .replace("<svg", '<svg style="width:100%;height:100%;display:block;"');
  }, [svgStrings, selectedCharacter, selectedColor]);

  if (!open) return null;

  const colorName = COLOR_NAMES[selectedColor] ?? "CUSTOM";

  return (
    <div
      className="fixed inset-0 z-9999 bg-white flex flex-col overflow-hidden"
      style={{
        opacity: isAnimatingIn ? 1 : 0,
        transform: isAnimatingIn ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.25s ease-out, transform 0.25s ease-out",
      }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-40 sm:pt-16 sm:pb-44">
          {/* Title */}
          <div className="mb-8">
            <div className="inline-block border-4 border-black px-3 py-1 mb-4 bg-yellow-300">
              <span className="text-xs font-black uppercase tracking-[0.3em]">
                Pre-Match Setup
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight">
              {playerName},
              <br />
              <span className="text-primary">Pick Your Monkey</span>
            </h1>
          </div>

          {/* Step tabs */}
          <div className="flex mb-6 border-b-4 border-black">
            <button
              onClick={() => setStep("color")}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all border-r-4 border-black ${
                step === "color"
                  ? "bg-black text-white"
                  : "bg-white text-zinc-400 hover:bg-zinc-100 hover:text-black"
              }`}
            >
              1 · Colour
            </button>
            <button
              onClick={() => setStep("character")}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                step === "character"
                  ? "bg-black text-white"
                  : "bg-white text-zinc-400 hover:bg-zinc-100 hover:text-black"
              }`}
            >
              2 · Monkey
            </button>
          </div>

          {/* Colour step */}
          {step === "color" && (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
              }}
            >
              {MONKEY_CHARACTER_COLORS.map((color) => {
                const isSelected = selectedColor === color;
                const name = COLOR_NAMES[color] ?? "CUSTOM";
                return (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      setStep("character");
                    }}
                    className={`flex flex-col items-center gap-2.5 py-4 px-2 border-4 transition-all active:translate-y-0.5 ${
                      isSelected
                        ? "border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                        : "border-zinc-200 hover:border-black"
                    }`}
                  >
                    <div
                      className="w-9 h-9 border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 leading-none">
                      {name}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-black uppercase text-primary leading-none">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Monkey step */}
          {step === "character" && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {MONKEY_CHARACTER_SVGS.map((svg) => {
                const raw = svgStrings[svg];
                const thumb = raw
                  ? raw
                      .replace(/#7f512e/gi, selectedColor)
                      .replace(
                        "<svg",
                        '<svg style="width:100%;height:100%;display:block;"',
                      )
                  : null;
                const isSelected = selectedCharacter === svg;

                return (
                  <button
                    key={svg}
                    onClick={() => setSelectedCharacter(svg)}
                    className={`relative aspect-square border-4 p-2 flex items-center justify-center transition-all active:translate-y-0.5 ${
                      isSelected
                        ? "border-black bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                        : "border-zinc-200 bg-white hover:border-black hover:bg-zinc-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-black flex items-center justify-center">
                        <span className="text-white text-[8px] font-black">
                          ✓
                        </span>
                      </span>
                    )}
                    {thumb ? (
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: thumb }}
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-100 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {previewSvg && (
            <div
              className="w-10 h-10 shrink-0 border-4 border-black overflow-hidden"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 leading-none mb-0.5">
              Selected colour
            </p>
            <p className="text-sm font-black uppercase leading-none truncate">
              {colorName}
            </p>
          </div>
          <button
            onClick={() =>
              onConfirm({ svgType: selectedCharacter, color: selectedColor })
            }
            className="shrink-0 border-4 border-black bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 py-3 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:opacity-90 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            Lock In →
          </button>
        </div>
      </div>
    </div>
  );
}
