"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { Ball } from "@/game/ball";
import type { BallModifier } from "@/game/ball-modifier";
import type { ArenaModifier, ArenaWalls } from "@/game/arena-modifier";

const ARENA_WIDTH = 640;
const ARENA_HEIGHT = 420;
const STARTING_HEALTH = 100;
const WALL_THICKNESS = 8;

export type GameApi = {
  addModifier: (ballId: "red" | "blue", modifier: BallModifier) => void;
  addArenaModifier: (modifier: ArenaModifier) => void;
};

type HealthCallbacks = {
  onRedHealthChange: (health: number) => void;
  onBlueHealthChange: (health: number) => void;
  onRedBallDied: () => void;
  onBlueBallDied: () => void;
};

type CollisionBody = MatterJS.BodyType & {
  plugin?: {
    ballRef?: Ball;
  };
};

function createMainScene(
  callbacks: HealthCallbacks,
  onGameReady?: (api: GameApi) => void,
): Phaser.Types.Scenes.SceneType {
  let redBall: Ball;
  let blueBall: Ball;
  const arenaModifiers: ArenaModifier[] = [];
  let arenaWalls: ArenaWalls;
  const collisionCooldowns = new Set<string>();

  const trackCollisionPair = (bodyA: CollisionBody, bodyB: CollisionBody) => {
    const idA = bodyA.id;
    const idB = bodyB.id;
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  };

  return {
    key: "MainScene",
    create(this: Phaser.Scene) {
      // Health is emitted by Ball constructor via onHealthChange callbacks.
      // The game API is exposed to React after both balls are initialised.

      const wallOptions = {
        isStatic: true,
        restitution: 1,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        label: "arena-wall",
      };

      // Walls sit flush with the canvas edges; half their thickness is outside
      // the visible area so balls bounce off the very border of the canvas.
      arenaWalls = {
        top: this.matter.add.rectangle(
          ARENA_WIDTH / 2,
          -WALL_THICKNESS / 2,
          ARENA_WIDTH,
          WALL_THICKNESS,
          wallOptions,
        ) as unknown as MatterJS.BodyType,
        bottom: this.matter.add.rectangle(
          ARENA_WIDTH / 2,
          ARENA_HEIGHT + WALL_THICKNESS / 2,
          ARENA_WIDTH,
          WALL_THICKNESS,
          wallOptions,
        ) as unknown as MatterJS.BodyType,
        left: this.matter.add.rectangle(
          -WALL_THICKNESS / 2,
          ARENA_HEIGHT / 2,
          WALL_THICKNESS,
          ARENA_HEIGHT,
          wallOptions,
        ) as unknown as MatterJS.BodyType,
        right: this.matter.add.rectangle(
          ARENA_WIDTH + WALL_THICKNESS / 2,
          ARENA_HEIGHT / 2,
          WALL_THICKNESS,
          ARENA_HEIGHT,
          wallOptions,
        ) as unknown as MatterJS.BodyType,
      };

      redBall = new Ball(
        this,
        170,
        210,
        0xff0000,
        8,
        1,
        STARTING_HEALTH,
        "red",
        ARENA_WIDTH,
        ARENA_HEIGHT,
        WALL_THICKNESS,
        callbacks.onRedHealthChange,
        callbacks.onRedBallDied,
      );
      blueBall = new Ball(
        this,
        470,
        210,
        0x0000ff,
        8,
        1,
        STARTING_HEALTH,
        "blue",
        ARENA_WIDTH,
        ARENA_HEIGHT,
        WALL_THICKNESS,
        callbacks.onBlueHealthChange,
        callbacks.onBlueBallDied,
      );

      redBall.enemy = blueBall;
      blueBall.enemy = redBall;

      onGameReady?.({
        addModifier: (ballId, modifier) => {
          if (ballId === "red") redBall.addModifier(modifier);
          else blueBall.addModifier(modifier);
        },
        addArenaModifier: (modifier) => {
          arenaModifiers.push(modifier);
          modifier.apply(
            this,
            redBall,
            blueBall,
            ARENA_WIDTH,
            ARENA_HEIGHT,
            arenaWalls,
          );
        },
      });

      // Matter.js fires collision events on compound-body *parts*, not the
      // parent body where we store `label` and `plugin.ballRef`. Resolve up.
      const resolveBody = (
        b: MatterJS.Body | MatterJS.BodyType,
      ): CollisionBody => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parent = (b as any).parent as CollisionBody | undefined;
        const self = b as unknown as CollisionBody;
        return parent && parent !== self ? parent : self;
      };

      this.matter.world.on(
        "collisionstart",
        (event: MatterJS.IEventCollision<MatterJS.Engine>) => {
          event.pairs.forEach((pair) => {
            const bodyA = resolveBody(pair.bodyA);
            const bodyB = resolveBody(pair.bodyB);
            const key = trackCollisionPair(bodyA, bodyB);

            if (collisionCooldowns.has(key)) {
              return;
            }

            collisionCooldowns.add(key);

            const aBall = bodyA.label === "ball";
            const bBall = bodyB.label === "ball";
            const aWall = bodyA.label === "arena-wall";
            const bWall = bodyB.label === "arena-wall";
            const ballA = bodyA.plugin?.ballRef;
            const ballB = bodyB.plugin?.ballRef;

            if (aBall && bBall && ballA && ballB) {
              ballA.takeDamage(1);
              ballB.takeDamage(1);
              for (const mod of ballA.modifiers) mod.onBallHitBall(ballB);
              for (const mod of ballB.modifiers) mod.onBallHitBall(ballA);
              ballA.nudgeDirection();
              ballB.nudgeDirection();
              return;
            }

            if (aBall && bWall && ballA) {
              for (const mod of ballA.modifiers) mod.onBallHitWall();
              ballA.nudgeDirection();
            }

            if (bBall && aWall && ballB) {
              for (const mod of ballB.modifiers) mod.onBallHitWall();
              ballB.nudgeDirection();
            }
          });
        },
      );

      this.matter.world.on(
        "collisionend",
        (event: MatterJS.IEventCollision<MatterJS.Engine>) => {
          event.pairs.forEach((pair) => {
            const bodyA = resolveBody(pair.bodyA);
            const bodyB = resolveBody(pair.bodyB);
            collisionCooldowns.delete(trackCollisionPair(bodyA, bodyB));
          });
        },
      );
    },
    update(_time: number, delta: number) {
      redBall?.updateModifiers(delta);
      for (const ghost of redBall?.ghostBalls ?? [])
        ghost.updateModifiers(delta);
      blueBall?.updateModifiers(delta);
      for (const ghost of blueBall?.ghostBalls ?? [])
        ghost.updateModifiers(delta);
      for (const mod of arenaModifiers) mod.update(delta);
      redBall?.maintainSpeed();
      for (const ghost of redBall?.ghostBalls ?? []) ghost.maintainSpeed();
      blueBall?.maintainSpeed();
      for (const ghost of blueBall?.ghostBalls ?? []) ghost.maintainSpeed();
    },
  };
}

