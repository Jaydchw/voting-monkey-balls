import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";
import { NavigationArrow } from "@phosphor-icons/react";

const HOMING_GUN_REACH = 44;
const HOMING_GUN_LENGTH = 30;

export class HomingGunWeapon extends RangedWeapon {
  readonly name = "Homing Gun";
  readonly quality = 3;
  readonly icon = NavigationArrow;
  readonly description =
    "Fires guided rounds that curve toward the enemy ball.";
  readonly attackSpeedMs = 520;
  readonly sound = "fire" as const;

  protected readonly orbitRadius = HOMING_GUN_REACH;
  protected readonly projectileStartDistance = 22;
  protected readonly projectileSpeed = 560;
  protected readonly projectileRadius = 7;
  protected readonly projectileDamage = 3;
  protected readonly projectileColor = 0x38bdf8;
  protected readonly projectileTrailWidth = 5;
  protected readonly projectileTrailColor = 0x38bdf8;
  protected readonly projectileTrailAlpha = 0.26;
  protected readonly projectileTrailParticleRadius = 4;
  protected readonly projectileTrailParticleAlpha = 0.16;
  protected readonly projectileGlowRadius = 10;
  protected readonly projectileGlowColor = 0x7dd3fc;
  protected readonly projectileGlowAlpha = 0.18;
  protected readonly projectileLightRadius = 18;
  protected readonly projectileLightColor = 0x164e63;
  protected readonly projectileLightAlpha = 0.15;
  protected readonly homingTurnRate = 5.5;

  private graphics!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onUnequip(): void {
    this.graphics.destroy();
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    const baseX = x - Math.cos(aimAngle) * HOMING_GUN_LENGTH * 0.45;
    const baseY = y - Math.sin(aimAngle) * HOMING_GUN_LENGTH * 0.45;
    const tipX = x + Math.cos(aimAngle) * HOMING_GUN_LENGTH * 0.55;
    const tipY = y + Math.sin(aimAngle) * HOMING_GUN_LENGTH * 0.55;

    this.graphics.clear();
    this.graphics.lineStyle(8, 0x0f172a, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();
    this.graphics.fillStyle(0x22d3ee, 1);
    this.graphics.fillStyle(0x67e8f9, 0.18);
    this.graphics.fillCircle(tipX, tipY, 12);
    this.graphics.fillStyle(0x22d3ee, 1);
    this.graphics.fillCircle(tipX, tipY, 6);
  }
}
