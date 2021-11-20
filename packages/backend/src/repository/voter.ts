import {EntityRepository, Repository} from 'typeorm';
import {Voter} from '../entity/voter';

@EntityRepository(Voter)
export class VoterRepository extends Repository<Voter> {

}
