import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";

const STAFF_REACH = 62;
const STAFF_LENGTH = 58;

export class StaffWeapon extends RangedWeapon {
  readonly name = "Staff";
  readonly quality = 1;
  readonly icon = "lightning";
  readonly description =
    "A staff that spins around the ball and fires a shot every second.";
  readonly attackSpeedMs = 1000;

  protected readonly orbitRadius = STAFF_REACH;
  protected readonly projectileStartDistance = 30;
  protected readonly projectileSpeed = 520;
  protected readonly projectileRadius = 11;
  protected readonly projectileDamage = 5;
  protected readonly projectileColor = 0xfbbf24;
  protected readonly projectileTrailWidth = 7;
  protected readonly projectileTrailColor = 0xfbbf24;
  protected readonly projectileTrailAlpha = 0.28;
  protected readonly projectileGlowRadius = 14;
  protected readonly projectileGlowColor = 0xfde68a;
  protected readonly projectileGlowAlpha = 0.18;

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;

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
    const baseX = x - Math.cos(aimAngle) * STAFF_LENGTH * 0.5;
    const baseY = y - Math.sin(aimAngle) * STAFF_LENGTH * 0.5;
    const tipX = x + Math.cos(aimAngle) * STAFF_LENGTH * 0.5;
    const tipY = y + Math.sin(aimAngle) * STAFF_LENGTH * 0.5;
    const orbRadius = 14;

    this.graphics.clear();
    this.graphics.lineStyle(7, 0x7c3aed, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();

    this.graphics.fillStyle(0xfbbf24, 0.22);
    this.graphics.fillCircle(tipX, tipY, 22);
    this.graphics.fillStyle(0xfbbf24, 1);
    this.graphics.lineStyle(3, 0x111111, 1);
    this.graphics.fillCircle(tipX, tipY, orbRadius);
    this.graphics.strokeCircle(tipX, tipY, orbRadius);
  }
}
