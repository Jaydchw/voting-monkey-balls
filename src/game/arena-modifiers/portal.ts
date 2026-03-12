import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";
import { DoorOpen } from "@phosphor-icons/react";

const WALL_SENSOR_USERS_KEY = "arenaWallSensorUsers";
const IGNORE_WALLS_USERS_KEY = "arenaIgnoreWallsUsers";
const PORTAL_USERS_KEY = "arenaPortalUsers";

type CircleArenaState = {
  active: boolean;
  centerX: number;
  centerY: number;
  safeRadius: number;
};

export class PortalModifier extends ArenaModifier {
  readonly name = "Portal";
  readonly quality = 3;
  readonly icon = DoorOpen;
  readonly description =
    "Balls wrap through walls to the opposite side instead of bouncing.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private t = 0;

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
    if (this.adjustCounter(WALL_SENSOR_USERS_KEY, 1) === 1) {
      this.setWallsAreSensors(true);
    }
    if (this.adjustCounter(IGNORE_WALLS_USERS_KEY, 1) === 1) {
      this.redBall.ignoreArenaWalls = true;
      this.blueBall.ignoreArenaWalls = true;
    }
    this.adjustCounter(PORTAL_USERS_KEY, 1);
    this.redBall.projectilesEndless = true;
    this.blueBall.projectilesEndless = true;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(3);
  }

  protected onRemove(): void {
    if (this.adjustCounter(WALL_SENSOR_USERS_KEY, -1) === 0) {
      this.setWallsAreSensors(false);
    }
    if (this.adjustCounter(IGNORE_WALLS_USERS_KEY, -1) === 0) {
      this.redBall.ignoreArenaWalls = false;
      this.blueBall.ignoreArenaWalls = false;
    }
    if (this.adjustCounter(PORTAL_USERS_KEY, -1) === 0) {
      this.redBall.projectilesEndless = false;
      this.blueBall.projectilesEndless = false;
    }
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.t += delta / 700;

    const W = this.arenaWidth;
    const H = this.arenaHeight;
    const circleState = this.scene.data.get("circleArenaState") as
      | CircleArenaState
      | undefined;
    const hasCircleArena = circleState?.active === true;

    // Wrap any ball that has fully exited the arena
    for (const ball of this.balls) {
      let x = ball.body.x;
      let y = ball.body.y;
      let moved = false;

      if (hasCircleArena && circleState) {
        const dx = x - circleState.centerX;
        const dy = y - circleState.centerY;
        const dist = Math.hypot(dx, dy);
        if (dist > circleState.safeRadius) {
          const angle = Math.atan2(dy, dx) + Math.PI;
          const targetR = Math.max(8, circleState.safeRadius - 6);
          x = circleState.centerX + Math.cos(angle) * targetR;
          y = circleState.centerY + Math.sin(angle) * targetR;
          moved = true;
        }
      } else {
        if (x < 0) {
          x = W;
          moved = true;
        } else if (x > W) {
          x = 0;
          moved = true;
        }
        if (y < 0) {
          y = H;
          moved = true;
        } else if (y > H) {
          y = 0;
          moved = true;
        }
      }

      if (moved) ball.body.setPosition(x, y);
    }

    // Animated portal shimmer on all four edges
    const pulse = 0.35 + 0.2 * Math.sin(this.t * Math.PI * 2);
    const thickness = 4 + 3 * Math.sin(this.t * Math.PI * 2 + 1);
    const color = 0x9944ff;

    this.graphics.clear();
    this.graphics.lineStyle(thickness, color, pulse);

    this.graphics.beginPath();
    this.graphics.moveTo(0, 1);
    this.graphics.lineTo(W, 1);
    this.graphics.strokePath();

    this.graphics.beginPath();
    this.graphics.moveTo(0, H - 1);
    this.graphics.lineTo(W, H - 1);
    this.graphics.strokePath();

    this.graphics.beginPath();
    this.graphics.moveTo(1, 0);
    this.graphics.lineTo(1, H);
    this.graphics.strokePath();

    this.graphics.beginPath();
    this.graphics.moveTo(W - 1, 0);
    this.graphics.lineTo(W - 1, H);
    this.graphics.strokePath();

    // Corner arcs to tie edges together
    const cornerR = 12;
    this.graphics.lineStyle(thickness * 0.8, color, pulse * 0.7);
    this.graphics.beginPath();
    this.graphics.arc(0, 0, cornerR, 0, Math.PI / 2, false);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.arc(W, 0, cornerR, Math.PI / 2, Math.PI, false);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.arc(0, H, cornerR, -Math.PI / 2, 0, false);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.arc(W, H, cornerR, Math.PI, 3 * (Math.PI / 2), false);
    this.graphics.strokePath();
  }
}
