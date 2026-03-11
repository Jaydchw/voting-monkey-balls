"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { Ball } from "@/game/ball";

const ARENA_WIDTH = 640;
const ARENA_HEIGHT = 420;
const STARTING_HEALTH = 100;
const WALL_THICKNESS = 8;

type HealthCallbacks = {
  onRedHealthChange: (health: number) => void;
  onBlueHealthChange: (health: number) => void;
};

type CollisionBody = MatterJS.BodyType & {
  plugin?: {
    ballRef?: Ball;
  };
};

function createMainScene(
  callbacks: HealthCallbacks,
): Phaser.Types.Scenes.SceneType {
  let redBall: Ball;
  let blueBall: Ball;
  const collisionCooldowns = new Set<string>();

  const damageBall = (ball: Ball, amount: number) => {
    ball.health = Math.max(0, ball.health - amount);

    if (ball.id === "red") {
      callbacks.onRedHealthChange(ball.health);
    } else {
      callbacks.onBlueHealthChange(ball.health);
    }
  };

  const trackCollisionPair = (bodyA: CollisionBody, bodyB: CollisionBody) => {
    const idA = bodyA.id;
    const idB = bodyB.id;
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  };

  return {
    key: "MainScene",
    create(this: Phaser.Scene) {
      callbacks.onRedHealthChange(STARTING_HEALTH);
      callbacks.onBlueHealthChange(STARTING_HEALTH);

      const wallVisuals = this.add.graphics();
      wallVisuals.fillStyle(0x2f2f2f, 1);
      wallVisuals.fillRect(0, 0, ARENA_WIDTH, WALL_THICKNESS);
      wallVisuals.fillRect(
        0,
        ARENA_HEIGHT - WALL_THICKNESS,
        ARENA_WIDTH,
        WALL_THICKNESS,
      );
      wallVisuals.fillRect(0, 0, WALL_THICKNESS, ARENA_HEIGHT);
      wallVisuals.fillRect(
        ARENA_WIDTH - WALL_THICKNESS,
        0,
        WALL_THICKNESS,
        ARENA_HEIGHT,
      );

      const wallOptions = {
        isStatic: true,
        restitution: 1,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
        label: "arena-wall",
      };

      this.matter.add.rectangle(
        ARENA_WIDTH / 2,
        WALL_THICKNESS / 2,
        ARENA_WIDTH,
        WALL_THICKNESS,
        wallOptions,
      );
      this.matter.add.rectangle(
        ARENA_WIDTH / 2,
        ARENA_HEIGHT - WALL_THICKNESS / 2,
        ARENA_WIDTH,
        WALL_THICKNESS,
        wallOptions,
      );
      this.matter.add.rectangle(
        WALL_THICKNESS / 2,
        ARENA_HEIGHT / 2,
        WALL_THICKNESS,
        ARENA_HEIGHT,
        wallOptions,
      );
      this.matter.add.rectangle(
        ARENA_WIDTH - WALL_THICKNESS / 2,
        ARENA_HEIGHT / 2,
        WALL_THICKNESS,
        ARENA_HEIGHT,
        wallOptions,
      );

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
      );

      this.matter.world.on(
        "collisionStart",
        (event: MatterJS.IEventCollision<MatterJS.Engine>) => {
          event.pairs.forEach((pair) => {
            const bodyA = pair.bodyA as unknown as CollisionBody;
            const bodyB = pair.bodyB as unknown as CollisionBody;
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
              damageBall(ballA, 1);
              damageBall(ballB, 1);
              ballA.nudgeDirection();
              ballB.nudgeDirection();
              return;
            }

            if (aBall && bWall && ballA) {
              damageBall(ballA, 1);
              ballA.nudgeDirection();
            }

            if (bBall && aWall && ballB) {
              damageBall(ballB, 1);
              ballB.nudgeDirection();
            }
          });
        },
      );

      this.matter.world.on(
        "collisionEnd",
        (event: MatterJS.IEventCollision<MatterJS.Engine>) => {
          event.pairs.forEach((pair) => {
            const bodyA = pair.bodyA as unknown as CollisionBody;
            const bodyB = pair.bodyB as unknown as CollisionBody;
            collisionCooldowns.delete(trackCollisionPair(bodyA, bodyB));
          });
        },
      );
    },
    update() {
      redBall?.maintainSpeed();
      blueBall?.maintainSpeed();
    },
  };
}

type GameBoardProps = {
  onRedHealthChange?: (health: number) => void;
  onBlueHealthChange?: (health: number) => void;
};

export default function GameBoard({
  onRedHealthChange,
  onBlueHealthChange,
}: GameBoardProps) {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

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
      scene: createMainScene({
        onRedHealthChange: onRedHealthChange ?? (() => {}),
        onBlueHealthChange: onBlueHealthChange ?? (() => {}),
      }),
    };

    const game = new Phaser.Game(config);
    if (game.canvas) {
      game.canvas.style.display = "block";
    }

    return () => {
      game.destroy(true);
    };
  }, [onBlueHealthChange, onRedHealthChange]);

  return <div ref={gameRef} />;
}
