import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";
import { CornersIn } from "@phosphor-icons/react";

const SHRINK_DURATION = 40000; // ms to reach minimum size
const MIN_RADIUS = 70;
const DAMAGE_PER_TICK = 5;
const TICK_INTERVAL = 1000;
const PUSH_STRENGTH = 2.5;

export class ShrinkingArenaModifier extends ArenaModifier {
  readonly name = "Shrinking Zone";
  readonly quality = 4;
  readonly icon = CornersIn;
  readonly description =
    "A safe circle shrinks toward the centre. Balls outside take damage each second.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private elapsed = 0;
  private damageTick = 0;
  private currentRadius = 0;
  private maxRadius = 0;

  protected onApply(): void {
    this.elapsed = 0;
    this.damageTick = 0;
    this.maxRadius = Math.min(this.arenaWidth, this.arenaHeight) * 0.48;
    this.currentRadius = this.maxRadius;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(3);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.damageTick += delta;

    const progress = Math.min(1, this.elapsed / SHRINK_DURATION);
    this.currentRadius =
      this.maxRadius - (this.maxRadius - MIN_RADIUS) * progress;

    const cx = this.arenaWidth / 2;
    const cy = this.arenaHeight / 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed / 160);

    this.graphics.clear();

    // Outer glow halos around the ring
    for (let i = 4; i >= 1; i--) {
      const r = this.currentRadius + i * 6;
      const alpha = 0.1 * (5 - i) * (0.6 + 0.4 * pulse);
      this.graphics.lineStyle(2, 0xff5500, alpha);
      this.graphics.strokeCircle(cx, cy, r);
    }

    // Main ring
    const ringAlpha = 0.75 + 0.25 * pulse;
    this.graphics.lineStyle(5, 0xff6600, ringAlpha);
    this.graphics.strokeCircle(cx, cy, this.currentRadius);
    this.graphics.lineStyle(2, 0xffcc00, ringAlpha * 0.7);
    this.graphics.strokeCircle(cx, cy, this.currentRadius - 4);

    // Tick marks radiating out from the ring edge at every 45°
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.elapsed / 3000;
      const x1 = cx + Math.cos(a) * (this.currentRadius + 8);
      const y1 = cy + Math.sin(a) * (this.currentRadius + 8);
      const x2 = cx + Math.cos(a) * (this.currentRadius + 16 + 4 * pulse);
      const y2 = cy + Math.sin(a) * (this.currentRadius + 16 + 4 * pulse);
      this.graphics.lineStyle(2, 0xff4400, 0.7 * pulse);
      this.graphics.beginPath();
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      this.graphics.strokePath();
    }

    // Damage + push outside balls every second
    if (this.damageTick >= TICK_INTERVAL) {
      this.damageTick -= TICK_INTERVAL;
      for (const ball of this.balls) {
        const dx = ball.body.x - cx;
        const dy = ball.body.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > this.currentRadius) {
          ball.takeDamage(DAMAGE_PER_TICK);
          // Nudge velocity toward centre so the ball re-enters
          const nx = dx / dist;
          const ny = dy / dist;
          const vel = ball.body.body.velocity;
          ball.body.setVelocity(
            vel.x - nx * PUSH_STRENGTH,
            vel.y - ny * PUSH_STRENGTH,
          );
        }
      }
    }
  }
}
