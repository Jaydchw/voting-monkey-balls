import * as Phaser from "phaser";
import { Shuffle } from "@phosphor-icons/react";
import { BALL_COLLISION_RADIUS } from "../ball";
import { BallModifier } from "../ball-modifier";

const BLINK_CHANCE_ON_WALL_HIT = 0.35;
const BLINK_COOLDOWN_MS = 2200;
const ENEMY_SLOW_MULTIPLIER = 0.6;
const ENEMY_SLOW_DURATION_MS = 1200;

export class PhaseShiftModifier extends BallModifier {
  readonly name = "Phase Shift";
  readonly quality = 4;
  readonly icon = Shuffle;
  readonly description =
    "On wall hits, 35% chance to blink to a random spot and briefly slow the enemy.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private t = 0;
  private cooldownMs = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(0);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.t += delta * 0.0026;
    this.cooldownMs = Math.max(0, this.cooldownMs - delta);

    const alphaPulse =
      0.3 + 0.25 * (0.5 + 0.5 * Math.sin(this.t * Math.PI * 2));
    const cx = this.ball.body.x;
    const cy = this.ball.body.y;

    this.graphics.clear();
    this.graphics.lineStyle(2, 0x38bdf8, alphaPulse);
    this.graphics.strokeCircle(cx, cy, 27);
    this.graphics.lineStyle(2, 0x22d3ee, alphaPulse * 0.8);
    this.graphics.strokeCircle(cx, cy, 31);
  }

  onBallHitWall(): void {
    if (this.cooldownMs > 0) {
      return;
    }
    if (Math.random() > BLINK_CHANCE_ON_WALL_HIT) {
      return;
    }

    const margin = BALL_COLLISION_RADIUS * this.ball.physicsScale + 8;
    const nextX = Phaser.Math.FloatBetween(
      margin,
      this.ball.arenaWidth - margin,
    );
    const nextY = Phaser.Math.FloatBetween(
      margin,
      this.ball.arenaHeight - margin,
    );

    this.ball.body.setPosition(nextX, nextY);
    this.ball.nudgeDirection();
    this.cooldownMs = BLINK_COOLDOWN_MS;

    this.ball.enemy?.applySlow(ENEMY_SLOW_MULTIPLIER, ENEMY_SLOW_DURATION_MS);
  }
}
