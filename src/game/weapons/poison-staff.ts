import type * as Phaser from "phaser";
import { RangedWeapon, type ProjectileState } from "./ranged-weapon";
import type { Ball } from "../ball";
import { Skull } from "@phosphor-icons/react";

const POISON_STAFF_REACH = 34;
const POISON_STAFF_LENGTH = 52;

export class PoisonStaffWeapon extends RangedWeapon {
  readonly name = "Poison Staff";
  readonly quality = 3;
  readonly icon = Skull;
  readonly description =
    "Launches toxic globes that slow the enemy and inflict poison over time.";
  readonly attackSpeedMs = 900;
  readonly sound = "flick" as const;

  protected readonly orbitRadius = POISON_STAFF_REACH;
  protected readonly projectileStartDistance = 28;
  protected readonly projectileSpeed = 620;
  protected readonly projectileRadius = 10;
  protected readonly projectileDamage = 3;
  protected readonly projectileColor = 0x84cc16;
  protected readonly projectileTrailWidth = 7;
  protected readonly projectileTrailColor = 0x65a30d;
  protected readonly projectileTrailAlpha = 0.26;
  protected readonly projectileTrailParticleRadius = 5;
  protected readonly projectileTrailParticleAlpha = 0.16;
  protected readonly projectileGlowRadius = 15;
  protected readonly projectileGlowColor = 0x65a30d;
  protected readonly projectileGlowAlpha = 0.24;
  protected readonly projectileLightRadius = 24;
  protected readonly projectileLightColor = 0x365314;
  protected readonly projectileLightAlpha = 0.15;
  protected readonly projectileHitEffect = "toxic" as const;

  private graphics!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onUnequip(): void {
    this.graphics.destroy();
  }

  protected onProjectileHit(enemy: Ball, _projectile: ProjectileState): void {
    void _projectile;
    enemy.applySlow(0.6, 1800);
    enemy.applyDamageOverTime(1, 400, 3200);
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    const baseX = x - Math.cos(aimAngle) * POISON_STAFF_LENGTH * 0.5;
    const baseY = y - Math.sin(aimAngle) * POISON_STAFF_LENGTH * 0.5;
    const tipX = x + Math.cos(aimAngle) * POISON_STAFF_LENGTH * 0.5;
    const tipY = y + Math.sin(aimAngle) * POISON_STAFF_LENGTH * 0.5;

    this.graphics.clear();
    this.graphics.lineStyle(7, 0x3f6212, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();
    this.graphics.fillStyle(0x84cc16, 1);
    this.graphics.fillCircle(tipX, tipY, 12);
  }
}
