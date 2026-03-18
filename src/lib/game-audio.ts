import { getAudioSettings } from "@/lib/audio-settings";

type TrackConfig = {
  src: string;
  volume: number;
  enabled?: boolean;
  minRound?: number;           // The track won't be randomly revealed before this round
  forceEnableAtRound?: number; // The track will automatically turn on at this round
};

type SongConfig = {
  id: string;
  tracks: Record<string, TrackConfig>;
};

const SONGS: SongConfig[] = [
  {
    id: "mirage",
    tracks: {
      "4x4_kick.mp3": { src: "/audio/mirage/4x4_kick.mp3", volume: 0.75 },
      "conflict_bongos.mp3": {
        src: "/audio/mirage/conflict_bongos.mp3",
        volume: 0.35,
      },
      "dubsnare_pair.mp3": {
        src: "/audio/mirage/dubsnare_pair.mp3",
        volume: 0.5,
      },
      "dub_blip.mp3": { src: "/audio/mirage/dub_blip.mp3", volume: 0.55 },
      "forest_birds.mp3": {
        src: "/audio/mirage/forest_birds.mp3",
        volume: 0.3,
      },
      "happy_melody.mp3": {
        src: "/audio/mirage/happy_melody.mp3",
        volume: 0.4,
      },
      "jersey_snare.mp3": {
        src: "/audio/mirage/jersey_snare.mp3",
        volume: 0.6,
      },
      "onbeat_step.mp3": { src: "/audio/mirage/onbeat_step.mp3", volume: 0.5 },
      "rims.mp3": { src: "/audio/mirage/rims.mp3", volume: 0.7 },
      "shakers1.mp3": { src: "/audio/mirage/shakers1.mp3", volume: 0.4 },
      "shakers2.mp3": { src: "/audio/mirage/shakers2.mp3", volume: 0.4 },
      "stepper_hats.mp3": {
        src: "/audio/mirage/stepper_hats.mp3",
        volume: 0.35,
      },
      "stepper_snare.mp3": {
        src: "/audio/mirage/stepper_snare.mp3",
        volume: 0.55,
      },
      "tom_plinks.mp3": { src: "/audio/mirage/tom_plinks.mp3", volume: 0.65 },
      "triplet_kick.mp3": {
        src: "/audio/mirage/triplet_kick.mp3",
        volume: 0.75,
      },
      "warm_pad.mp3": { src: "/audio/mirage/warm_pad.mp3", volume: 0.3 },
    },
  },
  {
    id: "conga",
    tracks: {
      "bass pt1.mp3": { src: "/audio/conga/bass pt1.mp3", volume: 0.35 },
      "bass pt2.mp3": { src: "/audio/conga/bass pt2.mp3", volume: 0.35 },
      "clap.mp3": { src: "/audio/conga/clap.mp3", volume: 0.35 },
      "conga roll.mp3": { src: "/audio/conga/conga roll.mp3", volume: 0.35 },
      "conga.mp3": { src: "/audio/conga/conga.mp3", volume: 0.35 },
      "kick low.mp3": { src: "/audio/conga/kick low.mp3", volume: 0.35 },
      "kick top.mp3": { src: "/audio/conga/kick top.mp3", volume: 0.35 },
      "open hat.mp3": { src: "/audio/conga/open hat.mp3", volume: 0.35 },
      "synth bass.mp3": { src: "/audio/conga/synth bass.mp3", volume: 0.35 },
      "tambourine.mp3": { src: "/audio/conga/tambourine.mp3", volume: 0.35 },
      "vox.mp3": { src: "/audio/conga/vox.mp3", volume: 0.35 },
    },
  },
  {
    id: "groova",
    tracks: {
      "groova chord.mp3": { src: "/audio/groova/groova chord.mp3", enabled: false, volume: 0.35 },
      "groova clap.mp3": { src: "/audio/groova/groova clap.mp3", enabled: false, volume: 0.35 },
      "groova conga.mp3": { src: "/audio/groova/groova conga.mp3", enabled: true, volume: 0.35 },
      "groova conga2.mp3": { src: "/audio/groova/groova conga2.mp3", enabled: false, volume: 0.35 },
      "groova cowbell.mp3": { src: "/audio/groova/groova cowbell.mp3", enabled: false, volume: 0.22 },
      "groova dronepad.mp3": { src: "/audio/groova/groova dronepad.mp3", enabled: false, volume: 0.35 },
      "groova epaino_low.mp3": { src: "/audio/groova/groova epaino_low.mp3", enabled: false, volume: 0.35 },
      "groova epiano_high.mp3": { src: "/audio/groova/groova epiano_high.mp3", enabled: false, volume: 0.35 },
      "groova hats.mp3": { src: "/audio/groova/groova hats.mp3", enabled: false, volume: 0.14 },
      "groova horn.mp3": { src: "/audio/groova/groova horn.mp3", enabled: false, volume: 0.22 },
      "groova kick.mp3": { src: "/audio/groova/groova kick.mp3", enabled: false, volume: 0.18, forceEnableAtRound: 3 },
      "groova m1_high.mp3": { src: "/audio/groova/groova m1_high.mp3", enabled: true, volume: 0.26 },
      "groova organ.mp3": { src: "/audio/groova/groova organ.mp3", enabled: true, volume: 0.14 },
      "groova perc.mp3": { src: "/audio/groova/groova perc.mp3", enabled: false, volume: 0.35 },
      "groova perfect stab.mp3": { src: "/audio/groova/groova perfect stab.mp3", enabled: false, volume: 0.35, minRound: 5 },
      "groova perfect.mp3": { src: "/audio/groova/groova perfect.mp3", enabled: false, volume: 0.35, minRound: 5 },
      "groova plink1.mp3": { src: "/audio/groova/groova plink1.mp3", enabled: false, volume: 0.35 },
      "groova shaker.mp3": { src: "/audio/groova/groova shaker.mp3", enabled: false, volume: 0.1 },
      "groova snare-1.mp3": { src: "/audio/groova/groova snare-1.mp3", enabled: false, volume: 0.35 },
      "groova snare.mp3": { src: "/audio/groova/groova snare.mp3", enabled: false, volume: 0.35 },
      "groova synth.mp3": { src: "/audio/groova/groova synth.mp3", enabled: false, volume: 0.35 },
      "groova synthstabs.mp3": { src: "/audio/groova/groova synthstabs.mp3", enabled: false, volume: 0.35 },
      "groova toms.mp3": { src: "/audio/groova/groova toms.mp3", enabled: false, volume: 0.35 },
      "groova vox.mp3": { src: "/audio/groova/groova vox.mp3", enabled: true, volume: 0.22 },
      "groova wub1.mp3": { src: "/audio/groova/groova wub1.mp3", enabled: false, volume: 0.35 }
    },
  },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickSongForRound(
  roundNumber: number,
  usedSongIds: Set<string>,
): SongConfig {
  const available = SONGS.filter((s) => !usedSongIds.has(s.id));
  const pool = available.length > 0 ? available : SONGS;
  void roundNumber;
  return pool[Math.floor(Math.random() * pool.length)];
}

export class GameAudioController {
      // Start enabled and force-enabled tracks
      private startEnabledTracks(currentRound: number): void {
        if (!this.ctx || !this.playbackScheduled || !this.currentSong) return;
        const now = this.ctx.currentTime;
        // Find all tracks that are enabled by default OR have reached their forceEnable round
        const enabledTracks = this.currentTrackIds.filter((trackId) => {
          const config = this.currentSong!.tracks[trackId];
          return config.enabled || (config.forceEnableAtRound && currentRound >= config.forceEnableAtRound);
        });
        for (const trackId of enabledTracks) {
          if (this.unlockedTracks.has(trackId)) continue;
          this.unlockedTracks.add(trackId);
          const gain = this.gains.get(trackId);
          if (!gain) continue;
          const trackVolume = this.currentSong!.tracks[trackId].volume;
          gain.gain.cancelScheduledValues(now);
          gain.gain.linearRampToValueAtTime(trackVolume, now + 0.5);
        }
      }
    // Listen for audio settings changes
    private volumeChangeHandler = () => this.updateVolume();

    constructor() {
      if (typeof window !== "undefined") {
        window.addEventListener("vmb:audio-settings-changed", this.volumeChangeHandler);
      }
    }
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private rawBuffers = new Map<string, ArrayBuffer>();
  private decodedBuffers = new Map<string, AudioBuffer>();
  private sources = new Map<string, AudioBufferSourceNode>();
  private gains = new Map<string, GainNode>();

  private currentSong: SongConfig | null = null;
  private currentTrackIds: string[] = [];
  private revealQueue: string[] = [];
  private unlockedTracks = new Set<string>();
  private usedSongIds = new Set<string>();

  private loopDuration = 8;
  private loadComplete = false;
  private playbackScheduled = false;
  private paused = false;
  private pendingTrackCount = 0;

  private interactionHandler: (() => void) | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 22000;
      this.filter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.updateVolume();
    }
    return this.ctx;
  }

  private async decodeAll(): Promise<void> {
    const ctx = this.getContext();
    await Promise.all(
      Array.from(this.rawBuffers.entries()).map(async ([trackId, raw]) => {
        try {
          const buf = await ctx.decodeAudioData(raw.slice(0));
          this.decodedBuffers.set(trackId, buf);
        } catch (err) {
          console.warn(`[GameAudio] decode failed for "${trackId}":`, err);
        }
      }),
    );
  }

  private scheduleAllSources(): void {
    if (this.playbackScheduled) return;
    const ctx = this.ctx!;
    const startAt = ctx.currentTime + 0.05;
    this.playbackScheduled = true;

    for (const trackId of this.currentTrackIds) {
      const buffer = this.decodedBuffers.get(trackId);
      if (!buffer) continue;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = this.loopDuration;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(gain);
      gain.connect(this.filter as BiquadFilterNode);
      source.start(startAt, 0);

      this.sources.set(trackId, source);
      this.gains.set(trackId, gain);
    }
  }

  private stopCurrentSources(): void {
    for (const source of this.sources.values()) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
    }
    for (const gain of this.gains.values()) {
      gain.disconnect();
    }
    this.sources.clear();
    this.gains.clear();
    this.unlockedTracks.clear();
    this.playbackScheduled = false;
  }

  private tryBeginPlayback(): void {
    if (!this.loadComplete) return;
    if (!this.ctx || this.ctx.state === "suspended") return;
    if (this.playbackScheduled) return;

    this.scheduleAllSources();
    this.applyFilterState();
  }

  private applyFilterState(): void {
    if (!this.filter || !this.ctx) return;
    this.filter.frequency.setTargetAtTime(
      this.paused ? 800 : 22000,
      this.ctx.currentTime,
      0.1,
    );
  }

  updateVolume(): void {
    if (!this.masterGain) return;
    const settings = getAudioSettings();
    this.masterGain.gain.value =
      settings.masterVolume * settings.musicVolume * 1.3;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.applyFilterState();
  }

  async loadRound(roundNumber: number): Promise<void> {
    this.stopCurrentSources();
    this.rawBuffers.clear();
    this.decodedBuffers.clear();
    this.loadComplete = false;
    this.playbackScheduled = false;
    this.pendingTrackCount = 0;

    if (this.interactionHandler) {
      window.removeEventListener("pointerdown", this.interactionHandler);
      window.removeEventListener("keydown", this.interactionHandler);
      this.interactionHandler = null;
    }

    const song = pickSongForRound(roundNumber, this.usedSongIds);
    this.currentSong = song;
    this.usedSongIds.add(song.id);
    this.currentTrackIds = Object.keys(song.tracks);
    // Filter the queue based on our new rules
    const tracksToQueue = this.currentTrackIds.filter((trackId) => {
      const config = song.tracks[trackId];
      // 1. Exclude if it's already playing (enabled by default or force-enabled this round)
      const isPlaying = config.enabled || (config.forceEnableAtRound && roundNumber >= config.forceEnableAtRound);
      if (isPlaying) return false;
      // 2. Exclude if we haven't reached the minimum round for it to be randomly revealed
      if (config.minRound && roundNumber < config.minRound) return false;
      return true;
    });
    this.revealQueue = shuffle(tracksToQueue);

    await Promise.all(
      this.currentTrackIds.map(async (trackId) => {
        const config = song.tracks[trackId];
        try {
          const res = await fetch(config.src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const raw = await res.arrayBuffer();
          this.rawBuffers.set(trackId, raw);
        } catch (err) {
          console.warn(`[GameAudio] Failed to fetch "${trackId}":`, err);
        }
      }),
    );

    if (this.rawBuffers.size === 0) {
      console.warn("[GameAudio] No buffers loaded, aborting.");
      return;
    }

    this.loadComplete = true;

    const onInteraction = async () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      this.interactionHandler = null;

      const ctx = this.getContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      if (this.decodedBuffers.size === 0) {
        await this.decodeAll();
      }

      const firstBuf = this.decodedBuffers.values().next().value as
        | AudioBuffer
        | undefined;
      if (firstBuf) this.loopDuration = firstBuf.duration;

      this.tryBeginPlayback();
      // Start the manually enabled and force-enabled tracks
      this.startEnabledTracks(roundNumber);
      // Start any extra pending tracks (if required by round logic)
      if (this.pendingTrackCount > 0) {
        this.startTracks(this.pendingTrackCount);
        this.pendingTrackCount = 0;
      }
    };

    this.interactionHandler = onInteraction;

    if (this.ctx && this.ctx.state === "running") {
      await this.decodeAll();
      const firstBuf = this.decodedBuffers.values().next().value as
        | AudioBuffer
        | undefined;
      if (firstBuf) this.loopDuration = firstBuf.duration;
      this.tryBeginPlayback();
      // Start the manually enabled and force-enabled tracks
      this.startEnabledTracks(roundNumber);
      if (this.pendingTrackCount > 0) {
        this.startTracks(this.pendingTrackCount);
        this.pendingTrackCount = 0;
      }
    } else {
      window.addEventListener("pointerdown", onInteraction);
      window.addEventListener("keydown", onInteraction);
    }
  }

  startTracks(count: number): void {
    if (!this.ctx || !this.playbackScheduled) {
      this.pendingTrackCount = Math.max(this.pendingTrackCount, count);
      return;
    }
    const toReveal = this.revealQueue.splice(0, count);
    const now = this.ctx.currentTime;
    for (const trackId of toReveal) {
      if (this.unlockedTracks.has(trackId)) continue;
      this.unlockedTracks.add(trackId);
      const gain = this.gains.get(trackId);
      if (!gain || !this.currentSong) continue;
      const trackVolume = this.currentSong.tracks[trackId]?.volume ?? 0.35;
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(trackVolume, now + 0.5);
    }
  }

  stopAll(): void {
    this.stopCurrentSources();
  }

  dispose(): void {
    this.stopCurrentSources();
    if (typeof window !== "undefined") {
      window.removeEventListener("vmb:audio-settings-changed", this.volumeChangeHandler);
    }
    if (this.interactionHandler) {
      window.removeEventListener("pointerdown", this.interactionHandler);
      window.removeEventListener("keydown", this.interactionHandler);
      this.interactionHandler = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.masterGain = null;
    this.filter = null;
    this.currentSong = null;
    this.usedSongIds.clear();
    this.loadComplete = false;
    this.playbackScheduled = false;
    this.pendingTrackCount = 0;
  }
}
