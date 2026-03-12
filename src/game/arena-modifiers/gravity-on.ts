import { ArenaModifier } from "../arena-modifier";

const BALL_GRAVITY = 420;
const PROJECTILE_GRAVITY = 1400;

export class GravityOnModifier extends ArenaModifier {
  readonly name = "Gravity On";
  readonly quality = 3;
  readonly icon = "gauge";
  readonly description =
    "Enables gravity for balls and projectiles while balls keep their momentum.";

  private previous = new Map<
    string,
    { ballGravity: number; projectileGravity: number }
  >();

  protected onApply(): void {
    for (const ball of this.runtime.getAllMasterBalls()) {
      this.previous.set(ball.id + String(ball.body.body.id), {
        ballGravity: ball.gravityY,
        projectileGravity: ball.projectileGravityY,
      });
      ball.gravityY = BALL_GRAVITY;
      ball.projectileGravityY = PROJECTILE_GRAVITY;
    }
  }

  protected onRemove(): void {
    for (const ball of this.runtime.getAllMasterBalls()) {
      const state = this.previous.get(ball.id + String(ball.body.body.id));
      if (!state) continue;
      ball.gravityY = state.ballGravity;
      ball.projectileGravityY = state.projectileGravity;
    }
    this.previous.clear();
  }
}
