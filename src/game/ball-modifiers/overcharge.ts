import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";

const ZAP_INTERVAL = 3000;
const ZAP_DAMAGE = 8;
const ZAP_FLASH_DURATION = 200;
const SPARK_COLOR = 0x2d5f99;
const ZAP_COLOR = 0x143f73;

export class OverchargeModifier extends BallModifier {
  readonly name = "Overcharge";
  readonly quality = 3;
  readonly icon = "lightning";
  readonly description = "Every 3 seconds, zaps the enemy for 8 damage.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private sparkT = 0;
  private zapTimer = ZAP_INTERVAL;
  private flashTimer = 0;
  private flashTargetX = 0;
  private flashTargetY = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(3);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.sparkT += delta * 0.007;
    this.zapTimer -= delta;
    if (this.flashTimer > 0) this.flashTimer -= delta;

    this.graphics.clear();
    const cx = this.ball.body.x;
    const cy = this.ball.body.y;

    const sparkCount = 5;
    for (let i = 0; i < sparkCount; i++) {
      const angle = this.sparkT + (i / sparkCount) * Math.PI * 2;
      const r = 26 + Math.sin(this.sparkT * 3 + i) * 4;
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r;
      const sxOff = cx + Math.cos(angle + 0.4) * (r - 8);
      const syOff = cy + Math.sin(angle + 0.4) * (r - 8);
      this.graphics.lineStyle(3, SPARK_COLOR, 0.85);
      this.graphics.beginPath();
      this.graphics.moveTo(sx, sy);
      this.graphics.lineTo(sxOff, syOff);
      this.graphics.strokePath();
    }

    if (this.flashTimer > 0) {
      const alpha = this.flashTimer / ZAP_FLASH_DURATION;
      const segments = 8;
      this.graphics.lineStyle(4, ZAP_COLOR, Math.min(1, alpha + 0.2));
      this.graphics.beginPath();
      this.graphics.moveTo(cx, cy);
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const boltX =
          cx + (this.flashTargetX - cx) * t + (Math.random() - 0.5) * 20;
        const boltY =
          cy + (this.flashTargetY - cy) * t + (Math.random() - 0.5) * 20;
        this.graphics.lineTo(boltX, boltY);
      }
      this.graphics.lineTo(this.flashTargetX, this.flashTargetY);
      this.graphics.strokePath();
    }

    if (this.zapTimer <= 0) {
      this.zapTimer = ZAP_INTERVAL;
      const enemy = this.ball.enemy;
      if (!enemy) return;
      this.flashTargetX = enemy.body.x;
      this.flashTargetY = enemy.body.y;
      this.flashTimer = ZAP_FLASH_DURATION;
      enemy.takeDamage(ZAP_DAMAGE);
    }
  }
}
