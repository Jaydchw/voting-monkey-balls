import type * as Phaser from "phaser";
import { BallModifier } from "../ball-modifier";
import { Ball } from "../ball";
import { GitFork } from "@phosphor-icons/react";

export class MitosisModifier extends BallModifier {
  readonly name = "Mitosis";
  readonly quality = 4;
  readonly icon = GitFork;
  readonly propagateToGhosts = false;
  readonly description =
    "Splits the ball into two linked copies that share a single health pool.";

  private ghost: Ball | null = null;
  private linkGraphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;

  protected onApply(): void {
    const master = this.ball;
    const ghostColor = master.body.fillColor;

    const masterX: number =
      master.body?.body?.position?.x ?? master.body.x ?? master.arenaWidth / 2;
    const masterY: number =
      master.body?.body?.position?.y ?? master.body.y ?? master.arenaHeight / 2;

    const offsetAngle = Math.random() * Math.PI * 2;
    const rawX = masterX + Math.cos(offsetAngle) * 80;
    const rawY = masterY + Math.sin(offsetAngle) * 80;
    const spawnX = Math.max(50, Math.min(master.arenaWidth - 50, rawX));
    const spawnY = Math.max(50, Math.min(master.arenaHeight - 50, rawY));

    this.ghost = new Ball(
      this.scene,
      spawnX,
      spawnY,
      ghostColor,
      master.speed,
      1,
      master.health,
      master.id,
      master.arenaWidth,
      master.arenaHeight,
      master.wallThickness,
      () => {},
      null,
    );

    this.ghost.isGhostBall = true;
    this.ghost.collisionMode = "linked-health";
    this.ghost.linkedBall = master;
    this.ghost.enemy = master.enemy;
    this.ghost.body.setAlpha(0.72);

    for (const mod of master.modifiers) {
      if (mod instanceof MitosisModifier) continue;
      const ModCtor = Object.getPrototypeOf(mod)
        .constructor as new () => typeof mod;
      this.ghost.addModifier(new ModCtor());
    }

    master.ghostBalls.push(this.ghost);

    this.linkGraphics = this.scene.add.graphics();
    this.linkGraphics.setDepth(1);
  }

  protected onRemove(): void {
    if (this.ghost) {
      const idx = this.ball.ghostBalls.indexOf(this.ghost);
      if (idx !== -1) this.ball.ghostBalls.splice(idx, 1);
      this.ghost.linkedBall = null;
      this.ghost.removeAllModifiers();
      this.ghost.body.destroy();
      this.ghost = null;
    }
    this.linkGraphics.destroy();
  }

  update(): void {
    if (!this.ghost) return;

    const mx = this.ball.body.x;
    const my = this.ball.body.y;
    const gx = this.ghost.body.x;
    const gy = this.ghost.body.y;

    this.linkGraphics.clear();

    const dist = Math.hypot(gx - mx, gy - my);
    const alpha = Math.max(0, 0.45 - dist / 320);
    if (alpha > 0.01) {
      const isRed = this.ball.id === "red";
      this.linkGraphics.lineStyle(2, isRed ? 0xff6666 : 0x6666ff, alpha);
      this.linkGraphics.beginPath();
      this.linkGraphics.moveTo(mx, my);
      this.linkGraphics.lineTo(gx, gy);
      this.linkGraphics.strokePath();
    }
  }
}
