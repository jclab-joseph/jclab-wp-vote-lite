import { Controller, Logger, Post, Req, Body, Inject, Query, Get, Res, Param, Put, Delete } from '@nestjs/common';
import {
  Request
} from 'express';
import { ElectionService } from '../service/election.service';
import { AuthService } from '../service/auth.service';
import { ViewService } from '../service/view.service';

@Controller('/api/mgr/view/')
export class ManagerViewController {
  private log: Logger;

  constructor (
    @Inject(AuthService) public authService: AuthService,
    @Inject(ElectionService) public electionService: ElectionService,
    @Inject(ViewService) public viewService: ViewService,
  ) {
    this.log = new Logger(ManagerViewController.name);
  }

  @Delete('/:viewId')
  public deleteView (
    @Req() req: Request,
    @Param('viewId') viewId: string,
  ) {
    return this.authService.getAuthorizedAccessToken(req)
      .then((token) => this.viewService.deleteView(viewId));
  }
}
