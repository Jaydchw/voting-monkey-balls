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
  Crown,
  Lightning,
  Pulse,
  ShareNetwork,
  Users,
  Wall,
  ArrowsLeftRight,
  Sword,
  Target,
  TrendUp,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
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
import { BananaInline } from "@/components/ui/banana-inline";
import { BotStandings } from "@/components/game/standings/bot-standings";
import { MatchDashboardShell } from "@/components/game/layout/match-dashboard-shell";
import { CharacterAvatar } from "@/components/game/character/character-avatar";
import { type AppliedEffect } from "@/components/game/standings/activity-feed";
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
  MicrobetSettlementResult,
  ParticipantPublicState,
  PendingMicrobetWire,
  PlayerAction,
  SerializableVoteWindow,
  ServerEnvelope,
} from "@/multiplayer/protocol";
import { GameAudioController } from "@/lib/game-audio";
import { useMenuAudio } from "@/components/menu-audio-context";
import {
  TournamentLeaderboard,
  type LeaderboardEntry,
} from "@/components/game/tournament-leaderboard";
import { RoundWinScreen } from "@/components/game/round-win-screen";
import { PhaseScreen } from "@/components/game/phase-screen";

const STARTING_HEALTH = 100;
const DEFAULT_DECISION_TIMER_SECONDS = 12;
const PITY_THRESHOLD = 5;
const PITY_GRANT = 20;

const DEFAULT_SETTINGS: HostRoomSettings = {
  botCount: 0,
  startingBananas: 100,
  decisionTimerSeconds: DEFAULT_DECISION_TIMER_SECONDS,
  waitForAllDecisions: true,
  roundTimerSeconds: 120,
  roundsTotal: 3,
};

type MainBetSelection = { side: BallId; stake: number };
type PendingPlayerMicrobet = PendingMicrobetWire & { id: string; odds: number };

