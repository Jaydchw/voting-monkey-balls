import { BallModifier } from "../ball-modifier";
import type { DamageSource, OutgoingDamageProfile } from "../ball-modifier";

const DAMAGE_MULTIPLIER = 1.5;
const DOT_DURATION_MS = 5000;
const DOT_TICK_MS = 250;

export class CausticPayloadModifier extends BallModifier {
  readonly name = "Caustic Payload";
  readonly quality = 3;
  readonly icon = "drop";
  readonly description =
    "Attacks deal +50% damage, but all of it is delivered over 5s.";

  protected onApply(): void {}

  protected onRemove(): void {}

  modifyOutgoingDamage(
    profile: OutgoingDamageProfile,
    source: DamageSource,
  ): OutgoingDamageProfile {
    if (source !== "melee" && source !== "projectile") {
      return profile;
    }

    const convertedTotal = profile.instant * DAMAGE_MULTIPLIER;
    return {
      ...profile,
      instant: 0,
      dotTotal: profile.dotTotal + convertedTotal,
      dotDurationMs: Math.max(profile.dotDurationMs, DOT_DURATION_MS),
      dotTickMs:
        profile.dotTickMs > 0
          ? Math.min(profile.dotTickMs, DOT_TICK_MS)
          : DOT_TICK_MS,
    };
  }
}
