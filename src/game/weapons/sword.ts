import type * as Phaser from "phaser";
import { MeleeWeapon } from "./melee-weapon";

const SWORD_REACH = 58;
const SWORD_SWING_SPEED = Math.PI * 2.1;
const SWORD_LENGTH = 64;
const SWORD_DAMAGE = 6;

export class SwordWeapon extends MeleeWeapon {
  readonly name = "Sword";
  readonly quality = 1;
  readonly icon = "asterisk";
  readonly description =
    "A simple sword that spins around the ball and deals contact damage.";
  readonly attackSpeedMs = 300;
  readonly sound = "slice" as const;

  protected readonly orbitRadius = SWORD_REACH;
  protected readonly swingSpeed = SWORD_SWING_SPEED;
  protected readonly contactRadius = 26;
  protected readonly contactDamage = SWORD_DAMAGE;
  protected readonly contactHitEffect = "slash" as const;

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
    angle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    const handleLength = 42;
    const bladeWidth = 10;
    const guardWidth = 14;
    const perp = angle + Math.PI / 2;
    const tipX = x + Math.cos(angle) * (SWORD_LENGTH * 0.8);
    const tipY = y + Math.sin(angle) * (SWORD_LENGTH * 0.8);
    const leftX = x + Math.cos(perp) * bladeWidth;
    const leftY = y + Math.sin(perp) * bladeWidth;
    const rightX = x - Math.cos(perp) * bladeWidth;
    const rightY = y - Math.sin(perp) * bladeWidth;
    const handleX = x - Math.cos(angle) * handleLength;
    const handleY = y - Math.sin(angle) * handleLength;

    this.graphics.clear();
    this.graphics.fillStyle(0xfef3c7, 0.22);
    this.graphics.fillCircle(x, y, 20);
    this.graphics.fillStyle(0xe7e5e4, 1);
    this.graphics.lineStyle(3, 0x111111, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(leftX, leftY);
    this.graphics.lineTo(tipX, tipY);
    this.graphics.lineTo(rightX, rightY);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();

    this.graphics.lineStyle(5, 0x7c2d12, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(handleX, handleY);
    this.graphics.lineTo(x, y);
    this.graphics.strokePath();

    this.graphics.lineStyle(5, 0xc2410c, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(
      x + Math.cos(perp) * guardWidth,
      y + Math.sin(perp) * guardWidth,
    );
    this.graphics.lineTo(
      x - Math.cos(perp) * guardWidth,
      y - Math.sin(perp) * guardWidth,
    );
    this.graphics.strokePath();
  }
}
