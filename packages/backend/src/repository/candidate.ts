import {EntityRepository, Repository} from 'typeorm';
import { Candidate } from '../entity/candidate';

@EntityRepository(Candidate)
export class CandidateRepository extends Repository<Candidate> {

}
