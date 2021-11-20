import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { INestApplication, Logger } from '@nestjs/common';
import serverlessExpress from '@vendia/serverless-express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { Callback, Context, Handler } from 'aws-lambda';
import WaitSignal from 'wait-signal';
import { AppModule } from './app.module';
import ConfigManager from './config';
import { WebsocketGateway } from './controller/websocket_gateway';

const applicationSignal: WaitSignal<INestApplication> = new WaitSignal();

const logger = new Logger('Application');

async function initialize () {
  try {
    await ConfigManager.load();
    const app = await NestFactory.create(AppModule);
    if (ConfigManager.HTTP_PORT) {
      //TODO: Memory Overflow 주의.
      //      Signed S3 PUT & Pipeline & Async download 필요
      app.use(bodyParser.raw({
        type: 'application/octet-stream'
      }));
    }
    app.use(cookieParser());
    await app.init();
    if (ConfigManager.HTTP_PORT) {
      const lambdaWebsocketService = app.get(WebsocketGateway);
      lambdaWebsocketService.initServer(app);
      app.listen(ConfigManager.HTTP_PORT)
        .then(() => {
          logger.log(`Listen ${ConfigManager.HTTP_PORT}`);
        })
        .catch((err) => {
          logger.error('Error', err);
        });
    }
    applicationSignal.signal(app);
  } catch (e) {
    console.error(e);
    applicationSignal.throw(e);
  }
}

initialize();

export const handler: Handler = (
  event: any,
  context: Context,
  callback: Callback,
) => {
  return applicationSignal.wait()
    .then((app) => {
      const serverlessHandler = serverlessExpress({
        app: app.getHttpAdapter().getInstance(),
        binaryMimeTypes: [
          'image/*',
          'font/*',
          'application/octet-stream',
          'application/vnd.hancom.hwp'
        ]
      });
      const lambdaWebsocketService = app.get(WebsocketGateway);
      return lambdaWebsocketService.lambdaHandler(event, context)
        .then((wsResult) => {
          if (wsResult) return wsResult;
          return serverlessHandler(event, context, callback);
        });
    });
};
