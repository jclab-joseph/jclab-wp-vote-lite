import cookie from 'cookie';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebsocketGateway } from './websocket_gateway';
import { RedisManager } from '../service/redis_manager';
import { AuthService } from '../service/auth.service';
import { VoteAuthService } from '../service/vote_auth.service';
import { ViewService } from '../service/view.service';
import { ElectionService } from '../service/election.service';
import { VoteService } from '../service/vote.service';
import { VotesStateUpdateRequest, VoteStateUpdateItem, WsHandshakeRequest } from '@jclab-wp/vote-lite-common';
import { WebsocketService, SessionData } from '../service/websocket.service';

type WsEventHandler = (connectionId: string, session: SessionData, event: string, data: any) => Promise<void> | void;

@Injectable()
export class WebsocketController {
  private log = new Logger('WebsocketController');
  private eventHandlers: Record<string, WsEventHandler> = {};

  public constructor (
    @Inject(WebsocketGateway) public websocketGateway: WebsocketGateway,
    @Inject(RedisManager) public redisManager: RedisManager,
    @Inject(AuthService) public authService: AuthService,
    @Inject(VoteAuthService) public voterAuthService: VoteAuthService,
    @Inject(ViewService) public viewService: ViewService,
    @Inject(ElectionService) public electionService: ElectionService,
    @Inject(VoteService) public voteService: VoteService,
    @Inject(WebsocketService) public websocketService: WebsocketService
  ) {
    this.websocketGateway.controller = this;

    this.eventHandlers['ping'] = this.onPing.bind(this);
    this.eventHandlers['handshake.request'] = this.onHandshake.bind(this);
    this.eventHandlers['request.election.update'] = this.onRequestElectionUpdate.bind(this);
    this.eventHandlers['request.votes.update.status'] = this.onRequestVotesUpdateCount.bind(this);
    this.eventHandlers['request.election.now.voter.count'] = this.onRequestElectionNowVoterCount.bind(this);
  }

  //TODO(refactor): Websocket Session Service 으로 분리

  public onConnect(connectionId: string, headers: Record<string, string>): Promise<void> {
    const cookieHeader = headers[
      Object.keys(headers)
        .find(v => v.toLowerCase() === 'cookie') as string
      ];
    const cookies = cookieHeader && cookie.parse(cookieHeader);
    if (!cookies) {
      return Promise.reject(new UnauthorizedException());
    }
    return this.websocketService.createSession(connectionId, cookies)
      .then(() => {});
  }

  public onDisconnect(connectionId: string) {
    this.log.error(`onDisconnect: ${connectionId}`);
    return this.websocketService.deleteSession(connectionId);
  }

  public onPing(connectionId: string, session: SessionData, event: string, data: any): Promise<void> {
    return this.websocketService.keepSession(connectionId, session);
  }

  public onHandshake(connectionId: string, session: SessionData, event: string, data: WsHandshakeRequest): Promise<void> {
    return this.websocketService.handshake(connectionId, session, data);
  }

  public onRequestElectionUpdate(connectionId: string, session: SessionData, event: string, data: any): Promise<void> {
    if (session.elecId) {
      this.electionService.getElectionInfo(session.elecId)
        .then((election) => {
          return this.websocketGateway.sendEvent(connectionId, 'election.update', election);
        });
    } else {
      this.log.warn('onRequestElectionUpdate: no session.elecId');
    }
    return Promise.resolve();
  }

  public onRequestVotesUpdateCount(connectionId: string, session: SessionData, event: string, data: VotesStateUpdateRequest): Promise<void> {
    // if (!session.elecId) {
    //   return;
    // }
    return Promise.all(data.voteIds.map((voteId) => this.voteService.getVoteState(voteId)))
      .then((results: VoteStateUpdateItem[]) => {
        return this.websocketGateway.sendEvent(connectionId, 'votes.update.status', results);
      });
  }

  public onRequestElectionNowVoterCount(connectionId: string, session: SessionData, event: string, data: any): Promise<void> {
    const elecId: string = data.elecId;
    return this.electionService.getConnectedVoterCount(elecId)
      .then((count) => {
        return this.websocketGateway.sendEvent(connectionId, 'election.now.voter.count', {count: count});
      });
  }

  public onRawMessage(connectionId: string, rawData: string): Promise<void> {
    return this.websocketService.getSessionData(connectionId)
      .then((sessionData) => {
        const {event, data} = JSON.parse(rawData);
        const handler = this.eventHandlers[event];
        if (handler) {
          return handler(connectionId, sessionData, event, data);
        } else {
          this.log.error(`no handler for '${event}'`);
        }
      })
      .catch((err) => {
        console.error(err);
        return this.onDisconnect(connectionId);
      });
  }
}
