import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm';
import { Vote } from './vote';

@Entity({name: 'ot_elec'})
export class Election {
  @PrimaryColumn({name: 'elec_id', type: 'char', length: 36})
  elecId: string;

  @Column({name: 'org_id', type: 'char', length: 36})
  orgId: string;

  @Column({name: 'created_at', type: 'timestamp'})
  createdAt: Date = new Date();

  @Column({name: 'title', type: 'varchar', length: 256})
  title: string;

  @Column({name: 'voter_id_prefix', type: 'varchar', length: 16})
  voterIdPrefix: string;

  @OneToMany(() => Vote, v => v.election, {
    lazy: true,
    cascade: false
  })
  votes: Promise<Vote[]>;

  public get sortedVotes(): Promise<Vote[]> {
    return this.votes.then((list) => list.sort((x, y) => {
      const xt = x.createdAt.getTime();
      const yt = y.createdAt.getTime();
      if (xt < yt) return 1;
      else if (xt > yt) return -1;
      return 0;
    }));
  }
}
