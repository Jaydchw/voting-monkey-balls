import { ArenaModifier } from "../arena-modifier";
import { GrowthHormonesModifier } from "../ball-modifiers/growth-hormones";
import { MitosisModifier } from "../ball-modifiers/mitosis";
import { UsersFour } from "@phosphor-icons/react";

export class TwoVsTwoModifier extends ArenaModifier {
  readonly name = "2v2";
  readonly quality = 3;
  readonly icon = UsersFour;
  readonly description =
    "Both teams gain Growth Hormones and Mitosis, turning the fight into a 2v2.";

  protected onApply(): void {
    this.redBall.addModifier(new MitosisModifier());
    this.redBall.addModifier(new GrowthHormonesModifier());
    this.blueBall.addModifier(new MitosisModifier());
    this.blueBall.addModifier(new GrowthHormonesModifier());
  }

  protected onRemove(): void {}
}
