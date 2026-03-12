import type { GameCatalogEntry } from "@/game/catalog";
import type { ArenaModifier } from "@/game/arena-modifier";
import type { BallModifier } from "@/game/ball-modifier";
import type { Weapon } from "@/game/weapon";
import type { Icon } from "@phosphor-icons/react";

export type CatalogEntry<T> = GameCatalogEntry<T>;

export type BallId = "red" | "blue";

export type StatTotals = {
  redDamageTaken: number;
  blueDamageTaken: number;
  wallHitsRed: number;
  wallHitsBlue: number;
  ballCollisions: number;
};

export type MicroBetKind =
  | "redDamageToBlue"
  | "blueDamageToRed"
  | "redWallHits"
  | "blueWallHits"
  | "ballCollisions";

export type MicroBetInsight = {
  kind: MicroBetKind;
  count: number;
  totalStake: number;
  averageTarget: number;
};

export type MainBet = {
  side: BallId;
  stake: number;
  swapped: boolean;
};

export type BotState = {
  id: string;
  name: string;
  bananas: number;
  mainBet: MainBet | null;
};

export type VoteCategory = "weapon" | "modifier" | "arena";

export type TwoFoldOption<T> = {
  red: CatalogEntry<T>;
  blue: CatalogEntry<T>;
  qualityScore: number;
  label: string;
};

export type ArenaOption = {
  arena: CatalogEntry<ArenaModifier>;
  qualityScore: number;
  label: string;
};

export type VoteOption =
  | { category: "weapon"; option: TwoFoldOption<Weapon> }
  | { category: "modifier"; option: TwoFoldOption<BallModifier> }
  | { category: "arena"; option: ArenaOption };

export type VoteResolution = {
  category: VoteCategory;
  optionA: VoteOption;
  optionB: VoteOption;
  winningOptionIndex: 0 | 1;
  voteSplit: {
    optionA: number;
    optionB: number;
  };
  summary: string;
};

export type VoteWindow = {
  category: VoteCategory;
  optionA: VoteOption;
  optionB: VoteOption;
  voteSplit: {
    optionA: number;
    optionB: number;
  };
};

export type VoteApplication =
  | {
      category: "weapon";
      red: () => Weapon;
      blue: () => Weapon;
      label: string;
      icons: Icon[];
    }
  | {
      category: "modifier";
      red: () => BallModifier;
      blue: () => BallModifier;
      label: string;
      icons: Icon[];
    }
  | {
      category: "arena";
      arena: () => ArenaModifier;
      label: string;
      icons: Icon[];
    };

export type RoundResult = {
  winner: BallId;
  reason: "ball-died" | "time";
};

export type EngineSnapshot = {
  roundNumber: number;
  roundsTotal: number;
  timeLeftSeconds: number;
  bots: BotState[];
  latestLog: string[];
  latestVoteSummary: string | null;
  latestMicrobetSummary: string | null;
  leaderboard: BotState[];
  roundFinished: boolean;
  tournamentFinished: boolean;
};

export type EngineStepInput = {
  redHealth: number;
  blueHealth: number;
  statsTotals: StatTotals;
  forcedWinner?: BallId;
  pauseOnVote?: boolean;
};

export type EngineStepResult = {
  snapshot: EngineSnapshot;
  applications: VoteApplication[];
  roundResult: RoundResult | null;
  voteWindow: VoteWindow | null;
};
