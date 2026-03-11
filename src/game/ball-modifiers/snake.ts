import { BallModifier } from "../ball-modifier";
import { BALL_COLLISION_RADIUS, Ball } from "../ball";

const GHOSTS_PER_STACK = 5;
const GHOST_ALPHA = 0.42;
const EDGE_MARGIN = BALL_COLLISION_RADIUS + 2;
const STACK_HISTORY_SPAN_MS = 500;
const HISTORY_STEP_MS = STACK_HISTORY_SPAN_MS / GHOSTS_PER_STACK;
const MAX_HISTORY_AGE_MS = HISTORY_STEP_MS * GHOSTS_PER_STACK * 8;

type PositionSample = {
  x: number;
  y: number;
  age: number;
};

export class SnakeModifier extends BallModifier {
  readonly name = "Snake";
  readonly quality = 3;
  readonly icon = "ghost";
  readonly propagateToGhosts = false;
  readonly description =
    "Leaves a chain of ghost balls in its wake that block enemies and deal contact damage.";

  private ghosts: Ball[] = [];
  private history: PositionSample[] = [];

  protected onApply(): void {
    this.history = [{ x: this.ball.body.x, y: this.ball.body.y, age: 0 }];
    this.ensureGhostCount();
  }

  protected onRemove(): void {
    for (const ghost of this.ghosts) {
      const idx = this.ball.ghostBalls.indexOf(ghost);
      if (idx !== -1) this.ball.ghostBalls.splice(idx, 1);
      ghost.linkedBall = null;
      ghost.removeAllModifiers();
      ghost.body.destroy();
    }
    this.ghosts = [];
    this.history = [];
  }

  update(delta: number): void {
    this.ensureGhostCount();
    this.recordHistory(delta);

    const stackIndex = this.getStackIndex();
    if (stackIndex === -1) return;

    for (let i = 0; i < this.ghosts.length; i++) {
      const historyIndex = stackIndex * GHOSTS_PER_STACK + i;
      const targetAge = (historyIndex + 1) * HISTORY_STEP_MS;
      const sample = this.getHistorySample(targetAge);
      const targetX = this.clampToArena(sample.x, this.ball.arenaWidth);
      const targetY = this.clampToArena(sample.y, this.ball.arenaHeight);

      this.ghosts[i].body.setPosition(targetX, targetY);
    }
  }

  private recordHistory(delta: number): void {
    this.history.unshift({ x: this.ball.body.x, y: this.ball.body.y, age: 0 });
    for (let i = 1; i < this.history.length; i++) {
      this.history[i].age += delta;
    }
    this.history = this.history.filter(
      (sample) => sample.age <= MAX_HISTORY_AGE_MS,
    );
    if (this.history.length === 0) {
      this.history.push({ x: this.ball.body.x, y: this.ball.body.y, age: 0 });
    }
  }

  private getHistorySample(targetAge: number): PositionSample {
    const newest = this.history[0];
    const oldest = this.history[this.history.length - 1];

    if (!oldest || oldest.age < targetAge) {
      return newest;
    }

    for (const sample of this.history) {
      if (sample.age >= targetAge) {
        return sample;
      }
    }

    return newest;
  }

  private ensureGhostCount(): void {
    while (this.ghosts.length < GHOSTS_PER_STACK) {
      const ghost = this.createGhost();
      this.ghosts.push(ghost);
      this.ball.ghostBalls.push(ghost);
    }
  }

  private createGhost(): Ball {
    const master = this.ball;
    const ghost = new Ball(
      this.scene,
      master.body.x,
      master.body.y,
      master.body.fillColor,
      master.speed,
      1,
      master.health,
      master.id,
      master.arenaWidth,
      master.arenaHeight,
      master.wallThickness,
      () => {},
      null,
      {
        alpha: GHOST_ALPHA,
        collisionMode: "proxy-contact",
        isStatic: true,
        receivesModifierPropagation: false,
        startsMoving: false,
      },
    );

    ghost.isGhostBall = true;
    ghost.linkedBall = master;
    ghost.enemy = master.enemy;
    return ghost;
  }

  private getStackIndex(): number {
    return this.ball.modifiers
      .filter(
        (modifier): modifier is SnakeModifier =>
          modifier instanceof SnakeModifier,
      )
      .indexOf(this);
  }

  private clampToArena(position: number, max: number): number {
    return Math.max(EDGE_MARGIN, Math.min(max - EDGE_MARGIN, position));
  }
}
