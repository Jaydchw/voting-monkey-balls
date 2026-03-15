"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SONGS = {
  mirage: {
    label: "Mirage",
    files: [
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
    ],
  },
  conga: {
    label: "Conga",
    files: [
      "conga 1-Conga Bongo Timbales.mp3",
      "conga 10-Group.mp3",
      "conga 11-909 Core Kit.mp3",
      "conga 12-909 Core Kit.mp3",
      "conga 13-909 Core Kit.mp3",
      "conga 14-909 Core Kit.mp3",
      "conga 15-Basic Trigger Bass.mp3",
      "conga 16-Chord Afterfade.mp3",
      "conga 17-Typical Sound.mp3",
      "conga 18-Stab Horn Wah Soul.mp3",
      "conga 2-Conga Bongo Timbales.mp3",
      "conga 3-Conga Bongo Timbales.mp3",
      "conga 4-DD_DISC_114_perc_loop_tambourine_accent_on_2___4.mp3",
      "conga 5-Group.mp3",
      "conga 6-Guitar Bass.mp3",
      "conga 7-Guitar Bass.mp3",
      "conga 9-SRX ORCHESTRA.mp3",
      "conga A-Reverb.mp3",
      "conga AlterEgo.mp3",
      "conga B-Delay.mp3",
      "conga.mp3",
    ],
  },
  groova: {
    label: "Groova",
    files: [
      "groova chord.mp3",
      "groova clap.mp3",
      "groova conga.mp3",
      "groova conga2.mp3",
      "groova cowbell.mp3",
      "groova dronepad.mp3",
      "groova epaino_low.mp3",
      "groova epiano_high.mp3",
      "groova hats.mp3",
      "groova horn.mp3",
      "groova kick.mp3",
      "groova m1_high.mp3",
      "groova organ.mp3",
      "groova perc.mp3",
      "groova perfect stab.mp3",
      "groova perfect.mp3",
      "groova plink1.mp3",
      "groova shaker.mp3",
      "groova snare-1.mp3",
      "groova snare.mp3",
      "groova synth.mp3",
      "groova synthstabs.mp3",
      "groova toms.mp3",
      "groova vox.mp3",
      "groova wub1.mp3",
    ],
  },
} as const;

const LOOP_VOLUME = 0.35;
const DEFAULT_LOOP_ATTACK = 0.07;
const DEFAULT_LOOP_DURATION = 8;
const DEFAULT_SONG = "mirage" as const;

type SongId = keyof typeof SONGS;
type SoundFile = string;
type ToggleState = Record<SoundFile, boolean>;

function createInitialState(files: readonly SoundFile[]): ToggleState {
  return files.reduce((acc, file) => {
    acc[file] = false;
    return acc;
  }, {} as ToggleState);
}

function toFileKey(songId: SongId, file: SoundFile) {
  return `${songId}::${file}`;
}

function buildSongPath(songId: SongId, file: SoundFile) {
  return `/audio/${songId}/${encodeURIComponent(file)}`;
}