type GameBoardProps = {
  onRedHealthChange?: (health: number) => void;
  onBlueHealthChange?: (health: number) => void;
  onBallDied?: (id: "red" | "blue") => void;
  onGameReady?: (api: GameApi) => void;
};

export default function GameBoard({
  onRedHealthChange,
  onBlueHealthChange,
  onBallDied,
  onGameReady,
}: GameBoardProps) {
  const gameRef = useRef<HTMLDivElement>(null);

  // Keep latest callbacks in refs so the Phaser scene always calls the
  // current version without needing to destroy/recreate the game.
  const onRedHealthChangeRef = useRef(onRedHealthChange);
  const onBlueHealthChangeRef = useRef(onBlueHealthChange);
  const onBallDiedRef = useRef(onBallDied);
  const onGameReadyRef = useRef(onGameReady);
  onRedHealthChangeRef.current = onRedHealthChange;
  onBlueHealthChangeRef.current = onBlueHealthChange;
  onBallDiedRef.current = onBallDied;
  onGameReadyRef.current = onGameReady;

  useEffect(() => {
    if (!gameRef.current) return;

    const callbacks: HealthCallbacks = {
      onRedHealthChange: (h) => onRedHealthChangeRef.current?.(h),
      onBlueHealthChange: (h) => onBlueHealthChangeRef.current?.(h),
      onRedBallDied: () => onBallDiedRef.current?.("red"),
      onBlueBallDied: () => onBallDiedRef.current?.("blue"),
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      pixelArt: true,
      antialias: false,
      parent: gameRef.current,
      backgroundColor: "#ffffff",
      physics: {
        default: "matter",
        matter: {
          gravity: { y: 0, x: 0 },
        },
      },
      scene: createMainScene(callbacks, (api) => onGameReadyRef.current?.(api)),
    };

    const game = new Phaser.Game(config);
    if (game.canvas) {
      game.canvas.style.display = "block";
    }

    return () => {
      game.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={gameRef} />;
}
