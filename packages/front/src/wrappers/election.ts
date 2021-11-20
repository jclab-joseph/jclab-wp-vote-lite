import { ElectionBase, ElectionWithVotes, Vote, VoteForVoter, VoteResult, VoteState } from '@jclab-wp/vote-lite-common';

export class VoteItem implements Vote {
  candidates!: { number: number; cadtId: string; name: string }[];
  title!: string;
  voteId!: string;
  state!: VoteState;
  voterCount!: number;
  votedCount!: number;
  result!: VoteResult | null;
  createdAt!: number;

  constructor (data: Vote) {
    Object.assign(this, data);
  }

  public get voterTurnout (): number {
    return Math.round(this.votedCount / this.voterCount * 1000) / 10;
  }
}

export class VoteForVoterItem extends VoteItem {
  voted!: boolean;

  constructor (data: VoteForVoter) {
    super(data);
    this.voted = data.voted;
  }
}

export class ElectionItem implements ElectionBase {
  createdAt: number;
  elecId: string;
  title: string;
  votes: VoteItem[] | null = null;

  constructor (data: ElectionBase | ElectionWithVotes) {
    this.createdAt = data.createdAt;
    this.elecId = data.elecId;
    this.title = data.title;
    this.votes = ('votes' in data) ? data.votes.map(v => new VoteItem(v)) : [];
  }

  public get createdAtAsDate (): Date {
    return new Date(this.createdAt * 1000);
  }
}

export class ElectionForVoterItem implements ElectionBase {
  createdAt: number;
  elecId: string;
  title: string;
  votes: VoteForVoterItem[] | null = null;

  constructor (data: ElectionWithVotes<VoteForVoter>) {
    this.createdAt = data.createdAt;
    this.elecId = data.elecId;
    this.title = data.title;
    this.votes = ('votes' in data) ? data.votes.map(v => new VoteForVoterItem(v)) : [];
  }

  public get createdAtAsDate (): Date {
    return new Date(this.createdAt * 1000);
  }
}
