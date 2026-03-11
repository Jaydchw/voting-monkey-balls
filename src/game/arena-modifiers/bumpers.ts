import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";

const BUMPER_RADIUS = 18;
const BUMPER_COLOR = 0xcc44ff;
const BUMPER_OUTLINE = 0x330044;

// Fixed positions: 4 corners and 1 centre bumper
const BUMPER_LAYOUT = [
  { x: 0.25, y: 0.28 },
  { x: 0.75, y: 0.28 },
  { x: 0.25, y: 0.72 },
  { x: 0.75, y: 0.72 },
  { x: 0.5, y: 0.5 },
];

export class BumpersModifier extends ArenaModifier {
  readonly name = "Bumpers";
  readonly quality = 2;
  readonly icon = "dotsNine";
  readonly description =
    "Adds 5 indestructible bumper obstacles that deflect balls at high speed.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  // Store raw matter bodies for removal, and circle visuals separately
  private bumperBodies: MatterJS.BodyType[] = [];
  private bumperPositions: Array<{ x: number; y: number }> = [];
  private t = 0;

  protected onApply(): void {
    this.bumperBodies = [];
    this.bumperPositions = [];
    this.t = 0;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(1);

    for (const rel of BUMPER_LAYOUT) {
      const x = rel.x * this.arenaWidth;
      const y = rel.y * this.arenaHeight;
      this.bumperPositions.push({ x, y });

      // Add a static circular physics body
      const body = this.scene.matter.add.circle(x, y, BUMPER_RADIUS, {
        isStatic: true,
        restitution: 1.4,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        label: "bumper",
      }) as unknown as MatterJS.BodyType;

      this.bumperBodies.push(body);
    }
  }

  protected onRemove(): void {
    for (const body of this.bumperBodies) {
      // Use Phaser's world remove method
      this.scene.matter.world.remove(body as never, false);
    }
    this.bumperBodies = [];
    this.bumperPositions = [];
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.t += delta / 500;
    this.graphics.clear();

    for (let i = 0; i < this.bumperPositions.length; i++) {
      const { x, y } = this.bumperPositions[i];
      const pulse = 0.5 + 0.5 * Math.sin(this.t * Math.PI * 2 + i * 1.3);

      // Outer glow ring
      this.graphics.lineStyle(3, BUMPER_COLOR, 0.2 + 0.25 * pulse);
      this.graphics.strokeCircle(x, y, BUMPER_RADIUS + 5 + 4 * pulse);

      // Main body
      this.graphics.fillStyle(BUMPER_COLOR, 0.85);
      this.graphics.fillCircle(x, y, BUMPER_RADIUS);

      // Outline
      this.graphics.lineStyle(3, BUMPER_OUTLINE, 1);
      this.graphics.strokeCircle(x, y, BUMPER_RADIUS);

      // Inner highlight dot
      this.graphics.fillStyle(0xffffff, 0.4 + 0.2 * pulse);
      this.graphics.fillCircle(
        x - BUMPER_RADIUS * 0.3,
        y - BUMPER_RADIUS * 0.3,
        4,
      );
    }
  }
}
