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
  happyMelody: { src: "/audio/happy_melody.mp3", volume: 0.4 },
  spookyMelody: { src: "/audio/spooky_melody.mp3", volume: 0.35 },
  conflictBongos: { src: "/audio/conflict_bongos.mp3", volume: 0.35 },
  warmPad: { src: "/audio/warm_pad.mp3", volume: 0.3 },
  dubBlip: { src: "/audio/dub_blip.mp3", volume: 0.55 },
  tomPlinks: { src: "/audio/tom_plinks.mp3", volume: 0.65 },
  tripletKick: { src: "/audio/triplet_kick.mp3", volume: 0.75 },
  rims: { src: "/audio/rims.mp3", volume: 0.7 },
  stepperHats: { src: "/audio/stepper_hats.mp3", volume: 0.35 },
};

const ROUND_POOLS: AudioTrackId[][] = [
  ["happyMelody", "warmPad", "rims", "dubBlip"],
  ["spookyMelody", "tomPlinks", "stepperHats", "tripletKick"],
  ["conflictBongos", "warmPad", "tripletKick", "rims"],
];

export class GameAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private buffers = new Map<AudioTrackId, AudioBuffer>();
  private sources = new Map<AudioTrackId, AudioBufferSourceNode>();
  private gains = new Map<AudioTrackId, GainNode>();
  private activeTracks = new Set<AudioTrackId>();
  private currentPool: AudioTrackId[] = [];
  private initialized = false;
  private roundStartTime = 0;
  private loopDuration = 8;
  private unlockHandler: () => void = () => {};

  init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 22000;

    this.filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;

    this.updateVolume();

    this.unlockHandler = () => {
      if (this.ctx?.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", this.unlockHandler);
      window.addEventListener("keydown", this.unlockHandler);
    }
  }

  updateVolume() {
    if (!this.masterGain) return;
    const settings = getAudioSettings();
    this.masterGain.gain.value = settings.masterVolume * settings.musicVolume;
  }

  setPaused(paused: boolean) {
    if (!this.filter || !this.ctx) return;
    this.filter.frequency.setTargetAtTime(
      paused ? 800 : 22000,
      this.ctx.currentTime,
      0.1,
    );
  }

  async loadRound(round: number) {
    this.init();
    if (this.ctx?.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
    const poolIndex = (round - 1) % ROUND_POOLS.length;
    this.currentPool = ROUND_POOLS[poolIndex];
    this.stopAll();
    this.activeTracks.clear();
    this.buffers.clear();

    await Promise.all(
      this.currentPool.map(async (trackId) => {
        try {
          const track = TRACKS[trackId];
          const res = await fetch(track.src);
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
          this.buffers.set(trackId, audioBuffer);
        } catch {}
      }),
    );

    if (this.currentPool.length > 0) {
      const firstTrack = this.currentPool[0];
      const buf = this.buffers.get(firstTrack);
      if (buf) {
        this.loopDuration = buf.duration;
      }
    }
  }

  startTracks(count: number) {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }

    const inactive = this.currentPool.filter(
      (t) => !this.activeTracks.has(t) && this.buffers.has(t),
    );

    for (let i = inactive.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [inactive[i], inactive[j]] = [inactive[j], inactive[i]];
    }

    const toStart = inactive.slice(0, count);
    const now = this.ctx.currentTime;

    if (this.activeTracks.size === 0) {
      this.roundStartTime = now + 0.1;
    }

    const startAt = Math.max(now + 0.1, this.roundStartTime);
    let offset = 0;
    if (this.loopDuration > 0 && this.activeTracks.size > 0) {
      offset = (startAt - this.roundStartTime) % this.loopDuration;
    }

    for (const trackId of toStart) {
      this.activeTracks.add(trackId);
      const buffer = this.buffers.get(trackId);
      if (!buffer) continue;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      const targetVol = TRACKS[trackId].volume;
      gain.gain.linearRampToValueAtTime(targetVol, startAt + 0.1);

      source.connect(gain);
      gain.connect(this.filter as BiquadFilterNode);

      source.start(startAt, offset);
      this.sources.set(trackId, source);
      this.gains.set(trackId, gain);
    }
  }

  stopAll() {
    for (const source of this.sources.values()) {
      source.stop();
      source.disconnect();
    }
    for (const gain of this.gains.values()) {
      gain.disconnect();
    }
    this.sources.clear();
    this.gains.clear();
    this.activeTracks.clear();
  }

  dispose() {
    this.stopAll();
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", this.unlockHandler);
      window.removeEventListener("keydown", this.unlockHandler);
    }
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close().catch(() => {});
    }
    this.initialized = false;
  }
}
