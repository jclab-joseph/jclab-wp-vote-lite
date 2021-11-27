import * as util from 'util';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsHandshakeRequest, WsHandshakeResponse } from '@jclab-wp/vote-lite-common';
import { ElectionService } from './election.service';
import { WebsocketGateway } from '../controller/websocket_gateway';
import { RedisManager } from './redis_manager';
import * as redisKeys from './redis_keys';
import { AuthorizedAccessToken, AuthService } from './auth.service';
import { VoteTokenJWTPayload } from '../model/voter';
import { VoteAuthService } from './vote_auth.service';
import { ViewService } from './view.service';
import { VoteService } from './vote.service';

const SESSION_TIMEOUT = 60;

export enum HandshakeStatus {
  IDLE = 0,
  SUCCESS = 1,
  FAILED = 2
}

export interface SessionData {
  cookies: Record<string, string>;
  handshakeStatus: HandshakeStatus;
  viewId: string | null;
  elecId: string | null;
  accessToken: AuthorizedAccessToken | null,
  voterToken: VoteTokenJWTPayload | null;
}

@Injectable()
export class WebsocketService {
  public log: Logger = new Logger('WebsocketService');

  constructor (
    @Inject(RedisManager) public redisManager: RedisManager,
    @Inject(WebsocketGateway) public websocketGateway: WebsocketGateway,
    @Inject(AuthService) public authService: AuthService,
    @Inject(VoteAuthService) public voterAuthService: VoteAuthService,
    @Inject(ViewService) public viewService: ViewService,
    @Inject(ElectionService) public electionService: ElectionService,
    @Inject(VoteService) public voteService: VoteService
  ) {

  }

  public createSession(
    connectionId: string,
    cookies: Record<string, string>
  ): Promise<SessionData> {
    const sessionData: SessionData = {
      cookies: cookies,
      handshakeStatus: HandshakeStatus.IDLE,
      viewId: null,
      elecId: null,
      accessToken: null,
      voterToken: null
    };
    return util.promisify(this.redisManager.redis.set.bind(this.redisManager.redis))(
      redisKeys.wsSessionKey(connectionId), JSON.stringify(sessionData), 'EX', SESSION_TIMEOUT
    )
      .then(() => sessionData);
  }

  public deleteSession(connectionId: string): Promise<void> {
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

  public getSessionData(connectionId: string): Promise<SessionData> {
    return util.promisify(this.redisManager.redis.get).bind(this.redisManager.redis)(redisKeys.wsSessionKey(connectionId))
      .then((jsonSessionData) => {
        if (!jsonSessionData) {
          return Promise.reject(new Error('NO SESSION'));
        }
        return JSON.parse(jsonSessionData) as SessionData;
      });
  }

  public keepSession(connectionId: string, session: SessionData): Promise<void> {
    this.redisManager.redis.expire(redisKeys.wsSessionKey(connectionId), SESSION_TIMEOUT);
    if (session.voterToken) {
      this.redisManager.redis.expire(redisKeys.wsElectionVoterConnection(session.elecId, session.voterToken.voterId, connectionId), SESSION_TIMEOUT);
    }
    if (session.viewId) {
      this.redisManager.redis.expire(redisKeys.wsElectionViewerConnection(session.elecId, connectionId), SESSION_TIMEOUT);
    }
    return Promise.resolve();
  }

  public handshake(connectionId: string, session: SessionData, requestPayload: WsHandshakeRequest): Promise<void> {
    return Promise.resolve()
      .then(() => {
        switch(requestPayload.mode) {
          case 'manager':
            return this.handshakeAsManager(connectionId, session);
          case 'voter':
            return this.handshakeAsVoter(connectionId, session);
          case 'viewer':
            return this.handshakeAsViewer(connectionId, session, requestPayload.viewId);
          default:
            return Promise.reject(new Error('Unknown mode: ' + (requestPayload as any).mode));
        }
      })
      .then(() => {
        this.log.log(`client[${connectionId}] handshake success`);
        return this.websocketGateway.sendEvent(connectionId, 'handshake.response', {
          result: true,
          message: 'OK'
        } as WsHandshakeResponse);
      })
      .catch((err) => {
        this.log.warn(`client[${connectionId}] handshake failed`, err);
        return this.websocketGateway.sendEvent(connectionId, 'handshake.response', {
          result: false,
          message: err.message
        } as WsHandshakeResponse);
      });
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

  private handshakeAsManager(connectionId: string, session: SessionData): Promise<void> {
    return this.authService.decodeAccessToken(session.cookies[AuthService.ACCESS_TOKEN_COOKIE_NAME])
      .then((result) => {
        if (!result) {
          return Promise.reject(new UnauthorizedException('NO TOKEN'));
        }
        return this.authService.toAuthorizedAccessToken(result);
      })
      .then((accessToken) => {
        const newSessionData: SessionData = {
          ...session,
          accessToken: accessToken
        };
        return Promise.all([
          util.promisify(this.redisManager.redis.set.bind(this.redisManager.redis))(
            redisKeys.wsSessionKey(connectionId), JSON.stringify(newSessionData), 'EX', SESSION_TIMEOUT
          )
        ])
          .then(() => {});
      });
  }

  private handshakeAsVoter(connectionId: string, session: SessionData): Promise<void> {
    return this.voterAuthService.decodeVoteToken(session.cookies[VoteAuthService.VOTE_TOKEN_COOKIE_NAME])
      .then((result) => {
        if (!result) {
          return Promise.reject(new UnauthorizedException('NO TOKEN'));
        }
        return this.voterAuthService.toVoterJWTPayload(result);
      })
      .then((voterToken) => {
        const newSessionData: SessionData = {
          ...session,
          elecId: voterToken.elecId,
          voterToken: voterToken
        };
        return Promise.all([
          util.promisify(this.redisManager.redis.set.bind(this.redisManager.redis))(
            redisKeys.wsSessionKey(connectionId), JSON.stringify(newSessionData), 'EX', SESSION_TIMEOUT
          ),
          util.promisify(this.redisManager.redis.set.bind(this.redisManager.redis))(
            redisKeys.wsElectionVoterConnection(newSessionData.elecId, voterToken.voterId, connectionId), '{}', 'EX', SESSION_TIMEOUT
          )
        ])
          .then(() => {});
      });
  }

  private handshakeAsViewer(connectionId: string, session: SessionData, viewId: string): Promise<void> {
    return this.viewService.getElecId(viewId)
      .then((elecId) => {
        const newSessionData: SessionData = {
          ...session,
          viewId: viewId,
          elecId: elecId
        };
        return Promise.all([
          util.promisify(this.redisManager.redis.set.bind(this.redisManager.redis))(
            redisKeys.wsSessionKey(connectionId), JSON.stringify(newSessionData), 'EX', SESSION_TIMEOUT
          ),
          util.promisify(this.redisManager.redis.set.bind(this.redisManager.redis))(
            redisKeys.wsElectionViewerConnection(elecId, connectionId), '{}', 'EX', SESSION_TIMEOUT
          )
        ])
          .then(() => {});
      });
  }
}
