"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PartySocket from "partysocket";
import { CopySimple, ShareNetwork } from "@phosphor-icons/react";
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
import type { ActiveModifier } from "@/components/game/panels/battle-bar";
import { RoundHeader } from "@/components/game/panels/round-header";
import { HealthBars } from "@/components/game/panels/health-bars";
import { ArenaBoard } from "@/components/game/panels/arena-board";
import { BotStandings } from "@/components/game/panels/bot-standings";
import {
  ActivityFeed,
  type AppliedEffect,
} from "@/components/game/panels/activity-feed";
import { BotBetsTable } from "@/components/game/panels/bot-bets-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getSocketProtocol,
  PARTYKIT_HOST,
  PARTYKIT_PARTY,
} from "@/lib/multiplayer";
import type {
  ClientEnvelope,
  HostBroadcastState,
  HostRoomSettings,
  MatchPhase,
  ParticipantPublicState,
  PendingMicrobetWire,
  PlayerAction,
  SerializableVoteWindow,
  ServerEnvelope,
} from "@/multiplayer/protocol";

const STARTING_HEALTH = 100;
const DEFAULT_DECISION_TIMER_SECONDS = 12;

const DEFAULT_SETTINGS: HostRoomSettings = {
  botCount: 0,
  startingBananas: 100,
  decisionTimerSeconds: DEFAULT_DECISION_TIMER_SECONDS,
  roundTimerSeconds: 120,
  roundsTotal: 3,
};

type MainBetSelection = {
  side: BallId;
  stake: number;
};

type PendingPlayerMicrobet = PendingMicrobetWire & {
  id: string;
  odds: number;
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
  if (kind === "redDamageToBlue") return delta.blueDamageTaken;
  if (kind === "blueDamageToRed") return delta.redDamageTaken;
  if (kind === "redWallHits") return delta.wallHitsRed;
  if (kind === "blueWallHits") return delta.wallHitsBlue;
  return delta.ballCollisions;
}

function serializeVoteWindow(voteWindow: VoteWindow): SerializableVoteWindow {
  const getLabel = (option: VoteWindow["optionA"]) => option.option.label;

  return {
    category: voteWindow.category,
    optionA: { label: getLabel(voteWindow.optionA) },
    optionB: { label: getLabel(voteWindow.optionB) },
    voteSplit: {
      optionA: voteWindow.voteSplit.optionA,
      optionB: voteWindow.voteSplit.optionB,
    },
  };
}

type HostMultiplayerPanelProps = {
  roomCode: string;
  onExit: () => void;
};

