import type { BallId, MicroBetInsight, MicroBetKind } from "@/bots/types";

export type MainBetSelection = {
  side: BallId;
  stake: number;
};

export type MicrobetDraft = {
  kind: MicroBetKind;
  outcome: boolean;
  stake: number;
};

export type PendingPlayerMicrobet = {
  id: string;
  kind: MicroBetKind;
  outcome: boolean;
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

export type VoteWindowOptionLike =
  | {
      category?: "weapon" | "modifier" | "arena";
      label: string;
      qualityScore?: number;
      redLabel?: string;
      blueLabel?: string;
      arenaLabel?: string;
      redDescription?: string;
      blueDescription?: string;
      arenaDescription?: string;
    }
  | {
      category?: "weapon" | "modifier" | "arena";
      label?: string;
      qualityScore?: number;
      option: {
        label: string;
        qualityScore?: number;
        red?: {
          label?: string;
          quality?: number;
          icon?: unknown;
          create?: () => { description?: string };
        };
        blue?: {
          label?: string;
          quality?: number;
          icon?: unknown;
          create?: () => { description?: string };
        };
        arena?: {
          label?: string;
          quality?: number;
          icon?: unknown;
          create?: () => { description?: string };
        };
      };
    };

export type VoteWindowLike = {
  optionA: VoteWindowOptionLike;
  optionB: VoteWindowOptionLike;
  optionC: VoteWindowOptionLike;
  voteSplit: {
    optionA: number;
    optionB: number;
    optionC: number;
  };
};

export type VoteEventModalProps = {
  open: boolean;
  countdown: number;
  redHealth: number;
  blueHealth: number;
  bananas: number;
  voteWindow: VoteWindowLike | null;
  selection: 0 | 1 | 2;
  votePower: number;
  onSelectOption: (option: 0 | 1 | 2) => void;
  onVotePowerChange: (amount: number) => void;
  onConfirm: () => void;
  confirmLabel?: string;
  isRemote?: boolean;
};

export type RevealedVoteOption = {
  category: "weapon" | "modifier" | "arena";
  label: string;
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
