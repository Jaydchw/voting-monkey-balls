import {
  ARENA_CATALOG,
  MODIFIER_CATALOG,
  WEAPON_CATALOG,
} from "@/bots/catalog";
import type {
  BallId,
  BotState,
  CatalogEntry,
  EngineSnapshot,
  EngineStepInput,
  EngineStepResult,
  MicroBetInsight,
  MicroBetKind,
  RoundResult,
  StatTotals,
  VoteApplication,
  VoteCategory,
  VoteOption,
  VoteResolution,
  VoteWindow,
} from "@/bots/types";
import type { BallModifier } from "@/game/ball-modifier";
import type { Weapon } from "@/game/weapon";

type PlacedMicroBet = {
  botId: string;
  kind: MicroBetKind;
  outcome: boolean;
  stake: number;
};

type EngineConfig = {
  botCount: number;
  startingBananas: number;
  minMainBet: number;
  roundDurationSeconds: number;
  voteIntervalSeconds: number;
  totalRounds: number;
};

const DEFAULT_CONFIG: EngineConfig = {
  botCount: 0,
  startingBananas: 100,
  minMainBet: 20,
  roundDurationSeconds: 120,
  voteIntervalSeconds: 10,
  totalRounds: 3,
};

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function getDesiredQualityFromHealth(health: number): number {
  if (health <= 20) return 5;
  if (health <= 40) return 4;
  if (health <= 60) return 3;
  if (health <= 80) return 2;
  return 1;
}

function createZeroTotals(): StatTotals {
  return {
    redDamageTaken: 0,
    blueDamageTaken: 0,
    wallHitsRed: 0,
    wallHitsBlue: 0,
    ballCollisions: 0,
  };
}

function diffTotals(current: StatTotals, previous: StatTotals): StatTotals {
  return {
    redDamageTaken: current.redDamageTaken - previous.redDamageTaken,
    blueDamageTaken: current.blueDamageTaken - previous.blueDamageTaken,
    wallHitsRed: current.wallHitsRed - previous.wallHitsRed,
    wallHitsBlue: current.wallHitsBlue - previous.wallHitsBlue,
    ballCollisions: current.ballCollisions - previous.ballCollisions,
  };
}

function addTotals(a: StatTotals, b: StatTotals): StatTotals {
  return {
    redDamageTaken: a.redDamageTaken + b.redDamageTaken,
    blueDamageTaken: a.blueDamageTaken + b.blueDamageTaken,
    wallHitsRed: a.wallHitsRed + b.wallHitsRed,
    wallHitsBlue: a.wallHitsBlue + b.wallHitsBlue,
    ballCollisions: a.ballCollisions + b.ballCollisions,
  };
}

function chooseByQuality<T>(
  catalog: CatalogEntry<T>[],
  targetQuality: number,
  rng: () => number,
): CatalogEntry<T> {
  const weighted = catalog
    .map((entry) => {
      const distance = Math.abs(entry.quality - targetQuality);
      return {
        entry,
        weight: distance <= 1 ? 4 : distance === 2 ? 2 : 1,
      };
    })
    .filter((item) => item.weight > 0);

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.entry;
    }
  }
  return weighted[weighted.length - 1].entry;
}

function summarizeMainBet(bot: BotState): string {
  if (!bot.mainBet) {
    return "No main bet";
  }
  return `${bot.mainBet.side.toUpperCase()} ${bot.mainBet.stake}b${
    bot.mainBet.swapped ? " (swapped)" : ""
  }`;
}

function didMicrobetWin(
  kind: MicroBetKind,
  outcome: boolean,
  windowStats: StatTotals,
): boolean {
  if (kind === "redDamageToBlue") {
    return outcome
      ? windowStats.blueDamageTaken > windowStats.redDamageTaken
      : windowStats.blueDamageTaken <= windowStats.redDamageTaken;
  }
  if (kind === "blueDamageToRed") {
    return outcome
      ? windowStats.redDamageTaken > windowStats.blueDamageTaken
      : windowStats.redDamageTaken <= windowStats.blueDamageTaken;
  }
  if (kind === "redWallHits") {
    return outcome
      ? windowStats.wallHitsRed > windowStats.wallHitsBlue
      : windowStats.wallHitsRed <= windowStats.wallHitsBlue;
  }
  if (kind === "blueWallHits") {
    return outcome
      ? windowStats.wallHitsBlue > windowStats.wallHitsRed
      : windowStats.wallHitsBlue <= windowStats.wallHitsRed;
  }
  return outcome
    ? windowStats.ballCollisions >= 10
    : windowStats.ballCollisions < 10;
}

