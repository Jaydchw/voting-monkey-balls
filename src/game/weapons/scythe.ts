import type * as Phaser from "phaser";
import type { Ball } from "../ball";
import { MeleeWeapon } from "./melee-weapon";
import { Drop } from "@phosphor-icons/react";

const SCYTHE_REACH = 66;

export class ScytheWeapon extends MeleeWeapon {
  readonly name = "Scythe";
  readonly quality = 3;
  readonly icon = Drop;
  readonly description =
    "A sweeping reaper blade that steals life on every hit.";
  readonly attackSpeedMs = 360;
  readonly sound = "slice" as const;

  protected readonly orbitRadius = SCYTHE_REACH;
  protected readonly swingSpeed = Math.PI * 1.75;
  protected readonly contactRadius = 28;
  protected readonly contactDamage = 7;
  protected readonly contactHitEffect = "slash" as const;

  private graphics!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onUnequip(): void {
    this.graphics.destroy();
  }

  protected onHit(enemy: Ball): void {
    void enemy;
    this.ball.heal(2);
  }

  protected updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    const handleX = x - Math.cos(angle) * 34;
    const handleY = y - Math.sin(angle) * 34;
    const perp = angle + Math.PI / 2;
    const bladeTipX = x + Math.cos(angle) * 28 + Math.cos(perp) * 26;
    const bladeTipY = y + Math.sin(angle) * 28 + Math.sin(perp) * 26;

    this.graphics.clear();
    this.graphics.lineStyle(6, 0x713f12, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(handleX, handleY);
    this.graphics.lineTo(x, y);
    this.graphics.strokePath();
    this.graphics.lineStyle(4, 0xfca5a5, 0.35);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(
      x + Math.cos(angle) * 20 + Math.cos(perp) * 10,
      y + Math.sin(angle) * 20 + Math.sin(perp) * 10,
    );
    this.graphics.lineTo(bladeTipX, bladeTipY);
    this.graphics.strokePath();
    this.graphics.lineStyle(5, 0xe5e7eb, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(bladeTipX, bladeTipY);
    this.graphics.strokePath();
  }
}
