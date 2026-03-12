"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BotsGameEngine } from "@/bots/engine";
import type { BallId, EngineSnapshot, StatTotals } from "@/bots/types";
import type { GameApi } from "@/components/game/game-board";
import type { ActiveModifier } from "./panels/battle-bar";
import { RoundHeader } from "./panels/round-header";
import { HealthBars } from "./panels/health-bars";
import { ArenaBoard } from "./panels/arena-board";
import { BotStandings } from "./panels/bot-standings";
import { ActivityFeed, type AppliedEffect } from "./panels/activity-feed";
import { BotBetsTable } from "./panels/bot-bets-table";
import { PlayerPanel } from "./panels/player-panel";

const STARTING_HEALTH = 100;
const STARTING_BANANAS = 100;
const BET_WINDOW_SECONDS = 15;
const MICROBET_WINDOW_SECONDS = 8;

type PlayerBet = { side: BallId; stake: number };
type BetResult = { won: boolean; pnl: number };

function createZeroTotals(): StatTotals {
  return {
    redDamageTaken: 0,
    blueDamageTaken: 0,
    wallHitsRed: 0,
    wallHitsBlue: 0,
    ballCollisions: 0,
  };
}

export default function SingleplayerPanel() {
  const [engine] = useState(() => new BotsGameEngine());
  const gameApiRef = useRef<GameApi | null>(null);

  // Engine / game state
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(engine.getSnapshot());
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

  // Health / stats refs
  const healthRef = useRef({ red: STARTING_HEALTH, blue: STARTING_HEALTH });
  const previousHealthRef = useRef({ red: STARTING_HEALTH, blue: STARTING_HEALTH });
  const statsTotalsRef = useRef<StatTotals>(createZeroTotals());
  const forcedWinnerRef = useRef<BallId | undefined>(undefined);
  const roundAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Player bananas
  const [playerBananas, setPlayerBananas] = useState(STARTING_BANANAS);
  const playerBananasRef = useRef(STARTING_BANANAS);

  // Main bet state
  const [mainBetOpen, setMainBetOpen] = useState(true);
  const [mainBetCountdown, setMainBetCountdown] = useState(BET_WINDOW_SECONDS);
  const [mainBetSelectedSide, setMainBetSelectedSide] = useState<BallId>("red");
  const [mainBetSelectedStake, setMainBetSelectedStake] = useState(5);
  const [currentBet, setCurrentBet] = useState<PlayerBet | null>(null);
  const [mainBetResult, setMainBetResult] = useState<BetResult | null>(null);

  // Main bet refs
  const mainBetOpenRef = useRef(true);
  const mainBetCountdownRef = useRef(BET_WINDOW_SECONDS);
  const currentBetRef = useRef<PlayerBet | null>(null);
  const roundBetSettledRef = useRef(false);

  // Microbet state
  const [microbetOpen, setMicrobetOpen] = useState(false);
  const [microbetCountdown, setMicrobetCountdown] = useState(0);
  const [microbetSelectedSide, setMicrobetSelectedSide] = useState<BallId>("red");
  const [microbetSelectedStake, setMicrobetSelectedStake] = useState(1);
  const [activeMicrobet, setActiveMicrobet] = useState<PlayerBet | null>(null);
  const [microbetResult, setMicrobetResult] = useState<BetResult | null>(null);

  // Microbet refs
  const microbetOpenRef = useRef(false);
  const microbetCountdownRef = useRef(0);
  const activeMicrobetRef = useRef<PlayerBet | null>(null);
  const lastVoteStatsRef = useRef<{ red: number; blue: number } | null>(null);

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
    mainBetOpenRef.current = true;
    mainBetCountdownRef.current = BET_WINDOW_SECONDS;
    currentBetRef.current = null;
    roundBetSettledRef.current = false;
    setMainBetOpen(true);
    setMainBetCountdown(BET_WINDOW_SECONDS);
    setCurrentBet(null);
    setMainBetResult(null);

    // Reset microbet
    microbetOpenRef.current = false;
    microbetCountdownRef.current = 0;
    activeMicrobetRef.current = null;
    lastVoteStatsRef.current = null;
    setMicrobetOpen(false);
    setMicrobetCountdown(0);
    setActiveMicrobet(null);
    setMicrobetResult(null);
  }, []);

  const handleGameReady = useCallback((api: GameApi) => {
    gameApiRef.current = api;
  }, []);

  const handleRedHealthChange = useCallback((value: number) => {
    const previous = previousHealthRef.current.red;
    if (value < previous) statsTotalsRef.current.redDamageTaken += previous - value;
    previousHealthRef.current.red = value;
    healthRef.current.red = value;
    setRedHealth(value);
  }, []);

  const handleBlueHealthChange = useCallback((value: number) => {
    const previous = previousHealthRef.current.blue;
    if (value < previous) statsTotalsRef.current.blueDamageTaken += previous - value;
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
    if (!mainBetOpenRef.current) return;
    if (playerBananasRef.current < mainBetSelectedStake) return;
    const bet: PlayerBet = { side: mainBetSelectedSide, stake: mainBetSelectedStake };
    currentBetRef.current = bet;
    mainBetOpenRef.current = false;
    mainBetCountdownRef.current = 0;
    setCurrentBet(bet);
    setMainBetOpen(false);
    setMainBetCountdown(0);
  }, [mainBetSelectedSide, mainBetSelectedStake]);

  const handleMainBetSkip = useCallback(() => {
    mainBetOpenRef.current = false;
    mainBetCountdownRef.current = 0;
    setMainBetOpen(false);
    setMainBetCountdown(0);
  }, []);

  const handleMicrobetPlace = useCallback(() => {
    if (!microbetOpenRef.current) return;
    if (playerBananasRef.current < microbetSelectedStake) return;
    const bet: PlayerBet = { side: microbetSelectedSide, stake: microbetSelectedStake };
    activeMicrobetRef.current = bet;
    microbetOpenRef.current = false;
    microbetCountdownRef.current = 0;
    setActiveMicrobet(bet);
    setMicrobetOpen(false);
    setMicrobetCountdown(0);
  }, [microbetSelectedSide, microbetSelectedStake]);

  const handleMicrobetSkip = useCallback(() => {
    microbetOpenRef.current = false;
    microbetCountdownRef.current = 0;
    setMicrobetOpen(false);
    setMicrobetCountdown(0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const stepResult = engine.step({
        redHealth: healthRef.current.red,
        blueHealth: healthRef.current.blue,
        statsTotals: statsTotalsRef.current,
        forcedWinner: forcedWinnerRef.current,
      });

      // Tick main bet countdown
      if (mainBetOpenRef.current) {
        mainBetCountdownRef.current = Math.max(0, mainBetCountdownRef.current - 1);
        setMainBetCountdown(mainBetCountdownRef.current);
        if (mainBetCountdownRef.current === 0) {
          mainBetOpenRef.current = false;
          setMainBetOpen(false);
        }
      }

      // Tick microbet countdown
      if (microbetOpenRef.current) {
        microbetCountdownRef.current = Math.max(0, microbetCountdownRef.current - 1);
        setMicrobetCountdown(microbetCountdownRef.current);
        if (microbetCountdownRef.current === 0) {
          microbetOpenRef.current = false;
          setMicrobetOpen(false);
        }
      }

      // Vote interval fired
      if (stepResult.applications.length > 0) {
        const cur = statsTotalsRef.current;

        // Settle outstanding microbet against this interval's stats
        const last = lastVoteStatsRef.current;
        if (activeMicrobetRef.current && last) {
          const deltaRedTaken = cur.redDamageTaken - last.red;
          const deltaBlueTaken = cur.blueDamageTaken - last.blue;
          const bet = activeMicrobetRef.current;
          // "red deals more damage" means blueDamageTaken increased more
          const redDealtMore = deltaBlueTaken > deltaRedTaken;
          const won =
            (bet.side === "red" && redDealtMore) ||
            (bet.side === "blue" && !redDealtMore);
          const pnl = won ? bet.stake : -bet.stake;
          playerBananasRef.current = Math.max(0, playerBananasRef.current + pnl);
          setPlayerBananas(playerBananasRef.current);
          setMicrobetResult({ won, pnl: Math.abs(pnl) });
          activeMicrobetRef.current = null;
          setActiveMicrobet(null);
        }

        // Snapshot stats for next microbet interval
        lastVoteStatsRef.current = { red: cur.redDamageTaken, blue: cur.blueDamageTaken };

        // Apply each effect to the game + track for UI
        for (const application of stepResult.applications) {
          if (!gameApiRef.current) break;

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
            [{ label: application.label, category: application.category }, ...prev].slice(0, 6),
          );
        }

        // Open new microbet window
        microbetOpenRef.current = true;
        microbetCountdownRef.current = MICROBET_WINDOW_SECONDS;
        setMicrobetOpen(true);
        setMicrobetCountdown(MICROBET_WINDOW_SECONDS);
        setMicrobetResult(null);
      }

      setSnapshot(stepResult.snapshot);

      // Settle main bet on round end
      if (stepResult.roundResult && !roundBetSettledRef.current) {
        roundBetSettledRef.current = true;
        setRoundWinner(stepResult.roundResult.winner);
        if (currentBetRef.current) {
          const bet = currentBetRef.current;
          const won = bet.side === stepResult.roundResult.winner;
          const pnl = won ? bet.stake : -bet.stake;
          playerBananasRef.current = Math.max(0, playerBananasRef.current + pnl);
          setPlayerBananas(playerBananasRef.current);
          setMainBetResult({ won, pnl: Math.abs(pnl) });
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
  }, [engine, resetBoardForNextRound]);

  return (
    <div className="w-screen min-h-screen bg-white text-black p-6 md:p-10">
      <div className="max-w-[1900px] mx-auto">
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

            {roundWinner && (
              <div className="mt-5 w-full border-4 border-black py-3 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <span
                  className="text-2xl font-black uppercase"
                  style={{ color: roundWinner === "red" ? "#b91c1c" : "#1d4ed8" }}
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

          <PlayerPanel
            bananas={playerBananas}
            mainBet={{
              open: mainBetOpen,
              countdown: mainBetCountdown,
              selectedSide: mainBetSelectedSide,
              selectedStake: mainBetSelectedStake,
              maxStake: playerBananas,
              currentBet,
              result: mainBetResult,
              onSelectSide: setMainBetSelectedSide,
              onSetStake: setMainBetSelectedStake,
              onPlace: handleMainBetPlace,
              onSkip: handleMainBetSkip,
            }}
            microbet={{
              open: microbetOpen,
              countdown: microbetCountdown,
              selectedSide: microbetSelectedSide,
              selectedStake: microbetSelectedStake,
              maxStake: playerBananas,
              active: activeMicrobet,
              result: microbetResult,
              onSelectSide: setMicrobetSelectedSide,
              onSetStake: setMicrobetSelectedStake,
              onPlace: handleMicrobetPlace,
              onSkip: handleMicrobetSkip,
            }}
          />
        </div>
      </div>
    </div>
  );
}
