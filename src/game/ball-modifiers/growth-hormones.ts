import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";
import type { Ball } from "../ball";

const MAX_SCALE = 1.5;
const EXTRA_DAMAGE = 3; // bonus collision damage when grown

export class GrowthHormonesModifier extends BallModifier {
  readonly name = "Growth Hormones";
  readonly quality = 2;
  readonly icon = "arrowsOut";
  readonly description =
    "Instantly grows the ball to 1.5× size. Collisions deal 3 extra damage.";
  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private ringT = 0;

  protected onApply(): void {
    this.ball.setSize(MAX_SCALE);
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.ball.setSize(1.0);
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.ringT += delta / 1200;

    const x = this.ball.body.x;
    const y = this.ball.body.y;
    const baseR = 24 * this.ball.physicsScale;
    const ringR = baseR + 10 + 6 * Math.sin(this.ringT * Math.PI * 2);

    this.graphics.clear();
    this.graphics.lineStyle(3, 0x66ff66, 0.35);
    this.graphics.strokeCircle(x, y, ringR);
    this.graphics.fillStyle(0x33cc33, 0.12);
    this.graphics.fillCircle(x, y, ringR - 4);
  }

  onBallHitBall(other: Ball): void {
    other.takeDamage(EXTRA_DAMAGE);
  }
}
