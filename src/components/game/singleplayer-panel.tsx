"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BotsGameEngine } from "@/bots/engine";
import type {
  BallId,
  EngineSnapshot,
  MicroBetKind,
  MicroBetInsight,
  StatTotals,
  VoteWindow,
} from "@/bots/types";
import type { GameApi } from "@/components/game/game-board";
import type { ActiveModifier } from "./panels/battle-bar";
import { RoundHeader } from "./panels/round-header";
import { HealthBars } from "./panels/health-bars";
import { ArenaBoard } from "./panels/arena-board";
import { BotStandings } from "./panels/bot-standings";
import { ActivityFeed, type AppliedEffect } from "./panels/activity-feed";
import { BotBetsTable } from "./panels/bot-bets-table";
import { Card } from "@/components/ui/card";
import { PrematchBetModal } from "./panels/prematch-bet-modal";
import { VoteEventModal } from "./panels/vote-event-modal";
import { MicrobetsModal } from "./panels/microbets-modal";
import type {
  MainBetSelection,
  MicrobetDraft,
  PendingPlayerMicrobet,
} from "./panels/betting-types";

const STARTING_HEALTH = 100;
const STARTING_BANANAS = 100;
const PREMATCH_WINDOW_SECONDS = 10;
const VOTE_WINDOW_SECONDS = 10;
const MICROBET_WINDOW_SECONDS = 10;
const MAIN_BET_MIN_STAKE = 20;

type BetResult = { won: boolean; pnl: number };
type MatchPhase = "prematch" | "running" | "vote" | "microbet";

const MICROBET_KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red deals damage to Blue",
  blueDamageToRed: "Blue deals damage to Red",
  redWallHits: "Red wall hits",
  blueWallHits: "Blue wall hits",
  ballCollisions: "Ball collisions",
};

const MICROBET_METRIC_CAP: Record<MicroBetKind, number> = {
  redDamageToBlue: 40,
  blueDamageToRed: 40,
  redWallHits: 20,
  blueWallHits: 20,
  ballCollisions: 20,
};

function createZeroTotals(): StatTotals {
  return {
    redDamageTaken: 0,
    blueDamageTaken: 0,
    wallHitsRed: 0,
    wallHitsBlue: 0,
    ballCollisions: 0,
  };
}

function calcRangeOdds(kind: MicroBetKind, min: number, max: number): number {
  const cap = MICROBET_METRIC_CAP[kind];
  const width = Math.max(1, max - min + 1);
  const probability = Math.min(0.95, Math.max(0.05, width / (cap + 1)));
  return Number((0.92 / probability).toFixed(2));
}

function getMicrobetActual(kind: MicroBetKind, delta: StatTotals): number {
  if (kind === "redDamageToBlue") {
    return delta.blueDamageTaken;
  }
  if (kind === "blueDamageToRed") {
    return delta.redDamageTaken;
  }
  if (kind === "redWallHits") {
    return delta.wallHitsRed;
  }
  if (kind === "blueWallHits") {
    return delta.wallHitsBlue;
  }
  return delta.ballCollisions;
}

