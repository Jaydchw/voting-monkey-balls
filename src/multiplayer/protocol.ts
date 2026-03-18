import type {
  BallId,
  EngineSnapshot,
  MicroBetInsight,
  MicroBetKind,
} from "../bots/types";

export type MatchPhase =
  | "lobby"
  | "prematch"
  | "running"
  | "vote"
  | "reveal"
  | "microbet"
  | "finished";

export type SerializableVoteOption = {
  category: "weapon" | "modifier" | "arena";
  label: string;
  qualityScore?: number;
  redLabel?: string;
  blueLabel?: string;
  arenaLabel?: string;
  redDescription?: string;
  blueDescription?: string;
  arenaDescription?: string;
};

export type SerializableVoteWindow = {
  category: "mixed";
  optionA: SerializableVoteOption;
  optionB: SerializableVoteOption;
  optionC: SerializableVoteOption;
  voteSplit: {
    optionA: number;
    optionB: number;
    optionC: number;
  };
};

export type HostRoomSettings = {
  botCount: number;
  startingBananas: number;
  decisionTimerSeconds: number;
  waitForAllDecisions: boolean;
  roundTimerSeconds: number;
  roundsTotal: number;
};

export type ParticipantBetSummary = {
  side: BallId;
  stake: number;
};

export type ParticipantMicrobetSummary = {
  kind: MicroBetKind;
  outcome: boolean;
  stake: number;
  odds: number;
};

export type ParticipantPublicState = {
  id: string;
  name: string;
  token?: string;
  characterSvg?: string;
  characterColor?: string;
  bananas: number;
  totalPayout: number;
  roundPayout: number;
  activeMainBet: ParticipantBetSummary | null;
  queuedMicrobets: ParticipantMicrobetSummary[];
  activeMicrobets: ParticipantMicrobetSummary[];
  connected: boolean;
};

export type MicrobetSettlementResult = {
  kind: MicroBetKind;
  outcome: boolean;
  stake: number;
  payout: number;
  won: boolean;
};

export type HostBroadcastState = {
  roomCode: string;
  phase: MatchPhase;
  phaseCountdown: number;
  redHealth: number;
  blueHealth: number;
  snapshot: EngineSnapshot;
  voteWindow: SerializableVoteWindow | null;
  revealedVoteOption: SerializableVoteOption | null;
  microbetInsights: MicroBetInsight[];
  participants: ParticipantPublicState[];
  roundWinner: BallId | null;
  settings: HostRoomSettings;
  liveVoteTotals: {
    optionA: number;
    optionB: number;
    optionC: number;
  } | null;
  microbetSettlements: Record<string, MicrobetSettlementResult[]>;
  recentBets: Array<{
    playerName: string;
    description: string;
    timestamp: number;
  }>;
};

export type PendingMicrobetWire = {
  kind: MicroBetKind;
  outcome: boolean;
  stake: number;
};

export type PlayerAction =
  | {
      kind: "set-character";
      svgType: string;
      color: string;
    }
  | {
      kind: "main-bet";
      side: BallId;
      stake: number;
    }
  | {
      kind: "main-bet-skip";
    }
  | {
      kind: "vote";
      selection: 0 | 1 | 2;
      power: number;
    }
  | {
      kind: "microbet";
      bets: PendingMicrobetWire[];
    }
  | {
      kind: "microbet-skip";
    };

export type RoomPresence = {
  hostConnected: boolean;
  participants: Array<{
    id: string;
    name: string;
    token?: string;
    connected: boolean;
  }>;
};

export type ClientEnvelope =
  | {
      type: "hello";
      role: "host" | "joiner";
      playerName?: string;
      playerToken?: string;
    }
  | {
      type: "host-state";
      state: HostBroadcastState;
    }
  | {
      type: "player-action";
      action: PlayerAction;
    }
  | {
      type: "request-state";
    };

export type ServerEnvelope =
  | {
      type: "room-state";
      room: RoomPresence;
      state: HostBroadcastState | null;
    }
  | {
      type: "player-action";
      playerId: string;
      playerName?: string;
      action: PlayerAction;
    }
  | {
      type: "error";
      message: string;
    };
