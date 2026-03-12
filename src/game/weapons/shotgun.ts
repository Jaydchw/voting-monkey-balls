import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";

const SHOTGUN_REACH = 58;
const SHOTGUN_LENGTH = 34;

export class ShotgunWeapon extends RangedWeapon {
  readonly name = "Shotgun";
  readonly quality = 2;
  readonly icon = "shield";
  readonly description =
    "Blasts three shells in a spread for brutal close-range pressure.";
  readonly attackSpeedMs = 860;

  protected readonly orbitRadius = SHOTGUN_REACH;
  protected readonly projectileStartDistance = 24;
  protected readonly projectileSpeed = 520;
  protected readonly projectileRadius = 8;
  protected readonly projectileDamage = 4;
  protected readonly projectileColor = 0xfde68a;
  protected readonly projectilesPerShot = 3;
  protected readonly projectileSpreadAngle = 0.18;
  protected readonly projectileTrailWidth = 5;
  protected readonly projectileTrailColor = 0xfbbf24;
  protected readonly projectileTrailAlpha = 0.24;

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
    const baseX = x - Math.cos(aimAngle) * SHOTGUN_LENGTH * 0.45;
    const baseY = y - Math.sin(aimAngle) * SHOTGUN_LENGTH * 0.45;
    const tipX = x + Math.cos(aimAngle) * SHOTGUN_LENGTH * 0.55;
    const tipY = y + Math.sin(aimAngle) * SHOTGUN_LENGTH * 0.55;
    const perp = aimAngle + Math.PI / 2;

    this.graphics.clear();
    this.graphics.lineStyle(7, 0x713f12, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();
    this.graphics.lineStyle(4, 0x111111, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(tipX + Math.cos(perp) * 5, tipY + Math.sin(perp) * 5);
    this.graphics.lineTo(tipX - Math.cos(perp) * 5, tipY - Math.sin(perp) * 5);
    this.graphics.strokePath();
  }
}
