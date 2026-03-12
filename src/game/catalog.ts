import type { Icon } from "@phosphor-icons/react";
import type { BallModifier } from "./ball-modifier";
import type { ArenaModifier } from "./arena-modifier";
import type { Weapon } from "./weapon";
import { RegenModifier } from "./ball-modifiers/regen";
import { SpikesModifier } from "./ball-modifiers/spikes";
import { ArmoredModifier } from "./ball-modifiers/armored";
import { BerserkerModifier } from "./ball-modifiers/berserker";
import { MagneticModifier } from "./ball-modifiers/magnetic";
import { LeechModifier } from "./ball-modifiers/leech";
import { OverchargeModifier } from "./ball-modifiers/overcharge";
import { GrowthHormonesModifier } from "./ball-modifiers/growth-hormones";
import { BabyModifier } from "./ball-modifiers/baby";
import { MitosisModifier } from "./ball-modifiers/mitosis";
import { SnakeModifier } from "./ball-modifiers/snake";
import { TwinHeartsModifier } from "./ball-modifiers/twin-hearts";
import { RapidFireModifier } from "./ball-modifiers/rapid-fire";
import { StunningStrikesModifier } from "./ball-modifiers/stunning-strikes";
import { CausticPayloadModifier } from "./ball-modifiers/caustic-payload";
import { ProjectileDeflectorModifier } from "./ball-modifiers/projectile-deflector";
import { ArtillerySpecialistModifier } from "./ball-modifiers/artillery-specialist";
import { DuelistSpecialistModifier } from "./ball-modifiers/duelist-specialist";
import { LuckyEvadeModifier } from "./ball-modifiers/lucky-evade";
import { PhaseShiftModifier } from "./ball-modifiers/phase-shift";
import { SpeedBoostModifier } from "./arena-modifiers/speed-boost";
import { PortalModifier } from "./arena-modifiers/portal";
import { CircleArenaModifier } from "./arena-modifiers/circle-arena";
import { TurbulenceModifier } from "./arena-modifiers/turbulence";
import { VortexModifier } from "./arena-modifiers/vortex";
import { BumpersModifier } from "./arena-modifiers/bumpers";
import { DoubleTimeModifier } from "./arena-modifiers/double-time";
import { RogueMonkeyModifier } from "./arena-modifiers/rogue-monkey";
import { DoubleLoadoutModifier } from "./arena-modifiers/double-loadout";
import { TwoVsTwoModifier } from "./arena-modifiers/two-v-two";
import { GravityOnModifier } from "./arena-modifiers/gravity-on";
import { SwordWeapon } from "./weapons/sword";
import { StaffWeapon } from "./weapons/staff";
import { RapierWeapon } from "./weapons/rapier";
import { KatanaWeapon } from "./weapons/katana";
import { ShieldWeapon } from "./weapons/shield";
import { EighthNoteWeapon } from "./weapons/eighth-note";
import { TrebleClefWeapon } from "./weapons/treble-clef";
import { BazookaWeapon } from "./weapons/bazooka";
import { HomingGunWeapon } from "./weapons/homing-gun";
import { SniperWeapon } from "./weapons/sniper";
import { ShotgunWeapon } from "./weapons/shotgun";
import { LaserGunWeapon } from "./weapons/laser-gun";
import { MachineGunWeapon } from "./weapons/machine-gun";
import { ElectricStaffWeapon } from "./weapons/electric-staff";
import { PoisonStaffWeapon } from "./weapons/poison-staff";
import { WrenchWeapon } from "./weapons/wrench";
import { BoomerangWeapon } from "./weapons/boomerang";
import { ScytheWeapon } from "./weapons/scythe";

export type GameCatalogEntry<T> = {
  label: string;
  quality: number;
  icon: Icon;
  create: () => T;
};

type Constructor<T> = new () => T;

function buildCatalog<T extends { name: string; quality: number; icon: Icon }>(
  ctors: Array<Constructor<T>>,
): GameCatalogEntry<T>[] {
  return ctors.map((Ctor) => {
    const sample = new Ctor();
    return {
      label: sample.name,
      quality: sample.quality,
      icon: sample.icon,
      create: () => new Ctor(),
    };
  });
}

export const MODIFIER_CATALOG: GameCatalogEntry<BallModifier>[] =
  buildCatalog<BallModifier>([
    RegenModifier,
    SpikesModifier,
    ArmoredModifier,
    BerserkerModifier,
    MagneticModifier,
    LeechModifier,
    OverchargeModifier,
    GrowthHormonesModifier,
    BabyModifier,
    MitosisModifier,
    SnakeModifier,
    TwinHeartsModifier,
    RapidFireModifier,
    StunningStrikesModifier,
    CausticPayloadModifier,
    ProjectileDeflectorModifier,
    ArtillerySpecialistModifier,
    DuelistSpecialistModifier,
    LuckyEvadeModifier,
    PhaseShiftModifier,
  ]);

export const ARENA_MODIFIER_CATALOG: GameCatalogEntry<ArenaModifier>[] =
  buildCatalog<ArenaModifier>([
    SpeedBoostModifier,
    PortalModifier,
    CircleArenaModifier,
    TurbulenceModifier,
    VortexModifier,
    BumpersModifier,
    DoubleTimeModifier,
    RogueMonkeyModifier,
    DoubleLoadoutModifier,
    TwoVsTwoModifier,
    GravityOnModifier,
  ]);

export const WEAPON_CATALOG: GameCatalogEntry<Weapon>[] = buildCatalog<Weapon>([
  SwordWeapon,
  StaffWeapon,
  RapierWeapon,
  KatanaWeapon,
  ShieldWeapon,
  EighthNoteWeapon,
  TrebleClefWeapon,
  BazookaWeapon,
  HomingGunWeapon,
  SniperWeapon,
  ShotgunWeapon,
  LaserGunWeapon,
  MachineGunWeapon,
  ElectricStaffWeapon,
  PoisonStaffWeapon,
  WrenchWeapon,
  BoomerangWeapon,
  ScytheWeapon,
]);
