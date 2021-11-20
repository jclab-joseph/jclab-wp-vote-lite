import { Controller, Logger, Post, Req, Body, Inject, Query, Get, Res } from '@nestjs/common';
import * as url from 'url';
import {
  TextEncoder
} from 'util';
import {
  Response
} from 'express';
import axios, { AxiosError, AxiosResponse } from 'axios';
import ConfigManager from '../config';
import { CompactSign, importJWK, JWK } from 'jose';
import * as crypto from 'crypto';
import { VoteAuthService } from '../service/vote_auth.service';
import { AuthService } from '../service/auth.service';

interface AccessTokenIssueResponse {
  access_token: string;
  refresh_token: string | undefined;
  token_type: 'bearer';
  expires_in: number;
}

interface AccessTokenRefreshResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

const encoder = new TextEncoder();

function makeV1Payload (payloadMap: Record<string, string>) {
  const sortedKeys = Object.keys(payloadMap)
    .sort((x, y) => {
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });
  const payload = sortedKeys
    .reduce((list, cur) => {
      list.push(cur + '=' + payloadMap);
      return list;
    }, [])
    .join(';');
  const hash = crypto.createHash('sha256')
    .update(encoder.encode(payload))
    .digest();
  return hash;
}

@Controller()
export class AuthController {
  private log: Logger;

  constructor () {
    this.log = new Logger(AuthController.name);
  }

  @Get('/api/oauth_callback')
  public oauthCallback (
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const tokenUri = new url.URL(ConfigManager.OAUTH2_SERVER_URI);
    const grantType = 'authorization_code';
    tokenUri.pathname += '/token';
    tokenUri.searchParams.append('grant_type', grantType);
    tokenUri.searchParams.append('client_id', ConfigManager.OAUTH2_CLIENT_ID);
    tokenUri.searchParams.append('code', code);
    tokenUri.searchParams.append('state', state);
    return ConfigManager.getOauth2PrivateKey()
      .then((text) => JSON.parse(text))
      .then((jwk) => importJWK(jwk as JWK)
        .then((oauth2PrivateKey) => new CompactSign(makeV1Payload({
            grantType,
            code,
            state
          }))
            .setProtectedHeader({
              alg: jwk.alg,
              ver: 1,
              iss: Math.floor(new Date().getTime() / 1000)
            })
            .sign(oauth2PrivateKey),
        ),
      )
      .then((secret) => {
        tokenUri.searchParams.append('client_secret', '_' + secret);
        return axios
          .get(tokenUri.toString());
      })
      .then((response: AxiosResponse<AccessTokenIssueResponse>) => {
        res
          .cookie('jclab_wp_access_token', response.data.access_token, {
            domain: ConfigManager.COOKIE_DOMAIN,
            httpOnly: true
          })
          .redirect('/');
      })
      .catch((err: AxiosError) => {
        this.log.error('error', err);
        return Promise.reject(err);
      });
  }

  @Get('/api/auth/logout')
  public oauthLogout (
    @Res() res: Response,
  ) {
    res.clearCookie(AuthService.ACCESS_TOKEN_COOKIE_NAME);
    res.clearCookie(VoteAuthService.VOTE_TOKEN_COOKIE_NAME);
    res
      .sendStatus(204);
  }
}
