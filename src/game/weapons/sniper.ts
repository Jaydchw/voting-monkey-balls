import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";

const SNIPER_REACH = 68;
const SNIPER_LENGTH = 48;

export class SniperWeapon extends RangedWeapon {
  readonly name = "Sniper";
  readonly quality = 4;
  readonly icon = "target";
  readonly description =
    "A high-caliber rifle with a red sight line and devastating shots.";
  readonly attackSpeedMs = 1450;

  protected readonly orbitRadius = SNIPER_REACH;
  protected readonly projectileStartDistance = 42;
  protected readonly projectileSpeed = 1100;
  protected readonly projectileRadius = 8;
  protected readonly projectileDamage = 15;
  protected readonly projectileColor = 0xf8fafc;
  protected readonly projectileTrailWidth = 4;
  protected readonly projectileTrailColor = 0xfca5a5;
  protected readonly projectileTrailAlpha = 0.42;
  protected readonly impactEffectRadius = 26;
  protected readonly impactEffectColor = 0xef4444;

  private rifle!: Phaser.GameObjects.Graphics;
  private sight!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.rifle = this.scene.add.graphics();
    this.rifle.setDepth(2);
    this.sight = this.scene.add.graphics();
    this.sight.setDepth(1);
  }

  protected onUnequip(): void {
    this.rifle.destroy();
    this.sight.destroy();
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    const enemy = this.getActiveEnemy();
    const baseX = x - Math.cos(aimAngle) * SNIPER_LENGTH * 0.45;
    const baseY = y - Math.sin(aimAngle) * SNIPER_LENGTH * 0.45;
    const tipX = x + Math.cos(aimAngle) * SNIPER_LENGTH * 0.55;
    const tipY = y + Math.sin(aimAngle) * SNIPER_LENGTH * 0.55;
    const scopeX = x - Math.cos(aimAngle) * 3;
    const scopeY = y - Math.sin(aimAngle) * 3;

    this.rifle.clear();
    this.rifle.lineStyle(7, 0x111827, 1);
    this.rifle.beginPath();
    this.rifle.moveTo(baseX, baseY);
    this.rifle.lineTo(tipX, tipY);
    this.rifle.strokePath();
    this.rifle.fillStyle(0x991b1b, 1);
    this.rifle.fillCircle(scopeX, scopeY, 5);

    this.sight.clear();
    if (enemy) {
      this.sight.lineStyle(2, 0xef4444, 0.25);
      this.sight.beginPath();
      this.sight.moveTo(tipX, tipY);
      this.sight.lineTo(enemy.body.x, enemy.body.y);
      this.sight.strokePath();
    }
  }
}
