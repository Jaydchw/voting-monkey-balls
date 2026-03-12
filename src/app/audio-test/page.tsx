"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SOUND_FILES = [
  "4x4_kick.mp3",
  "conflict_bongos.mp3",
  "dub_blip.mp3",
  "dubsnare_pair.mp3",
  "forest_birds.mp3",
  "happy_melody.mp3",
  "jersey_snare.mp3",
  "onbeat_step.mp3",
  "rims.mp3",
  "shakers1.mp3",
  "shakers2.mp3",
  "spooky_melody.mp3",
  "stepper_hats.mp3",
  "stepper_snare.mp3",
  "tom_plinks.mp3",
  "triplet_kick.mp3",
  "warm_pad.mp3",
] as const;

const LOOP_VOLUME = 0.35;

type SoundFile = (typeof SOUND_FILES)[number];
type ToggleState = Record<SoundFile, boolean>;

function createInitialState(): ToggleState {
  return SOUND_FILES.reduce((acc, file) => {
    acc[file] = false;
    return acc;
  }, {} as ToggleState);
}

export default function AudioTestPage() {
  const [active, setActive] = useState<ToggleState>(() => createInitialState());
  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<SoundFile, AudioBuffer>>>({});
  const loadingRef = useRef<Partial<Record<SoundFile, Promise<AudioBuffer>>>>({});
  const sourcesRef = useRef<Partial<Record<SoundFile, AudioBufferSourceNode>>>({});
  const gainsRef = useRef<Partial<Record<SoundFile, GainNode>>>({});
  const transportRef = useRef<{ startTime: number; loopDuration: number } | null>(
    null,
  );
  const activeRef = useRef<ToggleState>(createInitialState());

  const allEnabled = useMemo(
    () => SOUND_FILES.every((file) => active[file]),
    [active],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const getAudioContext = () => {
    let ctx = audioContextRef.current;
    if (!ctx) {
      ctx = new AudioContext();
      audioContextRef.current = ctx;
    }
    return ctx;
  };

  const loadBuffer = async (file: SoundFile) => {
    if (buffersRef.current[file]) return buffersRef.current[file] as AudioBuffer;
    if (!loadingRef.current[file]) {
      loadingRef.current[file] = (async () => {
        const ctx = getAudioContext();
        const response = await fetch(`/audio/${file}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        buffersRef.current[file] = buffer;
        return buffer;
      })();
    }
    return loadingRef.current[file] as Promise<AudioBuffer>;
  };

  const ensureTransport = (loopDuration: number) => {
    const ctx = getAudioContext();
    if (!transportRef.current) {
      transportRef.current = {
        startTime: ctx.currentTime + 0.05,
        loopDuration,
      };
      return transportRef.current;
    }

    return transportRef.current;
  };

  const getLoopOffset = (ctx: AudioContext, startTime: number, loopDuration: number) => {
    const elapsed = ctx.currentTime - startTime;
    const modulo = elapsed % loopDuration;
    return modulo < 0 ? modulo + loopDuration : modulo;
  };

  const stopFile = (file: SoundFile) => {
    const source = sourcesRef.current[file];
    if (source) {
      source.stop();
      source.disconnect();
      delete sourcesRef.current[file];
    }

    const gain = gainsRef.current[file];
    if (gain) {
      gain.disconnect();
      delete gainsRef.current[file];
    }
  };

  const createAndStartSource = (
    file: SoundFile,
    buffer: AudioBuffer,
    loopDuration: number,
    startAt: number,
    offset: number,
  ) => {
    const ctx = getAudioContext();
    stopFile(file);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = loopDuration;

    const gain = ctx.createGain();
    gain.gain.value = LOOP_VOLUME;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(startAt, offset);

    sourcesRef.current[file] = source;
    gainsRef.current[file] = gain;
  };

  const startFile = async (file: SoundFile) => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    const buffer = await loadBuffer(file);
    if (!activeRef.current[file]) return;

    const transport = ensureTransport(buffer.duration);
    if (!transport) return;

    const loopOffset = getLoopOffset(ctx, transport.startTime, transport.loopDuration);
    const startAt = Math.max(ctx.currentTime + 0.01, transport.startTime);
    createAndStartSource(file, buffer, transport.loopDuration, startAt, loopOffset);
  };

  const startAllSynchronized = async () => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    const buffers = await Promise.all(SOUND_FILES.map((file) => loadBuffer(file)));
    const loopDuration = buffers[0].duration;
    const startAt = ctx.currentTime + 0.08;
    transportRef.current = { startTime: startAt, loopDuration };

    SOUND_FILES.forEach((file, index) => {
      if (!activeRef.current[file]) return;
      createAndStartSource(file, buffers[index], loopDuration, startAt, 0);
    });
  };

  const toggleFile = (file: SoundFile) => {
    const nextEnabled = !activeRef.current[file];
    activeRef.current = { ...activeRef.current, [file]: nextEnabled };
    setActive(activeRef.current);

    if (nextEnabled) {
      void startFile(file);
      return;
    }

    stopFile(file);
  };

  const setAll = (enabled: boolean) => {
    if (enabled) {
      const nextState = SOUND_FILES.reduce((acc, file) => {
        acc[file] = true;
        return acc;
      }, {} as ToggleState);
      activeRef.current = nextState;
      setActive(nextState);
      void startAllSynchronized();
      return;
    }

    SOUND_FILES.forEach((file) => {
      stopFile(file);
    });
    const nextState = createInitialState();
    activeRef.current = nextState;
    setActive(nextState);
  };

  useEffect(() => {
    return () => {
      SOUND_FILES.forEach((file) => {
        stopFile(file);
      });
      buffersRef.current = {};
      loadingRef.current = {};

      const ctx = audioContextRef.current;
      if (ctx) {
        void ctx.close();
      }
      audioContextRef.current = null;
      transportRef.current = null;
    };
  }, []);

  return (
    <div className="w-screen min-h-screen flex flex-col items-center bg-white text-black p-8">
      <div className="w-full max-w-6xl relative">
        <Link href="/">
          <Button
            className="absolute top-0 left-0 border-4 border-black rounded-none font-bold uppercase tracking-widest"
            variant="secondary"
          >
            Back to Menu
          </Button>
        </Link>

        <h1 className="text-5xl font-black uppercase text-center mb-4 tracking-widest border-b-8 border-black pb-4 pt-16">
          Audio Test Deck
        </h1>
        <p className="text-center font-bold uppercase tracking-wide mb-8">
          All tracks are phase-locked 8-bar loops at fixed volume {LOOP_VOLUME}
        </p>

        <Card className="p-6 border-8 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              className="border-4 border-black rounded-none uppercase font-black tracking-widest"
              onClick={() => setAll(true)}
            >
              Start All
            </Button>
            <Button
              className="border-4 border-black rounded-none uppercase font-black tracking-widest"
              variant="destructive"
              onClick={() => setAll(false)}
            >
              Stop All
            </Button>
            <span className="self-center text-sm font-bold uppercase tracking-wide">
              Status: {allEnabled ? "All On" : "Mixed"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SOUND_FILES.map((file) => {
              const isOn = active[file];
              return (
                <Button
                  key={file}
                  onClick={() => toggleFile(file)}
                  className={`justify-between border-4 border-black rounded-none uppercase font-black tracking-wide ${
                    isOn
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  <span>{file.replace(".mp3", "").replaceAll("_", " ")}</span>
                  <span>{isOn ? "ON" : "OFF"}</span>
                </Button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
