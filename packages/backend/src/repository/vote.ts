import {EntityRepository, Repository} from 'typeorm';
import {Vote} from '../entity/vote';

@EntityRepository(Vote)
export class VoteRepository extends Repository<Vote> {

}
