import * as Phaser from "phaser";
import type { BallModifier } from "./ball-modifier";
import type {
  DamageSource,
  OutgoingDamageProfile,
  WeaponType,
} from "./ball-modifier";
import type { Weapon } from "./weapon";
import { playGameSfx } from "@/lib/game-sfx";

type BallMatterBody = MatterJS.BodyType & {
  plugin?: {
    ballRef?: Ball;
  };
};

type BallGameObject = Phaser.GameObjects.Arc & {
  body: BallMatterBody;
  setBounce: (value: number) => BallGameObject;
  setFriction: (
    friction: number,
    frictionAir?: number,
    frictionStatic?: number,
  ) => BallGameObject;
  setVelocity: (x: number, y: number) => BallGameObject;
};

export const BALL_RENDER_RADIUS = 20;
export const BALL_OUTLINE_WIDTH = 6;
export const BALL_COLLISION_RADIUS =
  BALL_RENDER_RADIUS + BALL_OUTLINE_WIDTH / 2;
export const BALL_COLLISION_DIAMETER = BALL_COLLISION_RADIUS * 2;
export const WALL_COLLISION_CATEGORY = 0x0001;
export const RED_BALL_CATEGORY = 0x0002;
export const BLUE_BALL_CATEGORY = 0x0004;
export const ROGUE_BALL_CATEGORY = 0x0008;
const MIN_AXIS_ANGLE = 0.3;

type GhostCollisionMode = "normal" | "linked-health" | "proxy-contact";

type BallOptions = {
  startsMoving?: boolean;
  isStatic?: boolean;
  alpha?: number;
  collisionMode?: GhostCollisionMode;
  receivesModifierPropagation?: boolean;
  collisionCategory?: number;
  collisionMask?: number;
  faceTextureKey?: string;
  faceScale?: number;
};

type ActiveSlow = {
  multiplier: number;
  remainingMs: number;
};

type ActiveDamageOverTime = {
  damagePerTick: number;
  tickMs: number;
  remainingMs: number;
  elapsedMs: number;
};

export type HitEffectType =
  | "impact"
  | "slash"
  | "spark"
  | "toxic"
  | "explosive";

type DamageOptions = {
  effect?: HitEffectType;
  intensity?: number;
  source?: DamageSource;
};

type HitEffectConfig = {
  flashColor: number;
  particleColor: number;
  particleCount: number;
  particleSpeed: number;
  particleLifeMs: number;
};

const HIT_EFFECTS: Record<HitEffectType, HitEffectConfig> = {
  impact: {
    flashColor: 0xf8fafc,
    particleColor: 0xe2e8f0,
    particleCount: 8,
    particleSpeed: 88,
    particleLifeMs: 210,
  },
  slash: {
    flashColor: 0xfca5a5,
    particleColor: 0xfb7185,
    particleCount: 6,
    particleSpeed: 84,
    particleLifeMs: 180,
  },
  spark: {
    flashColor: 0x67e8f9,
    particleColor: 0x22d3ee,
    particleCount: 7,
    particleSpeed: 92,
    particleLifeMs: 170,
  },
  toxic: {
    flashColor: 0x84cc16,
    particleColor: 0x65a30d,
    particleCount: 6,
    particleSpeed: 68,
    particleLifeMs: 220,
  },
  explosive: {
    flashColor: 0xfb923c,
    particleColor: 0xf97316,
    particleCount: 14,
    particleSpeed: 164,
    particleLifeMs: 240,
  },
};

