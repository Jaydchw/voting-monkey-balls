import type {
  BallId,
  MicroBetInsight,
  MicroBetKind,
  VoteWindow,
} from "@/bots/types";

export type MainBetSelection = {
  side: BallId;
  stake: number;
};

export type MicrobetDraft = {
  kind: MicroBetKind;
  min: number;
  max: number;
  stake: number;
};

export type PendingPlayerMicrobet = {
  id: string;
  kind: MicroBetKind;
  min: number;
  max: number;
  stake: number;
  odds: number;
};

export type PreMatchModalProps = {
  open: boolean;
  countdown: number;
  redHealth: number;
  blueHealth: number;
  bananas: number;
  selected: MainBetSelection;
  minStake: number;
  onSelectSide: (side: BallId) => void;
  onSelectStake: (stake: number) => void;
  onConfirm: () => void;
  onSkip: () => void;
};

export type VoteEventModalProps = {
  open: boolean;
  countdown: number;
  redHealth: number;
  blueHealth: number;
  bananas: number;
  voteWindow: VoteWindow | null;
  selection: 0 | 1;
  votePower: number;
  onSelectOption: (option: 0 | 1) => void;
  onVotePowerChange: (amount: number) => void;
  onConfirm: () => void;
};

export type MicrobetsModalProps = {
  open: boolean;
  countdown: number;
  redHealth: number;
  blueHealth: number;
  bananas: number;
  insights: MicroBetInsight[];
  draft: MicrobetDraft;
  placedBets: PendingPlayerMicrobet[];
  onDraftChange: (draft: MicrobetDraft) => void;
  onAddBet: () => void;
  onAddQuickBet: (draft: MicrobetDraft) => void;
  onRemoveBet: (id: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
};
