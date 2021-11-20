import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import {Election} from './election';
import { VoteReceipt } from './vote_receipt';

@Entity({name: 'ot_vter'})
export class Voter {
  @Column({name: 'org_id', type: 'char', length: 36})
  orgId: string;

  @JoinColumn({name: 'elec_id'})
  @ManyToOne(() => Election, {
    eager: true
  })
  election: Election;

  @Column({name: 'voter_id', primary: true, type: 'varchar', length: 32})
  voterId: string;

  @Column({name: 'created_at', type: 'timestamp'})
  createdAt: Date = new Date();

  @Column({name: 'passphrase', type: 'varchar', length: 256})
  passphrase: string;

  @OneToMany(() => VoteReceipt, r => r.voter, {
    lazy: true
  })
  receipts: Promise<VoteReceipt[]>;
}
