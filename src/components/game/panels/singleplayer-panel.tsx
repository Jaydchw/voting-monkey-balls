"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Gear,
  Lightning,
  Wall,
  ArrowsLeftRight,
  Sword,
  Target,
  ArrowCounterClockwise,
  TrendUp,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { BotsGameEngine } from "@/bots/engine";
import type {
  BallId,
  EngineSnapshot,
  MicroBetKind,
  MicroBetInsight,
  StatTotals,
  VoteWindow,
} from "@/bots/types";
import type { GameApi } from "@/components/game/arena/game-board";
import type { ActiveModifier } from "@/components/game/hud/battle-bar";
import { HealthBars } from "@/components/game/hud/health-bars";
import { ArenaBoard } from "@/components/game/arena/arena-board";
import { BotStandings } from "@/components/game/standings/bot-standings";
import { type AppliedEffect } from "@/components/game/standings/activity-feed";
import { BotBetsTable } from "@/components/game/standings/bot-bets-table";
import { Button } from "@/components/ui/button";
import { BananaInline } from "@/components/ui/banana-inline";
import { MatchDashboardShell } from "@/components/game/layout/match-dashboard-shell";
import {
  MicrobetsModal,
  PrematchBetModal,
  VoteEventModal,
  VoteRevealModal,
} from "@/components/game/modals";
import {
  MicrobetSettlementModal,
  type SettlementEntry,
} from "@/components/game/modals/microbet-settlement-modal";
import { CharacterSelectModal } from "@/components/game/modals/character-select-modal";
import { CharacterAvatar } from "@/components/game/character/character-avatar";
import type {
  MainBetSelection,
  MicrobetDraft,
  PendingPlayerMicrobet,
  RevealedVoteOption,
} from "@/components/game/modals/types";
import { GamePanelBase } from "@/components/game/panels/game-panel-base";
import type { GameAudioController } from "@/lib/game-audio";
import {
  TournamentLeaderboard,
  type LeaderboardEntry,
} from "@/components/game/tournament-leaderboard";
import { RoundWinScreen } from "@/components/game/round-win-screen";

const STARTING_HEALTH = 100;
const STARTING_BANANAS = 100;
const MAIN_BET_MIN_STAKE = 20;
const DEFAULT_SINGLEPLAYER_BOTS = 0;
const VOTE_REVEAL_HOLD_MS = 3000;

type BetResult = { won: boolean; pnl: number };
type MatchPhase =
  | "character-select"
  | "prematch"
  | "running"
  | "vote"
  | "reveal"
  | "settlement"
  | "microbet"
  | "round-end-settlement";

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

function didMicrobetWin(
  kind: MicroBetKind,
  outcome: boolean,
  delta: StatTotals,
): boolean {
  if (kind === "redDamageToBlue")
    return outcome
      ? delta.blueDamageTaken > delta.redDamageTaken
      : delta.blueDamageTaken <= delta.redDamageTaken;
  if (kind === "blueDamageToRed")
    return outcome
      ? delta.redDamageTaken > delta.blueDamageTaken
      : delta.redDamageTaken <= delta.blueDamageTaken;
  if (kind === "redWallHits")
    return outcome
      ? delta.wallHitsRed > delta.wallHitsBlue
      : delta.wallHitsRed <= delta.wallHitsBlue;
  if (kind === "blueWallHits")
    return outcome
      ? delta.wallHitsBlue > delta.wallHitsRed
      : delta.wallHitsBlue <= delta.wallHitsRed;
  return outcome ? delta.ballCollisions >= 10 : delta.ballCollisions < 10;
}

type SingleplayerPanelProps = {
  initialBotCount?: number;
  characterSelectEnabled?: boolean;
};

