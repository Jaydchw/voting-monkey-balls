import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";
import { Fire } from "@phosphor-icons/react";

export class BerserkerModifier extends BallModifier {
  readonly name = "Berserker";
  readonly quality = 3;
  readonly icon = Fire;
  readonly description =
    "Speeds up as health drops — up to 1.8x speed at 0 HP.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private flameT = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  modifySpeed(speed: number): number {
    const missingFrac = 1 - this.ball.health / this.ball.maxHealth;
    return speed * (1 + 0.8 * missingFrac);
  }

  update(delta: number): void {
    this.flameT += delta * 0.005;
    const missingFrac = 1 - this.ball.health / this.ball.maxHealth;

    this.graphics.clear();
    if (missingFrac < 0.05) return;

    const cx = this.ball.body.x;
    const cy = this.ball.body.y;
    const maxRadius = 20 + missingFrac * 28;
    const tongues = 6;

    for (let i = 0; i < tongues; i++) {
      const wobble = Math.sin(this.flameT * 2.3 + i) * 0.4;
      const angle = this.flameT + (i / tongues) * Math.PI * 2 + wobble;
      const len =
        maxRadius * (0.7 + 0.3 * Math.sin(this.flameT * 1.7 + i * 1.3));
      const tx = cx + Math.cos(angle) * len;
      const ty = cy + Math.sin(angle) * len;
      const color = i % 3 === 0 ? 0xff4400 : i % 3 === 1 ? 0xff8800 : 0xffcc00;
      this.graphics.fillStyle(color, 0.5 + missingFrac * 0.3);
      this.graphics.fillTriangle(
        cx + Math.cos(angle + 0.3) * 10,
        cy + Math.sin(angle + 0.3) * 10,
        cx + Math.cos(angle - 0.3) * 10,
        cy + Math.sin(angle - 0.3) * 10,
        tx,
        ty,
      );
    }
  }
}
