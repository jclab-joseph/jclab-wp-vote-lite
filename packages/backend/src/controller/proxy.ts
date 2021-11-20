import { All, Controller, Get, Logger, Next, OnModuleInit, Post, Req, Res } from '@nestjs/common';
import {RequestHandler} from 'http-proxy-middleware';
import ConfigManager from '../config';

@Controller()
export class ProxyController implements OnModuleInit {
  private log: Logger;
  private _proxy: RequestHandler | undefined = undefined;

  constructor() {
    this.log = new Logger(ProxyController.name);
  }

  onModuleInit (): any {
    return Promise.resolve()
      .then(() => {
        if (ConfigManager.FRONT_PROXY_URL) {
          return import('http-proxy-middleware')
            .then((mod) => {
              this._proxy = mod.createProxyMiddleware({
                target: ConfigManager.FRONT_PROXY_URL,
                secure: false
              });
            });
        }
      });
  }

  @Get('*')
  proxyRequest(@Req() req, @Res() res, @Next() next) {
    if (this._proxy) {
      this._proxy(req, res, next);
    } else {
      next();
    }
  }
}
