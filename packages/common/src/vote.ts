export enum VoteState {
  ready = 0,
  voting = 1,
  finished = 2,
  counting = 3,
  completed = 4
}

export interface VoteCadtBase {
  cadtId: string;
  number: number;
  name: string;
}

export interface VoteCadtResult extends VoteCadtBase {
  cadtId: string;
  number: number;
  name: string;
  count: number;
}

export interface VoteResult {
  voterCount: number;
  votedCount: number;
  candidates: VoteCadtResult[];
}

export interface Vote {
  voteId: string;
  title: string;
  state: VoteState;
  /**
   * seconds
   */
  createdAt: number,
  candidates: VoteCadtBase[];
  voterCount: number;
  votedCount: number;
  result: VoteResult | null;
}

export interface VoteForVoter extends Vote {
  voted: boolean;
}

export interface VoteRequest {
  voteId: string;
  cadtId: string;
  message: string;
}

export interface VoteStateUpdateItem {
  voteId: string;
  state: VoteState;
  voterCount: number;
  votedCount: number;
  result: VoteResult | null;
}
