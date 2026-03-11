import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";

const SHRINK_FACTOR = 0.6;
const SPEED_BONUS = 1.25;
const DAMAGE_MULTIPLIER = 1.3;

export class BabyModifier extends BallModifier {
  readonly name = "Baby";
  readonly quality = 1;
  readonly icon = "arrowsIn";
  readonly description =
    "Shrinks ball to 60% size — faster, but takes 30% more damage.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private sparkleT = 0;

  protected onApply(): void {
    this.ball.setSize(SHRINK_FACTOR);
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onRemove(): void {
    this.ball.setSize(1.0);
    this.graphics.destroy();
  }

  modifySpeed(speed: number): number {
    return speed * SPEED_BONUS;
  }

  modifyDamageTaken(amount: number): number {
    return Math.ceil(amount * DAMAGE_MULTIPLIER);
  }

  update(delta: number): void {
    this.sparkleT += delta / 400;

    const x = this.ball.body.x;
    const y = this.ball.body.y;
    const r = 22 * this.ball.physicsScale;

    this.graphics.clear();

    // Tiny orbiting sparkle dots
    for (let i = 0; i < 5; i++) {
      const angle = this.sparkleT * Math.PI * 2 + (i / 5) * Math.PI * 2;
      const sx = x + Math.cos(angle) * r;
      const sy = y + Math.sin(angle) * r;
      const a = 0.4 + 0.4 * Math.sin(this.sparkleT * Math.PI * 2 + i);
      this.graphics.fillStyle(0xffffaa, a);
      this.graphics.fillCircle(sx, sy, 3);
    }
  }
}
