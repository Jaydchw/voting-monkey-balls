import { ArenaModifier } from "../arena-modifier";
import { FastForward } from "@phosphor-icons/react";

export class DoubleTimeModifier extends ArenaModifier {
  readonly name = "Double Time";
  readonly quality = 3;
  readonly icon = FastForward;
  readonly description =
    "Simulation speed is doubled for balls, projectiles, cooldowns, and effects.";

  private applied = false;

  protected onApply(): void {
    if (this.applied) return;
    this.applied = true;

    this.runtime.setSimulationTimeScale(
      this.runtime.getSimulationTimeScale() * 2,
    );
    for (const ball of this.runtime.getAllMasterBalls()) {
      ball.simulationSpeedMultiplier *= 2;
    }
  }

  protected onRemove(): void {
    if (!this.applied) return;
    this.applied = false;

    this.runtime.setSimulationTimeScale(
      this.runtime.getSimulationTimeScale() / 2,
    );
    for (const ball of this.runtime.getAllMasterBalls()) {
      ball.simulationSpeedMultiplier /= 2;
    }
  }
}
