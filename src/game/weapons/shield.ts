import type * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import type { Ball } from "../ball";
import { MeleeWeapon } from "./melee-weapon";
import { RangedWeapon } from "./ranged-weapon";

const SHIELD_REACH = 50;
const SHIELD_RADIUS = 24;

export class ShieldWeapon extends MeleeWeapon {
  readonly name = "Shield";
  readonly quality = 3;
  readonly icon = "shield";
  readonly description =
    "A rotating shield that blocks melee and reflects incoming projectiles.";
  readonly attackSpeedMs = 280;
  readonly sound = "clash" as const;

  protected readonly orbitRadius = SHIELD_REACH;
  protected readonly swingSpeed = Math.PI * 1.55;
  protected readonly contactRadius = SHIELD_RADIUS;
  protected readonly contactDamage = 2;
  protected readonly contactHitEffect = "impact" as const;

  private graphics!: Phaser.GameObjects.Graphics;
  private pulse = 0;
  private shieldX = 0;
  private shieldY = 0;

  protected onEquip(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(3);
  }

  protected onUnequip(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    super.update(delta);
    this.pulse += delta * 0.01;
    this.reflectEnemyProjectiles();
  }

  protected onHit(_enemy: Ball): void {
    void _enemy;
    this.ball.heal(0.3);
  }

  protected updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    this.shieldX = x;
    this.shieldY = y;

    const pulseAlpha = 0.16 + Math.sin(this.pulse) * 0.05;
    const majorAxis = SHIELD_RADIUS * 1.35;
    const minorAxis = SHIELD_RADIUS * 0.92;
    const emblemX = x + Math.cos(angle) * 8;
    const emblemY = y + Math.sin(angle) * 8;

    this.graphics.clear();
    this.graphics.fillStyle(0x0ea5e9, pulseAlpha);
    this.graphics.fillEllipse(x, y, majorAxis + 14, minorAxis + 14);
    this.graphics.fillStyle(0x0f172a, 0.8);
    this.graphics.fillEllipse(x, y, majorAxis, minorAxis);
    this.graphics.lineStyle(5, 0x38bdf8, 0.95);
    this.graphics.strokeEllipse(x, y, majorAxis, minorAxis);
    this.graphics.lineStyle(3, 0xe0f2fe, 0.92);
    this.graphics.strokeEllipse(x, y, majorAxis - 12, minorAxis - 8);
    this.graphics.fillStyle(0xe2e8f0, 0.95);
    this.graphics.fillCircle(emblemX, emblemY, 6);
  }

  private reflectEnemyProjectiles(): void {
    const enemy = this.getActiveEnemy();
    if (!enemy) {
      return;
    }

    const reflectionRadius = SHIELD_RADIUS * 1.2 + BALL_COLLISION_RADIUS * 0.28;
    for (const weapon of enemy.weapons) {
      if (weapon instanceof RangedWeapon) {
        weapon.reflectProjectilesAround(
          this.shieldX,
          this.shieldY,
          reflectionRadius,
          this.ball,
        );
      }
    }
  }
}
