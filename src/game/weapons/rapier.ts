import type * as Phaser from "phaser";
import { MeleeWeapon } from "./melee-weapon";
import { Knife } from "@phosphor-icons/react";

const RAPIER_REACH = 68;

export class RapierWeapon extends MeleeWeapon {
  readonly name = "Rapier";
  readonly quality = 2;
  readonly icon = Knife;
  readonly description =
    "A long dueling blade that carves elegant circles around the ball.";
  readonly attackSpeedMs = 240;
  readonly sound = "stab" as const;

  protected readonly orbitRadius = RAPIER_REACH;
  protected readonly swingSpeed = Math.PI * 2.45;
  protected readonly contactRadius = 40;
  protected readonly contactDamage = 4;
  protected readonly contactHitEffect = "slash" as const;

  private blade!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.blade = this.scene.add.graphics();
    this.blade.setDepth(2);
    this.trail = this.scene.add.graphics();
    this.trail.setDepth(1);
  }

  protected onUnequip(): void {
    this.trail.destroy();
    this.blade.destroy();
  }

  protected updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void {
    const tipX = x + Math.cos(angle) * 72;
    const tipY = y + Math.sin(angle) * 72;

    const guardX = x - Math.cos(angle) * 18;
    const guardY = y - Math.sin(angle) * 18;
    const pommelX = x - Math.cos(angle) * 36;
    const pommelY = y - Math.sin(angle) * 36;
    const perp = angle + Math.PI / 2;

    this.trail.clear();
    this.trail.lineStyle(4, 0xf8fafc, 0.35);
    this.trail.beginPath();
    this.trail.moveTo(this.ball.body.x, this.ball.body.y);
    this.trail.lineTo(tipX, tipY);
    this.trail.strokePath();
    this.trail.fillStyle(0xe0f2fe, 0.14);
    this.trail.fillCircle(tipX, tipY, 12);

    this.blade.clear();
    this.blade.lineStyle(4, 0xe2e8f0, 1);
    this.blade.beginPath();
    this.blade.moveTo(pommelX, pommelY);
    this.blade.lineTo(tipX, tipY);
    this.blade.strokePath();
    this.blade.lineStyle(5, 0xfbbf24, 1);
    this.blade.beginPath();
    this.blade.moveTo(
      guardX - Math.cos(perp) * 10,
      guardY - Math.sin(perp) * 10,
    );
    this.blade.lineTo(
      guardX + Math.cos(perp) * 10,
      guardY + Math.sin(perp) * 10,
    );
    this.blade.strokePath();
    this.blade.fillStyle(0xf8fafc, 1);
    this.blade.fillCircle(tipX, tipY, 4);
    void mountAngle;
  }
}
