import type * as Phaser from "phaser";
import type { Icon } from "@phosphor-icons/react";
import type { Ball } from "./ball";
import { playGameSfx, type GameSfxId } from "@/lib/game-sfx";

export type DamageSource =
  | "collision"
  | "melee"
  | "projectile"
  | "dot"
  | "modifier"
  | "unknown";

export type OutgoingDamageProfile = {
  instant: number;
  dotTotal: number;
  dotDurationMs: number;
  dotTickMs: number;
};

export type WeaponType = "melee" | "ranged";

export type ModifierSoundConfig =
  | GameSfxId
  | {
      apply?: GameSfxId;
      hit?: GameSfxId;
      wall?: GameSfxId;
    };

export abstract class BallModifier {
  abstract readonly name: string;
  abstract readonly quality: number;
  abstract readonly icon: Icon;
  abstract readonly description: string;
  readonly sound?: ModifierSoundConfig;

  protected ball!: Ball;
  protected scene!: Phaser.Scene;

  apply(ball: Ball, scene: Phaser.Scene): void {
    this.ball = ball;
    this.scene = scene;
    this.onApply();
    this.playModifierSound("apply");
  }

  remove(): void {
    this.onRemove();
  }

  protected abstract onApply(): void;
  protected abstract onRemove(): void;

  /** Called every frame with delta in milliseconds. */
  update(delta: number): void {
    void delta;
  }

  /** Called when this ball collides with the other ball. */
  onBallHitBall(other: Ball): void {
    void other;
  }

  /** Called when this ball collides with a wall. */
  onBallHitWall(): void {}

  /** Return a modified speed value. Chain-called across all modifiers. */
  modifySpeed(speed: number): number {
    return speed;
  }

  /** Return a modified incoming damage amount. Chain-called across all modifiers. */
  modifyDamageTaken(amount: number): number {
    return amount;
  }

  /** Return a modified outgoing damage profile for attacks by this ball. */
  modifyOutgoingDamage(
    profile: OutgoingDamageProfile,
    source: DamageSource,
  ): OutgoingDamageProfile {
    void source;
    return profile;
  }

  /** Return a modified attack cooldown in ms for this weapon type. */
  modifyAttackSpeedMs(baseMs: number, weaponType: WeaponType): number {
    void weaponType;
    return baseMs;
  }

  /** Called after this ball lands an attack (instant and/or DoT). */
  onAttackLanded(target: Ball, source: DamageSource, amount: number): void {
    void target;
    void source;
    void amount;
  }

  /** Return true to fully negate an incoming hit before damage is applied. */
  preventIncomingDamage(amount: number, source: DamageSource): boolean {
    void amount;
    void source;
    return false;
  }

  /** Return true to deflect an incoming projectile hit. */
  tryDeflectProjectile(): boolean {
    return false;
  }

  /** When false, this modifier is not copied to ghost balls created by Mitosis. */
  readonly propagateToGhosts: boolean = true;

  protected playModifierSound(event: "apply" | "hit" | "wall"): void {
    const config = this.sound;
    if (!config) return;
    if (typeof config === "string") {
      playGameSfx(this.scene, config);
      return;
    }
    const byEvent = config[event];
    if (byEvent) {
      playGameSfx(this.scene, byEvent);
    }
  }
}
