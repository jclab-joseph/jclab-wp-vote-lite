import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {VoterRepository} from '../repository/voter';
import {Voter} from '../entity/voter';
import {
  FlattenedJWSInput,
  importJWK,
  JWK,
  JWSHeaderParameters,
  jwtVerify,
  JWTVerifyResult,
  errors as JoseErrors
} from 'jose';
import ConfigManager from '../config';
import { Request } from 'express';
import { VoteTokenJWTPayload } from '../model/voter';
import { verifyPassword } from '../util/password';

export interface RemoteInfo {
  requestId: string;
  address: string;
  useragent: string;
}

export interface LoginFailResult {
  result: false;
}

export interface LoginSuccResult {
  result: true;
  elecId: string;
  voterCode: string;
}

export type LoginResult = LoginSuccResult | LoginFailResult;

@Injectable()
export class VoteAuthService {
  public static readonly VOTE_TOKEN_COOKIE_NAME = 'vote_token';

  public log: Logger;

  constructor(
    @InjectRepository(VoterRepository) private readonly voterRepository: VoterRepository
  ) {
    this.log = new Logger('VoterAuthService');
  }

  public loggingNoUser(remoteInfo: RemoteInfo, voterCode: string) {
    // const log = new LoginLog();
    // log.username = username;
    // log.result = LoginLogResult.FAILED_NO_USER;
    // log.reqId = remoteInfo.requestId;
    // log.remoteAddress = remoteInfo.address;
    // log.userAgent = remoteInfo.useragent;
    // return this.loginLogRepository.save(log);
  }

  public loggingWrongPassword(remoteInfo: RemoteInfo, row: Voter) {
    // const log = new LoginLog();
    // log.username = row.username;
    // log.account = Promise.resolve(row.account);
    // log.result = LoginLogResult.FAILED_WRONG_PASSWORD;
    // log.reqId = remoteInfo.requestId;
    // log.remoteAddress = remoteInfo.address;
    // log.userAgent = remoteInfo.useragent;
    // return this.loginLogRepository.save(log);
  }

  public loggingSucc(remoteInfo: RemoteInfo, row: Voter) {
    // const log = new LoginLog();
    // log.username = row.username;
    // console.log('row.account: ', row.account);
    // log.account = Promise.resolve(row.account);
    // log.result = LoginLogResult.SUCCESS;
    // log.reqId = remoteInfo.requestId;
    // log.remoteAddress = remoteInfo.address;
    // log.userAgent = remoteInfo.useragent;
    // return this.loginLogRepository.save(log);
  }

  public login(remoteInfo: RemoteInfo, voterCode: string, passphrase: string): Promise<LoginResult> {
    return this.voterRepository.findOne({
      where: {
        voterId: voterCode
      }
    })
      .then((row) => {
        if (!row) {
          this.loggingNoUser(remoteInfo, voterCode);
          return {
            result: false
          };
        }
        return verifyPassword(row.passphrase, passphrase)
          .then((result) => {
            if (result) {
              this.loggingSucc(remoteInfo, row);
              return {
                result: true,
                elecId: row.election.elecId,
                voterCode: voterCode
              };
            } else {
              this.loggingWrongPassword(remoteInfo, row);
              return {
                result: false
              };
            }
          });
      });
  }

  public decodeVoteToken(token: string | undefined): Promise<undefined | JWTVerifyResult> {
    if (!token) return Promise.resolve(undefined);
    return ConfigManager.getPublicKeys()
      .then((publicKeysJson) => JSON.parse(publicKeysJson) as {keys: JWK[]})
      .then((publicKeys) => {
        return jwtVerify(token, (protectedHeader: JWSHeaderParameters, token: FlattenedJWSInput) => {
          if (protectedHeader.kid) {
            const foundKey = publicKeys.keys.find(v => v.kid === protectedHeader.kid);
            if (foundKey) return importJWK(publicKeys.keys[0]);
          } else {
            return importJWK(publicKeys.keys[0]);
          }
          return Promise.reject(new Error('Unknown key'));
        });
      })
      .catch((err) => {
        if (err instanceof JoseErrors.JWTExpired) {
          return undefined;
        }
        this.log.error('vote token error', err);
        return undefined;
      });
  }

  public toVoterJWTPayload(result: JWTVerifyResult): VoteTokenJWTPayload {
    return (result.payload as any) as VoteTokenJWTPayload;
  }

  //TODO(refactor): Controller Helper 만들어서 옮기기
  public getAuthorizedVoterToken(req: Request): Promise<VoteTokenJWTPayload> {
    return this.decodeVoteToken(req.cookies[VoteAuthService.VOTE_TOKEN_COOKIE_NAME])
      .then((result) => {
        if (!result) return Promise.reject(new UnauthorizedException());
        return this.toVoterJWTPayload(result);
      })
      .catch((err: JoseErrors.JOSEError) => {
        if (!(err instanceof JoseErrors.JWTExpired)) {
          this.log.warn('decode voter token failed: ', err);
        }
        return Promise.reject(new UnauthorizedException());
      });
  }
}
