import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import {Candidate} from './candidate';
import {Voter} from './voter';
import {Vote} from './vote';

@Entity({name: 'ot_vote_rcpt'})
export class VoteReceipt {
  @PrimaryColumn({name: 'vote_id', type: 'char', length: 36})
  voteId: string;

  @JoinColumn({name: 'vote_id'})
  @ManyToOne(() => Vote, {
    primary: true,
    eager: true,
    nullable: false
  })
  vote: Vote;

  @JoinColumn({name: 'voter_id'})
  @ManyToOne(() => Voter, {
    primary: true,
    eager: true,
    nullable: false
  })
  voter: Voter;

  @JoinColumn({name: 'cadt_id'})
  @ManyToOne(() => Candidate, {
    eager: true,
    nullable: false
  })
  candidate: Candidate;

  @Column({name: 'created_at', type: 'timestamp'})
  createdAt: Date = new Date();
}
