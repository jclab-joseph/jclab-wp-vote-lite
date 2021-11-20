import { Entity, Column, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { Election } from './election';

@Entity({name: 'ot_view'})
export class View {
  @PrimaryColumn({name: 'view_id', type: 'char', length: 36})
  viewId: string;

  @Column({name: 'elec_id', type: 'char', length: 36})
  elecId: string;

  @JoinColumn({name: 'elec_id'})
  @ManyToOne(() => Election, {
    eager: true,
    nullable: false
  })
  election: Election;

  @Column({name: 'created_at', type: 'timestamp'})
  createdAt: Date = new Date();
}
