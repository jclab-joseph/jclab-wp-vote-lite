import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisManager } from './redis_manager';

export interface CacheConverter<T> {
  serialize: (data: T) => Promise<string> | string;
  deserialize: (data: string) => Promise<T> | T;
}

@Injectable()
export class CacheService {
  public log: Logger;
  public expireDuration: number = 3600;

  constructor(
    @Inject(RedisManager) public redisManager: RedisManager
  ) {
    this.log = new Logger('CacheService');
  }

  public setCache<T>(key: string, value: T, converter: CacheConverter<T>): void {
    if (!this.redisManager.isAlive) {
      return ;
    }
    Promise.resolve(converter.serialize(value))
      .then((text) => new Promise<void>((resolve, reject) => {
        this.redisManager.redis.set(key, text, 'EX', this.expireDuration, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }));
  }

  public getCache<T>(key: string, reader: () => Promise<T>, converter: CacheConverter<T>): Promise<T> {
    if (!this.redisManager.isAlive) {
      return reader();
    }
    return new Promise<string | null>((resolve, reject) => {
      this.redisManager.redis.get(key, (err, value) => {
        if (value) {
          this.redisManager.redis.expire(key, this.expireDuration);
          return resolve(value);
        }
        if (err) {
          this.log.warn(`redis error: ${err.name}: ${err.message}`);
        }
        resolve(null);
      });
    })
      .then((text) => {
        if (text) {
          return converter.deserialize(text);
        }
        return reader()
          .then((v) => {
            Promise.resolve(converter.serialize(v))
              .then((serialized) => this.redisManager.redis.set(key, serialized, 'EX', this.expireDuration));
            return v;
          });
      });
  }

  public static readonly STRING_CONVERTER: CacheConverter<string> = {
    serialize: (data) => data,
    deserialize: (data) => data
  };

  public static readonly JSON_CONVERTER: CacheConverter<any> = {
    serialize: (data) => JSON.stringify(data),
    deserialize: (data) => JSON.parse(data)
  };
}
