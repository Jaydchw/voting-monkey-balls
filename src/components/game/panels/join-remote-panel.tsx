"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PartySocket from "partysocket";
import { motion } from "framer-motion";
import {
  Crown,
  Coins,
  TrendUp,
  Lightning,
  Wall,
  ArrowsLeftRight,
  Heart,
  CheckCircle,
  ClockCountdown,
} from "@phosphor-icons/react";
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

const MICROBET_KIND_ICON: Record<MicroBetKind, React.ReactNode> = {
  redDamageToBlue: (
    <Lightning size={10} weight="fill" className="text-red-500" />
  ),
  blueDamageToRed: (
    <Lightning size={10} weight="fill" className="text-blue-500" />
  ),
  redWallHits: <Wall size={10} weight="fill" className="text-red-400" />,
  blueWallHits: <Wall size={10} weight="fill" className="text-blue-400" />,
  ballCollisions: (
    <ArrowsLeftRight size={10} weight="fill" className="text-yellow-500" />
  ),
};

type JoinRemotePanelProps = {
  roomCode: string;
  playerName: string;
  playerToken: string;
  onExit: () => void;
};

const PHASE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  prematch: {
    label: "Place Bets",
    color: "text-yellow-900",
    bg: "bg-yellow-300",
  },
  running: { label: "In Progress", color: "text-black", bg: "bg-green-400" },
  vote: { label: "Voting", color: "text-white", bg: "bg-violet-500" },
  reveal: { label: "Vote Result", color: "text-black", bg: "bg-violet-300" },
  microbet: { label: "Microbets", color: "text-black", bg: "bg-orange-400" },
  lobby: { label: "Lobby", color: "text-zinc-700", bg: "bg-zinc-200" },
  finished: { label: "Finished", color: "text-white", bg: "bg-zinc-500" },
};

type CondensedMicrobet = {
  kind: MicroBetKind;
  outcome: boolean;
  totalStake: number;
  count: number;
};