export default function HostMultiplayerPanel({
  roomCode,
  onExit,
}: HostMultiplayerPanelProps) {
  const [engine, setEngine] = useState(() => new BotsGameEngine());
  const gameApiRef = useRef<GameApi | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  const [matchStarted, setMatchStarted] = useState(false);
  const [phase, setPhase] = useState<MatchPhase>("lobby");
  const [phaseCountdown, setPhaseCountdown] = useState(0);
  const [settings, setSettings] = useState<HostRoomSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);

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
  const [voteWindow, setVoteWindow] = useState<VoteWindow | null>(null);
  const [microbetInsights, setMicrobetInsights] = useState<MicroBetInsight[]>(
    [],
  );

  const [roomParticipants, setRoomParticipants] = useState<
    Array<{ id: string; name: string; token?: string; connected: boolean }>
  >([]);
  const [participantBananas, setParticipantBananas] = useState<
    Record<string, number>
  >({});
  const [queuedVoteCount, setQueuedVoteCount] = useState(0);

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
  const phaseRef = useRef<MatchPhase>("lobby");
  const phaseCountdownRef = useRef(0);
  const lastVoteStatsRef = useRef<StatTotals | null>(null);

  const banksRef = useRef<Record<string, number>>({});
  const totalPayoutRef = useRef<Record<string, number>>({});
  const roundPayoutRef = useRef<Record<string, number>>({});
  const roomParticipantsRef = useRef<
    Array<{ id: string; name: string; token?: string; connected: boolean }>
  >([]);
  const mainBetsRef = useRef<Record<string, MainBetSelection | null>>({});
  const voteActionsRef = useRef<
    Record<string, { selection: 0 | 1; power: number }>
  >({});
  const queuedMicrobetsRef = useRef<Record<string, PendingPlayerMicrobet[]>>(
    {},
  );
  const activeMicrobetsRef = useRef<Record<string, PendingPlayerMicrobet[]>>(
    {},
  );

  const transitionPhase = useCallback((next: MatchPhase, seconds: number) => {
    phaseRef.current = next;
    phaseCountdownRef.current = seconds;
    setPhase(next);
    setPhaseCountdown(seconds);
  }, []);

  const syncParticipantBananas = useCallback(
    (
      participants?: Array<{
        id: string;
        name: string;
        token?: string;
        connected: boolean;
      }>,
    ) => {
      const source = participants ?? roomParticipantsRef.current;
      const next: Record<string, number> = {};
      for (const participant of source) {
        next[participant.id] =
          banksRef.current[participant.id] ?? settings.startingBananas;
      }
      setParticipantBananas(next);
    },
    [settings.startingBananas],
  );

  const settlePlayerMicrobets = useCallback(
    (currentTotals: StatTotals) => {
      const last = lastVoteStatsRef.current;
      if (!last) return;

      const delta: StatTotals = {
        redDamageTaken: currentTotals.redDamageTaken - last.redDamageTaken,
        blueDamageTaken: currentTotals.blueDamageTaken - last.blueDamageTaken,
        wallHitsRed: currentTotals.wallHitsRed - last.wallHitsRed,
        wallHitsBlue: currentTotals.wallHitsBlue - last.wallHitsBlue,
        ballCollisions: currentTotals.ballCollisions - last.ballCollisions,
      };

      let anyPayout = false;
      for (const [participantId, bets] of Object.entries(
        activeMicrobetsRef.current,
      )) {
        if (bets.length === 0) continue;

        let payoutTotal = 0;
        for (const bet of bets) {
          const actual = getMicrobetActual(bet.kind, delta);
          const won = actual >= bet.min && actual <= bet.max;
          if (won) {
            payoutTotal += Math.floor(bet.stake * bet.odds);
          }
        }

        if (payoutTotal > 0) {
          banksRef.current[participantId] =
            (banksRef.current[participantId] ?? settings.startingBananas) +
            payoutTotal;
          totalPayoutRef.current[participantId] =
            (totalPayoutRef.current[participantId] ?? 0) + payoutTotal;
          roundPayoutRef.current[participantId] =
            (roundPayoutRef.current[participantId] ?? 0) + payoutTotal;
          anyPayout = true;
        }
      }

      activeMicrobetsRef.current = {};
      if (anyPayout) {
        syncParticipantBananas();
      }
    },
    [settings.startingBananas, syncParticipantBananas],
  );

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
        setRedWeapons((prev) => [
          ...prev,
          { name: redW.name, icon: redW.icon, quality: redW.quality },
        ]);
        setBlueWeapons((prev) => [
          ...prev,
          { name: blueW.name, icon: blueW.icon, quality: blueW.quality },
        ]);
      }

      if (application.category === "modifier") {
        const redM = application.red();
        const blueM = application.blue();
        gameApiRef.current.addModifier("red", redM);
        gameApiRef.current.addModifier("blue", blueM);
        setRedModifiers((prev) => [
          ...prev,
          { name: redM.name, icon: redM.icon, quality: redM.quality },
        ]);
        setBlueModifiers((prev) => [
          ...prev,
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

  const publishState = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const participants: ParticipantPublicState[] = roomParticipants.map(
      (participant) => ({
        id: participant.id,
        name: participant.name,
        token: participant.token,
        connected: participant.connected,
        bananas: banksRef.current[participant.id] ?? settings.startingBananas,
        totalPayout: totalPayoutRef.current[participant.id] ?? 0,
        roundPayout: roundPayoutRef.current[participant.id] ?? 0,
        activeMainBet: mainBetsRef.current[participant.id] ?? null,
        queuedMicrobets: (queuedMicrobetsRef.current[participant.id] ?? []).map(
          (bet) => ({
            kind: bet.kind,
            min: bet.min,
            max: bet.max,
            stake: bet.stake,
            odds: bet.odds,
          }),
        ),
        activeMicrobets: (activeMicrobetsRef.current[participant.id] ?? []).map(
          (bet) => ({
            kind: bet.kind,
            min: bet.min,
            max: bet.max,
            stake: bet.stake,
            odds: bet.odds,
          }),
        ),
      }),
    );

    const state: HostBroadcastState = {
      roomCode,
      phase,
      phaseCountdown,
      redHealth,
      blueHealth,
      snapshot,
      voteWindow: voteWindow ? serializeVoteWindow(voteWindow) : null,
      microbetInsights,
      participants,
      roundWinner,
      settings,
    };

    const payload: ClientEnvelope = { type: "host-state", state };
    socket.send(JSON.stringify(payload));
  }, [
    blueHealth,
    microbetInsights,
    phase,
    phaseCountdown,
    redHealth,
    roomCode,
    roomParticipants,
    roundWinner,
    settings,
    snapshot,
    voteWindow,
  ]);

  const handleIncomingAction = useCallback(
    (playerId: string, action: PlayerAction) => {
      if (phaseRef.current === "prematch") {
        if (action.kind === "main-bet") {
          const minStake = Math.max(
            5,
            Math.floor(settings.startingBananas / 10),
          );
          const stake = Math.max(minStake, Math.floor(action.stake));
          const side: BallId = action.side === "blue" ? "blue" : "red";
          const currentBananas =
            banksRef.current[playerId] ?? settings.startingBananas;
          const existingBet = mainBetsRef.current[playerId];
          const restoredBalance =
            currentBananas + (existingBet ? existingBet.stake : 0);

          if (restoredBalance < stake) {
            return;
          }

          banksRef.current[playerId] = restoredBalance - stake;
          mainBetsRef.current[playerId] = { side, stake };
          syncParticipantBananas();
          return;
        }

        if (action.kind === "main-bet-skip") {
          const existingBet = mainBetsRef.current[playerId];
          if (existingBet) {
            banksRef.current[playerId] =
              (banksRef.current[playerId] ?? settings.startingBananas) +
              existingBet.stake;
            mainBetsRef.current[playerId] = null;
            syncParticipantBananas();
          }
        }

        return;
      }

      if (phaseRef.current === "vote" && action.kind === "vote") {
        voteActionsRef.current[playerId] = {
          selection: action.selection,
          power: Math.max(0, Math.floor(action.power)),
        };
        setQueuedVoteCount(Object.keys(voteActionsRef.current).length);
        return;
      }

      if (phaseRef.current === "microbet") {
        if (action.kind === "microbet") {
          const currentBananas =
            banksRef.current[playerId] ?? settings.startingBananas;
          const existingQueued = queuedMicrobetsRef.current[playerId] ?? [];
          const restoredBalance =
            currentBananas +
            existingQueued.reduce((sum, bet) => sum + bet.stake, 0);

          const sanitizedBets: PendingPlayerMicrobet[] = action.bets
            .map((bet, index) => {
              const min = Math.max(0, Math.floor(bet.min));
              const max = Math.max(min, Math.floor(bet.max));
              const stake = Math.max(1, Math.floor(bet.stake));
              const odds = calcRangeOdds(bet.kind, min, max);
              return {
                id: `${playerId}-${Date.now()}-${index}`,
                kind: bet.kind,
                min,
                max,
                stake,
                odds,
              };
            })
            .slice(0, 8);

          const totalStake = sanitizedBets.reduce(
            (sum, bet) => sum + bet.stake,
            0,
          );
          if (totalStake > restoredBalance) {
            return;
          }

          queuedMicrobetsRef.current[playerId] = sanitizedBets;
          banksRef.current[playerId] = restoredBalance - totalStake;
          syncParticipantBananas();
          return;
        }

        if (action.kind === "microbet-skip") {
          const existingQueued = queuedMicrobetsRef.current[playerId] ?? [];
          const refund = existingQueued.reduce(
            (sum, bet) => sum + bet.stake,
            0,
          );
          if (refund > 0) {
            banksRef.current[playerId] =
              (banksRef.current[playerId] ?? settings.startingBananas) + refund;
            syncParticipantBananas();
          }
          queuedMicrobetsRef.current[playerId] = [];
        }
      }
    },
    [settings.startingBananas, syncParticipantBananas],
  );

  const resolveVoteAndOpenMicrobet = useCallback(() => {
    let optionAExtraVotes = 0;
    let optionBExtraVotes = 0;
    let anySpend = false;

    for (const [participantId, vote] of Object.entries(
      voteActionsRef.current,
    )) {
      const currentBananas =
        banksRef.current[participantId] ?? settings.startingBananas;
      const spend = Math.min(currentBananas, vote.power);
      if (spend <= 0) {
        continue;
      }

      banksRef.current[participantId] = currentBananas - spend;
      if (vote.selection === 0) {
        optionAExtraVotes += spend;
      } else {
        optionBExtraVotes += spend;
      }
      anySpend = true;
    }

    voteActionsRef.current = {};
    setQueuedVoteCount(0);

    const resolved = engine.resolvePendingVoteTotals(
      optionAExtraVotes,
      optionBExtraVotes,
    );
    if (resolved.application) {
      applyVoteApplication(resolved.application);
    }

    if (anySpend) {
      syncParticipantBananas();
    }

    setSnapshot(engine.getSnapshot());
    setVoteWindow(null);
    setMicrobetInsights(engine.getPendingMicrobetInsights());
    transitionPhase("microbet", settings.decisionTimerSeconds);
  }, [
    applyVoteApplication,
    engine,
    settings.decisionTimerSeconds,
    settings.startingBananas,
    syncParticipantBananas,
    transitionPhase,
  ]);

  const resetBoardForNextRound = useCallback(() => {
    setGameKey((value) => value + 1);
    setRedHealth(STARTING_HEALTH);
    setBlueHealth(STARTING_HEALTH);
    healthRef.current = { red: STARTING_HEALTH, blue: STARTING_HEALTH };
    previousHealthRef.current = {
      red: STARTING_HEALTH,
      blue: STARTING_HEALTH,
    };
    statsTotalsRef.current = createZeroTotals();
    forcedWinnerRef.current = undefined;
    setRoundWinner(null);
    setIsCircleArena(false);
    setAppliedEffects([]);
    setRedModifiers([]);
    setBlueModifiers([]);
    setRedWeapons([]);
    setBlueWeapons([]);
    setVoteWindow(null);
    setMicrobetInsights([]);
    mainBetsRef.current = {};
    voteActionsRef.current = {};
    setQueuedVoteCount(0);
    queuedMicrobetsRef.current = {};
    activeMicrobetsRef.current = {};
    for (const participantId of Object.keys(roundPayoutRef.current)) {
      roundPayoutRef.current[participantId] = 0;
    }
    lastVoteStatsRef.current = null;
    gameApiRef.current = null;
    transitionPhase("prematch", settings.decisionTimerSeconds);
  }, [settings.decisionTimerSeconds, transitionPhase]);

  const handleGameReady = useCallback((api: GameApi) => {
    gameApiRef.current = api;
    api.setPaused(phaseRef.current !== "running");
  }, []);

  const handleRedHealthChange = useCallback((value: number) => {
    const previous = previousHealthRef.current.red;
    if (value < previous) {
      statsTotalsRef.current.redDamageTaken += previous - value;
    }
    previousHealthRef.current.red = value;
    healthRef.current.red = value;
    setRedHealth(value);
  }, []);

  const handleBlueHealthChange = useCallback((value: number) => {
    const previous = previousHealthRef.current.blue;
    if (value < previous) {
      statsTotalsRef.current.blueDamageTaken += previous - value;
    }
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

  const startMatch = useCallback(() => {
    if (roomParticipants.length === 0) {
      return;
    }

    const freshEngine = new BotsGameEngine({
      botCount: settings.botCount,
      startingBananas: settings.startingBananas,
      roundDurationSeconds: settings.roundTimerSeconds,
      totalRounds: settings.roundsTotal,
      voteIntervalSeconds: 10,
      minMainBet: Math.max(5, Math.floor(settings.startingBananas / 10)),
    });

    for (const participant of roomParticipantsRef.current) {
      banksRef.current[participant.id] = settings.startingBananas;
      totalPayoutRef.current[participant.id] = 0;
      roundPayoutRef.current[participant.id] = 0;
    }

    mainBetsRef.current = {};
    voteActionsRef.current = {};
    queuedMicrobetsRef.current = {};
    activeMicrobetsRef.current = {};
    setQueuedVoteCount(0);

    setEngine(freshEngine);
    setSnapshot(freshEngine.getSnapshot());
    setMatchStarted(true);
    syncParticipantBananas();
    resetBoardForNextRound();
  }, [
    resetBoardForNextRound,
    roomParticipants.length,
    settings,
    syncParticipantBananas,
  ]);

  const copyRoomCode = useCallback(async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [roomCode]);

  const shareRoomLink = useCallback(async () => {
    const joinUrl = `${window.location.origin}/join?code=${roomCode}`;
    if (navigator.share) {
      await navigator.share({
        title: "Join Voting Monkey Balls",
        text: `Room code: ${roomCode}`,
        url: joinUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [roomCode]);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      party: PARTYKIT_PARTY,
      room: roomCode,
      protocol: getSocketProtocol(),
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      const hello: ClientEnvelope = { type: "hello", role: "host" };
      socket.send(JSON.stringify(hello));
      socket.send(
        JSON.stringify({ type: "request-state" } satisfies ClientEnvelope),
      );
    });

    socket.addEventListener("message", (event) => {
      let payload: ServerEnvelope;
      try {
        payload = JSON.parse(event.data as string) as ServerEnvelope;
      } catch {
        return;
      }

      if (payload.type === "room-state") {
        const nextParticipants = payload.room.participants.map(
          (participant) => ({
            id: participant.id,
            name: participant.name,
            token: participant.token,
            connected: participant.connected,
          }),
        );

        for (const participant of nextParticipants) {
          if (banksRef.current[participant.id] === undefined) {
            banksRef.current[participant.id] = settings.startingBananas;
            totalPayoutRef.current[participant.id] = 0;
            roundPayoutRef.current[participant.id] = 0;
          }
        }

        setRoomParticipants(nextParticipants);
        roomParticipantsRef.current = nextParticipants;
        syncParticipantBananas(nextParticipants);
        return;
      }

      if (payload.type === "player-action") {
        handleIncomingAction(payload.playerId, payload.action);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [
    handleIncomingAction,
    roomCode,
    settings.startingBananas,
    syncParticipantBananas,
  ]);

  useEffect(() => {
    if (!matchStarted || !gameApiRef.current) {
      return;
    }
    gameApiRef.current.setPaused(phase !== "running");
  }, [matchStarted, phase]);

  useEffect(() => {
    if (!matchStarted) {
      return;
    }

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
          resolveVoteAndOpenMicrobet();
        }
        return;
      }

      if (phaseRef.current === "microbet") {
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) {
          activeMicrobetsRef.current = queuedMicrobetsRef.current;
          queuedMicrobetsRef.current = {};
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
        const current = statsTotalsRef.current;
        settlePlayerMicrobets(current);

        lastVoteStatsRef.current = {
          redDamageTaken: current.redDamageTaken,
          blueDamageTaken: current.blueDamageTaken,
          wallHitsRed: current.wallHitsRed,
          wallHitsBlue: current.wallHitsBlue,
          ballCollisions: current.ballCollisions,
        };

        setVoteWindow(stepResult.voteWindow);
        transitionPhase("vote", settings.decisionTimerSeconds);
      }

      setSnapshot(stepResult.snapshot);

      if (stepResult.roundResult) {
        settlePlayerMicrobets(statsTotalsRef.current);
        setRoundWinner(stepResult.roundResult.winner);

        for (const [participantId, bet] of Object.entries(
          mainBetsRef.current,
        )) {
          if (!bet) continue;
          if (bet.side === stepResult.roundResult.winner) {
            const payout = bet.stake * 2;
            banksRef.current[participantId] =
              (banksRef.current[participantId] ?? settings.startingBananas) +
              payout;
            totalPayoutRef.current[participantId] =
              (totalPayoutRef.current[participantId] ?? 0) + payout;
            roundPayoutRef.current[participantId] =
              (roundPayoutRef.current[participantId] ?? 0) + payout;
          }
        }

        mainBetsRef.current = {};
        voteActionsRef.current = {};
        setQueuedVoteCount(0);
        queuedMicrobetsRef.current = {};
        activeMicrobetsRef.current = {};
        syncParticipantBananas();
      }

      if (
        stepResult.roundResult &&
        !stepResult.snapshot.tournamentFinished &&
        !roundAdvanceTimeoutRef.current
      ) {
        roundAdvanceTimeoutRef.current = setTimeout(() => {
          const nextSnapshot = engine.startNextRound();
          resetBoardForNextRound();
          if (nextSnapshot) {
            setSnapshot(nextSnapshot);
          }
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
    engine,
    matchStarted,
    resetBoardForNextRound,
    resolveVoteAndOpenMicrobet,
    settings.decisionTimerSeconds,
    settings.startingBananas,
    settlePlayerMicrobets,
    syncParticipantBananas,
    transitionPhase,
  ]);

  useEffect(() => {
    publishState();
  }, [publishState, participantBananas]);

  const totalBananasInPlay = useMemo(
    () =>
      roomParticipants.reduce(
        (sum, participant) =>
          sum +
          (participantBananas[participant.id] ?? settings.startingBananas),
        0,
      ),
    [participantBananas, roomParticipants, settings.startingBananas],
  );

  const hasBots = snapshot.bots.length > 0;

  const pausePrompt =
    phase === "prematch"
      ? "Make your bets!"
      : phase === "vote"
        ? "Vote now!"
        : phase === "microbet"
          ? "Place your microbets!"
          : null;

  if (!matchStarted) {
    return (
      <div className="w-screen min-h-screen flex flex-col items-center justify-center bg-white text-black p-8">
        <Card className="w-full max-w-3xl border-8 border-black rounded-none p-8 shadow-[16px_16px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                Multiplayer Host Room
              </p>
              <h1 className="text-4xl font-black uppercase mt-1">
                Code {roomCode}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-10 w-10 p-0 border-4 border-black rounded-none"
                onClick={copyRoomCode}
                title="Copy room code"
              >
                <CopySimple size={18} weight="bold" />
              </Button>
              <Button
                variant="outline"
                className="h-10 w-10 p-0 border-4 border-black rounded-none"
                onClick={shareRoomLink}
                title="Share join link"
              >
                <ShareNetwork size={18} weight="bold" />
              </Button>
              <Link href="/">
                <Button
                  variant="secondary"
                  className="border-4 border-black rounded-none font-black uppercase"
                >
                  Exit
                </Button>
              </Link>
            </div>
          </div>

          {copied && (
            <p className="text-xs font-black uppercase text-green-700 mb-4">
              Copied to clipboard
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-4 border-black rounded-none p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-3">
                Match Settings
              </p>
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest">
                  Bots
                  <input
                    type="number"
                    min={0}
                    max={64}
                    value={settings.botCount}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        botCount: Math.max(
                          0,
                          Math.min(64, Number(event.target.value) || 0),
                        ),
                      }))
                    }
                    className="mt-1 w-full border-4 border-black p-2 text-lg font-black"
                  />
                </label>

                <label className="block text-xs font-black uppercase tracking-widest">
                  Starting Bananas
                  <input
                    type="number"
                    min={20}
                    max={10000}
                    value={settings.startingBananas}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        startingBananas: Math.max(
                          20,
                          Math.min(10000, Number(event.target.value) || 20),
                        ),
                      }))
                    }
                    className="mt-1 w-full border-4 border-black p-2 text-lg font-black"
                  />
                </label>

                <label className="block text-xs font-black uppercase tracking-widest">
                  Decision Timer (s)
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={settings.decisionTimerSeconds}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        decisionTimerSeconds: Math.max(
                          5,
                          Math.min(60, Number(event.target.value) || 5),
                        ),
                      }))
                    }
                    className="mt-1 w-full border-4 border-black p-2 text-lg font-black"
                  />
                </label>

                <label className="block text-xs font-black uppercase tracking-widest">
                  Round Timer (s)
                  <input
                    type="number"
                    min={30}
                    max={600}
                    value={settings.roundTimerSeconds}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        roundTimerSeconds: Math.max(
                          30,
                          Math.min(600, Number(event.target.value) || 30),
                        ),
                      }))
                    }
                    className="mt-1 w-full border-4 border-black p-2 text-lg font-black"
                  />
                </label>

                <label className="block text-xs font-black uppercase tracking-widest">
                  Rounds
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.roundsTotal}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        roundsTotal: Math.max(
                          1,
                          Math.min(20, Number(event.target.value) || 1),
                        ),
                      }))
                    }
                    className="mt-1 w-full border-4 border-black p-2 text-lg font-black"
                  />
                </label>
              </div>
            </Card>

            <Card className="border-4 border-black rounded-none p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-2">
                Joined Players ({roomParticipants.length})
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {roomParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="border-2 border-black p-2 flex items-center justify-between"
                  >
                    <span className="text-sm font-black uppercase">
                      {participant.name}
                    </span>
                    <span className="text-xs font-black uppercase text-zinc-600">
                      {participant.connected ? "Online" : "Offline"}
                    </span>
                  </div>
                ))}
                {roomParticipants.length === 0 && (
                  <p className="text-sm text-zinc-600">
                    No players joined yet.
                  </p>
                )}
              </div>

              <Button
                className="w-full mt-5 border-4 border-black rounded-none font-black uppercase text-xl py-7"
                onClick={startMatch}
                disabled={roomParticipants.length === 0}
              >
                Start Match
              </Button>
            </Card>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-white text-black p-6 md:p-10">
      {pausePrompt && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center">
          <div className="text-center text-white px-6">
            <p className="text-sm uppercase tracking-[0.4em] font-black opacity-80">
              Match Paused
            </p>
            <h2 className="text-7xl md:text-8xl font-black uppercase mt-3">
              {pausePrompt}
            </h2>
            <p className="text-lg font-bold uppercase mt-5">
              Waiting on players...
            </p>
          </div>
        </div>
      )}

      <div className="max-w-475 mx-auto">
        <RoundHeader
          roundNumber={snapshot.roundNumber}
          roundsTotal={snapshot.roundsTotal}
          timeLeftSeconds={snapshot.timeLeftSeconds}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[280px_auto_320px] gap-6">
          {hasBots ? (
            <BotStandings
              leaderboard={snapshot.leaderboard}
              latestLog={snapshot.latestLog}
            />
          ) : (
            <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-zinc-100">
              <p className="text-sm font-black uppercase">
                No bots in this match.
              </p>
              <p className="text-xs text-zinc-700 mt-2">
                All voting and bets are purely from real players.
              </p>
            </Card>
          )}

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
                  Phase
                </p>
                <p className="text-3xl font-black tabular-nums">{phase}</p>
                <p className="text-xs mt-2 uppercase font-black text-zinc-700">
                  Countdown: {phaseCountdown}s
                </p>
              </Card>

              <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase tracking-widest mb-2">
                  Players
                </p>
                <p className="text-sm font-black uppercase">
                  {roomParticipants.length} connected
                </p>
                <p className="text-xs text-zinc-700 mt-2">
                  Combined bananas: {totalBananasInPlay}
                </p>
              </Card>

              <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase tracking-widest mb-2">
                  Live Votes
                </p>
                {phase === "vote" ? (
                  <p className="text-sm font-black uppercase">
                    {queuedVoteCount} player votes queued
                  </p>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No active vote window.
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
            {hasBots && <BotBetsTable bots={snapshot.bots} />}

            <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase tracking-widest mb-2">
                Player Wallets
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {roomParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="border-2 border-black p-2 flex items-center justify-between"
                  >
                    <span className="text-xs font-black uppercase">
                      {participant.name}
                    </span>
                    <span className="text-xs font-black uppercase">
                      {participantBananas[participant.id] ??
                        settings.startingBananas}{" "}
                      bananas
                    </span>
                  </div>
                ))}
                {roomParticipants.length === 0 && (
                  <p className="text-xs text-zinc-600">
                    No participants joined.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Button
        variant="secondary"
        className="fixed top-4 left-4 z-50 border-4 border-black rounded-none font-black uppercase"
        onClick={onExit}
      >
        Leave
      </Button>
    </div>
  );
}
