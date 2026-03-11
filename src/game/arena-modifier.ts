import type * as Phaser from "phaser";
import type { Ball } from "./ball";

/** References to the four static wall bodies that bound the arena. */
export type ArenaWalls = {
  top: MatterJS.BodyType;
  bottom: MatterJS.BodyType;
  left: MatterJS.BodyType;
  right: MatterJS.BodyType;
};

/**
 * Base class for arena-wide modifiers.
 * Mirrors the BallModifier structure: subclasses override `onApply`,
 * `onRemove`, and optionally `update(delta)`.
 */
export abstract class ArenaModifier {
  abstract readonly name: string;
  abstract readonly quality: number;
  /** Phosphor icon key displayed in the panel. */
  abstract readonly icon: string;
  abstract readonly description: string;

  protected scene!: Phaser.Scene;
  protected redBall!: Ball;
  protected blueBall!: Ball;
  protected arenaWidth!: number;
  protected arenaHeight!: number;
  protected walls!: ArenaWalls;

  apply(
    scene: Phaser.Scene,
    redBall: Ball,
    blueBall: Ball,
    arenaWidth: number,
    arenaHeight: number,
    walls: ArenaWalls,
  ): void {
    this.scene = scene;
    this.redBall = redBall;
    this.blueBall = blueBall;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.walls = walls;
    this.onApply();
  }

  protected abstract onApply(): void;
  protected abstract onRemove(): void;

  remove(): void {
    this.onRemove();
  }

  /** Called every frame with delta in milliseconds. */
  update(_delta: number): void {}

  /** Convenience accessor for both balls. */
  protected get balls(): Ball[] {
    return [this.redBall, this.blueBall];
  }
}
