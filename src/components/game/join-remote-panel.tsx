"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PartySocket from "partysocket";
import { RoundHeader } from "@/components/game/panels/round-header";
import {
  CharacterSelectModal,
  MicrobetsModal,
  PrematchBetModal,
  VoteEventModal,
} from "@/components/game/panels";
import { CharacterAvatar } from "@/components/game/character-avatar";
import type { BallId, MicroBetKind } from "@/bots/types";
import type {
  MainBetSelection,
  MicrobetDraft,
  PendingPlayerMicrobet,
} from "@/components/game/panels/betting-types";
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const MAIN_BET_MIN_STAKE = 20;

const MICROBET_KIND_LABEL: Record<MicroBetKind, string> = {
  redDamageToBlue: "Red outdamages Blue",
  blueDamageToRed: "Blue outdamages Red",
  redWallHits: "Red gets more wall hits",
  blueWallHits: "Blue gets more wall hits",
  ballCollisions: "Collisions hit 10+",
};

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

type JoinRemotePanelProps = {
  roomCode: string;
  playerName: string;
  onExit: () => void;
};

export default function JoinRemotePanel({
  roomCode,
  playerName,
  onExit,
}: JoinRemotePanelProps) {
  const socketRef = useRef<PartySocket | null>(null);
  const phaseRef = useRef<HostBroadcastState["phase"] | null>(null);
  const playerToken = useId();

  const [socketConnected, setSocketConnected] = useState(false);
  const [state, setState] = useState<HostBroadcastState | null>(null);

  const [mainBetSelection, setMainBetSelection] = useState<MainBetSelection>({
    side: "blue",
    stake: MAIN_BET_MIN_STAKE,
  });
  const [prematchDecisionSubmitted, setPrematchDecisionSubmitted] =
    useState(false);
  const [prematchDecision, setPrematchDecision] = useState<
    "red" | "blue" | "skip" | null
  >(null);
  const [voteSelection, setVoteSelection] = useState<0 | 1 | 2>(0);
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
  const prematchTouchedRef = useRef(false);
  const voteTouchedRef = useRef(false);
  const microbetTouchedRef = useRef(false);
  const autoHandledPhaseRef = useRef<string | null>(null);

  const myParticipant = useMemo(() => {
    if (!state) {
      return null;
    }

    return (
      state.participants.find(
        (participant) => participant.token === playerToken,
      ) ?? null
    );
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
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      party: PARTYKIT_PARTY,
      room: roomCode,
      protocol: getSocketProtocol(),
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setSocketConnected(true);
      const hello: ClientEnvelope = {
        type: "hello",
        role: "joiner",
        playerName,
        playerToken,
      };
      socket.send(JSON.stringify(hello));
      socket.send(
        JSON.stringify({ type: "request-state" } satisfies ClientEnvelope),
      );
    });

    socket.addEventListener("close", () => {
      setSocketConnected(false);
    });

    socket.addEventListener("message", (event) => {
      let payload: ServerEnvelope;
      try {
        payload = JSON.parse(event.data as string) as ServerEnvelope;
      } catch {
        return;
      }

      if (payload.type === "room-state" && payload.state) {
        if (phaseRef.current !== payload.state.phase) {
          if (payload.state.phase !== "microbet") {
            setQueuedMicrobets([]);
            setMicrobetDraft({
              kind: "redDamageToBlue",
              outcome: true,
              stake: 5,
            });
          }

          if (payload.state.phase !== "vote") {
            setVotePowerStake(1);
            setVoteSelection(0);
          }

          if (payload.state.phase !== "prematch") {
            setMainBetSelection({ side: "blue", stake: MAIN_BET_MIN_STAKE });
            setPrematchDecisionSubmitted(false);
            setPrematchDecision(null);
          }

          if (payload.state.phase === "prematch") {
            setPrematchDecisionSubmitted(false);
            setPrematchDecision(null);
          }
        }

        phaseRef.current = payload.state.phase;
        setState(payload.state);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [playerName, playerToken, roomCode]);

  const sendAction = (action: ClientEnvelope) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(action));
  };

  const submitCharacter = (svgType: string, color: string) => {
    if (characterSelectionSubmitted || myParticipant?.characterSvg) {
      return;
    }

    sendAction({
      type: "player-action",
      action: {
        kind: "set-character",
        svgType,
        color,
      },
    });
    setCharacterSelectionSubmitted(true);
  };

  const placeMainBet = () => {
    if (prematchDecisionSubmitted) {
      return;
    }

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
    if (prematchDecisionSubmitted) {
      return;
    }

    sendAction({ type: "player-action", action: { kind: "main-bet-skip" } });
    setPrematchDecision("skip");
    setPrematchDecisionSubmitted(true);
  };

  const castVote = () => {
    sendAction({
      type: "player-action",
      action: {
        kind: "vote",
        selection: voteSelection,
        power: votePowerStake,
      },
    });
  };

  const addMicrobet = () => {
    const odds = calcBooleanOdds(microbetDraft.kind);
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, bananas - queuedTotal);
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
  };

  const addQuickMicrobet = (quickDraft: MicrobetDraft) => {
    const odds = calcBooleanOdds(quickDraft.kind);
    setQueuedMicrobets((prev) => {
      const queuedTotal = prev.reduce((sum, bet) => sum + bet.stake, 0);
      const remaining = Math.max(0, bananas - queuedTotal);
      const stake = Math.min(remaining, Math.max(1, quickDraft.stake));
      if (stake <= 0) {
        return prev;
      }

      const bet: PendingPlayerMicrobet = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        kind: quickDraft.kind,
        outcome: quickDraft.outcome,
        stake,
        odds,
      };

      return [...prev, bet];
    });
  };

  const removeMicrobet = (id: string) => {
    setQueuedMicrobets((prev) => prev.filter((bet) => bet.id !== id));
  };

  const confirmMicrobets = () => {
    const bets: PendingMicrobetWire[] = queuedMicrobets.map((bet) => ({
      kind: bet.kind,
      outcome: bet.outcome,
      stake: bet.stake,
    }));

    sendAction({
      type: "player-action",
      action: { kind: "microbet", bets },
    });
  };

  const skipMicrobets = () => {
    sendAction({ type: "player-action", action: { kind: "microbet-skip" } });
  };

  useEffect(() => {
    if (!state) {
      return;
    }

    if (needsCharacterSelection) {
      return;
    }

    const phaseToken = `${state.snapshot.roundNumber}-${state.phase}`;
    if (state.phaseCountdown > 0) {
      autoHandledPhaseRef.current = null;
      return;
    }

    if (autoHandledPhaseRef.current === phaseToken) {
      return;
    }

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
      const selection = voteTouchedRef.current
        ? voteSelection
        : (Math.floor(Math.random() * 3) as 0 | 1 | 2);
      const power = voteTouchedRef.current ? votePowerStake : 1;
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
        const odds = calcBooleanOdds(randomDraft.kind);
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
                odds,
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
    }
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

  if (!state) {
    return (
      <div className="w-screen min-h-screen flex items-center justify-center bg-white text-black p-6">
        <Card className="w-full max-w-lg border-8 border-black rounded-none p-8 shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-white">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
            Joining Room {roomCode}
          </p>
          <h1 className="text-4xl font-black uppercase mt-2">{playerName}</h1>
          <p className="mt-3 text-sm text-zinc-700">
            Waiting for host state...
          </p>
          <p className="mt-2 text-xs font-black uppercase text-zinc-500">
            Socket: {socketConnected ? "Connected" : "Connecting..."}
          </p>
          <Button
            variant="secondary"
            className="mt-6 border-4 border-black rounded-none font-black uppercase"
            onClick={onExit}
          >
            Leave Room
          </Button>
        </Card>
      </div>
    );
  }

  const activeLedger = [
    ...(myParticipant?.activeMainBet
      ? [
          {
            id: "main",
            label: `Main bet: ${myParticipant.activeMainBet.side.toUpperCase()} (${myParticipant.activeMainBet.stake})`,
          },
        ]
      : []),
    ...(myParticipant?.activeMicrobets ?? []).map((bet, index) => ({
      id: `active-${index}`,
      label: `${MICROBET_KIND_LABEL[bet.kind]} ${bet.outcome ? "YES" : "NO"} (${bet.stake} @ ${bet.odds.toFixed(2)}x)`,
    })),
    ...(myParticipant?.queuedMicrobets ?? []).map((bet, index) => ({
      id: `queued-${index}`,
      label: `Queued: ${MICROBET_KIND_LABEL[bet.kind]} ${bet.outcome ? "YES" : "NO"} (${bet.stake})`,
    })),
  ];

  return (
    <div className="w-screen min-h-screen bg-white text-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <RoundHeader
          roundNumber={state.snapshot.roundNumber}
          roundsTotal={state.snapshot.roundsTotal}
          timeLeftSeconds={state.snapshot.timeLeftSeconds}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4 md:gap-6">
          <div className="space-y-5">
            <Card className="border-4 border-black rounded-none p-4 md:p-5 bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                Live Table
              </p>
              <h2 className="text-3xl md:text-4xl font-black uppercase mt-2">
                {playerName}
              </h2>
              <p className="text-xs uppercase font-black text-zinc-500 mt-1">
                Room {roomCode} | Phase {state.phase}
              </p>

              <div className="grid grid-cols-1 gap-4 mt-5">
                <div>
                  <div className="flex items-center justify-between text-xs uppercase font-black mb-1">
                    <span className="text-red-700">Red</span>
                    <span>{state.redHealth} HP</span>
                  </div>
                  <Progress
                    value={state.redHealth}
                    className="h-8 border-2 border-black rounded-none bg-zinc-100 **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200"
                    indicatorStyle={{
                      background: "linear-gradient(to right, #7f1d1d, #ef4444)",
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs uppercase font-black mb-1">
                    <span className="text-blue-700">Blue</span>
                    <span>{state.blueHealth} HP</span>
                  </div>
                  <Progress
                    value={state.blueHealth}
                    className="h-8 border-2 border-black rounded-none bg-zinc-100 **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:bg-zinc-200"
                    indicatorStyle={{
                      background: "linear-gradient(to right, #1e3a8a, #3b82f6)",
                    }}
                  />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <Card className="border-4 border-black rounded-none p-4 bg-yellow-300 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase tracking-widest">
                  Bankroll
                </p>
                <p className="text-4xl font-black mt-1">{bananas}</p>
              </Card>

              <Card className="border-4 border-black rounded-none p-4 bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                  Round Payout
                </p>
                <p className="text-4xl font-black mt-1 text-green-700">
                  +{myParticipant?.roundPayout ?? 0}
                </p>
              </Card>

              <Card className="border-4 border-black rounded-none p-4 bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                  Total Payout
                </p>
                <p className="text-4xl font-black mt-1 text-blue-700">
                  +{myParticipant?.totalPayout ?? 0}
                </p>
              </Card>
            </div>
          </div>

          <div className="space-y-5">
            <Card className="border-4 border-black rounded-none p-4 bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">
                Player Leaderboard
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {participantLeaderboard.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="border-2 border-black p-3 bg-zinc-50"
                  >
                    <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600 text-center mb-1">
                      #{index + 1}
                    </p>
                    <p className="text-xs font-black uppercase tracking-wider text-center mb-2">
                      {participant.name}
                    </p>
                    <div className="flex justify-center">
                      <CharacterAvatar
                        svgType={participant.characterSvg}
                        color={participant.characterColor}
                        size={54}
                        className="border-2 border-black bg-white"
                      />
                    </div>
                    <p className="text-xs font-black uppercase text-center mt-2">
                      {participant.bananas} bananas
                    </p>
                  </div>
                ))}
                {participantLeaderboard.length === 0 && (
                  <p className="text-xs text-zinc-600">
                    No players in leaderboard.
                  </p>
                )}
              </div>
            </Card>

            <Card className="border-4 border-black rounded-none p-4 bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">
                Active Bets
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {activeLedger.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-black/20 p-2 bg-zinc-50"
                  >
                    <p className="text-xs font-bold text-zinc-900">
                      {entry.label}
                    </p>
                  </div>
                ))}
                {activeLedger.length === 0 && (
                  <p className="text-xs text-zinc-600">
                    No active or queued bets yet.
                  </p>
                )}
              </div>
            </Card>

            <Card className="border-4 border-black rounded-none p-4 bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600 mb-1">
                Market Feed
              </p>
              <p className="text-xs text-zinc-600 mb-3">
                Community pressure from bots and the table.
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {state.microbetInsights.map((insight) => (
                  <div
                    key={insight.kind}
                    className="border border-black/20 p-2 bg-zinc-50"
                  >
                    <p className="text-xs font-bold text-zinc-900">
                      {MICROBET_KIND_LABEL[insight.kind]}
                    </p>
                    <p className="text-xs text-zinc-700 mt-1">
                      {insight.count} bets | {insight.totalStake} stake | yes
                      picks {insight.averageTarget.toFixed(0)}%
                    </p>
                  </div>
                ))}
                {state.microbetInsights.length === 0 && (
                  <p className="text-xs text-zinc-600">
                    No open market insights yet.
                  </p>
                )}
              </div>
            </Card>

            <Button
              variant="secondary"
              className="w-fit border-4 border-black rounded-none font-black uppercase"
              onClick={onExit}
            >
              Leave Room
            </Button>
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
          open={Boolean(
            needsCharacterSelection && !characterSelectionSubmitted,
          )}
          playerName={playerName}
          onConfirm={({ svgType, color }) => submitCharacter(svgType, color)}
        />

        {state.phase === "prematch" && prematchDecisionSubmitted && (
          <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl border-8 border-black rounded-none p-6 bg-white text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              <Image
                src={
                  prematchDecision === "skip"
                    ? "/monkey%20reactions/thinking_nobg/hm.png"
                    : "/monkey%20reactions/thinking_nobg/thumbs.png"
                }
                alt="Monkey reaction"
                width={96}
                height={96}
                className="w-24 h-24 mx-auto object-contain"
              />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-600 mt-3">
                Decision locked
              </p>
              <h3 className="text-3xl font-black uppercase mt-1">
                {prematchDecision === "skip"
                  ? "Skipping This Round"
                  : `Bet Locked: ${(prematchDecision ?? "red").toUpperCase()}`}
              </h3>
              <p className="text-sm font-bold text-zinc-700 mt-3">
                Waiting for all players to finish pre-round picks...
              </p>
            </Card>
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
          }}
          onVotePowerChange={(value: number) => {
            voteTouchedRef.current = true;
            setVotePowerStake(value);
          }}
          onConfirm={castVote}
          isRemote
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
    </div>
  );
}
