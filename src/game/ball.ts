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

const BALL_RENDER_RADIUS = 20;
const BALL_OUTLINE_WIDTH = 6;
const BALL_COLLISION_RADIUS = BALL_RENDER_RADIUS + BALL_OUTLINE_WIDTH / 2;
const MIN_AXIS_ANGLE = 0.3;

export class Ball {
  body: BallGameObject;
  health: number;
  readonly maxHealth: number;
  id: "red" | "blue";
  enemy: Ball | null = null;
  modifiers: BallModifier[] = [];
  scene: Phaser.Scene;
  physicsScale = 1.0;
  private readonly speed: number;
  readonly arenaWidth: number;
  readonly arenaHeight: number;
  private readonly wallThickness: number;
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
    this.onHealthChange = onHealthChange;
    this.onDied = onDied;
    onHealthChange(health);
    const circle = scene.add.circle(x, y, BALL_RENDER_RADIUS, color);
    circle.setStrokeStyle(BALL_OUTLINE_WIDTH, 0x000000, 1);

    this.body = scene.matter.add.gameObject(circle, {
      shape: "circle",
      circleRadius: BALL_COLLISION_RADIUS,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      restitution: 1,
      mass: mass,
      ignoreGravity: true,
      inertia: Infinity,
    }) as BallGameObject;

    this.body.setBounce(1);
    this.body.setFriction(0, 0, 0);
    this.body.body.label = "ball";
    this.body.body.plugin = {
      ...this.body.body.plugin,
      ballRef: this,
    };

    const angle = Math.random() * Math.PI * 2;
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    this.body.setVelocity(velocityX, velocityY);
  }

  takeDamage(rawAmount: number) {
    const amount = this.modifiers.reduce(
      (a, m) => m.modifyDamageTaken(a),
      rawAmount,
    );
    const wasAlive = this.health > 0;
    this.health = Math.max(0, this.health - amount);
    this.onHealthChange(this.health);
    if (wasAlive && this.health <= 0) this.onDied?.();
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.onHealthChange(this.health);
  }

  addModifier(modifier: BallModifier): void {
    this.modifiers.push(modifier);
    modifier.apply(this, this.scene);
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
    return this.modifiers.reduce((s, m) => m.modifySpeed(s), this.speed);
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
    if (this.body.x <= safeMargin && vx < 0) vx = Math.abs(vx);
    if (this.body.x >= this.arenaWidth - safeMargin && vx > 0)
      vx = -Math.abs(vx);
    if (this.body.y <= safeMargin && vy < 0) vy = Math.abs(vy);
    if (this.body.y >= this.arenaHeight - safeMargin && vy > 0)
      vy = -Math.abs(vy);

    const adjustedMag = Math.hypot(vx, vy);
    this.body.setVelocity(
      (vx / adjustedMag) * targetSpeed,
      (vy / adjustedMag) * targetSpeed,
    );
  }
}
