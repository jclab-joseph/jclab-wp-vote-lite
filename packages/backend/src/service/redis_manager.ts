import {Injectable, Logger} from '@nestjs/common';
import redis from 'redis';
import ConfigManager from '../config';

@Injectable()
export class RedisManager {
  public log: Logger;
  private _redis: redis.RedisClient;
  private _alive: boolean = false;
  private _healthTimer: NodeJS.Timer | null;
  public expireDuration: number = 3600;

  constructor() {
    this.log = new Logger('RedisManager');
    this._redis = redis.createClient({
      host: ConfigManager.REDIS_HOST,
      port: ConfigManager.REDIS_PORT,
      url: ConfigManager.REDIS_URL,
      auth_pass: ConfigManager.REDIS_AUTH_PASS,
      db: ConfigManager.REDIS_DB
    });
    this._healthTimer = setInterval(() => this.redisHealthCheck(), 10000);
    this.redisHealthCheck();
  }

  public get isAlive(): boolean {
    return this._alive;
  }

  public get redis(): redis.RedisClient {
    return this._redis;
  }

  beforeApplicationShutdown() {
    this.close();
  }

  close() {
    if (this._healthTimer) {
      clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
  }

  public keys(pattern: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this._redis.keys(pattern, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  private redisHealthCheck() {
    this._redis.ping((err, res) => {
      if (err) {
        this.log.warn('redis down: ' + err.name + ': ' + err.message);
        this._alive = false;
        return;
      }
      this._alive = true;
    });
  }
}