export class BotsGameEngine {
  private readonly config: EngineConfig;
  private readonly rng: () => number;

  private bots: BotState[] = [];
  private roundNumber = 1;
  private timeLeftSeconds = DEFAULT_CONFIG.roundDurationSeconds;
  private roundFinished = false;
  private tournamentFinished = false;

  private lastStatsTotals: StatTotals = createZeroTotals();
  private intervalStatsTotals: StatTotals = createZeroTotals();
  private pendingMicroBets: PlacedMicroBet[] = [];

  private latestLog: string[] = [];
  private latestVoteSummary: string | null = null;
  private latestMicrobetSummary: string | null = null;
  private pendingVote: VoteResolution | null = null;

  constructor(
    config: Partial<EngineConfig> = {},
    rng: () => number = Math.random,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = rng;
    this.bootstrapBots();
    this.startRound(1);
  }

  getSnapshot(): EngineSnapshot {
    const leaderboard = [...this.bots].sort((a, b) => b.bananas - a.bananas);
    return {
      roundNumber: this.roundNumber,
      roundsTotal: this.config.totalRounds,
      timeLeftSeconds: this.timeLeftSeconds,
      bots: this.bots,
      latestLog: this.latestLog,
      latestVoteSummary: this.latestVoteSummary,
      latestMicrobetSummary: this.latestMicrobetSummary,
      leaderboard,
      roundFinished: this.roundFinished,
      tournamentFinished: this.tournamentFinished,
    };
  }

  startNextRound(): EngineSnapshot | null {
    if (this.roundNumber >= this.config.totalRounds) {
      this.tournamentFinished = true;
      return null;
    }
    this.startRound(this.roundNumber + 1);
    return this.getSnapshot();
  }

  step(input: EngineStepInput): EngineStepResult {
    if (this.roundFinished || this.tournamentFinished) {
      return {
        snapshot: this.getSnapshot(),
        applications: [],
        roundResult: null,
        voteWindow: null,
      };
    }

    const statsDelta = diffTotals(input.statsTotals, this.lastStatsTotals);
    this.lastStatsTotals = { ...input.statsTotals };
    this.intervalStatsTotals = addTotals(this.intervalStatsTotals, statsDelta);

    this.timeLeftSeconds = Math.max(0, this.timeLeftSeconds - 1);

    const applications: VoteApplication[] = [];
    let roundResult: RoundResult | null = null;
    let voteWindow: VoteWindow | null = null;

    if (input.forcedWinner) {
      roundResult = this.finishRound(input.forcedWinner, "ball-died", input);
    } else if (
      this.timeLeftSeconds > 0 &&
      this.timeLeftSeconds % this.config.voteIntervalSeconds === 0
    ) {
      if (input.pauseOnVote) {
        if (this.pendingVote) {
          return {
            snapshot: this.getSnapshot(),
            applications,
            roundResult,
            voteWindow: {
              category: this.pendingVote.category,
              optionA: this.pendingVote.optionA,
              optionB: this.pendingVote.optionB,
              optionC: this.pendingVote.optionC,
              voteSplit: this.pendingVote.voteSplit,
            },
          };
        }

        this.settleMicroBets(this.intervalStatsTotals);
        this.maybeSwapMainBets(input.redHealth, input.blueHealth);
        this.pendingVote = this.resolveVote(input.redHealth, input.blueHealth);
        voteWindow = {
          category: this.pendingVote.category,
          optionA: this.pendingVote.optionA,
          optionB: this.pendingVote.optionB,
          optionC: this.pendingVote.optionC,
          voteSplit: this.pendingVote.voteSplit,
        };
      } else {
        const voteResult = this.executeVoteCycle(
          input.redHealth,
          input.blueHealth,
        );
        if (voteResult.application) {
          applications.push(voteResult.application);
        }
      }
    }

    if (!roundResult && this.timeLeftSeconds === 0) {
      const winner = this.resolveTimeWinner(input.redHealth, input.blueHealth);
      roundResult = this.finishRound(winner, "time", input);
    }

    return {
      snapshot: this.getSnapshot(),
      applications,
      roundResult,
      voteWindow,
    };
  }

