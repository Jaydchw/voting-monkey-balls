import { ArenaModifier } from "../arena-modifier";
import { Ball } from "../ball";
import type { BallModifier } from "../ball-modifier";
import type { Weapon } from "../weapon";
import { ArmoredModifier } from "../ball-modifiers/armored";
import { BerserkerModifier } from "../ball-modifiers/berserker";
import { LeechModifier } from "../ball-modifiers/leech";
import { RapidFireModifier } from "../ball-modifiers/rapid-fire";
import { ProjectileDeflectorModifier } from "../ball-modifiers/projectile-deflector";
import { LuckyEvadeModifier } from "../ball-modifiers/lucky-evade";
import { PhaseShiftModifier } from "../ball-modifiers/phase-shift";
import { SwordWeapon } from "../weapons/sword";
import { RapierWeapon } from "../weapons/rapier";
import { StaffWeapon } from "../weapons/staff";
import { BazookaWeapon } from "../weapons/bazooka";
import { ShotgunWeapon } from "../weapons/shotgun";
import { MachineGunWeapon } from "../weapons/machine-gun";
import { SniperWeapon } from "../weapons/sniper";
import { Robot } from "@phosphor-icons/react";

type ModifierFactory = () => BallModifier;
type WeaponFactory = () => Weapon;

const ROGUE_MODIFIERS: ModifierFactory[] = [
  () => new ArmoredModifier(),
  () => new BerserkerModifier(),
  () => new LeechModifier(),
  () => new RapidFireModifier(),
  () => new ProjectileDeflectorModifier(),
  () => new LuckyEvadeModifier(),
  () => new PhaseShiftModifier(),
];

const ROGUE_WEAPONS: WeaponFactory[] = [
  () => new SwordWeapon(),
  () => new RapierWeapon(),
  () => new StaffWeapon(),
  () => new BazookaWeapon(),
  () => new ShotgunWeapon(),
  () => new MachineGunWeapon(),
  () => new SniperWeapon(),
];

export class RogueMonkeyModifier extends ArenaModifier {
  readonly name = "Rogue Monkey";
  readonly quality = 4;
  readonly icon = Robot;
  readonly description =
    "Spawns a neutral monkey with 2 random weapons and 2 random ball modifiers.";

  private rogueBall: Ball | null = null;

  protected onApply(): void {
    const spawnX = this.arenaWidth / 2;
    const spawnY = this.arenaHeight / 2;

    this.rogueBall = new Ball(
      this.scene,
      spawnX,
      spawnY,
      0xffffff,
      8,
      1,
      120,
      "rogue",
      this.arenaWidth,
      this.arenaHeight,
      this.redBall.wallThickness,
      () => {},
      null,
      {
        faceTextureKey: "monkey-face",
        faceScale: 1,
      },
    );

    this.rogueBall.setHostileBalls([this.redBall, this.blueBall]);
    this.runtime.registerExtraBall(this.rogueBall);

    for (const createModifier of this.pickUnique(ROGUE_MODIFIERS, 2)) {
      this.rogueBall.addModifier(createModifier());
    }
    for (const createWeapon of this.pickUnique(ROGUE_WEAPONS, 2)) {
      this.rogueBall.addWeapon(createWeapon());
    }
  }

  protected onRemove(): void {
    if (!this.rogueBall) return;
    this.runtime.unregisterExtraBall(this.rogueBall);
    this.rogueBall.destroy();
    this.rogueBall = null;
  }

  private pickUnique<T>(pool: T[], count: number): T[] {
    const copy = [...pool];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const swap = copy[index];
      copy[index] = copy[randomIndex];
      copy[randomIndex] = swap;
    }
    return copy.slice(0, Math.min(count, copy.length));
  }
}
