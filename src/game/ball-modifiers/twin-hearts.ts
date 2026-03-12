import { BallModifier } from "../ball-modifier";

export class TwinHeartsModifier extends BallModifier {
  readonly name = "Twin Hearts";
  readonly quality = 3;
  readonly icon = "heart";
  readonly description = "Double max HP and immediately heal to full.";

  private previousMaxHealth = 0;

  protected onApply(): void {
    this.previousMaxHealth = this.ball.maxHealth;
    this.ball.maxHealth = this.previousMaxHealth * 2;
    this.ball.heal(this.ball.maxHealth);
  }

  protected onRemove(): void {
    this.ball.maxHealth = Math.max(
      1,
      this.previousMaxHealth || this.ball.maxHealth,
    );
    this.ball.health = Math.min(this.ball.health, this.ball.maxHealth);
    this.ball.heal(0);
  }
}
