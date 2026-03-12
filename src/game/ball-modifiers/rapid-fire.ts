import { BallModifier } from "../ball-modifier";
import type { WeaponType } from "../ball-modifier";

const ATTACK_SPEED_MULTIPLIER = 0.65;

export class RapidFireModifier extends BallModifier {
  readonly name = "Rapid Fire";
  readonly quality = 2;
  readonly icon = "lightning";
  readonly description = "35% faster attacks for all weapons.";

  protected onApply(): void {}

  protected onRemove(): void {}

  modifyAttackSpeedMs(baseMs: number, weaponType: WeaponType): number {
    void weaponType;
    return baseMs * ATTACK_SPEED_MULTIPLIER;
  }
}
