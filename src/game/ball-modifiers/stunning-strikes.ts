import { Warning } from "@phosphor-icons/react";
import { BallModifier } from "../ball-modifier";
import type { Ball } from "../ball";
import type { DamageSource } from "../ball-modifier";

const STUN_CHANCE = 0.5;
const STUN_DURATION_MS = 1000;

export class StunningStrikesModifier extends BallModifier {
  readonly name = "Stunning Strikes";
  readonly quality = 3;
  readonly icon = Warning;
  readonly description = "All attacks have a 50% chance to stun for 1 second.";

  protected onApply(): void {}

  protected onRemove(): void {}

  onAttackLanded(target: Ball, source: DamageSource, amount: number): void {
    void amount;
    if (source !== "melee" && source !== "projectile") {
      return;
    }
    if (Math.random() < STUN_CHANCE) {
      target.applyStun(STUN_DURATION_MS);
    }
  }
}
