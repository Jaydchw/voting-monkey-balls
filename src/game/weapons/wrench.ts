import * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import { MeleeWeapon } from "./melee-weapon";

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
  readonly icon = "shield";
  readonly description =
    "A heavy wrench that deploys auto-firing helper turrets while dealing contact damage.";
  readonly attackSpeedMs = 420;

  protected readonly orbitRadius = 54;
  protected readonly swingSpeed = Math.PI * 1.55;
  protected readonly contactRadius = 20;
  protected readonly contactDamage = 2;

  private wrench!: Phaser.GameObjects.Graphics;
  private turretGraphics!: Phaser.GameObjects.Graphics;
  private projectileGraphics!: Phaser.GameObjects.Graphics;
  private turrets: TurretState[] = [];
  private projectiles: TurretProjectile[] = [];

  protected onEquip(): void {
    this.wrench = this.scene.add.graphics();
    this.wrench.setDepth(2);
    this.turretGraphics = this.scene.add.graphics();
    this.turretGraphics.setDepth(2);
    this.projectileGraphics = this.scene.add.graphics();
    this.projectileGraphics.setDepth(2);

    this.turrets = [
      {
        x: Phaser.Math.Clamp(
          this.ball.body.x - 64,
          40,
          this.ball.arenaWidth - 40,
        ),
        y: Phaser.Math.Clamp(
          this.ball.body.y + 44,
          40,
          this.ball.arenaHeight - 40,
        ),
        cooldownMs: 350,
      },
      {
        x: Phaser.Math.Clamp(
          this.ball.body.x + 64,
          40,
          this.ball.arenaWidth - 40,
        ),
        y: Phaser.Math.Clamp(
          this.ball.body.y - 44,
          40,
          this.ball.arenaHeight - 40,
        ),
        cooldownMs: 700,
      },
    ];
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

    for (const turret of this.turrets) {
      turret.cooldownMs -= delta;
      let angle = 0;
      if (enemy) {
        angle = Math.atan2(enemy.body.y - turret.y, enemy.body.x - turret.x);
      }

      this.turretGraphics.fillStyle(0x94a3b8, 1);
      this.turretGraphics.fillCircle(turret.x, turret.y, 11);
      this.turretGraphics.lineStyle(4, 0x1f2937, 1);
      this.turretGraphics.beginPath();
      this.turretGraphics.moveTo(turret.x, turret.y);
      this.turretGraphics.lineTo(
        turret.x + Math.cos(angle) * 16,
        turret.y + Math.sin(angle) * 16,
      );
      this.turretGraphics.strokePath();

      if (enemy && turret.cooldownMs <= 0) {
        this.projectiles.push({
          x: turret.x + Math.cos(angle) * 18,
          y: turret.y + Math.sin(angle) * 18,
          vx: Math.cos(angle) * 460,
          vy: Math.sin(angle) * 460,
        });
        turret.cooldownMs = 720;
      }
    }
  }

  private updateTurretProjectiles(delta: number): void {
    const enemy = this.getActiveEnemy();
    this.projectileGraphics.clear();

    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.x += projectile.vx * (delta / 1000);
      projectile.y += projectile.vy * (delta / 1000);

      this.projectileGraphics.fillStyle(0xfbbf24, 1);
      this.projectileGraphics.fillCircle(projectile.x, projectile.y, 4);

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
        enemy.takeDamage(2);
        return false;
      }

      return true;
    });
  }
}
