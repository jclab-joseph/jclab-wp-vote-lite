import {Entity, Column, ManyToOne, JoinColumn} from 'typeorm';
import {Candidate} from './candidate';
import {Voter} from './voter';
import { Vote } from './vote';

@Entity({name: 'ot_vote_msg'})
export class VoteMessage {
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

  @Column({name: 'message', type: 'text'})
  message: string;
}
