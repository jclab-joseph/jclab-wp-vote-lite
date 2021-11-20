import { Entity, Column, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { Election } from './election';
import { Candidate } from './candidate';
import { VoteState, VoteResult } from '@jclab-wp/vote-lite-common';

@Entity({name: 'ot_vote'})
export class Vote {
  @PrimaryColumn({name: 'vote_id', type: 'char', length: 36})
  voteId: string;

  @Column({name: 'org_id', type: 'char', length: 36})
  orgId: string;

  @JoinColumn({name: 'elec_id'})
  @ManyToOne(() => Election, {
    eager: true,
    nullable: false
  })
  election: Election;

  @Column({name: 'created_at', type: 'timestamp'})
  createdAt: Date = new Date();

  @Column({name: 'title', type: 'varchar', length: 256})
  title: string;

  @Column({name: 'state', type: 'integer'})
  state: VoteState;

  @Column({name: 'voter_count', type: 'integer'})
  voterCount: number;

  @OneToMany(() => Candidate, c => c.vote, {
    eager: true,
    cascade: ['insert']
  })
  candidates: Candidate[];

  /**
   * {@link VoteResult}
   */
  @Column({name: 'cached_result', type: 'mediumtext', nullable: true})
  cachedResult: string | null = null;

  public getCachedResult(): VoteResult | null {
    if (!this.cachedResult) return null;
    return Vote.parseJsonVoteResult(this.cachedResult);
  }

  public get sortedCandidates(): Candidate[] {
    return this.candidates.sort((x, y) => {
      const xt = x.number;
      const yt = y.number;
      if (xt < yt) return -1;
      else if (xt > yt) return 1;
      return 0;
    });
  }

  public static voteResultToString(data: VoteResult): string {
    return JSON.stringify(data);
  }

  public static parseJsonVoteResult(data: string): VoteResult {
    return JSON.parse(data) as VoteResult;
  }
}
