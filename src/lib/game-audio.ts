import { getAudioSettings } from "@/lib/audio-settings";

export type AudioTrackId =
  | "happyMelody"
  | "spookyMelody"
  | "conflictBongos"
  | "warmPad"
  | "dubBlip"
  | "tomPlinks"
  | "tripletKick"
  | "rims"
  | "stepperHats";

type TrackConfig = {
  src: string;
  volume: number;
};

const TRACKS: Record<AudioTrackId, TrackConfig> = {
  happyMelody: { src: "/audio/mirage/happy_melody.mp3", volume: 0.4 },
  spookyMelody: { src: "/audio/mirage/spooky_melody.mp3", volume: 0.35 },
  conflictBongos: { src: "/audio/mirage/conflict_bongos.mp3", volume: 0.35 },
  warmPad: { src: "/audio/mirage/warm_pad.mp3", volume: 0.3 },
  dubBlip: { src: "/audio/mirage/dub_blip.mp3", volume: 0.55 },
  tomPlinks: { src: "/audio/mirage/tom_plinks.mp3", volume: 0.65 },
  tripletKick: { src: "/audio/mirage/triplet_kick.mp3", volume: 0.75 },
  rims: { src: "/audio/mirage/rims.mp3", volume: 0.7 },
  stepperHats: { src: "/audio/mirage/stepper_hats.mp3", volume: 0.35 },
};

const ROUND_POOLS: AudioTrackId[][] = [
  ["happyMelody", "warmPad", "rims", "dubBlip"],
  ["spookyMelody", "tomPlinks", "stepperHats", "tripletKick"],
  ["conflictBongos", "warmPad", "tripletKick", "rims"],
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toFileKey(trackId: AudioTrackId): string {
  return trackId;
}

export class GameAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private rawBuffers = new Map<AudioTrackId, ArrayBuffer>();
  private decodedBuffers = new Map<AudioTrackId, AudioBuffer>();
  private sources = new Map<AudioTrackId, AudioBufferSourceNode>();
  private gains = new Map<AudioTrackId, GainNode>();

  private currentPool: AudioTrackId[] = [];
  private unlockedTracks = new Set<AudioTrackId>();
  private revealQueue: AudioTrackId[] = [];

  private loopDuration = 8;
  private roundStartTime = 0;
  private pendingUnlockCount = 0;
  private loadComplete = false;
  private playbackScheduled = false;

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
    const ctx = this.ctx!;
    const startAt = ctx.currentTime + 0.05;
    this.roundStartTime = startAt;
    this.playbackScheduled = true;

    for (const trackId of this.currentPool) {
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

  private tryBeginPlayback(): void {
    if (!this.loadComplete) return;
    if (!this.ctx || this.ctx.state === "suspended") return;
    if (this.playbackScheduled) return;

    this.scheduleAllSources();

    if (this.pendingUnlockCount > 0) {
      const count = this.pendingUnlockCount;
      this.pendingUnlockCount = 0;
      this.revealNextTracks(count);
    }
  }

  private revealNextTracks(count: number): void {
    if (!this.ctx || !this.playbackScheduled) return;
    const toReveal = this.revealQueue.splice(0, count);
    const now = this.ctx.currentTime;
    for (const trackId of toReveal) {
      if (this.unlockedTracks.has(trackId)) continue;
      this.unlockedTracks.add(trackId);
      const gain = this.gains.get(trackId);
      if (!gain) continue;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(TRACKS[trackId].volume, now);
    }
  }

  updateVolume(): void {
    if (!this.masterGain) return;
    const settings = getAudioSettings();
    this.masterGain.gain.value = settings.masterVolume * settings.musicVolume;
  }

  setPaused(paused: boolean): void {
    if (!this.filter || !this.ctx) return;
    this.filter.frequency.setTargetAtTime(
      paused ? 800 : 22000,
      this.ctx.currentTime,
      0.1,
    );
  }

  async loadRound(round: number): Promise<void> {
    this.stopAll();
    this.loadComplete = false;
    this.playbackScheduled = false;
    this.unlockedTracks.clear();
    this.revealQueue = [];
    this.rawBuffers.clear();
    this.decodedBuffers.clear();
    this.pendingUnlockCount = 0;

    const pools = ROUND_POOLS.filter((p) => p.length > 0);
    void round;
    const poolIndex = Math.floor(Math.random() * pools.length);
    this.currentPool = pools[poolIndex];

    await Promise.all(
      this.currentPool.map(async (trackId) => {
        try {
          const res = await fetch(TRACKS[trackId].src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const raw = await res.arrayBuffer();
          this.rawBuffers.set(trackId, raw);
        } catch (err) {
          console.warn(`[GameAudio] Failed to fetch "${trackId}":`, err);
        }
      }),
    );

    const loaded = this.currentPool.filter((t) => this.rawBuffers.has(t));
    if (loaded.length === 0) return;

    this.revealQueue = shuffle(loaded);
    this.loadComplete = true;

    if (this.interactionHandler) {
      window.removeEventListener("pointerdown", this.interactionHandler);
      window.removeEventListener("keydown", this.interactionHandler);
      this.interactionHandler = null;
    }

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
    };

    this.interactionHandler = onInteraction;

    if (this.ctx && this.ctx.state === "running") {
      await this.decodeAll();
      const firstBuf = this.decodedBuffers.values().next().value as
        | AudioBuffer
        | undefined;
      if (firstBuf) this.loopDuration = firstBuf.duration;
      this.tryBeginPlayback();
    } else {
      window.addEventListener("pointerdown", onInteraction);
      window.addEventListener("keydown", onInteraction);
    }
  }

  startTracks(count: number): void {
    if (!this.loadComplete) {
      this.pendingUnlockCount = Math.max(this.pendingUnlockCount, count);
      return;
    }

    if (!this.ctx || this.ctx.state !== "running") {
      this.pendingUnlockCount = Math.max(this.pendingUnlockCount, count);
      return;
    }

    if (!this.playbackScheduled) {
      this.pendingUnlockCount = Math.max(this.pendingUnlockCount, count);
      this.tryBeginPlayback();
      return;
    }

    this.revealNextTracks(count);
  }

  stopAll(): void {
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

  dispose(): void {
    this.stopAll();
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
    this.initialized = false;
    this.loadComplete = false;
  }

  private get initialized(): boolean {
    return this.ctx !== null;
  }

  private set initialized(_: boolean) {}
}