  resolvePendingVote(
    playerOption: 0 | 1 | 2,
    playerVotes: number,
  ): {
    application: VoteApplication | null;
    summary: string | null;
  } {
    return this.resolvePendingVoteTotals(
      playerOption === 0 ? playerVotes : 0,
      playerOption === 1 ? playerVotes : 0,
      playerOption === 2 ? playerVotes : 0,
    );
  }

  resolvePendingVoteTotals(
    optionAExtraVotes: number,
    optionBExtraVotes: number,
    optionCExtraVotes: number,
  ): {
    application: VoteApplication | null;
    summary: string | null;
  } {
    if (!this.pendingVote) {
      return { application: null, summary: null };
    }

    const safeOptionAVotes = Math.max(0, Math.floor(optionAExtraVotes));
    const safeOptionBVotes = Math.max(0, Math.floor(optionBExtraVotes));
    const safeOptionCVotes = Math.max(0, Math.floor(optionCExtraVotes));
    const optionAVotes = this.pendingVote.voteSplit.optionA + safeOptionAVotes;
    const optionBVotes = this.pendingVote.voteSplit.optionB + safeOptionBVotes;
    const optionCVotes = this.pendingVote.voteSplit.optionC + safeOptionCVotes;
    const totalVotes = optionAVotes + optionBVotes + optionCVotes;

    const weightedVotes: Array<{ index: 0 | 1 | 2; votes: number }> = [
      { index: 0, votes: optionAVotes },
      { index: 1, votes: optionBVotes },
      { index: 2, votes: optionCVotes },
    ];

    const winningOptionIndex: 0 | 1 | 2 =
      totalVotes === 0
        ? weightedVotes[randomInt(0, weightedVotes.length - 1, this.rng)].index
        : (() => {
            let roll = this.rng() * totalVotes;
            for (const bucket of weightedVotes) {
              roll -= bucket.votes;
              if (roll <= 0) {
                return bucket.index;
              }
            }
            return 2;
          })();

    const resolvedVote: VoteResolution = {
      ...this.pendingVote,
      winningOptionIndex,
      voteSplit: {
        optionA: optionAVotes,
        optionB: optionBVotes,
        optionC: optionCVotes,
      },
    };

    const optionALabel = this.getOptionLabel(resolvedVote.optionA);
    const optionBLabel = this.getOptionLabel(resolvedVote.optionB);
    const optionCLabel = this.getOptionLabel(resolvedVote.optionC);
    const winnerLabel =
      winningOptionIndex === 0
        ? optionALabel
        : winningOptionIndex === 1
          ? optionBLabel
          : optionCLabel;
    const summary = `VOTE (W/M/A): ${optionAVotes}-${optionBVotes}-${optionCVotes}. Applied: ${winnerLabel}`;

    this.latestVoteSummary = summary;
    this.pushLog(summary);

    const winners =
      winningOptionIndex === 0
        ? resolvedVote.optionA
        : winningOptionIndex === 1
          ? resolvedVote.optionB
          : resolvedVote.optionC;
    const application = this.toVoteApplication(winners);

    this.pendingMicroBets = this.createMicroBets();
    this.latestMicrobetSummary = `${this.pendingMicroBets.length} microbets opened for next interval.`;
    this.pushLog(this.latestMicrobetSummary);
    this.intervalStatsTotals = createZeroTotals();

    this.pendingVote = null;

    return {
      application,
      summary,
    };
  }