type RecentBetEntry = {
  playerName: string;
  description: string;
  timestamp: number;
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

function PhaseProgressBar({
  phase,
  countdown,
  maxSeconds,
}: {
  phase: MatchPhase;
  countdown: number;
  maxSeconds: number;
}) {
  if (maxSeconds <= 0 || countdown <= 0) return null;
  const pct = Math.max(0, Math.min(100, (countdown / maxSeconds) * 100));
  const colors: Record<string, string> = {
    prematch: "bg-yellow-400",
    vote: "bg-violet-400",
    reveal: "bg-violet-300",
    microbet: "bg-orange-400",
  };
  return (
    <div className="w-full h-2 bg-zinc-200 border border-black/10 overflow-hidden">
      <motion.div
        className={`h-full ${colors[phase] ?? "bg-zinc-300"}`}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

function LiveStatRow({
  icon,
  label,
  redValue,
  blueValue,
  yellowValue,
}: {
  icon: ReactNode;
  label: string;
  redValue?: number;
  blueValue?: number;
  yellowValue?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500">
        {icon} {label}
      </span>
      <div className="flex items-center gap-1.5">
        {redValue !== undefined && (
          <span className="text-[10px] font-black tabular-nums bg-red-100 border border-red-200 px-1.5 py-0.5 text-red-700">
            {redValue}
          </span>
        )}
        {blueValue !== undefined && (
          <span className="text-[10px] font-black tabular-nums bg-blue-100 border border-blue-200 px-1.5 py-0.5 text-blue-700">
            {blueValue}
          </span>
        )}
        {yellowValue !== undefined && (
          <span className="text-[10px] font-black tabular-nums bg-yellow-100 border border-yellow-200 px-1.5 py-0.5 text-yellow-700">
            {yellowValue}
          </span>
        )}
      </div>
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
    return () => {
      ctrl.dispose();
      audioCtrlRef.current = null;
      resumeFromGame();
    };
  }, [resumeFromGame]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (matchStarted) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  const [matchStarted, setMatchStarted] = useState(false);
  const [phase, setPhase] = useState<MatchPhase>("lobby");
  const [phaseCountdown, setPhaseCountdown] = useState(0);
  const [phaseMaxSeconds, setPhaseMaxSeconds] = useState(0);
  const [settings, setSettings] = useState<HostRoomSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[]
  >([]);
  const [showWinScreen, setShowWinScreen] = useState(false);

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
  const [participantCharacters, setParticipantCharacters] = useState<
    Record<string, { svgType: string; color: string }>
  >({});
  const [recentBets, setRecentBets] = useState<RecentBetEntry[]>([]);

  const [mainBets, setMainBets] = useState<
    Record<string, MainBetSelection | null>
  >({});
  const [voteActionsCount, setVoteActionsCount] = useState(0);
  const [activeMicrobetCount, setActiveMicrobetCount] = useState(0);

  const [liveStats, setLiveStats] = useState<StatTotals>(createZeroTotals());

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
  const phaseMaxSecondsRef = useRef(0);
  const lastVoteStatsRef = useRef<StatTotals | null>(null);

  const banksRef = useRef<Record<string, number>>({});
  const totalPayoutRef = useRef<Record<string, number>>({});
  const roundPayoutRef = useRef<Record<string, number>>({});
  const roomParticipantsRef = useRef<
    Array<{ id: string; name: string; token?: string; connected: boolean }>
  >([]);
  const participantCharactersRef = useRef<
    Record<string, { svgType: string; color: string }>
  >({});
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
  const microbetSettlementsRef = useRef<
    Record<string, MicrobetSettlementResult[]>
  >({});
  const recentBetsRef = useRef<RecentBetEntry[]>([]);
  const maybeAdvanceDecisionPhaseRef = useRef<() => void>(() => {});
  const settingsRef = useRef<HostRoomSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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
    phaseMaxSecondsRef.current = seconds;
    setPhase(next);
    setPhaseCountdown(seconds);
    setPhaseMaxSeconds(seconds);
  }, []);

  const getDecisionWindowSeconds = useCallback(
    () =>
      settingsRef.current.waitForAllDecisions
        ? 0
        : settingsRef.current.decisionTimerSeconds,
    [],
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
        next[p.id] =
          banksRef.current[p.id] ?? settingsRef.current.startingBananas;
      setParticipantBananas(next);
    },
    [],
  );

  const addRecentBet = useCallback(
    (playerName: string, description: string) => {
      const entry: RecentBetEntry = {
        playerName,
        description,
        timestamp: Date.now(),
      };
      recentBetsRef.current = [entry, ...recentBetsRef.current].slice(0, 20);
      setRecentBets([...recentBetsRef.current]);
    },
    [],
  );

  const updateMicrobetCount = useCallback(() => {
    let count = 0;
    for (const bets of Object.values(activeMicrobetsRef.current))
      count += bets.length;
    for (const bets of Object.values(queuedMicrobetsRef.current))
      count += bets.length;
    setActiveMicrobetCount(count);
  }, []);

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
      const newSettlements: Record<string, MicrobetSettlementResult[]> = {};
      for (const [pid, bets] of Object.entries(activeMicrobetsRef.current)) {
        if (bets.length === 0) continue;
        const results: MicrobetSettlementResult[] = [];
        let payout = 0;
        for (const bet of bets) {
          const won = didMicrobetWin(bet.kind, bet.outcome, delta);
          const betPayout = won ? Math.floor(bet.stake * bet.odds) : 0;
          payout += betPayout;
          results.push({
            kind: bet.kind,
            outcome: bet.outcome,
            stake: bet.stake,
            payout: betPayout,
            won,
          });
        }
        newSettlements[pid] = results;
        if (payout > 0) {
          banksRef.current[pid] =
            (banksRef.current[pid] ?? settingsRef.current.startingBananas) +
            payout;
          totalPayoutRef.current[pid] =
            (totalPayoutRef.current[pid] ?? 0) + payout;
          roundPayoutRef.current[pid] =
            (roundPayoutRef.current[pid] ?? 0) + payout;
        }
      }
      microbetSettlementsRef.current = newSettlements;
      activeMicrobetsRef.current = {};
      updateMicrobetCount();
      syncParticipantBananas();
    },
    [syncParticipantBananas, updateMicrobetCount],
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
    for (const [pid, bets] of Object.entries(queuedMicrobetsRef.current)) {
      if (bets.length > 0) activeMicrobetsRef.current[pid] = bets;
    }
    queuedMicrobetsRef.current = {};
    updateMicrobetCount();
    lastVoteStatsRef.current = { ...statsTotalsRef.current };
    transitionPhase("running", 0);
  }, [transitionPhase, updateMicrobetCount]);

  const getLiveVoteTotals = useCallback(() => {
    let optA = 0,
      optB = 0,
      optC = 0;
    for (const vote of Object.values(voteActionsRef.current)) {
      if (vote.selection === 0) optA += vote.power;
      else if (vote.selection === 1) optB += vote.power;
      else optC += vote.power;
    }
    return { optionA: optA, optionB: optB, optionC: optC };
  }, []);

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
    const liveTotals = phase === "vote" ? getLiveVoteTotals() : null;
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
      liveVoteTotals: liveTotals,
      microbetSettlements: microbetSettlementsRef.current,
      recentBets: recentBetsRef.current.slice(0, 10),
    };
    socket.send(
      JSON.stringify({ type: "host-state", state } satisfies ClientEnvelope),
    );
  }, [
    blueHealth,
    getLiveVoteTotals,
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
      const playerName =
        roomParticipantsRef.current.find((p) => p.id === playerId)?.name ??
        "Unknown";
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
        participantCharactersRef.current[playerId] = { svgType, color };
        return;
      }
      if (phaseRef.current === "prematch") {
        if (action.kind === "main-bet") {
          const minStake = Math.max(
            5,
            Math.floor(settingsRef.current.startingBananas / 10),
          );
          const stake = Math.max(minStake, Math.floor(action.stake));
          const side: BallId = action.side === "blue" ? "blue" : "red";
          const cur =
            banksRef.current[playerId] ?? settingsRef.current.startingBananas;
          const existing = mainBetsRef.current[playerId];
          const restored = cur + (existing ? existing.stake : 0);
          if (restored < stake) return;
          banksRef.current[playerId] = restored - stake;
          mainBetsRef.current[playerId] = { side, stake };
          setMainBets((prev) => ({ ...prev, [playerId]: { side, stake } }));
          addRecentBet(playerName, `Bet ${stake} on ${side.toUpperCase()}`);
          syncParticipantBananas();
          maybeAdvanceDecisionPhaseRef.current();
          return;
        }
        if (action.kind === "main-bet-skip") {
          const existing = mainBetsRef.current[playerId];
          if (existing) {
            banksRef.current[playerId] =
              (banksRef.current[playerId] ??
                settingsRef.current.startingBananas) + existing.stake;
            mainBetsRef.current[playerId] = null;
            setMainBets((prev) => ({ ...prev, [playerId]: null }));
            syncParticipantBananas();
          }
          if (
            !Object.prototype.hasOwnProperty.call(mainBetsRef.current, playerId)
          ) {
            mainBetsRef.current[playerId] = null;
            setMainBets((prev) => ({ ...prev, [playerId]: null }));
          }
          addRecentBet(playerName, "Skipped main bet");
          maybeAdvanceDecisionPhaseRef.current();
        }
        return;
      }
      if (phaseRef.current === "vote" && action.kind === "vote") {
        voteActionsRef.current[playerId] = {
          selection: action.selection,
          power: Math.max(0, Math.floor(action.power)),
        };
        setVoteActionsCount(Object.keys(voteActionsRef.current).length);
        const optionLabels = ["Option A", "Option B", "Option C"];
        addRecentBet(
          playerName,
          `Voted ${optionLabels[action.selection]} (${action.power} power)`,
        );
        maybeAdvanceDecisionPhaseRef.current();
        return;
      }
      if (phaseRef.current === "microbet") {
        if (action.kind === "microbet") {
          const cur =
            banksRef.current[playerId] ?? settingsRef.current.startingBananas;
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
          updateMicrobetCount();
          banksRef.current[playerId] = restored - total;
          addRecentBet(
            playerName,
            `Placed ${sanitized.length} microbet${sanitized.length !== 1 ? "s" : ""} (${total} staked)`,
          );
          syncParticipantBananas();
          maybeAdvanceDecisionPhaseRef.current();
          return;
        }
        if (action.kind === "microbet-skip") {
          const existing = queuedMicrobetsRef.current[playerId] ?? [];
          const refund = existing.reduce((s, b) => s + b.stake, 0);
          if (refund > 0) {
            banksRef.current[playerId] =
              (banksRef.current[playerId] ??
                settingsRef.current.startingBananas) + refund;
            syncParticipantBananas();
          }
          queuedMicrobetsRef.current[playerId] = [];
          updateMicrobetCount();
          maybeAdvanceDecisionPhaseRef.current();
        }
      }
    },
    [addRecentBet, syncParticipantBananas, updateMicrobetCount],
  );

  const resolveVoteAndOpenMicrobet = useCallback(() => {
    lastVoteStatsRef.current = { ...statsTotalsRef.current };
    let optA = 0,
      optB = 0,
      optC = 0;
    let anySpend = false;
    for (const [pid, vote] of Object.entries(voteActionsRef.current)) {
      const cur = banksRef.current[pid] ?? settingsRef.current.startingBananas;
      const spend = Math.min(cur, vote.power);
      if (spend <= 0) continue;
      banksRef.current[pid] = cur - spend;
      if (vote.selection === 0) optA += spend;
      else if (vote.selection === 1) optB += spend;
      else optC += spend;
      anySpend = true;
    }
    voteActionsRef.current = {};
    setVoteActionsCount(0);
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
  }, [applyVoteApplication, engine, syncParticipantBananas, transitionPhase]);

  const applyPityRewards = useCallback(() => {
    for (const p of roomParticipantsRef.current) {
      const current = banksRef.current[p.id] ?? 0;
      if (current < PITY_THRESHOLD) {
        banksRef.current[p.id] = current + PITY_GRANT;
        addRecentBet(p.name ?? "Player", `Received ${PITY_GRANT} pity bananas`);
      }
    }
    syncParticipantBananas();
  }, [addRecentBet, syncParticipantBananas]);

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
    setVoteWindow(null);
    setRevealedVoteOption(null);
    setMicrobetInsights([]);
    mainBetsRef.current = {};
    setMainBets({});
    voteActionsRef.current = {};
    setVoteActionsCount(0);
    queuedMicrobetsRef.current = {};
    activeMicrobetsRef.current = {};
    updateMicrobetCount();
    microbetSettlementsRef.current = {};
    for (const pid of Object.keys(roundPayoutRef.current))
      roundPayoutRef.current[pid] = 0;
    lastVoteStatsRef.current = null;
    gameApiRef.current = null;
    applyPityRewards();
    transitionPhase("prematch", getDecisionWindowSeconds());
  }, [
    applyPityRewards,
    getDecisionWindowSeconds,
    transitionPhase,
    updateMicrobetCount,
  ]);

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

  const startMatch = () => {
    if (roomParticipantsRef.current.length === 0) return;
    pauseForGame();
    void audioCtrlRef.current?.loadRound(1);
    const s = settingsRef.current;
    const freshEngine = new BotsGameEngine({
      botCount: s.botCount,
      startingBananas: s.startingBananas,
      roundDurationSeconds: s.roundTimerSeconds,
      totalRounds: s.roundsTotal,
      voteIntervalSeconds: 10,
      minMainBet: Math.max(5, Math.floor(s.startingBananas / 10)),
    });
    for (const p of roomParticipantsRef.current) {
      banksRef.current[p.id] = s.startingBananas;
      totalPayoutRef.current[p.id] = 0;
      roundPayoutRef.current[p.id] = 0;
    }
    mainBetsRef.current = {};
    setMainBets({});
    voteActionsRef.current = {};
    setVoteActionsCount(0);
    queuedMicrobetsRef.current = {};
    activeMicrobetsRef.current = {};
    updateMicrobetCount();
    microbetSettlementsRef.current = {};
    recentBetsRef.current = [];
    setRecentBets([]);
    setEngine(freshEngine);
    setSnapshot(freshEngine.getSnapshot());
    setMatchStarted(true);
    setShowLeaderboard(false);
    setLeaderboardEntries([]);
    syncParticipantBananas();
    resetBoardForNextRound();
  };

  const snapshotLeaderboardEntries = useCallback((): LeaderboardEntry[] => {
    const participantEntries: LeaderboardEntry[] =
      roomParticipantsRef.current.map((p) => {
        const char = participantCharactersRef.current[p.id];
        return {
          id: p.id,
          name: p.name,
          bananas:
            banksRef.current[p.id] ?? settingsRef.current.startingBananas,
          characterSvg: char?.svgType,
          characterColor: char?.color,
        };
      });
    const snap = engine.getSnapshot();
    const botEntries: LeaderboardEntry[] = snap.leaderboard.map((bot) => ({
      id: bot.id,
      name: bot.name,
      bananas: bot.bananas,
    }));
    const all = [...participantEntries, ...botEntries];
    all.sort((a, b) => b.bananas - a.bananas);
    return all;
  }, [engine]);

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
            banksRef.current[p.id] = settingsRef.current.startingBananas;
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
      if (payload.type === "player-action") {
        handleIncomingAction(payload.playerId, payload.action);
      }
    });
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [handleIncomingAction, roomCode, syncParticipantBananas]);

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
      setLiveStats({ ...statsTotalsRef.current });

      if (phaseRef.current === "prematch") {
        if (settingsRef.current.waitForAllDecisions) return;
        const next = Math.max(0, phaseCountdownRef.current - 1);
        phaseCountdownRef.current = next;
        setPhaseCountdown(next);
        if (next === 0) transitionPhase("running", 0);
        return;
      }
      if (phaseRef.current === "vote") {
        if (settingsRef.current.waitForAllDecisions) return;
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
          microbetSettlementsRef.current = {};
          setMicrobetInsights(engine.getPendingMicrobetInsights());
          transitionPhase("microbet", getDecisionWindowSeconds());
        }
        return;
      }
      if (phaseRef.current === "microbet") {
        if (settingsRef.current.waitForAllDecisions) return;
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
        setVoteWindow(stepResult.voteWindow);
        setRevealedVoteOption(null);
        transitionPhase("vote", getDecisionWindowSeconds());
      }
      setSnapshot(stepResult.snapshot);
      if (stepResult.roundResult) {
        settlePlayerMicrobets(statsTotalsRef.current);
        setRoundWinner(stepResult.roundResult.winner);
        setShowWinScreen(true);
        for (const [pid, bet] of Object.entries(mainBetsRef.current)) {
          if (!bet) continue;
          if (bet.side === stepResult.roundResult.winner) {
            const payout = bet.stake * 2;
            banksRef.current[pid] =
              (banksRef.current[pid] ?? settingsRef.current.startingBananas) +
              payout;
            totalPayoutRef.current[pid] =
              (totalPayoutRef.current[pid] ?? 0) + payout;
            roundPayoutRef.current[pid] =
              (roundPayoutRef.current[pid] ?? 0) + payout;
          }
        }
        mainBetsRef.current = {};
        setMainBets({});
        voteActionsRef.current = {};
        setVoteActionsCount(0);
        queuedMicrobetsRef.current = {};
        activeMicrobetsRef.current = {};
        updateMicrobetCount();
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
        }, 2500);
      }
      if (stepResult.roundResult && stepResult.snapshot.tournamentFinished) {
        roundAdvanceTimeoutRef.current = setTimeout(() => {
          setShowWinScreen(false);
          setLeaderboardEntries(snapshotLeaderboardEntries());
          setShowLeaderboard(true);
          roundAdvanceTimeoutRef.current = null;
        }, 2500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    engine,
    getDecisionWindowSeconds,
    matchStarted,
    resetBoardForNextRound,
    resolveVoteAndOpenMicrobet,
    settlePlayerMicrobets,
    closeMicrobetWindow,
    syncParticipantBananas,
    transitionPhase,
    updateMicrobetCount,
    snapshotLeaderboardEntries,
  ]);

  useEffect(() => {
    publishState();
  }, [publishState, participantBananas, phase, phaseCountdown]);

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

  const phaseScreenActive =
    phase === "prematch" ||
    phase === "vote" ||
    phase === "reveal" ||
    phase === "microbet";

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
              <div className="inline-block border-4 border-black px-3 py-1 bg-primary text-primary-foreground">
                <span className="text-xs font-black uppercase tracking-[0.3em]">
                  Multiplayer Host
                </span>
              </div>
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
    <>
      {showLeaderboard && (
        <TournamentLeaderboard
          entries={leaderboardEntries}
          onPlayAgain={startMatch}
          onExit={onExit}
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

      <MatchDashboardShell
        header={
          <div className="pt-10 mb-6">
            <div className="flex items-center justify-center gap-4 flex-wrap">
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
            {phaseScreenActive && (
              <PhaseProgressBar
                phase={phase}
                countdown={phaseCountdown}
                maxSeconds={phaseMaxSeconds}
              />
            )}
          </div>
        }
        overlay={
          phaseScreenActive ? (
            <PhaseScreen
              phase={phase}
              countdown={phaseCountdown}
              maxSeconds={phaseMaxSeconds}
              playersReady={
                phase === "prematch"
                  ? Object.keys(mainBets).length
                  : phase === "vote"
                    ? voteActionsCount
                    : undefined
              }
              playersTotal={roomParticipants.filter((p) => p.connected).length}
              waitForAll={settings.waitForAllDecisions}
            />
          ) : null
        }
        leftPanel={
          <div className="flex flex-col gap-4">
            <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-3 py-2 border-b-4 border-black bg-black text-white flex items-center gap-2">
                <Crown size={14} weight="fill" className="text-yellow-400" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Leaderboard
                </p>
              </div>
              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                {participantLeaderboard.map((p, i) => {
                  const char = participantCharacters[p.id];
                  const bet = mainBets[p.id];
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-2 px-3 py-2.5"
                    >
                      <span className="text-[10px] font-black text-zinc-400 w-5">
                        #{i + 1}
                      </span>
                      {char?.svgType ? (
                        <div className="border-2 border-black shrink-0">
                          <CharacterAvatar
                            svgType={char.svgType}
                            color={char.color}
                            size={32}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 border-2 border-zinc-200 bg-zinc-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase truncate">
                          {p.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${p.connected ? "bg-green-400" : "bg-zinc-300"}`}
                          />
                          <BananaInline className="text-[10px] font-bold">
                            {participantBananas[p.id] ??
                              settings.startingBananas}
                          </BananaInline>
                        </div>
                      </div>
                      {bet && (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 border-2 border-black ${bet.side === "red" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                        >
                          {bet.side.toUpperCase()}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-3 py-2 border-b-4 border-black bg-zinc-900 text-white flex items-center gap-2">
                <Target size={14} weight="fill" className="text-orange-400" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Live Round Stats
                </p>
              </div>
              <div className="p-3 flex flex-col gap-2.5">
                <LiveStatRow
                  icon={
                    <Sword size={10} weight="fill" className="text-red-500" />
                  }
                  label="Red Dmg"
                  redValue={Math.round(liveStats.redDamageTaken)}
                />
                <LiveStatRow
                  icon={
                    <Sword size={10} weight="fill" className="text-blue-500" />
                  }
                  label="Blue Dmg"
                  blueValue={Math.round(liveStats.blueDamageTaken)}
                />
                <LiveStatRow
                  icon={
                    <Wall size={10} weight="fill" className="text-zinc-500" />
                  }
                  label="Wall Hits"
                  redValue={liveStats.wallHitsRed}
                  blueValue={liveStats.wallHitsBlue}
                />
                <LiveStatRow
                  icon={
                    <ArrowsLeftRight
                      size={10}
                      weight="fill"
                      className="text-yellow-500"
                    />
                  }
                  label="Collisions"
                  yellowValue={liveStats.ballCollisions}
                />
                <div className="border-t-2 border-zinc-100 pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1">
                    <TrendUp
                      size={10}
                      weight="fill"
                      className="text-orange-500"
                    />{" "}
                    Microbets
                  </span>
                  <span className="text-xs font-black bg-orange-100 border border-orange-200 px-1.5 py-0.5 text-orange-700">
                    {activeMicrobetCount} active
                  </span>
                </div>
                {phase === "vote" && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-zinc-500">
                      Votes in
                    </span>
                    <span className="text-xs font-black bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-violet-700">
                      {voteActionsCount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-3 py-2 border-b-4 border-black bg-yellow-400 flex items-center gap-2">
                <Lightning size={14} weight="fill" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Recent Bets
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100">
                <AnimatePresence initial={false}>
                  {recentBets.slice(0, 8).map((entry, i) => (
                    <motion.div
                      key={`${entry.timestamp}-${i}`}
                      initial={{ opacity: 0, x: -8, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      className="px-3 py-2"
                    >
                      <p className="text-[10px] font-black uppercase text-zinc-500">
                        {entry.playerName}
                      </p>
                      <p className="text-xs text-zinc-800">
                        {entry.description}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {recentBets.length === 0 && (
                  <p className="text-xs text-zinc-400 px-3 py-3">
                    No bets yet.
                  </p>
                )}
              </div>
            </div>

            {hasBots && (
              <BotStandings
                leaderboard={snapshot.leaderboard}
                latestLog={snapshot.latestLog}
              />
            )}
          </div>
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
          </div>
        }
        rightPanel={
          <div className="flex flex-col gap-4">
            <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="px-3 py-2 border-b-4 border-black bg-zinc-900 text-white flex items-center gap-2">
                <Pulse size={14} weight="fill" className="text-green-400" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Match Status
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x-4 divide-black border-b-4 border-black">
                <div className="p-2.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    Phase
                  </p>
                  <p className="text-xs font-black uppercase truncate">
                    {phase}
                  </p>
                  {phaseCountdown > 0 && (
                    <p className="text-[9px] font-black text-zinc-400 mt-0.5">
                      {phaseCountdown}s
                    </p>
                  )}
                </div>
                <div className="p-2.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1 flex items-center justify-center gap-0.5">
                    <Users size={8} weight="fill" /> Players
                  </p>
                  <p className="text-sm font-black">
                    {roomParticipants.filter((p) => p.connected).length}/
                    {roomParticipants.length}
                  </p>
                  <p className="text-[9px] font-black text-zinc-400">online</p>
                </div>
                <div className="p-2.5 text-center bg-yellow-300">
                  <p className="text-[8px] font-black uppercase tracking-widest text-yellow-900 mb-1">
                    Pool
                  </p>
                  <p className="text-sm font-black tabular-nums">
                    {totalBananasInPlay}
                  </p>
                  <p className="text-[9px] font-black text-yellow-800">🍌</p>
                </div>
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
        floatingAction={
          <button
            onClick={onExit}
            className="fixed top-4 left-4 z-50 border-4 border-black bg-white px-4 py-2 font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            ← Leave
          </button>
        }
      />
    </>
  );
}
