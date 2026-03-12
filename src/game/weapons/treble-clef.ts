import type * as Phaser from "phaser";
import type { Ball } from "../ball";
import { RangedWeapon, type ProjectileState } from "./ranged-weapon";
import type { GameSfxId } from "@/lib/game-sfx";
import { playGameSfx } from "@/lib/game-sfx";
import { MusicNotes } from "@phosphor-icons/react";

const TREBLE_CLEF_REACH = 52;

export class TrebleClefWeapon extends RangedWeapon {
  readonly name = "Treble Clef";
  readonly quality = 3;
  readonly icon = MusicNotes;
  readonly description =
    "A dramatic clef that locks onto the enemy and launches booming crescendos.";
  readonly attackSpeedMs = 896;

  protected readonly orbitRadius = TREBLE_CLEF_REACH;
  protected readonly projectileStartDistance = 28;
  protected readonly projectileSpeed = 700;
  protected readonly projectileRadius = 14;
  protected readonly projectileDamage = 5.5;
  protected readonly projectilesPerShot = 1;
  protected readonly projectileSpreadAngle = 0;
  protected readonly projectileColor = 0xa855f7;
  protected readonly projectileTrailWidth = 7;
  protected readonly projectileTrailColor = 0xc084fc;
  protected readonly projectileTrailAlpha = 0.26;
  protected readonly projectileTrailParticleRadius = 6;
  protected readonly projectileTrailParticleAlpha = 0.18;
  protected readonly projectileGlowRadius = 18;
  protected readonly projectileGlowColor = 0xe9d5ff;
  protected readonly projectileGlowAlpha = 0.18;
  protected readonly projectileLightRadius = 26;
  protected readonly projectileLightColor = 0x6b21a8;
  protected readonly projectileLightAlpha = 0.14;
  protected readonly projectileHitEffect = "spark" as const;

  private clef!: Phaser.GameObjects.Graphics;
  private aura!: Phaser.GameObjects.Graphics;
  private cadenceStep = 0;
  private soundStep = 0;
  private readonly cadenceSounds: GameSfxId[] = [
    "music1",
    "music2",
    "music3",
    "music4",
  ];

  protected onEquip(): void {
    this.clef = this.scene.add.graphics();
    this.clef.setDepth(2);
    this.aura = this.scene.add.graphics();
    this.aura.setDepth(1);
  }

  protected onUnequip(): void {
    this.aura.destroy();
    this.clef.destroy();
  }

  protected getProjectilesPerShot(): number {
    return this.cadenceStep === 3 ? 5 : 1;
  }

  protected getProjectileSpreadAngle(): number {
    return this.cadenceStep === 3 ? 0.16 : 0;
  }

  protected onBeforeFire(shotCount: number): void {
    void shotCount;
    const sound = this.cadenceSounds[this.soundStep];
    playGameSfx(this.scene, sound);
    this.soundStep = (this.soundStep + 1) % this.cadenceSounds.length;
  }

  protected onAfterFire(_shotCount: number): void {
    void _shotCount;
    this.cadenceStep = (this.cadenceStep + 1) % 4;
  }

  protected getProjectileSound(
    index: number,
    shotCount: number,
  ): GameSfxId | null {
    void index;
    void shotCount;
    return null;
  }

  protected createProjectileVisual(
    x: number,
    y: number,
    angle: number,
  ): { sprite: Phaser.GameObjects.GameObject; radius: number } {
    const sprite = this.scene.add.text(x, y, "♫", {
      fontFamily: "Georgia",
      fontSize: "28px",
      color: "#c084fc",
      fontStyle: "bold",
      stroke: "#111111",
      strokeThickness: 2,
    });
    sprite.setOrigin(0.5);
    sprite.setRotation(angle + Math.PI / 2);
    sprite.setDepth(3);
    return { sprite, radius: this.projectileRadius };
  }

  protected onProjectileHit(enemy: Ball, projectile: ProjectileState): void {
    enemy.applyStun(280);
    enemy.applySlow(0.86, 520);
    this.createImpactEffect(projectile.x, projectile.y, 26, 0xc084fc, 160);
  }

  protected onProjectileImpact(
    x: number,
    y: number,
    _projectile: ProjectileState,
    reason: "enemy" | "wall" | "timeout",
  ): void {
    void _projectile;
    const alpha = reason === "wall" ? 0.2 : 0.35;
    const ring = this.scene.add.circle(x, y, 10, 0xc084fc, alpha);
    ring.setDepth(5);
    ring.setStrokeStyle(3, 0xe9d5ff, 0.75);
    this.scene.tweens.add({
      targets: ring,
      radius: 34,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    const upperX = x + Math.cos(aimAngle - Math.PI / 2) * 24;
    const upperY = y + Math.sin(aimAngle - Math.PI / 2) * 24;
    const lowerX = x + Math.cos(aimAngle + Math.PI / 2) * 18;
    const lowerY = y + Math.sin(aimAngle + Math.PI / 2) * 18;

    this.aura.clear();
    this.aura.fillStyle(0xe9d5ff, 0.16);
    this.aura.fillCircle(x, y, 30);
    this.aura.fillCircle(upperX, upperY, 16);

    this.clef.clear();
    this.clef.lineStyle(5, 0xa855f7, 1);
    this.clef.beginPath();
    this.clef.moveTo(upperX, upperY);
    this.clef.lineTo(x, y);
    this.clef.lineTo(lowerX, lowerY);
    this.clef.strokePath();
    this.clef.lineStyle(4, 0xe9d5ff, 0.95);
    this.clef.strokeCircle(upperX, upperY, 12);
    this.clef.strokeCircle(x, y + Math.sin(aimAngle) * 6, 16);
    this.clef.fillStyle(0xc084fc, 0.95);
    this.clef.fillCircle(lowerX, lowerY, 8);
    void mountAngle;
  }
}
