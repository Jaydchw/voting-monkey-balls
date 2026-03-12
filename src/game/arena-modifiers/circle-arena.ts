import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";

// Ball collision radius (must match ball.ts constant)
const BALL_RADIUS = 23;
const WALL_SENSOR_USERS_KEY = "arenaWallSensorUsers";
const IGNORE_WALLS_USERS_KEY = "arenaIgnoreWallsUsers";
const CIRCLE_USERS_KEY = "arenaCircleUsers";
const PORTAL_USERS_KEY = "arenaPortalUsers";

type CircleArenaState = {
  active: boolean;
  centerX: number;
  centerY: number;
  safeRadius: number;
};

export class CircleArenaModifier extends ArenaModifier {
  readonly name = "Circle Arena";
  readonly quality = 3;
  readonly icon = "target";
  readonly description =
    "Transforms the arena into a circle. Balls are reflected back at the boundary.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private t = 0;
  private circleRadius = 0;

  private setWallsAreSensors(enabled: boolean): void {
    for (const wall of Object.values(this.walls)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wall as any).isSensor = enabled;
    }
  }

  private adjustCounter(key: string, delta: 1 | -1): number {
    const current = (this.scene.data.get(key) as number | undefined) ?? 0;
    const next = Math.max(0, current + delta);
    this.scene.data.set(key, next);
    return next;
  }

  protected onApply(): void {
    // Inscribed circle radius with a small inset so ring is visible
    this.circleRadius = Math.min(this.arenaWidth, this.arenaHeight) / 2 - 6;
    this.t = 0;

    if (this.adjustCounter(WALL_SENSOR_USERS_KEY, 1) === 1) {
      this.setWallsAreSensors(true);
    }
    if (this.adjustCounter(IGNORE_WALLS_USERS_KEY, 1) === 1) {
      for (const ball of this.balls) {
        ball.ignoreArenaWalls = true;
      }
    }
    this.adjustCounter(CIRCLE_USERS_KEY, 1);
    this.scene.data.set("circleArenaState", {
      active: true,
      centerX: this.arenaWidth / 2,
      centerY: this.arenaHeight / 2,
      safeRadius: this.circleRadius - BALL_RADIUS,
    } as CircleArenaState);

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(3);
  }

  protected onRemove(): void {
    if (this.adjustCounter(WALL_SENSOR_USERS_KEY, -1) === 0) {
      this.setWallsAreSensors(false);
    }
    if (this.adjustCounter(IGNORE_WALLS_USERS_KEY, -1) === 0) {
      for (const ball of this.balls) {
        ball.ignoreArenaWalls = false;
      }
    }
    if (this.adjustCounter(CIRCLE_USERS_KEY, -1) === 0) {
      this.scene.data.remove("circleArenaState");
    }
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.t += delta;

    const cx = this.arenaWidth / 2;
    const cy = this.arenaHeight / 2;
    const safeR = this.circleRadius - BALL_RADIUS;
    const portalUsers =
      (this.scene.data.get(PORTAL_USERS_KEY) as number | undefined) ?? 0;
    const portalActive = portalUsers > 0;

    // Enforce circular boundary for each ball
    for (const ball of this.balls) {
      // Also enforce for the linked ghost ball (Mitosis)
      const targets = ball.linkedBall ? [ball, ball.linkedBall] : [ball];
      for (const b of targets) {
        const dx = b.body.x - cx;
        const dy = b.body.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > safeR) {
          const angle = Math.atan2(dy, dx);
          if (portalActive) {
            const opposite = angle + Math.PI;
            b.body.setPosition(
              cx + Math.cos(opposite) * (safeR - 2),
              cy + Math.sin(opposite) * (safeR - 2),
            );
          } else {
            b.body.setPosition(
              cx + Math.cos(angle) * (safeR - 2),
              cy + Math.sin(angle) * (safeR - 2),
            );
            // Reflect velocity off circle boundary (outward normal = dx/dist, dy/dist)
            const vel = b.body.body.velocity;
            const nx = dist > 0 ? dx / dist : 1;
            const ny = dist > 0 ? dy / dist : 0;
            const dot = vel.x * nx + vel.y * ny;
            if (dot > 0) {
              b.body.setVelocity(vel.x - 2 * dot * nx, vel.y - 2 * dot * ny);
            }
          }
        }
      }
    }

    // --- Visual ---
    this.graphics.clear();

    // Corner dim — fill four rectangular side panels outside the inscribed circle
    const r = this.circleRadius;
    const left = cx - r;
    const right = cx + r;
    this.graphics.fillStyle(0x000000, 0.28);
    this.graphics.fillRect(0, 0, left, this.arenaHeight);
    this.graphics.fillRect(right, 0, this.arenaWidth - right, this.arenaHeight);

    // Animated circle ring
    const pulse = 0.65 + 0.35 * Math.sin(this.t / 280);
    for (let i = 3; i >= 1; i--) {
      this.graphics.lineStyle(2, 0x00ddff, 0.08 * i * pulse);
      this.graphics.strokeCircle(cx, cy, r + i * 5);
    }
    this.graphics.lineStyle(4, 0x00ddff, 0.85 * pulse);
    this.graphics.strokeCircle(cx, cy, r);
    this.graphics.lineStyle(1.5, 0x88ffff, 0.4 * pulse);
    this.graphics.strokeCircle(cx, cy, r - 5);

    // Rotating tick marks on the ring
    const ticks = 16;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2 + this.t / 4000;
      const x1 = cx + Math.cos(a) * r;
      const y1 = cy + Math.sin(a) * r;
      const inward = i % 4 === 0 ? 10 : 5;
      const x2 = cx + Math.cos(a) * (r - inward);
      const y2 = cy + Math.sin(a) * (r - inward);
      this.graphics.lineStyle(i % 4 === 0 ? 2 : 1, 0x00ffff, 0.5 * pulse);
      this.graphics.beginPath();
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      this.graphics.strokePath();
    }
  }
}
