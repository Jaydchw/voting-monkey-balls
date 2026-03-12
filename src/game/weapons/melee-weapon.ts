import * as Phaser from "phaser";
import { BALL_COLLISION_RADIUS } from "../ball";
import type { HitEffectType } from "../ball";
import { Weapon } from "../weapon";

export abstract class MeleeWeapon extends Weapon {
  readonly type = "melee" as const;

  private static readonly activeWeapons = new Set<MeleeWeapon>();
  private static readonly weaponIds = new WeakMap<MeleeWeapon, number>();
  private static readonly clashTimes = new Map<string, number>();
  private static nextWeaponId = 1;

  protected angle = 0;
  protected swingDirection = 1;
  private hitCooldownMs = 0;
  private parryCooldownMs = 0;
  private weaponX = Number.NaN;
  private weaponY = Number.NaN;

  protected abstract readonly orbitRadius: number;
  protected abstract readonly swingSpeed: number;
  protected abstract readonly contactRadius: number;
  protected abstract readonly contactDamage: number;
  protected readonly contactHitEffect: HitEffectType = "impact";

  protected onApply(): void {
    this.angle = Math.random() * Math.PI * 2;
    this.swingDirection = 1;
    this.hitCooldownMs = 0;
    this.parryCooldownMs = 0;
    if (!MeleeWeapon.weaponIds.has(this)) {
      MeleeWeapon.weaponIds.set(this, MeleeWeapon.nextWeaponId);
      MeleeWeapon.nextWeaponId += 1;
    }
    MeleeWeapon.activeWeapons.add(this);
    this.onEquip();
  }

  protected onRemove(): void {
    MeleeWeapon.activeWeapons.delete(this);
    this.onUnequip();
  }

  update(delta: number): void {
    this.angle = Phaser.Math.Angle.Wrap(
      this.angle + this.swingSpeed * this.swingDirection * (delta / 1000),
    );
    this.hitCooldownMs = Math.max(0, this.hitCooldownMs - delta);
    this.parryCooldownMs = Math.max(0, this.parryCooldownMs - delta);

    const x = this.ball.body.x + Math.cos(this.angle) * this.orbitRadius;
    const y = this.ball.body.y + Math.sin(this.angle) * this.orbitRadius;
    this.weaponX = x;
    this.weaponY = y;

    this.updateVisual(x, y, this.angle, this.angle);

    if (this.tryClashWithEnemyMelee()) {
      return;
    }

    const enemy = this.getActiveEnemy();
    const attackCooldownMs = this.ball.modifyAttackSpeedMs(
      this.attackSpeedMs,
      this.type,
    );
    if (!enemy || this.hitCooldownMs > 0 || this.parryCooldownMs > 0) {
      return;
    }

    const enemyRadius = BALL_COLLISION_RADIUS * enemy.physicsScale;
    const distance = Math.hypot(x - enemy.body.x, y - enemy.body.y);
    if (distance <= this.contactRadius + enemyRadius) {
      this.ball.dealAttackDamage(
        enemy,
        this.contactDamage,
        "melee",
        this.contactHitEffect,
      );
      this.playWeaponSound("hit", "slice");
      this.onHit(enemy);
      this.hitCooldownMs = attackCooldownMs;
    }
  }

  private tryClashWithEnemyMelee(): boolean {
    const enemy = this.getActiveEnemy();
    if (!enemy) {
      return false;
    }

    for (const other of MeleeWeapon.activeWeapons) {
      if (other === this) {
        continue;
      }
      if (other.ball !== enemy) {
        continue;
      }
      if (!Number.isFinite(other.weaponX) || !Number.isFinite(other.weaponY)) {
        continue;
      }

      const clashDistance = this.contactRadius + other.contactRadius;
      const distance = Math.hypot(
        this.weaponX - other.weaponX,
        this.weaponY - other.weaponY,
      );
      if (distance > clashDistance) {
        continue;
      }

      const thisId = MeleeWeapon.weaponIds.get(this) ?? 0;
      const otherId = MeleeWeapon.weaponIds.get(other) ?? 0;
      const pairKey =
        thisId < otherId ? `${thisId}-${otherId}` : `${otherId}-${thisId}`;
      const now = this.scene.time.now;
      const lastClash = MeleeWeapon.clashTimes.get(pairKey) ?? -1000;
      if (now - lastClash < 90) {
        continue;
      }

      MeleeWeapon.clashTimes.set(pairKey, now);
      this.swingDirection *= -1;
      other.swingDirection *= -1;
      this.parryCooldownMs = Math.max(this.parryCooldownMs, 160);
      other.parryCooldownMs = Math.max(other.parryCooldownMs, 160);
      this.hitCooldownMs = Math.max(this.hitCooldownMs, 180);
      other.hitCooldownMs = Math.max(other.hitCooldownMs, 180);
      this.playWeaponSound("wall", "clash");
      other.playWeaponSound("wall", "clash");
      return true;
    }

    return false;
  }

  protected abstract onEquip(): void;
  protected abstract onUnequip(): void;
  protected onHit(enemy: import("../ball").Ball): void {
    void enemy;
  }
  protected abstract updateVisual(
    x: number,
    y: number,
    angle: number,
    mountAngle: number,
  ): void;
}
