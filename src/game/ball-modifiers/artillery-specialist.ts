import { Target } from "@phosphor-icons/react";
import { BallModifier } from "../ball-modifier";
import type { DamageSource, OutgoingDamageProfile } from "../ball-modifier";

export class ArtillerySpecialistModifier extends BallModifier {
  readonly name = "Artillery Specialist";
  readonly quality = 2;
  readonly icon = Target;
  readonly description = "Projectile damage x2. Melee damage x0.5.";

  protected onApply(): void {}

  protected onRemove(): void {}

  modifyOutgoingDamage(
    profile: OutgoingDamageProfile,
    source: DamageSource,
  ): OutgoingDamageProfile {
    if (source === "projectile") {
      return {
        ...profile,
        instant: profile.instant * 2,
        dotTotal: profile.dotTotal * 2,
      };
    }

    if (source === "melee") {
      return {
        ...profile,
        instant: profile.instant * 0.5,
        dotTotal: profile.dotTotal * 0.5,
      };
    }

    return profile;
  }
}
