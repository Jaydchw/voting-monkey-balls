import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";

const MACHINE_GUN_REACH = 42;
const MACHINE_GUN_LENGTH = 34;

export class MachineGunWeapon extends RangedWeapon {
  readonly name = "Machine Gun";
  readonly quality = 2;
  readonly icon = "target";
  readonly description =
    "Sprays low-damage rounds that ricochet around the arena walls.";
  readonly attackSpeedMs = 120;
  readonly sound = "machine_gun" as const;

  protected readonly orbitRadius = MACHINE_GUN_REACH;
  protected readonly projectileStartDistance = 18;
  protected readonly projectileSpeed = 780;
  protected readonly projectileRadius = 4;
  protected readonly projectileDamage = 1;
  protected readonly projectileColor = 0x2563eb;
  protected readonly projectileWallBounces = 6;
  protected readonly projectileTrailWidth = 3;
  protected readonly projectileTrailColor = 0x2563eb;
  protected readonly projectileTrailAlpha = 0.32;
  protected readonly projectileTrailParticleRadius = 2.6;
  protected readonly projectileTrailParticleAlpha = 0.24;
  protected readonly projectileGlowRadius = 6;
  protected readonly projectileGlowColor = 0x1d4ed8;
  protected readonly projectileGlowAlpha = 0.2;
  protected readonly projectileLightRadius = 12;
  protected readonly projectileLightColor = 0x1e3a8a;
  protected readonly projectileLightAlpha = 0.14;
  protected readonly projectileHitEffect = "spark" as const;

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
    const baseX = x - Math.cos(aimAngle) * MACHINE_GUN_LENGTH * 0.55;
    const baseY = y - Math.sin(aimAngle) * MACHINE_GUN_LENGTH * 0.55;
    const tipX = x + Math.cos(aimAngle) * MACHINE_GUN_LENGTH * 0.45;
    const tipY = y + Math.sin(aimAngle) * MACHINE_GUN_LENGTH * 0.45;
    const perp = aimAngle + Math.PI / 2;

    this.graphics.clear();
    this.graphics.lineStyle(8, 0x1f2937, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();

    this.graphics.lineStyle(5, 0x334155, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(tipX, tipY);
    this.graphics.lineTo(tipX + Math.cos(perp) * 5, tipY + Math.sin(perp) * 5);
    this.graphics.strokePath();

    this.graphics.fillStyle(0x2563eb, 0.3);
    this.graphics.fillCircle(tipX, tipY, 8);
  }
}