  getPendingMicrobetInsights(): MicroBetInsight[] {
    const byKind = new Map<
      MicroBetKind,
      { count: number; totalStake: number; truePicks: number }
    >();

    for (const bet of this.pendingMicroBets) {
      const current = byKind.get(bet.kind) ?? {
        count: 0,
        totalStake: 0,
        truePicks: 0,
      };
      current.count += 1;
      current.totalStake += bet.stake;
      current.truePicks += bet.outcome ? 1 : 0;
      byKind.set(bet.kind, current);
    }

    return Array.from(byKind.entries()).map(([kind, value]) => ({
      kind,
      count: value.count,
      totalStake: value.totalStake,
      averageTarget:
        value.count === 0 ? 0 : (value.truePicks / value.count) * 100,
    }));
  }

  private bootstrapBots(): void {
    this.bots = Array.from({ length: this.config.botCount }, (_, index) => ({
      id: `bot-${index + 1}`,
      name: `Monkey Bot ${index + 1}`,
      bananas: this.config.startingBananas,
      mainBet: null,
    }));
  }

  private startRound(roundNumber: number): void {
    this.roundNumber = roundNumber;
    this.timeLeftSeconds = this.config.roundDurationSeconds;
    this.roundFinished = false;
    this.latestVoteSummary = null;
    this.latestMicrobetSummary = null;
    this.latestLog = [];
    this.pendingVote = null;
    this.lastStatsTotals = createZeroTotals();
    this.intervalStatsTotals = createZeroTotals();
    this.pendingMicroBets = [];

    this.allocateMainBets();

    const sample = this.bots.slice(0, 3).map((bot) => {
      return `${bot.name}: ${summarizeMainBet(bot)}`;
    });
    this.pushLog(
      `Round ${roundNumber} started with ${this.config.botCount} bots.`,
    );
    this.pushLog(sample.join(" | "));
  }

  private allocateMainBets(): void {
    for (const bot of this.bots) {
      const maxStake = Math.min(40, bot.bananas);
      if (maxStake < this.config.minMainBet) {
        bot.mainBet = null;
        continue;
      }

      const stake = randomInt(this.config.minMainBet, maxStake, this.rng);
      bot.bananas -= stake;
      bot.mainBet = {
        side: this.rng() < 0.5 ? "red" : "blue",
        stake,
        swapped: false,
      };
    }
  }

  private executeVoteCycle(
    redHealth: number,
    blueHealth: number,
  ): {
    application: VoteApplication | null;
  } {
    this.settleMicroBets(this.intervalStatsTotals);

    this.maybeSwapMainBets(redHealth, blueHealth);

    const vote = this.resolveVote(redHealth, blueHealth);
    this.latestVoteSummary = vote.summary;
    this.pushLog(vote.summary);

    const winners =
      vote.winningOptionIndex === 0
        ? vote.optionA
        : vote.winningOptionIndex === 1
          ? vote.optionB
          : vote.optionC;
    const application = this.toVoteApplication(winners);

    this.pendingMicroBets = this.createMicroBets();
    this.latestMicrobetSummary = `${this.pendingMicroBets.length} microbets opened for next interval.`;
    this.pushLog(this.latestMicrobetSummary);

    this.intervalStatsTotals = createZeroTotals();

    return { application };
  }

  private maybeSwapMainBets(redHealth: number, blueHealth: number): void {
    const disparity = Math.abs(redHealth - blueHealth);
    if (disparity > 25) {
      return;
    }

    for (const bot of this.bots) {
      if (!bot.mainBet || bot.mainBet.swapped) {
        continue;
      }
      if (this.rng() > 0.08) {
        continue;
      }
      bot.mainBet.side = bot.mainBet.side === "red" ? "blue" : "red";
      bot.mainBet.stake = Math.max(1, Math.floor(bot.mainBet.stake * 0.6));
      bot.mainBet.swapped = true;
    }
  }

