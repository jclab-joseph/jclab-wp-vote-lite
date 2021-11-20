import * as crypto from 'crypto';
import * as util from 'util';
import * as sprintfjs from 'sprintf-js';
import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VoterRepository } from '../repository/voter';
import { Voter } from '../entity/voter';
import { RedisManager } from './redis_manager';
import { VoterList } from '@jclab-wp/vote-lite-common';
import { ElectionRepository } from '../repository/election';
import { digestPasswordWithPbkdf2, verifyPassword } from '../util/password';

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

export interface GeneratedVoter {
  id: string;
  pw: string;
}

export type LoginResult = LoginSuccResult | LoginFailResult;

const RANDOM_PASSWORD_CHAR_POOL = 'abcdefghijkmnpqrstuvwxyz23456789';

function randomPassword (length: number): string {
  let output: string = '';
  const randoms = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    const pos = randoms[i] % RANDOM_PASSWORD_CHAR_POOL.length;
    output += RANDOM_PASSWORD_CHAR_POOL.charAt(pos);
  }
  return output;
}

@Injectable()
export class VoterService {
  public log: Logger;

  constructor (
    @InjectRepository(ElectionRepository) private readonly electionRepository: ElectionRepository,
    @InjectRepository(VoterRepository) private readonly voterRepository: VoterRepository,
    @Inject(RedisManager) private readonly redisManager: RedisManager,
  ) {
    this.log = new Logger('VoterAuthService');
  }

  public getVotersForElection (elecId: string): Promise<VoterList> {
    return this.electionRepository.findOne({
      elecId: elecId
    })
      .then((election) => {
        if (!election) return Promise.reject(new BadRequestException('no election'));
        return this.voterRepository.find({
          election: election
        });
      })
      .then((voters) => {
        return {
          list: voters.map(v => ({
            createdAt: Math.floor(v.createdAt.getTime() / 1000),
            id: v.voterId
          }))
        };
      });
  }

  public newVoters (elecId: string, count: number): Promise<GeneratedVoter[]> {
    return this.electionRepository.findOne({
      elecId: elecId
    })
      .then((election) => {
        if (!election) return Promise.reject(new BadRequestException('no election'));
        return this.voterRepository.count({
          election: election
        })
          .then(async (storedVoterCount) => {
            const generateVoters: GeneratedVoter[] = [];
            for (let i = 0; i < count; i++) {
              //TODO: 고칠 것
              const currentVoterIndex = i + storedVoterCount + 1;
              const r = Math.round(Math.random() * 10) % 10;
              generateVoters.push({
                id: election.voterIdPrefix + randomPassword(4),
                pw: randomPassword(6)
              });
            }
            return generateVoters.reduce((prev, cur) =>
                prev.then((outputList: Voter[]) =>
                  digestPasswordWithPbkdf2(cur.pw)
                    .then((passphrase) => {
                      const entity = new Voter();
                      entity.voterId = cur.id;
                      entity.passphrase = passphrase;
                      entity.election = election;
                      entity.orgId = election.orgId;
                      outputList.push(entity);
                      return outputList;
                    })
                )
              , Promise.resolve([] as Voter[]))
              .then((voterEntities) => this.voterRepository.save(voterEntities))
              .then(() => generateVoters);
          });
      });
  }

  public deleteVoter (elecId: string, voterId: string): Promise<void> {
    return this.voterRepository.findOne({
      voterId: voterId
    })
      .then((voter) => {
        if (!voter) return Promise.reject(new BadRequestException('no voter'));
        if (voter.election.elecId !== elecId) return Promise.reject(new BadRequestException('no voter'));
        return this.voterRepository.delete(voter);
      })
      .then(() => {
      });
  }

  public login (remoteInfo: RemoteInfo, voterCode: string, passphrase: string): Promise<LoginResult> {
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

  private loggingNoUser (remoteInfo: RemoteInfo, voterCode: string) {
    // const log = new LoginLog();
    // log.username = username;
    // log.result = LoginLogResult.FAILED_NO_USER;
    // log.reqId = remoteInfo.requestId;
    // log.remoteAddress = remoteInfo.address;
    // log.userAgent = remoteInfo.useragent;
    // return this.loginLogRepository.save(log);
  }

  private loggingWrongPassword (remoteInfo: RemoteInfo, row: Voter) {
    // const log = new LoginLog();
    // log.username = row.username;
    // log.account = Promise.resolve(row.account);
    // log.result = LoginLogResult.FAILED_WRONG_PASSWORD;
    // log.reqId = remoteInfo.requestId;
    // log.remoteAddress = remoteInfo.address;
    // log.userAgent = remoteInfo.useragent;
    // return this.loginLogRepository.save(log);
  }

  private loggingSucc (remoteInfo: RemoteInfo, row: Voter) {
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
}
