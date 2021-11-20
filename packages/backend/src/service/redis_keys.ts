export function wsSessionKey(connectionId: string): string {
  return `WS_CON:${connectionId}`;
}

export function wsElectionViewerConnection(elecId: string, connectionId: string): string {
  return `WS_ELEC:${elecId}:VIEWER:${connectionId}`;
}

export function wsElectionVoterConnection(elecId: string, voterId: string, connectionId: string): string {
  return `WS_ELEC:${elecId}:VOTER:${voterId}:${connectionId}`;
}

export function wsElectionVoterConnectionWildcard(elecId: string): string {
  return `WS_ELEC:${elecId}:VOTER:*`;
}

export function votedVoterList(voteId: string) {
  return `VOTE:${voteId}:VOTED_VOTERS`;
}

export function voteState(voteId: string) {
  return `VOTE:${voteId}:STATE`;
}

export function cacheElectionTitle(elecId: string): string {
  return `ELEC:${elecId}:TITLE`;
}
