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
const DEFAULT_LOOP_ATTACK = 0.07;
const BPM = 136;
const BEATS_PER_BAR = 4;
const LOOP_BARS = 8;
const CALCULATED_LOOP_DURATION = (LOOP_BARS * 60) / (BPM / BEATS_PER_BAR); // 8 bars at 136 BPM (fallback)

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
  const [loopDuration, setLoopDuration] = useState<number>(CALCULATED_LOOP_DURATION);
  const [mode, setMode] = useState<"notail" | "withTail">("notail");
  const [attack, setAttack] = useState<number>(DEFAULT_LOOP_ATTACK);
  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<SoundFile, AudioBuffer>>>({});
  const buffersWithTailRef = useRef<Partial<Record<SoundFile, AudioBuffer>>>({});
  const loadingRef = useRef<Partial<Record<SoundFile, Promise<AudioBuffer>>>>({});
  const loadingWithTailRef = useRef<Partial<Record<SoundFile, Promise<AudioBuffer>>>>({});
  const loopSourcesRef = useRef<Partial<Record<SoundFile, AudioBufferSourceNode>>>({});
  const loopGainsRef = useRef<Partial<Record<SoundFile, GainNode>>>({});
  const tailInstancesRef = useRef<
    Partial<Record<SoundFile, Array<{ source: AudioBufferSourceNode; gain: GainNode }>>>
  >({});
  const nextCycleRef = useRef<Partial<Record<SoundFile, number>>>({});
  const schedulerRef = useRef<number | null>(null);
  const transportRef = useRef<{ startTime: number; loopDuration: number } | null>(
    null,
  );
  const activeRef = useRef<ToggleState>(createInitialState());
  const attackRef = useRef<number>(DEFAULT_LOOP_ATTACK);

  const allEnabled = useMemo(
    () => SOUND_FILES.every((file) => active[file]),
    [active],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    attackRef.current = attack;
  }, [attack]);

  const getAudioContext = () => {
    let ctx = audioContextRef.current;
    if (!ctx) {
      ctx = new AudioContext();
      audioContextRef.current = ctx;
    }
    return ctx;
  };

  const loadBuffer = async (file: SoundFile, useWithTail: boolean = false) => {
    const buffers = useWithTail ? buffersWithTailRef : buffersRef;
    const loading = useWithTail ? loadingWithTailRef : loadingRef;

    if (buffers.current[file]) return buffers.current[file] as AudioBuffer;
    if (!loading.current[file]) {
      loading.current[file] = (async () => {
        const ctx = getAudioContext();
        const path = useWithTail ? `/audio/${file}` : `/audio/no_tail/notail_${file}`;
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        buffers.current[file] = buffer;

        return buffer;
      })();
    }
    return loading.current[file] as Promise<AudioBuffer>;
  };

  const ensureTransport = () => {
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

  const getCurrentCycle = (transport: { startTime: number; loopDuration: number }) => {
    const ctx = getAudioContext();
    if (ctx.currentTime <= transport.startTime) return 0;
    return Math.floor(
      (ctx.currentTime - transport.startTime) / transport.loopDuration,
    );
  };

  const clearScheduler = () => {
    if (schedulerRef.current !== null) {
      window.clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
  };

  const stopFile = (file: SoundFile) => {
    const source = loopSourcesRef.current[file];
    if (source) {
      source.stop();
      source.disconnect();
      delete loopSourcesRef.current[file];
    }

    const gain = loopGainsRef.current[file];
    if (gain) {
      gain.disconnect();
      delete loopGainsRef.current[file];
    }

    const tailInstances = tailInstancesRef.current[file];
    if (tailInstances) {
      for (const instance of tailInstances) {
        instance.source.onended = null;
        try {
          instance.source.stop();
        } catch {
          // Source may already be stopped.
        }
        instance.source.disconnect();
        instance.gain.disconnect();
      }
      delete tailInstancesRef.current[file];
    }

    delete nextCycleRef.current[file];
  };

  const registerTailInstance = (
    file: SoundFile,
    source: AudioBufferSourceNode,
    gain: GainNode,
  ) => {
    const instances = tailInstancesRef.current[file] ?? [];
    instances.push({ source, gain });
    tailInstancesRef.current[file] = instances;

    source.onended = () => {
      const activeInstances = tailInstancesRef.current[file] ?? [];
      tailInstancesRef.current[file] = activeInstances.filter(
        (instance) => instance.source !== source,
      );
      source.disconnect();
      gain.disconnect();
    };
  };

  const startLoopingSource = (
    file: SoundFile,
    buffer: AudioBuffer,
    loopDuration: number,
    startAt: number,
    offset: number,
  ) => {
    const ctx = getAudioContext();
    const currentAttack = attackRef.current;
    stopFile(file);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = loopDuration;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(LOOP_VOLUME, startAt + currentAttack);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(startAt, offset);

    loopSourcesRef.current[file] = source;
    loopGainsRef.current[file] = gain;
  };

  const startTailInstance = (
    file: SoundFile,
    buffer: AudioBuffer,
    startAt: number,
    offset: number,
  ) => {
    const ctx = getAudioContext();
    const currentAttack = attackRef.current;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = false;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(LOOP_VOLUME, startAt + currentAttack);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(startAt, offset);

    registerTailInstance(file, source, gain);
  };

  const scheduleWithTailTrack = async (file: SoundFile) => {
    const ctx = getAudioContext();
    const transport = ensureTransport();
    const buffer = await loadBuffer(file, true);
    if (!activeRef.current[file]) return;

    const scheduleAheadTime = 0.75;
    const now = ctx.currentTime;
    const horizon = now + scheduleAheadTime;
    const currentCycle = getCurrentCycle(transport);

    if (nextCycleRef.current[file] === undefined) {
      nextCycleRef.current[file] = currentCycle;
    }

    while (true) {
      const cycle: number | undefined = nextCycleRef.current[file];
      if (cycle === undefined) break;

      const cycleStart = transport.startTime + cycle * transport.loopDuration;
      if (cycleStart > horizon) break;

      const startAt = Math.max(cycleStart, now + 0.01);
      const offset = cycleStart < now ? now - cycleStart : 0;
      if (offset < buffer.duration) {
        startTailInstance(file, buffer, startAt, offset);
      }

      nextCycleRef.current[file] = cycle + 1;
    }
  };

  const syncScheduler = () => {
    clearScheduler();
    if (mode !== "withTail") return;

    const hasActiveTracks = SOUND_FILES.some((file) => activeRef.current[file]);
    if (!hasActiveTracks) return;

    schedulerRef.current = window.setInterval(() => {
      for (const file of SOUND_FILES) {
        if (!activeRef.current[file]) continue;
        void scheduleWithTailTrack(file);
      }
    }, 100);
  };

  const startFile = async (file: SoundFile) => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    await loadBuffer(file, false);
    const buffer = await loadBuffer(file, mode === "withTail");
    if (!activeRef.current[file]) return;

    const transport = ensureTransport();
    if (mode === "notail") {
      const cycleStart =
        transport.startTime + getCurrentCycle(transport) * transport.loopDuration;
      const startAt = Math.max(ctx.currentTime + 0.01, cycleStart);
      const offset = cycleStart < ctx.currentTime ? ctx.currentTime - cycleStart : 0;
      startLoopingSource(file, buffer, loopDuration, startAt, offset);
      return;
    }

    nextCycleRef.current[file] = getCurrentCycle(transport);
    await scheduleWithTailTrack(file);
    syncScheduler();
  };

  const startAllSynchronized = async () => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    await Promise.all(SOUND_FILES.map((file) => loadBuffer(file, false)));

    const buffers = await Promise.all(
      SOUND_FILES.map((file) => loadBuffer(file, mode === "withTail")),
    );
    const startAt = ctx.currentTime + 0.08;
    transportRef.current = { startTime: startAt, loopDuration };

    SOUND_FILES.forEach((file, index) => {
      if (!activeRef.current[file]) return;

      if (mode === "notail") {
        startLoopingSource(file, buffers[index], loopDuration, startAt, 0);
        return;
      }

      nextCycleRef.current[file] = 0;
      startTailInstance(file, buffers[index], startAt, 0);
      nextCycleRef.current[file] = 1;
    });

    syncScheduler();
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
    clearScheduler();
    const nextState = createInitialState();
    activeRef.current = nextState;
    setActive(nextState);
  };

  const switchMode = (newMode: "notail" | "withTail") => {
    SOUND_FILES.forEach((file) => stopFile(file));
    clearScheduler();

    const nextState = createInitialState();
    activeRef.current = nextState;
    setActive(nextState);

    transportRef.current = null;

    setMode(newMode);
  };

  useEffect(() => {
    const loadReferenceDuration = async () => {
      const ctx = getAudioContext();
      const response = await fetch("/audio/no_tail/notail_4x4_kick.mp3");
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      setLoopDuration(buffer.duration);
    };
    void loadReferenceDuration();
  }, []);

  useEffect(() => {
    return () => {
      SOUND_FILES.forEach((file) => {
        stopFile(file);
      });
      clearScheduler();
      buffersRef.current = {};
      buffersWithTailRef.current = {};
      loadingRef.current = {};
      loadingWithTailRef.current = {};
      nextCycleRef.current = {};

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
          <div className="mb-6 p-4 border-4 border-black bg-gray-100">
            <p className="text-sm font-bold uppercase tracking-wide mb-3">Loop Mode:</p>
            <div className="flex flex-wrap gap-3">
              <Button
                className={`border-4 border-black rounded-none uppercase font-black tracking-widest ${
                  mode === "notail"
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
                onClick={() => switchMode("notail")}
              >
                No Tail (Perfect 8 Bar)
              </Button>
              <Button
                className={`border-4 border-black rounded-none uppercase font-black tracking-widest ${
                  mode === "withTail"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
                onClick={() => switchMode("withTail")}
              >
                With Tail (Crossfade)
              </Button>
            </div>

            <div className="mt-4 border-t-4 border-black pt-4">
              <label className="block text-sm font-bold uppercase tracking-wide mb-3" htmlFor="loop-attack">
                Attack: {attack.toFixed(2)}s
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="loop-attack"
                  type="range"
                  min="0"
                  max="0.25"
                  step="0.005"
                  value={attack}
                  onChange={(event) => setAttack(Number(event.target.value))}
                  className="w-full max-w-sm accent-black"
                />
                <input
                  type="number"
                  min="0"
                  max="0.25"
                  step="0.01"
                  value={attack}
                  onChange={(event) => {
                    const nextAttack = Number(event.target.value);
                    if (Number.isNaN(nextAttack)) return;
                    setAttack(Math.min(0.25, Math.max(0, nextAttack)));
                  }}
                  className="w-24 border-4 border-black bg-white px-2 py-1 font-bold"
                />
                <Button
                  type="button"
                  className="border-4 border-black rounded-none uppercase font-black tracking-widest bg-white text-black hover:bg-gray-200"
                  onClick={() => setAttack(DEFAULT_LOOP_ATTACK)}
                >
                  Reset Attack
                </Button>
              </div>
            </div>
          </div>

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
              Status: {allEnabled ? "All On" : "Mixed"} | Mode: {mode === "notail" ? "No Tail (Perfect 8B)" : "With Tail (Looped)"} | Attack: {attack.toFixed(2)}s
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
