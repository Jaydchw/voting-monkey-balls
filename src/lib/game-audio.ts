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
  loop?: boolean;
};

const TRACKS: Record<AudioTrackId, TrackConfig> = {
  happyMelody: { src: "/audio/happy_melody.mp3", volume: 0.4, loop: true },
  spookyMelody: { src: "/audio/spooky_melody.mp3", volume: 0.35, loop: true },
  conflictBongos: {
    src: "/audio/conflict_bongos.mp3",
    volume: 0.35,
    loop: true,
  },
  warmPad: { src: "/audio/warm_pad.mp3", volume: 0.3, loop: true },
  dubBlip: { src: "/audio/dub_blip.mp3", volume: 0.55 },
  tomPlinks: { src: "/audio/tom_plinks.mp3", volume: 0.65 },
  tripletKick: { src: "/audio/triplet_kick.mp3", volume: 0.75 },
  rims: { src: "/audio/rims.mp3", volume: 0.7 },
  stepperHats: { src: "/audio/stepper_hats.mp3", volume: 0.35 },
};

export class GameAudioController {
  private readonly music = new Map<AudioTrackId, HTMLAudioElement>();
  private muted = false;
  private enabled = false;

  enable() {
    if (typeof window === "undefined") return;
    this.enabled = true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    for (const [id, audio] of this.music.entries()) {
      audio.volume = this.getVolume(id);
    }
  }

  playMusic(id: AudioTrackId) {
    if (!this.enabled || typeof window === "undefined") return;

    for (const [trackId, audio] of this.music.entries()) {
      if (trackId !== id && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    }

    let audio = this.music.get(id);
    if (!audio) {
      const track = TRACKS[id];
      audio = new Audio(track.src);
      audio.loop = Boolean(track.loop);
      audio.preload = "auto";
      this.music.set(id, audio);
    }

    audio.volume = this.getVolume(id);
    void audio.play().catch(() => {
      // Playback can be blocked until a user gesture enables audio.
    });
  }

  stopMusic(id: AudioTrackId) {
    const audio = this.music.get(id);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  stopAllMusic() {
    for (const audio of this.music.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  playSfx(id: AudioTrackId) {
    if (!this.enabled || typeof window === "undefined") return;
    const track = TRACKS[id];
    const audio = new Audio(track.src);
    audio.volume = this.getVolume(id);
    void audio.play().catch(() => {
      // Playback can be blocked until a user gesture enables audio.
    });
  }

  dispose() {
    this.stopAllMusic();
    this.music.clear();
  }

  private getVolume(id: AudioTrackId) {
    if (this.muted) return 0;
    const track = TRACKS[id];
    const settings = getAudioSettings();
    const channelVolume = track.loop
      ? settings.musicVolume
      : settings.sfxVolume;
    return track.volume * settings.masterVolume * channelVolume;
  }
}
