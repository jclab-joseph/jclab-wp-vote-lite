import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import * as dto from '@jclab-wp/vote-lite-common';
import { ElectionRepository } from '../repository/election';
import { ViewRepository } from '../repository/view';
import { View } from '../entity/view';
import ConfigManager from '../config';

const symNoDataError = Symbol('NoDataError');
class NoDataError extends Error {
  public [symNoDataError]: boolean = true;
}

@Injectable()
export class ViewService {
  public log: Logger;

  constructor (
    @InjectRepository(ElectionRepository) private readonly electionRepository: ElectionRepository,
    @InjectRepository(ViewRepository) private readonly viewRepository: ViewRepository
  ) {
    this.log = new Logger('ViewRepository');
  }

  public toUrl(viewId: string): string {
    return ConfigManager.BASE_URL + '/view/' + viewId;
  }

  public createView(elecId: string): Promise<dto.View> {
    return this.electionRepository.findOne({
      where: {
        elecId: elecId
      }
    })
      .then((election) => {
        if (!election) return Promise.reject(new BadRequestException('no election'));
        const view = new View();
        view.viewId = uuid.v4();
        view.election = election;
        return this.viewRepository.save(view);
      })
      .then((view) => {
        return {
          viewId: view.viewId,
          url: this.toUrl(view.viewId),
          createdAt: Math.floor(view.createdAt.getTime() / 1000)
        }
      });
  }

  public getViews(elecId: string): Promise<dto.View[]> {
    return this.viewRepository.find({
      where: {
        elecId: elecId
      }
    })
      .then((list) => {
        return list.map(view => ({
          viewId: view.viewId,
          url: this.toUrl(view.viewId),
          createdAt: Math.floor(view.createdAt.getTime() / 1000)
        }))
      });
  }

  public getElecId(viewId: string): Promise<string> {
    return this.viewRepository.findOne({
      viewId: viewId
    })
      .then((view) => view && view.elecId);
  }

  public deleteView(viewId: string): Promise<boolean> {
    return this.viewRepository.delete({
      viewId: viewId
    })
      .then((view) => {
        return view.affected > 0;
      });
  }
}
