import { BallModifier } from "../ball-modifier";

const DEFLECT_CHANCE = 0.5;

export class ProjectileDeflectorModifier extends BallModifier {
  readonly name = "Projectile Deflector";
  readonly quality = 3;
  readonly icon = "shield";
  readonly description = "50% chance to deflect incoming projectiles back.";

  protected onApply(): void {}

  protected onRemove(): void {}

  tryDeflectProjectile(): boolean {
    return Math.random() < DEFLECT_CHANCE;
  }
}
