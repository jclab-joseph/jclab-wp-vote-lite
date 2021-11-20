import {EntityRepository, Repository} from 'typeorm';
import { View } from '../entity/view';

@EntityRepository(View)
export class ViewRepository extends Repository<View> {

}
