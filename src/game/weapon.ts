import type * as Phaser from "phaser";
import type { Icon } from "@phosphor-icons/react";
import type { Ball } from "./ball";
import { playGameSfx, type GameSfxId } from "@/lib/game-sfx";

export type WeaponSoundConfig =
  | GameSfxId
  | readonly GameSfxId[]
  | {
      charge?: GameSfxId;
      fire?: GameSfxId;
      hit?: GameSfxId;
      wall?: GameSfxId;
    };

export abstract class Weapon {
  abstract readonly name: string;
  abstract readonly quality: number;
  abstract readonly icon: Icon;
  abstract readonly description: string;
  abstract readonly attackSpeedMs: number;
  abstract readonly type: "melee" | "ranged";
  readonly sound?: WeaponSoundConfig;

  protected ball!: Ball;
  protected scene!: Phaser.Scene;

  apply(ball: Ball, scene: Phaser.Scene): void {
    this.ball = ball;
    this.scene = scene;
    this.onApply();
  }

  remove(): void {
    this.onRemove();
  }

  protected abstract onApply(): void;
  protected abstract onRemove(): void;

  update(delta: number): void {
    void delta;
  }

  protected getActiveEnemy(): Ball | null {
    const targets = this.ball.getHostileTargets();
    if (targets.length === 0) {
      return null;
    }

    let closest = targets[0];
    let closestDistance = Math.hypot(
      closest.body.x - this.ball.body.x,
      closest.body.y - this.ball.body.y,
    );

    for (let index = 1; index < targets.length; index += 1) {
      const target = targets[index];
      const distance = Math.hypot(
        target.body.x - this.ball.body.x,
        target.body.y - this.ball.body.y,
      );
      if (distance < closestDistance) {
        closest = target;
        closestDistance = distance;
      }
    }

    return closest;
  }

  protected playWeaponSound(
    event: "charge" | "fire" | "hit" | "wall",
    fallback?: GameSfxId,
  ): void {
    const config = this.sound;
    if (!config) {
      if (fallback) playGameSfx(this.scene, fallback);
      return;
    }

    if (typeof config === "string") {
      playGameSfx(this.scene, config);
      return;
    }

    if (Array.isArray(config)) {
      if (config.length === 0) {
        if (fallback) playGameSfx(this.scene, fallback);
        return;
      }
      const index = Math.floor(Math.random() * config.length);
      playGameSfx(this.scene, config[index]);
      return;
    }

    if (typeof config === "object") {
      const objectConfig = config as {
        charge?: GameSfxId;
        fire?: GameSfxId;
        hit?: GameSfxId;
        wall?: GameSfxId;
      };
      const byEvent = objectConfig[event];
      if (byEvent) {
        playGameSfx(this.scene, byEvent);
        return;
      }
      if (fallback) {
        playGameSfx(this.scene, fallback);
      }
    }
  }
}
