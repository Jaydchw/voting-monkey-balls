import type * as Phaser from "phaser";
import { RangedWeapon, type ProjectileState } from "./ranged-weapon";

const BAZOOKA_REACH = 70;
const BAZOOKA_LENGTH = 44;

export class BazookaWeapon extends RangedWeapon {
  readonly name = "Bazooka";
  readonly quality = 4;
  readonly icon = "fire";
  readonly description =
    "Launches explosive rockets that detonate on players or walls with splash damage.";
  readonly attackSpeedMs = 1650;

  protected readonly orbitRadius = BAZOOKA_REACH;
  protected readonly projectileStartDistance = 36;
  protected readonly projectileSpeed = 360;
  protected readonly projectileRadius = 14;
  protected readonly projectileDamage = 8;
  protected readonly projectileColor = 0xfb923c;
  protected readonly projectileTrailWidth = 9;
  protected readonly projectileTrailColor = 0xfb923c;
  protected readonly projectileTrailAlpha = 0.3;
  protected readonly projectileGlowRadius = 18;
  protected readonly projectileGlowColor = 0xfcd34d;
  protected readonly projectileGlowAlpha = 0.16;
  protected readonly impactEffectRadius = 54;
  protected readonly impactEffectColor = 0xfb923c;
  protected readonly impactSplashRadius = 86;
  protected readonly impactSplashDamage = 5;

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
    const baseX = x - Math.cos(aimAngle) * BAZOOKA_LENGTH * 0.45;
    const baseY = y - Math.sin(aimAngle) * BAZOOKA_LENGTH * 0.45;
    const tipX = x + Math.cos(aimAngle) * BAZOOKA_LENGTH * 0.55;
    const tipY = y + Math.sin(aimAngle) * BAZOOKA_LENGTH * 0.55;
    const perp = aimAngle + Math.PI / 2;

    this.graphics.clear();
    this.graphics.lineStyle(10, 0x334155, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(baseX, baseY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.strokePath();
    this.graphics.lineStyle(6, 0x94a3b8, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(
      baseX - Math.cos(perp) * 7,
      baseY - Math.sin(perp) * 7,
    );
    this.graphics.lineTo(
      baseX + Math.cos(perp) * 7,
      baseY + Math.sin(perp) * 7,
    );
    this.graphics.strokePath();
  }

  protected onProjectileImpact(
    x: number,
    y: number,
    projectile: ProjectileState,
    reason: "enemy" | "wall" | "timeout",
  ): void {
    void projectile;
    void reason;
    this.createImpactEffect(x, y, 82, 0xf97316, 220);
  }
}
