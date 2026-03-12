import type * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import { Weapon } from "../weapon";

type BoomerangState = {
  active: boolean;
  returning: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  hitCooldownMs: number;
};

export class BoomerangWeapon extends Weapon {
  readonly name = "Boomerang";
  readonly quality = 2;
  readonly icon = "ghost";
  readonly description =
    "Throws a curved blade that swings back to the owner after its run.";
  readonly attackSpeedMs = 1300;
  readonly type = "melee" as const;

  private readonly orbitRadius = 46;
  private readonly throwSpeed = 460;
  private readonly returnSpeed = 520;
  private readonly maxFlightMs = 900;
  private readonly hitDamage = 5;
  private throwCooldownMs = 0;
  private flightRemainingMs = 0;
  private graphics!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Graphics;
  private boomerang: BoomerangState = {
    active: false,
    returning: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rotation: 0,
    hitCooldownMs: 0,
  };

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
    this.trail = this.scene.add.graphics();
    this.trail.setDepth(1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
    this.trail.destroy();
  }

  update(delta: number): void {
    this.throwCooldownMs = Math.max(0, this.throwCooldownMs - delta);
    this.boomerang.hitCooldownMs = Math.max(
      0,
      this.boomerang.hitCooldownMs - delta,
    );
    this.trail.clear();

    if (!this.boomerang.active && this.throwCooldownMs <= 0) {
      this.launch();
    }

    if (this.boomerang.active) {
      this.updateBoomerang(delta);
      return;
    }

    const angle = (this.scene.time.now / 260) % (Math.PI * 2);
    const x = this.ball.body.x + Math.cos(angle) * this.orbitRadius;
    const y = this.ball.body.y + Math.sin(angle) * this.orbitRadius;
    this.drawBoomerang(x, y, angle);
  }

  private launch(): void {
    const enemy = this.getActiveEnemy();
    const angle = enemy
      ? Math.atan2(
          enemy.body.y - this.ball.body.y,
          enemy.body.x - this.ball.body.x,
        )
      : 0;

    this.boomerang = {
      active: true,
      returning: false,
      x: this.ball.body.x + Math.cos(angle) * 28,
      y: this.ball.body.y + Math.sin(angle) * 28,
      vx: Math.cos(angle) * this.throwSpeed,
      vy: Math.sin(angle) * this.throwSpeed,
      rotation: angle,
      hitCooldownMs: 0,
    };
    this.flightRemainingMs = this.maxFlightMs;
    this.throwCooldownMs = this.attackSpeedMs;
  }

  private updateBoomerang(delta: number): void {
    const previousX = this.boomerang.x;
    const previousY = this.boomerang.y;

    this.flightRemainingMs -= delta;
    if (this.flightRemainingMs <= 0) {
      this.boomerang.returning = true;
    }

    if (this.boomerang.returning) {
      const dx = this.ball.body.x - this.boomerang.x;
      const dy = this.ball.body.y - this.boomerang.y;
      const distance = Math.hypot(dx, dy) || 1;
      this.boomerang.vx = (dx / distance) * this.returnSpeed;
      this.boomerang.vy = (dy / distance) * this.returnSpeed;
      if (distance <= 26) {
        this.boomerang.active = false;
        return;
      }
    }

    this.boomerang.x += this.boomerang.vx * (delta / 1000);
    this.boomerang.y += this.boomerang.vy * (delta / 1000);
    this.boomerang.rotation += delta * 0.015;

    this.trail.lineStyle(5, 0xf59e0b, 0.24);
    this.trail.beginPath();
    this.trail.moveTo(previousX, previousY);
    this.trail.lineTo(this.boomerang.x, this.boomerang.y);
    this.trail.strokePath();

    this.tryHitEnemy();
    this.drawBoomerang(
      this.boomerang.x,
      this.boomerang.y,
      this.boomerang.rotation,
    );
  }

  private tryHitEnemy(): void {
    const enemy = this.getActiveEnemy();
    if (!enemy || this.boomerang.hitCooldownMs > 0) {
      return;
    }

    const distance = Math.hypot(
      this.boomerang.x - enemy.body.x,
      this.boomerang.y - enemy.body.y,
    );
    if (distance <= BALL_COLLISION_RADIUS * enemy.physicsScale + 20) {
      enemy.takeDamage(this.hitDamage);
      this.boomerang.hitCooldownMs = 220;
      this.boomerang.returning = true;
    }
  }

  private drawBoomerang(x: number, y: number, angle: number): void {
    const leftAngle = angle - 0.5;
    const rightAngle = angle + 0.5;

    this.graphics.clear();
    this.graphics.lineStyle(6, 0x92400e, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(
      x + Math.cos(leftAngle) * 26,
      y + Math.sin(leftAngle) * 26,
    );
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(
      x + Math.cos(rightAngle) * 26,
      y + Math.sin(rightAngle) * 26,
    );
    this.graphics.strokePath();
  }
}
