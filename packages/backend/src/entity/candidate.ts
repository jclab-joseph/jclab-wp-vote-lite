import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Vote } from './vote';

@Entity({name: 'ot_cadt'})
export class Candidate {
  @Column({name: 'org_id', type: 'char', length: 36, nullable: false})
  orgId: string;

  @JoinColumn({name: 'vote_id'})
  @ManyToOne(() => Vote, {
    lazy: true,
    nullable: false
  })
  vote: Promise<Vote>;

  @Column({name: 'vote_id', type: 'char', length: 36})
  voteId: string;

  @PrimaryColumn({name: 'cadt_id', type: 'char', length: 36})
  cadtId: string;

  @Column({name: 'created_at', type: 'timestamp'})
  createdAt: Date = new Date();

  @Column({name: 'name', type: 'varchar', length: 128})
  name: string;

  @Column({name: 'number', type: 'integer'})
  number: number;
}
