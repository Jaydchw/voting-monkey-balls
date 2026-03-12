import { BallModifier } from "../ball-modifier";
import type { DamageSource } from "../ball-modifier";

const EVADE_CHANCE = 0.25;

export class LuckyEvadeModifier extends BallModifier {
  readonly name = "Lucky Evade";
  readonly quality = 2;
  readonly icon = "ghost";
  readonly description = "25% chance to ignore incoming damage.";

  protected onApply(): void {}

  protected onRemove(): void {}

  preventIncomingDamage(amount: number, source: DamageSource): boolean {
    void source;
    if (amount <= 0) {
      return false;
    }
    return Math.random() < EVADE_CHANCE;
  }
}
