import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ElectionService } from './election.service';
import { WebsocketGateway } from '../controller/websocket_gateway';
import { RedisManager } from './redis_manager';
import * as redisKeys from './redis_keys';

@Injectable()
export class WebsocketService {
  constructor (
    @Inject(RedisManager) public redisManager: RedisManager,
    @Inject(ElectionService) public electionService: ElectionService,
    @Inject(WebsocketGateway) public websocketGateway: WebsocketGateway,
  ) {

  }

  @OnEvent('vote.updated')
  public postVoteUpdate (voteId: string) {
    console.log('postVoteUpdate: ', voteId);
  }

  @OnEvent('election.update')
  public postElectionUpdate (elecId: string): Promise<void> {
    // TODO: voter token => vote_user_token
    return this.electionService.getElectionInfo(elecId)
      .then((info) => {
        return Promise.all([
          this.redisManager.keys(redisKeys.wsElectionVoterConnectionWildcard(elecId))
            .then((res) => res.map(v => v.split(':')[4])),
          this.redisManager.keys(redisKeys.wsElectionViewerConnection(elecId, '*'))
            .then((res) => res.map(v => v.split(':')[3]))
        ])
          .then(([voterList, viewerList]) => {
            const connectionIds = [...voterList, ...viewerList];
            connectionIds.forEach((connectionId) => {
              this.websocketGateway.sendMessage(connectionId, JSON.stringify({
                event: 'election.update',
                data: info
              }));
            });
          });
      });
  }
}
