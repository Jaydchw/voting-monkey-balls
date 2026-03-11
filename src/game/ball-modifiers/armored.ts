import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";

export class ArmoredModifier extends BallModifier {
  readonly name = "Armored";
  readonly quality = 2;
  readonly icon = "shield";
  readonly description =
    "Halves all damage. Starts with a 20 HP shield that absorbs hits first.";

  private SHIELD_HP = 20;
  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private rotation = 0;
  private shimmer = 0;

  protected onApply(): void {
    this.ball.shieldHP = this.SHIELD_HP;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onRemove(): void {
    this.ball.shieldHP = 0;
    this.graphics.destroy();
  }

  modifyDamageTaken(amount: number): number {
    // Halve damage first
    const halved = Math.ceil(amount * 0.5);
    // Then drain shield before HP
    if (this.ball.shieldHP > 0 && halved > 0) {
      const absorbed = Math.min(this.ball.shieldHP, halved);
      this.ball.shieldHP -= absorbed;
      return halved - absorbed;
    }
    return Math.max(1, halved);
  }

  update(delta: number): void {
    this.rotation += delta * 0.0005;
    this.shimmer += delta * 0.003;
    const shieldFraction = this.ball.shieldHP / this.SHIELD_HP;
    const pulse = 0.65 + 0.2 * Math.sin(this.shimmer);

    this.graphics.clear();
    const cx = this.ball.body.x;
    const cy = this.ball.body.y;
    const r = 32;
    const sides = 6;

    // Gold hexagon (dims as shield depletes)
    const hexAlpha = 0.3 + 0.7 * shieldFraction;
    this.graphics.lineStyle(3, 0xd4af37, pulse * hexAlpha);
    this.graphics.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = this.rotation + (i / sides) * Math.PI * 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    }
    this.graphics.strokePath();

    // Inner ring (always present at reduced opacity)
    this.graphics.lineStyle(1, 0xffd700, pulse * 0.4);
    this.graphics.strokeCircle(cx, cy, r - 4);

    // Shield pip indicators around the hex
    if (shieldFraction > 0) {
      const pipCount = Math.ceil(this.ball.shieldHP / 4);
      for (let i = 0; i < pipCount; i++) {
        const a = this.rotation + (i / Math.max(1, pipCount)) * Math.PI * 2;
        const px = cx + Math.cos(a) * (r + 7);
        const py = cy + Math.sin(a) * (r + 7);
        this.graphics.fillStyle(0xffd700, 0.7 * pulse);
        this.graphics.fillCircle(px, py, 3);
      }
    }
  }
}
