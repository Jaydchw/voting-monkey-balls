import type * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import type { Ball } from "../ball";
import { MeleeWeapon } from "./melee-weapon";
import { RangedWeapon } from "./ranged-weapon";
import { ArrowArcLeft } from "@phosphor-icons/react";

const KATANA_REACH = 64;

export class KatanaWeapon extends MeleeWeapon {
  readonly name = "Katana";
  readonly quality = 4;
  readonly icon = ArrowArcLeft;
  readonly description =
    "A mirror-edged katana that slices in arcs and deflects projectiles.";
  readonly attackSpeedMs = 360;
  readonly sound = "slice" as const;

  protected readonly orbitRadius = KATANA_REACH;
  protected readonly swingSpeed = Math.PI * 1.95;
  protected readonly contactRadius = 30;
  protected readonly contactDamage = 7;
  protected readonly contactHitEffect = "slash" as const;

  private blade!: Phaser.GameObjects.Graphics;
  private slash!: Phaser.GameObjects.Graphics;
  private bladeX = 0;
  private bladeY = 0;

  protected onEquip(): void {
    this.blade = this.scene.add.graphics();
    this.blade.setDepth(3);
    this.slash = this.scene.add.graphics();
    this.slash.setDepth(2);
  }

  protected onUnequip(): void {
    this.slash.destroy();
    this.blade.destroy();
  }

  update(delta: number): void {
    super.update(delta);
    this.reflectEnemyProjectiles();
  }

  protected onHit(_enemy: Ball): void {
    void _enemy;
    this.ball.heal(0.2);
  }

  protected updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void {
    void mountAngle;
    this.bladeX = x;
    this.bladeY = y;

    const tipX = x + Math.cos(angle - Math.PI / 8) * 84;
    const tipY = y + Math.sin(angle - Math.PI / 8) * 84;
    const handleX = x - Math.cos(angle) * 32;
    const handleY = y - Math.sin(angle) * 32;
    const guardX = x - Math.cos(angle) * 12;
    const guardY = y - Math.sin(angle) * 12;
    const perp = angle + Math.PI / 2;

    this.slash.clear();
    this.slash.lineStyle(8, 0xfca5a5, 0.24);
    this.slash.beginPath();
    this.slash.moveTo(this.ball.body.x, this.ball.body.y);
    this.slash.lineTo(tipX, tipY);
    this.slash.strokePath();
    this.slash.fillStyle(0xfca5a5, 0.1);
    this.slash.fillCircle(tipX, tipY, 18);

    this.blade.clear();
    this.blade.lineStyle(5, 0xf8fafc, 1);
    this.blade.beginPath();
    this.blade.moveTo(handleX, handleY);
    this.blade.lineTo(tipX, tipY);
    this.blade.strokePath();
    this.blade.lineStyle(6, 0x451a03, 1);
    this.blade.beginPath();
    this.blade.moveTo(handleX, handleY);
    this.blade.lineTo(guardX, guardY);
    this.blade.strokePath();
    this.blade.lineStyle(4, 0xf59e0b, 1);
    this.blade.beginPath();
    this.blade.moveTo(
      guardX - Math.cos(perp) * 12,
      guardY - Math.sin(perp) * 12,
    );
    this.blade.lineTo(
      guardX + Math.cos(perp) * 12,
      guardY + Math.sin(perp) * 12,
    );
    this.blade.strokePath();
  }

  private reflectEnemyProjectiles(): void {
    const enemy = this.getActiveEnemy();
    if (!enemy) {
      return;
    }

    const reflectionRadius = BALL_COLLISION_RADIUS * 0.9 + 16;
    for (const weapon of enemy.weapons) {
      if (weapon instanceof RangedWeapon) {
        weapon.reflectProjectilesAround(
          this.bladeX,
          this.bladeY,
          reflectionRadius,
          this.ball,
        );
      }
    }
  }
}
