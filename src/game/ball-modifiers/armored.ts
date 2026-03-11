import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";

export class ArmoredModifier extends BallModifier {
  readonly name = "Armored";
  readonly quality = 2;
  readonly icon = "shield";
  readonly description = "Reduces all damage taken by 50%.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private rotation = 0;
  private shimmer = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  modifyDamageTaken(amount: number): number {
    return Math.max(1, Math.ceil(amount * 0.5));
  }

  update(delta: number): void {
    this.rotation += delta * 0.0005;
    this.shimmer += delta * 0.003;
    const pulse = 0.65 + 0.2 * Math.sin(this.shimmer);

    this.graphics.clear();
    const cx = this.ball.body.x;
    const cy = this.ball.body.y;
    const r = 32;
    const sides = 6;

    this.graphics.lineStyle(3, 0xd4af37, pulse);
    this.graphics.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = this.rotation + (i / sides) * Math.PI * 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    }
    this.graphics.strokePath();

    this.graphics.lineStyle(1, 0xffd700, pulse * 0.4);
    this.graphics.strokeCircle(cx, cy, r - 4);
  }
}
