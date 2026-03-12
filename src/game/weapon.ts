import type * as Phaser from "phaser";
import type { Ball } from "./ball";

export abstract class Weapon {
  abstract readonly name: string;
  abstract readonly quality: number;
  abstract readonly icon: string;
  abstract readonly description: string;
  abstract readonly attackSpeedMs: number;
  abstract readonly type: "melee" | "ranged";

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

  update(delta: number): void {
    void delta;
  }

  protected getActiveEnemy(): Ball | null {
    if (!this.ball.enemy || this.ball.enemy.health <= 0) {
      return null;
    }

    return this.ball.enemy;
  }
}
