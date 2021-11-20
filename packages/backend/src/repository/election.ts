import {EntityRepository, Repository} from 'typeorm';
import {Election} from '../entity/election';

@EntityRepository(Election)
export class ElectionRepository extends Repository<Election> {

}
