import { Vote } from './vote';

export interface ElectionBase {
  elecId: string;
  title: string;
  /**
   * seconds
   */
  createdAt: number;
}

export interface ElectionWithVotes<VoteType = Vote> extends ElectionBase {
  votes: VoteType[];
}

export interface NewElectionRequest {
  title: string;
  voterIdPrefix: string;
}

export interface NewVoteRequest {
  title: string;
  candidates: {
    name: string;
  }[];
}

export interface View {
  viewId: string;
  url: string;
  /**
   * seconds
   */
  createdAt: number;
}

export interface Voter {
  id: string;
  /**
   * seconds
   */
  createdAt: number;
}

export interface VoterList {
  list: Voter[];
}
