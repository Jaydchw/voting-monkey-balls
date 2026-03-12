import * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import { MeleeWeapon } from "./melee-weapon";
import { Wrench } from "@phosphor-icons/react";

type TurretState = {
  x: number;
  y: number;
  cooldownMs: number;
};

type TurretProjectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export class WrenchWeapon extends MeleeWeapon {
  readonly name = "Wrench";
  readonly quality = 3;
  readonly icon = Wrench;
  readonly description =
    "A heavy wrench that deploys auto-firing helper turrets while dealing contact damage.";
  readonly attackSpeedMs = 420;
  readonly sound = "clash" as const;

  protected readonly orbitRadius = 54;
  protected readonly swingSpeed = Math.PI * 1.55;
  protected readonly contactRadius = 20;
  protected readonly contactDamage = 2;

  private wrench!: Phaser.GameObjects.Graphics;
  private turretGraphics!: Phaser.GameObjects.Graphics;
  private projectileGraphics!: Phaser.GameObjects.Graphics;
  private turrets: TurretState[] = [];
  private projectiles: TurretProjectile[] = [];
  private turretSpawnCooldownMs = 0;

  protected onEquip(): void {
    this.wrench = this.scene.add.graphics();
    this.wrench.setDepth(2);
    this.turretGraphics = this.scene.add.graphics();
    this.turretGraphics.setDepth(2);
    this.projectileGraphics = this.scene.add.graphics();
    this.projectileGraphics.setDepth(2);

    this.turrets = [];
    this.projectiles = [];
    this.turretSpawnCooldownMs = 0;
    this.spawnTurret(350);
    this.spawnTurret(700);
  }

  protected onUnequip(): void {
    this.wrench.destroy();
    this.turretGraphics.destroy();
    this.projectileGraphics.destroy();
  }

  update(delta: number): void {
    super.update(delta);
    this.updateTurrets(delta);
    this.updateTurretProjectiles(delta);
  }

  protected updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    const jawX = x + Math.cos(angle) * 16;
    const jawY = y + Math.sin(angle) * 16;
    const handleX = x - Math.cos(angle) * 28;
    const handleY = y - Math.sin(angle) * 28;
    const perp = angle + Math.PI / 2;

    this.wrench.clear();
    this.wrench.lineStyle(7, 0x64748b, 1);
    this.wrench.beginPath();
    this.wrench.moveTo(handleX, handleY);
    this.wrench.lineTo(x, y);
    this.wrench.strokePath();
    this.wrench.beginPath();
    this.wrench.moveTo(jawX, jawY);
    this.wrench.lineTo(jawX + Math.cos(perp) * 12, jawY + Math.sin(perp) * 12);
    this.wrench.strokePath();
    this.wrench.beginPath();
    this.wrench.moveTo(jawX, jawY);
    this.wrench.lineTo(jawX - Math.cos(perp) * 12, jawY - Math.sin(perp) * 12);
    this.wrench.strokePath();
  }

  private updateTurrets(delta: number): void {
    const enemy = this.getActiveEnemy();
    this.turretGraphics.clear();

    this.turretSpawnCooldownMs -= delta;
    while (this.turretSpawnCooldownMs <= 0) {
      this.spawnTurret(300);
      this.turretSpawnCooldownMs += 2000;
    }

    for (const turret of this.turrets) {
      turret.cooldownMs -= delta;
      let angle = 0;
      if (enemy) {
        angle = Math.atan2(enemy.body.y - turret.y, enemy.body.x - turret.x);
      }

      this.turretGraphics.fillStyle(0x38bdf8, 0.12);
      this.turretGraphics.fillCircle(turret.x, turret.y, 22);
      this.turretGraphics.fillStyle(0x94a3b8, 1);
      this.turretGraphics.fillCircle(turret.x, turret.y, 13);
      this.turretGraphics.lineStyle(4, 0xe2e8f0, 0.95);
      this.turretGraphics.strokeCircle(turret.x, turret.y, 13);
      this.turretGraphics.fillStyle(0x1e293b, 1);
      this.turretGraphics.fillCircle(turret.x, turret.y, 5);
      this.turretGraphics.lineStyle(5, 0x1f2937, 1);
      this.turretGraphics.beginPath();
      this.turretGraphics.moveTo(turret.x, turret.y);
      this.turretGraphics.lineTo(
        turret.x + Math.cos(angle) * 20,
        turret.y + Math.sin(angle) * 20,
      );
      this.turretGraphics.strokePath();
      this.turretGraphics.fillStyle(0x7dd3fc, 0.85);
      this.turretGraphics.fillCircle(
        turret.x + Math.cos(angle) * 20,
        turret.y + Math.sin(angle) * 20,
        4,
      );

      if (enemy && turret.cooldownMs <= 0) {
        this.projectiles.push({
          x: turret.x + Math.cos(angle) * 18,
          y: turret.y + Math.sin(angle) * 18,
          vx: Math.cos(angle) * 620,
          vy: Math.sin(angle) * 620,
        });
        this.playWeaponSound("fire", "machine_gun");
        turret.cooldownMs = 620;
      }
    }
  }

  private updateTurretProjectiles(delta: number): void {
    const enemy = this.getActiveEnemy();
    this.projectileGraphics.clear();

    this.projectiles = this.projectiles.filter((projectile) => {
      const previousX = projectile.x;
      const previousY = projectile.y;
      if (this.ball.projectileGravityY !== 0) {
        projectile.vy += this.ball.projectileGravityY * (delta / 1000);
      }
      projectile.x += projectile.vx * (delta / 1000);
      projectile.y += projectile.vy * (delta / 1000);

      this.projectileGraphics.lineStyle(3, 0x38bdf8, 0.3);
      this.projectileGraphics.beginPath();
      this.projectileGraphics.moveTo(previousX, previousY);
      this.projectileGraphics.lineTo(projectile.x, projectile.y);
      this.projectileGraphics.strokePath();
      this.projectileGraphics.fillStyle(0xe0f2fe, 0.2);
      this.projectileGraphics.fillCircle(projectile.x, projectile.y, 10);
      this.projectileGraphics.fillStyle(0xfbbf24, 1);
      this.projectileGraphics.fillCircle(projectile.x, projectile.y, 5);

      if (
        projectile.x < 0 ||
        projectile.x > this.ball.arenaWidth ||
        projectile.y < 0 ||
        projectile.y > this.ball.arenaHeight
      ) {
        return false;
      }

      if (!enemy) {
        return true;
      }

      const distance = Math.hypot(
        projectile.x - enemy.body.x,
        projectile.y - enemy.body.y,
      );
      if (distance <= BALL_COLLISION_RADIUS * enemy.physicsScale + 4) {
        enemy.takeDamage(2, { effect: "spark" });
        this.projectileGraphics.fillStyle(0xfef3c7, 0.4);
        this.projectileGraphics.fillCircle(projectile.x, projectile.y, 16);
        return false;
      }

      return true;
    });
  }

  private spawnTurret(initialCooldownMs: number): void {
    const angle = this.scene.time.now * 0.0022 + this.turrets.length * 1.9;
    this.turrets.push({
      x: Phaser.Math.Clamp(
        this.ball.body.x + Math.cos(angle) * 88,
        40,
        this.ball.arenaWidth - 40,
      ),
      y: Phaser.Math.Clamp(
        this.ball.body.y + Math.sin(angle) * 88,
        40,
        this.ball.arenaHeight - 40,
      ),
      cooldownMs: initialCooldownMs,
    });
  }
}
