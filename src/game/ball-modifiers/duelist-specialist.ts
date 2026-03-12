import { BallModifier } from "../ball-modifier";
import type { DamageSource, OutgoingDamageProfile } from "../ball-modifier";

export class DuelistSpecialistModifier extends BallModifier {
  readonly name = "Duelist Specialist";
  readonly quality = 2;
  readonly icon = "asterisk";
  readonly description = "Melee damage x2. Projectile damage x0.5.";

  protected onApply(): void {}

  protected onRemove(): void {}

  modifyOutgoingDamage(
    profile: OutgoingDamageProfile,
    source: DamageSource,
  ): OutgoingDamageProfile {
    if (source === "melee") {
      return {
        ...profile,
        instant: profile.instant * 2,
        dotTotal: profile.dotTotal * 2,
      };
    }

    if (source === "projectile") {
      return {
        ...profile,
        instant: profile.instant * 0.5,
        dotTotal: profile.dotTotal * 0.5,
      };
    }

    return profile;
  }
}
