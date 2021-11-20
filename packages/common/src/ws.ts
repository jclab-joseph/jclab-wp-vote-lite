export interface WsHandshakeRequestForOther {
  mode: 'voter' | 'manager';
}

export interface WsHandshakeRequestForViewer {
  mode: 'viewer';
  viewId: string;
}
export type WsHandshakeRequest = WsHandshakeRequestForOther | WsHandshakeRequestForViewer;

export interface WsHandshakeResponse {
  result: boolean;
  message: string;
}
