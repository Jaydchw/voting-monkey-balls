import type * as Phaser from "phaser";
import { MeleeWeapon } from "./melee-weapon";
import { WeaponImageSprite } from "./weapon-image";

const RAPIER_REACH = 68;

export class RapierWeapon extends MeleeWeapon {
  readonly name = "Rapier";
  readonly quality = 2;
  readonly icon = "target";
  readonly description =
    "A long dueling blade that carves elegant circles around the ball.";
  readonly attackSpeedMs = 240;

  protected readonly orbitRadius = RAPIER_REACH;
  protected readonly swingSpeed = Math.PI * 2.45;
  protected readonly contactRadius = 40;
  protected readonly contactDamage = 4;

  private sprite!: WeaponImageSprite;
  private trail!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.sprite = new WeaponImageSprite(this.scene, {
      path: "/weapons/Rapiere.svg",
      scale: 0.4,
      anchorSide: "left",
      rotationOffset: 0,
      closenessToBall: 18,
      depth: 2,
    });
    this.trail = this.scene.add.graphics();
    this.trail.setDepth(1);
    this.sprite.load();
  }

  protected onUnequip(): void {
    this.trail.destroy();
    this.sprite.destroy();
  }

  protected updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void {
    const tipX = x + Math.cos(angle) * 72;
    const tipY = y + Math.sin(angle) * 72;

    this.trail.clear();
    this.trail.lineStyle(4, 0xf8fafc, 0.35);
    this.trail.beginPath();
    this.trail.moveTo(this.ball.body.x, this.ball.body.y);
    this.trail.lineTo(tipX, tipY);
    this.trail.strokePath();

    this.sprite.setTransform(x, y, angle, mountAngle);
  }
}
