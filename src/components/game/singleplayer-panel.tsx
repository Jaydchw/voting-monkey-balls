"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gear, TrendUp } from "@phosphor-icons/react";
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
import { Button } from "@/components/ui/button";
import {
  BananaInline,
  MatchDashboardShell,
  MicrobetsModal,
  PrematchBetModal,
  VoteEventModal,
  VoteRevealModal,
} from "./panels";
import type {
  MainBetSelection,
  MicrobetDraft,
  PendingPlayerMicrobet,
  RevealedVoteOption,
} from "./panels/betting-types";
import { GameAudioController } from "@/lib/game-audio";

const STARTING_HEALTH = 100;
const STARTING_BANANAS = 100;
const MAIN_BET_MIN_STAKE = 20;
const DEFAULT_SINGLEPLAYER_BOTS = 0;

type BetResult = { won: boolean; pnl: number };
type MatchPhase = "prematch" | "running" | "vote" | "reveal" | "microbet";

const MICROBET_KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red deals damage to Blue",
  blueDamageToRed: "Blue deals damage to Red",
  redWallHits: "Red wall hits",
  blueWallHits: "Blue wall hits",
  ballCollisions: "Collisions reach 10+",
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

function calcBooleanOdds(kind: MicroBetKind): number {
  const probabilityByKind: Record<MicroBetKind, number> = {
    redDamageToBlue: 0.5,
    blueDamageToRed: 0.5,
    redWallHits: 0.5,
    blueWallHits: 0.5,
    ballCollisions: 0.45,
  };
  return Number((0.92 / probabilityByKind[kind]).toFixed(2));
}

function didMicrobetWin(
  kind: MicroBetKind,
  outcome: boolean,
  delta: StatTotals,
): boolean {
  if (kind === "redDamageToBlue") {
    return outcome
      ? delta.blueDamageTaken > delta.redDamageTaken
      : delta.blueDamageTaken <= delta.redDamageTaken;
  }
  if (kind === "blueDamageToRed") {
    return outcome
      ? delta.redDamageTaken > delta.blueDamageTaken
      : delta.redDamageTaken <= delta.blueDamageTaken;
  }
  if (kind === "redWallHits") {
    return outcome
      ? delta.wallHitsRed > delta.wallHitsBlue
      : delta.wallHitsRed <= delta.wallHitsBlue;
  }
  if (kind === "blueWallHits") {
    return outcome
      ? delta.wallHitsBlue > delta.wallHitsRed
      : delta.wallHitsBlue <= delta.wallHitsRed;
  }
  return outcome ? delta.ballCollisions >= 10 : delta.ballCollisions < 10;
}

type SingleplayerPanelProps = {
  initialBotCount?: number;
};

