import * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import type { Ball } from "../ball";
import { Weapon } from "../weapon";

export type ProjectileState = {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  remainingMs: number;
  impactRadius: number;
  splashDamage: number;
  homingTurnRate: number;
  trailWidth: number;
  trailColor: number;
  trailAlpha: number;
  glowRadius: number;
  glowColor: number;
  glowAlpha: number;
  impactColor: number;
  impactDurationMs: number;
};

export abstract class RangedWeapon extends Weapon {
  readonly type = "ranged" as const;

  protected idleAngle = 0;
  protected projectiles: ProjectileState[] = [];
  private shotCooldownMs = 0;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private glowGraphics!: Phaser.GameObjects.Graphics;

  protected abstract readonly orbitRadius: number;
  protected readonly mountAngleOffset: number = 0;
  protected readonly projectileStartDistance: number = 0;
  protected abstract readonly projectileSpeed: number;
  protected abstract readonly projectileRadius: number;
  protected abstract readonly projectileDamage: number;
  protected abstract readonly projectileColor: number;
  protected readonly projectileLifetimeMs: number = 2400;
  protected readonly projectilesPerShot: number = 1;
  protected readonly projectileSpreadAngle: number = 0;
  protected readonly projectileTrailWidth: number = 0;
  protected readonly projectileTrailColor: number = 0xffffff;
  protected readonly projectileTrailAlpha: number = 0;
  protected readonly projectileGlowRadius: number = 0;
  protected readonly projectileGlowColor: number = 0xffffff;
  protected readonly projectileGlowAlpha: number = 0;
  protected readonly projectileStrokeWidth: number = 3;
  protected readonly projectileStrokeColor: number = 0x111111;
  protected readonly homingTurnRate: number = 0;
  protected readonly impactEffectRadius: number = 0;
  protected readonly impactEffectColor: number = 0xffffff;
  protected readonly impactEffectDurationMs: number = 180;
  protected readonly impactSplashRadius: number = 0;
  protected readonly impactSplashDamage: number = 0;

  protected onApply(): void {
    this.idleAngle = Math.random() * Math.PI * 2;
    this.shotCooldownMs = this.attackSpeedMs;
    this.trailGraphics = this.scene.add.graphics();
    this.trailGraphics.setDepth(2);
    this.glowGraphics = this.scene.add.graphics();
    this.glowGraphics.setDepth(2);
    this.onEquip();
  }

  protected onRemove(): void {
    for (const projectile of this.projectiles) {
      projectile.sprite.destroy();
    }
    this.projectiles = [];
    this.trailGraphics.destroy();
    this.glowGraphics.destroy();
    this.onUnequip();
  }

  update(delta: number): void {
    this.idleAngle += delta * 0.0012;

    const enemy = this.getActiveEnemy();
    const aimAngle = enemy
      ? Math.atan2(
          enemy.body.y - this.ball.body.y,
          enemy.body.x - this.ball.body.x,
        )
      : this.idleAngle;
    const mountAngle = aimAngle + this.mountAngleOffset;
    const x = this.ball.body.x + Math.cos(mountAngle) * this.orbitRadius;
    const y = this.ball.body.y + Math.sin(mountAngle) * this.orbitRadius;

    this.updateVisual(x, y, aimAngle, mountAngle);

    if (enemy) {
      this.shotCooldownMs -= delta;
      while (this.shotCooldownMs <= 0) {
        this.fireProjectiles(x, y, aimAngle, enemy);
        this.shotCooldownMs += this.attackSpeedMs;
      }
    }

    this.updateProjectiles(delta);
  }

  protected abstract onEquip(): void;
  protected abstract onUnequip(): void;
  protected abstract updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void;

  protected onProjectileHit(enemy: Ball, projectile: ProjectileState): void {
    void enemy;
    void projectile;
  }

  protected onProjectileImpact(
    x: number,
    y: number,
    projectile: ProjectileState,
    reason: "enemy" | "wall" | "timeout",
  ): void {
    void x;
    void y;
    void projectile;
    void reason;
  }

  private fireProjectiles(
    x: number,
    y: number,
    baseAngle: number,
    enemy: Ball,
  ): void {
    const shotCount = Math.max(1, this.projectilesPerShot);
    const spreadStep = shotCount === 1 ? 0 : this.projectileSpreadAngle;
    const centerOffset = (shotCount - 1) / 2;

    for (let index = 0; index < shotCount; index += 1) {
      const angle = baseAngle + (index - centerOffset) * spreadStep;
      this.fireSingleProjectile(x, y, angle, enemy);
    }
  }

  private fireSingleProjectile(
    x: number,
    y: number,
    angle: number,
    enemy: Ball,
  ): void {
    void enemy;
    const startX = x + Math.cos(angle) * this.projectileStartDistance;
    const startY = y + Math.sin(angle) * this.projectileStartDistance;
    const vx = Math.cos(angle) * this.projectileSpeed;
    const vy = Math.sin(angle) * this.projectileSpeed;
    const sprite = this.scene.add.circle(
      startX,
      startY,
      this.projectileRadius,
      this.projectileColor,
      1,
    );
    sprite.setDepth(3);
    sprite.setStrokeStyle(
      this.projectileStrokeWidth,
      this.projectileStrokeColor,
      0.6,
    );
    this.projectiles.push({
      sprite,
      x: startX,
      y: startY,
      previousX: startX,
      previousY: startY,
      vx,
      vy,
      remainingMs: this.projectileLifetimeMs,
      impactRadius: this.impactEffectRadius,
      splashDamage: this.impactSplashDamage,
      homingTurnRate: this.homingTurnRate,
      trailWidth: this.projectileTrailWidth,
      trailColor: this.projectileTrailColor,
      trailAlpha: this.projectileTrailAlpha,
      glowRadius: this.projectileGlowRadius,
      glowColor: this.projectileGlowColor,
      glowAlpha: this.projectileGlowAlpha,
      impactColor: this.impactEffectColor,
      impactDurationMs: this.impactEffectDurationMs,
    });
  }

