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
  readonly sound = "flick" as const;

  private readonly orbitRadius = 58;
  private readonly throwSpeed = 560;
  private readonly returnSpeed = 640;
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

    const angle = (this.scene.time.now / 220) % (Math.PI * 2);
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
      x: this.ball.body.x + Math.cos(angle) * 34,
      y: this.ball.body.y + Math.sin(angle) * 34,
      vx: Math.cos(angle) * this.throwSpeed,
      vy: Math.sin(angle) * this.throwSpeed,
      rotation: angle,
      hitCooldownMs: 0,
    };
    this.flightRemainingMs = this.maxFlightMs;
    this.throwCooldownMs = this.attackSpeedMs;
    this.playWeaponSound("fire", "flick");
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
      if (distance <= 30) {
        this.boomerang.active = false;
        return;
      }
    }

    if (this.ball.projectileGravityY !== 0) {
      this.boomerang.vy += this.ball.projectileGravityY * (delta / 1000);
    }

    this.boomerang.x += this.boomerang.vx * (delta / 1000);
    this.boomerang.y += this.boomerang.vy * (delta / 1000);
    this.boomerang.rotation += delta * 0.015;

    this.trail.lineStyle(7, 0xf59e0b, 0.28);
    this.trail.beginPath();
    this.trail.moveTo(previousX, previousY);
    this.trail.lineTo(this.boomerang.x, this.boomerang.y);
    this.trail.strokePath();
    this.trail.fillStyle(0xfde68a, 0.12);
    this.trail.fillCircle(this.boomerang.x, this.boomerang.y, 18);

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
    if (distance <= BALL_COLLISION_RADIUS * enemy.physicsScale + 28) {
      enemy.takeDamage(this.hitDamage);
      this.playWeaponSound("hit", "slice");
      this.boomerang.hitCooldownMs = 220;
      this.boomerang.returning = true;
    }
  }

  private drawBoomerang(x: number, y: number, angle: number): void {
    const leftAngle = angle - 0.58;
    const rightAngle = angle + 0.58;
    const leftOuterX = x + Math.cos(leftAngle) * 36;
    const leftOuterY = y + Math.sin(leftAngle) * 36;
    const rightOuterX = x + Math.cos(rightAngle) * 36;
    const rightOuterY = y + Math.sin(rightAngle) * 36;
    const leftInnerX = x + Math.cos(leftAngle) * 14;
    const leftInnerY = y + Math.sin(leftAngle) * 14;
    const rightInnerX = x + Math.cos(rightAngle) * 14;
    const rightInnerY = y + Math.sin(rightAngle) * 14;

    this.graphics.clear();
    this.graphics.fillStyle(0xfbbf24, 0.18);
    this.graphics.fillCircle(x, y, 20);
    this.graphics.fillStyle(0xb45309, 1);
    this.graphics.lineStyle(4, 0x78350f, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(leftInnerX, leftInnerY);
    this.graphics.lineTo(leftOuterX, leftOuterY);
    this.graphics.lineTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
    this.graphics.strokePath();
    this.graphics.fillPoints(
      [
        { x: leftInnerX, y: leftInnerY },
        { x: leftOuterX, y: leftOuterY },
        { x: x + Math.cos(angle) * 10, y: y + Math.sin(angle) * 10 },
      ],
      true,
    );
    this.graphics.beginPath();
    this.graphics.moveTo(rightInnerX, rightInnerY);
    this.graphics.lineTo(rightOuterX, rightOuterY);
    this.graphics.lineTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
    this.graphics.strokePath();
    this.graphics.fillPoints(
      [
        { x: rightInnerX, y: rightInnerY },
        { x: rightOuterX, y: rightOuterY },
        { x: x + Math.cos(angle) * 10, y: y + Math.sin(angle) * 10 },
      ],
      true,
    );
    this.graphics.fillStyle(0xfef3c7, 0.95);
    this.graphics.fillCircle(x, y, 6);
  }
}
