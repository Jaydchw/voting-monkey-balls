import type * as Phaser from "phaser";
import { Eyedropper } from "@phosphor-icons/react";
import { BallModifier } from "../ball-modifier";
import type { Ball } from "../ball";

const HEAL_AMOUNT = 3;

export class LeechModifier extends BallModifier {
  readonly name = "Leech";
  readonly quality = 2;
  readonly icon = Eyedropper;
  readonly description = "Heals 3 HP when colliding with the enemy ball.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private pulseT = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  onBallHitBall(_other: Ball): void {
    void _other;
    this.ball.heal(HEAL_AMOUNT);
  }

  update(delta: number): void {
    this.pulseT += delta * 0.003;
    this.graphics.clear();

    const cx = this.ball.body.x;
    const cy = this.ball.body.y;
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseT * Math.PI * 2);
    const veinCount = 5;

    for (let i = 0; i < veinCount; i++) {
      const angle = (i / veinCount) * Math.PI * 2;
      const len = 18 + pulse * 8;
      this.graphics.lineStyle(2, 0xcc0022, 0.5 + pulse * 0.3);
      this.graphics.beginPath();
      this.graphics.moveTo(cx, cy);
      this.graphics.lineTo(
        cx + Math.cos(angle + 0.5) * len * 0.5,
        cy + Math.sin(angle + 0.5) * len * 0.5,
      );
      this.graphics.lineTo(
        cx + Math.cos(angle) * len,
        cy + Math.sin(angle) * len,
      );
      this.graphics.strokePath();
    }
  }
}
