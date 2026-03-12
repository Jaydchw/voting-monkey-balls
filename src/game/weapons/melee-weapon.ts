import * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import { Weapon } from "../weapon";

export abstract class MeleeWeapon extends Weapon {
  readonly type = "melee" as const;

  protected angle = 0;
  private hitCooldownMs = 0;

  protected abstract readonly orbitRadius: number;
  protected abstract readonly swingSpeed: number;
  protected abstract readonly contactRadius: number;
  protected abstract readonly contactDamage: number;

  protected onApply(): void {
    this.angle = Math.random() * Math.PI * 2;
    this.hitCooldownMs = 0;
    this.onEquip();
  }

  protected onRemove(): void {
    this.onUnequip();
  }

  update(delta: number): void {
    this.angle = Phaser.Math.Angle.Wrap(
      this.angle + this.swingSpeed * (delta / 1000),
    );
    this.hitCooldownMs = Math.max(0, this.hitCooldownMs - delta);

    const x = this.ball.body.x + Math.cos(this.angle) * this.orbitRadius;
    const y = this.ball.body.y + Math.sin(this.angle) * this.orbitRadius;

    this.updateVisual(x, y, this.angle, this.angle);

    const enemy = this.getActiveEnemy();
    if (!enemy || this.hitCooldownMs > 0) {
      return;
    }

    const enemyRadius = BALL_COLLISION_RADIUS * enemy.physicsScale;
    const distance = Math.hypot(x - enemy.body.x, y - enemy.body.y);
    if (distance <= this.contactRadius + enemyRadius) {
      enemy.takeDamage(this.contactDamage);
      this.onHit(enemy);
      this.hitCooldownMs = this.attackSpeedMs;
    }
  }

  protected abstract onEquip(): void;
  protected abstract onUnequip(): void;
  protected onHit(enemy: import("../ball").Ball): void {
    void enemy;
  }
  protected abstract updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void;
}
