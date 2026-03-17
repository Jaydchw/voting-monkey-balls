"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import PartySocket from "partysocket";
import {
  CopySimple,
  Pulse,
  ShareNetwork,
  Trophy,
  Users,
} from "@phosphor-icons/react";
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
import { RoundHeader } from "@/components/game/hud/round-header";
import { HealthBars } from "@/components/game/hud/health-bars";
import { ArenaBoard } from "@/components/game/arena/arena-board";
import { BananaInline } from "@/components/ui/banana-inline";
import { BotStandings } from "@/components/game/standings/bot-standings";
import { MatchDashboardShell } from "@/components/game/layout/match-dashboard-shell";
import { CharacterAvatar } from "@/components/game/character/character-avatar";
import {
  ActivityFeed,
  type AppliedEffect,
} from "@/components/game/standings/activity-feed";
import { BotBetsTable } from "@/components/game/standings/bot-bets-table";
import { BlockButton } from "@/components/ui/block-button";
import { BlockCard } from "@/components/ui/block-card";
import {
  DEFAULT_MONKEY_COLOR,
  DEFAULT_MONKEY_SVG,
  isValidCharacterColor,
  isValidMonkeySvgType,
} from "@/lib/monkey-characters";
import {
  getPartyKitHost,
  getSocketProtocol,
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
import { GameAudioController } from "@/lib/game-audio";
import { useMenuAudio } from "@/components/menu-audio-context";

const STARTING_HEALTH = 100;
const DEFAULT_DECISION_TIMER_SECONDS = 12;

const DEFAULT_SETTINGS: HostRoomSettings = {
  botCount: 0,
  startingBananas: 100,
  decisionTimerSeconds: DEFAULT_DECISION_TIMER_SECONDS,
  waitForAllDecisions: false,
  roundTimerSeconds: 120,
  roundsTotal: 3,
};

type MainBetSelection = { side: BallId; stake: number };
type PendingPlayerMicrobet = PendingMicrobetWire & { id: string; odds: number };

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
  const prob: Record<MicroBetKind, number> = {
    redDamageToBlue: 0.5,
    blueDamageToRed: 0.5,
    redWallHits: 0.5,
    blueWallHits: 0.5,
    ballCollisions: 0.45,
  };
  return Number((0.92 / prob[kind]).toFixed(2));
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

function serializeVoteWindow(voteWindow: VoteWindow): SerializableVoteWindow {
  const serializeOption = (option: VoteWindow["optionA"]) => {
    if (option.category === "arena") {
      const inst = option.option.arena.create();
      return {
        category: option.category,
        label: option.option.label,
        qualityScore: option.option.qualityScore,
        arenaLabel: option.option.arena.label,
        arenaDescription: inst.description,
      };
    }
    const redInst = option.option.red.create();
    const blueInst = option.option.blue.create();
    return {
      category: option.category,
      label: option.option.label,
      qualityScore: option.option.qualityScore,
      redLabel: option.option.red.label,
      blueLabel: option.option.blue.label,
      redDescription: redInst.description,
      blueDescription: blueInst.description,
    };
  };
  return {
    category: voteWindow.category,
    optionA: serializeOption(voteWindow.optionA),
    optionB: serializeOption(voteWindow.optionB),
    optionC: serializeOption(voteWindow.optionC),
    voteSplit: {
      optionA: voteWindow.voteSplit.optionA,
      optionB: voteWindow.voteSplit.optionB,
      optionC: voteWindow.voteSplit.optionC,
    },
  };
}

function IconButton({
  children,
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
  return (
    <button
      className={[
        "border-4 border-black flex items-center justify-center bg-white hover:bg-zinc-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all duration-100",
        sizeClass,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function SectionBadge({
  children,
  color = "yellow",
}: {
  children: ReactNode;
  color?: "yellow" | "primary" | "danger" | "success";
}) {
  const colorClass =
    color === "primary"
      ? "bg-primary text-primary-foreground"
      : color === "danger"
        ? "bg-destructive text-destructive-foreground"
        : color === "success"
          ? "bg-green-400 text-black"
          : "bg-yellow-300 text-black";
  return (
    <div
      className={[
        "inline-block border-4 border-black px-3 py-1",
        colorClass,
      ].join(" ")}
    >
      <span className="text-xs font-black uppercase tracking-[0.3em]">
        {children}
      </span>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))
        }
        className="w-full p-3 border-4 border-black bg-white text-lg font-black outline-none focus:ring-4 focus:ring-primary/30 transition-all"
      />
    </div>
  );
}

type HostMultiplayerPanelProps = { roomCode: string; onExit: () => void };

export default function HostMultiplayerPanel({
  roomCode,
  onExit,
}: HostMultiplayerPanelProps) {
  const { pauseForGame, resumeFromGame } = useMenuAudio();

  const [engine, setEngine] = useState(() => new BotsGameEngine());
  const gameApiRef = useRef<GameApi | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const audioCtrlRef = useRef<GameAudioController | null>(null);

  useEffect(() => {
    const ctrl = new GameAudioController();
    audioCtrlRef.current = ctrl;
    pauseForGame();
    void ctrl.loadRound(1);
    return () => {
      ctrl.dispose();
      audioCtrlRef.current = null;
      resumeFromGame();
    };
  }, [pauseForGame, resumeFromGame]);

  const [matchStarted, setMatchStarted] = useState(false);
  const [phase, setPhase] = useState<MatchPhase>("lobby");
  const [phaseCountdown, setPhaseCountdown] = useState(0);
  const [settings, setSettings] = useState<HostRoomSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

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
  const [revealedVoteOption, setRevealedVoteOption] =
    useState<HostBroadcastState["revealedVoteOption"]>(null);
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
  const [participantCharacters, setParticipantCharacters] = useState<
    Record<string, { svgType: string; color: string }>
  >({});

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
    Record<string, { selection: 0 | 1 | 2; power: number }>
  >({});
  const queuedMicrobetsRef = useRef<Record<string, PendingPlayerMicrobet[]>>(
    {},
  );
  const activeMicrobetsRef = useRef<Record<string, PendingPlayerMicrobet[]>>(
    {},
  );
  const maybeAdvanceDecisionPhaseRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (snapshot.roundNumber > 1) {
      void audioCtrlRef.current?.loadRound(snapshot.roundNumber);
    }
  }, [snapshot.roundNumber]);

  const prevPhaseRef = useRef<MatchPhase>("lobby");
  useEffect(() => {
    if (phase === "running" && prevPhaseRef.current !== "running") {
      audioCtrlRef.current?.setPaused(false);
      audioCtrlRef.current?.startTracks(3);
    } else if (phase !== "running" && prevPhaseRef.current === "running") {
      audioCtrlRef.current?.setPaused(true);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  const transitionPhase = useCallback((next: MatchPhase, seconds: number) => {
    phaseRef.current = next;
    phaseCountdownRef.current = seconds;
    setPhase(next);
    setPhaseCountdown(seconds);
  }, []);

  const getDecisionWindowSeconds = useCallback(
    () => (settings.waitForAllDecisions ? 0 : settings.decisionTimerSeconds),
    [settings.waitForAllDecisions, settings.decisionTimerSeconds],
  );

  const haveAllConnectedPlayersDecided = useCallback(
    (hasDecision: (id: string) => boolean) => {
      const connected = roomParticipantsRef.current.filter((p) => p.connected);
      if (connected.length === 0) return true;
      return connected.every((p) => hasDecision(p.id));
    },
    [],
  );

  const syncParticipantBananas = useCallback(
    (participants?: typeof roomParticipantsRef.current) => {
      const source = participants ?? roomParticipantsRef.current;
      const next: Record<string, number> = {};
      for (const p of source)
        next[p.id] = banksRef.current[p.id] ?? settings.startingBananas;
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
      for (const [pid, bets] of Object.entries(activeMicrobetsRef.current)) {
        if (bets.length === 0) continue;
        let payout = 0;
        for (const bet of bets) {
          if (didMicrobetWin(bet.kind, bet.outcome, delta))
            payout += Math.floor(bet.stake * bet.odds);
        }
        if (payout > 0) {
          banksRef.current[pid] =
            (banksRef.current[pid] ?? settings.startingBananas) + payout;
          totalPayoutRef.current[pid] =
            (totalPayoutRef.current[pid] ?? 0) + payout;
          roundPayoutRef.current[pid] =
            (roundPayoutRef.current[pid] ?? 0) + payout;
          anyPayout = true;
        }
      }
      activeMicrobetsRef.current = {};
      if (anyPayout) syncParticipantBananas();
    },
    [settings.startingBananas, syncParticipantBananas],
  );

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
        const rW = application.red();
        const bW = application.blue();
        gameApiRef.current.addWeapon("red", rW);
        gameApiRef.current.addWeapon("blue", bW);
        setRedWeapons((p) => [
          ...p,
          { name: rW.name, icon: rW.icon, quality: rW.quality },
        ]);
        setBlueWeapons((p) => [
          ...p,
          { name: bW.name, icon: bW.icon, quality: bW.quality },
        ]);
      }
      if (application.category === "modifier") {
        const rM = application.red();
        const bM = application.blue();
        gameApiRef.current.addModifier("red", rM);
        gameApiRef.current.addModifier("blue", bM);
        setRedModifiers((p) => [
          ...p,
          { name: rM.name, icon: rM.icon, quality: rM.quality },
        ]);
        setBlueModifiers((p) => [
          ...p,
          { name: bM.name, icon: bM.icon, quality: bM.quality },
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

  const closeMicrobetWindow = useCallback(() => {
    activeMicrobetsRef.current = queuedMicrobetsRef.current;
    queuedMicrobetsRef.current = {};
    transitionPhase("running", 0);
  }, [transitionPhase]);

  const publishState = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const participants: ParticipantPublicState[] = roomParticipants.map((p) => {
      const char = participantCharacters[p.id];
      return {
        id: p.id,
        name: p.name,
        token: p.token,
        characterSvg: char?.svgType,
        characterColor: char?.color,
        connected: p.connected,
        bananas: banksRef.current[p.id] ?? settings.startingBananas,
        totalPayout: totalPayoutRef.current[p.id] ?? 0,
        roundPayout: roundPayoutRef.current[p.id] ?? 0,
        activeMainBet: mainBetsRef.current[p.id] ?? null,
        queuedMicrobets: (queuedMicrobetsRef.current[p.id] ?? []).map((b) => ({
          kind: b.kind,
          outcome: b.outcome,
          stake: b.stake,
          odds: b.odds,
        })),
        activeMicrobets: (activeMicrobetsRef.current[p.id] ?? []).map((b) => ({
          kind: b.kind,
          outcome: b.outcome,
          stake: b.stake,
          odds: b.odds,
        })),
      };
    });
    const state: HostBroadcastState = {
      roomCode,
      phase,
      phaseCountdown,
      redHealth,
      blueHealth,
      snapshot,
      voteWindow: voteWindow ? serializeVoteWindow(voteWindow) : null,
      revealedVoteOption,
      microbetInsights,
      participants,
      roundWinner,
      settings,
    };
    socket.send(
      JSON.stringify({ type: "host-state", state } satisfies ClientEnvelope),
    );
  }, [
    blueHealth,
    microbetInsights,
    phase,
    phaseCountdown,
    redHealth,
    revealedVoteOption,
    roomCode,
    participantCharacters,
    roomParticipants,
    roundWinner,
    settings,
    snapshot,
    voteWindow,
  ]);

  const handleIncomingAction = useCallback(
    (playerId: string, action: PlayerAction) => {
      if (action.kind === "set-character") {
        const svgType = isValidMonkeySvgType(action.svgType)
          ? action.svgType
          : DEFAULT_MONKEY_SVG;
        const color = isValidCharacterColor(action.color)
          ? action.color
          : DEFAULT_MONKEY_COLOR;
        setParticipantCharacters((prev) => ({
          ...prev,
          [playerId]: { svgType, color },
        }));
        return;
      }
      if (phaseRef.current === "prematch") {
        if (action.kind === "main-bet") {
          const minStake = Math.max(
            5,
            Math.floor(settings.startingBananas / 10),
          );
          const stake = Math.max(minStake, Math.floor(action.stake));
          const side: BallId = action.side === "blue" ? "blue" : "red";
          const cur = banksRef.current[playerId] ?? settings.startingBananas;
          const existing = mainBetsRef.current[playerId];
          const restored = cur + (existing ? existing.stake : 0);
          if (restored < stake) return;
          banksRef.current[playerId] = restored - stake;
          mainBetsRef.current[playerId] = { side, stake };
          syncParticipantBananas();
          maybeAdvanceDecisionPhaseRef.current();
          return;
        }
        if (action.kind === "main-bet-skip") {
          const existing = mainBetsRef.current[playerId];
          if (existing) {
            banksRef.current[playerId] =
              (banksRef.current[playerId] ?? settings.startingBananas) +
              existing.stake;
            mainBetsRef.current[playerId] = null;
            syncParticipantBananas();
          }
          if (
            !Object.prototype.hasOwnProperty.call(mainBetsRef.current, playerId)
          )
            mainBetsRef.current[playerId] = null;
          maybeAdvanceDecisionPhaseRef.current();
        }
        return;
      }
      if (phaseRef.current === "vote" && action.kind === "vote") {
        voteActionsRef.current[playerId] = {
          selection: action.selection,
          power: Math.max(0, Math.floor(action.power)),
        };
        setQueuedVoteCount(Object.keys(voteActionsRef.current).length);
        maybeAdvanceDecisionPhaseRef.current();
        return;
      }
      if (phaseRef.current === "microbet") {
        if (action.kind === "microbet") {
          const cur = banksRef.current[playerId] ?? settings.startingBananas;
          const existing = queuedMicrobetsRef.current[playerId] ?? [];
          const restored = cur + existing.reduce((s, b) => s + b.stake, 0);
          const sanitized: PendingPlayerMicrobet[] = action.bets
            .map((bet, i) => ({
              id: `${playerId}-${Date.now()}-${i}`,
              kind: bet.kind,
              outcome: Boolean(bet.outcome),
              stake: Math.max(1, Math.floor(bet.stake)),
              odds: calcBooleanOdds(bet.kind),
            }))
            .slice(0, 8);
          const total = sanitized.reduce((s, b) => s + b.stake, 0);
          if (total > restored) return;
          queuedMicrobetsRef.current[playerId] = sanitized;
          banksRef.current[playerId] = restored - total;
          syncParticipantBananas();
          maybeAdvanceDecisionPhaseRef.current();
          return;
        }
        if (action.kind === "microbet-skip") {
          const existing = queuedMicrobetsRef.current[playerId] ?? [];
          const refund = existing.reduce((s, b) => s + b.stake, 0);
          if (refund > 0) {
            banksRef.current[playerId] =
              (banksRef.current[playerId] ?? settings.startingBananas) + refund;
            syncParticipantBananas();
          }
          queuedMicrobetsRef.current[playerId] = [];
          maybeAdvanceDecisionPhaseRef.current();
        }
      }
    },
    [settings.startingBananas, syncParticipantBananas],
  );

  const resolveVoteAndOpenMicrobet = useCallback(() => {
    let optA = 0,
      optB = 0,
      optC = 0;
    let anySpend = false;
    for (const [pid, vote] of Object.entries(voteActionsRef.current)) {
      const cur = banksRef.current[pid] ?? settings.startingBananas;
      const spend = Math.min(cur, vote.power);
      if (spend <= 0) continue;
      banksRef.current[pid] = cur - spend;
      if (vote.selection === 0) optA += spend;
      else if (vote.selection === 1) optB += spend;
      else optC += spend;
      anySpend = true;
    }
    voteActionsRef.current = {};
    setQueuedVoteCount(0);
    const resolved = engine.resolvePendingVoteTotals(optA, optB, optC);
    if (resolved.application) {
      applyVoteApplication(resolved.application);
      setRevealedVoteOption({
        category: resolved.application.category,
        label: resolved.application.label,
      });
    }
    if (anySpend) syncParticipantBananas();
    setSnapshot(engine.getSnapshot());
    setVoteWindow(null);
    transitionPhase("reveal", 3);
  }, [
    applyVoteApplication,
    engine,
    settings.startingBananas,
    syncParticipantBananas,
    transitionPhase,
  ]);

  const maybeAdvanceDecisionPhase = useCallback(() => {
    if (!matchStarted) return;
    if (phaseRef.current === "prematch") {
      if (
        haveAllConnectedPlayersDecided((pid) =>
          Object.prototype.hasOwnProperty.call(mainBetsRef.current, pid),
        )
      )
        transitionPhase("running", 0);
      return;
    }
    if (phaseRef.current === "vote") {
      if (
        haveAllConnectedPlayersDecided(
          (pid) => voteActionsRef.current[pid] !== undefined,
        )
      )
        resolveVoteAndOpenMicrobet();
      return;
    }
    if (phaseRef.current === "microbet") {
      if (
        haveAllConnectedPlayersDecided(
          (pid) => queuedMicrobetsRef.current[pid] !== undefined,
        )
      )
        closeMicrobetWindow();
    }
  }, [
    closeMicrobetWindow,
    haveAllConnectedPlayersDecided,
    matchStarted,
    resolveVoteAndOpenMicrobet,
    transitionPhase,
  ]);

  useEffect(() => {
    maybeAdvanceDecisionPhaseRef.current = maybeAdvanceDecisionPhase;
  }, [maybeAdvanceDecisionPhase]);

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
    setVoteWindow(null);
    setRevealedVoteOption(null);
    setMicrobetInsights([]);
    mainBetsRef.current = {};
    voteActionsRef.current = {};
    setQueuedVoteCount(0);
    queuedMicrobetsRef.current = {};
    activeMicrobetsRef.current = {};
    for (const pid of Object.keys(roundPayoutRef.current))
      roundPayoutRef.current[pid] = 0;
    lastVoteStatsRef.current = null;
    gameApiRef.current = null;
    transitionPhase("prematch", getDecisionWindowSeconds());
  }, [getDecisionWindowSeconds, transitionPhase]);

  const handleGameReady = useCallback((api: GameApi) => {
    gameApiRef.current = api;
    api.setPaused(phaseRef.current !== "running");
  }, []);

  const handleRedHealthChange = useCallback((value: number) => {
    const prev = previousHealthRef.current.red;
    if (value < prev) statsTotalsRef.current.redDamageTaken += prev - value;
    previousHealthRef.current.red = value;
    healthRef.current.red = value;
    setRedHealth(value);
  }, []);

  const handleBlueHealthChange = useCallback((value: number) => {
    const prev = previousHealthRef.current.blue;
    if (value < prev) statsTotalsRef.current.blueDamageTaken += prev - value;
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
    if (roomParticipants.length === 0) return;
    const freshEngine = new BotsGameEngine({
      botCount: settings.botCount,
      startingBananas: settings.startingBananas,
      roundDurationSeconds: settings.roundTimerSeconds,
      totalRounds: settings.roundsTotal,
      voteIntervalSeconds: 10,
      minMainBet: Math.max(5, Math.floor(settings.startingBananas / 10)),
    });
    for (const p of roomParticipantsRef.current) {
      banksRef.current[p.id] = settings.startingBananas;
      totalPayoutRef.current[p.id] = 0;
      roundPayoutRef.current[p.id] = 0;
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
    const url = `${window.location.origin}/join?code=${roomCode}`;
    if (navigator.share) {
      await navigator.share({
        title: "Join Voting Monkey Balls",
        text: `Room code: ${roomCode}`,
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [roomCode]);

  useEffect(() => {
    const host = getPartyKitHost();
    const socket = new PartySocket({
      host,
      party: PARTYKIT_PARTY,
      room: roomCode,
      protocol: getSocketProtocol(),
    });
    socketRef.current = socket;
    socket.addEventListener("open", () => {
      setSocketConnected(true);
      setSocketError(null);
      socket.send(
        JSON.stringify({
          type: "hello",
          role: "host",
        } satisfies ClientEnvelope),
      );
      socket.send(
        JSON.stringify({ type: "request-state" } satisfies ClientEnvelope),
      );
    });
    socket.addEventListener("close", () => setSocketConnected(false));
    socket.addEventListener("error", () => {
      setSocketConnected(false);
      setSocketError(`Unable to connect to PartyKit server at ${host}.`);
    });
    socket.addEventListener("message", (event) => {
      let payload: ServerEnvelope;
      try {
        payload = JSON.parse(event.data as string) as ServerEnvelope;
      } catch {
        return;
      }
      if (payload.type === "room-state") {
        const next = payload.room.participants.map((p) => ({
          id: p.id,
          name: p.name,
          token: p.token,
          connected: p.connected,
        }));
        for (const p of next) {
          if (banksRef.current[p.id] === undefined) {
            banksRef.current[p.id] = settings.startingBananas;
            totalPayoutRef.current[p.id] = 0;
            roundPayoutRef.current[p.id] = 0;
          }
        }
        setRoomParticipants(next);
        roomParticipantsRef.current = next;
        syncParticipantBananas(next);
        maybeAdvanceDecisionPhaseRef.current();
        return;
      }
      if (payload.type === "player-action")
        handleIncomingAction(payload.playerId, payload.action);
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
    if (!matchStarted || !gameApiRef.current) return;
    gameApiRef.current.setPaused(phase !== "running");
  }, [matchStarted, phase]);

  useEffect(() => {
    return () => {
      if (roundAdvanceTimeoutRef.current)
        clearTimeout(roundAdvanceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!matchStarted) return;
    const interval = setInterval(() => {
      if (phaseRef.current === "prematch") {
        if (settings.waitForAllDecisions) return;
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) transitionPhase("running", 0);
        return;
      }
      if (phaseRef.current === "vote") {
        if (settings.waitForAllDecisions) return;
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) resolveVoteAndOpenMicrobet();
        return;
      }
      if (phaseRef.current === "reveal") {
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) {
          setMicrobetInsights(engine.getPendingMicrobetInsights());
          transitionPhase("microbet", getDecisionWindowSeconds());
        }
        return;
      }
      if (phaseRef.current === "microbet") {
        if (settings.waitForAllDecisions) return;
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) closeMicrobetWindow();
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
        lastVoteStatsRef.current = { ...cur };
        setVoteWindow(stepResult.voteWindow);
        setRevealedVoteOption(null);
        transitionPhase("vote", getDecisionWindowSeconds());
      }
      setSnapshot(stepResult.snapshot);
      if (stepResult.roundResult) {
        settlePlayerMicrobets(statsTotalsRef.current);
        setRoundWinner(stepResult.roundResult.winner);
        for (const [pid, bet] of Object.entries(mainBetsRef.current)) {
          if (!bet) continue;
          if (bet.side === stepResult.roundResult.winner) {
            const payout = bet.stake * 2;
            banksRef.current[pid] =
              (banksRef.current[pid] ?? settings.startingBananas) + payout;
            totalPayoutRef.current[pid] =
              (totalPayoutRef.current[pid] ?? 0) + payout;
            roundPayoutRef.current[pid] =
              (roundPayoutRef.current[pid] ?? 0) + payout;
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
          const next = engine.startNextRound();
          resetBoardForNextRound();
          if (next) setSnapshot(next);
          roundAdvanceTimeoutRef.current = null;
        }, 4000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    engine,
    getDecisionWindowSeconds,
    matchStarted,
    resetBoardForNextRound,
    resolveVoteAndOpenMicrobet,
    settings.waitForAllDecisions,
    settings.startingBananas,
    settlePlayerMicrobets,
    closeMicrobetWindow,
    syncParticipantBananas,
    transitionPhase,
  ]);

  useEffect(() => {
    publishState();
  }, [publishState, participantBananas]);

  const totalBananasInPlay = useMemo(
    () =>
      roomParticipants.reduce(
        (s, p) => s + (participantBananas[p.id] ?? settings.startingBananas),
        0,
      ),
    [participantBananas, roomParticipants, settings.startingBananas],
  );
  const hasBots = snapshot.bots.length > 0;
  const participantLeaderboard = useMemo(
    () =>
      [...roomParticipants].sort(
        (a, b) =>
          (participantBananas[b.id] ?? settings.startingBananas) -
          (participantBananas[a.id] ?? settings.startingBananas),
      ),
    [participantBananas, roomParticipants, settings.startingBananas],
  );
  const pausePrompt =
    phase === "prematch"
      ? "Make your bets!"
      : phase === "vote"
        ? "Vote now!"
        : phase === "reveal"
          ? "Applying vote result..."
          : phase === "microbet"
            ? "Place your microbets!"
            : null;

  if (!matchStarted) {
    return (
      <div className="w-screen min-h-screen bg-white text-black font-sans flex flex-col items-center justify-center p-6 relative">
        <button
          onClick={onExit}
          className="absolute top-6 left-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
        >
          <span className="text-lg">←</span>
          <span>Exit</span>
        </button>

        <div className="w-full max-w-3xl">
          <div className="mb-8">
            <div className="mb-3">
              <SectionBadge color="primary">Multiplayer Host</SectionBadge>
            </div>
            <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
              Room <span className="text-primary">{roomCode}</span>
            </h1>
            <div className="flex items-center gap-2 mt-3">
              <div
                className={[
                  "w-2 h-2 rounded-full",
                  socketConnected ? "bg-green-500" : "bg-red-500",
                ].join(" ")}
              />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                {socketConnected ? "Connected" : "Connecting..."}
              </span>
              {copied && (
                <span className="text-xs font-black uppercase text-green-600 ml-2">
                  Copied!
                </span>
              )}
            </div>
            {socketError && !socketConnected && (
              <p className="text-xs font-black uppercase text-red-600 mt-2">
                {socketError}
              </p>
            )}
          </div>

          <div className="flex gap-3 mb-8">
            <IconButton onClick={copyRoomCode} title="Copy room code" size="lg">
              <CopySimple size={20} weight="bold" />
            </IconButton>
            <IconButton
              onClick={shareRoomLink}
              title="Share join link"
              size="lg"
            >
              <ShareNetwork size={20} weight="bold" />
            </IconButton>
            <BlockCard shadow="sm" className="flex-1 flex items-center px-4">
              <span className="text-2xl font-black tracking-[0.3em]">
                {roomCode}
              </span>
              <span className="ml-auto text-xs font-black uppercase tracking-widest text-zinc-400">
                Room Code
              </span>
            </BlockCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlockCard shadow="md" className="p-5">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">
                Match Settings
              </p>
              <div className="flex flex-col gap-4">
                <NumberInput
                  label="Bots"
                  value={settings.botCount}
                  onChange={(v) => setSettings((p) => ({ ...p, botCount: v }))}
                  min={0}
                  max={64}
                />
                <NumberInput
                  label="Starting Bananas"
                  value={settings.startingBananas}
                  onChange={(v) =>
                    setSettings((p) => ({ ...p, startingBananas: v }))
                  }
                  min={20}
                  max={10000}
                />
                <NumberInput
                  label="Decision Timer (s)"
                  value={settings.decisionTimerSeconds}
                  onChange={(v) =>
                    setSettings((p) => ({ ...p, decisionTimerSeconds: v }))
                  }
                  min={5}
                  max={60}
                />
                <label className="flex items-center gap-3 border-4 border-black p-3 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={settings.waitForAllDecisions}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        waitForAllDecisions: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 accent-black"
                  />
                  <span className="text-xs font-black uppercase tracking-widest leading-tight">
                    Wait for all players (no timer)
                  </span>
                </label>
                <NumberInput
                  label="Round Timer (s)"
                  value={settings.roundTimerSeconds}
                  onChange={(v) =>
                    setSettings((p) => ({ ...p, roundTimerSeconds: v }))
                  }
                  min={30}
                  max={600}
                />
                <NumberInput
                  label="Rounds"
                  value={settings.roundsTotal}
                  onChange={(v) =>
                    setSettings((p) => ({ ...p, roundsTotal: v }))
                  }
                  min={1}
                  max={20}
                />
              </div>
            </BlockCard>

            <BlockCard shadow="md" className="p-5 flex flex-col">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">
                Joined Players ({roomParticipants.length})
              </p>
              <div className="flex-1 flex flex-col gap-2 max-h-80 overflow-y-auto mb-4">
                {roomParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-4 border-black p-3 bg-zinc-50"
                  >
                    <span className="text-sm font-black uppercase">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={[
                          "w-2 h-2 rounded-full",
                          p.connected ? "bg-green-500" : "bg-zinc-300",
                        ].join(" ")}
                      />
                      <span className="text-xs font-black uppercase text-zinc-400">
                        {p.connected ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                ))}
                {roomParticipants.length === 0 && (
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide py-4 text-center border-4 border-dashed border-zinc-200">
                    Waiting for players...
                  </p>
                )}
              </div>
              <BlockButton
                variant="success"
                size="xl"
                fullWidth
                disabled={roomParticipants.length === 0}
                onClick={startMatch}
              >
                Start Match →
              </BlockButton>
            </BlockCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MatchDashboardShell
      reserveLeftSpace
      header={
        <RoundHeader
          roundNumber={snapshot.roundNumber}
          roundsTotal={snapshot.roundsTotal}
          timeLeftSeconds={snapshot.timeLeftSeconds}
        />
      }
      overlay={
        pausePrompt ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
            <div className="px-6 text-center text-white">
              <p className="text-sm font-black uppercase tracking-[0.4em] opacity-80">
                Match Paused
              </p>
              <h2 className="mt-3 text-7xl font-black uppercase md:text-8xl">
                {pausePrompt}
              </h2>
              <p className="mt-5 text-lg font-bold uppercase">
                Waiting on players...
              </p>
            </div>
          </div>
        ) : null
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

          <div className="mt-5 grid w-full grid-cols-1 gap-4 border-t border-zinc-200 pt-4 lg:grid-cols-3">
            <div className="px-2 py-1">
              <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
                <Pulse size={14} weight="fill" /> Phase
              </p>
              <p className="text-3xl font-black tabular-nums">{phase}</p>
              <p className="mt-2 text-xs font-black uppercase text-zinc-700">
                Countdown: {phaseCountdown}s
              </p>
            </div>
            <div className="px-2 py-1 lg:border-l lg:border-zinc-200">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
                <Users size={14} weight="fill" /> Players
              </p>
              <p className="text-sm font-black uppercase">
                {roomParticipants.length} connected
              </p>
              <p className="mt-2 text-xs text-zinc-700">
                Combined <BananaInline>{totalBananasInPlay}</BananaInline>
              </p>
            </div>
            <div className="px-2 py-1 lg:border-l lg:border-zinc-200">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
                <Pulse size={14} weight="fill" /> Live Votes
              </p>
              {phase === "vote" ? (
                <p className="text-sm font-black uppercase">
                  {queuedVoteCount} player votes queued
                </p>
              ) : (
                <p className="text-sm text-zinc-600">No active vote window.</p>
              )}
            </div>
          </div>

          {roundWinner && (
            <div className="mt-5 w-full border-4 border-black py-3 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <span
                className="text-2xl font-black uppercase"
                style={{ color: roundWinner === "red" ? "#b91c1c" : "#1d4ed8" }}
              >
                {roundWinner.toUpperCase()} wins this round
              </span>
            </div>
          )}
          {snapshot.tournamentFinished && (
            <div className="mt-5 w-full border-4 border-black py-3 text-center bg-yellow-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-2xl font-black uppercase">
                Tournament Complete
              </span>
            </div>
          )}
        </div>
      }
      rightPanel={
        <div className="flex flex-col gap-6">
          <ActivityFeed
            latestVoteSummary={snapshot.latestVoteSummary}
            latestMicrobetSummary={snapshot.latestMicrobetSummary}
            appliedEffects={appliedEffects}
          />
          {hasBots && <BotBetsTable bots={snapshot.bots} />}
          <section className="border-t border-zinc-200 px-2 pt-4">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-zinc-600">
              <Trophy size={14} weight="fill" /> Player Wallets
            </p>
            <div className="max-h-80 divide-y divide-zinc-200/80 overflow-y-auto pr-1">
              {participantLeaderboard.map((p, i) => {
                const char = participantCharacters[p.id];
                return (
                  <div key={p.id} className="px-1 py-2.5">
                    <p className="text-[10px] font-black uppercase text-zinc-500">
                      #{i + 1}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <CharacterAvatar
                        svgType={char?.svgType}
                        color={char?.color}
                        size={44}
                        className="bg-transparent"
                      />
                      <p className="text-xs font-semibold uppercase">
                        {p.name}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase">
                      <BananaInline>
                        {participantBananas[p.id] ?? settings.startingBananas}
                      </BananaInline>
                    </p>
                  </div>
                );
              })}
              {roomParticipants.length === 0 && (
                <p className="text-xs text-zinc-600">No participants joined.</p>
              )}
            </div>
          </section>
        </div>
      }
      floatingAction={
        <button
          onClick={onExit}
          className="fixed top-4 left-4 z-50 border-4 border-black bg-white px-4 py-2 font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          ← Leave
        </button>
      }
    />
  );
}
