"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMenuAudio } from "@/components/menu-audio-context";

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

const DEFAULT_LOOP_ATTACK = 0.07;
const DEFAULT_LOOP_DURATION = 8;
const DEFAULT_SONG = "mirage" as const;
const DEFAULT_VOLUME = 0.35;

type SongId = keyof typeof SONGS;
type SoundFile = string;
type TrackState = { enabled: boolean; volume: number };
type SequenceState = Record<SoundFile, TrackState>;
type AllSequencesState = Record<'A' | 'B' | 'C' | 'D', SequenceState>;

const SEQUENCE_BUTTONS = [
  { id: 'A', activeColor: 'bg-cyan-400', inactiveColor: 'bg-cyan-200' },
  { id: 'B', activeColor: 'bg-pink-400', inactiveColor: 'bg-pink-200' },
  { id: 'C', activeColor: 'bg-yellow-400', inactiveColor: 'bg-yellow-200' },
  { id: 'D', activeColor: 'bg-orange-400', inactiveColor: 'bg-orange-200' },
] as const;

function createInitialState(files: readonly SoundFile[]): SequenceState {
  return files.reduce((acc, file) => {
    acc[file] = { enabled: false, volume: DEFAULT_VOLUME };
    return acc;
  }, {} as SequenceState);
}

function getInitialSequences(songId: SongId): AllSequencesState {
  const files = SONGS[songId].files;
  return {
    A: createInitialState(files),
    B: files.reduce((acc, file) => { acc[file] = { enabled: true, volume: DEFAULT_VOLUME }; return acc; }, {} as SequenceState),
    C: files.reduce((acc, file, idx) => { acc[file] = { enabled: idx % 2 === 0, volume: DEFAULT_VOLUME }; return acc; }, {} as SequenceState),
    D: files.reduce((acc, file, idx) => { acc[file] = { enabled: idx < Math.floor(files.length / 2), volume: DEFAULT_VOLUME }; return acc; }, {} as SequenceState),
  };
}

function toFileKey(songId: SongId, file: SoundFile) {
  return `${songId}::${file}`;
}

function buildSongPath(songId: SongId, file: SoundFile) {
  return `/audio/${songId}/${encodeURIComponent(file)}`;
}

