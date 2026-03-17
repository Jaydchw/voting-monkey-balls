"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BotsGameEngine } from "@/bots/engine";
import type { BallId, EngineSnapshot, StatTotals } from "@/bots/types";
import type { GameApi } from "@/components/game/arena/game-board";
import {
  BattleBar,
  type ActiveModifier,
} from "@/components/game/hud/battle-bar";
import { RoundHeader } from "@/components/game/hud/round-header";
import { ArenaBoard } from "@/components/game/arena/arena-board";
import { BotStandings } from "@/components/game/standings/bot-standings";
import {
  ActivityFeed,
  type AppliedEffect,
} from "@/components/game/standings/activity-feed";
import { BotBetsTable } from "@/components/game/standings/bot-bets-table";
import { GamePanelBase } from "@/components/game/panels/game-panel-base";
import type { GameAudioController } from "@/lib/game-audio";

const STARTING_HEALTH = 100;

function createZeroTotals(): StatTotals {
  return {
    redDamageTaken: 0,
    blueDamageTaken: 0,
    wallHitsRed: 0,
    wallHitsBlue: 0,
    ballCollisions: 0,
  };
}

export default function BotsGameBoardPanel() {
  return (
    <GamePanelBase>
      {(audioCtrlRef) => (
        <BotsGameBoardPanelInner audioCtrlRef={audioCtrlRef} />
      )}
    </GamePanelBase>
  );
}

function BotsGameBoardPanelInner({
  audioCtrlRef,
}: {
  audioCtrlRef: React.MutableRefObject<GameAudioController | null>;
}) {
  const [engine] = useState(() => new BotsGameEngine());
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

  const lastRoundLoaded = useRef(0);
  useEffect(() => {
    if (snapshot.roundNumber !== lastRoundLoaded.current) {
      lastRoundLoaded.current = snapshot.roundNumber;
      audioCtrlRef.current?.loadRound(snapshot.roundNumber).then(() => {
        audioCtrlRef.current?.setPaused(false);
        audioCtrlRef.current?.startTracks(3);
      });
    }
  }, [snapshot.roundNumber, audioCtrlRef]);

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
  }, []);

  const handleGameReady = useCallback((api: GameApi) => {
    gameApiRef.current = api;
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

  useEffect(() => {
    const interval = setInterval(() => {
      const stepResult = engine.step({
        redHealth: healthRef.current.red,
        blueHealth: healthRef.current.blue,
        statsTotals: statsTotalsRef.current,
        forcedWinner: forcedWinnerRef.current,
      });

      if (stepResult.applications.length > 0) {
        audioCtrlRef.current?.startTracks(3);
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
            [
              {
                label: application.label,
                category: application.category,
                icons: application.icons,
              },
              ...prev,
            ].slice(0, 6),
          );
        }
      }

      setSnapshot(stepResult.snapshot);
      if (stepResult.roundResult) setRoundWinner(stepResult.roundResult.winner);

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
    };
  }, [engine, resetBoardForNextRound, audioCtrlRef]);

  useEffect(() => {
    return () => {
      if (roundAdvanceTimeoutRef.current)
        clearTimeout(roundAdvanceTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-screen min-h-screen bg-white text-black p-6 md:p-10">
      <div className="max-w-400 mx-auto">
        <RoundHeader
          roundNumber={snapshot.roundNumber}
          roundsTotal={snapshot.roundsTotal}
          timeLeftSeconds={snapshot.timeLeftSeconds}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[320px_auto_360px] gap-6">
          <BotStandings
            leaderboard={snapshot.leaderboard}
            latestLog={snapshot.latestLog}
          />

          <div className="flex flex-col items-center">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-6 w-full mb-5">
              <BattleBar
                ballId="red"
                health={redHealth}
                modifiers={redModifiers}
                weapons={redWeapons}
              />
              <div className="flex items-center justify-center md:self-start md:pt-12">
                <span className="text-5xl font-black">VS</span>
              </div>
              <BattleBar
                ballId="blue"
                health={blueHealth}
                modifiers={blueModifiers}
                weapons={blueWeapons}
              />
            </div>

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
        </div>
      </div>
    </div>
  );
}
