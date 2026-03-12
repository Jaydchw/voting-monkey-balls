import * as Phaser from "phaser";
import { playGameSfx } from "@/lib/game-sfx";
import { BALL_COLLISION_RADIUS } from "../ball";
import type { Ball } from "../ball";
import type { HitEffectType } from "../ball";
import type { GameSfxId } from "@/lib/game-sfx";
import { Weapon } from "../weapon";

export type ProjectileState = {
  sprite: Phaser.GameObjects.GameObject;
  radius: number;
  ownerBall: Ball;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  remainingMs: number;
  wallBouncesRemaining: number;
  piercesWalls: boolean;
  impactRadius: number;
  splashDamage: number;
  homingTurnRate: number;
  trailWidth: number;
  trailColor: number;
  trailAlpha: number;
  trailParticleRadius: number;
  trailParticleAlpha: number;
  glowRadius: number;
  glowColor: number;
  glowAlpha: number;
  lightRadius: number;
  lightColor: number;
  lightAlpha: number;
  hitEffect: HitEffectType;
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
  private lightGraphics!: Phaser.GameObjects.Graphics;

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
  protected readonly projectileWallBounces: number = 0;
  protected readonly projectilePiercesWalls: boolean = false;
  protected readonly projectileTrailWidth: number = 0;
  protected readonly projectileTrailColor: number = 0xffffff;
  protected readonly projectileTrailAlpha: number = 0;
  protected readonly projectileTrailParticleRadius: number = 0;
  protected readonly projectileTrailParticleAlpha: number = 0;
  protected readonly projectileGlowRadius: number = 0;
  protected readonly projectileGlowColor: number = 0xffffff;
  protected readonly projectileGlowAlpha: number = 0;
  protected readonly projectileLightRadius: number = 0;
  protected readonly projectileLightColor: number = 0xffffff;
  protected readonly projectileLightAlpha: number = 0;
  protected readonly projectileHitEffect: HitEffectType = "impact";
  protected readonly projectileStrokeWidth: number = 3;
  protected readonly projectileStrokeColor: number = 0x111111;
  protected readonly homingTurnRate: number = 0;
  protected readonly impactEffectRadius: number = 0;
  protected readonly impactEffectColor: number = 0xffffff;
  protected readonly impactEffectDurationMs: number = 180;
  protected readonly impactSplashRadius: number = 0;
  protected readonly impactSplashDamage: number = 0;
  protected readonly impactSparkCount: number = 0;
  protected readonly impactSparkLength: number = 0;
  protected readonly impactSparkWidth: number = 2;
  protected readonly impactSparkAlpha: number = 0;
  protected readonly wallImpactEffectScale: number = 0.68;

  protected onApply(): void {
    this.idleAngle = Math.random() * Math.PI * 2;
    this.shotCooldownMs = this.attackSpeedMs;
    this.trailGraphics = this.scene.add.graphics();
    this.trailGraphics.setDepth(2);
    this.glowGraphics = this.scene.add.graphics();
    this.glowGraphics.setDepth(3);
    this.lightGraphics = this.scene.add.graphics();
    this.lightGraphics.setDepth(2);
    this.onEquip();
  }

  protected onRemove(): void {
    for (const projectile of this.projectiles) {
      projectile.sprite.destroy();
    }
    this.projectiles = [];
    this.trailGraphics.destroy();
    this.glowGraphics.destroy();
    this.lightGraphics.destroy();
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

    const attackCooldownMs = this.ball.modifyAttackSpeedMs(
      this.attackSpeedMs,
      this.type,
    );
    if (enemy) {
      this.shotCooldownMs -= delta;
      while (this.shotCooldownMs <= 0) {
        this.fireProjectiles(x, y, aimAngle);
        this.shotCooldownMs += attackCooldownMs;
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

  protected createProjectileVisual(
    x: number,
    y: number,
    angle: number,
  ): { sprite: Phaser.GameObjects.GameObject; radius: number } {
    void angle;
    const sprite = this.scene.add.circle(
      x,
      y,
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
    return { sprite, radius: this.projectileRadius };
  }

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

  protected getProjectilesPerShot(): number {
    return this.projectilesPerShot;
  }

  protected getProjectileSpreadAngle(): number {
    return this.projectileSpreadAngle;
  }

  protected onBeforeFire(shotCount: number): void {
    this.playWeaponSound("fire", "fire");
    void shotCount;
  }

  protected onAfterFire(shotCount: number): void {
    void shotCount;
  }

  protected getProjectileSound(
    _index: number,
    _shotCount: number,
  ): GameSfxId | null {
    return null;
  }

  private fireProjectiles(x: number, y: number, baseAngle: number): void {
    const shotCount = Math.max(1, this.getProjectilesPerShot());
    const spreadStep = shotCount === 1 ? 0 : this.getProjectileSpreadAngle();
    const centerOffset = (shotCount - 1) / 2;
    this.onBeforeFire(shotCount);

    for (let index = 0; index < shotCount; index += 1) {
      const angle = baseAngle + (index - centerOffset) * spreadStep;
      this.fireSingleProjectile(x, y, angle, index, shotCount);
    }

    this.onAfterFire(shotCount);
  }

  private fireSingleProjectile(
    x: number,
    y: number,
    angle: number,
    shotIndex: number,
    shotCount: number,
  ): void {
    const startX = x + Math.cos(angle) * this.projectileStartDistance;
    const startY = y + Math.sin(angle) * this.projectileStartDistance;
    const vx = Math.cos(angle) * this.projectileSpeed;
    const vy = Math.sin(angle) * this.projectileSpeed;
    const { sprite, radius } = this.createProjectileVisual(
      startX,
      startY,
      angle,
    );
    const projectileSound = this.getProjectileSound(shotIndex, shotCount);
    if (projectileSound) {
      playGameSfx(this.scene, projectileSound);
    }
    this.projectiles.push({
      sprite,
      radius,
      ownerBall: this.ball,
      x: startX,
      y: startY,
      previousX: startX,
      previousY: startY,
      vx,
      vy,
      remainingMs: this.projectileLifetimeMs,
      wallBouncesRemaining: this.projectileWallBounces,
      piercesWalls: this.projectilePiercesWalls,
      impactRadius: this.impactEffectRadius,
      splashDamage: this.impactSplashDamage,
      homingTurnRate: this.homingTurnRate,
      trailWidth: this.projectileTrailWidth,
      trailColor: this.projectileTrailColor,
      trailAlpha: this.projectileTrailAlpha,
      trailParticleRadius: this.projectileTrailParticleRadius,
      trailParticleAlpha: this.projectileTrailParticleAlpha,
      glowRadius: this.projectileGlowRadius,
      glowColor: this.projectileGlowColor,
      glowAlpha: this.projectileGlowAlpha,
      lightRadius: this.projectileLightRadius,
      lightColor: this.projectileLightColor,
      lightAlpha: this.projectileLightAlpha,
      hitEffect: this.projectileHitEffect,
      impactColor: this.impactEffectColor,
      impactDurationMs: this.impactEffectDurationMs,
    });
  }

  private updateProjectiles(delta: number): void {
    this.trailGraphics.clear();
    this.glowGraphics.clear();
    this.lightGraphics.clear();

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

      const homingTarget = this.getHomingTarget(projectile);
      if (homingTarget && projectile.homingTurnRate > 0) {
        const speed =
          Math.hypot(projectile.vx, projectile.vy) || this.projectileSpeed;
        const desiredX = homingTarget.body.x - projectile.x;
        const desiredY = homingTarget.body.y - projectile.y;
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

      if (projectile.ownerBall.projectileGravityY !== 0) {
        projectile.vy +=
          projectile.ownerBall.projectileGravityY * (delta / 1000);
      }

      projectile.x += projectile.vx * (delta / 1000);
      projectile.y += projectile.vy * (delta / 1000);
      this.updateProjectilePosition(projectile);

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

      if (
        projectile.trailParticleRadius > 0 &&
        projectile.trailParticleAlpha > 0
      ) {
        const steps = 3;
        for (let index = 1; index <= steps; index += 1) {
          const t = index / (steps + 1);
          const particleX = Phaser.Math.Linear(
            projectile.previousX,
            projectile.x,
            t,
          );
          const particleY = Phaser.Math.Linear(
            projectile.previousY,
            projectile.y,
            t,
          );
          this.spawnTrailParticle(projectile, particleX, particleY, t);
        }
      }

      if (projectile.glowRadius > 0 && projectile.glowAlpha > 0) {
        this.glowGraphics.fillStyle(projectile.glowColor, projectile.glowAlpha);
        this.glowGraphics.fillCircle(
          projectile.x,
          projectile.y,
          projectile.glowRadius,
        );
      }

      if (projectile.lightRadius > 0 && projectile.lightAlpha > 0) {
        this.lightGraphics.fillStyle(
          projectile.lightColor,
          projectile.lightAlpha * 0.7,
        );
        this.lightGraphics.fillCircle(
          projectile.x,
          projectile.y,
          projectile.lightRadius,
        );
        this.lightGraphics.fillStyle(
          projectile.glowColor,
          projectile.lightAlpha,
        );
        this.lightGraphics.fillCircle(
          projectile.x,
          projectile.y,
          Math.max(2, projectile.lightRadius * 0.45),
        );
      }

      const wallResult = this.resolveWallInteraction(projectile);
      if (wallResult === "destroyed") {
        return false;
      }

      for (const target of this.getEnemyTargetsForProjectile(projectile)) {
        const enemyRadius = BALL_COLLISION_RADIUS * target.physicsScale;
        const distance = Math.hypot(
          projectile.x - target.body.x,
          projectile.y - target.body.y,
        );
        if (distance <= this.projectileRadius + enemyRadius) {
          if (target.tryDeflectProjectile()) {
            this.deflectProjectile(projectile, target, enemyRadius);
            return true;
          }

          projectile.ownerBall.dealAttackDamage(
            target,
            this.projectileDamage,
            "projectile",
            projectile.hitEffect,
          );
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

  private getHomingTarget(projectile: ProjectileState): Ball | null {
    const targets = projectile.ownerBall.getHostileTargets();
    if (targets.length === 0) {
      return null;
    }

    let closest = targets[0];
    let closestDistance = Math.hypot(
      closest.body.x - projectile.x,
      closest.body.y - projectile.y,
    );

    for (let index = 1; index < targets.length; index += 1) {
      const target = targets[index];
      const distance = Math.hypot(
        target.body.x - projectile.x,
        target.body.y - projectile.y,
      );
      if (distance < closestDistance) {
        closest = target;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private spawnTrailParticle(
    projectile: ProjectileState,
    x: number,
    y: number,
    t: number,
  ): void {
    const radius = projectile.trailParticleRadius * (1 - t * 0.4);
    const alpha = projectile.trailParticleAlpha * (1 - t * 0.5);
    const particle = this.scene.add.circle(
      x,
      y,
      radius,
      projectile.trailColor,
      alpha,
    );
    particle.setDepth(3);
    particle.setBlendMode(Phaser.BlendModes.NORMAL);
    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scale: 0.45,
      duration: 140,
      ease: "Quad.easeOut",
      onComplete: () => particle.destroy(),
    });
  }

  private resolveWallInteraction(
    projectile: ProjectileState,
  ): "alive" | "destroyed" {
    const radius = projectile.radius;
    const outLeft = projectile.x <= radius;
    const outRight = projectile.x >= this.ball.arenaWidth - radius;
    const outTop = projectile.y <= radius;
    const outBottom = projectile.y >= this.ball.arenaHeight - radius;

    if (!outLeft && !outRight && !outTop && !outBottom) {
      return "alive";
    }

    const shouldWrap =
      projectile.ownerBall.projectilesEndless || projectile.piercesWalls;
    if (shouldWrap) {
      const minX = radius;
      const maxX = this.ball.arenaWidth - radius;
      const minY = radius;
      const maxY = this.ball.arenaHeight - radius;

      if (outLeft) projectile.x = maxX;
      else if (outRight) projectile.x = minX;
      if (outTop) projectile.y = maxY;
      else if (outBottom) projectile.y = minY;

      this.emitWallHitEffect(projectile, projectile.x, projectile.y);
      this.updateProjectilePosition(projectile);
      return "alive";
    }

    if (projectile.wallBouncesRemaining > 0) {
      if (outLeft) {
        projectile.x = radius;
        projectile.vx = Math.abs(projectile.vx);
      } else if (outRight) {
        projectile.x = this.ball.arenaWidth - radius;
        projectile.vx = -Math.abs(projectile.vx);
      }

      if (outTop) {
        projectile.y = radius;
        projectile.vy = Math.abs(projectile.vy);
      } else if (outBottom) {
        projectile.y = this.ball.arenaHeight - radius;
        projectile.vy = -Math.abs(projectile.vy);
      }

      projectile.wallBouncesRemaining -= 1;
      this.emitWallHitEffect(projectile, projectile.x, projectile.y);
      this.updateProjectilePosition(projectile);
      return "alive";
    }

    this.emitWallHitEffect(projectile, projectile.x, projectile.y);
    this.resolveProjectileImpact(
      projectile,
      projectile.x,
      projectile.y,
      "wall",
    );
    return "destroyed";
  }

  reflectProjectilesAround(
    x: number,
    y: number,
    radius: number,
    newOwner: Ball,
  ): number {
    let reflected = 0;
    for (const projectile of this.projectiles) {
      if (projectile.ownerBall === newOwner) {
        continue;
      }

      const dx = projectile.x - x;
      const dy = projectile.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance > radius + projectile.radius) {
        continue;
      }

      const nx = distance > 0 ? dx / distance : 1;
      const ny = distance > 0 ? dy / distance : 0;
      const dot = projectile.vx * nx + projectile.vy * ny;
      projectile.vx -= 2 * dot * nx;
      projectile.vy -= 2 * dot * ny;
      projectile.ownerBall = newOwner;
      projectile.x = x + nx * (radius + projectile.radius + 2);
      projectile.y = y + ny * (radius + projectile.radius + 2);
      this.updateProjectilePosition(projectile);
      reflected += 1;
    }
    return reflected;
  }

  private deflectProjectile(
    projectile: ProjectileState,
    reflector: Ball,
    reflectorRadius: number,
  ): void {
    const dx = projectile.x - reflector.body.x;
    const dy = projectile.y - reflector.body.y;
    const distance = Math.hypot(dx, dy);
    const nx = distance > 0 ? dx / distance : 1;
    const ny = distance > 0 ? dy / distance : 0;

    const dot = projectile.vx * nx + projectile.vy * ny;
    projectile.vx -= 2 * dot * nx;
    projectile.vy -= 2 * dot * ny;
    projectile.ownerBall = reflector;

    projectile.x =
      reflector.body.x + nx * (reflectorRadius + projectile.radius + 3);
    projectile.y =
      reflector.body.y + ny * (reflectorRadius + projectile.radius + 3);
    this.updateProjectilePosition(projectile);

    this.createImpactEffect(
      projectile.x,
      projectile.y,
      Math.max(8, projectile.radius * 1.6),
      0xa7f3d0,
      110,
    );
  }

  private updateProjectilePosition(projectile: ProjectileState): void {
    const movable = projectile.sprite as Phaser.GameObjects.GameObject & {
      setPosition?: (x: number, y: number) => void;
    };
    movable.setPosition?.(projectile.x, projectile.y);
  }

  private emitWallHitEffect(
    projectile: ProjectileState,
    x: number,
    y: number,
  ): void {
    const wallEffectRadius = Math.max(
      10,
      projectile.radius * 2.8 * this.wallImpactEffectScale,
    );
    this.createImpactEffect(
      x,
      y,
      wallEffectRadius,
      projectile.trailColor || projectile.impactColor,
      110,
    );
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
      for (const target of this.getEnemyTargetsForProjectile(projectile)) {
        const distance = Math.hypot(x - target.body.x, y - target.body.y);
        if (
          distance <=
          this.impactSplashRadius + BALL_COLLISION_RADIUS * target.physicsScale
        ) {
          projectile.ownerBall.dealAttackDamage(
            target,
            projectile.splashDamage,
            "projectile",
            projectile.hitEffect,
          );
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
    if (this.impactSparkCount > 0 && this.impactSparkLength > 0) {
      effect.lineStyle(this.impactSparkWidth, color, this.impactSparkAlpha);
      for (let index = 0; index < this.impactSparkCount; index += 1) {
        const angle = (index / this.impactSparkCount) * Math.PI * 2;
        const inner = radius * 0.18;
        const outer = inner + this.impactSparkLength;
        effect.beginPath();
        effect.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
        effect.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
        effect.strokePath();
      }
    }
    this.scene.time.delayedCall(durationMs, () => {
      effect.destroy();
    });
  }

  private getEnemyTargetsForProjectile(projectile: ProjectileState): Ball[] {
    return projectile.ownerBall.getHostileTargets();
  }
}
