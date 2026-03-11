import * as Phaser from "phaser";
import type { BallModifier } from "./ball-modifier";

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
const MIN_AXIS_ANGLE = 0.3;

type GhostCollisionMode = "normal" | "linked-health" | "proxy-contact";

type BallOptions = {
  startsMoving?: boolean;
  isStatic?: boolean;
  alpha?: number;
  collisionMode?: GhostCollisionMode;
  receivesModifierPropagation?: boolean;
};

export class Ball {
  body: BallGameObject;
  health: number;
  readonly maxHealth: number;
  id: "red" | "blue";
  enemy: Ball | null = null;
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
  scene: Phaser.Scene;
  physicsScale = 1.0;
  /** Multiplied into base speed by arena-wide effects (e.g. SpeedBoost). */
  arenaSpeedMultiplier = 1.0;
  /** When true, maintainSpeed skips wall-proximity reflection (used by Portal). */
  ignoreArenaWalls = false;
  readonly speed: number;
  readonly arenaWidth: number;
  readonly arenaHeight: number;
  readonly wallThickness: number;
  readonly isStaticBody: boolean;
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
    id: "red" | "blue",
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
        category: id === "red" ? RED_BALL_CATEGORY : BLUE_BALL_CATEGORY,
        mask:
          WALL_COLLISION_CATEGORY |
          (id === "red" ? BLUE_BALL_CATEGORY : RED_BALL_CATEGORY),
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

    if (options.startsMoving ?? true) {
      const angle = Math.random() * Math.PI * 2;
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;

      this.body.setVelocity(velocityX, velocityY);
    }
  }

  takeDamage(rawAmount: number) {
    if (this.collisionMode === "linked-health" && this.linkedBall) {
      this.linkedBall.takeDamage(rawAmount);
      return;
    }
    if (this.collisionMode === "proxy-contact") {
      return;
    }
    const amount = this.modifiers.reduce(
      (a, m) => m.modifyDamageTaken(a),
      rawAmount,
    );
    const wasAlive = this.health > 0;
    this.health = Math.max(0, this.health - amount);
    this.onHealthChange(this.health);
    if (wasAlive && this.health <= 0) this.onDied?.();
    // Keep all ghost balls' health in sync
    for (const ghost of this.ghostBalls)
      ghost.syncHealthFromLinked(this.health);
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.onHealthChange(this.health);
    for (const ghost of this.ghostBalls)
      ghost.syncHealthFromLinked(this.health);
  }

  /** Called by master to keep ghost health in sync — does not recurse. */
  private syncHealthFromLinked(newHealth: number): void {
    this.health = newHealth;
    // Ghost has a no-op onHealthChange; master already updated the UI
  }

  addModifier(modifier: BallModifier): void {
    this.modifiers.push(modifier);
    modifier.apply(this, this.scene);
    // Propagate to ghost balls so they stay in sync; ghosts don't recurse further
    if (!this.isGhostBall && modifier.propagateToGhosts) {
      for (const ghost of this.ghostBalls) {
        if (!ghost.receivesModifierPropagation) continue;
        const ModCtor = Object.getPrototypeOf(modifier)
          .constructor as new () => BallModifier;
        ghost.addModifier(new ModCtor());
      }
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

  updateModifiers(delta: number): void {
    for (const mod of this.modifiers) mod.update(delta);
  }

  effectiveSpeed(): number {
    const base = this.speed * this.arenaSpeedMultiplier;
    return this.modifiers.reduce((s, m) => m.modifySpeed(s), base);
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

  maintainSpeed() {
    if (this.isStaticBody) return;

    const velocity = this.body.body.velocity;
    const magnitude = Math.hypot(velocity.x, velocity.y);
    const targetSpeed = this.effectiveSpeed();

    if (magnitude < 0.001) {
      const angle = Math.random() * Math.PI * 2;
      this.body.setVelocity(
        Math.cos(angle) * targetSpeed,
        Math.sin(angle) * targetSpeed,
      );
      return;
    }

    const angle = this.keepAwayFromAxis(Math.atan2(velocity.y, velocity.x));
    let vx = Math.cos(angle) * targetSpeed;
    let vy = Math.sin(angle) * targetSpeed;

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
  }
}
