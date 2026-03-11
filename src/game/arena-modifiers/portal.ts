import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";

export class PortalModifier extends ArenaModifier {
  readonly name = "Portal";
  readonly quality = 3;
  readonly icon = "shuffle";
  readonly description =
    "Balls wrap through walls to the opposite side instead of bouncing.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private t = 0;

  protected onApply(): void {
    // Make all four walls into sensors so balls pass through them
    for (const wall of Object.values(this.walls)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wall as any).isSensor = true;
    }
    this.redBall.ignoreArenaWalls = true;
    this.blueBall.ignoreArenaWalls = true;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(3);
  }

  protected onRemove(): void {
    for (const wall of Object.values(this.walls)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wall as any).isSensor = false;
    }
    this.redBall.ignoreArenaWalls = false;
    this.blueBall.ignoreArenaWalls = false;
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.t += delta / 700;

    const W = this.arenaWidth;
    const H = this.arenaHeight;

    // Wrap any ball that has fully exited the arena
    for (const ball of this.balls) {
      let x = ball.body.x;
      let y = ball.body.y;
      let moved = false;
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
