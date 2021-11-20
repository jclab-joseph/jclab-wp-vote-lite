import { Controller, Logger, Post, Req, Body, Inject, Query, Get, Res, Param, Put, Delete } from '@nestjs/common';
import {
  Request,
  Response
} from 'express';
import AWS from 'aws-sdk';
import { ElectionService } from '../service/election.service';
import {
  ElectionBase,
  ElectionWithVotes,
  NewElectionRequest,
  NewVoteRequest,
  VoterList
} from '@jclab-wp/vote-lite-common';
import { AuthService } from '../service/auth.service';
import { VoteService } from '../service/vote.service';
import { ViewService } from '../service/view.service';
import ConfigManager from '../config';
import { VoterService } from '../service/voter.service';

@Controller('/api/mgr/election/')
export class ManagerElectionController {
  private _lambda: AWS.Lambda;
  private log: Logger;

  constructor (
    @Inject(AuthService) public authService: AuthService,
    @Inject(ElectionService) public electionService: ElectionService,
    @Inject(VoteService) public voteService: VoteService,
    @Inject(ViewService) public viewService: ViewService,
    @Inject(VoterService) public voterService: VoterService,
  ) {
    this.log = new Logger(ManagerElectionController.name);
    this._lambda = new AWS.Lambda({
      region: ConfigManager.AWS_REGION
    });
  }

  @Get('/list')
  public getElections (
    @Req() req: Request,
  ): Promise<ElectionBase[]> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((accessToken) => {
        return this.electionService.getElectionList(accessToken.orgId);
      });
  }

  @Get('/:elecId/info')
  public getElectionInfo (
    @Req() req: Request,
    @Param('elecId') elecId: string,
  ): Promise<ElectionWithVotes> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((accessToken) => {
        return this.electionService.getElectionInfo(elecId);
      });
  }

  @Put('/new')
  public newElection (
    @Req() req: Request,
    @Body() body: NewElectionRequest,
  ): Promise<any> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((accessToken) => this.electionService.createElection(accessToken.orgId, body));
  }

  @Put('/:elecId/vote')
  public newVote (
    @Req() req: Request,
    @Param('elecId') elecId: string,
    @Body() body: NewVoteRequest,
  ): Promise<any> {
    return this.authService.getAuthorizedAccessToken(req)
      .then(() => this.voteService.createVote(elecId, body));
  }

  @Put('/:elecId/view')
  public newView (
    @Req() req: Request,
    @Param('elecId') elecId: string,
  ) {
    return this.authService.getAuthorizedAccessToken(req)
      .then(() => this.viewService.createView(elecId));
  }

  @Get('/:elecId/views')
  public getViews (
    @Req() req: Request,
    @Param('elecId') elecId: string,
  ) {
    return this.authService.getAuthorizedAccessToken(req)
      .then(() => this.viewService.getViews(elecId));
  }

  @Get('/:elecId/voters')
  public getVoters (
    @Req() req: Request,
    @Param('elecId') elecId: string,
  ): Promise<VoterList> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((token) => {
        return this.voterService.getVotersForElection(elecId);
      });
  }

  @Delete('/:elecId/voter/:voterId')
  public deleteVoter (
    @Req() req: Request,
    @Param('elecId') elecId: string,
    @Param('voterId') voterId: string,
  ): Promise<void> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((token) => {
        return this.voterService.deleteVoter(elecId, voterId);
      })
      .then(() => {
      });
  }

  @Post('/:elecId/generate-voters')
  public generateVoters (
    @Req() req: Request,
    @Res() res: Response,
    @Param('elecId') elecId: string,
    @Query('count') count: number,
    @Body() body: Buffer,
  ): Promise<void> {
    return this.authService.getAuthorizedAccessToken(req)
      .then((token) => {
        return this.voterService.newVoters(elecId, count)
          .then((voters) => {
            console.log('body: ', body);
            return this._lambda.invoke({
              FunctionName: 'arn:aws:lambda:ap-northeast-2:023247924618:function:jclab-wp-templated-generator-hwp',
              InvocationType: 'RequestResponse',
              Payload: JSON.stringify({
                baseUrl: ConfigManager.BASE_URL + '/voter/login',
                templateHwp: body.toString('base64'),
                itemsJson: JSON.stringify(voters.map(v => ({id: v.id, pw: v.pw})))
              })
            }).promise().then((funcRes) => {
              console.log('PAYLOAD[' + funcRes.Payload + ']')
              const payload = (() => {
                try {
                  return JSON.parse(funcRes.Payload as any) as string;
                } catch (e) {
                  return funcRes.Payload as string;
                }
              })();
              res
                .status(200)
                .header('Content-Type', 'application/vnd.hancom.hwp')
                .header('Content-disposition', 'attachment; filename=output.hwp')
                .send(Buffer.from(payload, 'base64'));
            })
          });
      });
  }
}
