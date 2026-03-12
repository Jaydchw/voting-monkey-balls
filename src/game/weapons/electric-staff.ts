import type * as Phaser from "phaser";
import { RangedWeapon, type ProjectileState } from "./ranged-weapon";
import type { Ball } from "../ball";

const ELECTRIC_STAFF_REACH = 48;
const ELECTRIC_STAFF_LENGTH = 56;

export class ElectricStaffWeapon extends RangedWeapon {
  readonly name = "Electric Staff";
  readonly quality = 3;
  readonly icon = "lightning";
  readonly description =
    "Fires shocking bolts that stun the enemy ball for a full second.";
  readonly attackSpeedMs = 980;
  readonly sound = "zap" as const;

  protected readonly orbitRadius = ELECTRIC_STAFF_REACH;
  protected readonly projectileStartDistance = 32;
  protected readonly projectileSpeed = 720;
  protected readonly projectileRadius = 10;
  protected readonly projectileDamage = 4;
  protected readonly projectileColor = 0x22d3ee;
  protected readonly projectileTrailWidth = 6;
  protected readonly projectileTrailColor = 0x67e8f9;
  protected readonly projectileTrailAlpha = 0.3;
  protected readonly projectileTrailParticleRadius = 5;
  protected readonly projectileTrailParticleAlpha = 0.16;
  protected readonly projectileGlowRadius = 14;
  protected readonly projectileGlowColor = 0xa5f3fc;
  protected readonly projectileGlowAlpha = 0.18;
  protected readonly projectileLightRadius = 22;
  protected readonly projectileLightColor = 0x0e7490;
  protected readonly projectileLightAlpha = 0.16;
  protected readonly projectileHitEffect = "spark" as const;

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
    enemy.applyStun(1000);
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    const baseX = x - Math.cos(aimAngle) * ELECTRIC_STAFF_LENGTH * 0.5;
    const baseY = y - Math.sin(aimAngle) * ELECTRIC_STAFF_LENGTH * 0.5;
    const tipX = x + Math.cos(aimAngle) * ELECTRIC_STAFF_LENGTH * 0.5;
    const tipY = y + Math.sin(aimAngle) * ELECTRIC_STAFF_LENGTH * 0.5;

    this.graphics.clear();
    this.graphics.lineStyle(8, 0x155e75, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();
    this.graphics.lineStyle(3, 0x67e8f9, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(tipX - 6, tipY + 4);
    this.graphics.lineTo(tipX + 2, tipY - 10);
    this.graphics.lineTo(tipX + 10, tipY + 2);
    this.graphics.strokePath();
  }
}