  private resolveVote(redHealth: number, blueHealth: number): VoteResolution {
    const optionA = this.buildVoteOption("weapon", redHealth, blueHealth);
    const optionB = this.buildVoteOption("modifier", redHealth, blueHealth);
    const optionC = this.buildVoteOption("arena", redHealth, blueHealth);

    let optionAVotes = 0;
    let optionBVotes = 0;
    let optionCVotes = 0;

    for (const bot of this.bots) {
      if (bot.bananas <= 0) {
        continue;
      }
      const maxVotes = Math.min(5, bot.bananas);
      const votes = randomInt(1, maxVotes, this.rng);
      bot.bananas -= votes;

      const pick = randomInt(0, 2, this.rng);
      if (pick === 0) optionAVotes += votes;
      else if (pick === 1) optionBVotes += votes;
      else optionCVotes += votes;
    }

    const totalVotes = optionAVotes + optionBVotes + optionCVotes;
    const weightedVotes: Array<{ index: 0 | 1 | 2; votes: number }> = [
      { index: 0, votes: optionAVotes },
      { index: 1, votes: optionBVotes },
      { index: 2, votes: optionCVotes },
    ];
    const winningOptionIndex: 0 | 1 | 2 =
      totalVotes === 0
        ? weightedVotes[randomInt(0, weightedVotes.length - 1, this.rng)].index
        : (() => {
            let roll = this.rng() * totalVotes;
            for (const bucket of weightedVotes) {
              roll -= bucket.votes;
              if (roll <= 0) {
                return bucket.index;
              }
            }
            return 2;
          })();

    const optionALabel = this.getOptionLabel(optionA);
    const optionBLabel = this.getOptionLabel(optionB);
    const optionCLabel = this.getOptionLabel(optionC);
    const winnerLabel =
      winningOptionIndex === 0
        ? optionALabel
        : winningOptionIndex === 1
          ? optionBLabel
          : optionCLabel;

    return {
      category: "mixed",
      optionA,
      optionB,
      optionC,
      winningOptionIndex,
      voteSplit: {
        optionA: optionAVotes,
        optionB: optionBVotes,
        optionC: optionCVotes,
      },
      summary: `VOTE (W/M/A): ${optionAVotes}-${optionBVotes}-${optionCVotes}. Applied: ${winnerLabel}`,
    };
  }

  private buildVoteOption(
    category: VoteCategory,
    redHealth: number,
    blueHealth: number,
  ): VoteOption {
    if (category === "arena") {
      const avgHealth = Math.round((redHealth + blueHealth) / 2);
      const desiredQuality = getDesiredQualityFromHealth(avgHealth);
      const arena = chooseByQuality(ARENA_CATALOG, desiredQuality, this.rng);
      return {
        category: "arena",
        option: {
          arena,
          qualityScore: arena.quality,
          label: arena.label,
        },
      };
    }

    if (category === "weapon") {
      return this.buildTwoFoldOption(
        "weapon",
        WEAPON_CATALOG,
        redHealth,
        blueHealth,
      );
    }

    return this.buildTwoFoldOption(
      "modifier",
      MODIFIER_CATALOG,
      redHealth,
      blueHealth,
    );
  }

  private buildTwoFoldOption<T extends Weapon | BallModifier>(
    category: "weapon" | "modifier",
    catalog: CatalogEntry<T>[],
    redHealth: number,
    blueHealth: number,
  ): VoteOption {
    const desiredRedQuality = getDesiredQualityFromHealth(redHealth);
    const desiredBlueQuality = getDesiredQualityFromHealth(blueHealth);

    let bestOption: {
      red: CatalogEntry<T>;
      blue: CatalogEntry<T>;
      score: number;
      disparity: number;
    } | null = null;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const red = chooseByQuality(catalog, desiredRedQuality, this.rng);
      const blue = chooseByQuality(catalog, desiredBlueQuality, this.rng);
      const score = red.quality + blue.quality;
      const disparity = Math.abs(red.quality - blue.quality);

      if (!bestOption || disparity < bestOption.disparity) {
        bestOption = { red, blue, score, disparity };
      }
      if (disparity <= 1) {
        break;
      }
    }

    if (!bestOption) {
      throw new Error("Failed to build vote option.");
    }

    const label = `Blue ${bestOption.blue.label}, Red ${bestOption.red.label}`;

    if (category === "weapon") {
      return {
        category: "weapon",
        option: {
          red: bestOption.red as CatalogEntry<Weapon>,
          blue: bestOption.blue as CatalogEntry<Weapon>,
          qualityScore: bestOption.score,
          label,
        },
      };
    }