export default function AudioTestPage() {
  const [song, setSong] = useState<SongId>(DEFAULT_SONG);
  const [active, setActive] = useState<ToggleState>(() =>
    createInitialState(SONGS[DEFAULT_SONG].files),
  );
  const [loopDuration, setLoopDuration] = useState<number>(
    DEFAULT_LOOP_DURATION,
  );
  const [mode, setMode] = useState<"notail" | "withTail">("notail");
  const [attack, setAttack] = useState<number>(DEFAULT_LOOP_ATTACK);
  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<string, AudioBuffer>>>({});
  const buffersWithTailRef = useRef<Partial<Record<string, AudioBuffer>>>({});
  const loadingRef = useRef<Partial<Record<string, Promise<AudioBuffer>>>>({});
  const loadingWithTailRef = useRef<
    Partial<Record<string, Promise<AudioBuffer>>>
  >({});
  const loopSourcesRef = useRef<
    Partial<Record<SoundFile, AudioBufferSourceNode>>
  >({});
  const loopGainsRef = useRef<Partial<Record<SoundFile, GainNode>>>({});
  const tailInstancesRef = useRef<
    Partial<
      Record<
        SoundFile,
        Array<{ source: AudioBufferSourceNode; gain: GainNode }>
      >
    >
  >({});
  const nextCycleRef = useRef<Partial<Record<SoundFile, number>>>({});
  const schedulerRef = useRef<number | null>(null);
  const transportRef = useRef<{
    startTime: number;
    loopDuration: number;
  } | null>(null);
  const soundFiles = useMemo(() => SONGS[song].files, [song]);
  const activeRef = useRef<ToggleState>(
    createInitialState(SONGS[DEFAULT_SONG].files),
  );
  const soundFilesRef = useRef<readonly SoundFile[]>(SONGS[DEFAULT_SONG].files);
  const attackRef = useRef<number>(DEFAULT_LOOP_ATTACK);
  const songRef = useRef<SongId>(DEFAULT_SONG);

  const allEnabled = useMemo(
    () => soundFiles.length > 0 && soundFiles.every((file) => active[file]),
    [active, soundFiles],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    soundFilesRef.current = soundFiles;
  }, [soundFiles]);

  useEffect(() => {
    attackRef.current = attack;
  }, [attack]);

  useEffect(() => {
    songRef.current = song;
  }, [song]);

  const getAudioContext = useCallback(() => {
    let ctx = audioContextRef.current;
    if (!ctx) {
      ctx = new AudioContext();
      audioContextRef.current = ctx;
    }
    return ctx;
  }, []);

  const loadBuffer = useCallback(
    async (songId: SongId, file: SoundFile, useWithTail: boolean = false) => {
      const buffers = useWithTail ? buffersWithTailRef : buffersRef;
      const loading = useWithTail ? loadingWithTailRef : loadingRef;
      const key = toFileKey(songId, file);

      if (buffers.current[key]) return buffers.current[key] as AudioBuffer;
      if (!loading.current[key]) {
        loading.current[key] = (async () => {
          const ctx = getAudioContext();
          const withTailPath = buildSongPath(songId, file);
          const noTailPath = `/audio/no_tail/notail_${encodeURIComponent(file)}`;
          const candidatePaths = useWithTail
            ? [withTailPath]
            : songId === "mirage"
              ? [noTailPath, withTailPath]
              : [withTailPath];

          let lastError: Error | null = null;
          for (const path of candidatePaths) {
            try {
              const response = await fetch(path);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              const arrayBuffer = await response.arrayBuffer();
              const buffer = await ctx.decodeAudioData(arrayBuffer);
              buffers.current[key] = buffer;
              return buffer;
            } catch (error) {
              lastError =
                error instanceof Error
                  ? error
                  : new Error("Failed to load audio file");
            }
          }

          throw (
            lastError ??
            new Error(
              `Failed to load audio file for ${songId}/${file} (${useWithTail ? "with tail" : "no tail"})`,
            )
          );
        })();
      }
      return loading.current[key] as Promise<AudioBuffer>;
    },
    [getAudioContext],
  );

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

  const getCurrentCycle = (transport: {
    startTime: number;
    loopDuration: number;
  }) => {
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
    loopDurationSeconds: number,
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
    source.loopEnd = loopDurationSeconds;

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
    const buffer = await loadBuffer(songRef.current, file, true);
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

    const hasActiveTracks = soundFilesRef.current.some(
      (file) => activeRef.current[file],
    );
    if (!hasActiveTracks) return;

    schedulerRef.current = window.setInterval(() => {
      for (const file of soundFilesRef.current) {
        if (!activeRef.current[file]) continue;
        void scheduleWithTailTrack(file);
      }
    }, 100);
  };

  const startFile = async (file: SoundFile) => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    await loadBuffer(songRef.current, file, false);
    const buffer = await loadBuffer(songRef.current, file, mode === "withTail");
    if (!activeRef.current[file]) return;

    const transport = ensureTransport();
    if (mode === "notail") {
      const cycleStart =
        transport.startTime +
        getCurrentCycle(transport) * transport.loopDuration;
      const startAt = Math.max(ctx.currentTime + 0.01, cycleStart);
      const offset =
        cycleStart < ctx.currentTime ? ctx.currentTime - cycleStart : 0;
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

    const files = soundFilesRef.current;
    await Promise.all(
      files.map((file) => loadBuffer(songRef.current, file, false)),
    );

    const buffers = await Promise.all(
      files.map((file) =>
        loadBuffer(songRef.current, file, mode === "withTail"),
      ),
    );
    const startAt = ctx.currentTime + 0.08;
    transportRef.current = { startTime: startAt, loopDuration };

    files.forEach((file, index) => {
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
    const files = soundFilesRef.current;

    if (enabled) {
      const nextState = files.reduce((acc, file) => {
        acc[file] = true;
        return acc;
      }, {} as ToggleState);
      activeRef.current = nextState;
      setActive(nextState);
      void startAllSynchronized();
      return;
    }

    files.forEach((file) => {
      stopFile(file);
    });
    clearScheduler();
    const nextState = createInitialState(files);
    activeRef.current = nextState;
    setActive(nextState);
  };

  const switchMode = (newMode: "notail" | "withTail") => {
    soundFilesRef.current.forEach((file) => stopFile(file));
    clearScheduler();

    const nextState = createInitialState(soundFilesRef.current);
    activeRef.current = nextState;
    setActive(nextState);

    transportRef.current = null;

    setMode(newMode);
  };

  const switchSong = (newSong: SongId) => {
    if (newSong === songRef.current) return;

    soundFilesRef.current.forEach((file) => stopFile(file));
    clearScheduler();

    const nextFiles = SONGS[newSong].files;
    const nextState = createInitialState(nextFiles);
    activeRef.current = nextState;
    setActive(nextState);
    transportRef.current = null;

    setSong(newSong);
  };

  useEffect(() => {
    const loadReferenceDuration = async () => {
      const firstTrack = SONGS[song].files[0];
      if (!firstTrack) return;
      const buffer = await loadBuffer(song, firstTrack, true);
      setLoopDuration(buffer.duration);
    };
    void loadReferenceDuration();
  }, [loadBuffer, song]);

  useEffect(() => {
    return () => {
      soundFilesRef.current.forEach((file) => {
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
    <div className="w-screen min-h-screen flex flex-col items-center bg-white text-black p-8 relative">
      <Link href="/">
        <Button
          className="absolute top-8 left-8 border-4 border-black rounded-none font-bold uppercase tracking-widest"
          variant="secondary"
        >
          Back to Menu
        </Button>
      </Link>

      <div className="w-full max-w-6xl">
        <h1 className="text-5xl font-black uppercase text-center mb-4 tracking-widest border-b-8 border-black pb-4 pt-16">
          Audio Test Deck
        </h1>
        <p className="text-center font-bold uppercase tracking-wide mb-8">
          All tracks are phase-locked loop stems at fixed volume {LOOP_VOLUME}
        </p>

        <Card className="p-6 border-8 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="mb-6 p-4 border-4 border-black bg-gray-100">
            <div className="mb-4 border-b-4 border-black pb-4">
              <label
                className="block text-sm font-bold uppercase tracking-wide mb-3"
                htmlFor="song-pack-select"
              >
                Song Pack:
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  id="song-pack-select"
                  value={song}
                  onChange={(event) => switchSong(event.target.value as SongId)}
                  className="min-w-44 border-4 border-black bg-white px-3 py-2 text-sm font-bold uppercase tracking-wide"
                >
                  {Object.entries(SONGS).map(([id, config]) => (
                    <option key={id} value={id}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-bold uppercase tracking-wide">
                  {soundFiles.length} stems loaded
                </span>
              </div>
            </div>

            <p className="text-sm font-bold uppercase tracking-wide mb-3">
              Loop Mode:
            </p>
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
              <label
                className="block text-sm font-bold uppercase tracking-wide mb-3"
                htmlFor="loop-attack"
              >
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
              Status: {allEnabled ? "All On" : "Mixed"} | Song:{" "}
              {SONGS[song].label} | Mode:{" "}
              {mode === "notail"
                ? "No Tail (Perfect 8B)"
                : "With Tail (Looped)"}{" "}
              | Attack: {attack.toFixed(2)}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(() => {
              // Find common prefix for all files in the current song pack
              function getCommonPrefix(files: readonly string[]): string {
                if (files.length === 0) return "";
                // Find the most common prefix ending with space or underscore
                const prefixCounts: Record<string, number> = {};
                files.forEach((f) => {
                  const match = f.match(/^([a-zA-Z0-9_]+[ _])/);
                  if (match) {
                    const prefix = match[1];
                    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
                  }
                });
                let bestPrefix = "";
                let bestCount = 0;
                for (const prefix in prefixCounts) {
                  if (
                    prefixCounts[prefix] > bestCount &&
                    prefixCounts[prefix] > files.length / 2
                  ) {
                    bestPrefix = prefix;
                    bestCount = prefixCounts[prefix];
                  }
                }
                return bestPrefix;
              }
              const commonPrefix = getCommonPrefix(soundFiles);
              return soundFiles.map((file) => {
                const isOn = active[file];
                // Remove common prefix and .mp3, replace _ with space
                let displayName: string = file;
                if (commonPrefix && file.startsWith(commonPrefix)) {
                  displayName = file.slice(commonPrefix.length);
                }
                displayName = displayName
                  .replace(".mp3", "")
                  .replaceAll("_", " ");
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
                    <span>{displayName}</span>
                    <span>{isOn ? "ON" : "OFF"}</span>
                  </Button>
                );
              });
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
}
