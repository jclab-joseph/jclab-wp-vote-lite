import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import { CacheService } from './cache.service';
import { VoteRepository } from '../repository/vote';
import {
  NewVoteRequest,
  VoteCadtResult,
  VoteResult,
  VoteState,
  VoteStateUpdateItem
} from '@jclab-wp/vote-lite-common';
import { Vote } from '../entity/vote';
import { ElectionRepository } from '../repository/election';
import { Candidate } from '../entity/candidate';
import { VoteReceiptRepository } from '../repository/vote_receipt';
import { VoterRepository } from '../repository/voter';
import { VoteReceipt } from '../entity/vote_receipt';
import { CandidateRepository } from '../repository/candidate';
import { VoteMessage } from '../entity/vote_message';
import { VoteMessageRepository } from '../repository/vote_message';
import * as redisKeys from './redis_keys';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RedisManager } from './redis_manager';

const symNoDataError = Symbol('NoDataError');

class NoDataError extends Error {
  public [symNoDataError]: boolean = true;
}

interface VoteStateCacheData {
  state: VoteState;
  voterCount: number;
  result: VoteResult | null;
}

@Injectable()
export class VoteService {
  public log: Logger;

  constructor (
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(RedisManager) private readonly redisManager: RedisManager,
    @InjectRepository(ElectionRepository) private readonly electionRepository: ElectionRepository,
    @InjectRepository(VoteRepository) private readonly voteRepository: VoteRepository,
    @InjectRepository(VoterRepository) private readonly voterRepository: VoterRepository,
    @InjectRepository(VoteReceiptRepository) private readonly voteReceiptRepository: VoteReceiptRepository,
    @InjectRepository(CandidateRepository) private readonly candidateRepository: CandidateRepository,
    @InjectRepository(VoteMessageRepository) private readonly voteMessageRepository: VoteMessageRepository,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {
    this.log = new Logger('VoteService');
  }

  public createVote (
    elecId: string,
    request: NewVoteRequest,
  ): Promise<string> {
    return this.electionRepository.findOne({
      where: {
        elecId: elecId
      }
    })
      .then((election) => {
        if (!election) {
          return Promise.reject(new BadRequestException());
        }
        const vote = new Vote();
        vote.voteId = uuid.v4();
        vote.orgId = election.orgId;
        vote.election = election;
        vote.title = request.title;
        vote.candidates = [];

        let index = 0;
        for (const item of request.candidates) {
          const candidate = new Candidate();
          candidate.cadtId = uuid.v4();
          candidate.orgId = election.orgId;
          candidate.vote = Promise.resolve(vote);
          candidate.name = item.name;
          candidate.number = ++index;
          vote.candidates.push(candidate);
        }

        return this.voteRepository.save(vote);
      })
      .then((vote: Vote) => {
        this.eventEmitter.emit('election.update', elecId);
        return vote.voteId;
      });
  }

  public voteStart (
    voteId: string,
  ): Promise<void> {
    return this.voteRepository.createQueryBuilder()
      .where('voteId=:voteId AND state=:s1', {
        voteId,
        s1: VoteState.ready
      })
      .orWhere('voteId=:voteId AND state=:s2', {
        voteId,
        s2: VoteState.finished
      })
      .update()
      .set({ state: VoteState.voting })
      .execute()
      .then((result) => {
        if (result.affected <= 0) {
          return Promise.reject(new BadRequestException(new Error('Illegal State')));
        }
        this.postVoteUpdate(voteId);
      });
  }

  public voteStop (
    voteId: string,
  ): Promise<void> {
    return this.voteRepository.createQueryBuilder()
      .where('voteId=:voteId AND state=:state', {
        voteId,
        state: VoteState.voting
      })
      .update()
      .set({ state: VoteState.finished })
      .execute()
      .then((result) => {
        if (result.affected <= 0) {
          return Promise.reject(new BadRequestException(new Error('Illegal State')));
        }
        this.postVoteUpdate(voteId);
      });
  }

  public voteCountStart (
    voteId: string,
  ): Promise<void> {
    return this.voteRepository.createQueryBuilder()
      .update()
      .set({ state: VoteState.counting })
      .where('voteId=:voteId AND state=:state', {
        voteId,
        state: VoteState.finished
      })
      .execute()
      .then((result) => {
        if (result.affected <= 0) {
          return Promise.reject(new BadRequestException(new Error('Illegal State')));
        }
        this.postVoteUpdate(voteId);

        // TODO: 비동기 처리
        return this.voteCountAsync(voteId)
          .then(() => {
          });
      });
  }

  public setVoterCount (
    voteId: string,
    voterCount: number
  ) {
    return this.voteRepository.update({
      voteId: voteId
    }, {
      voterCount: voterCount
    })
      .then((result) => {
        this.postVoteUpdate(voteId);
      });
  }

  public voteCountAsync (
    voteId: string,
  ) {
    return this.voteResultOnly(voteId)
      .then((voteResult) => {
        const resultJson = Vote.voteResultToString(voteResult);
        return this.voteRepository.update({
          voteId: voteId
        }, {
          state: VoteState.completed,
          cachedResult: resultJson
        });
      })
      .catch((err) => {
        this.log.error('voteCountAsync: Error', err);
        return this.voteRepository.update({
          voteId: voteId
        }, {
          state: VoteState.finished
        })
          .then(() => Promise.reject(err));
      })
      .finally(() => {
        this.postVoteUpdate(voteId);
      });
  }

  public voteResultOnly (
    voteId: string,
  ): Promise<VoteResult> {
    return Promise.all([
      this.voteRepository.findOne({
        voteId: voteId
      }),
      this.voteReceiptRepository.count({
        where: {
          'voteId': voteId
        }
      })
    ])
      .then(([vote, votedCount]) => {
        if (!vote) {
          // Error
          this.log.error('voteCountAsync: could not find vote: ' + voteId);
          return;
        }
        return this.voteReceiptRepository.createQueryBuilder('r')
          .select()
          .where('r.voteId=:voteId', { voteId: vote.voteId })
          .addGroupBy('r.candidate')
          .addSelect(['count(*) as count'])
          .execute()
          .then((result) => {
            const voteResultCadts: Record<string, VoteCadtResult> = (!result) ? [] :
              result.reduce((map, cur) => {
                map[cur.r_cadt_id] = {
                  cadtId: cur.r_cadt_id,
                  name: '',
                  number: cur.r_cadt_number,
                  count: cur.count
                } as VoteCadtResult;
                return map;
              }, {});
            return this.candidateRepository.find({
              where: {
                voteId: voteId
              }
            })
              .then((candidates) => {
                candidates
                  .forEach((c) => {
                    if (voteResultCadts[c.cadtId]) {
                      voteResultCadts[c.cadtId].name = c.name;
                      voteResultCadts[c.cadtId].number = c.number;
                    } else {
                      voteResultCadts[c.cadtId] = {
                        cadtId: c.cadtId,
                        name: c.name,
                        number: c.number,
                        count: 0
                      };
                    }
                  });
                return {
                  candidates: Object.values(voteResultCadts),
                  voterCount: vote.voterCount,
                  votedCount: votedCount
                } as VoteResult;
              });
          });
      });
  }

  public updateVoteStateCache (voteId: string, state: VoteState, voterCount: number, voteResult: VoteResult | null) {
    const data: VoteStateCacheData = {
      state: state,
      voterCount: voterCount,
      result: voteResult
    };
    this.cacheService.setCache(redisKeys.voteState(voteId), data, CacheService.JSON_CONVERTER);
  }

  public getVoteState(voteId: string): Promise<VoteStateUpdateItem> {
    return this.cacheService.getCache<VoteStateCacheData>(redisKeys.voteState(voteId), () => {
      return this.voteRepository.findOne({
        where: {
          voteId
        }
      })
        .then((vote) => {
          if (!vote) {
            return Promise.reject(new BadRequestException('no vote id'));
          }
          const data: VoteStateCacheData = {
            state: vote.state,
            voterCount: vote.voterCount,
            result: vote.getCachedResult()
          };
          return data;
        });
    }, CacheService.JSON_CONVERTER)
      .then((res) => {
        return this.getVotedCount(voteId)
          .then((votedCount) => ({
            voteId: voteId,
            votedCount: votedCount,
            voterCount: res.voterCount,
            state: res.state,
            result: res.result
          } as VoteStateUpdateItem))
      });
  }

  public getVotedCount(voteId: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.redisManager.redis.scard(redisKeys.votedVoterList(voteId), (err, num) => {
        if (err) reject(err);
        else resolve(num);
      });
    });
  }

  public postVote (
    elecId: string,
    voteId: string,
    voterId: string,
    cadtId: string,
    message: string,
  ): Promise<void> {
    //TODO: 재-투표 방지
    return Promise.all([
      this.voteRepository.findOne({
        where: {
          voteId: voteId
        },
        relations: ['election']
      }),
      this.voterRepository.findOne({
        where: {
          voterId: voterId
        }
      }),
      this.candidateRepository.findOne({
        where: {
          cadtId: cadtId
        }
      })
    ])
      .then(([vote, voter, candidate]) => {
        if (!vote || !voter) {
          if (!vote) {
            this.log.warn('postVote: no voter ' + voteId);
          }
          if (!voter) {
            this.log.warn('postVote: no voter ' + voterId);
          }
          if (!candidate) {
            this.log.warn('postVote: no candidate ' + cadtId);
          }
          return Promise.reject(new BadRequestException());
        }
        if (vote.election.elecId != elecId) {
          this.log.warn('postVote: wrong elecId ' + elecId + ` for vote(${voteId}) and voter(${voterId})`);
          return Promise.reject(new BadRequestException());
        }
        if (candidate.voteId != voteId) {
          this.log.warn('postVote: wrong voteId ' + voteId + ` for candidate(${cadtId})`);
          return Promise.reject(new BadRequestException());
        }
        const voteReceipt = new VoteReceipt();
        voteReceipt.voter = voter;
        voteReceipt.vote = vote;
        voteReceipt.candidate = candidate;
        return this.voteReceiptRepository.save(voteReceipt)
          .then((result) => {
            if (!message) return Promise.resolve();
            const voteMsg = new VoteMessage();
            voteMsg.voter = voter;
            voteMsg.vote = vote;
            voteMsg.candidate = candidate;
            voteMsg.message = message;
            return this.voteMessageRepository.save(voteMsg)
              .then(() => {
                this.redisManager.redis.sadd(redisKeys.votedVoterList(voteId), voterId, (err, res) => {
                  console.log('redis sadd: ', err, res);
                  this.redisManager.redis.expire(redisKeys.votedVoterList(voteId), 86400 * 30);
                });
              });
          });
      });
  }

  private postVoteUpdate(voteId: string) {
    return this.voteRepository.findOne({
      where: {
        voteId
      }
    })
      .then((row) => {
        if (!row) return ;
        this.updateVoteStateCache(voteId, row.state, row.voterCount, row.cachedResult && JSON.parse(row.cachedResult) as VoteResult);
        this.eventEmitter.emit('vote.updated', voteId);
      });
  }
}
