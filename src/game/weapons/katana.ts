import type * as Phaser from "phaser";
import { MeleeWeapon } from "./melee-weapon";
import { WeaponImageSprite } from "./weapon-image";

const KATANA_REACH = 66;

export class KatanaWeapon extends MeleeWeapon {
  readonly name = "Katana";
  readonly quality = 3;
  readonly icon = "fire";
  readonly description =
    "A broad samurai blade with a dramatic diagonal draw and heavy slashes.";
  readonly attackSpeedMs = 420;

  protected readonly orbitRadius = KATANA_REACH;
  protected readonly swingSpeed = Math.PI * 1.8;
  protected readonly contactRadius = 32;
  protected readonly contactDamage = 8;

  private sprite!: WeaponImageSprite;
  private slash!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.sprite = new WeaponImageSprite(this.scene, {
      path: "/weapons/katana_sword.svg",
      scale: 0.3,
      anchorSide: "top-right",
      rotationOffset: -Math.PI / 4,
      closenessToBall: 34,
      depth: 2,
    });
    this.slash = this.scene.add.graphics();
    this.slash.setDepth(1);
    this.sprite.load();
  }

  protected onUnequip(): void {
    this.slash.destroy();
    this.sprite.destroy();
  }

  protected updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void {
    const tipX = x + Math.cos(angle - Math.PI / 4) * 86;
    const tipY = y + Math.sin(angle - Math.PI / 4) * 86;

    this.slash.clear();
    this.slash.lineStyle(8, 0xfca5a5, 0.2);
    this.slash.beginPath();
    this.slash.moveTo(this.ball.body.x, this.ball.body.y);
    this.slash.lineTo(tipX, tipY);
    this.slash.strokePath();

    this.sprite.setTransform(x, y, angle, mountAngle);
  }
}
