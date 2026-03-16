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
      "dubsnare_pair.mp3",
      "dub_blip.mp3",
      "forest_birds.mp3",
      "happy_melody.mp3",
      "jersey_snare.mp3",
      "onbeat_step.mp3",
      "rims.mp3",
      "shakers1.mp3",
      "shakers2.mp3",
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
      "bass pt1.mp3",
      "bass pt2.mp3",
      "clap.mp3",
      "conga roll.mp3",
      "conga.mp3",
      "kick low.mp3",
      "kick top.mp3",
      "open hat.mp3",
      "synth bass.mp3",
      "tambourine.mp3",
      "vox.mp3",
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

function getInitialSequences(songId: SongId) {
  const files = SONGS[songId].files;
  return {
    A: createInitialState(files),
    B: files.reduce((acc, file) => { acc[file] = true; return acc; }, {} as ToggleState),
    C: files.reduce((acc, file, idx) => { acc[file] = idx % 2 === 0; return acc; }, {} as ToggleState),
    D: files.reduce((acc, file, idx) => { acc[file] = idx < Math.floor(files.length / 2); return acc; }, {} as ToggleState),
  };
}

function toFileKey(songId: SongId, file: SoundFile) {
  return `${songId}::${file}`;
}

function buildSongPath(songId: SongId, file: SoundFile) {
  return `/audio/${songId}/${encodeURIComponent(file)}`;
}

