import * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import type { Ball } from "../ball";
import { Weapon } from "../weapon";

const LASER_REACH = 44;
const LASER_LENGTH = 46;
const LASER_WIDTH = 28;

export class LaserGunWeapon extends Weapon {
  readonly name = "Laser Gun";
  readonly quality = 4;
  readonly icon = "lightning";
  readonly description =
    "Fires very wide, solid laser beams that burn through targets in pulses.";
  readonly attackSpeedMs = 1650;
  readonly type = "ranged" as const;
  readonly sound = { charge: "flick", fire: "laser", wall: "clash" } as const;

  private graphics!: Phaser.GameObjects.Graphics;
  private muzzleGlow!: Phaser.GameObjects.Graphics;
  private shotCooldownMs = 0;
  private chargeRemainingMs = 0;
  private readonly chargeDurationMs = 560;
  private chargeOriginX = 0;
  private chargeOriginY = 0;
  private chargeAngle = 0;
  private beamRemainingMs = 0;
  private damageTickMs = 0;
  private beamOriginX = 0;
  private beamOriginY = 0;
  private beamDirX = 1;
  private beamDirY = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(3);
    this.muzzleGlow = this.scene.add.graphics();
    this.muzzleGlow.setDepth(2);
    this.shotCooldownMs = this.attackSpeedMs;
  }

  protected onRemove(): void {
    this.graphics.destroy();
    this.muzzleGlow.destroy();
  }

  update(delta: number): void {
    const enemy = this.getActiveEnemy();
    const aimAngle = enemy
      ? Math.atan2(
          enemy.body.y - this.ball.body.y,
          enemy.body.x - this.ball.body.x,
        )
      : 0;

    const mountX = this.ball.body.x + Math.cos(aimAngle) * LASER_REACH;
    const mountY = this.ball.body.y + Math.sin(aimAngle) * LASER_REACH;
    const baseX = mountX - Math.cos(aimAngle) * LASER_LENGTH * 0.45;
    const baseY = mountY - Math.sin(aimAngle) * LASER_LENGTH * 0.45;
    const tipX = mountX + Math.cos(aimAngle) * LASER_LENGTH * 0.55;
    const tipY = mountY + Math.sin(aimAngle) * LASER_LENGTH * 0.55;

    this.drawWeapon(baseX, baseY, tipX, tipY, aimAngle);

    this.shotCooldownMs -= delta;
    if (
      enemy &&
      this.chargeRemainingMs <= 0 &&
      this.beamRemainingMs <= 0 &&
      this.shotCooldownMs <= 0
    ) {
      this.beginCharge(tipX, tipY, aimAngle);
      this.shotCooldownMs += this.attackSpeedMs;
    }

    if (this.chargeRemainingMs > 0) {
      this.chargeRemainingMs -= delta;
      this.drawChargeUp();
      if (this.chargeRemainingMs <= 0) {
        this.fireBeam(this.chargeOriginX, this.chargeOriginY, this.chargeAngle);
      }
    }

    if (this.beamRemainingMs > 0) {
      this.beamRemainingMs -= delta;
      this.damageTickMs -= delta;
      this.drawBeam();
      while (this.damageTickMs <= 0) {
        this.applyBeamDamage();
        this.damageTickMs += 90;
      }
    } else {
      this.graphics.clear();
    }
  }

  private drawWeapon(
    baseX: number,
    baseY: number,
    tipX: number,
    tipY: number,
    aimAngle: number,
  ): void {
    this.muzzleGlow.clear();
    this.muzzleGlow.lineStyle(12, 0x0f172a, 1);
    this.muzzleGlow.beginPath();
    this.muzzleGlow.moveTo(baseX, baseY);
    this.muzzleGlow.lineTo(tipX, tipY);
    this.muzzleGlow.strokePath();

    this.muzzleGlow.lineStyle(8, 0x1d4ed8, 1);
    this.muzzleGlow.beginPath();
    this.muzzleGlow.moveTo(
      baseX + Math.cos(aimAngle) * 8,
      baseY + Math.sin(aimAngle) * 8,
    );
    this.muzzleGlow.lineTo(tipX, tipY);
    this.muzzleGlow.strokePath();

    this.muzzleGlow.fillStyle(0x1e3a8a, 0.28);
    this.muzzleGlow.fillCircle(tipX, tipY, 12);
  }

  private beginCharge(originX: number, originY: number, angle: number): void {
    this.chargeRemainingMs = this.chargeDurationMs;
    this.chargeOriginX = originX;
    this.chargeOriginY = originY;
    this.chargeAngle = angle;
    this.playWeaponSound("charge", "flick");
  }

  private drawChargeUp(): void {
    const progress = Phaser.Math.Clamp(
      1 - this.chargeRemainingMs / this.chargeDurationMs,
      0,
      1,
    );

    const pulse = 0.22 + Math.sin(this.scene.time.now * 0.03) * 0.08;
    const focusRadius = Phaser.Math.Linear(20, 5, progress);
    const ringRadius = Phaser.Math.Linear(12, 30, progress);
    const offsetX = Math.cos(this.chargeAngle) * (6 + progress * 18);
    const offsetY = Math.sin(this.chargeAngle) * (6 + progress * 18);
    const px = this.chargeOriginX + offsetX;
    const py = this.chargeOriginY + offsetY;

    this.graphics.clear();
    this.graphics.lineStyle(2, 0x60a5fa, 0.32 + pulse);
    this.graphics.strokeCircle(px, py, ringRadius);
    this.graphics.fillStyle(0x60a5fa, 0.12 + progress * 0.3);
    this.graphics.fillCircle(px, py, focusRadius);
    this.graphics.lineStyle(1, 0xbfdbfe, 0.5 + progress * 0.35);
    this.graphics.beginPath();
    this.graphics.moveTo(px - 26, py);
    this.graphics.lineTo(px + 26, py);
    this.graphics.moveTo(px, py - 26);
    this.graphics.lineTo(px, py + 26);
    this.graphics.strokePath();
  }

  private fireBeam(originX: number, originY: number, angle: number): void {
    this.beamOriginX = originX;
    this.beamOriginY = originY;
    this.beamDirX = Math.cos(angle);
    this.beamDirY = Math.sin(angle);
    this.beamRemainingMs = 230;
    this.damageTickMs = 0;
    this.playWeaponSound("fire", "laser");
  }

  private drawBeam(): void {
    const beamEndX =
      this.beamOriginX + this.beamDirX * this.ball.arenaWidth * 1.4;
    const beamEndY =
      this.beamOriginY + this.beamDirY * this.ball.arenaHeight * 1.4;

    this.graphics.clear();
    this.graphics.lineStyle(LASER_WIDTH + 12, 0x1e3a8a, 0.2);
    this.graphics.beginPath();
    this.graphics.moveTo(this.beamOriginX, this.beamOriginY);
    this.graphics.lineTo(beamEndX, beamEndY);
    this.graphics.strokePath();

    this.graphics.lineStyle(LASER_WIDTH, 0x2563eb, 0.72);
    this.graphics.beginPath();
    this.graphics.moveTo(this.beamOriginX, this.beamOriginY);
    this.graphics.lineTo(beamEndX, beamEndY);
    this.graphics.strokePath();

    this.graphics.lineStyle(10, 0x60a5fa, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(this.beamOriginX, this.beamOriginY);
    this.graphics.lineTo(beamEndX, beamEndY);
    this.graphics.strokePath();
  }

  private applyBeamDamage(): void {
    for (const target of this.getEnemyTargets()) {
      const radius = BALL_COLLISION_RADIUS * target.physicsScale;
      const distance = this.distanceToBeam(target.body.x, target.body.y);
      if (distance <= LASER_WIDTH * 0.5 + radius) {
        target.takeDamage(2.2, { effect: "spark" });
      }
    }
  }

  private getEnemyTargets(): Ball[] {
    const enemy = this.getActiveEnemy();
    if (!enemy) {
      return [];
    }
    return [enemy, ...enemy.ghostBalls];
  }

  private distanceToBeam(x: number, y: number): number {
    const ax = this.beamOriginX;
    const ay = this.beamOriginY;
    const bx = this.beamOriginX + this.beamDirX * this.ball.arenaWidth * 1.4;
    const by = this.beamOriginY + this.beamDirY * this.ball.arenaHeight * 1.4;

    const abx = bx - ax;
    const aby = by - ay;
    const apx = x - ax;
    const apy = y - ay;
    const denom = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / denom));
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    return Math.hypot(x - closestX, y - closestY);
  }
}
