import {Controller, Get, Header, Inject, Req} from '@nestjs/common';
import {Configs} from '@jclab-wp/vote-lite-common';
import * as url from 'url';
import {
  Request
} from 'express';
import ConfigManager from '../config';
import {
  JWK,
  JWTVerifyResult,
  importJWK,
  jwtVerify,
  JWSHeaderParameters,
  FlattenedJWSInput
} from 'jose';
import {ElectionService} from '../service/election.service';
import { VoteAuthService } from '../service/vote_auth.service';
import { AuthService } from '../service/auth.service';

interface JWKKeys {
  keys: JWK[];
}

@Controller('/api')
export class ConfigController {
  constructor(
    @Inject(ElectionService) public electionService: ElectionService,
    @Inject(AuthService) public authService: AuthService
  ) {
  }

  private decodeVoterToken(token: string | undefined): Promise<undefined | JWTVerifyResult> {
    if (!token) return Promise.resolve(undefined);
    return ConfigManager.getPublicKeys()
      .then((publicKeysJson) => JSON.parse(publicKeysJson) as {keys: JWK[]})
      .then((publicKeys) => {
        return jwtVerify(token, (protectedHeader: JWSHeaderParameters, token: FlattenedJWSInput) => {
          if (protectedHeader.kid) {
            const foundKey = publicKeys.keys.find(v => v.kid === protectedHeader.kid);
            if (foundKey) return importJWK(publicKeys.keys[0]);
          } else {
            return importJWK(publicKeys.keys[0]);
          }
          return Promise.reject(new Error('Unknown key'));
        });
      });
  }

  @Get('/configs.json')
  @Header('Content-Type', 'application/json; charset=utf-8')
  getConfigs(
    @Req() req: Request
  ): Promise<Configs> {
    const oauth2ClientId = ConfigManager.OAUTH2_CLIENT_ID;
    const oauth2RedirectUri = ConfigManager.OAUTH2_REDIRECT_URI;
    const oauth2AuthorizeUri = new url.URL(ConfigManager.OAUTH2_SERVER_URI);
    oauth2AuthorizeUri.pathname += '/authorize';
    oauth2AuthorizeUri.searchParams.append('response_type', 'code');
    oauth2AuthorizeUri.searchParams.append('grant_type', 'password');
    oauth2AuthorizeUri.searchParams.append('redirect_uri', oauth2RedirectUri);
    oauth2AuthorizeUri.searchParams.append('client_id', oauth2ClientId);
    oauth2AuthorizeUri.searchParams.append('scope', 'jclab-wp-lite.vote/*');

    // jclab-wp-lite.vote/voter
    //
    console.log('req.cookies: ', req.cookies);
    const accessToken: string | undefined = req.cookies[AuthService.ACCESS_TOKEN_COOKIE_NAME];
    const voterToken: string | undefined = req.cookies[VoteAuthService.VOTE_TOKEN_COOKIE_NAME];
    return Promise.all([
      this.authService.decodeAccessToken(accessToken)
        .catch((err) => {
          return undefined;
        }),
      this.decodeVoterToken(voterToken)
        .catch((err) => {
          return undefined;
        })
    ])
      .then(async ([decodedAccessToken, decodedVoterToken]) => {
        const authorizedScopes: string[] = [];
        let electionTitle: string = '';
        console.log('decodedAccessToken: ', decodedAccessToken);
        if (decodedAccessToken) {
          authorizedScopes.push(...decodedAccessToken.payload.scope);
        }
        if (decodedVoterToken) {
          electionTitle = await this.electionService.getElectionTitle(decodedVoterToken.payload.elecId);
          authorizedScopes.push('jclab-wp-lite.vote/voter');
        }
        return Promise.resolve({
          oauth2ClientId: oauth2ClientId,
          oauth2RedirectUri: oauth2RedirectUri,
          oauth2AuthorizeUri: oauth2AuthorizeUri.toString(),
          authorizedScopes: authorizedScopes,
          electionTitle: electionTitle
        } as Configs);
      })
  }
}
