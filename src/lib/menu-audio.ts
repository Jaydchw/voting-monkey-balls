import { getAudioSettings } from "@/lib/audio-settings";

type TrackState = {
  src: string;
  volume: number;
  enabledOnIdle: boolean;
  enabledOnActive: boolean;
};

const CONGA_TRACKS: Record<string, TrackState> = {
  "bass pt1.mp3": {
    src: "/audio/conga/bass pt1.mp3",
    volume: 0.35,
    enabledOnIdle: false,
    enabledOnActive: true,
  },
  "bass pt2.mp3": {
    src: "/audio/conga/bass pt2.mp3",
    volume: 0.35,
    enabledOnIdle: false,
    enabledOnActive: false,
  },
  "clap.mp3": {
    src: "/audio/conga/clap.mp3",
    volume: 0.35,
    enabledOnIdle: true,
    enabledOnActive: true,
  },
  "conga roll.mp3": {
    src: "/audio/conga/conga roll.mp3",
    volume: 0.35,
    enabledOnIdle: true,
    enabledOnActive: true,
  },
  "conga.mp3": {
    src: "/audio/conga/conga.mp3",
    volume: 0.35,
    enabledOnIdle: false,
    enabledOnActive: false,
  },
  "kick low.mp3": {
    src: "/audio/conga/kick low.mp3",
    volume: 0.35,
    enabledOnIdle: false,
    enabledOnActive: false,
  },
  "kick top.mp3": {
    src: "/audio/conga/kick top.mp3",
    volume: 0.35,
    enabledOnIdle: false,
    enabledOnActive: true,
  },
  "open hat.mp3": {
    src: "/audio/conga/open hat.mp3",
    volume: 0.35,
    enabledOnIdle: false,
    enabledOnActive: false,
  },
  "synth bass.mp3": {
    src: "/audio/conga/synth bass.mp3",
    volume: 0.35,
    enabledOnIdle: false,
    enabledOnActive: false,
  },
  "tambourine.mp3": {
    src: "/audio/conga/tambourine.mp3",
    volume: 0.35,
    enabledOnIdle: true,
    enabledOnActive: true,
  },
  "vox.mp3": {
    src: "/audio/conga/vox.mp3",
    volume: 0.35,
    enabledOnIdle: true,
    enabledOnActive: true,
  },
};

export class MenuAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private rawBuffers = new Map<string, ArrayBuffer>();
  private decodedBuffers = new Map<string, AudioBuffer>();
  private sources = new Map<string, AudioBufferSourceNode>();
  private gains = new Map<string, GainNode>();

  private loopDuration = 8;
  private playbackStartTime = 0;
  private loadComplete = false;
  private playbackScheduled = false;
  private isActive = false;
  private interactionHandler: (() => void) | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateVolume();
    }
    return this.ctx;
  }

  updateVolume(): void {
    if (!this.masterGain) return;
    const settings = getAudioSettings();
    this.masterGain.gain.value =
      settings.masterVolume * settings.musicVolume * 1.6;
  }

  async load(): Promise<void> {
    if (this.loadComplete) return;

    await Promise.all(
      Object.entries(CONGA_TRACKS).map(async ([trackId, config]) => {
        try {
          const res = await fetch(config.src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const raw = await res.arrayBuffer();
          this.rawBuffers.set(trackId, raw);
        } catch (err) {
          console.warn(`[MenuAudio] Failed to fetch "${trackId}":`, err);
        }
      }),
    );

    if (this.rawBuffers.size === 0) return;

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

      this.scheduleAllSources();
      this.applyTrackVolumes(this.isActive);
    };

    this.interactionHandler = onInteraction;
    window.addEventListener("pointerdown", onInteraction);
    window.addEventListener("keydown", onInteraction);
  }

  private async decodeAll(): Promise<void> {
    const ctx = this.getContext();
    await Promise.all(
      Array.from(this.rawBuffers.entries()).map(async ([trackId, raw]) => {
        try {
          const buf = await ctx.decodeAudioData(raw.slice(0));
          this.decodedBuffers.set(trackId, buf);
        } catch (err) {
          console.warn(`[MenuAudio] decode failed for "${trackId}":`, err);
        }
      }),
    );
  }

  private scheduleAllSources(): void {
    if (this.playbackScheduled) return;
    const ctx = this.ctx!;
    const startAt = ctx.currentTime + 0.05;
    this.playbackStartTime = startAt;
    this.playbackScheduled = true;

    for (const [trackId, buffer] of this.decodedBuffers.entries()) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = this.loopDuration;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(gain);
      gain.connect(this.masterGain as GainNode);
      source.start(startAt, 0);

      this.sources.set(trackId, source);
      this.gains.set(trackId, gain);
    }
  }

  private applyTrackVolumes(active: boolean): void {
    if (!this.ctx || !this.playbackScheduled) return;
    const now = this.ctx.currentTime;

    for (const [trackId, config] of Object.entries(CONGA_TRACKS)) {
      const gain = this.gains.get(trackId);
      if (!gain) continue;
      const enabled = active ? config.enabledOnActive : config.enabledOnIdle;
      const targetVolume = enabled ? config.volume : 0;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(targetVolume, now, 0.08);
    }
  }

  getLoopInfo(): {
    loopPosition: number;
    loopDuration: number;
    isPlaying: boolean;
  } {
    if (!this.ctx || !this.playbackScheduled) {
      return {
        loopPosition: 0,
        loopDuration: this.loopDuration,
        isPlaying: false,
      };
    }
    const now = this.ctx.currentTime;
    if (now < this.playbackStartTime) {
      return {
        loopPosition: 0,
        loopDuration: this.loopDuration,
        isPlaying: false,
      };
    }
    const elapsed = now - this.playbackStartTime;
    const loopPosition = elapsed % this.loopDuration;
    return {
      loopPosition,
      loopDuration: this.loopDuration,
      isPlaying: this.ctx.state === "running",
    };
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.applyTrackVolumes(active);
  }

  pauseForGame(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0, now, 0.3);
  }

  resumeFromGame(): void {
    if (!this.ctx || !this.masterGain) return;
    const settings = getAudioSettings();
    const targetVolume = settings.masterVolume * settings.musicVolume * 1.3;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(targetVolume, now, 0.5);
  }

  dispose(): void {
    if (this.interactionHandler) {
      window.removeEventListener("pointerdown", this.interactionHandler);
      window.removeEventListener("keydown", this.interactionHandler);
      this.interactionHandler = null;
    }
    for (const source of this.sources.values()) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    for (const gain of this.gains.values()) {
      gain.disconnect();
    }
    this.sources.clear();
    this.gains.clear();
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.masterGain = null;
    this.loadComplete = false;
    this.playbackScheduled = false;
  }
}
