import type * as Phaser from "phaser";

export type GameSfxId =
  | "big_zap"
  | "clash"
  | "explosion"
  | "fire"
  | "flick"
  | "hit"
  | "laser"
  | "machine_gun"
  | "music1"
  | "music2"
  | "music3"
  | "music4"
  | "shotgun"
  | "slice"
  | "stab"
  | "zap";

export const GAME_SFX: Record<GameSfxId, string> = {
  big_zap: "/audio/sounds/big_zap.mp3",
  clash: "/audio/sounds/clash.mp3",
  explosion: "/audio/sounds/explosion.mp3",
  fire: "/audio/sounds/fire.mp3",
  flick: "/audio/sounds/flick.mp3",
  hit: "/audio/sounds/hit.mp3",
  laser: "/audio/sounds/laser.mp3",
  machine_gun: "/audio/sounds/machine_gun.mp3",
  music1: "/audio/sounds/music1.mp3",
  music2: "/audio/sounds/music2.mp3",
  music3: "/audio/sounds/music3.mp3",
  music4: "/audio/sounds/music4.mp3",
  shotgun: "/audio/sounds/shotgun.mp3",
  slice: "/audio/sounds/slice.mp3",
  stab: "/audio/sounds/stab.mp3",
  zap: "/audio/sounds/zap.mp3",
};

export function preloadGameSfx(scene: Phaser.Scene): void {
  for (const [id, path] of Object.entries(GAME_SFX) as [GameSfxId, string][]) {
    if (!scene.cache.audio.exists(id)) {
      scene.load.audio(id, path);
    }
  }
}

export function playGameSfx(
  scene: Phaser.Scene,
  id: GameSfxId,
  options?: Phaser.Types.Sound.SoundConfig,
): void {
  if (!scene.sound || !scene.cache.audio.exists(id)) {
    return;
  }
  scene.sound.play(id, options);
}
