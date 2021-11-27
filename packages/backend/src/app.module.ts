import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import * as Sentry from '@sentry/serverless';
import {OrmFeatureModule, OrmRootConfig} from './typeorm.modules';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {ConfigController} from './controller/config';
import {AuthController} from './controller/auth';
import {LoggerMiddleware} from './logger.middleware';
import {ProxyController} from './controller/proxy';
import {VoterController} from './controller/voter';
import {VoteAuthService} from './service/vote_auth.service';
import {CacheService} from './service/cache.service';
import {ElectionService} from './service/election.service';
import {AuthService} from './service/auth.service';
import {ManagerElectionController} from './controller/manager_election';
import { VoteService } from './service/vote.service';
import { ManagerVoteController } from './controller/manager_vote';
import { WebsocketController } from './controller/websocket_controller';
import { WebsocketGateway } from './controller/websocket_gateway';
import { RedisManager } from './service/redis_manager';
import { VoterService } from './service/voter.service';
import { ViewService } from './service/view.service';
import { ViewerController } from './controller/viewer';
import { WebsocketService } from './service/websocket.service';
import { ManagerViewController } from './controller/manager_view';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    OrmRootConfig(),
    OrmFeatureModule
  ],
  providers: [
    RedisManager,
    CacheService,
    AuthService,
    VoteAuthService,
    ElectionService,
    VoteService,
    WebsocketGateway,
    WebsocketController,
    VoterService,
    ViewService,
    WebsocketService
  ],
  controllers: [
    ConfigController,
    AuthController,
    ManagerElectionController,
    ManagerVoteController,
    ManagerViewController,
    VoterController,
    ViewerController,
    ProxyController
  ]
})
// , AuthController, OauthController, ProxyController
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(Sentry.Handlers.requestHandler())
      .forRoutes('*');
    consumer
      .apply(Sentry.Handlers.tracingHandler())
      .forRoutes('*');
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
