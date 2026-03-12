import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";
import { Magnet } from "@phosphor-icons/react";

const ATTRACT_STRENGTH = 0.12;

export class MagneticModifier extends BallModifier {
  readonly name = "Magnetic";
  readonly quality = 2;
  readonly icon = Magnet;
  readonly description = "Gradually pulls the enemy ball toward this one.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private fieldT = 0;

  protected onApply(): void {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.fieldT += delta * 0.002;
    this.graphics.clear();

    const cx = this.ball.body.x;
    const cy = this.ball.body.y;

    for (let i = 0; i < 3; i++) {
      const arcAngle = this.fieldT + (i / 3) * Math.PI * 2;
      const arcR = 30 + i * 6;
      this.graphics.lineStyle(1.5, 0x4488ff, 0.4 - i * 0.1);
      this.graphics.beginPath();
      this.graphics.arc(
        cx,
        cy,
        arcR,
        arcAngle,
        arcAngle + Math.PI * 1.2,
        false,
      );
      this.graphics.strokePath();
    }

    const enemy = this.ball.enemy;
    if (!enemy) return;

    const dx = cx - enemy.body.x;
    const dy = cy - enemy.body.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const evx = enemy.body.body.velocity.x;
    const evy = enemy.body.body.velocity.y;
    const emag = Math.hypot(evx, evy);
    if (emag < 0.001) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const blendX =
      (evx / emag) * (1 - ATTRACT_STRENGTH) + nx * ATTRACT_STRENGTH;
    const blendY =
      (evy / emag) * (1 - ATTRACT_STRENGTH) + ny * ATTRACT_STRENGTH;
    const blendMag = Math.hypot(blendX, blendY);
    if (blendMag < 0.001) return;

    enemy.body.setVelocity(
      (blendX / blendMag) * emag,
      (blendY / blendMag) * emag,
    );
  }
}
