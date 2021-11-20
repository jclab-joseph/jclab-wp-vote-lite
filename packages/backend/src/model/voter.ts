import {
  JWTPayload
} from 'jose';

export type VoteTokenScope = 'voter' | 'viewer';

export interface VoteTokenJWTPayload extends JWTPayload {
  scope: VoteTokenScope[];
  elecId: string;
  // viewerId?: string;
  voterId?: string;
}
