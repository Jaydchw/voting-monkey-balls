import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";
import { WeaponImageSprite } from "./weapon-image";

const TREBLE_CLEF_REACH = 68;

export class TrebleClefWeapon extends RangedWeapon {
  readonly name = "Treble Clef";
  readonly quality = 3;
  readonly icon = "lightning";
  readonly description =
    "A dramatic clef that locks onto the enemy and launches booming crescendos.";
  readonly attackSpeedMs = 1200;

  protected readonly orbitRadius = TREBLE_CLEF_REACH;
  protected readonly projectileStartDistance = 28;
  protected readonly projectileSpeed = 520;
  protected readonly projectileRadius = 14;
  protected readonly projectileDamage = 7;
  protected readonly projectileColor = 0xa855f7;
  protected readonly projectileTrailWidth = 7;
  protected readonly projectileTrailColor = 0xc084fc;
  protected readonly projectileTrailAlpha = 0.26;
  protected readonly projectileGlowRadius = 18;
  protected readonly projectileGlowColor = 0xe9d5ff;
  protected readonly projectileGlowAlpha = 0.14;

  private sprite!: WeaponImageSprite;
  private aura!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.sprite = new WeaponImageSprite(this.scene, {
      path: "/weapons/treble-clef.svg",
      scale: 1.5,
      anchorSide: "bottom",
      rotationOffset: Math.PI / 2,
      closenessToBall: 70,
      depth: 2,
    });
    this.aura = this.scene.add.graphics();
    this.aura.setDepth(1);
    this.sprite.load();
  }

  protected onUnequip(): void {
    this.aura.destroy();
    this.sprite.destroy();
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    this.aura.clear();
    this.aura.fillStyle(0xe9d5ff, 0.16);
    this.aura.fillCircle(x, y, 24);
    this.sprite.setTransform(x, y, aimAngle, mountAngle);
  }
}
