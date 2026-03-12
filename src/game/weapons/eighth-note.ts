import type * as Phaser from "phaser";
import { RangedWeapon } from "./ranged-weapon";
import { WeaponImageSprite } from "./weapon-image";

const EIGHTH_NOTE_REACH = 62;

export class EighthNoteWeapon extends RangedWeapon {
  readonly name = "Eighth Note";
  readonly quality = 2;
  readonly icon = "ghost";
  readonly description =
    "A flying note that hurls fast sonic pulses straight at the enemy.";
  readonly attackSpeedMs = 650;

  protected readonly orbitRadius = EIGHTH_NOTE_REACH;
  protected readonly projectileStartDistance = 24;
  protected readonly projectileSpeed = 640;
  protected readonly projectileRadius = 10;
  protected readonly projectileDamage = 3;
  protected readonly projectileColor = 0x60a5fa;
  protected readonly projectileTrailWidth = 6;
  protected readonly projectileTrailColor = 0x60a5fa;
  protected readonly projectileTrailAlpha = 0.24;
  protected readonly projectileGlowRadius = 12;
  protected readonly projectileGlowColor = 0x93c5fd;
  protected readonly projectileGlowAlpha = 0.16;

  private sprite!: WeaponImageSprite;
  private glow!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.sprite = new WeaponImageSprite(this.scene, {
      path: "/weapons/eighth-note.svg",
      scale: 0.5,
      anchorSide: "bottom",
      rotationOffset: Math.PI / 2,
      closenessToBall: 20,
      depth: 2,
    });
    this.glow = this.scene.add.graphics();
    this.glow.setDepth(1);
    this.sprite.load();
  }

  protected onUnequip(): void {
    this.glow.destroy();
    this.sprite.destroy();
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    this.glow.clear();
    this.glow.fillStyle(0x93c5fd, 0.18);
    this.glow.fillCircle(x, y, 22);
    this.sprite.setTransform(x, y, aimAngle, mountAngle);
  }
}
