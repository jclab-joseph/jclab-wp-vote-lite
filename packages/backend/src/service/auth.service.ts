import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  Request
} from 'express';
import ConfigManager from '../config';
import axios from 'axios';
import {
  JWK,
  JWTVerifyResult,
  importJWK,
  jwtVerify,
  JWSHeaderParameters,
  FlattenedJWSInput,
  errors as JoseErrors
} from 'jose';
import { ElectionService } from './election.service';

interface JWKKeys {
  keys: JWK[];
}

export interface AccessTokenData {
  jti: string;
  iat: number;
  exp: number;
  aud: string;
  scope: string[];
  'https://wp-lite.jc-lab.net/jwt/org_id': string;
  'https://wp-lite.jc-lab.net/jwt/acnt_id': string;
  'https://wp-lite.jc-lab.net/jwt/auth_id': string;
}

export interface AuthorizedAccessToken {
  token: AccessTokenData;
  orgId: string;
  acntId: string;
}

@Injectable()
export class AuthService {
  public static readonly ACCESS_TOKEN_COOKIE_NAME = 'jclab_wp_access_token';

  public log: Logger;

  private _cachedSsoJwks: Record<string, JWK> = {};

  constructor (
    @Inject(ElectionService) public electionService: ElectionService,
  ) {
    this.log = new Logger('AuthService');
  }

  public decodeAccessToken (token: string | undefined): Promise<undefined | JWTVerifyResult> {
    if (!token) return Promise.resolve(undefined);
    return jwtVerify(token, (protectedHeader: JWSHeaderParameters, token: FlattenedJWSInput) => {
      const cachedKey = this._cachedSsoJwks[protectedHeader.kid];
      if (cachedKey) {
        return importJWK(cachedKey);
      }
      return axios.get(
        ConfigManager.OAUTH2_JWKS_URI,
        {
          responseType: 'json'
        },
      )
        .then((res) => {
          const keys: JWKKeys = res.data as JWKKeys;
          this._cachedSsoJwks = keys.keys
            .reduce((map, cur) => {
              map[cur.kid] = cur;
              return map;
            }, {} as Record<string, JWK>);
          const foundKey = keys.keys.find(v => v.kid === protectedHeader.kid);
          if (foundKey) return importJWK(foundKey);
          return Promise.reject(new Error('Unknown key'));
        });
    })
      .catch((err) => {
        if (err instanceof JoseErrors.JWTExpired) {
          return undefined;
        }
        return Promise.reject(err);
      });
  }

  public toAuthorizedAccessToken (result: JWTVerifyResult): AuthorizedAccessToken {
    const data = result.payload as any as AccessTokenData;
    return {
      token: data,
      orgId: data['https://wp-lite.jc-lab.net/jwt/org_id'],
      acntId: data['https://wp-lite.jc-lab.net/jwt/acnt_id']
    };
  }

  //TODO(refactor): Controller Helper 만들어서 옮기기
  public getAuthorizedAccessToken (req: Request): Promise<AuthorizedAccessToken> {
    return this.decodeAccessToken(req.cookies[AuthService.ACCESS_TOKEN_COOKIE_NAME])
      .then((result) => {
        if (!result) return Promise.reject(new UnauthorizedException());
        return this.toAuthorizedAccessToken(result);
      })
      .catch((err: JoseErrors.JOSEError) => {
        if (!(err instanceof JoseErrors.JWTExpired)) {
          this.log.warn('decode access token failed: ', err);
        }
        return Promise.reject(new UnauthorizedException());
      });
  }
}
