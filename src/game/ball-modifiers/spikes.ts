import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";
import type { Ball } from "../ball";

const SPIKE_COUNT = 8;
const SPIKE_LENGTH = 14;
const SPIKE_BASE_WIDTH = 5;
const EXTRA_DAMAGE = 2;

export class SpikesModifier extends BallModifier {
  readonly name = "Spikes";
  readonly quality = 1;
  readonly icon = "asterisk";
  readonly description = "Deal extra damage on contact with the other ball.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private rotation = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.rotation += delta * 0.0008;
    this.drawSpikes();
  }

  onBallHitBall(other: Ball): void {
    other.takeDamage(EXTRA_DAMAGE);
  }

  private drawSpikes(): void {
    this.graphics.clear();
    this.graphics.lineStyle(2, 0x111111, 1);
    this.graphics.fillStyle(0x888888, 1);

    const cx = this.ball.body.x;
    const cy = this.ball.body.y;
    const innerR = 23;

    for (let i = 0; i < SPIKE_COUNT; i++) {
      const angle = this.rotation + (i / SPIKE_COUNT) * Math.PI * 2;
      const tipX = cx + Math.cos(angle) * (innerR + SPIKE_LENGTH);
      const tipY = cy + Math.sin(angle) * (innerR + SPIKE_LENGTH);
      const perpL = angle + Math.PI / 2;
      const perpR = angle - Math.PI / 2;
      const baseX = cx + Math.cos(angle) * innerR;
      const baseY = cy + Math.sin(angle) * innerR;
      const leftX = baseX + Math.cos(perpL) * SPIKE_BASE_WIDTH;
      const leftY = baseY + Math.sin(perpL) * SPIKE_BASE_WIDTH;
      const rightX = baseX + Math.cos(perpR) * SPIKE_BASE_WIDTH;
      const rightY = baseY + Math.sin(perpR) * SPIKE_BASE_WIDTH;

      this.graphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
      this.graphics.strokeTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
    }
  }
}
