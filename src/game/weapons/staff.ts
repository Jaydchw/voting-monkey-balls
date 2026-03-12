import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";
import { Atom } from "@phosphor-icons/react";

const STAFF_REACH = 42;
const STAFF_LENGTH = 58;

export class StaffWeapon extends RangedWeapon {
  readonly name = "Staff";
  readonly quality = 1;
  readonly icon = Atom;
  readonly description =
    "A staff that spins around the ball and fires a shot every second.";
  readonly attackSpeedMs = 1000;
  readonly sound = "fire" as const;

  protected readonly orbitRadius = STAFF_REACH;
  protected readonly projectileStartDistance = 30;
  protected readonly projectileSpeed = 660;
  protected readonly projectileRadius = 11;
  protected readonly projectileDamage = 5;
  protected readonly projectileColor = 0xd97706;
  protected readonly projectileTrailWidth = 7;
  protected readonly projectileTrailColor = 0xea580c;
  protected readonly projectileTrailAlpha = 0.34;
  protected readonly projectileTrailParticleRadius = 5;
  protected readonly projectileTrailParticleAlpha = 0.16;
  protected readonly projectileGlowRadius = 14;
  protected readonly projectileGlowColor = 0xf59e0b;
  protected readonly projectileGlowAlpha = 0.24;
  protected readonly projectileLightRadius = 24;
  protected readonly projectileLightColor = 0x92400e;
  protected readonly projectileLightAlpha = 0.14;

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
    const orbRadius = 16;

    this.graphics.clear();
    this.graphics.lineStyle(8, 0x7c3aed, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();

    this.graphics.fillStyle(0xfbbf24, 0.22);
    this.graphics.fillCircle(tipX, tipY, 26);
    this.graphics.fillStyle(0xfbbf24, 1);
    this.graphics.lineStyle(3, 0x111111, 1);
    this.graphics.fillCircle(tipX, tipY, orbRadius);
    this.graphics.strokeCircle(tipX, tipY, orbRadius);
  }
}
