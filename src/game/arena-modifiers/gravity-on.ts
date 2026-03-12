import { ArenaModifier } from "../arena-modifier";
import { ArrowFatDown } from "@phosphor-icons/react";

const PROJECTILE_GRAVITY = 1400;

export class GravityOnModifier extends ArenaModifier {
  readonly name = "Gravity On";
  readonly quality = 3;
  readonly icon = ArrowFatDown;
  readonly description = "Enables gravity for projectiles only.";

  private previousProjectileGravity = new Map<string, number>();

  protected onApply(): void {
    for (const ball of this.runtime.getAllMasterBalls()) {
      this.previousProjectileGravity.set(
        ball.id + String(ball.body.body.id),
        ball.projectileGravityY,
      );
      ball.projectileGravityY = PROJECTILE_GRAVITY;
    }
  }

  protected onRemove(): void {
    for (const ball of this.runtime.getAllMasterBalls()) {
      const previous = this.previousProjectileGravity.get(
        ball.id + String(ball.body.body.id),
      );
      if (previous === undefined) continue;
      ball.projectileGravityY = previous;
    }
    this.previousProjectileGravity.clear();
  }
}