export default function SingleplayerPanel(props: SingleplayerPanelProps) {
  return (
    <GamePanelBase>
      {(audioCtrlRef) => (
        <SingleplayerPanelInner {...props} audioCtrlRef={audioCtrlRef} />
      )}
    </GamePanelBase>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
          {icon} {label}
        </span>
        <span className="text-[10px] font-black tabular-nums">
          {Math.round(value)}
        </span>
      </div>
      <div className="h-2 bg-zinc-200 border-2 border-black overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

function SingleplayerPanelInner({
  initialBotCount = DEFAULT_SINGLEPLAYER_BOTS,
  characterSelectEnabled = true,
  audioCtrlRef,
}: SingleplayerPanelProps & {
  audioCtrlRef: React.MutableRefObject<GameAudioController | null>;
}) {
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
  const [phase, setPhase] = useState<MatchPhase>(
    characterSelectEnabled ? "character-select" : "prematch",
  );
  const [phaseCountdown, setPhaseCountdown] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[]
  >([]);
  const [showWinScreen, setShowWinScreen] = useState(false);

  const [liveStats, setLiveStats] = useState<StatTotals>(createZeroTotals());

  const playerCharacterRef = useRef<{ svgType: string; color: string } | null>(
    null,
  );
  const [playerCharacter, setPlayerCharacter] = useState<{
    svgType: string;
    color: string;
  } | null>(null);

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
  const phaseRef = useRef<MatchPhase>(
    characterSelectEnabled ? "character-select" : "prematch",
  );
  const phaseCountdownRef = useRef(0);

  const [playerBananas, setPlayerBananas] = useState(STARTING_BANANAS);
  const [prevPlayerBananas, setPrevPlayerBananas] = useState(STARTING_BANANAS);
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

  const [settlementEntries, setSettlementEntries] = useState<SettlementEntry[]>(
    [],
  );
  const [settlementNet, setSettlementNet] = useState(0);

  const lastVoteStatsRef = useRef<StatTotals | null>(null);
  const pendingRoundAdvanceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (snapshot.roundNumber > 1) {
      void audioCtrlRef.current?.loadRound(snapshot.roundNumber);
    }
  }, [audioCtrlRef, snapshot.roundNumber]);

  const prevPhaseRef = useRef<MatchPhase>(
    characterSelectEnabled ? "character-select" : "prematch",
  );
  useEffect(() => {
    if (phase === "running" && prevPhaseRef.current !== "running") {
      audioCtrlRef.current?.setPaused(false);
      audioCtrlRef.current?.startTracks(2);
    } else if (phase !== "running" && prevPhaseRef.current === "running") {
      audioCtrlRef.current?.setPaused(true);
    }
    prevPhaseRef.current = phase;
  }, [phase, audioCtrlRef]);

  const snapshotLeaderboardEntries = useCallback((): LeaderboardEntry[] => {
    const char = playerCharacterRef.current;
    const playerEntry: LeaderboardEntry = {
      id: "player",
      name: "You",
      bananas: playerBananasRef.current,
      characterSvg: char?.svgType,
      characterColor: char?.color,
      isPlayer: true,
    };
    const botEntries: LeaderboardEntry[] = engine
      .getSnapshot()
      .leaderboard.map((bot) => ({
        id: bot.id,
        name: bot.name,
        bananas: bot.bananas,
      }));
    const all = [playerEntry, ...botEntries];
    all.sort((a, b) => b.bananas - a.bananas);
    return all;
  }, [engine]);

  const settlePlayerMicrobets = useCallback(
    (currentTotals: StatTotals): SettlementEntry[] => {
      const last = lastVoteStatsRef.current;
      const active = activeMicrobetsRef.current;
      if (!last || active.length === 0) return [];

      const delta: StatTotals = {
        redDamageTaken: currentTotals.redDamageTaken - last.redDamageTaken,
        blueDamageTaken: currentTotals.blueDamageTaken - last.blueDamageTaken,
        wallHitsRed: currentTotals.wallHitsRed - last.wallHitsRed,
        wallHitsBlue: currentTotals.wallHitsBlue - last.wallHitsBlue,
        ballCollisions: currentTotals.ballCollisions - last.ballCollisions,
      };

      const entries: SettlementEntry[] = [];
      let payoutTotal = 0;

      for (const bet of active) {
        const won = didMicrobetWin(bet.kind, bet.outcome, delta);
        const payout = won ? bet.stake * 2 : 0;
        payoutTotal += payout;
        entries.push({
          kind: bet.kind,
          outcome: bet.outcome,
          stake: bet.stake,
          payout,
          won,
        });
      }

      if (payoutTotal > 0) {
        setPrevPlayerBananas(playerBananasRef.current);
        playerBananasRef.current += payoutTotal;
        setPlayerBananas(playerBananasRef.current);
      }

      setLastMicrobetSettlements(
        entries.map((e) => ({
          label: `${MICROBET_KIND_LABEL[e.kind]}: ${e.outcome ? "YES" : "NO"}`,
          won: e.won,
          payout: e.payout,
        })),
      );

      activeMicrobetsRef.current = [];
      setActiveMicrobets([]);
      return entries;
    },
    [],
  );

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
      if (!gameApiRef.current) return;
      if (application.category === "arena") {
        const arena = application.arena();
        gameApiRef.current.addArenaModifier(arena);
        if (application.label === "Circle Arena") setIsCircleArena(true);
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

  const clearAllTimers = useCallback(() => {
    if (roundAdvanceTimeoutRef.current) {
      clearTimeout(roundAdvanceTimeoutRef.current);
      roundAdvanceTimeoutRef.current = null;
    }
    if (voteRevealTimeoutRef.current) {
      clearTimeout(voteRevealTimeoutRef.current);
      voteRevealTimeoutRef.current = null;
    }
  }, []);

  const resetBoardState = useCallback(() => {
    setGameKey((v) => v + 1);
    setRedHealth(STARTING_HEALTH);
    setBlueHealth(STARTING_HEALTH);
    healthRef.current = { red: STARTING_HEALTH, blue: STARTING_HEALTH };
    previousHealthRef.current = { red: STARTING_HEALTH, blue: STARTING_HEALTH };
    statsTotalsRef.current = createZeroTotals();
    setLiveStats(createZeroTotals());
    forcedWinnerRef.current = undefined;
    setRoundWinner(null);
    setShowWinScreen(false);
    setIsCircleArena(false);
    setAppliedEffects([]);
    setRedModifiers([]);
    setBlueModifiers([]);
    setRedWeapons([]);
    setBlueWeapons([]);
    gameApiRef.current = null;
  }, []);

  const resetBetState = useCallback(() => {
    currentBetRef.current = null;
    roundBetSettledRef.current = false;
    setMainBetSelection({ side: "blue", stake: MAIN_BET_MIN_STAKE });
    setCurrentBet(null);
    setMainBetResult(null);
  }, []);

  const resetVoteState = useCallback(() => {
    setVoteWindow(null);
    setVoteSelection(null);
    setVotePowerStake(1);
    setPickedVoteOptionIndex(null);
    setRevealedVoteOption(null);
  }, []);

  const resetMicrobetState = useCallback(() => {
    setMicrobetInsights([]);
    setMicrobetDraft({ kind: "redDamageToBlue", outcome: true, stake: 5 });
    setQueuedMicrobets([]);
    activeMicrobetsRef.current = [];
    setActiveMicrobets([]);
    setLastMicrobetSettlements([]);
    setSettlementEntries([]);
    setSettlementNet(0);
    lastVoteStatsRef.current = null;
    pendingRoundAdvanceRef.current = null;
  }, []);

  const resetBoardForNextRound = useCallback(() => {
    clearAllTimers();
    resetBoardState();
    resetBetState();
    resetVoteState();
    resetMicrobetState();
    transitionPhase("prematch", 0);
  }, [
    clearAllTimers,
    resetBoardState,
    resetBetState,
    resetVoteState,
    resetMicrobetState,
    transitionPhase,
  ]);

  const restartSingleplayerMatch = useCallback(() => {
    clearAllTimers();
    const nextEngine = new BotsGameEngine({ botCount: initialBotCount });
    setEngine(nextEngine);
    setSnapshot(nextEngine.getSnapshot());
    resetBoardState();
    setPrevPlayerBananas(STARTING_BANANAS);
    playerBananasRef.current = STARTING_BANANAS;
    setPlayerBananas(STARTING_BANANAS);
    resetBetState();
    resetVoteState();
    resetMicrobetState();
    setShowLeaderboard(false);
    setLeaderboardEntries([]);
    transitionPhase(
      characterSelectEnabled ? "character-select" : "prematch",
      0,
    );
  }, [
    clearAllTimers,
    initialBotCount,
    characterSelectEnabled,
    resetBoardState,
    resetBetState,
    resetVoteState,
    resetMicrobetState,
    transitionPhase,
  ]);

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

  const handleCharacterConfirm = useCallback(
    (value: { svgType: string; color: string }) => {
      playerCharacterRef.current = value;
      setPlayerCharacter(value);
      transitionPhase("prematch", 0);
    },
    [transitionPhase],
  );

  const handleMainBetPlace = useCallback(() => {
    if (phaseRef.current !== "prematch") return;
    if (mainBetSelection.stake < MAIN_BET_MIN_STAKE) return;
    if (playerBananasRef.current < mainBetSelection.stake) return;
    setPrevPlayerBananas(playerBananasRef.current);
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

  const resolveVoteAndShowReveal = useCallback(
    (selection: 0 | 1 | 2, playerVotes: number) => {
      const spend = Math.max(0, Math.floor(playerVotes));
      if (spend > 0) {
        if (playerBananasRef.current < spend) return;
        setPrevPlayerBananas(playerBananasRef.current);
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
        audioCtrlRef.current?.startTracks(2);
      }
      setSnapshot(engine.getSnapshot());
      setVoteWindow(null);
      setVotePowerStake(1);
      transitionPhase("reveal", 0);

      if (voteRevealTimeoutRef.current)
        clearTimeout(voteRevealTimeoutRef.current);
      voteRevealTimeoutRef.current = setTimeout(() => {
        setMicrobetInsights(engine.getPendingMicrobetInsights());
        setQueuedMicrobets([]);
        setMicrobetDraft({ kind: "redDamageToBlue", outcome: true, stake: 5 });
        transitionPhase("microbet", 0);
        voteRevealTimeoutRef.current = null;
      }, VOTE_REVEAL_HOLD_MS);
    },
    [applyVoteApplication, audioCtrlRef, engine, transitionPhase],
  );

  const handleVoteCast = useCallback(
    (selection: 0 | 1 | 2) => {
      if (phaseRef.current !== "vote") return;
      setVoteSelection(selection);
      resolveVoteAndShowReveal(selection, votePowerStake);
    },
    [resolveVoteAndShowReveal, votePowerStake],
  );

  const handleSettlementContinue = useCallback(() => {
    if (phaseRef.current === "round-end-settlement") {
      const advance = pendingRoundAdvanceRef.current;
      pendingRoundAdvanceRef.current = null;
      setSettlementEntries([]);
      setSettlementNet(0);
      if (advance) advance();
    } else {
      transitionPhase("vote", 0);
    }
  }, [transitionPhase]);

  const handleMicrobetAdd = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, playerBananasRef.current - queuedTotal);
      const stake = Math.min(remaining, microbetDraft.stake);
      if (stake <= 0) return prev;
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          kind: microbetDraft.kind,
          outcome: microbetDraft.outcome,
          stake,
          odds: 2,
        },
      ];
    });
  }, [microbetDraft]);

  const handleMicrobetQuickAdd = useCallback((draft: MicrobetDraft) => {
    if (phaseRef.current !== "microbet") return;
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, playerBananasRef.current - queuedTotal);
      const stake = Math.min(remaining, draft.stake);
      if (stake <= 0) return prev;
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          kind: draft.kind,
          outcome: draft.outcome,
          stake,
          odds: 2,
        },
      ];
    });
  }, []);

  const handleMicrobetRemove = useCallback((id: string) => {
    if (phaseRef.current !== "microbet") return;
    setQueuedMicrobets((prev) => prev.filter((bet) => bet.id !== id));
  }, []);

  const handleMicrobetConfirm = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    const totalStake = queuedMicrobets.reduce((sum, bet) => sum + bet.stake, 0);
    if (totalStake > playerBananasRef.current) return;
    if (totalStake > 0) {
      setPrevPlayerBananas(playerBananasRef.current);
      playerBananasRef.current -= totalStake;
      setPlayerBananas(playerBananasRef.current);
    }
    activeMicrobetsRef.current = queuedMicrobets;
    setActiveMicrobets(queuedMicrobets);
    setQueuedMicrobets([]);
    lastVoteStatsRef.current = { ...statsTotalsRef.current };
    transitionPhase("running", 0);
  }, [queuedMicrobets, transitionPhase]);

  const handleMicrobetSkip = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    setQueuedMicrobets([]);
    lastVoteStatsRef.current = { ...statsTotalsRef.current };
    transitionPhase("running", 0);
  }, [transitionPhase]);

  useEffect(() => {
    if (gameApiRef.current) gameApiRef.current.setPaused(phase !== "running");
  }, [phase]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats({ ...statsTotalsRef.current });

      if (phaseRef.current !== "running") return;

      const stepResult = engine.step({
        redHealth: healthRef.current.red,
        blueHealth: healthRef.current.blue,
        statsTotals: statsTotalsRef.current,
        forcedWinner: forcedWinnerRef.current,
        pauseOnVote: true,
      });

      if (stepResult.voteWindow) {
        const currentTotals = statsTotalsRef.current;
        const entries = settlePlayerMicrobets(currentTotals);
        const net = entries.reduce(
          (sum, e) => sum + (e.won ? e.stake : -e.stake),
          0,
        );
        lastVoteStatsRef.current = { ...currentTotals };
        setSettlementEntries(entries);
        setSettlementNet(net);
        setVoteWindow(stepResult.voteWindow);
        setVoteSelection(null);
        setVotePowerStake(1);
        setPickedVoteOptionIndex(null);
        setRevealedVoteOption(null);
        if (entries.length > 0) transitionPhase("settlement", 0);
        else transitionPhase("vote", 0);
      }

      setSnapshot(stepResult.snapshot);

      if (stepResult.roundResult && !roundBetSettledRef.current) {
        roundBetSettledRef.current = true;
        const currentTotals = statsTotalsRef.current;
        const entries = settlePlayerMicrobets(currentTotals);
        const net = entries.reduce(
          (sum, e) => sum + (e.won ? e.stake : -e.stake),
          0,
        );
        setRoundWinner(stepResult.roundResult.winner);
        setShowWinScreen(true);

        if (currentBetRef.current) {
          const bet = currentBetRef.current;
          const won = bet.side === stepResult.roundResult.winner;
          const payout = won ? bet.stake * 2 : 0;
          const pnl = bet.stake;
          setPrevPlayerBananas(playerBananasRef.current);
          playerBananasRef.current = Math.max(
            0,
            playerBananasRef.current + payout,
          );
          setPlayerBananas(playerBananasRef.current);
          setMainBetResult({ won, pnl });
        }

        const doAdvance = () => {
          const nextSnapshot = engine.startNextRound();
          resetBoardForNextRound();
          if (nextSnapshot) setSnapshot(nextSnapshot);
        };

        if (entries.length > 0) {
          setSettlementEntries(entries);
          setSettlementNet(net);
          pendingRoundAdvanceRef.current = doAdvance;
          roundAdvanceTimeoutRef.current = setTimeout(() => {
            setShowWinScreen(false);
            transitionPhase("round-end-settlement", 0);
            roundAdvanceTimeoutRef.current = null;
          }, 2500);
        } else if (!stepResult.snapshot.tournamentFinished) {
          roundAdvanceTimeoutRef.current = setTimeout(() => {
            doAdvance();
            roundAdvanceTimeoutRef.current = null;
          }, 2500);
        } else {
          roundAdvanceTimeoutRef.current = setTimeout(() => {
            setShowWinScreen(false);
            setLeaderboardEntries(snapshotLeaderboardEntries());
            setShowLeaderboard(true);
            roundAdvanceTimeoutRef.current = null;
          }, 2500);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [
    engine,
    resetBoardForNextRound,
    settlePlayerMicrobets,
    snapshotLeaderboardEntries,
    transitionPhase,
  ]);

  const hasBots = snapshot.bots.length > 0;
  const maxDamage = Math.max(
    liveStats.redDamageTaken,
    liveStats.blueDamageTaken,
    1,
  );

  const leftPanelContent = (
    <div className="flex flex-col gap-4">
      <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-black text-white px-3 py-2 flex items-center gap-2">
          {playerCharacter ? (
            <div className="border-2 border-white/30 shrink-0">
              <CharacterAvatar
                svgType={playerCharacter.svgType}
                color={playerCharacter.color}
                size={36}
              />
            </div>
          ) : (
            <div className="w-9 h-9 bg-zinc-700 border-2 border-zinc-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              You
            </p>
            <p className="text-sm font-black uppercase truncate">Player</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x-4 divide-black border-t-4 border-black">
          <div className="p-2.5 bg-yellow-300 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-yellow-900 mb-0.5">
              Bank
            </p>
            <motion.p
              key={playerBananas}
              className="text-lg font-black tabular-nums"
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
            >
              {playerBananas}
            </motion.p>
            <p className="text-[8px] font-bold text-yellow-800">🍌</p>
          </div>
          <div className="p-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
              Phase
            </p>
            <p className="text-xs font-black uppercase truncate">{phase}</p>
          </div>
          <div className="p-2.5 text-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
              Round
            </p>
            <p className="text-lg font-black">
              {snapshot.roundNumber}/{snapshot.roundsTotal}
            </p>
          </div>
        </div>
      </div>

      <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
        <div className="px-3 py-2 border-b-4 border-black bg-zinc-50 flex items-center gap-2">
          <Target size={14} weight="fill" className="text-zinc-600" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Live Round Stats
          </p>
        </div>
        <div className="p-3 flex flex-col gap-2.5">
          <StatBar
            label="Red Dmg Taken"
            value={liveStats.redDamageTaken}
            max={maxDamage}
            color="bg-red-500"
            icon={<Sword size={9} weight="fill" className="text-red-500" />}
          />
          <StatBar
            label="Blue Dmg Taken"
            value={liveStats.blueDamageTaken}
            max={maxDamage}
            color="bg-primary"
            icon={<Sword size={9} weight="fill" className="text-blue-600" />}
          />
          <div className="border-t-2 border-zinc-100 pt-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
                <Wall size={9} weight="fill" className="text-red-400" /> Red
                Walls
              </span>
              <span className="text-xs font-black tabular-nums bg-red-100 border border-red-200 px-1.5 py-0.5">
                {liveStats.wallHitsRed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
                <Wall size={9} weight="fill" className="text-blue-400" /> Blue
                Walls
              </span>
              <span className="text-xs font-black tabular-nums bg-blue-100 border border-blue-200 px-1.5 py-0.5">
                {liveStats.wallHitsBlue}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
                <ArrowsLeftRight
                  size={9}
                  weight="fill"
                  className="text-yellow-500"
                />{" "}
                Collisions
              </span>
              <span className="text-xs font-black tabular-nums bg-yellow-100 border border-yellow-200 px-1.5 py-0.5">
                {liveStats.ballCollisions}
              </span>
            </div>
          </div>
        </div>
      </div>

      {currentBet && (
        <div
          className={`border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden`}
        >
          <div
            className={`px-3 py-2 border-b-4 border-black ${currentBet.side === "red" ? "bg-red-500" : "bg-primary"}`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-white/80">
              Main Bet
            </p>
          </div>
          <div className="p-3 bg-white">
            <p
              className={`text-lg font-black uppercase ${currentBet.side === "red" ? "text-red-600" : "text-blue-600"}`}
            >
              {currentBet.side.toUpperCase()}
            </p>
            <BananaInline className="text-sm font-black">
              {currentBet.stake}
            </BananaInline>
            <AnimatePresence mode="wait">
              {mainBetResult && (
                <motion.div
                  key={mainBetResult.won ? "win" : "loss"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-2 px-2 py-1.5 border-4 border-black text-center font-black uppercase text-sm ${mainBetResult.won ? "bg-green-400 text-black" : "bg-red-200 text-black"}`}
                >
                  {mainBetResult.won
                    ? `WIN +${mainBetResult.pnl} 🍌`
                    : `LOSS -${mainBetResult.pnl}`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {activeMicrobets.length > 0 && (
        <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
          <div className="px-3 py-2 border-b-4 border-black bg-orange-400">
            <p className="text-[9px] font-black uppercase tracking-widest">
              Active Microbets ({activeMicrobets.length})
            </p>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {activeMicrobets.slice(0, 4).map((bet, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-2 py-1 border-l-4 text-[9px] font-black uppercase ${bet.outcome ? "border-green-400 bg-green-50" : "border-red-300 bg-red-50"}`}
              >
                <span className="truncate">
                  {MICROBET_KIND_LABEL[bet.kind]}
                </span>
                <span className="shrink-0 ml-1">
                  {bet.outcome ? "YES" : "NO"} · {bet.stake}🍌
                </span>
              </div>
            ))}
            {activeMicrobets.length > 4 && (
              <p className="text-[9px] font-black uppercase text-zinc-400 text-center">
                +{activeMicrobets.length - 4} more
              </p>
            )}
          </div>
        </div>
      )}

      {lastMicrobetSettlements.length > 0 && (
        <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
          <div className="px-3 py-2 border-b-4 border-black bg-zinc-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1">
              <Lightning size={9} weight="fill" /> Last Settlement
            </p>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {lastMicrobetSettlements.map((entry, i) => (
                <motion.div
                  key={`${entry.label}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center justify-between px-2 py-1 border-l-4 text-[9px] font-black ${entry.won ? "border-green-400 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-700"}`}
                >
                  <span className="truncate">
                    {entry.label.split(":")[1]?.trim() ?? entry.label}
                  </span>
                  <span>{entry.won ? `+${entry.payout}🍌` : "✗"}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {hasBots && (
        <BotStandings
          leaderboard={snapshot.leaderboard}
          latestLog={snapshot.latestLog}
        />
      )}
    </div>
  );

  return (
    <>
      {showLeaderboard && (
        <TournamentLeaderboard
          entries={leaderboardEntries}
          onPlayAgain={restartSingleplayerMatch}
          onExit={() => (window.location.href = "/")}
        />
      )}

      {showWinScreen && !showLeaderboard && (
        <RoundWinScreen
          winner={roundWinner}
          roundNumber={snapshot.roundNumber}
          roundsTotal={snapshot.roundsTotal}
          isFinal={snapshot.tournamentFinished}
        />
      )}

      <CharacterSelectModal
        open={phase === "character-select"}
        playerName="Player"
        onConfirm={handleCharacterConfirm}
      />

      <MatchDashboardShell
        header={
          <div className="pt-10 mb-6">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Round {snapshot.roundNumber} of {snapshot.roundsTotal}
                </p>
                {(() => {
                  const t = snapshot.timeLeftSeconds;
                  const isUrgent = t <= 30 && t > 0;
                  const isCritical = t <= 10 && t > 0;
                  const mm = Math.floor(t / 60)
                    .toString()
                    .padStart(2, "0");
                  const ss = (t % 60).toString().padStart(2, "0");
                  return (
                    <motion.div
                      key={`${isCritical}-${isUrgent}`}
                      className={`font-black tabular-nums text-3xl sm:text-4xl leading-none px-5 py-1.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isCritical ? "bg-red-500 text-white" : isUrgent ? "bg-orange-400 text-black" : "bg-yellow-300 text-black"}`}
                      animate={
                        isCritical
                          ? { scale: [1, 1.07, 1] }
                          : isUrgent
                            ? { scale: [1, 1.03, 1] }
                            : { scale: 1 }
                      }
                      transition={
                        isCritical
                          ? { duration: 0.42, repeat: Infinity }
                          : isUrgent
                            ? { duration: 0.85, repeat: Infinity }
                            : {}
                      }
                    >
                      {mm}:{ss}
                    </motion.div>
                  );
                })()}
              </div>
            </div>
          </div>
        }
        leftPanel={leftPanelContent}
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
            <div className="mt-6">
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
            </div>

            {snapshot.tournamentFinished && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="mt-5 w-full border-4 border-black bg-yellow-300 py-3 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
              >
                <span className="text-2xl font-black uppercase">
                  Tournament Complete
                </span>
              </motion.div>
            )}
          </div>
        }
        rightPanel={
          <div className="flex flex-col gap-4">
            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-3 py-2 border-b-4 border-black bg-zinc-900 text-white flex items-center gap-2">
                <Gear size={14} weight="fill" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Match Controls
                </p>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                <Link href="/singleplayer">
                  <Button
                    variant="outline"
                    className="border-4 border-black rounded-none font-black uppercase text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
                  >
                    Settings
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-4 border-black rounded-none font-black uppercase text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] flex items-center gap-1"
                  onClick={restartSingleplayerMatch}
                >
                  <ArrowCounterClockwise size={12} weight="fill" /> Restart
                </Button>
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-3 py-2 border-b-4 border-black bg-violet-500 text-white flex items-center gap-2">
                <Lightning size={14} weight="fill" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Latest Vote
                </p>
              </div>
              <div className="p-3">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={snapshot.latestVoteSummary ?? "no-vote"}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-zinc-700 leading-relaxed"
                  >
                    {snapshot.latestVoteSummary ?? "Voting starts at 01:50."}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {microbetInsights.length > 0 && (
              <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
                <div className="px-3 py-2 border-b-4 border-black bg-orange-400 flex items-center gap-2">
                  <TrendUp size={14} weight="fill" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Open Microbets
                  </p>
                </div>
                <div className="p-2 flex flex-col gap-1">
                  {microbetInsights.map((insight, i) => {
                    const kindLabels: Record<string, string> = {
                      redDamageToBlue: "Red outdmg Blue",
                      blueDamageToRed: "Blue outdmg Red",
                      redWallHits: "Red wall hits",
                      blueWallHits: "Blue wall hits",
                      ballCollisions: "Collisions 10+",
                    };
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2 py-1.5 border-l-4 border-orange-300 bg-orange-50"
                      >
                        <span className="text-[10px] font-black uppercase text-zinc-700">
                          {kindLabels[insight.kind] ?? insight.kind}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-black text-zinc-500">
                            {insight.count} bet{insight.count !== 1 ? "s" : ""}
                          </span>
                          <span className="text-[10px] font-black bg-orange-200 border border-orange-300 px-1.5 py-0.5 text-orange-800">
                            {insight.totalStake}🍌
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {appliedEffects.length > 0 && (
              <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
                <div className="px-3 py-2 border-b-4 border-black bg-cyan-400 flex items-center gap-2">
                  <Target size={14} weight="fill" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Applied Effects
                  </p>
                </div>
                <div className="p-2 flex flex-col gap-1">
                  <AnimatePresence initial={false}>
                    {appliedEffects.map((effect, i) => (
                      <motion.div
                        key={`${effect.label}-${i}`}
                        initial={{ opacity: 0, x: -8, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 px-2 py-1.5 border-l-4 border-cyan-400 bg-cyan-50"
                      >
                        <div className="flex items-center gap-1 shrink-0">
                          {effect.icons.map((IconComp, j) => (
                            <IconComp key={j} size={12} weight="bold" />
                          ))}
                        </div>
                        <span className="text-xs font-black uppercase text-zinc-700 truncate">
                          {effect.label}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {hasBots && <BotBetsTable bots={snapshot.bots} />}
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

      <MicrobetSettlementModal
        open={phase === "settlement" || phase === "round-end-settlement"}
        settlements={settlementEntries}
        netChange={settlementNet}
        totalBananas={playerBananas}
        onContinue={handleSettlementContinue}
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
    </>
  );
}
