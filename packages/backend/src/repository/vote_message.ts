import {EntityRepository, Repository} from 'typeorm';
import { VoteMessage } from '../entity/vote_message';

@EntityRepository(VoteMessage)
export class VoteMessageRepository extends Repository<VoteMessage> {

}
