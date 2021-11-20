import { Controller, Logger, Post, Req, Body, Inject, Query, Get, Res, BadRequestException } from '@nestjs/common';
import * as url from 'url';
import * as uuid from 'uuid';
import {
 TextEncoder
} from 'util';
import {
  Request,
  Response
} from 'express';
import ConfigManager from '../config';
import {CompactSign, importJWK, JWK, SignJWT} from 'jose';
import {VoteAuthService, RemoteInfo} from '../service/vote_auth.service';
import {VoteTokenJWTPayload} from '../model/voter';
import { ElectionService } from '../service/election.service';
import { VoteService } from '../service/vote.service';
import { ElectionWithVotes, VoteForVoter, VoteRequest } from '@jclab-wp/vote-lite-common';
import { VoterRepository } from '../repository/voter';
import { VoteReceipt } from '../entity/vote_receipt';
import { VoterService } from '../service/voter.service';

const encoder = new TextEncoder();

@Controller('/api/voter')
export class VoterController {
  private log: Logger;

  constructor(
    @Inject(VoterService) public voterService: VoterService,
    @Inject(VoteAuthService) public voterAuthService: VoteAuthService,
    @Inject(ElectionService) public electionService: ElectionService,
    @Inject(VoteService) public voteService: VoteService,

    //TODO: 서비스로 옮기기
    @Inject(VoterRepository) public voterRepository: VoterRepository,
  ) {
    this.log = new Logger(VoterController.name);
  }

  @Post('/login')
  public login(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const voterCode = body.voter_code;
    const passphrase = body.passphrase;
    const remoteInfo: RemoteInfo = {
      requestId: uuid.v4(),
      address: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || (req as any).connection.remoteAddress,
      useragent: req.headers['user-agent']
    };
    return this.voterService.login(remoteInfo, voterCode, passphrase)
      .then((result) => {
        if (result.result) {
          return ConfigManager.getPrivateKey()
            .then((privateKey) => JSON.parse(privateKey) as JWK)
            .then((jwk) => importJWK(jwk)
              .then((privateKey) => {
                const now = new Date().getTime();
                const expiresIn = 3600;
                const accessTokenId = uuid.v4();

                return new SignJWT({
                  jti: accessTokenId,
                  iat: Math.floor(now / 1000),
                  exp: Math.floor(now / 1000) + expiresIn,
                  // aud: clientInfo.audience,
                  scope: ['voter'],
                  elecId: result.elecId,
                  voterId: result.voterCode
                } as VoteTokenJWTPayload)
                  .setProtectedHeader({
                    typ: 'JWT',
                    alg: jwk.alg,
                    kid: jwk.kid
                  })
                  .sign(privateKey);
              })
            )
            .then((jwt) => {
              res
                .status(200)
                .cookie(VoteAuthService.VOTE_TOKEN_COOKIE_NAME, jwt, {
                  domain: ConfigManager.COOKIE_DOMAIN,
                  httpOnly: true
                })
                .send({
                  message: 'OK'
                });
            });
        } else {
          res
            .status(401)
            .send({
              message: 'Login Failed'
            });
        }
      });
  }

  @Get('/election')
  public getVotes(
    @Req() req: Request
  ): Promise<ElectionWithVotes<VoteForVoter>> {
    return this.voterAuthService.getAuthorizedVoterToken(req)
      .then((voterToken) => {
        return Promise.all([
          this.electionService.getElectionInfo(voterToken.elecId),
          this.voterRepository.findOne({
            where: {
              voterId: voterToken.voterId
            }
          })
        ])
          .then(([electionInfo, voter]) => {
            if (!voter) {
              this.log.warn('Could not find voter: ' + voterToken.voterId);
              return Promise.reject(new BadRequestException());
            }
            return voter.receipts.then((receipts) => {
              const receiptMap = receipts
                .reduce((map, cur) => {
                  map[cur.voteId] = cur;
                  return map;
                }, {} as Record<string, VoteReceipt>);
              return {
                ...electionInfo,
                votes: electionInfo.votes
                  .map(v => {
                    return {
                      ...v,
                      voted: !!receiptMap[v.voteId]
                    };
                  })
              };
            });
          });
      });
  }

  @Post('/vote')
  public postVote(
    @Req() req: Request,
    @Body() body: VoteRequest
  ) {
    return this.voterAuthService.getAuthorizedVoterToken(req)
      .then((voterToken) => {
        return this.voteService.postVote(
          voterToken.elecId,
          body.voteId,
          voterToken.voterId,
          body.cadtId,
          body.message
        );
      });
  }
}
