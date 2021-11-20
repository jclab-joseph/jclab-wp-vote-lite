import { DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { Election } from './entity/election';
import { ElectionRepository } from './repository/election';
import { Voter } from './entity/voter';
import { VoterRepository } from './repository/voter';

import ConfigManager from './config';
import { Candidate } from './entity/candidate';
import { VoteReceipt } from './entity/vote_receipt';
import { Vote } from './entity/vote';
import { VoteRepository } from './repository/vote';
import { CandidateRepository } from './repository/candidate';
import { VoteReceiptRepository } from './repository/vote_receipt';
import { VoteMessageRepository } from './repository/vote_message';
import { VoteMessage } from './entity/vote_message';
import { ViewRepository } from './repository/view';
import { View } from './entity/view';

export function OrmRootConfig (): Promise<DynamicModule> {
  return ConfigManager.load()
    .then(() => TypeOrmModule.forRoot({
      type: ConfigManager.DB_TYPE as any,
      host: ConfigManager.DB_HOST,
      port: ConfigManager.DB_PORT,
      username: ConfigManager.DB_USERNAME,
      password: ConfigManager.DB_PASSWORD,
      database: ConfigManager.DB_NAME,
      charset: ConfigManager.DB_CHARSET,
      timezone: 'Z',
      synchronize: true,
      logging: ['log', 'info', 'warn', 'error', 'migration'],
      entities: [
        Election,
        Voter,
        Vote,
        Candidate,
        VoteReceipt,
        VoteMessage,
        View
      ]
    }));
}

export const OrmFeatureModule = TypeOrmModule.forFeature([
  ElectionRepository,
  VoterRepository,
  VoteRepository,
  CandidateRepository,
  VoteReceiptRepository,
  VoteMessageRepository,
  ViewRepository
]);
