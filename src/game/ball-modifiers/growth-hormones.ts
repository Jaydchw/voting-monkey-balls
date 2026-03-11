import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";
import type { Ball } from "../ball";

const GROW_DURATION = 8000; // ms to reach full size
const MAX_SCALE = 1.5;
const EXTRA_DAMAGE_AT_MAX = 3; // bonus collision damage when fully grown

export class GrowthHormonesModifier extends BallModifier {
  readonly name = "Growth Hormones";
  readonly quality = 2;
  readonly icon = "arrowsOut";
  readonly description =
    "Ball swells to 1.5× size over 8 s. Larger size deals extra collision damage.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private growProgress = 0; // 0 → 1
  private ringT = 0;
  private currentScale = 1.0;

  protected onApply(): void {
    this.growProgress = 0;
    this.currentScale = 1.0;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.ball.setSize(1.0);
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.ringT += delta / 1200;

    if (this.growProgress < 1) {
      this.growProgress = Math.min(
        1,
        this.growProgress + delta / GROW_DURATION,
      );
      const target = 1.0 + (MAX_SCALE - 1.0) * this.growProgress;
      if (Math.abs(target - this.currentScale) >= 0.005) {
        this.currentScale = target;
        this.ball.setSize(target);
      }
    }

    // Expanding green ring aura
    const x = this.ball.body.x;
    const y = this.ball.body.y;
    const baseR = 24 * this.ball.physicsScale;
    const ringR = baseR + 10 + 6 * Math.sin(this.ringT * Math.PI * 2);
    const alpha = 0.15 + 0.2 * this.growProgress;

    this.graphics.clear();
    this.graphics.lineStyle(3, 0x66ff66, alpha + 0.1);
    this.graphics.strokeCircle(x, y, ringR);
    this.graphics.fillStyle(0x33cc33, alpha * 0.5);
    this.graphics.fillCircle(x, y, ringR - 4);
  }

  onBallHitBall(other: Ball): void {
    const bonus = Math.round(EXTRA_DAMAGE_AT_MAX * this.growProgress);
    if (bonus > 0) other.takeDamage(bonus);
  }
}