export default function SingleplayerPanel() {
  const [engine] = useState(() => new BotsGameEngine());
  const gameApiRef = useRef<GameApi | null>(null);

  // Engine / game state
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(
    engine.getSnapshot(),
  );
  const [redHealth, setRedHealth] = useState(STARTING_HEALTH);
  const [blueHealth, setBlueHealth] = useState(STARTING_HEALTH);
  const [roundWinner, setRoundWinner] = useState<BallId | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [isCircleArena, setIsCircleArena] = useState(false);
  const [appliedEffects, setAppliedEffects] = useState<AppliedEffect[]>([]);
  const [redModifiers, setRedModifiers] = useState<ActiveModifier[]>([]);
  const [blueModifiers, setBlueModifiers] = useState<ActiveModifier[]>([]);
  const [redWeapons, setRedWeapons] = useState<ActiveModifier[]>([]);
  const [blueWeapons, setBlueWeapons] = useState<ActiveModifier[]>([]);
  const [phase, setPhase] = useState<MatchPhase>("prematch");
  const [phaseCountdown, setPhaseCountdown] = useState(PREMATCH_WINDOW_SECONDS);

  // Health / stats refs
  const healthRef = useRef({ red: STARTING_HEALTH, blue: STARTING_HEALTH });
  const previousHealthRef = useRef({
    red: STARTING_HEALTH,
    blue: STARTING_HEALTH,
  });
  const statsTotalsRef = useRef<StatTotals>(createZeroTotals());
  const forcedWinnerRef = useRef<BallId | undefined>(undefined);
  const roundAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const phaseRef = useRef<MatchPhase>("prematch");
  const phaseCountdownRef = useRef(PREMATCH_WINDOW_SECONDS);

  // Player bananas
  const [playerBananas, setPlayerBananas] = useState(STARTING_BANANAS);
  const playerBananasRef = useRef(STARTING_BANANAS);

  // Main bet state (pre-match only)
  const [mainBetSelection, setMainBetSelection] = useState<MainBetSelection>({
    side: "red",
    stake: MAIN_BET_MIN_STAKE,
  });
  const [currentBet, setCurrentBet] = useState<MainBetSelection | null>(null);
  const [mainBetResult, setMainBetResult] = useState<BetResult | null>(null);

  const currentBetRef = useRef<MainBetSelection | null>(null);
  const roundBetSettledRef = useRef(false);

  // Vote popup state
  const [voteWindow, setVoteWindow] = useState<VoteWindow | null>(null);
  const [voteSelection, setVoteSelection] = useState<0 | 1>(0);
  const [votePowerStake, setVotePowerStake] = useState(0);

  // Microbet state
  const [microbetInsights, setMicrobetInsights] = useState<MicroBetInsight[]>(
    [],
  );
  const [microbetDraft, setMicrobetDraft] = useState<MicrobetDraft>({
    kind: "redDamageToBlue",
    min: 0,
    max: 8,
    stake: 5,
  });
  const [queuedMicrobets, setQueuedMicrobets] = useState<
    PendingPlayerMicrobet[]
  >([]);
  const [activeMicrobets, setActiveMicrobets] = useState<
    PendingPlayerMicrobet[]
  >([]);
  const activeMicrobetsRef = useRef<PendingPlayerMicrobet[]>([]);
  const [lastMicrobetSettlements, setLastMicrobetSettlements] = useState<
    Array<{ label: string; won: boolean; payout: number }>
  >([]);

  const lastVoteStatsRef = useRef<StatTotals | null>(null);

  const settlePlayerMicrobets = useCallback((currentTotals: StatTotals) => {
    const last = lastVoteStatsRef.current;
    const active = activeMicrobetsRef.current;
    if (!last || active.length === 0) {
      return;
    }

    const delta: StatTotals = {
      redDamageTaken: currentTotals.redDamageTaken - last.redDamageTaken,
      blueDamageTaken: currentTotals.blueDamageTaken - last.blueDamageTaken,
      wallHitsRed: currentTotals.wallHitsRed - last.wallHitsRed,
      wallHitsBlue: currentTotals.wallHitsBlue - last.wallHitsBlue,
      ballCollisions: currentTotals.ballCollisions - last.ballCollisions,
    };

    const settlements: Array<{ label: string; won: boolean; payout: number }> =
      [];
    let payoutTotal = 0;

    for (const bet of active) {
      const actual = getMicrobetActual(bet.kind, delta);
      const won = actual >= bet.min && actual <= bet.max;
      const payout = won ? Math.floor(bet.stake * bet.odds) : 0;
      payoutTotal += payout;
      settlements.push({
        label: `${MICROBET_KIND_LABEL[bet.kind]} (${bet.min}-${bet.max})`,
        won,
        payout,
      });
    }

    if (payoutTotal > 0) {
      playerBananasRef.current += payoutTotal;
      setPlayerBananas(playerBananasRef.current);
    }

    setLastMicrobetSettlements(settlements);
    activeMicrobetsRef.current = [];
    setActiveMicrobets([]);
  }, []);

  const transitionPhase = useCallback((next: MatchPhase, seconds: number) => {
    phaseRef.current = next;
    phaseCountdownRef.current = seconds;
    setPhase(next);
    setPhaseCountdown(seconds);
  }, []);

  const applyVoteApplication = useCallback(
    (
      application: NonNullable<
        ReturnType<typeof engine.resolvePendingVote>["application"]
      >,
    ) => {
      if (!gameApiRef.current) {
        return;
      }

      if (application.category === "arena") {
        const arena = application.arena();
        gameApiRef.current.addArenaModifier(arena);
        if (application.label === "Circle Arena") {
          setIsCircleArena(true);
        }
      }

      if (application.category === "weapon") {
        const redW = application.red();
        const blueW = application.blue();
        gameApiRef.current.addWeapon("red", redW);
        gameApiRef.current.addWeapon("blue", blueW);
        setRedWeapons((p) => [
          ...p,
          { name: redW.name, icon: redW.icon, quality: redW.quality },
        ]);
        setBlueWeapons((p) => [
          ...p,
          { name: blueW.name, icon: blueW.icon, quality: blueW.quality },
        ]);
      }

      if (application.category === "modifier") {
        const redM = application.red();
        const blueM = application.blue();
        gameApiRef.current.addModifier("red", redM);
        gameApiRef.current.addModifier("blue", blueM);
        setRedModifiers((p) => [
          ...p,
          { name: redM.name, icon: redM.icon, quality: redM.quality },
        ]);
        setBlueModifiers((p) => [
          ...p,
          { name: blueM.name, icon: blueM.icon, quality: blueM.quality },
        ]);
      }

      setAppliedEffects((prev) =>
        [
          {
            label: application.label,
            category: application.category,
            icons: application.icons,
          },
          ...prev,
        ].slice(0, 6),
      );
    },
    [],
  );

  const resetBoardForNextRound = useCallback(() => {
    setGameKey((v) => v + 1);
    setRedHealth(STARTING_HEALTH);
    setBlueHealth(STARTING_HEALTH);
    healthRef.current = { red: STARTING_HEALTH, blue: STARTING_HEALTH };
    previousHealthRef.current = { red: STARTING_HEALTH, blue: STARTING_HEALTH };
    statsTotalsRef.current = createZeroTotals();
    forcedWinnerRef.current = undefined;
    setRoundWinner(null);
    setIsCircleArena(false);
    setAppliedEffects([]);
    setRedModifiers([]);
    setBlueModifiers([]);
    setRedWeapons([]);
    setBlueWeapons([]);
    gameApiRef.current = null;

    // Reset main bet
    currentBetRef.current = null;
    roundBetSettledRef.current = false;
    setMainBetSelection({ side: "red", stake: MAIN_BET_MIN_STAKE });
    setCurrentBet(null);
    setMainBetResult(null);

    // Reset vote popup
    setVoteWindow(null);
    setVoteSelection(0);
    setVotePowerStake(0);

    // Reset microbet
    setMicrobetInsights([]);
    setMicrobetDraft({ kind: "redDamageToBlue", min: 0, max: 8, stake: 5 });
    setQueuedMicrobets([]);
    activeMicrobetsRef.current = [];
    setActiveMicrobets([]);
    setLastMicrobetSettlements([]);
    lastVoteStatsRef.current = null;

    transitionPhase("prematch", PREMATCH_WINDOW_SECONDS);
  }, [transitionPhase]);

  const handleGameReady = useCallback((api: GameApi) => {
    gameApiRef.current = api;
    api.setPaused(phaseRef.current !== "running");
  }, []);

  const handleRedHealthChange = useCallback((value: number) => {
    const previous = previousHealthRef.current.red;
    if (value < previous)
      statsTotalsRef.current.redDamageTaken += previous - value;
    previousHealthRef.current.red = value;
    healthRef.current.red = value;
    setRedHealth(value);
  }, []);

  const handleBlueHealthChange = useCallback((value: number) => {
    const previous = previousHealthRef.current.blue;
    if (value < previous)
      statsTotalsRef.current.blueDamageTaken += previous - value;
    previousHealthRef.current.blue = value;
    healthRef.current.blue = value;
    setBlueHealth(value);
  }, []);

  const handleWallCollision = useCallback((ballId: BallId) => {
    if (ballId === "red") statsTotalsRef.current.wallHitsRed += 1;
    else statsTotalsRef.current.wallHitsBlue += 1;
  }, []);

  const handleBallCollision = useCallback(() => {
    statsTotalsRef.current.ballCollisions += 1;
  }, []);

  const handleBallDied = useCallback((deadBall: BallId) => {
    forcedWinnerRef.current = deadBall === "red" ? "blue" : "red";
  }, []);

  const handleMainBetPlace = useCallback(() => {
    if (phaseRef.current !== "prematch") return;
    if (mainBetSelection.stake < MAIN_BET_MIN_STAKE) return;
    if (playerBananasRef.current < mainBetSelection.stake) return;

    playerBananasRef.current -= mainBetSelection.stake;
    setPlayerBananas(playerBananasRef.current);

    const bet: MainBetSelection = { ...mainBetSelection };
    currentBetRef.current = bet;
    setCurrentBet(bet);
    transitionPhase("running", 0);
  }, [mainBetSelection, transitionPhase]);

  const handleMainBetSkip = useCallback(() => {
    if (phaseRef.current !== "prematch") return;
    transitionPhase("running", 0);
  }, [transitionPhase]);

  const resolveVoteAndOpenMicrobet = useCallback(
    (playerVotes: number) => {
      const spend = Math.max(0, Math.floor(playerVotes));
      if (spend > 0) {
        if (playerBananasRef.current < spend) {
          return;
        }
        playerBananasRef.current -= spend;
        setPlayerBananas(playerBananasRef.current);
      }

      const resolved = engine.resolvePendingVote(voteSelection, spend);
      if (resolved.application) {
        applyVoteApplication(resolved.application);
      }
      setSnapshot(engine.getSnapshot());

      setVoteWindow(null);
      setVotePowerStake(0);

      setMicrobetInsights(engine.getPendingMicrobetInsights());
      setQueuedMicrobets([]);
      setMicrobetDraft({ kind: "redDamageToBlue", min: 0, max: 8, stake: 5 });

      transitionPhase("microbet", MICROBET_WINDOW_SECONDS);
    },
    [applyVoteApplication, engine, transitionPhase, voteSelection],
  );

  const handleVoteCast = useCallback(() => {
    if (phaseRef.current !== "vote") return;
    resolveVoteAndOpenMicrobet(votePowerStake);
  }, [resolveVoteAndOpenMicrobet, votePowerStake]);

  const handleMicrobetAdd = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    const odds = calcRangeOdds(
      microbetDraft.kind,
      microbetDraft.min,
      microbetDraft.max,
    );
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, playerBananasRef.current - queuedTotal);
      const stake = Math.min(remaining, microbetDraft.stake);
      if (stake <= 0) {
        return prev;
      }

      const bet: PendingPlayerMicrobet = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        kind: microbetDraft.kind,
        min: microbetDraft.min,
        max: microbetDraft.max,
        stake,
        odds,
      };
      return [...prev, bet];
    });
  }, [microbetDraft]);

  const handleMicrobetQuickAdd = useCallback((draft: MicrobetDraft) => {
    if (phaseRef.current !== "microbet") return;
    const odds = calcRangeOdds(draft.kind, draft.min, draft.max);
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, playerBananasRef.current - queuedTotal);
      const stake = Math.min(remaining, draft.stake);
      if (stake <= 0) {
        return prev;
      }

      const bet: PendingPlayerMicrobet = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        kind: draft.kind,
        min: draft.min,
        max: draft.max,
        stake,
        odds,
      };
      return [...prev, bet];
    });
  }, []);

  const handleMicrobetRemove = useCallback((id: string) => {
    if (phaseRef.current !== "microbet") return;
    setQueuedMicrobets((prev) => prev.filter((bet) => bet.id !== id));
  }, []);

  const handleMicrobetConfirm = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    const totalStake = queuedMicrobets.reduce((sum, bet) => sum + bet.stake, 0);
    if (totalStake > playerBananasRef.current) {
      return;
    }

    if (totalStake > 0) {
      playerBananasRef.current -= totalStake;
      setPlayerBananas(playerBananasRef.current);
    }

    activeMicrobetsRef.current = queuedMicrobets;
    setActiveMicrobets(queuedMicrobets);
    setQueuedMicrobets([]);
    transitionPhase("running", 0);
  }, [queuedMicrobets, transitionPhase]);

  const handleMicrobetSkip = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    setQueuedMicrobets([]);
    transitionPhase("running", 0);
  }, [transitionPhase]);

  useEffect(() => {
    if (gameApiRef.current) {
      gameApiRef.current.setPaused(phase !== "running");
    }
  }, [phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseRef.current === "prematch") {
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) {
          transitionPhase("running", 0);
        }
        return;
      }

      if (phaseRef.current === "vote") {
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) {
          resolveVoteAndOpenMicrobet(0);
        }
        return;
      }

      if (phaseRef.current === "microbet") {
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) {
          transitionPhase("running", 0);
        }
        return;
      }

      const stepResult = engine.step({
        redHealth: healthRef.current.red,
        blueHealth: healthRef.current.blue,
        statsTotals: statsTotalsRef.current,
        forcedWinner: forcedWinnerRef.current,
        pauseOnVote: true,
      });

      if (stepResult.voteWindow) {
        const cur = statsTotalsRef.current;
        settlePlayerMicrobets(cur);

        lastVoteStatsRef.current = {
          redDamageTaken: cur.redDamageTaken,
          blueDamageTaken: cur.blueDamageTaken,
          wallHitsRed: cur.wallHitsRed,
          wallHitsBlue: cur.wallHitsBlue,
          ballCollisions: cur.ballCollisions,
        };

        setVoteWindow(stepResult.voteWindow);
        setVoteSelection(0);
        setVotePowerStake(0);
        transitionPhase("vote", VOTE_WINDOW_SECONDS);
      }

      setSnapshot(stepResult.snapshot);

      // Settle main bet on round end
      if (stepResult.roundResult && !roundBetSettledRef.current) {
        roundBetSettledRef.current = true;
        settlePlayerMicrobets(statsTotalsRef.current);
        setRoundWinner(stepResult.roundResult.winner);
        if (currentBetRef.current) {
          const bet = currentBetRef.current;
          const won = bet.side === stepResult.roundResult.winner;
          const payout = won ? bet.stake * 2 : 0;
          const pnl = won ? bet.stake : bet.stake;
          playerBananasRef.current = Math.max(
            0,
            playerBananasRef.current + payout,
          );
          setPlayerBananas(playerBananasRef.current);
          setMainBetResult({ won, pnl });
        }
      }

      if (
        stepResult.roundResult &&
        !stepResult.snapshot.tournamentFinished &&
        !roundAdvanceTimeoutRef.current
      ) {
        roundAdvanceTimeoutRef.current = setTimeout(() => {
          const nextSnapshot = engine.startNextRound();
          resetBoardForNextRound();
          if (nextSnapshot) setSnapshot(nextSnapshot);
          roundAdvanceTimeoutRef.current = null;
        }, 4000);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (roundAdvanceTimeoutRef.current) {
        clearTimeout(roundAdvanceTimeoutRef.current);
        roundAdvanceTimeoutRef.current = null;
      }
    };
  }, [
    applyVoteApplication,
    engine,
    resetBoardForNextRound,
    resolveVoteAndOpenMicrobet,
    settlePlayerMicrobets,
    transitionPhase,
  ]);

  const queuedStakeTotal = queuedMicrobets.reduce(
    (sum, bet) => sum + bet.stake,
    0,
  );

  return (
    <div className="w-screen min-h-screen bg-white text-black p-6 md:p-10">
      <div className="max-w-475 mx-auto">
        <RoundHeader
          roundNumber={snapshot.roundNumber}
          roundsTotal={snapshot.roundsTotal}
          timeLeftSeconds={snapshot.timeLeftSeconds}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[280px_auto_320px] gap-6">
          <BotStandings
            leaderboard={snapshot.leaderboard}
            latestLog={snapshot.latestLog}
          />

          <div className="flex flex-col items-center">
            <HealthBars
              redHealth={redHealth}
              blueHealth={blueHealth}
              redModifiers={redModifiers}
              blueModifiers={blueModifiers}
              redWeapons={redWeapons}
              blueWeapons={blueWeapons}
            />

            <ArenaBoard
              gameKey={gameKey}
              isCircleArena={isCircleArena}
              onRedHealthChange={handleRedHealthChange}
              onBlueHealthChange={handleBlueHealthChange}
              onBallDied={handleBallDied}
              onGameReady={handleGameReady}
              onWallCollision={handleWallCollision}
              onBallCollision={handleBallCollision}
            />

            <div className="mt-5 w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-yellow-300">
                <p className="text-xs font-black uppercase tracking-widest mb-1">
                  Your Bananas
                </p>
                <p className="text-3xl font-black tabular-nums">
                  {playerBananas}
                </p>
                <p className="text-xs mt-2 uppercase font-black text-zinc-700">
                  Phase: {phase}
                </p>
              </Card>

              <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase tracking-widest mb-2">
                  Main Bet
                </p>
                {currentBet ? (
                  <p className="text-sm font-black uppercase">
                    {currentBet.side} - {currentBet.stake} bananas
                  </p>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No main bet this round.
                  </p>
                )}
                {mainBetResult && (
                  <p className="mt-2 text-sm font-black uppercase">
                    {mainBetResult.won
                      ? `Win +${mainBetResult.pnl}`
                      : `Loss -${mainBetResult.pnl}`}
                  </p>
                )}
              </Card>

              <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase tracking-widest mb-2">
                  Active Microbets
                </p>
                <p className="text-sm font-black uppercase">
                  {activeMicrobets.length} running
                </p>
                {lastMicrobetSettlements.length > 0 && (
                  <p className="text-xs text-zinc-700 mt-2">
                    Last interval:{" "}
                    {lastMicrobetSettlements.filter((item) => item.won).length}{" "}
                    / {lastMicrobetSettlements.length} won
                  </p>
                )}
              </Card>
            </div>

            {roundWinner && (
              <div className="mt-5 w-full border-4 border-black py-3 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <span
                  className="text-2xl font-black uppercase"
                  style={{
                    color: roundWinner === "red" ? "#b91c1c" : "#1d4ed8",
                  }}
                >
                  {roundWinner.toUpperCase()} wins this round
                </span>
              </div>
            )}

            {snapshot.tournamentFinished && (
              <div className="mt-5 w-full border-4 border-black py-3 text-center bg-yellow-300 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <span className="text-2xl font-black uppercase">
                  Tournament Complete
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <ActivityFeed
              latestVoteSummary={snapshot.latestVoteSummary}
              latestMicrobetSummary={snapshot.latestMicrobetSummary}
              appliedEffects={appliedEffects}
            />
            <BotBetsTable bots={snapshot.bots} />
          </div>
        </div>

        <PrematchBetModal
          open={phase === "prematch"}
          countdown={phaseCountdown}
          redHealth={redHealth}
          blueHealth={blueHealth}
          bananas={playerBananas}
          selected={mainBetSelection}
          minStake={MAIN_BET_MIN_STAKE}
          onSelectSide={(side) =>
            setMainBetSelection((prev) => ({ ...prev, side }))
          }
          onSelectStake={(stake) =>
            setMainBetSelection((prev) => ({ ...prev, stake }))
          }
          onConfirm={handleMainBetPlace}
          onSkip={handleMainBetSkip}
        />

        <VoteEventModal
          open={phase === "vote"}
          countdown={phaseCountdown}
          redHealth={redHealth}
          blueHealth={blueHealth}
          bananas={playerBananas}
          voteWindow={voteWindow}
          selection={voteSelection}
          votePower={votePowerStake}
          onSelectOption={setVoteSelection}
          onVotePowerChange={setVotePowerStake}
          onConfirm={handleVoteCast}
        />

        <MicrobetsModal
          open={phase === "microbet"}
          countdown={phaseCountdown}
          redHealth={redHealth}
          blueHealth={blueHealth}
          bananas={playerBananas}
          insights={microbetInsights}
          draft={microbetDraft}
          placedBets={queuedMicrobets}
          onDraftChange={setMicrobetDraft}
          onAddBet={handleMicrobetAdd}
          onAddQuickBet={handleMicrobetQuickAdd}
          onRemoveBet={handleMicrobetRemove}
          onConfirm={handleMicrobetConfirm}
          onSkip={handleMicrobetSkip}
        />

        <Card className="mt-6 border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
          <p className="text-xs font-black uppercase tracking-widest mb-2">
            Recent microbet results
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {lastMicrobetSettlements.map((entry, index) => (
              <p key={`${entry.label}-${index}`} className="text-xs">
                {entry.won ? "Win" : "Loss"} - {entry.label}
                {entry.won ? ` (+${entry.payout})` : ""}
              </p>
            ))}
            {lastMicrobetSettlements.length === 0 && (
              <p className="text-xs text-zinc-600">
                Place interval microbets to see settlement results here.
              </p>
            )}
          </div>
          {phase === "microbet" && queuedStakeTotal > 0 && (
            <p className="text-xs font-black uppercase mt-3">
              Queued stake total: {queuedStakeTotal} bananas
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
