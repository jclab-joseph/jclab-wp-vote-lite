import {EntityRepository, Repository} from 'typeorm';
import { VoteReceipt } from '../entity/vote_receipt';

@EntityRepository(VoteReceipt)
export class VoteReceiptRepository extends Repository<VoteReceipt> {

}
