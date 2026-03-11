import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";

const SPEED_BOOST = 1.6;
const STREAK_COLOR = 0x8a6b00;

export class SpeedBoostModifier extends ArenaModifier {
  readonly name = "Speed Boost";
  readonly quality = 2;
  readonly icon = "gauge";
  readonly description = "All balls move 60% faster.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private t = 0;

  protected onApply(): void {
    this.redBall.arenaSpeedMultiplier *= SPEED_BOOST;
    this.blueBall.arenaSpeedMultiplier *= SPEED_BOOST;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.redBall.arenaSpeedMultiplier /= SPEED_BOOST;
    this.blueBall.arenaSpeedMultiplier /= SPEED_BOOST;
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.t += delta / 1000;
    this.graphics.clear();

    // Animated horizontal speed streaks across the background
    for (let i = 0; i < 10; i++) {
      const y = (this.arenaHeight / 10) * (i + 0.5);
      const offset = ((this.t * 320 + i * 73) % (this.arenaWidth + 120)) - 60;
      const alpha = 0.12 + 0.05 * Math.sin(this.t * 4 + i);
      const length = 40 + 30 * Math.sin(this.t * 2 + i * 0.7);
      this.graphics.lineStyle(3.25, STREAK_COLOR, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(offset, y);
      this.graphics.lineTo(offset + length, y);
      this.graphics.strokePath();
    }
  }
}
