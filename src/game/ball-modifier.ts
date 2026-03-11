import type * as Phaser from "phaser";
import type { Ball } from "./ball";

export abstract class BallModifier {
  abstract readonly name: string;
  abstract readonly quality: number;
  abstract readonly icon: string;
  abstract readonly description: string;

  protected ball!: Ball;
  protected scene!: Phaser.Scene;

  apply(ball: Ball, scene: Phaser.Scene): void {
    this.ball = ball;
    this.scene = scene;
    this.onApply();
  }

  remove(): void {
    this.onRemove();
  }

  protected abstract onApply(): void;
  protected abstract onRemove(): void;

  /** Called every frame with delta in milliseconds. */
  update(_delta: number): void {}

  /** Called when this ball collides with the other ball. */
  onBallHitBall(_other: Ball): void {}

  /** Called when this ball collides with a wall. */
  onBallHitWall(): void {}

  /** Return a modified speed value. Chain-called across all modifiers. */
  modifySpeed(speed: number): number {
    return speed;
  }

  /** Return a modified incoming damage amount. Chain-called across all modifiers. */
  modifyDamageTaken(amount: number): number {
    return amount;
  }
}
