"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MONKEY_EMOJIS = [
  "monkey-emojis-1.svg",
  "monkey-emojis-2.svg",
  "monkey-emojis-3.svg",
  "monkey-emojis-4.svg",
  "monkey-emojis-5.svg",
  "monkey-emojis-6.svg",
  "monkey-emojis-7.svg",
  "monkey-emojis-8.svg",
  "monkey-emojis-9.svg",
  "monkey-emojis-10.svg",
  "monkey-emojis-11.svg",
  "monkey-emojis-12.svg",
  "monkey-emojis-13.svg",
  "monkey-emojis-14.svg",
  "monkey-emojis-15.svg",
];

export default function CharacterTestPage() {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [svgStrings, setSvgStrings] = useState<{ [key: string]: string }>({});


  // Expanded palette with more contrasting colors for player differentiation
  const palette = [
    "#FFD600", // yellow
    "#FFB300", // orange
    "#FF7043", // coral
    "#8D6E63", // brown
    "#4E342E", // dark brown
    "#90CAF9", // blue
    "#C5E1A5", // green
    "#F06292", // pink
    "#1976D2", // deep blue
    "#D32F2F", // red
    "#7B1FA2", // purple
    "#0097A7", // teal
  ];
  const [color, setColor] = useState(palette[3]); // default to brown

  // Load all SVGs for emoji buttons
  React.useEffect(() => {
    const loadSvgs = async () => {
      const loaded: { [key: string]: string } = {};
      await Promise.all(
        MONKEY_EMOJIS.map(async (file) => {
          const res = await fetch(`/monkey reactions/emoji/${file}`);
          const svg = await res.text();
          loaded[file] = svg;
        })
      );
      setSvgStrings(loaded);
    };
    loadSvgs();
  }, []);

  // Replace color in SVG string for preview
  const getColoredSvg = React.useMemo(() => {
    if (!selectedEmoji || !svgStrings[selectedEmoji]) return null;
    return svgStrings[selectedEmoji].replace(/#7f512e/gi, color);
  }, [svgStrings, selectedEmoji, color]);

  // Placeholder for user profile
  const userProfile = {
    emoji: selectedEmoji,
  };

  return (
    <div className="w-screen min-h-screen flex flex-col items-center bg-white text-black p-8 relative">
      <Link href="/">
        <Button
          className="absolute top-8 left-8 border-4 border-black rounded-none font-bold uppercase tracking-widest"
          variant="secondary"
        >
          Back to Menu
        </Button>
      </Link>

      <div className="w-full max-w-3xl">
        <h1 className="text-5xl font-black uppercase text-center mb-4 tracking-widest border-b-8 border-black pb-4 pt-16">
          Character Selection Test
        </h1>

        {/* Character Preview at Top */}
        <div className="mb-12 text-center">
          {selectedEmoji ? (
            <div>
              <p className="font-bold uppercase tracking-wide mb-2">Selected Character Preview:</p>
              {getColoredSvg ? (
                <div
                  className="w-40 h-40 mx-auto border-4 border-yellow-400 rounded-lg bg-white flex items-center justify-center shadow-md"
                  style={{ maxWidth: '160px', maxHeight: '160px', padding: '8px' }}
                >
                  <div
                    style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    dangerouslySetInnerHTML={{ __html: getColoredSvg }}
                  />
                </div>
              ) : (
                <p>Loading SVG...</p>
              )}
              <p className="mt-2 text-sm">(Assigned to user profile placeholder)</p>
            </div>
          ) : (
            <p className="font-bold uppercase tracking-wide">No character selected</p>
          )}
        </div>

        {/* Colour Picker Below Preview */}
        <div className="mb-12 p-6 border-4 border-yellow-400 rounded bg-yellow-50">
          <h2 className="text-2xl font-bold mb-4">Pick a Colour</h2>
          <div className="flex flex-wrap gap-3 mb-4 justify-center">
            {palette.map((c) => (
              <button
                key={c}
                className={`w-10 h-10 rounded-full border-4 border-black focus:outline-none ${color === c ? "ring-4 ring-yellow-400" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Emoji Selection Below Colour Picker with live SVG preview */}
        <Card className="p-6 border-8 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white">
          <p className="text-center font-bold uppercase tracking-wide mb-8">
            Pick your monkey emoji character
          </p>
          <div className="grid grid-cols-5 gap-x-12 gap-y-8 mb-6 place-items-center">
            {MONKEY_EMOJIS.map((file) => (
              <button
                key={file}
                className={`border-2 border-black rounded-none p-1 bg-white hover:bg-yellow-100 focus:bg-yellow-200 ${selectedEmoji === file ? "ring-4 ring-yellow-400" : ""}`}
                onClick={() => setSelectedEmoji(file)}
                aria-label={`Select ${file}`}
              >
                  <Button
                    key={file}
                    variant={selectedEmoji === file ? "secondary" : "outline"}
                    size="lg"
                    className={`border-4 border-black rounded-none p-0 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${selectedEmoji === file ? "ring-4 ring-yellow-400" : ""} h-32 w-32`}
                    onClick={() => setSelectedEmoji(file)}
                    aria-label={`Select ${file}`}
                  >
                    {svgStrings[file] ? (
                      <div
                        style={{ width: '128px', height: '128px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                      >
                        <div
                          style={{ width: '100%', height: '100%' }}
                          dangerouslySetInnerHTML={{
                            __html: svgStrings[file]
                              .replace(/#7f512e/gi, color)
                              .replace('<svg', '<svg style="width:100%;height:100%;object-fit:contain;display:block;"')
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-32 w-32 flex items-center justify-center text-xs text-gray-400">Loading...</div>
                    )}
                  </Button>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
