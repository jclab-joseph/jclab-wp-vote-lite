require('dotenv').config();
import util from 'util';
import fs from 'fs';
import WaitSignal from 'wait-signal';
import {ConfigProvider} from './config_loaders/provider';
import {AWSSecretsManagerConfigLoader} from './config_loaders/aws_sm';
import {Logger} from '@nestjs/common';

export class ConfigManager {
  private log: Logger = new Logger(ConfigManager.name);
  private _loading: boolean = false;
  private _loadSignal: WaitSignal<boolean> = new WaitSignal();
  private _loaders: ConfigProvider[] = [];
  private _envs: Record<string, string> = {};

  constructor() {
    this._loaders.push(new AWSSecretsManagerConfigLoader());
  }

  public load(): Promise<boolean> {
    if (this._loading) {
      return this._loadSignal.wait();
    }
    this._loading = true;
    this.log.log('Start config manager loading...');
    return this._loaders.reduce(
      (prev, cur) => prev.then((loaded) => {
        if (loaded) return loaded;
        return cur.probe()
          .then((available) => {
            this.log.log(`provider[${cur.name}] available=${available}`);
            if (available) {
              return cur.read()
                .then((envs) => {
                  this.log.log(`provider[${cur.name}] loaded: ${Object.keys(envs).join(',')}`);
                  Object.assign(this._envs, envs);
                  return true;
                });
            }
            return false;
          });
      }), Promise.resolve(false)
    )
      .then((r) => {
        this.log.log('config loading done');
        this._loadSignal.signal(r);
        return r;
      })
      .catch((err) => {
        this.log.log(`config loading failed: ${err}`);
        this._loadSignal.throw(err);
        return Promise.reject(err);
      });
  }

  public get(key: string): string | undefined {
    return process.env[key] || this._envs[key];
  }

  public get AWS_REGION(): string {
    return this.get('AWS_REGION');
  }

  public get PRIVATE_KEY_FILE(): string {
    return this.get('PRIVATE_KEY_FILE') || '/secret-keys/private.key.json';
  }
  public get PRIVATE_KEY_DATA(): string {
    return this.get('PRIVATE_KEY_DATA');
  }
  public get PUBLIC_KEYS_FILE(): string {
    return this.get('PUBLIC_KEYS_FILE') || '/secret-keys/public.keys.json';
  }
  public get PUBLIC_KEYS_DATA(): string {
    return this.get('PUBLIC_KEYS_DATA');
  }
  public get HTTP_PORT(): number {
    return parseInt(this.get('HTTP_PORT') || '0');
  }
  public get DB_TYPE(): string {
    return this.get('DB_TYPE') || 'mysql';
  }
  public get DB_HOST(): string {
    return this.get('DB_HOST');
  }
  public get DB_PORT(): number {
    return parseInt(this.get('DB_PORT') || '3306');
  }
  public get DB_USERNAME(): string {
    return this.get('DB_USERNAME');
  }
  public get DB_PASSWORD(): string {
    return this.get('DB_PASSWORD');
  }
  public get DB_NAME(): string {
    return this.get('DB_NAME');
  }
  public get DB_CHARSET(): string {
    return this.get('DB_CHARSET') || 'utf8mb4_general_ci';
  }
  public get FRONT_PROXY_URL(): string {
    return this.get('FRONT_PROXY_URL');
  }
  public get OAUTH2_PRIVATE_KEY_FILE(): string {
    return this.get('OAUTH2_PRIVATE_KEY_FILE');
  }
  public get OAUTH2_PRIVATE_KEY_DATA(): string {
    return this.get('OAUTH2_PRIVATE_KEY_DATA');
  }
  public get OAUTH2_CLIENT_ID(): string {
    return this.get('OAUTH2_CLIENT_ID') || 'c209dc65-3949-11ec-a269-0ab62b850220';
  }
  public get OAUTH2_SERVER_URI(): string {
    return this.get('OAUTH2_SERVER_URI') || 'https://sso.wp-lite.jclab.kr/api/oauth';
  }
  public get OAUTH2_JWKS_URI(): string {
    return this.get('OAUTH2_JWKS_URI') || 'https://sso.wp-lite.jclab.kr/api/jwks.json';
  }
  public get OAUTH2_REDIRECT_URI(): string {
    return this.get('OAUTH2_REDIRECT_URI') || (this.BASE_URL + '/api/oauth_callback');
  }
  public get REDIS_URL(): string | undefined {
    return this.get('REDIS_URL');
  }
  public get REDIS_HOST(): string {
    return this.get('REDIS_HOST') || 'localhost';
  }
  public get REDIS_PORT(): number {
    return parseInt(this.get('REDIS_PORT') || '6379');
  }
  public get REDIS_AUTH_PASS(): string | undefined {
    return this.get('REDIS_AUTH_PASS');
  }
  public get REDIS_DB(): string | undefined {
    return this.get('REDIS_DB');
  }
  public get BASE_URL(): string {
    return this.get('BASE_URL') as string;
  }
  public get DOMAIN(): string {
    return this.get('DOMAIN') || 'vote.wp-lite.jclab.kr';
  }
  public get COOKIE_DOMAIN(): string | undefined {
    const cookieDomain = this.get('COOKIE_DOMAIN');
    if (cookieDomain === '!') return undefined;
    if (cookieDomain) return cookieDomain;
    return `.${this.DOMAIN}`;
  }
  public get APIG_ENDPOINT(): string {
    return this.get('APIG_ENDPOINT');
  }

  public getPrivateKey(): Promise<string> {
    if (this.PRIVATE_KEY_DATA) {
      return Promise.resolve(this.PRIVATE_KEY_DATA);
    }
    return util.promisify(fs.readFile)(this.PRIVATE_KEY_FILE, { encoding: 'utf-8' });
  }

  public getPublicKeys(): Promise<string> {
    if (this.PUBLIC_KEYS_DATA) {
      return Promise.resolve(this.PUBLIC_KEYS_DATA);
    }
    return util.promisify(fs.readFile)(this.PUBLIC_KEYS_FILE, { encoding: 'utf-8' });
  }

  getOauth2PrivateKey(): Promise<string> {
    if (this.OAUTH2_PRIVATE_KEY_DATA) {
      return Promise.resolve(this.OAUTH2_PRIVATE_KEY_DATA);
    }
    return util.promisify(fs.readFile)(this.OAUTH2_PRIVATE_KEY_FILE, { encoding: 'utf-8' });
  }

}

const instance = new ConfigManager();
export default instance;
