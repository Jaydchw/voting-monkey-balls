import type * as Phaser from "phaser";
import type { Ball } from "../ball";
import { RangedWeapon, type ProjectileState } from "./ranged-weapon";
import type { GameSfxId } from "@/lib/game-sfx";
import { MusicNote } from "@phosphor-icons/react";

const EIGHTH_NOTE_REACH = 48;

export class EighthNoteWeapon extends RangedWeapon {
  readonly name = "Eighth Note";
  readonly quality = 2;
  readonly icon = MusicNote;
  readonly description =
    "A flying note that hurls fast sonic pulses straight at the enemy.";
  readonly attackSpeedMs = 448;
  readonly sound = ["music1", "music2", "music3", "music4"] as const;

  protected readonly orbitRadius = EIGHTH_NOTE_REACH;
  protected readonly projectileStartDistance = 24;
  protected readonly projectileSpeed = 760;
  protected readonly projectileRadius = 10;
  protected readonly projectileDamage = 1.9;
  protected readonly projectilesPerShot = 1;
  protected readonly projectileSpreadAngle = 0;
  protected readonly projectileColor = 0x60a5fa;
  protected readonly projectileTrailWidth = 6;
  protected readonly projectileTrailColor = 0x60a5fa;
  protected readonly projectileTrailAlpha = 0.24;
  protected readonly projectileTrailParticleRadius = 5;
  protected readonly projectileTrailParticleAlpha = 0.18;
  protected readonly projectileGlowRadius = 12;
  protected readonly projectileGlowColor = 0x93c5fd;
  protected readonly projectileGlowAlpha = 0.18;
  protected readonly projectileLightRadius = 20;
  protected readonly projectileLightColor = 0x1e3a8a;
  protected readonly projectileLightAlpha = 0.14;
  protected readonly projectileHitEffect = "spark" as const;

  protected onBeforeFire(shotCount: number): void {
    void shotCount;
  }

  protected getProjectileSound(
    _index: number,
    _shotCount: number,
  ): GameSfxId | null {
    void _index;
    void _shotCount;
    const notes: GameSfxId[] = ["music1", "music2", "music3", "music4"];
    return notes[Math.floor(Math.random() * notes.length)];
  }

  private note!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Graphics;

  protected onEquip(): void {
    this.note = this.scene.add.graphics();
    this.note.setDepth(2);
    this.glow = this.scene.add.graphics();
    this.glow.setDepth(1);
  }

  protected onUnequip(): void {
    this.glow.destroy();
    this.note.destroy();
  }

  protected createProjectileVisual(
    x: number,
    y: number,
    angle: number,
  ): { sprite: Phaser.GameObjects.GameObject; radius: number } {
    const rotation = angle + Math.PI / 2;
    const sprite = this.scene.add.text(x, y, "♪", {
      fontFamily: "Georgia",
      fontSize: "24px",
      color: "#60a5fa",
      fontStyle: "bold",
      stroke: "#111111",
      strokeThickness: 2,
    });
    sprite.setOrigin(0.5);
    sprite.setDepth(3);
    sprite.setRotation(rotation);
    return { sprite, radius: this.projectileRadius };
  }

  protected onProjectileHit(enemy: Ball, _projectile: ProjectileState): void {
    void _projectile;
    enemy.applySlow(0.78, 820);
  }

  protected onProjectileImpact(
    x: number,
    y: number,
    projectile: ProjectileState,
    reason: "enemy" | "wall" | "timeout",
  ): void {
    void reason;
    this.createImpactEffect(x, y, 20, projectile.impactColor || 0x60a5fa, 130);
    const glyphs = ["♪", "♫", "♬"];
    for (let i = 0; i < 3; i += 1) {
      const text = this.scene.add.text(x, y, glyphs[i % glyphs.length], {
        fontFamily: "Georgia",
        fontSize: "16px",
        color: "#93c5fd",
        stroke: "#111111",
        strokeThickness: 1,
      });
      text.setOrigin(0.5);
      text.setDepth(5);
      const angle = (i / 3) * Math.PI * 2;
      this.scene.tweens.add({
        targets: text,
        x: x + Math.cos(angle) * 24,
        y: y + Math.sin(angle) * 24,
        alpha: 0,
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => text.destroy(),
      });
    }
  }

  protected updateVisual(
    x: number,
    y: number,
    aimAngle: number,
    mountAngle: number,
  ): void {
    const stemBaseX = x - Math.cos(aimAngle) * 6;
    const stemBaseY = y - Math.sin(aimAngle) * 6;
    const stemTipX = stemBaseX + Math.cos(aimAngle - Math.PI / 2) * 36;
    const stemTipY = stemBaseY + Math.sin(aimAngle - Math.PI / 2) * 36;
    const headX = x + Math.cos(aimAngle + 0.3) * 10;
    const headY = y + Math.sin(aimAngle + 0.3) * 10;

    this.glow.clear();
    this.glow.fillStyle(0x93c5fd, 0.18);
    this.glow.fillCircle(x, y, 28);
    this.glow.fillCircle(headX, headY, 18);

    this.note.clear();
    this.note.fillStyle(0x0f172a, 1);
    this.note.fillCircle(headX, headY, 12);
    this.note.lineStyle(5, 0x60a5fa, 1);
    this.note.beginPath();
    this.note.moveTo(stemBaseX, stemBaseY);
    this.note.lineTo(stemTipX, stemTipY);
    this.note.strokePath();
    this.note.lineStyle(4, 0x93c5fd, 1);
    this.note.beginPath();
    this.note.moveTo(stemTipX, stemTipY);
    this.note.lineTo(
      stemTipX + Math.cos(aimAngle) * 18,
      stemTipY + Math.sin(aimAngle) * 10,
    );
    this.note.strokePath();
    void mountAngle;
  }
}
