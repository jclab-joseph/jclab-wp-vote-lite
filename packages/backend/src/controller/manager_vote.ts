import { Controller, Logger, Post, Req, Body, Inject, Query, Get, Res, Param, Put } from '@nestjs/common';
import {
  Request,
  Response
} from 'express';
import {AuthService} from '../service/auth.service';
import { VoteService } from '../service/vote.service';

//TODO: 권한 확인

@Controller('/api/mgr/vote/')
export class ManagerVoteController {
  private log: Logger;

  constructor(
    @Inject(AuthService) public authService: AuthService,
    @Inject(VoteService) public voteService: VoteService
  ) {
    this.log = new Logger('ManagerVoteController');
  }

  @Post('/:voteId/start')
  public postVoteStart(
    @Req() req: Request,
    @Param('voteId') voteId: string
  ): Promise<any> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((accessToken) => {
        //TODO: Authorization
        return this.voteService.voteStart(voteId);
      });
  }

  @Post('/:voteId/stop')
  public postVoteStop(
    @Req() req: Request,
    @Param('voteId') voteId: string
  ): Promise<any> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((accessToken) => {
        //TODO: Authorization
        return this.voteService.voteStop(voteId);
      });
  }

  @Post('/:voteId/count')
  public postVoteCount(
    @Req() req: Request,
    @Param('voteId') voteId: string
  ): Promise<any> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((accessToken) => {
        //TODO: Authorization
        return this.voteService.voteCountStart(voteId);
      });
  }

  @Post('/:voteId/voter_count')
  public postVoterCount(
    @Req() req: Request,
    @Param('voteId') voteId: string,
    @Body() body: {
      voterCount: number
    }
  ) {
    return this.authService.getAuthorizedAccessToken(req)
      .then((accessToken) => {
        return this.voteService.setVoterCount(voteId, body.voterCount);
      });
  }
}
