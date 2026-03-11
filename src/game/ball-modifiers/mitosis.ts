import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";

const ORBIT_RADIUS = 42;
const SATELLITE_RADIUS = 8;
const DAMAGE_RANGE = 36; // proximity to enemy before satellite deals damage
const SAT_DAMAGE = 2;
const SAT_COOLDOWN = 1000; // ms per satellite
const ORBIT_SPEED = 0.0022; // radians per ms

export class MitosisModifier extends BallModifier {
  readonly name = "Mitosis";
  readonly quality = 4;
  readonly icon = "gitFork";
  readonly description =
    "Spawns 2 orbiting satellite clones. Each zaps the enemy for 2 HP on contact.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private angle = 0;
  private cooldowns = [0, 0];

  protected onApply(): void {
    this.angle = 0;
    this.cooldowns = [0, 0];
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.angle += delta * ORBIT_SPEED;
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - delta));

    const cx = this.ball.body.x;
    const cy = this.ball.body.y;
    const enemy = this.ball.enemy;
    const isRed = this.ball.id === "red";
    const baseColor = isRed ? 0xff8888 : 0x8888ff;
    const glowColor = isRed ? 0xff4444 : 0x4444ff;

    this.graphics.clear();

    // Faint orbit ring
    this.graphics.lineStyle(1, 0xcccccc, 0.15);
    this.graphics.strokeCircle(cx, cy, ORBIT_RADIUS);

    for (let i = 0; i < 2; i++) {
      const a = this.angle + i * Math.PI;
      const sx = cx + Math.cos(a) * ORBIT_RADIUS;
      const sy = cy + Math.sin(a) * ORBIT_RADIUS;

      // Satellite glow
      this.graphics.fillStyle(glowColor, 0.25);
      this.graphics.fillCircle(sx, sy, SATELLITE_RADIUS + 4);

      // Satellite body
      this.graphics.fillStyle(baseColor, 1);
      this.graphics.fillCircle(sx, sy, SATELLITE_RADIUS);
      this.graphics.lineStyle(2, 0x000000, 0.8);
      this.graphics.strokeCircle(sx, sy, SATELLITE_RADIUS);

      // Orbit line from ball centre to satellite
      this.graphics.lineStyle(1, baseColor, 0.2);
      this.graphics.beginPath();
      this.graphics.moveTo(cx, cy);
      this.graphics.lineTo(sx, sy);
      this.graphics.strokePath();

      // Proximity damage check
      if (enemy && this.cooldowns[i] <= 0) {
        const dx = sx - enemy.body.x;
        const dy = sy - enemy.body.y;
        if (Math.hypot(dx, dy) <= DAMAGE_RANGE) {
          enemy.takeDamage(SAT_DAMAGE);
          this.cooldowns[i] = SAT_COOLDOWN;
        }
      }
    }
  }
}
