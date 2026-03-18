"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PartySocket from "partysocket";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "@phosphor-icons/react";
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
  redDamageToBlue: "Red outdmg Blue",
  blueDamageToRed: "Blue outdmg Red",
  redWallHits: "Red wall hits",
  blueWallHits: "Blue wall hits",
  ballCollisions: "Collisions 10+",
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
  const lastSettlementKeyRef = useRef<string | null>(null);

  const myParticipant = useMemo(() => {
    if (!state) return null;
    return state.participants.find((p) => p.token === playerToken) ?? null;
  }, [playerToken, state]);

  const bananas = myParticipant?.bananas ?? 0;

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

          autoHandledPhaseRef.current = null;
        }

        const myPid = incoming.participants.find(
          (p) => p.token === playerToken,
        )?.id;
        if (
          myPid &&
          incoming.microbetSettlements &&
          incoming.microbetSettlements[myPid]
        ) {
          const results = incoming.microbetSettlements[myPid];
          const key = JSON.stringify(results);
          if (key !== lastSettlementKeyRef.current && results.length > 0) {
            lastSettlementKeyRef.current = key;
            const entries: SettlementEntry[] = results.map((r) => ({
              kind: r.kind,
              outcome: r.outcome,
              stake: r.stake,
              payout: r.payout,
              won: r.won,
            }));
            const net = entries.reduce(
              (s, e) => s + (e.won ? e.stake : -e.stake),
              0,
            );
            setSettlementEntries(entries);
            setSettlementNet(net);
            setShowSettlement(true);
          }
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

    if (state.settings.waitForAllDecisions || state.phaseCountdown > 0) return;

    if (autoHandledPhaseRef.current === phaseToken) return;

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
      if (queuedMicrobets.length > 0) {
        const bets: PendingMicrobetWire[] = queuedMicrobets.map((bet) => ({
          kind: bet.kind,
          outcome: bet.outcome,
          stake: bet.stake,
        }));
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
          window.setTimeout(() => {
            sendAction({
              type: "player-action",
              action: { kind: "microbet-skip" },
            });
          }, 0);
        }
      } else {
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
  const voteWindow = state?.voteWindow;
  const liveVoteTotals = state?.liveVoteTotals;

  const voteWindowWithLiveTotals = useMemo(() => {
    if (!voteWindow) return null;
    if (!liveVoteTotals) return voteWindow;
    return {
      ...voteWindow,
      voteSplit: {
        optionA: voteWindow.voteSplit.optionA + liveVoteTotals.optionA,
        optionB: voteWindow.voteSplit.optionB + liveVoteTotals.optionB,
        optionC: voteWindow.voteSplit.optionC + liveVoteTotals.optionC,
      },
    };
  }, [voteWindow, liveVoteTotals]);

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
            label: `${myParticipant.activeMainBet.side.toUpperCase()} — ${myParticipant.activeMainBet.stake} 🍌`,
            isMain: true,
            side: myParticipant.activeMainBet.side,
          },
        ]
      : []),
    ...(myParticipant?.activeMicrobets ?? []).map((bet, i) => ({
      id: `active-${i}`,
      label: `${MICROBET_KIND_LABEL[bet.kind]} ${bet.outcome ? "Y" : "N"} (${bet.stake}@2x)`,
      isMain: false,
      side: null as BallId | null,
    })),
  ];

  return (
    <div className="w-screen min-h-screen bg-white text-black">
      <div className="max-w-lg mx-auto p-4 md:p-6">
        <RoundHeader
          roundNumber={state.snapshot.roundNumber}
          roundsTotal={state.snapshot.roundsTotal}
          timeLeftSeconds={state.snapshot.timeLeftSeconds}
        />

        <div className="flex flex-col gap-4">
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                {myParticipant?.characterSvg && (
                  <CharacterAvatar
                    svgType={myParticipant.characterSvg}
                    color={myParticipant.characterColor}
                    size={44}
                    className="border-2 border-black"
                  />
                )}
                <div>
                  <h2 className="text-xl font-black uppercase leading-tight">
                    {playerName}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div
                      className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {socketConnected ? `Room ${roomCode}` : "Reconnecting..."}
                    </span>
                  </div>
                </div>
              </div>
              <PhaseIndicator phase={state.phase} />
            </div>

            <div className="flex gap-4 mb-3">
              <HealthMini label="Red" color="red" health={state.redHealth} />
              <div className="flex items-center text-lg font-black text-zinc-300 self-center">
                VS
              </div>
              <HealthMini label="Blue" color="blue" health={state.blueHealth} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="border-4 border-black bg-yellow-300 p-2 text-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-yellow-800">
                  Bank
                </p>
                <motion.p
                  key={bananas}
                  className="text-xl font-black tabular-nums"
                  initial={{ scale: 1.18 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {bananas} 🍌
                </motion.p>
              </div>

              <div className="border-4 border-black bg-green-50 p-2 text-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-green-700">
                  Round
                </p>
                <p className="text-xl font-black tabular-nums text-green-700">
                  +{myParticipant?.roundPayout ?? 0}
                </p>
              </div>

              <div className="border-4 border-black bg-blue-50 p-2 text-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-700">
                  Total
                </p>
                <p className="text-xl font-black tabular-nums text-blue-700">
                  +{myParticipant?.totalPayout ?? 0}
                </p>
              </div>
            </div>
          </div>

          {activeLedger.length > 0 && (
            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-3">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-zinc-600">
                Active Bets
              </p>
              <div className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {activeLedger.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className={`flex items-center gap-2 px-2 py-1.5 border-l-4 ${entry.isMain ? "border-yellow-400 bg-yellow-50" : "border-zinc-300 bg-zinc-50"}`}
                    >
                      {entry.isMain && entry.side && (
                        <Crown
                          size={14}
                          weight="fill"
                          className={
                            entry.side === "red"
                              ? "text-red-600"
                              : "text-blue-600"
                          }
                        />
                      )}
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
            </div>
          )}

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
            <h3 className="text-2xl font-black uppercase mt-1 flex items-center justify-center gap-2">
              {prematchDecision === "skip" ? (
                "Sitting this one out"
              ) : (
                <>
                  <Crown
                    size={20}
                    weight="fill"
                    className={
                      prematchDecision === "red"
                        ? "text-red-600"
                        : "text-blue-600"
                    }
                  />
                  {(prematchDecision ?? "red").toUpperCase()} —{" "}
                  {mainBetSelection.stake} 🍌
                </>
              )}
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
        voteWindow={voteWindowWithLiveTotals}
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
