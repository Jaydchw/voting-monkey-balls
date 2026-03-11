import type * as Phaser from "phaser";
import { ArenaModifier } from "../arena-modifier";

const GUST_MIN_INTERVAL = 600;
const GUST_MAX_INTERVAL = 2200;
const GUST_MIN_STRENGTH = 0.014;
const GUST_MAX_STRENGTH = 0.032;
const GUST_MIN_DURATION = 250;
const GUST_MAX_DURATION = 900;
const AMBIENT_COLOR = 0x3f6f95;
const CHEVRON_COLOR = 0x2f5f86;
const PARTICLE_COLOR = 0x234f74;

export class TurbulenceModifier extends ArenaModifier {
  readonly name = "Turbulence";
  readonly quality = 2;
  readonly icon = "wind";
  readonly description =
    "Random wind gusts periodically push all balls in a new direction.";

  private graphics!: ReturnType<Phaser.Scene["add"]["graphics"]>;
  private gustTimer = 0;
  private gustAngle = 0;
  private gustStrength = 0;
  private gustDuration = 0;
  private gustElapsed = 0;
  private globalT = 0;
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    alpha: number;
  }> = [];
  private particleTimer = 0;

  protected onApply(): void {
    this.gustTimer = 300;
    this.gustElapsed = this.gustDuration + 1; // skip first gust immediately
    this.particles = [];
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(-1);
  }

  protected onRemove(): void {
    this.graphics.destroy();
  }

  update(delta: number): void {
    this.globalT += delta / 1000;

    // --- gust scheduling ---
    this.gustTimer -= delta;
    if (this.gustTimer <= 0) {
      this.gustTimer =
        GUST_MIN_INTERVAL +
        Math.random() * (GUST_MAX_INTERVAL - GUST_MIN_INTERVAL);
      this.gustAngle = Math.random() * Math.PI * 2;
      this.gustStrength =
        GUST_MIN_STRENGTH +
        Math.random() * (GUST_MAX_STRENGTH - GUST_MIN_STRENGTH);
      this.gustDuration =
        GUST_MIN_DURATION +
        Math.random() * (GUST_MAX_DURATION - GUST_MIN_DURATION);
      this.gustElapsed = 0;
    }

    const gustActive = this.gustElapsed < this.gustDuration;

    // --- apply gust force while active ---
    if (gustActive) {
      this.gustElapsed += delta;
      const fx = Math.cos(this.gustAngle) * this.gustStrength * delta;
      const fy = Math.sin(this.gustAngle) * this.gustStrength * delta;
      for (const ball of this.balls) {
        const vel = ball.body.body.velocity;
        ball.body.setVelocity(vel.x + fx, vel.y + fy);
      }
    }

    this.graphics.clear();

    // --- Ambient wavy lines (always visible) ---
    const ambientAlpha = 0.14 + 0.05 * Math.sin(this.globalT * 1.5);
    this.graphics.lineStyle(2, AMBIENT_COLOR, ambientAlpha);
    const rows = 7;
    for (let row = 0; row < rows; row++) {
      const baseY = (this.arenaHeight / rows) * (row + 0.5);
      const phase = row * 1.3;
      this.graphics.beginPath();
      let first = true;
      for (let x = 0; x <= this.arenaWidth; x += 8) {
        const y = baseY + 5 * Math.sin(x / 55 + this.globalT * 1.8 + phase);
        if (first) {
          this.graphics.moveTo(x, y);
          first = false;
        } else {
          this.graphics.lineTo(x, y);
        }
      }
      this.graphics.strokePath();
    }

    // --- Gust direction chevrons (during active gust) ---
    if (gustActive) {
      const progress = this.gustElapsed / this.gustDuration;
      const chevAlpha = 0.35 * (1 - progress * 0.55);
      const cx = this.arenaWidth / 2;
      const cy = this.arenaHeight / 2;
      const cos = Math.cos(this.gustAngle);
      const sin = Math.sin(this.gustAngle);
      const perp = this.gustAngle + Math.PI / 2;
      const pc = Math.cos(perp);
      const ps = Math.sin(perp);

      for (let i = -1; i <= 1; i++) {
        const ox = cx + cos * i * 70;
        const oy = cy + sin * i * 70;
        // Chevron: two lines meeting at a tip
        const tip = 20;
        const arm = 14;
        this.graphics.lineStyle(4, CHEVRON_COLOR, chevAlpha);
        this.graphics.beginPath();
        this.graphics.moveTo(
          ox - cos * tip + pc * arm,
          oy - sin * tip + ps * arm,
        );
        this.graphics.lineTo(ox + cos * tip, oy + sin * tip);
        this.graphics.lineTo(
          ox - cos * tip - pc * arm,
          oy - sin * tip - ps * arm,
        );
        this.graphics.strokePath();
      }
    }

    // --- wind streak particles ---
    this.particleTimer -= delta;
    if (this.particleTimer <= 0 && gustActive) {
      this.particleTimer = 60 + Math.random() * 80;
      const side = Math.floor(Math.random() * 4);
      const px =
        side === 0
          ? 0
          : side === 1
            ? this.arenaWidth
            : Math.random() * this.arenaWidth;
      const py =
        side === 2
          ? 0
          : side === 3
            ? this.arenaHeight
            : Math.random() * this.arenaHeight;
      const life = 500 + Math.random() * 400;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(this.gustAngle) * (2 + Math.random() * 3),
        vy: Math.sin(this.gustAngle) * (2 + Math.random() * 3),
        life,
        maxLife: life,
        alpha: 0.32 + Math.random() * 0.24,
      });
    }

    // --- update + draw particles ---
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= delta;
      const progress = p.life / p.maxLife;
      const alpha = p.alpha * progress;
      this.graphics.lineStyle(2.75, PARTICLE_COLOR, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(p.x, p.y);
      this.graphics.lineTo(p.x - p.vx * 8, p.y - p.vy * 8);
      this.graphics.strokePath();
    }
  }
}
