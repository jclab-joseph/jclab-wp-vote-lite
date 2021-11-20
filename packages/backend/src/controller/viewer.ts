import {Controller, Logger, Post, Req, Body, Inject, Query, Get, Res} from '@nestjs/common';
import { Response } from 'express';
import { WebsocketController } from './websocket_controller';
import ConfigManager from '../config';

@Controller()
export class ViewerController {
  private log: Logger;

  constructor(
    @Inject(WebsocketController) public websocketController: WebsocketController
  ) {
    this.log = new Logger('ViewerController');
  }

  @Post('/api/view/login')
  public postLogin(
    @Body() body: {id: string},
    @Res() res: Response
  ) {
    res.cookie('vote_view_id', body.id, {
      domain: ConfigManager.COOKIE_DOMAIN,
      httpOnly: true
    });
    res.sendStatus(204);
  }
}
