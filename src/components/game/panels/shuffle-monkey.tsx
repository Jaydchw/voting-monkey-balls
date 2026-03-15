"use client";

import Image from "next/image";

type ShuffleMonkeyProps = {
  monkeyImageSrc: string;
  shuffling: boolean;
};

export function ShuffleMonkey({
  monkeyImageSrc,
  shuffling,
}: ShuffleMonkeyProps) {
  return (
    <div className="relative h-24 sm:h-28 mb-3 -mt-2 sm:-mt-3">
      <Image
        src={monkeyImageSrc}
        alt="Monkey"
        width={136}
        height={136}
        className="absolute left-1/2 -top-2 sm:-top-3 -translate-x-1/2 w-24 h-24 sm:w-28 sm:h-28 object-contain"
      />
      <div className="absolute left-1/2 top-9 sm:top-10 -translate-x-1/2 flex">
        <div
          className={`w-14 h-18 sm:w-16 sm:h-20 border-4 border-black bg-yellow-200 -rotate-12 transition-transform duration-200 ${
            shuffling ? "-translate-y-1" : "translate-y-0"
          }`}
        />
        <div
          className={`w-14 h-18 sm:w-16 sm:h-20 border-4 border-black bg-blue-200 -ml-8 sm:-ml-9 transition-transform duration-200 ${
            shuffling ? "translate-y-1" : "translate-y-0"
          }`}
        />
        <div
          className={`w-14 h-18 sm:w-16 sm:h-20 border-4 border-black bg-pink-200 -ml-8 sm:-ml-9 rotate-12 transition-transform duration-200 ${
            shuffling ? "-translate-y-1" : "translate-y-0"
          }`}
        />
      </div>
    </div>
  );
}
