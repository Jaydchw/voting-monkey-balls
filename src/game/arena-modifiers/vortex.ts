import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";

const PULL_STRENGTH = 0.012; // velocity units added per frame × delta compensation
const TANGENT_RATIO = 0.45; // fraction of pull applied as tangential spin
const RAMP_DURATION = 8000; // ms to reach full pull strength
const ARM_FILL = 0x2f5aa8;
const ARM_OUTLINE = 0x183466;
const CORE_OUTER = 0x1d43a3;
const CORE_INNER = 0x3d6ed6;

export class VortexModifier extends ArenaModifier {
  readonly name = "Vortex";
  readonly quality = 3;
  readonly icon = "arrowsClockwise";
  readonly description =
    "A gravity vortex at the arena centre slowly pulls and spins all balls.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private elapsed = 0;
  private armAngle = 0;

  protected onApply(): void {
    this.elapsed = 0;
    this.armAngle = 0;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.elapsed += delta;
    const rampFactor = Math.min(1, this.elapsed / RAMP_DURATION);
    const strength = PULL_STRENGTH * rampFactor;

    const cx = this.arenaWidth / 2;
    const cy = this.arenaHeight / 2;

    // Apply pull + spin to each ball
    for (const ball of this.balls) {
      const dx = cx - ball.body.x;
      const dy = cy - ball.body.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const nx = dx / dist;
        const ny = dy / dist;
        // Radial (toward centre) component
        const radX = nx * strength * delta;
        const radY = ny * strength * delta;
        // Tangential (clockwise) component
        const tanX = -ny * strength * delta * TANGENT_RATIO;
        const tanY = nx * strength * delta * TANGENT_RATIO;
        const vel = ball.body.body.velocity;
        ball.body.setVelocity(vel.x + radX + tanX, vel.y + radY + tanY);
      }
    }

    // --- visual: spinning spiral arms ---
    this.armAngle += delta * 0.0014 * (0.5 + 0.5 * rampFactor);
    this.graphics.clear();

    const armCount = 3;
    const maxArmR = Math.min(cx, cy) * 0.85;

    for (let arm = 0; arm < armCount; arm++) {
      const baseAngle = this.armAngle + (arm / armCount) * Math.PI * 2;
      for (let step = 0; step < 40; step++) {
        const t = step / 40;
        const r = maxArmR * t;
        const a = baseAngle + t * Math.PI * 2.5;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const alpha = (0.18 + 0.14 * rampFactor) * (1 - t);
        const size = 3 + 2.5 * (1 - t);
        this.graphics.lineStyle(1.5, ARM_OUTLINE, Math.min(1, alpha + 0.18));
        this.graphics.fillStyle(ARM_FILL, alpha);
        this.graphics.fillCircle(x, y, size);
        this.graphics.strokeCircle(x, y, size);
      }
    }

    // Centre glow
    const pulseR = 10 + 6 * Math.sin(this.elapsed / 300) * rampFactor;
    this.graphics.fillStyle(CORE_OUTER, 0.24 * rampFactor);
    this.graphics.fillCircle(cx, cy, pulseR + 8);
    this.graphics.fillStyle(CORE_INNER, 0.55 * rampFactor);
    this.graphics.fillCircle(cx, cy, pulseR);
  }
}