export default function SingleplayerPanel({
  initialBotCount = DEFAULT_SINGLEPLAYER_BOTS,
}: SingleplayerPanelProps) {
  const [engine, setEngine] = useState(
    () => new BotsGameEngine({ botCount: initialBotCount }),
  );
  const gameApiRef = useRef<GameApi | null>(null);

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
  const [phaseCountdown, setPhaseCountdown] = useState(0);

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
  const voteRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const phaseRef = useRef<MatchPhase>("prematch");
  const phaseCountdownRef = useRef(0);

  const [playerBananas, setPlayerBananas] = useState(STARTING_BANANAS);
  const playerBananasRef = useRef(STARTING_BANANAS);

  const [mainBetSelection, setMainBetSelection] = useState<MainBetSelection>({
    side: "blue",
    stake: MAIN_BET_MIN_STAKE,
  });
  const [currentBet, setCurrentBet] = useState<MainBetSelection | null>(null);
  const [mainBetResult, setMainBetResult] = useState<BetResult | null>(null);

  const currentBetRef = useRef<MainBetSelection | null>(null);
  const roundBetSettledRef = useRef(false);

  const [voteWindow, setVoteWindow] = useState<VoteWindow | null>(null);
  const [voteSelection, setVoteSelection] = useState<0 | 1 | 2 | null>(null);
  const [votePowerStake, setVotePowerStake] = useState(1);
  const [pickedVoteOptionIndex, setPickedVoteOptionIndex] = useState<
    0 | 1 | 2 | null
  >(null);
  const [revealedVoteOption, setRevealedVoteOption] =
    useState<RevealedVoteOption | null>(null);

  const [microbetInsights, setMicrobetInsights] = useState<MicroBetInsight[]>(
    [],
  );
  const [microbetDraft, setMicrobetDraft] = useState<MicrobetDraft>({
    kind: "redDamageToBlue",
    outcome: true,
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

  const audioCtrlRef = useRef<GameAudioController | null>(null);

  useEffect(() => {
    audioCtrlRef.current = new GameAudioController();
    return () => {
      audioCtrlRef.current?.dispose();
    };
  }, []);

  const lastRoundLoaded = useRef(0);
  useEffect(() => {
    if (snapshot.roundNumber !== lastRoundLoaded.current) {
      lastRoundLoaded.current = snapshot.roundNumber;
      void audioCtrlRef.current?.loadRound(snapshot.roundNumber);
    }
  }, [snapshot.roundNumber]);

  const prevPhaseRef = useRef<MatchPhase>("prematch");
  useEffect(() => {
    if (phase === "running" && prevPhaseRef.current !== "running") {
      audioCtrlRef.current?.setPaused(false);
      audioCtrlRef.current?.startTracks(2);
    } else if (phase !== "running" && prevPhaseRef.current === "running") {
      audioCtrlRef.current?.setPaused(true);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

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
      const won = didMicrobetWin(bet.kind, bet.outcome, delta);
      const payout = won ? Math.floor(bet.stake * bet.odds) : 0;
      payoutTotal += payout;
      settlements.push({
        label: `${MICROBET_KIND_LABEL[bet.kind]}: ${bet.outcome ? "YES" : "NO"}`,
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
    [engine],
  );

  const resetBoardForNextRound = useCallback(() => {
    if (voteRevealTimeoutRef.current) {
      clearTimeout(voteRevealTimeoutRef.current);
      voteRevealTimeoutRef.current = null;
    }

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

    currentBetRef.current = null;
    roundBetSettledRef.current = false;
    setMainBetSelection({ side: "blue", stake: MAIN_BET_MIN_STAKE });
    setCurrentBet(null);
    setMainBetResult(null);

    setVoteWindow(null);
    setVoteSelection(null);
    setVotePowerStake(1);
    setPickedVoteOptionIndex(null);
    setRevealedVoteOption(null);

    setMicrobetInsights([]);
    setMicrobetDraft({ kind: "redDamageToBlue", outcome: true, stake: 5 });
    setQueuedMicrobets([]);
    activeMicrobetsRef.current = [];
    setActiveMicrobets([]);
    setLastMicrobetSettlements([]);
    lastVoteStatsRef.current = null;

    transitionPhase("prematch", 0);
  }, [transitionPhase]);

  const restartSingleplayerMatch = useCallback(() => {
    if (voteRevealTimeoutRef.current) {
      clearTimeout(voteRevealTimeoutRef.current);
      voteRevealTimeoutRef.current = null;
    }

    const nextEngine = new BotsGameEngine({ botCount: initialBotCount });
    setEngine(nextEngine);
    setSnapshot(nextEngine.getSnapshot());

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

    playerBananasRef.current = STARTING_BANANAS;
    setPlayerBananas(STARTING_BANANAS);
    currentBetRef.current = null;
    roundBetSettledRef.current = false;
    setMainBetSelection({ side: "blue", stake: MAIN_BET_MIN_STAKE });
    setCurrentBet(null);
    setMainBetResult(null);

    setVoteWindow(null);
    setVoteSelection(null);
    setVotePowerStake(1);
    setPickedVoteOptionIndex(null);
    setRevealedVoteOption(null);

    setMicrobetInsights([]);
    setMicrobetDraft({ kind: "redDamageToBlue", outcome: true, stake: 5 });
    setQueuedMicrobets([]);
    activeMicrobetsRef.current = [];
    setActiveMicrobets([]);
    setLastMicrobetSettlements([]);
    lastVoteStatsRef.current = null;

    transitionPhase("prematch", 0);
  }, [initialBotCount, transitionPhase]);

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
    (selection: 0 | 1 | 2, playerVotes: number) => {
      if (selection === null) {
        return;
      }

      const spend = Math.max(0, Math.floor(playerVotes));
      if (spend > 0) {
        if (playerBananasRef.current < spend) {
          return;
        }
        playerBananasRef.current -= spend;
        setPlayerBananas(playerBananasRef.current);
      }

      setPickedVoteOptionIndex(selection);

      const resolved = engine.resolvePendingVote(selection, spend);
      if (resolved.application) {
        applyVoteApplication(resolved.application);
        setRevealedVoteOption({
          category: resolved.application.category,
          label: resolved.application.label,
        });
      }
      setSnapshot(engine.getSnapshot());

      setVoteWindow(null);
      setVotePowerStake(1);
      transitionPhase("reveal", 0);

      if (voteRevealTimeoutRef.current) {
        clearTimeout(voteRevealTimeoutRef.current);
      }
      voteRevealTimeoutRef.current = setTimeout(() => {
        setMicrobetInsights(engine.getPendingMicrobetInsights());
        setQueuedMicrobets([]);
        setMicrobetDraft({
          kind: "redDamageToBlue",
          outcome: true,
          stake: 5,
        });
        transitionPhase("microbet", 0);
        voteRevealTimeoutRef.current = null;
      }, 2100);
    },
    [applyVoteApplication, engine, transitionPhase],
  );

  const handleVoteCast = useCallback(
    (selection: 0 | 1 | 2) => {
      if (phaseRef.current !== "vote") return;
      setVoteSelection(selection);
      resolveVoteAndOpenMicrobet(selection, votePowerStake);
    },
    [resolveVoteAndOpenMicrobet, votePowerStake],
  );

  const handleMicrobetAdd = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    const odds = calcBooleanOdds(microbetDraft.kind);
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
        outcome: microbetDraft.outcome,
        stake,
        odds,
      };
      return [...prev, bet];
    });
  }, [microbetDraft]);

  const handleMicrobetQuickAdd = useCallback((draft: MicrobetDraft) => {
    if (phaseRef.current !== "microbet") return;
    const odds = calcBooleanOdds(draft.kind);
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
        outcome: draft.outcome,
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
    return () => {
      if (roundAdvanceTimeoutRef.current) {
        clearTimeout(roundAdvanceTimeoutRef.current);
      }
      if (voteRevealTimeoutRef.current) {
        clearTimeout(voteRevealTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (phaseRef.current !== "running") {
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
        setVoteSelection(null);
        setVotePowerStake(1);
        setPickedVoteOptionIndex(null);
        setRevealedVoteOption(null);
        transitionPhase("vote", 0);
      }

      setSnapshot(stepResult.snapshot);

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
  const hasBots = snapshot.bots.length > 0;

  return (
    <>
      <MatchDashboardShell
        reserveLeftSpace
        header={
          <RoundHeader
            roundNumber={snapshot.roundNumber}
            roundsTotal={snapshot.roundsTotal}
            timeLeftSeconds={snapshot.timeLeftSeconds}
          />
        }
        leftPanel={
          hasBots ? (
            <BotStandings
              leaderboard={snapshot.leaderboard}
              latestLog={snapshot.latestLog}
            />
          ) : undefined
        }
        centerPanel={
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

            <div className="mt-5 grid w-full grid-cols-1 gap-4 border-t border-zinc-200 pt-4 lg:ml-20 lg:grid-cols-3">
              <div className="px-2 py-1">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
                  Your <BananaInline>Bananas</BananaInline>
                </p>
                <p className="text-3xl font-black tabular-nums">
                  <BananaInline iconSize={18}>{playerBananas}</BananaInline>
                </p>
                <p className="mt-2 text-xs font-black uppercase text-zinc-700">
                  Phase: {phase}
                </p>
              </div>

              <div className="px-2 py-1 lg:border-l lg:border-zinc-200">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
                  Main Bet
                </p>
                {currentBet ? (
                  <p className="text-sm font-black uppercase">
                    {currentBet.side} -{" "}
                    <BananaInline>{currentBet.stake}</BananaInline>
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
              </div>

              <div className="px-2 py-1 lg:border-l lg:border-zinc-200">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
                  Active Microbets
                </p>
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-zinc-700">
                  <TrendUp size={14} weight="fill" /> Live
                </p>
                <p className="text-sm font-black uppercase">
                  {activeMicrobets.length} running
                </p>
                {lastMicrobetSettlements.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-700">
                    Last interval:{" "}
                    {lastMicrobetSettlements.filter((item) => item.won).length}{" "}
                    / {lastMicrobetSettlements.length} won
                  </p>
                ) : null}
              </div>
            </div>

            {roundWinner ? (
              <div className="mt-5 w-full rounded-2xl border border-black/15 bg-white/90 py-3 text-center shadow-[0_14px_32px_-20px_rgba(0,0,0,0.45)]">
                <span
                  className="text-2xl font-black uppercase"
                  style={{
                    color: roundWinner === "red" ? "#b91c1c" : "#1d4ed8",
                  }}
                >
                  {roundWinner.toUpperCase()} wins this round
                </span>
              </div>
            ) : null}

            {snapshot.tournamentFinished ? (
              <div className="mt-5 w-full rounded-2xl border border-amber-900/20 bg-yellow-200/90 py-3 text-center shadow-[0_14px_32px_-20px_rgba(0,0,0,0.45)]">
                <span className="text-2xl font-black uppercase">
                  Tournament Complete
                </span>
              </div>
            ) : null}
          </div>
        }
        rightPanel={
          <div className="flex flex-col gap-6">
            <div className="border-t border-zinc-200 px-2 pt-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
                <Gear size={14} weight="fill" /> Match Controls
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/singleplayer">
                  <Button
                    variant="outline"
                    className="rounded-xl border-black/15 font-semibold uppercase"
                  >
                    Match Settings
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="rounded-xl border-black/15 font-semibold uppercase"
                  onClick={restartSingleplayerMatch}
                >
                  Restart Match
                </Button>
              </div>
            </div>

            <ActivityFeed
              latestVoteSummary={snapshot.latestVoteSummary}
              latestMicrobetSummary={snapshot.latestMicrobetSummary}
              appliedEffects={appliedEffects}
            />
            {hasBots ? <BotBetsTable bots={snapshot.bots} /> : null}
          </div>
        }
      />

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

      <VoteRevealModal
        open={phase === "reveal"}
        countdown={phaseCountdown}
        pickedOptionIndex={pickedVoteOptionIndex}
        revealedOption={revealedVoteOption}
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

      <div className="mx-auto mt-6 max-w-475 px-6 md:px-10">
        <div className="border-t border-zinc-200 p-4">
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
              Queued stake total:{" "}
              <BananaInline>{queuedStakeTotal}</BananaInline>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
