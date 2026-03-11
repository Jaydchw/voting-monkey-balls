import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";

const TELEPORT_INTERVAL = 5000; // ms between teleports
const FLASH_DURATION = 350; // ms of flicker after teleport
const TRAIL_LIFETIME = 280; // ms each trail ghost persists

type TrailPoint = { x: number; y: number; age: number };

export class PoltergeistModifier extends BallModifier {
  readonly name = "Poltergeist";
  readonly quality = 3;
  readonly icon = "ghost";
  readonly description =
    "Teleports to a random arena position every 5 seconds.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private teleportTimer = TELEPORT_INTERVAL;
  private flashTimer = 0;
  private trail: TrailPoint[] = [];

  protected onApply(): void {
    this.trail = [];
    this.teleportTimer = TELEPORT_INTERVAL;
    this.flashTimer = 0;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(2);
  }

  protected onRemove(): void {
    this.ball.body.setAlpha(1);
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.teleportTimer -= delta;
    if (this.flashTimer > 0) this.flashTimer -= delta;

    // Record trail position every frame
    this.trail.push({ x: this.ball.body.x, y: this.ball.body.y, age: 0 });
    for (const pt of this.trail) pt.age += delta;
    this.trail = this.trail.filter((pt) => pt.age < TRAIL_LIFETIME);

    // Alpha flicker right after a teleport
    if (this.flashTimer > 0) {
      const t = this.flashTimer / FLASH_DURATION;
      this.ball.body.setAlpha(0.2 + 0.8 * (1 - t) * (1 - t));
    } else {
      this.ball.body.setAlpha(1);
    }

    // Draw ghostly trail
    this.graphics.clear();
    for (const pt of this.trail) {
      const progress = pt.age / TRAIL_LIFETIME;
      const alpha = (1 - progress) * 0.45;
      const r = 20 * (1 - progress * 0.6);
      this.graphics.fillStyle(0xaa88ff, alpha);
      this.graphics.fillCircle(pt.x, pt.y, r);
    }

    // Teleport
    if (this.teleportTimer <= 0) {
      this.teleportTimer = TELEPORT_INTERVAL;
      this.flashTimer = FLASH_DURATION;
      this.trail = []; // clear trail at teleport point

      const margin = 60;
      const newX = margin + Math.random() * (this.ball.arenaWidth - 2 * margin);
      const newY =
        margin + Math.random() * (this.ball.arenaHeight - 2 * margin);

      this.ball.body.setPosition(newX, newY);
    }
  }
}