function condenseMicrobets(bets: PendingPlayerMicrobet[]): CondensedMicrobet[] {
  const map = new Map<string, CondensedMicrobet>();
  for (const bet of bets) {
    const key = `${bet.kind}::${String(bet.outcome)}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalStake += bet.stake;
      existing.count += 1;
    } else {
      map.set(key, {
        kind: bet.kind,
        outcome: bet.outcome,
        totalStake: bet.stake,
        count: 1,
      });
    }
  }
  return Array.from(map.values());
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

  // Persists for the whole round so modals always have it even after phase changes
  const [roundBetSide, setRoundBetSide] = useState<"red" | "blue" | null>(null);

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
  const [microbetDecisionMade, setMicrobetDecisionMade] = useState(false);
  const [microbetDecisionWasSkip, setMicrobetDecisionWasSkip] = useState(false);

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
            setMicrobetDecisionMade(false);
            setMicrobetDecisionWasSkip(false);
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
            // roundBetSide intentionally NOT cleared here — persists for the round
          }
          if (incoming.phase === "prematch") {
            setPrematchDecisionSubmitted(false);
            setPrematchDecision(null);
            // Reset the round bet side at the start of a new prematch phase
            setRoundBetSide(null);
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
    setRoundBetSide(mainBetSelection.side);
    setPrematchDecisionSubmitted(true);
  };

  const skipMainBet = () => {
    if (prematchDecisionSubmitted) return;
    sendAction({ type: "player-action", action: { kind: "main-bet-skip" } });
    setPrematchDecision("skip");
    setRoundBetSide(null);
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
    setMicrobetDecisionMade(true);
    setMicrobetDecisionWasSkip(false);
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

  const skipMicrobets = () => {
    sendAction({ type: "player-action", action: { kind: "microbet-skip" } });
    setMicrobetDecisionMade(true);
    setMicrobetDecisionWasSkip(true);
  };

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
          setRoundBetSide(mainBetSelection.side);
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
          setRoundBetSide(randomSide);
          setPrematchDecisionSubmitted(true);
        }, 0);
      } else {
        window.setTimeout(() => {
          sendAction({
            type: "player-action",
            action: { kind: "main-bet-skip" },
          });
          setPrematchDecision("skip");
          setRoundBetSide(null);
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
          setMicrobetDecisionMade(true);
          setMicrobetDecisionWasSkip(false);
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
            setMicrobetDecisionMade(true);
            setMicrobetDecisionWasSkip(false);
          }, 0);
        } else {
          window.setTimeout(() => {
            sendAction({
              type: "player-action",
              action: { kind: "microbet-skip" },
            });
            setMicrobetDecisionMade(true);
            setMicrobetDecisionWasSkip(true);
          }, 0);
        }
      } else {
        window.setTimeout(() => {
          sendAction({
            type: "player-action",
            action: { kind: "microbet-skip" },
          });
          setMicrobetDecisionMade(true);
          setMicrobetDecisionWasSkip(true);
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

  const phaseCfg = PHASE_CONFIG[state.phase] ?? {
    label: state.phase,
    color: "text-black",
    bg: "bg-zinc-100",
  };
  const activeMicrobets = myParticipant?.activeMicrobets ?? [];
  const condensedActiveMicrobets = condenseMicrobets(
    activeMicrobets.map((b) => ({ ...b, id: "", odds: 2 })),
  );
  const mainBet = myParticipant?.activeMainBet;
  const bananaDiff = myParticipant?.roundPayout ?? 0;

  return (
    <div className="w-screen min-h-screen bg-white text-black">
      <div className="max-w-lg mx-auto p-4 md:p-6">
        <RoundHeader
          roundNumber={state.snapshot.roundNumber}
          roundsTotal={state.snapshot.roundsTotal}
          timeLeftSeconds={state.snapshot.timeLeftSeconds}
        />

        <div className="flex flex-col gap-3">
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
            <div className="flex items-center gap-3 p-3 border-b-4 border-black bg-zinc-50">
              {myParticipant?.characterSvg ? (
                <div className="border-4 border-black shrink-0">
                  <CharacterAvatar
                    svgType={myParticipant.characterSvg}
                    color={myParticipant.characterColor}
                    size={52}
                  />
                </div>
              ) : (
                <div className="w-13 h-13 border-4 border-black bg-zinc-200 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black uppercase leading-tight truncate">
                  {playerName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div
                    className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {socketConnected ? `Room ${roomCode}` : "Reconnecting..."}
                  </span>
                </div>
              </div>
              <motion.div
                key={state.phase}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`px-3 py-1.5 border-4 border-black text-[10px] font-black uppercase tracking-widest shrink-0 ${phaseCfg.bg} ${phaseCfg.color}`}
              >
                {phaseCfg.label}
              </motion.div>
            </div>

            <div className="grid grid-cols-3 divide-x-4 divide-black">
              <div className="p-3 bg-yellow-300">
                <p className="text-[9px] font-black uppercase tracking-widest text-yellow-900 mb-1 flex items-center gap-1">
                  <Coins size={10} weight="fill" /> Bank
                </p>
                <motion.p
                  key={bananas}
                  className="text-2xl font-black tabular-nums"
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {bananas}
                </motion.p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Image
                    src="/Banana.svg"
                    alt="Banana"
                    width={12}
                    height={12}
                  />
                  <span className="text-[9px] font-bold text-yellow-800 uppercase">
                    bananas
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-green-700 mb-1 flex items-center gap-1">
                  <TrendUp size={10} weight="fill" /> Round
                </p>
                <motion.p
                  key={bananaDiff}
                  className="text-2xl font-black tabular-nums text-green-700"
                  initial={{ scale: bananaDiff > 0 ? 1.2 : 1 }}
                  animate={{ scale: 1 }}
                >
                  +{bananaDiff}
                </motion.p>
                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">
                  payout
                </p>
              </div>
              <div className="p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-700 mb-1 flex items-center gap-1">
                  <Crown size={10} weight="fill" /> Total
                </p>
                <p className="text-2xl font-black tabular-nums text-blue-700">
                  +{myParticipant?.totalPayout ?? 0}
                </p>
                <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">
                  earned
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Heart size={10} weight="fill" className="text-red-500" />{" "}
                Health
              </p>
              <div className="flex flex-col gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-red-600">
                      Red
                    </span>
                    <span className="text-[10px] font-black tabular-nums">
                      {Math.round(state.redHealth)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-zinc-200 border-2 border-black overflow-hidden">
                    <motion.div
                      className="h-full bg-red-500"
                      animate={{
                        width: `${Math.max(0, Math.min(100, state.redHealth))}%`,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-blue-600">
                      Blue
                    </span>
                    <span className="text-[10px] font-black tabular-nums">
                      {Math.round(state.blueHealth)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-zinc-200 border-2 border-black overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      animate={{
                        width: `${Math.max(0, Math.min(100, state.blueHealth))}%`,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Crown size={10} weight="fill" className="text-yellow-500" />{" "}
                Main Bet
              </p>
              {mainBet ? (
                <div
                  className={`border-4 border-black p-2 ${mainBet.side === "red" ? "bg-red-100" : "bg-blue-100"}`}
                >
                  <p
                    className={`text-sm font-black uppercase ${mainBet.side === "red" ? "text-red-700" : "text-blue-700"}`}
                  >
                    {mainBet.side.toUpperCase()}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Image
                      src="/Banana.svg"
                      alt="Banana"
                      width={11}
                      height={11}
                    />
                    <span className="text-sm font-black">{mainBet.stake}</span>
                  </div>
                </div>
              ) : prematchDecision === "skip" ? (
                <p className="text-xs font-bold text-zinc-400 uppercase">
                  Sitting out
                </p>
              ) : (
                <p className="text-xs font-bold text-zinc-400 uppercase">
                  No bet yet
                </p>
              )}
            </div>
          </div>

          {condensedActiveMicrobets.length > 0 && (
            <div className="border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Lightning
                  size={10}
                  weight="fill"
                  className="text-orange-500"
                />
                Active Microbets ({activeMicrobets.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {condensedActiveMicrobets.map((bet, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1 px-2 py-1 border-2 border-black text-[9px] font-black uppercase ${bet.outcome ? "bg-green-100" : "bg-red-100"}`}
                  >
                    {MICROBET_KIND_ICON[bet.kind]}
                    <span>{MICROBET_KIND_LABEL[bet.kind]}</span>
                    <span className="text-zinc-500">·</span>
                    <span>{bet.outcome ? "YES" : "NO"}</span>
                    <span className="text-zinc-500">·</span>
                    <Image src="/Banana.svg" alt="" width={8} height={8} />
                    <span>{bet.totalStake}</span>
                    {bet.count > 1 && (
                      <span className="text-zinc-400">×{bet.count}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.roundWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`border-4 border-black p-3 text-center font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${state.roundWinner === "red" ? "bg-red-200" : "bg-blue-200"}`}
            >
              <p className="text-[10px] text-zinc-500 mb-1">Round Winner</p>
              <p
                className={`text-2xl ${state.roundWinner === "red" ? "text-red-700" : "text-blue-700"}`}
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
            <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center border-4 border-black bg-yellow-300">
              {prematchDecision === "skip" ? (
                <ClockCountdown size={32} weight="fill" />
              ) : (
                <CheckCircle
                  size={32}
                  weight="fill"
                  className={
                    prematchDecision === "red"
                      ? "text-red-600"
                      : "text-blue-600"
                  }
                />
              )}
            </div>
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
        playerBetSide={roundBetSide}
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
        playerBetSide={roundBetSide}
      />

      <MicrobetsModal
        open={state.phase === "microbet" && !microbetDecisionMade}
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
        playerBetSide={roundBetSide}
      />

      {state.phase === "microbet" && microbetDecisionMade && (
        <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center p-4">
          <motion.div
            className="w-full max-w-md border-8 border-black p-6 bg-white text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div
              className={`w-16 h-16 mx-auto mb-3 flex items-center justify-center border-4 border-black ${microbetDecisionWasSkip ? "bg-zinc-200" : "bg-orange-300"}`}
            >
              {microbetDecisionWasSkip ? (
                <ClockCountdown size={32} weight="fill" />
              ) : (
                <CheckCircle
                  size={32}
                  weight="fill"
                  className="text-orange-700"
                />
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
              Microbets Locked
            </p>
            <h3 className="text-2xl font-black uppercase mt-1">
              {microbetDecisionWasSkip
                ? "Skipped"
                : `${queuedMicrobets.length} Bet${queuedMicrobets.length !== 1 ? "s" : ""} Placed`}
            </h3>
            {!microbetDecisionWasSkip && queuedMicrobets.length > 0 && (
              <p className="text-sm font-black text-zinc-600 mt-1">
                {queuedMicrobets.reduce((s, b) => s + b.stake, 0)} 🍌 staked
              </p>
            )}
            <motion.p
              className="text-xs font-bold text-zinc-400 mt-3 uppercase tracking-widest"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              Waiting for all players...
            </motion.p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
