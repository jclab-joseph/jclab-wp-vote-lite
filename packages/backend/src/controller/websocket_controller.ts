import * as util from 'util';
import cookie from 'cookie';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebsocketGateway } from './websocket_gateway';
import { RedisManager } from '../service/redis_manager';
import { AuthorizedAccessToken, AuthService } from '../service/auth.service';
import { VoteAuthService } from '../service/vote_auth.service';
import { VoteTokenJWTPayload } from '../model/voter';
import { ViewService } from '../service/view.service';
import { ElectionService } from '../service/election.service';
import * as redisKeys from '../service/redis_keys';
import { VoteService } from '../service/vote.service';
import { VoteStateUpdateItem } from '@jclab-wp/vote-lite-common';

const SESSION_TIMEOUT = 60;

interface SessionData {
  viewId: string | null;
  elecId: string | null;
  accessToken: AuthorizedAccessToken | null,
  voterToken: VoteTokenJWTPayload | null;
}

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
  ) {
    this.websocketGateway.controller = this;

    this.eventHandlers['ping'] = this.onPing.bind(this);
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
    return Promise.all([
      cookies['vote_view_id'],
      this.authService.decodeAccessToken(cookies[AuthService.ACCESS_TOKEN_COOKIE_NAME])
        .then((result) => result && this.authService.toAuthorizedAccessToken(result)),
      this.voterAuthService.decodeVoteToken(cookies[VoteAuthService.VOTE_TOKEN_COOKIE_NAME])
        .then((result) => result && this.voterAuthService.toVoterJWTPayload(result))
    ])
      .then(([voteViewId, accessToken, voterToken]) => {
        if (!voteViewId && !accessToken && !voterToken)
          return Promise.reject(new UnauthorizedException());
        return (voteViewId && this.viewService.getElecId(voteViewId) || Promise.resolve(voterToken && voterToken.elecId || null))
          .then((elecId) => {
            const sessionData = {
              elecId: elecId || null,
              viewId: voteViewId || null,
              accessToken: accessToken || null,
              voterToken: voterToken || null
            } as SessionData;
            this.redisManager.redis.set(redisKeys.wsSessionKey(connectionId), JSON.stringify(sessionData), 'EX', SESSION_TIMEOUT);
            if (voterToken) {
              this.redisManager.redis.set(redisKeys.wsElectionVoterConnection(elecId, voterToken.voterId, connectionId), '{}', 'EX', SESSION_TIMEOUT);
            }
            if (voteViewId) {
              this.redisManager.redis.set(redisKeys.wsElectionViewerConnection(elecId, connectionId), '{}', 'EX', SESSION_TIMEOUT);
            }
          });
      });
  }

  public onDisconnect(connectionId: string) {
    this.log.error(`onDisconnect: ${connectionId}`);
    return this.getSessionData(connectionId)
      .then((sessionData) => {
        this.redisManager.redis.del(redisKeys.wsSessionKey(connectionId));
        if (sessionData.voterToken) {
          this.redisManager.redis.del(redisKeys.wsElectionVoterConnection(sessionData.elecId, sessionData.voterToken.voterId, connectionId));
        }
        if (sessionData.viewId) {
          this.redisManager.redis.del(redisKeys.wsElectionViewerConnection(sessionData.elecId, connectionId));
        }
      });
  }

  public onPing(connectionId: string, session: SessionData, event: string, data: any) {
    this.redisManager.redis.expire(redisKeys.wsSessionKey(connectionId), SESSION_TIMEOUT);
    if (session.voterToken) {
      this.redisManager.redis.expire(redisKeys.wsElectionVoterConnection(session.elecId, session.voterToken.voterId, connectionId), SESSION_TIMEOUT);
    }
    if (session.viewId) {
      this.redisManager.redis.expire(redisKeys.wsElectionViewerConnection(session.elecId, connectionId), SESSION_TIMEOUT);
    }
  }

  public onRequestElectionUpdate(connectionId: string, session: SessionData, event: string, data: any) {
    if (session.elecId) {
      this.electionService.getElectionInfo(session.elecId)
        .then((election) => {
          this.websocketGateway.sendEvent(connectionId, 'election.update', election);
        });
    } else {
      this.log.warn('onRequestElectionUpdate: no session.elecId');
    }
  }

  public onRequestVotesUpdateCount(connectionId: string, session: SessionData, event: string, data: any) {
    const voteIds: string[] = data;
    if (!session.elecId) {
      return;
    }
    return Promise.all(voteIds.map((voteId) => this.voteService.getVoteState(voteId)))
      .then((results: VoteStateUpdateItem[]) => {
        this.websocketGateway.sendEvent(connectionId, 'votes.update.status', results);
      });
  }

  public onRequestElectionNowVoterCount(connectionId: string, session: SessionData, event: string, data: any) {
    const elecId: string = data.elecId;
    return this.electionService.getConnectedVoterCount(elecId)
      .then((count) => {
        this.websocketGateway.sendEvent(connectionId, 'election.now.voter.count', {count: count});
      });
  }

  public getSessionData(connectionId: string): Promise<SessionData> {
    return util.promisify(this.redisManager.redis.get).bind(this.redisManager.redis)(redisKeys.wsSessionKey(connectionId))
      .then((jsonSessionData) => {
        if (!jsonSessionData) {
          return Promise.reject(new Error('NO SESSION'));
        }
        return JSON.parse(jsonSessionData) as SessionData;
      });
  }

  // request.election.update

  public onRawMessage(connectionId: string, rawData: string) {
    return this.getSessionData(connectionId)
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
        this.websocketGateway.deleteConnection(connectionId);
      });
  }
}