export default function AudioTestPage() {
  const [song, setSong] = useState<SongId>(DEFAULT_SONG);
  const [sequences, setSequences] = useState(() => getInitialSequences(DEFAULT_SONG));
  const [activeSequence, setActiveSequence] = useState<'A' | 'B' | 'C' | 'D' | null>('A');
  const [active, setActive] = useState<ToggleState>(() => sequences.A);
  
  const [loopDuration, setLoopDuration] = useState<number>(DEFAULT_LOOP_DURATION);
  const [attack, setAttack] = useState<number>(DEFAULT_LOOP_ATTACK);

  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<string, AudioBuffer>>>({});
  const loadingRef = useRef<Partial<Record<string, Promise<AudioBuffer>>>>({});
  
  const loopSourcesRef = useRef<Partial<Record<SoundFile, AudioBufferSourceNode>>>({});
  const loopGainsRef = useRef<Partial<Record<SoundFile, GainNode>>>({});
  const tailInstancesRef = useRef<Partial<Record<SoundFile, Array<{ source: AudioBufferSourceNode; gain: GainNode }>>>>({});
  
  const nextCycleRef = useRef<Partial<Record<SoundFile, number>>>({});
  const schedulerRef = useRef<number | null>(null);
  const transportRef = useRef<{ startTime: number; loopDuration: number } | null>(null);

  const soundFiles = useMemo(() => SONGS[song].files, [song]);
  const activeRef = useRef<ToggleState>(active);
  const soundFilesRef = useRef<readonly SoundFile[]>(soundFiles);
  const attackRef = useRef<number>(attack);
  const songRef = useRef<SongId>(song);

  // Sync refs for audio callbacks
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { soundFilesRef.current = soundFiles; }, [soundFiles]);
  useEffect(() => { attackRef.current = attack; }, [attack]);
  useEffect(() => { songRef.current = song; }, [song]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    return audioContextRef.current;
  }, []);

  const loadBuffer = useCallback(async (songId: SongId, file: SoundFile) => {
    const key = toFileKey(songId, file);

    if (buffersRef.current[key]) return buffersRef.current[key] as AudioBuffer;
    if (!loadingRef.current[key]) {
      loadingRef.current[key] = (async () => {
        const ctx = getAudioContext();
        const withTailPath = buildSongPath(songId, file);
        const noTailPath = `/audio/no_tail/notail_${encodeURIComponent(file)}`;
        
        // Mirage defaults to no_tail files if available, otherwise falls back to standard
        const candidatePaths = songId === "mirage" ? [noTailPath, withTailPath] : [withTailPath];

        let lastError: Error | null = null;
        for (const path of candidatePaths) {
          try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            buffersRef.current[key] = buffer;
            return buffer;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error("Failed to load audio file");
          }
        }
        throw lastError ?? new Error(`Failed to load audio file for ${songId}/${file}`);
      })();
    }
    return loadingRef.current[key] as Promise<AudioBuffer>;
  }, [getAudioContext]);

  const stopFile = (file: SoundFile) => {
    loopSourcesRef.current[file]?.stop();
    loopSourcesRef.current[file]?.disconnect();
    delete loopSourcesRef.current[file];
    loopGainsRef.current[file]?.disconnect();
    delete loopGainsRef.current[file];

    tailInstancesRef.current[file]?.forEach(inst => {
      try { inst.source.stop(); } catch {}
      inst.source.disconnect();
      inst.gain.disconnect();
    });
    delete tailInstancesRef.current[file];
    delete nextCycleRef.current[file];
  };

  const stopAllSound = () => {
    Object.keys(loopSourcesRef.current).forEach(stopFile);
    Object.keys(tailInstancesRef.current).forEach(stopFile);
  };

  const clearScheduler = () => {
    if (schedulerRef.current) {
      window.clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
  };

  const startLoopingSource = (file: SoundFile, buffer: AudioBuffer, loopDurationSeconds: number, startAt: number, offset: number) => {
    const ctx = getAudioContext();
    stopFile(file); // Ensure any old instance is killed
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = loopDurationSeconds;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(LOOP_VOLUME, startAt + attackRef.current);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(startAt, offset);
    loopSourcesRef.current[file] = source;
    loopGainsRef.current[file] = gain;
  };

  const startTailInstance = (file: SoundFile, buffer: AudioBuffer, startAt: number, offset: number) => {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(LOOP_VOLUME, startAt + attackRef.current);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(startAt, offset);
    const inst = { source, gain };
    tailInstancesRef.current[file] = [...(tailInstancesRef.current[file] || []), inst];
    source.onended = () => {
      tailInstancesRef.current[file] = (tailInstancesRef.current[file] || []).filter(i => i !== inst);
      source.disconnect();
      gain.disconnect();
    };
  };

  const scheduleWithTailTrack = async (file: SoundFile) => {
    const ctx = getAudioContext();
    if (!transportRef.current || !activeRef.current[file]) return;
    const buffer = await loadBuffer(songRef.current, file);
    const now = ctx.currentTime;
    const cycle = nextCycleRef.current[file] ?? Math.floor((now - transportRef.current.startTime) / transportRef.current.loopDuration);
    const cycleStart = transportRef.current.startTime + cycle * transportRef.current.loopDuration;

    if (cycleStart <= now + 0.5) {
      startTailInstance(file, buffer, Math.max(cycleStart, now + 0.01), cycleStart < now ? now - cycleStart : 0);
      nextCycleRef.current[file] = cycle + 1;
    }
  };

  const syncScheduler = () => {
    clearScheduler();
    if (songRef.current === "mirage") return; // Mirage uses the perfect no-tail loop natively
    
    schedulerRef.current = window.setInterval(() => {
      soundFilesRef.current.forEach(file => { if (activeRef.current[file]) void scheduleWithTailTrack(file); });
    }, 100);
  };

  // Soft Sequence Transition - Synchronizes new tracks into the existing playing mix
  const applySequence = async (newActive: ToggleState, seqKey?: 'A' | 'B' | 'C' | 'D' | null) => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    const oldActive = activeRef.current;
    activeRef.current = newActive;
    setActive(newActive);
    
    if (seqKey !== undefined) setActiveSequence(seqKey);

    const isNoTail = songRef.current === "mirage";
    const needsToPlay = soundFilesRef.current.some(f => newActive[f]);

    // Initialize transport if it's the first track being enabled
    if (needsToPlay && !transportRef.current) {
      transportRef.current = { startTime: ctx.currentTime + 0.08, loopDuration };
    }

    for (const file of soundFilesRef.current) {
      const wasOn = oldActive[file];
      const isNowOn = newActive[file];

      if (wasOn && !isNowOn) {
        stopFile(file); // Turn off the track
      } else if (!wasOn && isNowOn) {
        // Sync the track immediately to the ongoing mix
        void (async () => {
          const buffer = await loadBuffer(songRef.current, file);
          if (!activeRef.current[file]) return; // Cancel if toggled off quickly
          
          const transport = transportRef.current!;
          const now = ctx.currentTime;
          const cycle = Math.floor((now - transport.startTime) / transport.loopDuration);
          const cycleStart = transport.startTime + cycle * transport.loopDuration;
          const startAt = Math.max(now + 0.01, cycleStart);
          const offset = cycleStart < now ? now - cycleStart : 0;

          if (isNoTail) {
            startLoopingSource(file, buffer, loopDuration, startAt, offset);
          } else {
            nextCycleRef.current[file] = cycle;
            void scheduleWithTailTrack(file);
          }
        })();
      }
    }

    // Handle global scheduling state
    if (!needsToPlay) {
      clearScheduler();
      transportRef.current = null; // Clean slate when all tracks stop
    } else if (!isNoTail) {
      if (!schedulerRef.current) syncScheduler();
    }
  };

  // Hard Reset - Destroys transport and restarts audio context (used for changing songs)
  const hardResetAndApply = async (newActive: ToggleState, seqKey?: 'A' | 'B' | 'C' | 'D' | null) => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    stopAllSound(); // Purge old songs perfectly
    clearScheduler();
    
    activeRef.current = newActive;
    setActive(newActive);
    if (seqKey !== undefined) setActiveSequence(seqKey);

    const enabled = soundFilesRef.current.filter(f => newActive[f]);
    if (enabled.length === 0) {
      transportRef.current = null;
      return;
    }

    const buffers = await Promise.all(enabled.map(f => loadBuffer(songRef.current, f)));
    const startAt = ctx.currentTime + 0.08;
    transportRef.current = { startTime: startAt, loopDuration };

    const isNoTail = songRef.current === "mirage";

    enabled.forEach((file, i) => {
      if (isNoTail) {
        startLoopingSource(file, buffers[i], loopDuration, startAt, 0);
      } else {
        nextCycleRef.current[file] = 0;
        startTailInstance(file, buffers[i], startAt, 0);
        nextCycleRef.current[file] = 1;
      }
    });
    
    if (!isNoTail) syncScheduler();
  };

  const toggleFile = async (file: SoundFile) => {
    const nextEnabled = !active[file];
    const nextState = { ...active, [file]: nextEnabled };
    
    if (activeSequence) {
      setSequences(prev => ({ ...prev, [activeSequence]: nextState }));
    }

    await applySequence(nextState, activeSequence);
  };

  const handleSetAll = (enabled: boolean) => {
    const nextState = soundFilesRef.current.reduce((acc, f) => { acc[f] = enabled; return acc; }, {} as ToggleState);
    if (activeSequence) {
      setSequences(prev => ({ ...prev, [activeSequence]: nextState }));
    }
    applySequence(nextState, activeSequence);
  };

  useEffect(() => {
    const loadRef = async () => {
      const first = SONGS[song].files[0];
      if (first) {
        const buf = await loadBuffer(song, first);
        setLoopDuration(buf.duration);
      }
    };
    void loadRef();
  }, [song, loadBuffer]);

  return (
    <div className="w-screen min-h-screen flex flex-col items-center bg-white text-black p-8 relative">
      <Link href="/">
        <Button className="absolute top-8 left-8 border-4 border-black rounded-none font-bold uppercase tracking-widest" variant="secondary">
          Back to Menu
        </Button>
      </Link>

      <div className="w-full max-w-6xl">
        <h1 className="text-5xl font-black uppercase text-center mb-4 tracking-widest border-b-8 border-black pb-4 pt-16">
          Audio Test Deck
        </h1>

        <Card className="p-6 border-8 border-black rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SONGS) as SongId[]).map(id => (
                <Button key={id} onClick={() => { 
                    if (song === id) return;
                    setSong(id); 
                    
                    // Immediately update references to guarantee hard reset uses new song files
                    songRef.current = id;
                    soundFilesRef.current = SONGS[id].files;
                    
                    const newSeqs = getInitialSequences(id);
                    setSequences(newSeqs);
                    hardResetAndApply(newSeqs.A, 'A'); 
                  }} 
                  className={`border-4 border-black rounded-none uppercase font-black ${song === id ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-100"}`}>
                  {SONGS[id].label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6 bg-zinc-50 p-4 border-4 border-black">
            <Button className="border-4 border-black rounded-none uppercase font-black tracking-widest bg-primary text-primary-foreground" onClick={() => handleSetAll(true)}>
              Start All
            </Button>
            <Button className="border-4 border-black rounded-none uppercase font-black tracking-widest" variant="destructive" onClick={() => handleSetAll(false)}>
              Stop All
            </Button>
            
            {/* Sequence Selector Buttons */}
            <div className="flex gap-2 ml-auto">
              <Button className={`border-4 border-black rounded-none uppercase font-black tracking-widest text-black hover:bg-cyan-200 text-xs px-3 ${activeSequence === 'A' ? 'bg-cyan-500' : 'bg-cyan-300'}`} onClick={() => applySequence(sequences.A, 'A')}>
                Seq A
              </Button>
              <Button className={`border-4 border-black rounded-none uppercase font-black tracking-widest text-black hover:bg-pink-200 text-xs px-3 ${activeSequence === 'B' ? 'bg-pink-500' : 'bg-pink-300'}`} onClick={() => applySequence(sequences.B, 'B')}>
                Seq B
              </Button>
              <Button className={`border-4 border-black rounded-none uppercase font-black tracking-widest text-black hover:bg-yellow-200 text-xs px-3 ${activeSequence === 'C' ? 'bg-yellow-500' : 'bg-yellow-300'}`} onClick={() => applySequence(sequences.C, 'C')}>
                Seq C
              </Button>
              <Button className={`border-4 border-black rounded-none uppercase font-black tracking-widest text-black hover:bg-orange-200 text-xs px-3 ${activeSequence === 'D' ? 'bg-orange-500' : 'bg-orange-300'}`} onClick={() => applySequence(sequences.D, 'D')}>
                Seq D
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {soundFiles.map(file => (
              <Button key={file} onClick={() => toggleFile(file)}
                className={`justify-between border-4 border-black rounded-none uppercase font-black tracking-wide ${active[file] ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white text-black hover:bg-zinc-100"}`}>
                <span>{file.replace(".mp3", "").replaceAll("_", " ")}</span>
                <span>{active[file] ? "ON" : "OFF"}</span>
              </Button>
            ))}
          </div>

          <div className="mt-8 border-t-4 border-black pt-4">
            <label className="block text-sm font-bold uppercase tracking-wide mb-3">Attack: {attack.toFixed(2)}s</label>
            <input type="range" min="0" max="0.25" step="0.005" value={attack} onChange={(e) => setAttack(Number(e.target.value))} className="w-full max-w-sm accent-black" />
          </div>
        </Card>
      </div>
    </div>
  );
}