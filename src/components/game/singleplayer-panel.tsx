"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BotsGameEngine } from "@/bots/engine";
import type {
  BallId,
  EngineSnapshot,
  StatTotals,
  VoteOption,
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
import { Button } from "@/components/ui/button";

const STARTING_HEALTH = 100;
const STARTING_BANANAS = 100;
const PREMATCH_WINDOW_SECONDS = 10;
const VOTE_WINDOW_SECONDS = 10;
const MICROBET_WINDOW_SECONDS = 10;
const MAIN_BET_MIN_STAKE = 20;

type PlayerBet = { side: BallId; stake: number };
type BetResult = { won: boolean; pnl: number };
type MatchPhase = "prematch" | "running" | "vote" | "microbet";

function createZeroTotals(): StatTotals {
  return {
    redDamageTaken: 0,
    blueDamageTaken: 0,
    wallHitsRed: 0,
    wallHitsBlue: 0,
    ballCollisions: 0,
  };
}

function getVoteOptionLabel(option: VoteOption): string {
  return option.option.label;
}

function getVoteOptionIcons(option: VoteOption) {
  if (option.category === "arena") {
    return [option.option.arena.icon];
  }
  return [option.option.blue.icon, option.option.red.icon];
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
  const [mainBetSelectedSide, setMainBetSelectedSide] = useState<BallId>("red");
  const [mainBetSelectedStake, setMainBetSelectedStake] =
    useState(MAIN_BET_MIN_STAKE);
  const [currentBet, setCurrentBet] = useState<PlayerBet | null>(null);
  const [mainBetResult, setMainBetResult] = useState<BetResult | null>(null);

  const currentBetRef = useRef<PlayerBet | null>(null);
  const roundBetSettledRef = useRef(false);

  // Vote popup state
  const [voteWindow, setVoteWindow] = useState<VoteWindow | null>(null);
  const [voteSelection, setVoteSelection] = useState<0 | 1>(0);
  const [votePowerStake, setVotePowerStake] = useState(0);

  // Vote refs
  const voteWindowRef = useRef<VoteWindow | null>(null);

  // Microbet state
  const [microbetSelectedSide, setMicrobetSelectedSide] =
    useState<BallId>("red");
  const [microbetSelectedStake, setMicrobetSelectedStake] = useState(1);
  const [activeMicrobet, setActiveMicrobet] = useState<PlayerBet | null>(null);
  const [microbetResult, setMicrobetResult] = useState<BetResult | null>(null);

  const activeMicrobetRef = useRef<PlayerBet | null>(null);
  const lastVoteStatsRef = useRef<{ red: number; blue: number } | null>(null);

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
    setMainBetSelectedStake(MAIN_BET_MIN_STAKE);
    setCurrentBet(null);
    setMainBetResult(null);

    // Reset vote popup
    voteWindowRef.current = null;
    setVoteWindow(null);
    setVoteSelection(0);
    setVotePowerStake(0);

    // Reset microbet
    activeMicrobetRef.current = null;
    lastVoteStatsRef.current = null;
    setActiveMicrobet(null);
    setMicrobetResult(null);

    transitionPhase("prematch", PREMATCH_WINDOW_SECONDS);
  }, []);

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
    if (mainBetSelectedStake < MAIN_BET_MIN_STAKE) return;
    if (playerBananasRef.current < mainBetSelectedStake) return;

    playerBananasRef.current -= mainBetSelectedStake;
    setPlayerBananas(playerBananasRef.current);

    const bet: PlayerBet = {
      side: mainBetSelectedSide,
      stake: mainBetSelectedStake,
    };
    currentBetRef.current = bet;
    setCurrentBet(bet);
    transitionPhase("running", 0);
  }, [mainBetSelectedSide, mainBetSelectedStake, transitionPhase]);

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

      voteWindowRef.current = null;
      setVoteWindow(null);
      setVotePowerStake(0);

      transitionPhase("microbet", MICROBET_WINDOW_SECONDS);
    },
    [applyVoteApplication, engine, transitionPhase, voteSelection],
  );

  const handleVoteCast = useCallback(() => {
    if (phaseRef.current !== "vote") return;
    resolveVoteAndOpenMicrobet(votePowerStake);
  }, [resolveVoteAndOpenMicrobet, votePowerStake]);

  const handleMicrobetPlace = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
    if (playerBananasRef.current < microbetSelectedStake) return;

    playerBananasRef.current -= microbetSelectedStake;
    setPlayerBananas(playerBananasRef.current);

    const bet: PlayerBet = {
      side: microbetSelectedSide,
      stake: microbetSelectedStake,
    };
    activeMicrobetRef.current = bet;
    setActiveMicrobet(bet);
    transitionPhase("running", 0);
  }, [microbetSelectedSide, microbetSelectedStake, transitionPhase]);

  const handleMicrobetSkip = useCallback(() => {
    if (phaseRef.current !== "microbet") return;
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

        const last = lastVoteStatsRef.current;
        if (activeMicrobetRef.current && last) {
          const deltaRedTaken = cur.redDamageTaken - last.red;
          const deltaBlueTaken = cur.blueDamageTaken - last.blue;
          const bet = activeMicrobetRef.current;
          const redDealtMore = deltaBlueTaken > deltaRedTaken;
          const won =
            (bet.side === "red" && redDealtMore) ||
            (bet.side === "blue" && !redDealtMore);
          const payout = won ? bet.stake * 2 : 0;
          const pnl = won ? bet.stake : bet.stake;
          playerBananasRef.current = Math.max(
            0,
            playerBananasRef.current + payout,
          );
          setPlayerBananas(playerBananasRef.current);
          setMicrobetResult({ won, pnl });
          activeMicrobetRef.current = null;
          setActiveMicrobet(null);
        }

        lastVoteStatsRef.current = {
          red: cur.redDamageTaken,
          blue: cur.blueDamageTaken,
        };

        voteWindowRef.current = stepResult.voteWindow;
        setVoteWindow(stepResult.voteWindow);
        setVoteSelection(0);
        setVotePowerStake(0);
        transitionPhase("vote", VOTE_WINDOW_SECONDS);
      }

      setSnapshot(stepResult.snapshot);

      // Settle main bet on round end
      if (stepResult.roundResult && !roundBetSettledRef.current) {
        roundBetSettledRef.current = true;
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
    transitionPhase,
  ]);

  const selectedVoteOption =
    voteSelection === 0 ? voteWindow?.optionA : voteWindow?.optionB;
  const selectedVoteLabel = selectedVoteOption
    ? getVoteOptionLabel(selectedVoteOption)
    : "No vote";

  return (
    <div className="w-screen min-h-screen bg-white text-black p-6 md:p-10">
      <div className="max-w-475 mx-auto">
        <RoundHeader
          roundNumber={snapshot.roundNumber}
          roundsTotal={snapshot.roundsTotal}
          timeLeftSeconds={snapshot.timeLeftSeconds}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[280px_auto_300px_260px] gap-6">
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

            <div className="relative">
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

              {phase === "prematch" && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center p-4">
                  <Card className="w-full max-w-130 border-4 border-black rounded-none p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                      Pre-match pick ({phaseCountdown}s)
                    </p>
                    <h3 className="text-xl font-black uppercase mt-1">
                      Choose Winner + Buy In
                    </h3>
                    <p className="text-sm mt-1">
                      Minimum stake is {MAIN_BET_MIN_STAKE} bananas.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant={
                          mainBetSelectedSide === "red" ? "default" : "outline"
                        }
                        className="border-4 border-black rounded-none font-black uppercase"
                        onClick={() => setMainBetSelectedSide("red")}
                      >
                        Red
                      </Button>
                      <Button
                        variant={
                          mainBetSelectedSide === "blue" ? "default" : "outline"
                        }
                        className="border-4 border-black rounded-none font-black uppercase"
                        onClick={() => setMainBetSelectedSide("blue")}
                      >
                        Blue
                      </Button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="border-4 border-black rounded-none"
                        onClick={() =>
                          setMainBetSelectedStake((s) =>
                            Math.max(MAIN_BET_MIN_STAKE, s - 5),
                          )
                        }
                      >
                        -5
                      </Button>
                      <div className="flex-1 border-4 border-black py-2 text-center font-black text-lg">
                        {mainBetSelectedStake} BANANAS
                      </div>
                      <Button
                        variant="outline"
                        className="border-4 border-black rounded-none"
                        onClick={() =>
                          setMainBetSelectedStake((s) =>
                            Math.min(playerBananasRef.current, s + 5),
                          )
                        }
                        disabled={
                          playerBananasRef.current <= mainBetSelectedStake
                        }
                      >
                        +5
                      </Button>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        className="flex-1 border-4 border-black rounded-none font-black uppercase"
                        onClick={handleMainBetPlace}
                        disabled={
                          playerBananas < mainBetSelectedStake ||
                          mainBetSelectedStake < MAIN_BET_MIN_STAKE
                        }
                      >
                        Lock Pick
                      </Button>
                      <Button
                        variant="secondary"
                        className="border-4 border-black rounded-none font-black uppercase"
                        onClick={handleMainBetSkip}
                      >
                        Skip
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {phase === "vote" && voteWindow && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center p-4">
                  <Card className="w-full max-w-170 border-4 border-black rounded-none p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                      Event vote ({phaseCountdown}s)
                    </p>
                    <h3 className="text-xl font-black uppercase mt-1">
                      Choose One Outcome
                    </h3>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[voteWindow.optionA, voteWindow.optionB].map(
                        (option, index) => {
                          const icons = getVoteOptionIcons(option);
                          const selected = voteSelection === index;
                          return (
                            <button
                              key={`${getVoteOptionLabel(option)}-${index}`}
                              className={`text-left border-4 p-3 ${
                                selected
                                  ? "border-black bg-yellow-100"
                                  : "border-zinc-500 bg-white"
                              }`}
                              onClick={() => setVoteSelection(index as 0 | 1)}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {icons.map((IconComp, iconIndex) => (
                                  <IconComp
                                    key={`${index}-${iconIndex}`}
                                    size={16}
                                    weight="bold"
                                  />
                                ))}
                              </div>
                              <p className="text-sm font-bold">
                                {getVoteOptionLabel(option)}
                              </p>
                            </button>
                          );
                        },
                      )}
                    </div>

                    <div className="mt-4 border-2 border-black p-3">
                      <p className="text-xs font-black uppercase tracking-widest">
                        Vote Power Spend
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        Add bananas to increase the chance of your selected
                        option.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="border-2 border-black rounded-none"
                          onClick={() =>
                            setVotePowerStake((s) => Math.max(0, s - 5))
                          }
                        >
                          -5
                        </Button>
                        <div className="flex-1 border-2 border-black py-1 text-center font-black">
                          {votePowerStake} BANANAS
                        </div>
                        <Button
                          variant="outline"
                          className="border-2 border-black rounded-none"
                          onClick={() =>
                            setVotePowerStake((s) =>
                              Math.min(playerBananasRef.current, s + 5),
                            )
                          }
                        >
                          +5
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-zinc-600">
                        Selected: {selectedVoteLabel}
                      </p>
                      <Button
                        className="border-4 border-black rounded-none font-black uppercase"
                        onClick={handleVoteCast}
                        disabled={votePowerStake > playerBananas}
                      >
                        Cast Vote
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {phase === "microbet" && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center p-4">
                  <Card className="w-full max-w-140 border-4 border-black rounded-none p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-600">
                      Microbet window ({phaseCountdown}s)
                    </p>
                    <h3 className="text-xl font-black uppercase mt-1">
                      Quick Microbet
                    </h3>
                    <p className="text-sm mt-1">
                      Pick which side deals more damage before the next event.
                      Payout is 2x.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant={
                          microbetSelectedSide === "red" ? "default" : "outline"
                        }
                        className="border-4 border-black rounded-none font-black uppercase"
                        onClick={() => setMicrobetSelectedSide("red")}
                      >
                        Red Deals More
                      </Button>
                      <Button
                        variant={
                          microbetSelectedSide === "blue"
                            ? "default"
                            : "outline"
                        }
                        className="border-4 border-black rounded-none font-black uppercase"
                        onClick={() => setMicrobetSelectedSide("blue")}
                      >
                        Blue Deals More
                      </Button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="border-2 border-black rounded-none"
                        onClick={() =>
                          setMicrobetSelectedStake((s) => Math.max(1, s - 1))
                        }
                      >
                        -1
                      </Button>
                      <div className="flex-1 border-2 border-black py-1 text-center font-black">
                        {microbetSelectedStake} BANANAS
                      </div>
                      <Button
                        variant="outline"
                        className="border-2 border-black rounded-none"
                        onClick={() =>
                          setMicrobetSelectedStake((s) =>
                            Math.min(playerBananasRef.current, s + 1),
                          )
                        }
                      >
                        +1
                      </Button>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        className="flex-1 border-4 border-black rounded-none font-black uppercase"
                        onClick={handleMicrobetPlace}
                        disabled={microbetSelectedStake > playerBananas}
                      >
                        Place Microbet
                      </Button>
                      <Button
                        variant="secondary"
                        className="border-4 border-black rounded-none font-black uppercase"
                        onClick={handleMicrobetSkip}
                      >
                        Skip
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
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

          <div className="flex flex-col gap-6">
            <Card className="border-4 border-black rounded-none p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] bg-yellow-300">
              <p className="text-xs font-black uppercase tracking-widest mb-1">
                Your Bananas
              </p>
              <p className="text-4xl font-black tabular-nums">
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
                <p className="text-sm text-zinc-600">No main bet this round.</p>
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
                Microbet
              </p>
              {activeMicrobet ? (
                <p className="text-sm font-black uppercase">
                  {activeMicrobet.side} - {activeMicrobet.stake} bananas
                </p>
              ) : (
                <p className="text-sm text-zinc-600">No active microbet.</p>
              )}
              {microbetResult && (
                <p className="mt-2 text-sm font-black uppercase">
                  {microbetResult.won
                    ? `Win +${microbetResult.pnl}`
                    : `Loss -${microbetResult.pnl}`}
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
