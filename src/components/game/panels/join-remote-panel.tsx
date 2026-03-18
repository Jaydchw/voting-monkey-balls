"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PartySocket from "partysocket";
import { motion, AnimatePresence } from "framer-motion";
import { RoundHeader } from "@/components/game/hud/round-header";
import {
  CharacterSelectModal,
  MicrobetsModal,
  PrematchBetModal,
  VoteEventModal,
  VoteRevealModal,
} from "@/components/game/modals";
import {
  MicrobetSettlementModal,
  type SettlementEntry,
} from "@/components/game/modals/microbet-settlement-modal";
import { CharacterAvatar } from "@/components/game/character/character-avatar";
import type { BallId, MicroBetKind } from "@/bots/types";
import type {
  MainBetSelection,
  MicrobetDraft,
  PendingPlayerMicrobet,
} from "@/components/game/modals/types";
import type {
  ClientEnvelope,
  HostBroadcastState,
  PendingMicrobetWire,
  ServerEnvelope,
} from "@/multiplayer/protocol";
import {
  getSocketProtocol,
  PARTYKIT_HOST,
  PARTYKIT_PARTY,
} from "@/lib/multiplayer";
import {
  savePlayerSession,
  clearPlayerSession,
} from "@/lib/multiplayer-session";
import { useMenuAudio } from "@/components/menu-audio-context";

const MAIN_BET_MIN_STAKE = 20;

const MICROBET_KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red outdamages Blue",
  blueDamageToRed: "Blue outdamages Red",
  redWallHits: "Red gets more wall hits",
  blueWallHits: "Blue gets more wall hits",
  ballCollisions: "Collisions hit 10+",
};

type JoinRemotePanelProps = {
  roomCode: string;
  playerName: string;
  playerToken: string;
  onExit: () => void;
};