export default function AudioTestPage() {

  // Import menu audio hook
  const { pauseForGame, resumeFromGame } = useMenuAudio();

  // Mute menu music on mount, resume on unmount
  useEffect(() => {
    pauseForGame();
    return () => {
      resumeFromGame();
    };
  }, [pauseForGame, resumeFromGame]);

  const [song, setSong] = useState<SongId>(DEFAULT_SONG);
  const [sequences, setSequences] = useState<AllSequencesState>(() => getInitialSequences(DEFAULT_SONG));
  const [activeSequence, setActiveSequence] = useState<'A' | 'B' | 'C' | 'D' | null>('A');
  const [active, setActive] = useState<SequenceState>(() => sequences.A);
  
  const [loopDuration, setLoopDuration] = useState<number>(DEFAULT_LOOP_DURATION);
  const [attack, setAttack] = useState<number>(DEFAULT_LOOP_ATTACK);

  const [copiedSeq, setCopiedSeq] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [showVolume, setShowVolume] = useState(true);

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
  const activeRef = useRef<SequenceState>(active);
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
          const miragePath = `/audio/mirage/${encodeURIComponent(file)}`;
          // Mirage uses mirage files directly, otherwise falls back to standard
          const candidatePaths = songId === "mirage" ? [miragePath, withTailPath] : [withTailPath];

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
    
    const targetVolume = activeRef.current[file]?.volume ?? DEFAULT_VOLUME;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(targetVolume, startAt + attackRef.current);
    
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
    
    const targetVolume = activeRef.current[file]?.volume ?? DEFAULT_VOLUME;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(targetVolume, startAt + attackRef.current);
    
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
    if (!transportRef.current || !activeRef.current[file]?.enabled) return;
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
      soundFilesRef.current.forEach(file => { if (activeRef.current[file]?.enabled) void scheduleWithTailTrack(file); });
    }, 100);
  };

  const applySequence = async (newActive: SequenceState, seqKey?: 'A' | 'B' | 'C' | 'D' | null) => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    const oldActive = activeRef.current;
    activeRef.current = newActive;
    setActive(newActive);
    
    if (seqKey !== undefined) setActiveSequence(seqKey);

    const isNoTail = songRef.current === "mirage";
    const needsToPlay = soundFilesRef.current.some(f => newActive[f]?.enabled);

    if (needsToPlay && !transportRef.current) {
      transportRef.current = { startTime: ctx.currentTime + 0.08, loopDuration };
    }

    for (const file of soundFilesRef.current) {
      const wasOn = oldActive[file]?.enabled;
      const isNowOn = newActive[file]?.enabled;

      if (wasOn && !isNowOn) {
        stopFile(file);
      } else if (!wasOn && isNowOn) {
        void (async () => {
          const buffer = await loadBuffer(songRef.current, file);
          if (!activeRef.current[file]?.enabled) return; 
          
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
      } else if (wasOn && isNowOn && oldActive[file]?.volume !== newActive[file]?.volume) {
        const now = ctx.currentTime;
        if (loopGainsRef.current[file]) {
          loopGainsRef.current[file]!.gain.setTargetAtTime(newActive[file].volume, now, 0.05);
        }
        if (tailInstancesRef.current[file]) {
          tailInstancesRef.current[file]!.forEach(inst => {
            inst.gain.gain.setTargetAtTime(newActive[file].volume, now, 0.05);
          });
        }
      }
    }

    if (!needsToPlay) {
      clearScheduler();
      transportRef.current = null;
    } else if (!isNoTail) {
      if (!schedulerRef.current) syncScheduler();
    }
  };

  const hardResetAndApply = async (newActive: SequenceState, seqKey?: 'A' | 'B' | 'C' | 'D' | null) => {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();

    stopAllSound(); 
    clearScheduler();
    
    activeRef.current = newActive;
    setActive(newActive);
    if (seqKey !== undefined) setActiveSequence(seqKey);

    const enabledFiles = soundFilesRef.current.filter(f => newActive[f]?.enabled);
    if (enabledFiles.length === 0) {
      transportRef.current = null;
      return;
    }

    const buffers = await Promise.all(enabledFiles.map(f => loadBuffer(songRef.current, f)));
    const startAt = ctx.currentTime + 0.08;
    transportRef.current = { startTime: startAt, loopDuration };

    const isNoTail = songRef.current === "mirage";

    enabledFiles.forEach((file, i) => {
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
    const nextEnabled = !active[file].enabled;
    const nextState = { ...active, [file]: { ...active[file], enabled: nextEnabled } };
    
    if (activeSequence) {
      setSequences(prev => ({ ...prev, [activeSequence]: nextState }));
    }

    await applySequence(nextState, activeSequence);
  };

  const changeVolume = (file: SoundFile, newVolume: number) => {
    const nextState = { ...active, [file]: { ...active[file], volume: newVolume } };
    
    setActive(nextState);
    activeRef.current = nextState;

    if (activeSequence) {
      setSequences(prev => ({ ...prev, [activeSequence]: nextState }));
    }

    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    if (loopGainsRef.current[file]) {
      loopGainsRef.current[file]!.gain.setTargetAtTime(newVolume, now, 0.05);
    }
    
    if (tailInstancesRef.current[file]) {
      tailInstancesRef.current[file]!.forEach(inst => {
        inst.gain.gain.setTargetAtTime(newVolume, now, 0.05);
      });
    }
  };

  const handleSetAll = (enabled: boolean) => {
    const nextState = soundFilesRef.current.reduce((acc, f) => { 
      acc[f] = { enabled, volume: activeRef.current[f]?.volume ?? DEFAULT_VOLUME }; 
      return acc; 
    }, {} as SequenceState);

    if (activeSequence) {
      setSequences(prev => ({ ...prev, [activeSequence]: nextState }));
    }
    applySequence(nextState, activeSequence);
  };

  // Clipboard & Import Utilities
  const handleCopyCurrentSequence = () => {
    const textToCopy = `/* --- COPY-PASTE SEQUENCE (${activeSequence || 'CUSTOM'}) START --- */\n${JSON.stringify(activeRef.current, null, 2)}\n/* --- COPY-PASTE SEQUENCE END --- */`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSeq(true);
    setTimeout(() => setCopiedSeq(false), 2000);
  };

  const handleCopyAllSequences = () => {
    const textToCopy = `/* --- COPY-PASTE ALL SEQUENCES START --- */\n${JSON.stringify(sequences, null, 2)}\n/* --- COPY-PASTE ALL SEQUENCES END --- */`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleImportConfig = async () => {
    try {
      setImportError("");
      // Strip out the /* ... */ comments generated by our copy methods
      const cleanText = importText.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!cleanText) throw new Error("No valid JSON found in your paste.");

      const parsed = JSON.parse(cleanText);

      // Simple heuristic: Does it contain "A" and "B" blocks? If so, it's an "All Sequences" export.
      if (parsed.A && parsed.B) {
        setSequences(parsed);
        if (activeSequence && parsed[activeSequence]) {
          await hardResetAndApply(parsed[activeSequence], activeSequence);
        } else {
          await hardResetAndApply(parsed.A, 'A');
        }
      } else {
        // Otherwise, it's a single sequence. Apply it to the currently active letter slot.
        const targetSeqKey = activeSequence || 'A';
        setSequences(prev => ({ ...prev, [targetSeqKey]: parsed }));
        await hardResetAndApply(parsed, targetSeqKey);
      }

      setShowImport(false);
      setImportText("");
    } catch (err) {
      console.error("Config Parse Error:", err);
      setImportError("Failed to load config. Ensure you copied the full block properly.");
    }
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
    <div className="w-screen min-h-screen flex flex-col items-center bg-white text-black p-4 sm:p-8 relative">
      <Link href="/">
        <Button className="absolute top-4 left-4 sm:top-8 sm:left-8 border-4 border-black rounded-none font-bold uppercase tracking-widest" variant="secondary">
          Back to Menu
        </Button>
      </Link>

      <div className="w-full max-w-6xl mt-12 sm:mt-0">
        <h1 className="text-4xl sm:text-5xl font-black uppercase text-center mb-4 tracking-widest border-b-8 border-black pb-4 pt-4 sm:pt-16">
          Audio Test Deck
        </h1>

        <Card className="p-4 sm:p-5 border-8 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white">
          
          {/* Top Row: Song Selection + Config Operations */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SONGS) as SongId[]).map(id => (
                <Button key={id} onClick={() => { 
                    if (song === id) return;
                    setSong(id); 
                    
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

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-2 border-black rounded-none uppercase font-black text-xs h-8" onClick={() => setShowImport(!showImport)}>
                {showImport ? "Close Import" : "Load Config"}
              </Button>
              <Button variant="outline" className="border-2 border-black rounded-none uppercase font-black text-xs h-8" onClick={handleCopyCurrentSequence}>
                {copiedSeq ? "Copied!" : "Copy Active Seq"}
              </Button>
              <Button variant="outline" className="border-2 border-black rounded-none uppercase font-black text-xs h-8" onClick={handleCopyAllSequences}>
                {copiedAll ? "Copied!" : "Copy All Seqs"}
              </Button>
            </div>
          </div>

          {/* Import Overlay */}
          {showImport && (
            <div className="mb-4 p-3 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-sm font-black uppercase mb-2 tracking-wide">Paste Config Code:</div>
              <textarea 
                className="w-full h-32 p-3 font-mono text-xs border-2 border-black focus:outline-none focus:ring-0 bg-zinc-50"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste the sequence block here..."
              />
              {importError && <div className="text-red-600 font-bold text-xs mt-2 uppercase">{importError}</div>}
              <div className="flex justify-end gap-2 mt-3">
                <Button className="border-2 border-black rounded-none uppercase font-black text-xs h-8 bg-green-400 text-black hover:bg-green-300" onClick={handleImportConfig}>
                  Apply Config
                </Button>
              </div>
            </div>
          )}

          {/* Sequences & Controls Panel */}
          <div className="flex flex-col gap-2 mb-4 bg-zinc-50 p-3 border-4 border-black">
            <div className="flex flex-wrap items-center gap-2">
              <Button className="border-4 border-black rounded-none uppercase font-black tracking-widest bg-primary text-primary-foreground" onClick={() => handleSetAll(true)}>
                Start All
              </Button>
              <Button className="border-4 border-black rounded-none uppercase font-black tracking-widest" variant="destructive" onClick={() => handleSetAll(false)}>
                Stop All
              </Button>
              <Button 
                className="border-4 border-black rounded-none uppercase font-black tracking-widest bg-white text-black hover:bg-zinc-200" 
                onClick={() => setShowVolume(!showVolume)}
              >
                {showVolume ? "Hide Vol" : "Show Vol"}
              </Button>
              
              <div className="flex gap-2 ml-auto items-center mr-2">
                <label className="hidden sm:block text-xs font-bold uppercase tracking-wide mr-2">Fade: {attack.toFixed(2)}s</label>
                <input type="range" min="0" max="0.25" step="0.005" value={attack} onChange={(e) => setAttack(Number(e.target.value))} className="w-24 sm:w-auto accent-black" />
              </div>

              <div className="flex gap-2 items-center">
                {/* On mobile, split C and D to a new row */}
                <div className="flex gap-2 items-center w-full flex-wrap sm:flex-nowrap">
                  {SEQUENCE_BUTTONS.slice(0,2).map(({ id, activeColor, inactiveColor }) => {
                    const isActive = activeSequence === id;
                    return (
                      <Button 
                        key={id}
                        className={`border-4 border-black rounded-none uppercase font-black tracking-widest text-black transition-all ${
                          isActive 
                            ? `${activeColor} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 scale-105 z-10` 
                            : `${inactiveColor} opacity-60 hover:opacity-100 hover:-translate-y-0.5 px-3`
                        }`} 
                        onClick={() => applySequence(sequences[id as keyof AllSequencesState], id as keyof AllSequencesState)}
                      >
                        Seq {id}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex gap-2 items-center w-full flex-wrap sm:flex-nowrap mt-2 sm:mt-0">
                  {SEQUENCE_BUTTONS.slice(2).map(({ id, activeColor, inactiveColor }) => {
                    const isActive = activeSequence === id;
                    return (
                      <Button 
                        key={id}
                        className={`border-4 border-black rounded-none uppercase font-black tracking-widest text-black transition-all ${
                          isActive 
                            ? `${activeColor} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 scale-105 z-10` 
                            : `${inactiveColor} opacity-60 hover:opacity-100 hover:-translate-y-0.5 px-3`
                        }`} 
                        onClick={() => applySequence(sequences[id as keyof AllSequencesState], id as keyof AllSequencesState)}
                      >
                        Seq {id}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Track Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2">
            {soundFiles.map(file => {
              const isOn = active[file]?.enabled ?? false;
              const vol = active[file]?.volume ?? DEFAULT_VOLUME;
              // Clean up the name for display
              const displayName = file
                .replace(/^groova\s+/i, "")
                .replace(/^notail_/i, "")
                .replace(".mp3", "")
                .replaceAll("_", " ");

              return (
                <div key={file} className={`flex flex-col border-4 border-black rounded-none ${isOn ? "bg-primary text-primary-foreground" : "bg-white text-black"}`}>
                  <button onClick={() => toggleFile(file)}
                    className="flex justify-between items-center w-full px-3 py-2 uppercase font-black tracking-wide hover:bg-black/10 transition-colors focus:outline-none h-full">
                    <span className="truncate pr-2">{displayName}</span>
                    <span className="flex items-center gap-2 text-right">
                      {!showVolume && <span className="text-xs font-mono opacity-80">VOL:{Math.round(vol * 100)}%</span>}
                      <span>{isOn ? "ON" : "OFF"}</span>
                    </span>
                  </button>
                  {showVolume && (
                    <div className={`flex items-center gap-2 px-3 py-2 border-t ${isOn ? "border-white/30" : "border-black/10"}`}>
                      <span className="text-xs font-bold opacity-80">VOL</span>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.01" 
                        value={vol} 
                        onChange={(e) => changeVolume(file, Number(e.target.value))}
                        className="w-full h-2 bg-black/20 appearance-none cursor-pointer" 
                      />
                      <span className="text-xs font-mono font-bold opacity-80 w-8 text-right">
                        {Math.round(vol * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </Card>
      </div>
    </div>
  );
}