    return {
      category: "modifier",
      option: {
        red: bestOption.red as CatalogEntry<BallModifier>,
        blue: bestOption.blue as CatalogEntry<BallModifier>,
        qualityScore: bestOption.score,
        label,
      },
    };
  }

  private toVoteApplication(option: VoteOption): VoteApplication {
    if (option.category === "arena") {
      return {
        category: "arena",
        arena: option.option.arena.create,
        label: option.option.label,
        icons: [option.option.arena.icon],
      };
    }

    if (option.category === "weapon") {
      return {
        category: "weapon",
        red: option.option.red.create,
        blue: option.option.blue.create,
        label: option.option.label,
        icons: [option.option.blue.icon, option.option.red.icon],
      };
    }

    return {
      category: "modifier",
      red: option.option.red.create,
      blue: option.option.blue.create,
      label: option.option.label,
      icons: [option.option.blue.icon, option.option.red.icon],
    };
  }

  private getOptionLabel(option: VoteOption): string {
    if (option.category === "arena") {
      return option.option.label;
    }
    return option.option.label;
  }

  private createMicroBets(): PlacedMicroBet[] {
    const bets: PlacedMicroBet[] = [];
    for (const bot of this.bots) {
      if (bot.bananas <= 0 || this.rng() > 0.55) {
        continue;
      }

      const stake = randomInt(1, Math.min(5, bot.bananas), this.rng);
      const kindPool: MicroBetKind[] = [
        "redDamageToBlue",
        "blueDamageToRed",
        "redWallHits",
        "blueWallHits",
        "ballCollisions",
      ];
      const kind = kindPool[randomInt(0, kindPool.length - 1, this.rng)];
      const outcome = this.rng() < 0.5;

      bot.bananas -= stake;
      bets.push({
        botId: bot.id,
        kind,
        outcome,
        stake,
      });
    }
    return bets;
  }

  private settleMicroBets(windowStats: StatTotals): void {
    if (this.pendingMicroBets.length === 0) {
      this.latestMicrobetSummary = "No microbets to settle this interval.";
      this.pushLog(this.latestMicrobetSummary);
      return;
    }

    let winners = 0;
    for (const bet of this.pendingMicroBets) {
      const bot = this.bots.find((b) => b.id === bet.botId);
      if (!bot) {
        continue;
      }

      const won = didMicrobetWin(bet.kind, bet.outcome, windowStats);
      if (won) {
        bot.bananas += bet.stake * 2;
        winners += 1;
      }
    }

    this.latestMicrobetSummary = `${winners}/${this.pendingMicroBets.length} microbets won in the last interval.`;
    this.pushLog(this.latestMicrobetSummary);
    this.pendingMicroBets = [];
  }

  private resolveTimeWinner(redHealth: number, blueHealth: number): BallId {
    if (redHealth === blueHealth) {
      return this.rng() < 0.5 ? "red" : "blue";
    }
    return redHealth > blueHealth ? "red" : "blue";
  }

  private finishRound(
    winner: BallId,
    reason: RoundResult["reason"],
    input: EngineStepInput,
  ): RoundResult {
    this.settleMicroBets(this.intervalStatsTotals);

    for (const bot of this.bots) {
      if (!bot.mainBet) {
        continue;
      }
      if (bot.mainBet.side === winner) {
        bot.bananas += bot.mainBet.stake * 2;
      }
      bot.mainBet = null;
    }

    this.roundFinished = true;
    if (this.roundNumber >= this.config.totalRounds) {
      this.tournamentFinished = true;
    }

    const redHp = Math.round(input.redHealth);
    const blueHp = Math.round(input.blueHealth);
    this.pushLog(
      `Round ${this.roundNumber} finished. Winner: ${winner.toUpperCase()} (${reason}, HP ${redHp}-${blueHp}).`,
    );

    return {
      winner,
      reason,
    };
  }

  private pushLog(message: string): void {
    this.latestLog = [message, ...this.latestLog].slice(0, 8);
  }
}