function HealthMini({
  label,
  color,
  health,
}: {
  label: string;
  color: "red" | "blue";
  health: number;
}) {
  const pct = Math.max(0, Math.min(100, health));
  const isLow = health <= 25;
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-black uppercase tracking-widest ${color === "red" ? "text-red-600" : "text-blue-600"}`}
        >
          {label}
        </span>
        <motion.span
          key={Math.round(health)}
          className="text-xs font-black tabular-nums"
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(health)}
        </motion.span>
      </div>
      <div className="h-3 bg-zinc-200 border-2 border-black overflow-hidden">
        <motion.div
          className={`h-full ${color === "red" ? "bg-red-500" : "bg-blue-500"}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      {isLow && health > 0 && (
        <motion.p
          className={`text-[10px] font-black uppercase mt-0.5 ${color === "red" ? "text-red-500" : "text-blue-500"}`}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          LOW HP
        </motion.p>
      )}
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: string }) {
  const colors: Record<string, string> = {
    prematch: "bg-yellow-300 text-black",
    running: "bg-green-400 text-black",
    vote: "bg-violet-400 text-white",
    reveal: "bg-violet-300 text-black",
    microbet: "bg-orange-400 text-black",
    lobby: "bg-zinc-200 text-zinc-700",
    finished: "bg-zinc-400 text-white",
  };
  const labels: Record<string, string> = {
    prematch: "Place Bets",
    running: "In Progress",
    vote: "Voting Now",
    reveal: "Vote Result",
    microbet: "Microbets",
    lobby: "Lobby",
    finished: "Finished",
  };
  return (
    <motion.span
      key={phase}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-black ${colors[phase] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {labels[phase] ?? phase}
    </motion.span>
  );
}

export default function JoinRemotePanel({
  roomCode,
  playerName,
  playerToken,
  onExit,
}: JoinRemotePanelProps) {
  const { pauseForGame, resumeFromGame } = useMenuAudio();

  useEffect(() => {
    pauseForGame();
    savePlayerSession({ roomCode, playerName, playerToken });
    return () => {
      resumeFromGame();
    };
  }, [pauseForGame, resumeFromGame, roomCode, playerName, playerToken]);

  const socketRef = useRef<PartySocket | null>(null);
  const phaseRef = useRef<HostBroadcastState["phase"] | null>(null);

  const [socketConnected, setSocketConnected] = useState(false);
  const [state, setState] = useState<HostBroadcastState | null>(null);
  const stateRef = useRef<HostBroadcastState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [mainBetSelection, setMainBetSelection] = useState<MainBetSelection>({
    side: "blue",
    stake: MAIN_BET_MIN_STAKE,
  });
  const [prematchDecisionSubmitted, setPrematchDecisionSubmitted] =
    useState(false);
  const [prematchDecision, setPrematchDecision] = useState<
    "red" | "blue" | "skip" | null
  >(null);
  const [voteSelection, setVoteSelection] = useState<0 | 1 | 2 | null>(null);
  const [votePowerStake, setVotePowerStake] = useState(1);
  const [microbetDraft, setMicrobetDraft] = useState<MicrobetDraft>({
    kind: "redDamageToBlue",
    outcome: true,
    stake: 5,
  });
  const [characterSelectionSubmitted, setCharacterSelectionSubmitted] =
    useState(false);
  const [queuedMicrobets, setQueuedMicrobets] = useState<
    PendingPlayerMicrobet[]
  >([]);

  const [settlementEntries, setSettlementEntries] = useState<SettlementEntry[]>(
    [],
  );
  const [settlementNet, setSettlementNet] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  const [pickedVoteOptionIndex, setPickedVoteOptionIndex] = useState<
    0 | 1 | 2 | null
  >(null);

  const prematchTouchedRef = useRef(false);
  const voteTouchedRef = useRef(false);
  const voteSubmittedRef = useRef(false);
  const microbetTouchedRef = useRef(false);
  const autoHandledPhaseRef = useRef<string | null>(null);

  const myParticipant = useMemo(() => {
    if (!state) return null;
    return state.participants.find((p) => p.token === playerToken) ?? null;
  }, [playerToken, state]);

  const bananas = myParticipant?.bananas ?? 0;

  const participantLeaderboard = useMemo(() => {
    if (!state) return [];
    return [...state.participants].sort((a, b) => b.bananas - a.bananas);
  }, [state]);

  const needsCharacterSelection =
    Boolean(myParticipant) &&
    state?.phase === "prematch" &&
    state.snapshot.roundNumber === 1 &&
    !myParticipant?.characterSvg;

  useEffect(() => {
    if (!roomCode || !playerName || !playerToken) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      party: PARTYKIT_PARTY,
      room: roomCode,
      protocol: getSocketProtocol(),
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setSocketConnected(true);
      socket.send(
        JSON.stringify({
          type: "hello",
          role: "joiner",
          playerName,
          playerToken,
        } satisfies ClientEnvelope),
      );
      socket.send(
        JSON.stringify({ type: "request-state" } satisfies ClientEnvelope),
      );
    });

    socket.addEventListener("close", () => setSocketConnected(false));

    socket.addEventListener("message", (event) => {
      let payload: ServerEnvelope;
      try {
        payload = JSON.parse(event.data as string) as ServerEnvelope;
      } catch {
        return;
      }

      if (payload.type === "room-state" && payload.state) {
        const incoming = payload.state;
        const prevPhase = phaseRef.current;
        const currentState = stateRef.current;

        if (prevPhase !== incoming.phase) {
          if (incoming.phase !== "microbet") {
            setQueuedMicrobets([]);
            setMicrobetDraft({
              kind: "redDamageToBlue",
              outcome: true,
              stake: 5,
            });
            microbetTouchedRef.current = false;
          }
          if (incoming.phase !== "vote") {
            setVotePowerStake(1);
            setVoteSelection(null);
            setPickedVoteOptionIndex(null);
            voteTouchedRef.current = false;
            voteSubmittedRef.current = false;
          }
          if (incoming.phase !== "prematch") {
            setMainBetSelection({ side: "blue", stake: MAIN_BET_MIN_STAKE });
            setPrematchDecisionSubmitted(false);
            setPrematchDecision(null);
          }
          if (incoming.phase === "prematch") {
            setPrematchDecisionSubmitted(false);
            setPrematchDecision(null);
            prematchTouchedRef.current = false;
          }

          if (prevPhase === "microbet" && incoming.phase === "vote") {
            const prevParticipant = currentState?.participants.find(
              (p) => p.token === playerToken,
            );
            const nextParticipant = incoming.participants.find(
              (p) => p.token === playerToken,
            );
            if (prevParticipant && nextParticipant) {
              const diff = nextParticipant.bananas - prevParticipant.bananas;
              const prevActive = prevParticipant.activeMicrobets ?? [];
              if (prevActive.length > 0) {
                const entries: SettlementEntry[] = prevActive.map((bet) => {
                  const payout = diff > 0 ? bet.stake * 2 : 0;
                  const won = diff > 0;
                  return {
                    kind: bet.kind,
                    outcome: bet.outcome,
                    stake: bet.stake,
                    payout,
                    won,
                  };
                });
                const net = entries.reduce(
                  (s, e) => s + (e.won ? e.stake : -e.stake),
                  0,
                );
                setSettlementEntries(entries);
                setSettlementNet(net);
                setShowSettlement(true);
              }
            }
          }

          autoHandledPhaseRef.current = null;
        }

        phaseRef.current = incoming.phase;
        setState(incoming);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [playerName, playerToken, roomCode]);

  const sendAction = (action: ClientEnvelope) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(action));
  };

  const submitCharacter = (svgType: string, color: string) => {
    if (characterSelectionSubmitted || myParticipant?.characterSvg) return;
    sendAction({
      type: "player-action",
      action: { kind: "set-character", svgType, color },
    });
    setCharacterSelectionSubmitted(true);
  };

  const placeMainBet = () => {
    if (prematchDecisionSubmitted) return;
    sendAction({
      type: "player-action",
      action: {
        kind: "main-bet",
        side: mainBetSelection.side,
        stake: mainBetSelection.stake,
      },
    });
    setPrematchDecision(mainBetSelection.side);
    setPrematchDecisionSubmitted(true);
  };

  const skipMainBet = () => {
    if (prematchDecisionSubmitted) return;
    sendAction({ type: "player-action", action: { kind: "main-bet-skip" } });
    setPrematchDecision("skip");
    setPrematchDecisionSubmitted(true);
  };

  const castVote = (selection: 0 | 1 | 2) => {
    if (voteSubmittedRef.current) return;
    voteSubmittedRef.current = true;
    setVoteSelection(selection);
    setPickedVoteOptionIndex(selection);
    sendAction({
      type: "player-action",
      action: { kind: "vote", selection, power: votePowerStake },
    });
  };

  const confirmMicrobets = () => {
    const bets: PendingMicrobetWire[] = queuedMicrobets.map((bet) => ({
      kind: bet.kind,
      outcome: bet.outcome,
      stake: bet.stake,
    }));
    sendAction({ type: "player-action", action: { kind: "microbet", bets } });
  };

  const addMicrobet = () => {
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, bananas - queuedTotal);
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
  };

  const addQuickMicrobet = (quickDraft: MicrobetDraft) => {
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, bananas - queuedTotal);
      const stake = Math.min(remaining, Math.max(1, quickDraft.stake));
      if (stake <= 0) return prev;
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          kind: quickDraft.kind,
          outcome: quickDraft.outcome,
          stake,
          odds: 2,
        },
      ];
    });
  };

  const removeMicrobet = (id: string) =>
    setQueuedMicrobets((prev) => prev.filter((bet) => bet.id !== id));

  const skipMicrobets = () =>
    sendAction({ type: "player-action", action: { kind: "microbet-skip" } });

  useEffect(() => {
    if (!state || needsCharacterSelection) return;

    const noActionNeeded =
      state.phase === "running" ||
      state.phase === "reveal" ||
      state.phase === "lobby" ||
      state.phase === "finished";

    if (noActionNeeded) return;

    const phaseToken = `${state.snapshot.roundNumber}-${state.phase}`;

    if (state.phaseCountdown > 0) return;

    if (autoHandledPhaseRef.current === phaseToken) return;

    console.log("[JoinPanel] auto-submit effect firing", {
      phase: state.phase,
      phaseToken,
      prematchDecisionSubmitted,
    });

    if (state.phase === "prematch" && !prematchDecisionSubmitted) {
      const minStake = Math.max(
        5,
        Math.floor((state.settings.startingBananas || 100) / 10),
      );
      if (prematchTouchedRef.current && bananas >= minStake) {
        window.setTimeout(() => {
          sendAction({
            type: "player-action",
            action: {
              kind: "main-bet",
              side: mainBetSelection.side,
              stake: mainBetSelection.stake,
            },
          });
          setPrematchDecision(mainBetSelection.side);
          setPrematchDecisionSubmitted(true);
        }, 0);
      } else if (bananas >= minStake) {
        const randomSide: BallId = Math.random() < 0.5 ? "red" : "blue";
        const randomStake = Math.min(bananas, Math.max(minStake, 20));
        window.setTimeout(() => {
          setMainBetSelection({ side: randomSide, stake: randomStake });
          sendAction({
            type: "player-action",
            action: { kind: "main-bet", side: randomSide, stake: randomStake },
          });
          setPrematchDecision(randomSide);
          setPrematchDecisionSubmitted(true);
        }, 0);
      } else {
        window.setTimeout(() => {
          sendAction({
            type: "player-action",
            action: { kind: "main-bet-skip" },
          });
          setPrematchDecision("skip");
          setPrematchDecisionSubmitted(true);
        }, 0);
      }
      autoHandledPhaseRef.current = phaseToken;
      return;
    }

    if (state.phase === "vote") {
      if (voteSubmittedRef.current) {
        autoHandledPhaseRef.current = phaseToken;
        return;
      }
      const selection = voteTouchedRef.current
        ? (voteSelection ?? (Math.floor(Math.random() * 3) as 0 | 1 | 2))
        : (Math.floor(Math.random() * 3) as 0 | 1 | 2);
      const power = voteTouchedRef.current ? votePowerStake : 1;
      voteSubmittedRef.current = true;
      sendAction({
        type: "player-action",
        action: { kind: "vote", selection, power },
      });
      autoHandledPhaseRef.current = phaseToken;
      return;
    }

    if (state.phase === "microbet") {
      console.log("[JoinPanel] auto-submit microbet", {
        queuedCount: queuedMicrobets.length,
        microbetTouched: microbetTouchedRef.current,
        bananas,
      });
      if (queuedMicrobets.length > 0) {
        const bets: PendingMicrobetWire[] = queuedMicrobets.map((bet) => ({
          kind: bet.kind,
          outcome: bet.outcome,
          stake: bet.stake,
        }));
        console.log("[JoinPanel] sending queued microbets", bets.length);
        window.setTimeout(() => {
          sendAction({
            type: "player-action",
            action: { kind: "microbet", bets },
          });
        }, 0);
      } else if (!microbetTouchedRef.current) {
        const randomDraft: MicrobetDraft = {
          kind: Math.random() < 0.5 ? "redDamageToBlue" : "blueDamageToRed",
          outcome: Math.random() < 0.5,
          stake: Math.max(1, Math.min(10, bananas)),
        };
        const bets: PendingMicrobetWire[] = [
          {
            kind: randomDraft.kind,
            outcome: randomDraft.outcome,
            stake: Math.max(1, Math.min(bananas, randomDraft.stake)),
          },
        ];
        console.log("[JoinPanel] sending random microbet", bets);
        if (bets[0].stake > 0) {
          window.setTimeout(() => {
            sendAction({
              type: "player-action",
              action: { kind: "microbet", bets },
            });
            setQueuedMicrobets([
              {
                id: `${Date.now()}-auto`,
                kind: randomDraft.kind,
                outcome: randomDraft.outcome,
                stake: bets[0].stake,
                odds: 2,
              },
            ]);
          }, 0);
        } else {
          console.log("[JoinPanel] stake=0, sending microbet-skip");
          window.setTimeout(() => {
            sendAction({
              type: "player-action",
              action: { kind: "microbet-skip" },
            });
          }, 0);
        }
      } else {
        console.log(
          "[JoinPanel] microbetTouched=true but no bets queued, sending microbet-skip",
        );
        window.setTimeout(() => {
          sendAction({
            type: "player-action",
            action: { kind: "microbet-skip" },
          });
        }, 0);
      }
      autoHandledPhaseRef.current = phaseToken;
      return;
    }

    autoHandledPhaseRef.current = phaseToken;
  }, [
    bananas,
    characterSelectionSubmitted,
    mainBetSelection.side,
    mainBetSelection.stake,
    needsCharacterSelection,
    prematchDecisionSubmitted,
    queuedMicrobets,
    state,
    votePowerStake,
    voteSelection,
  ]);

  const revealedVoteOption = state?.revealedVoteOption ?? null;

  if (!state) {
    return (
      <div className="w-screen min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          className="w-full max-w-md border-8 border-black p-8 bg-white shadow-[16px_16px_0_0_rgba(0,0,0,1)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
            Joining Room
          </p>
          <h1 className="text-4xl font-black uppercase mb-1">{playerName}</h1>
          <p className="text-sm font-black tracking-widest text-zinc-400 mb-6">
            Room {roomCode}
          </p>
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              className={`w-3 h-3 rounded-full border-2 border-black ${socketConnected ? "bg-green-400" : "bg-zinc-300"}`}
              animate={!socketConnected ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="text-xs font-black uppercase tracking-widest">
              {socketConnected
                ? "Connected — waiting for host..."
                : "Connecting..."}
            </span>
          </div>
          <button
            onClick={() => {
              clearPlayerSession();
              onExit();
            }}
            className="border-4 border-black px-4 py-2 font-black uppercase text-sm bg-zinc-100 hover:bg-zinc-200 transition-colors"
          >
            Leave Room
          </button>
        </motion.div>
      </div>
    );
  }

  const activeLedger = [
    ...(myParticipant?.activeMainBet
      ? [
          {
            id: "main",
            label: `Main: ${myParticipant.activeMainBet.side.toUpperCase()} — ${myParticipant.activeMainBet.stake} 🍌`,
            isMain: true,
          },
        ]
      : []),
    ...(myParticipant?.activeMicrobets ?? []).map((bet, i) => ({
      id: `active-${i}`,
      label: `${MICROBET_KIND_LABEL[bet.kind]} ${bet.outcome ? "YES" : "NO"} (${bet.stake} @ 2x)`,
      isMain: false,
    })),
    ...(myParticipant?.queuedMicrobets ?? []).map((bet, i) => ({
      id: `queued-${i}`,
      label: `Queued: ${MICROBET_KIND_LABEL[bet.kind]} ${bet.outcome ? "YES" : "NO"} (${bet.stake})`,
      isMain: false,
    })),
  ];

  const myRank =
    participantLeaderboard.findIndex((p) => p.token === playerToken) + 1;

  return (
    <div className="w-screen min-h-screen bg-white text-black">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <RoundHeader
          roundNumber={state.snapshot.roundNumber}
          roundsTotal={state.snapshot.roundsTotal}
          timeLeftSeconds={state.snapshot.timeLeftSeconds}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <div className="flex flex-col gap-4">
            <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                    Playing as
                  </p>
                  <h2 className="text-2xl font-black uppercase leading-tight">
                    {playerName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {socketConnected ? `Room ${roomCode}` : "Reconnecting..."}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {myParticipant?.characterSvg && (
                    <CharacterAvatar
                      svgType={myParticipant.characterSvg}
                      color={myParticipant.characterColor}
                      size={52}
                      className="border-2 border-black"
                    />
                  )}
                  <PhaseIndicator phase={state.phase} />
                </div>
              </div>

              <div className="flex gap-6 mb-4">
                <HealthMini label="Red" color="red" health={state.redHealth} />
                <div className="flex items-center text-xl font-black text-zinc-300 self-center px-2">
                  VS
                </div>
                <HealthMini
                  label="Blue"
                  color="blue"
                  health={state.blueHealth}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="border-4 border-black bg-yellow-300 p-3 text-center shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-800 mb-1">
                    Bankroll
                  </p>
                  <motion.p
                    key={bananas}
                    className="text-2xl font-black tabular-nums"
                    initial={{ scale: 1.18 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    {bananas}
                  </motion.p>
                  <p className="text-[10px] text-yellow-800">🍌</p>
                </div>

                <div className="border-4 border-black bg-green-50 p-3 text-center shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-1">
                    Round Payout
                  </p>
                  <motion.p
                    key={myParticipant?.roundPayout ?? 0}
                    className="text-2xl font-black tabular-nums text-green-700"
                    initial={{ scale: 1.15 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    +{myParticipant?.roundPayout ?? 0}
                  </motion.p>
                </div>

                <div className="border-4 border-black bg-blue-50 p-3 text-center shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">
                    Total Payout
                  </p>
                  <p className="text-2xl font-black tabular-nums text-blue-700">
                    +{myParticipant?.totalPayout ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-3 text-zinc-600">
                Active Bets
              </p>
              {activeLedger.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {activeLedger.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className={`flex items-center gap-3 px-3 py-2 border-l-4 ${entry.isMain ? "border-yellow-400 bg-yellow-50" : "border-zinc-300 bg-zinc-50"}`}
                      >
                        <span
                          className={`text-[10px] font-black uppercase shrink-0 ${entry.isMain ? "text-yellow-700" : "text-zinc-500"}`}
                        >
                          {entry.isMain ? "MAIN" : "MICRO"}
                        </span>
                        <p className="text-xs font-bold text-zinc-800 truncate">
                          {entry.label}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  No active bets yet.
                </p>
              )}
            </div>

            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4">
              <p className="text-xs font-black uppercase tracking-widest mb-3 text-zinc-600">
                Market Feed
              </p>
              {state.microbetInsights.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.microbetInsights.map((insight) => (
                    <div
                      key={insight.kind}
                      className="border-2 border-zinc-200 p-2.5 bg-zinc-50"
                    >
                      <p className="text-xs font-black text-zinc-800">
                        {MICROBET_KIND_LABEL[insight.kind]}
                      </p>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-200 overflow-hidden rounded-full">
                          <div
                            className="h-full bg-violet-400"
                            style={{ width: `${insight.averageTarget}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-zinc-500 shrink-0">
                          {insight.averageTarget.toFixed(0)}% yes
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {insight.count} bets · {insight.totalStake} staked
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  No market insights yet.
                </p>
              )}
            </div>

            <button
              onClick={() => {
                clearPlayerSession();
                onExit();
              }}
              className="self-start border-4 border-black px-4 py-2 font-black uppercase text-sm bg-white hover:bg-zinc-100 shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
            >
              Leave Room
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                  Leaderboard
                </p>
                {myRank > 0 && (
                  <span className="text-[10px] font-black uppercase text-zinc-400">
                    You: #{myRank}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                <AnimatePresence>
                  {participantLeaderboard.map((participant, index) => {
                    const isMe = participant.token === playerToken;
                    return (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`flex items-center gap-2 p-2 border-2 ${isMe ? "border-yellow-400 bg-yellow-50" : "border-zinc-100 bg-zinc-50"}`}
                      >
                        <span className="text-[10px] font-black text-zinc-400 w-5">
                          #{index + 1}
                        </span>
                        <CharacterAvatar
                          svgType={participant.characterSvg}
                          color={participant.characterColor}
                          size={36}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-black uppercase truncate ${isMe ? "text-yellow-800" : "text-zinc-800"}`}
                          >
                            {participant.name} {isMe && "★"}
                          </p>
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${participant.connected ? "bg-green-400" : "bg-zinc-300"}`}
                            />
                            <p className="text-[10px] font-bold text-zinc-400 tabular-nums">
                              {participant.bananas} 🍌
                            </p>
                          </div>
                        </div>
                        {participant.activeMainBet && (
                          <span
                            className={`text-[10px] font-black uppercase px-1.5 py-0.5 border-2 border-black ${participant.activeMainBet.side === "red" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {participant.activeMainBet.side.toUpperCase()}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {participantLeaderboard.length === 0 && (
                  <p className="text-xs text-zinc-400 italic text-center py-4">
                    No players yet
                  </p>
                )}
              </div>
            </div>

            {state.roundWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border-4 border-black p-3 text-center font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-yellow-200"
              >
                <p className="text-xs text-zinc-500 mb-1">Round Winner</p>
                <p
                  className="text-xl"
                  style={{
                    color: state.roundWinner === "red" ? "#b91c1c" : "#1d4ed8",
                  }}
                >
                  {state.roundWinner.toUpperCase()}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <PrematchBetModal
        open={
          state.phase === "prematch" &&
          !prematchDecisionSubmitted &&
          !needsCharacterSelection
        }
        countdown={state.phaseCountdown}
        redHealth={state.redHealth}
        blueHealth={state.blueHealth}
        bananas={bananas}
        selected={mainBetSelection}
        minStake={Math.max(
          5,
          Math.floor((state.settings.startingBananas || 100) / 10),
        )}
        onSelectSide={(side: BallId) => {
          prematchTouchedRef.current = true;
          setMainBetSelection((prev) => ({ ...prev, side }));
        }}
        onSelectStake={(stake: number) => {
          prematchTouchedRef.current = true;
          setMainBetSelection((prev) => ({ ...prev, stake }));
        }}
        onConfirm={placeMainBet}
        onSkip={skipMainBet}
      />

      <CharacterSelectModal
        open={Boolean(needsCharacterSelection && !characterSelectionSubmitted)}
        playerName={playerName}
        onConfirm={({ svgType, color }) => submitCharacter(svgType, color)}
      />

      {state.phase === "prematch" && prematchDecisionSubmitted && (
        <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center p-4">
          <motion.div
            className="w-full max-w-md border-8 border-black p-6 bg-white text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Image
              src={
                prematchDecision === "skip"
                  ? "/monkey%20reactions/thinking_nobg/hm.png"
                  : "/monkey%20reactions/thinking_nobg/thumbs.png"
              }
              alt="Monkey reaction"
              width={96}
              height={96}
              className="w-20 h-20 mx-auto object-contain"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mt-3">
              Decision Locked
            </p>
            <h3 className="text-2xl font-black uppercase mt-1">
              {prematchDecision === "skip"
                ? "Sitting this one out"
                : `${(prematchDecision ?? "red").toUpperCase()} — ${mainBetSelection.stake} 🍌`}
            </h3>
            <p className="text-xs font-bold text-zinc-400 mt-2">
              Waiting for all players...
            </p>
          </motion.div>
        </div>
      )}

      <VoteEventModal
        open={state.phase === "vote"}
        countdown={state.phaseCountdown}
        redHealth={state.redHealth}
        blueHealth={state.blueHealth}
        bananas={bananas}
        voteWindow={state.voteWindow}
        selection={voteSelection}
        votePower={votePowerStake}
        onSelectOption={(value: 0 | 1 | 2) => {
          voteTouchedRef.current = true;
          setVoteSelection(value);
          setPickedVoteOptionIndex(value);
        }}
        onVotePowerChange={(value: number) => {
          voteTouchedRef.current = true;
          setVotePowerStake(value);
        }}
        onConfirm={castVote}
        isRemote
      />

      <VoteRevealModal
        open={state.phase === "reveal"}
        countdown={state.phaseCountdown}
        pickedOptionIndex={pickedVoteOptionIndex}
        revealedOption={
          revealedVoteOption
            ? {
                category: revealedVoteOption.category,
                label: revealedVoteOption.label,
              }
            : null
        }
      />

      <MicrobetSettlementModal
        open={showSettlement}
        settlements={settlementEntries}
        netChange={settlementNet}
        totalBananas={bananas}
        onContinue={() => {
          setShowSettlement(false);
          setSettlementEntries([]);
          setSettlementNet(0);
        }}
      />

      <MicrobetsModal
        open={state.phase === "microbet"}
        countdown={state.phaseCountdown}
        redHealth={state.redHealth}
        blueHealth={state.blueHealth}
        bananas={bananas}
        insights={state.microbetInsights}
        draft={microbetDraft}
        placedBets={queuedMicrobets}
        onDraftChange={(value: MicrobetDraft) => {
          microbetTouchedRef.current = true;
          setMicrobetDraft(value);
        }}
        onAddBet={addMicrobet}
        onAddQuickBet={(value: MicrobetDraft) => {
          microbetTouchedRef.current = true;
          addQuickMicrobet(value);
        }}
        onRemoveBet={removeMicrobet}
        onConfirm={confirmMicrobets}
        onSkip={skipMicrobets}
      />
    </div>
  );
}