  private updateProjectiles(delta: number): void {
    const enemy = this.getActiveEnemy();
    this.trailGraphics.clear();
    this.glowGraphics.clear();

    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      projectile.remainingMs -= delta;

      if (projectile.remainingMs <= 0) {
        this.resolveProjectileImpact(
          projectile,
          projectile.x,
          projectile.y,
          "timeout",
        );
        return false;
      }

      if (enemy && projectile.homingTurnRate > 0) {
        const speed =
          Math.hypot(projectile.vx, projectile.vy) || this.projectileSpeed;
        const desiredX = enemy.body.x - projectile.x;
        const desiredY = enemy.body.y - projectile.y;
        const desiredDistance = Math.hypot(desiredX, desiredY) || 1;
        const currentX = projectile.vx / speed;
        const currentY = projectile.vy / speed;
        const blend = Math.min(1, projectile.homingTurnRate * (delta / 1000));
        const nextDirX = Phaser.Math.Linear(
          currentX,
          desiredX / desiredDistance,
          blend,
        );
        const nextDirY = Phaser.Math.Linear(
          currentY,
          desiredY / desiredDistance,
          blend,
        );
        const nextDistance = Math.hypot(nextDirX, nextDirY) || 1;
        projectile.vx = (nextDirX / nextDistance) * speed;
        projectile.vy = (nextDirY / nextDistance) * speed;
      }

      projectile.x += projectile.vx * (delta / 1000);
      projectile.y += projectile.vy * (delta / 1000);
      projectile.sprite.setPosition(projectile.x, projectile.y);

      if (projectile.trailWidth > 0 && projectile.trailAlpha > 0) {
        this.trailGraphics.lineStyle(
          projectile.trailWidth,
          projectile.trailColor,
          projectile.trailAlpha,
        );
        this.trailGraphics.beginPath();
        this.trailGraphics.moveTo(projectile.previousX, projectile.previousY);
        this.trailGraphics.lineTo(projectile.x, projectile.y);
        this.trailGraphics.strokePath();
      }

      if (projectile.glowRadius > 0 && projectile.glowAlpha > 0) {
        this.glowGraphics.fillStyle(projectile.glowColor, projectile.glowAlpha);
        this.glowGraphics.fillCircle(
          projectile.x,
          projectile.y,
          projectile.glowRadius,
        );
      }

      if (
        projectile.x <= projectile.sprite.radius ||
        projectile.x >= this.ball.arenaWidth - projectile.sprite.radius ||
        projectile.y <= projectile.sprite.radius ||
        projectile.y >= this.ball.arenaHeight - projectile.sprite.radius
      ) {
        this.resolveProjectileImpact(
          projectile,
          projectile.x,
          projectile.y,
          "wall",
        );
        return false;
      }

      for (const target of this.getEnemyTargets()) {
        const enemyRadius = BALL_COLLISION_RADIUS * target.physicsScale;
        const distance = Math.hypot(
          projectile.x - target.body.x,
          projectile.y - target.body.y,
        );
        if (distance <= this.projectileRadius + enemyRadius) {
          target.takeDamage(this.projectileDamage);
          this.onProjectileHit(target, projectile);
          this.resolveProjectileImpact(
            projectile,
            projectile.x,
            projectile.y,
            "enemy",
          );
          return false;
        }
      }

      return true;
    });
  }

  private resolveProjectileImpact(
    projectile: ProjectileState,
    x: number,
    y: number,
    reason: "enemy" | "wall" | "timeout",
  ): void {
    projectile.sprite.destroy();

    if (projectile.impactRadius > 0) {
      this.createImpactEffect(
        x,
        y,
        projectile.impactRadius,
        projectile.impactColor,
        projectile.impactDurationMs,
      );
    }

    if (projectile.splashDamage > 0 && this.impactSplashRadius > 0) {
      for (const target of this.getEnemyTargets()) {
        const distance = Math.hypot(x - target.body.x, y - target.body.y);
        if (
          distance <=
          this.impactSplashRadius + BALL_COLLISION_RADIUS * target.physicsScale
        ) {
          target.takeDamage(projectile.splashDamage);
        }
      }
    }

    this.onProjectileImpact(x, y, projectile, reason);
  }

  protected createImpactEffect(
    x: number,
    y: number,
    radius: number,
    color: number,
    durationMs: number,
  ): void {
    const effect = this.scene.add.graphics();
    effect.setDepth(4);
    effect.fillStyle(color, 0.32);
    effect.fillCircle(x, y, radius);
    effect.lineStyle(4, color, 0.8);
    effect.strokeCircle(x, y, radius * 0.72);
    this.scene.time.delayedCall(durationMs, () => {
      effect.destroy();
    });
  }

  protected getEnemyTargets(): Ball[] {
    const enemy = this.getActiveEnemy();
    if (!enemy) {
      return [];
    }

    return [enemy, ...enemy.ghostBalls];
  }
}