export class Ball {
  body: BallGameObject;
  health: number;
  maxHealth: number;
  id: "red" | "blue" | "rogue";
  enemy: Ball | null = null;
  hostileBalls: Ball[] | null = null;
  /** Points to the master ball (used by ghost balls to delegate damage). */
  linkedBall: Ball | null = null;
  /** All ghost balls spawned from this ball by Mitosis. */
  ghostBalls: Ball[] = [];
  /** True when this is a Mitosis ghost — delegates takeDamage to master. */
  isGhostBall: boolean = false;
  collisionMode: GhostCollisionMode = "normal";
  receivesModifierPropagation = true;
  /** Absorbs damage before HP. Set/cleared by ArmoredModifier. */
  shieldHP: number = 0;
  modifiers: BallModifier[] = [];
  weapons: Weapon[] = [];
  scene: Phaser.Scene;
  physicsScale = 1.0;
  /** Multiplied into base speed by arena-wide effects (e.g. SpeedBoost). */
  arenaSpeedMultiplier = 1.0;
  /** Multiplied by arena-wide simulation effects (e.g. Double Time). */
  simulationSpeedMultiplier = 1.0;
  /** Gravity influence on ball trajectory while preserving speed magnitude. */
  gravityY = 0;
  /** Gravity acceleration applied to projectiles fired by this ball. */
  projectileGravityY = 0;
  /** Number of times each newly added modifier should be applied. */
  modifierApplicationMultiplier = 1;
  /** Number of times each newly added weapon should be applied. */
  weaponApplicationMultiplier = 1;
  /** When true, maintainSpeed skips wall-proximity reflection (used by Portal). */
  ignoreArenaWalls = false;
  /** When true, projectiles fired by this ball wrap through arena edges. */
  projectilesEndless = false;
  private stunRemainingMs = 0;
  private activeSlows: ActiveSlow[] = [];
  private activeDamageOverTime: ActiveDamageOverTime[] = [];
  readonly speed: number;
  readonly arenaWidth: number;
  readonly arenaHeight: number;
  readonly wallThickness: number;
  readonly isStaticBody: boolean;
  private readonly baseColor: number;
  private faceSprite: Phaser.GameObjects.Image | null = null;
  private readonly onHealthChange: (health: number) => void;
  private readonly onDied: (() => void) | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number,
    speed: number,
    mass: number,
    health: number,
    id: "red" | "blue" | "rogue",
    arenaWidth: number,
    arenaHeight: number,
    wallThickness: number,
    onHealthChange: (health: number) => void,
    onDied: (() => void) | null = null,
    options: BallOptions = {},
  ) {
    this.id = id;
    this.speed = speed;
    this.health = health;
    this.maxHealth = health;
    this.baseColor = color;
    this.scene = scene;
    this.modifiers = [];
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.wallThickness = wallThickness;
    this.isStaticBody = options.isStatic ?? false;
    this.collisionMode = options.collisionMode ?? "normal";
    this.receivesModifierPropagation =
      options.receivesModifierPropagation ?? true;
    this.onHealthChange = onHealthChange;
    this.onDied = onDied;
    onHealthChange(health);
    const circle = scene.add.circle(x, y, BALL_RENDER_RADIUS, color);
    circle.setStrokeStyle(BALL_OUTLINE_WIDTH, 0x000000, 1);

    const collisionCategory =
      options.collisionCategory ??
      (id === "red"
        ? RED_BALL_CATEGORY
        : id === "blue"
          ? BLUE_BALL_CATEGORY
          : ROGUE_BALL_CATEGORY);
    const collisionMask =
      options.collisionMask ??
      (id === "red"
        ? WALL_COLLISION_CATEGORY | BLUE_BALL_CATEGORY | ROGUE_BALL_CATEGORY
        : id === "blue"
          ? WALL_COLLISION_CATEGORY | RED_BALL_CATEGORY | ROGUE_BALL_CATEGORY
          : WALL_COLLISION_CATEGORY | RED_BALL_CATEGORY | BLUE_BALL_CATEGORY);

    this.body = scene.matter.add.gameObject(circle, {
      shape: "circle",
      circleRadius: BALL_COLLISION_RADIUS,
      isStatic: this.isStaticBody,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      restitution: 1,
      mass: mass,
      ignoreGravity: true,
      inertia: Infinity,
      collisionFilter: {
        category: collisionCategory,
        mask: collisionMask,
      },
    }) as BallGameObject;

    this.body.setBounce(1);
    this.body.setFriction(0, 0, 0);
    this.body.body.label = "ball";
    this.body.body.plugin = {
      ...this.body.body.plugin,
      ballRef: this,
    };

    if (options.alpha !== undefined) {
      this.body.setAlpha(options.alpha);
    }

    if (options.faceTextureKey) {
      const scale = options.faceScale ?? 1;
      const diameter = BALL_RENDER_RADIUS * 2 * scale;
      this.faceSprite = scene.add.image(x, y, options.faceTextureKey);
      this.faceSprite.setDisplaySize(diameter, diameter);
      this.faceSprite.setDepth(this.body.depth + 1);
      this.body.setFillStyle(0xffffff, 0.16);
    }

    if (options.startsMoving ?? true) {
      const angle = Math.random() * Math.PI * 2;
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;

      this.body.setVelocity(velocityX, velocityY);
    }

    this.updateHealthTint();
    this.syncFaceSprite();
  }

  setHostileBalls(hostileBalls: Ball[] | null): void {
    this.hostileBalls = hostileBalls;
  }

  getHostileTargets(): Ball[] {
    const bases = this.hostileBalls ?? (this.enemy ? [this.enemy] : []);
    const unique = new Set<Ball>();
    for (const base of bases) {
      if (base === this || base.health <= 0) continue;
      unique.add(base);
      for (const ghost of base.ghostBalls) {
        if (ghost !== this && ghost.health > 0) {
          unique.add(ghost);
        }
      }
    }
    return Array.from(unique);
  }

  takeDamage(rawAmount: number, options: DamageOptions = {}) {
    if (this.collisionMode === "linked-health" && this.linkedBall) {
      this.linkedBall.takeDamage(rawAmount, options);
      return;
    }
    if (this.collisionMode === "proxy-contact") {
      return;
    }
    const source = options.source ?? "unknown";
    if (
      this.modifiers.some((modifier) =>
        modifier.preventIncomingDamage(rawAmount, source),
      )
    ) {
      return;
    }
    const amount = this.modifiers.reduce(
      (a, m) => m.modifyDamageTaken(a),
      rawAmount,
    );
    if (amount <= 0) {
      return;
    }

    playGameSfx(this.scene, "hit", { volume: 0.45 });

    const wasAlive = this.health > 0;
    this.health = Math.max(0, this.health - amount);
    this.updateHealthTint();
    this.emitHitEffect(options.effect ?? "impact", amount, options.intensity);
    this.onHealthChange(this.health);
    if (wasAlive && this.health <= 0) this.onDied?.();
    // Keep all ghost balls' health in sync
    for (const ghost of this.ghostBalls)
      ghost.syncHealthFromLinked(this.health);
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateHealthTint();
    this.onHealthChange(this.health);
    for (const ghost of this.ghostBalls)
      ghost.syncHealthFromLinked(this.health);
  }

  applyStun(durationMs: number): void {
    if (this.collisionMode === "linked-health" && this.linkedBall) {
      this.linkedBall.applyStun(durationMs);
      return;
    }
    this.stunRemainingMs = Math.max(this.stunRemainingMs, durationMs);
    this.updateHealthTint();
  }

  applySlow(multiplier: number, durationMs: number): void {
    if (this.collisionMode === "linked-health" && this.linkedBall) {
      this.linkedBall.applySlow(multiplier, durationMs);
      return;
    }
    this.activeSlows.push({
      multiplier: Phaser.Math.Clamp(multiplier, 0.05, 1),
      remainingMs: durationMs,
    });
    this.updateHealthTint();
  }

  applyDamageOverTime(
    damagePerTick: number,
    tickMs: number,
    durationMs: number,
  ): void {
    if (this.collisionMode === "linked-health" && this.linkedBall) {
      this.linkedBall.applyDamageOverTime(damagePerTick, tickMs, durationMs);
      return;
    }
    this.activeDamageOverTime.push({
      damagePerTick,
      tickMs,
      remainingMs: durationMs,
      elapsedMs: 0,
    });
    this.updateHealthTint();
  }

  updateStatusEffects(delta: number): void {
    this.stunRemainingMs = Math.max(0, this.stunRemainingMs - delta);

    this.activeSlows = this.activeSlows
      .map((slow) => ({
        ...slow,
        remainingMs: slow.remainingMs - delta,
      }))
      .filter((slow) => slow.remainingMs > 0);

    for (const effect of this.activeDamageOverTime) {
      effect.remainingMs -= delta;
      effect.elapsedMs += delta;

      while (
        effect.elapsedMs >= effect.tickMs &&
        effect.remainingMs > -effect.tickMs
      ) {
        effect.elapsedMs -= effect.tickMs;
        this.takeDamage(effect.damagePerTick, { source: "dot" });
      }
    }

    this.activeDamageOverTime = this.activeDamageOverTime.filter(
      (effect) => effect.remainingMs > 0,
    );

    this.updateHealthTint();

    if (this.isStunned()) {
      this.body.setVelocity(0, 0);
    }
  }

  isStunned(): boolean {
    return this.stunRemainingMs > 0;
  }

  /** Called by master to keep ghost health in sync — does not recurse. */
  private syncHealthFromLinked(newHealth: number): void {
    this.health = newHealth;
    this.updateHealthTint();
    // Ghost has a no-op onHealthChange; master already updated the UI
  }

  private updateHealthTint(): void {
    if (this.faceSprite) {
      const healthRatio = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
      this.faceSprite.setAlpha(0.35 + healthRatio * 0.65);
      return;
    }

    const healthRatio = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
    const darkColor = 0x202020;
    const baseTint = this.lerpColor(darkColor, this.baseColor, healthRatio);

    let tint = baseTint;
    if (this.activeDamageOverTime.length > 0) {
      tint = this.lerpColor(baseTint, 0x65a30d, 0.45);
    }
    if (this.isStunned()) {
      tint = this.lerpColor(tint, 0x0891b2, 0.52);
    } else if (this.activeSlows.length > 0) {
      tint = this.lerpColor(tint, 0x1d4ed8, 0.32);
    }

    this.body.setFillStyle(tint, 1);
  }

  private emitHitEffect(
    effectType: HitEffectType,
    amount: number,
    intensity = 1,
  ): void {
    const effect = HIT_EFFECTS[effectType];
    const hitScale = Phaser.Math.Clamp((amount / 10) * intensity, 0.6, 2.6);
    const x = this.body.x;
    const y = this.body.y;

    const flash = this.scene.add.circle(
      x,
      y,
      BALL_RENDER_RADIUS * (1.08 + hitScale * 0.28),
      effect.flashColor,
      0.3,
    );
    flash.setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.52,
      duration: 160,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const particleCount = Math.ceil(effect.particleCount * intensity);
    const particleBaseRadius = 2 + hitScale * 1.8;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2;
      const speed = effect.particleSpeed * Phaser.Math.FloatBetween(0.75, 1.2);
      const particle = this.scene.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(particleBaseRadius * 0.5, particleBaseRadius),
        effect.particleColor,
        0.95,
      );
      particle.setDepth(5);

      const driftX = Math.cos(angle) * speed * hitScale;
      const driftY = Math.sin(angle) * speed * hitScale;
      this.scene.tweens.add({
        targets: particle,
        x: x + driftX,
        y: y + driftY,
        alpha: 0,
        scale: 0.4,
        duration: Math.round(effect.particleLifeMs * (0.9 + hitScale * 0.2)),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private lerpColor(from: number, to: number, t: number): number {
    const r1 = (from >> 16) & 0xff;
    const g1 = (from >> 8) & 0xff;
    const b1 = from & 0xff;
    const r2 = (to >> 16) & 0xff;
    const g2 = (to >> 8) & 0xff;
    const b2 = to & 0xff;

    const r = Math.round(Phaser.Math.Linear(r1, r2, t));
    const g = Math.round(Phaser.Math.Linear(g1, g2, t));
    const b = Math.round(Phaser.Math.Linear(b1, b2, t));
    return (r << 16) | (g << 8) | b;
  }

  addModifier(modifier: BallModifier): void {
    const applications = Math.max(
      1,
      Math.round(this.modifierApplicationMultiplier),
    );
    const ModCtor = Object.getPrototypeOf(modifier)
      .constructor as new () => BallModifier;

    for (let copy = 0; copy < applications; copy += 1) {
      const instance = copy === 0 ? modifier : new ModCtor();
      this.modifiers.push(instance);
      instance.apply(this, this.scene);
      // Propagate to ghost balls so they stay in sync; ghosts don't recurse further
      if (!this.isGhostBall && instance.propagateToGhosts) {
        for (const ghost of this.ghostBalls) {
          if (!ghost.receivesModifierPropagation) continue;
          const GhostModCtor = Object.getPrototypeOf(instance)
            .constructor as new () => BallModifier;
          ghost.addModifier(new GhostModCtor());
        }
      }
    }
  }

  addWeapon(weapon: Weapon): void {
    const applications = Math.max(
      1,
      Math.round(this.weaponApplicationMultiplier),
    );
    const WeaponCtor = Object.getPrototypeOf(weapon)
      .constructor as new () => Weapon;

    for (let copy = 0; copy < applications; copy += 1) {
      const instance = copy === 0 ? weapon : new WeaponCtor();
      this.weapons.push(instance);
      instance.apply(this, this.scene);
    }
  }

  setSize(absoluteFactor: number): void {
    const delta = absoluteFactor / this.physicsScale;
    if (Math.abs(delta - 1) < 0.0001) return;
    this.physicsScale = absoluteFactor;
    this.body.setScale(absoluteFactor);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Phaser as any).Physics.Matter.Matter.Body.scale(
      this.body.body,
      delta,
      delta,
    );
    if (this.faceSprite) {
      const diameter = BALL_RENDER_RADIUS * 2 * this.physicsScale;
      this.faceSprite.setDisplaySize(diameter, diameter);
    }
    this.syncFaceSprite();
  }

  removeModifier(modifier: BallModifier): void {
    const idx = this.modifiers.indexOf(modifier);
    if (idx !== -1) {
      this.modifiers.splice(idx, 1);
      modifier.remove();
    }
  }

  removeAllModifiers(): void {
    for (const mod of this.modifiers) mod.remove();
    this.modifiers = [];
  }

  removeAllWeapons(): void {
    for (const weapon of this.weapons) weapon.remove();
    this.weapons = [];
  }

  updateModifiers(delta: number): void {
    for (const mod of this.modifiers) mod.update(delta);
  }

  updateWeapons(delta: number): void {
    for (const weapon of this.weapons) weapon.update(delta);
  }

  effectiveSpeed(): number {
    const base = this.speed * this.arenaSpeedMultiplier;
    const slowedBase = base * this.getSlowMultiplier();
    return this.modifiers.reduce((s, m) => m.modifySpeed(s), slowedBase);
  }

  modifyAttackSpeedMs(baseMs: number, weaponType: WeaponType): number {
    const modified = this.modifiers.reduce(
      (current, modifier) => modifier.modifyAttackSpeedMs(current, weaponType),
      baseMs,
    );
    return Phaser.Math.Clamp(modified, 40, 10000);
  }

  buildOutgoingDamageProfile(
    baseDamage: number,
    source: Extract<DamageSource, "melee" | "projectile">,
  ): OutgoingDamageProfile {
    const initial: OutgoingDamageProfile = {
      instant: baseDamage,
      dotTotal: 0,
      dotDurationMs: 0,
      dotTickMs: 0,
    };

    const profiled = this.modifiers.reduce(
      (profile, modifier) => modifier.modifyOutgoingDamage(profile, source),
      initial,
    );

    const safeDotDuration = Math.max(0, profiled.dotDurationMs);
    const safeDotTick = Math.max(0, profiled.dotTickMs);
    return {
      instant: Math.max(0, profiled.instant),
      dotTotal: Math.max(0, profiled.dotTotal),
      dotDurationMs: safeDotDuration,
      dotTickMs: safeDotTick,
    };
  }

  dealAttackDamage(
    target: Ball,
    baseDamage: number,
    source: Extract<DamageSource, "melee" | "projectile">,
    effect?: HitEffectType,
  ): number {
    const profile = this.buildOutgoingDamageProfile(baseDamage, source);
    let totalApplied = 0;

    if (profile.instant > 0) {
      target.takeDamage(profile.instant, { effect, source });
      totalApplied += profile.instant;
    }

    if (
      profile.dotTotal > 0 &&
      profile.dotDurationMs > 0 &&
      profile.dotTickMs > 0
    ) {
      const ticks = Math.max(
        1,
        Math.round(profile.dotDurationMs / profile.dotTickMs),
      );
      const damagePerTick = profile.dotTotal / ticks;
      target.applyDamageOverTime(
        damagePerTick,
        profile.dotTickMs,
        profile.dotDurationMs,
      );
      totalApplied += profile.dotTotal;
    }

    if (totalApplied > 0) {
      for (const modifier of this.modifiers) {
        modifier.onAttackLanded(target, source, totalApplied);
      }
    }

    return totalApplied;
  }

  tryDeflectProjectile(): boolean {
    return this.modifiers.some((modifier) => modifier.tryDeflectProjectile());
  }

  nudgeDirection() {
    const velocity = this.body.body.velocity;
    const magnitude = Math.hypot(velocity.x, velocity.y);
    const baseAngle = Math.atan2(velocity.y, velocity.x);
    const jitter = Phaser.Math.FloatBetween(-0.3, 0.3);
    const nextAngle = this.keepAwayFromAxis(baseAngle + jitter);
    this.body.setVelocity(
      Math.cos(nextAngle) * magnitude,
      Math.sin(nextAngle) * magnitude,
    );
    this.syncFaceSprite();
  }

  private keepAwayFromAxis(angle: number) {
    const quarterTurn = Math.PI / 2;
    const nearestAxis = Math.round(angle / quarterTurn) * quarterTurn;
    const delta = Phaser.Math.Angle.Wrap(angle - nearestAxis);

    if (Math.abs(delta) >= MIN_AXIS_ANGLE) {
      return Phaser.Math.Angle.Wrap(angle);
    }

    const direction =
      delta === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(delta);
    const offset = Phaser.Math.FloatBetween(
      MIN_AXIS_ANGLE,
      MIN_AXIS_ANGLE + 0.08,
    );
    return Phaser.Math.Angle.Wrap(nearestAxis + direction * offset);
  }

  maintainSpeed(delta = 16.67) {
    if (this.isStaticBody) return;
    if (this.isStunned()) {
      this.body.setVelocity(0, 0);
      this.syncFaceSprite();
      return;
    }

    const velocity = this.body.body.velocity;
    const magnitude = Math.hypot(velocity.x, velocity.y);
    const targetSpeed = this.effectiveSpeed() * this.simulationSpeedMultiplier;

    if (magnitude < 0.001) {
      const angle = Math.random() * Math.PI * 2;
      this.body.setVelocity(
        Math.cos(angle) * targetSpeed,
        Math.sin(angle) * targetSpeed,
      );
      this.syncFaceSprite();
      return;
    }

    const angle = this.keepAwayFromAxis(Math.atan2(velocity.y, velocity.x));
    let vx = Math.cos(angle) * targetSpeed;
    let vy = Math.sin(angle) * targetSpeed;

    if (this.gravityY !== 0) {
      vy += this.gravityY * (delta / 1000);
    }

    // If near a wall and still moving toward it, reflect that component.
    // This prevents the ball from getting embedded and axis-locking.
    // Walls now sit at the canvas edges, so the margin is just the ball radius.
    const safeMargin = BALL_COLLISION_RADIUS * this.physicsScale + 2;
    if (!this.ignoreArenaWalls) {
      if (this.body.x <= safeMargin && vx < 0) vx = Math.abs(vx);
      if (this.body.x >= this.arenaWidth - safeMargin && vx > 0)
        vx = -Math.abs(vx);
      if (this.body.y <= safeMargin && vy < 0) vy = Math.abs(vy);
      if (this.body.y >= this.arenaHeight - safeMargin && vy > 0)
        vy = -Math.abs(vy);
    }

    const adjustedMag = Math.hypot(vx, vy);
    this.body.setVelocity(
      (vx / adjustedMag) * targetSpeed,
      (vy / adjustedMag) * targetSpeed,
    );
    this.syncFaceSprite();
  }

  destroy(): void {
    this.removeAllWeapons();
    this.removeAllModifiers();
    this.faceSprite?.destroy();
    this.faceSprite = null;
    this.body.destroy();
  }

  private syncFaceSprite(): void {
    if (!this.faceSprite) {
      return;
    }
    this.faceSprite.setPosition(this.body.x, this.body.y);
  }

  private getSlowMultiplier(): number {
    if (this.activeSlows.length === 0) {
      return 1;
    }

    return this.activeSlows.reduce(
      (lowest, slow) => Math.min(lowest, slow.multiplier),
      1,
    );
  }
}
