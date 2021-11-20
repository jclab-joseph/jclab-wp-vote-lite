import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import { ElectionRepository } from '../repository/election';
import { CacheService } from './cache.service';
import * as dto from '@jclab-wp/vote-lite-common';
import * as cacheKeys from './redis_keys';
import { VoteService } from './vote.service';
import * as redisKeys from './redis_keys';
import { RedisManager } from './redis_manager';
import { NewElectionRequest } from '@jclab-wp/vote-lite-common';
import { Election } from '../entity/election';
import { wsElectionVoterConnectionWildcard } from './redis_keys';

@Injectable()
export class ElectionService {
  constructor(
    @InjectRepository(ElectionRepository) private readonly electionRepository: ElectionRepository,
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(VoteService) private readonly voteService: VoteService,
    @Inject(RedisManager) private readonly redisManager: RedisManager,
  ) {
  }

  public createElection(orgId: string, data: NewElectionRequest): Promise<string> {
    const election = new Election();
    if (
      !data.title ||
      !data.voterIdPrefix ||
      data.voterIdPrefix.length < 4
    ) return Promise.reject(new BadRequestException('title or voterIdPrefix too short'));
    election.elecId = uuid.v4();
    election.title = data.title;
    election.voterIdPrefix = data.voterIdPrefix;
    election.orgId = orgId;
    return this.electionRepository.save(election)
      .then((r) => r.elecId);
  }

  public getElectionTitle(elecId: string): Promise<string> {
    return this.cacheService.getCache(
      cacheKeys.cacheElectionTitle(elecId), () => Promise.resolve().then(() => {
        return this.electionRepository.findOne({
          where: {
            elecId: elecId
          }
        })
          .then((row) => {
            if (!row) return Promise.reject(new Error('No election id'));
            return row.title;
          })
      }
    ), CacheService.STRING_CONVERTER);
  }

  public getElectionList(orgId: string): Promise<dto.ElectionBase[]> {
    return this.electionRepository.find({
      where: {
        orgId: orgId
      }
    })
      .then((rows) => {
        return rows.map(v => ({
          elecId: v.elecId,
          title: v.title,
          createdAt: Math.floor(v.createdAt.getTime() / 1000)
        }))
          .sort((x, y) => {
            if (x.createdAt < y.createdAt) return 1;
            if (x.createdAt > y.createdAt) return -1;
            return 0;
          });
      });
  }

  public getElectionInfo(elecId: string): Promise<dto.ElectionWithVotes> {
    return this.electionRepository.findOne({
      where: {
        elecId: elecId
      },
      relations: ['votes']
    })
      .then((row) => {
          if (!row) return Promise.reject(new ForbiddenException());
          return row.sortedVotes
            .then((votes) => Promise.all(votes.map(v => this.voteService.getVoteState(v.voteId)))
              .then((voteStates) => {
                return {
                  elecId: row.elecId,
                  title: row.title,
                  createdAt: Math.floor(row.createdAt.getTime() / 1000),
                  votes: votes.map((v, i) => ({
                    voteId: v.voteId,
                    title: v.title,
                    state: v.state,
                    createdAt: Math.floor(v.createdAt.getTime() / 1000),
                    voterCount: v.voterCount,
                    votedCount: voteStates[i].votedCount,
                    candidates: v.sortedCandidates.map(c => ({
                      cadtId: c.cadtId,
                      name: c.name,
                      number: c.number
                    })),
                    result: voteStates[i].result
                  } as dto.Vote))
                };
              })
            )
        });
  }

  public getConnectedVoterCount(elecId: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.redisManager.redis.keys(redisKeys.wsElectionVoterConnectionWildcard(elecId), (err, list) => {
        if (err) return reject(err);
        if (!list) {
          resolve(0);
          return ;
        }
        resolve(new Set<string>(list.map(v => v.split(':')[3])).size);
      })
    });
  }
}
