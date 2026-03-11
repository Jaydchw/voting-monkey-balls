import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";

const REGEN_PER_SECOND = 2;

export class RegenModifier extends BallModifier {
  readonly name = "Regen";
  readonly quality = 2;
  readonly icon = "heart";
  readonly description = "Regenerate 2 HP per second.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private elapsed = 0;
  private pulseT = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.pulseT += delta / 800;

    const pulse = 0.5 + 0.5 * Math.sin(this.pulseT * Math.PI * 2);
    const radius = 28 + pulse * 8;
    const alpha = 0.25 + pulse * 0.35;

    this.graphics.clear();
    this.graphics.fillStyle(0x00cc44, alpha);
    this.graphics.fillCircle(this.ball.body.x, this.ball.body.y, radius);

    if (this.elapsed >= 1000) {
      this.elapsed -= 1000;
      this.ball.heal(REGEN_PER_SECOND);
    }
  }
}
