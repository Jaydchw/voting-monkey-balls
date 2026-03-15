"use client";

import { useState } from "react";
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
        <p className="text-center font-bold uppercase tracking-wide mb-8">
          Pick your monkey emoji character
        </p>

        <Card className="p-6 border-8 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white">
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
                    <img
                      src={`/monkey reactions/emoji/${file}`}
                      alt={file}
                      className="h-32 w-32 object-contain"
                    />
                  </Button>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            {selectedEmoji ? (
              <div>
                <p className="font-bold uppercase tracking-wide mb-2">Selected Character:</p>
                <img
                  src={`/monkey reactions/emoji/${selectedEmoji}`}
                  alt={selectedEmoji}
                  className="w-20 h-20 mx-auto object-contain border-2 border-yellow-400 p-1"
                />
                <p className="mt-2 text-sm">(Assigned to user profile placeholder)</p>
              </div>
            ) : (
              <p className="font-bold uppercase tracking-wide">No character selected</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
