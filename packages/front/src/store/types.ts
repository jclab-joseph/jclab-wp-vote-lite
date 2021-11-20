import { ElectionItem } from '@/wrappers';

export type Scope = 'jclab-wp-lite.vote/manager' | 'jclab-wp-lite.vote/viewer' | 'jclab-wp-lite.vote/voter';

export interface ManagerState {
  electionTitle: string;
}

export interface VoterState {
  electionTitle: string;
}

export interface ViewerState {
  electionTitle: string;
}

export type Context = '' | 'voter' | 'viewer' | 'manager';

export interface RootState {
  loading: boolean;

  // region configs
  oauth2AuthorizeUri: string;
  oauth2ClientId: string;
  oauth2RedirectUri: string;
  authorizedScopes: Scope[];
  // endregion

  currentContext: Context;
  isLoggedIn: boolean;

  currentElection: ElectionItem | null;

  manager: ManagerState;
  voter: VoterState;
  viewer: ViewerState;
}
