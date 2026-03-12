import { ArenaModifier } from "../arena-modifier";

export class DoubleLoadoutModifier extends ArenaModifier {
  readonly name = "Double Loadout";
  readonly quality = 3;
  readonly icon = "dotsNine";
  readonly description =
    "Newly added weapons and ball modifiers are applied twice.";

  protected onApply(): void {
    for (const ball of this.runtime.getAllMasterBalls()) {
      const existingModifiers = [...ball.modifiers];
      const existingWeapons = [...ball.weapons];

      for (const modifier of existingModifiers) {
        const ModifierCtor = Object.getPrototypeOf(modifier)
          .constructor as new () => typeof modifier;
        ball.addModifier(new ModifierCtor());
      }

      for (const weapon of existingWeapons) {
        const WeaponCtor = Object.getPrototypeOf(weapon)
          .constructor as new () => typeof weapon;
        ball.addWeapon(new WeaponCtor());
      }

      ball.modifierApplicationMultiplier *= 2;
      ball.weaponApplicationMultiplier *= 2;
    }
  }

  protected onRemove(): void {
    for (const ball of this.runtime.getAllMasterBalls()) {
      ball.modifierApplicationMultiplier = Math.max(
        1,
        ball.modifierApplicationMultiplier / 2,
      );
      ball.weaponApplicationMultiplier = Math.max(
        1,
        ball.weaponApplicationMultiplier / 2,
      );
    }
  }
}
