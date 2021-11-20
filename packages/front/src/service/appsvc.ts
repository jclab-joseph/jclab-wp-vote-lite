import * as events from 'events';
import { VueConstructor } from 'vue';
import axios, { Axios, AxiosError, AxiosInstance } from 'axios';
import { ElectionWithVotes, VoteStateUpdateItem } from '@jclab-wp/vote-lite-common';

const vueModulePropName = '$appsvc';
const symbolGlobalInited = Symbol('AppServiceInited');

export interface WsCommunicator extends events.EventEmitter {
  readonly isConnected: boolean;

  on(type: string, listener: (...args: any[]) => void): this;
  on(type: 'connect', listener: () => void): this;
  on(type: 'election.update', listener: (info: ElectionWithVotes) => void): this;
  on(type: 'votes.update.status', listener: (info: VoteStateUpdateItem[]) => void): this;
  on(type: 'request.election.now.voter.count', listener: (info: {count: number}) => void): this;

  wsEmit(type: string, data?: any): boolean;
  wsEmit(type: 'request.election.update'): boolean;
  wsEmit(type: 'request.votes.update.status'): boolean;
  wsEmit(type: 'request.election.now.voter.count'): boolean;
}

export interface AppService {
  [symbolGlobalInited]: boolean;
  httpClient: Axios;

  goLogin(): void;
  logout(): void;
  feedChangeLoginStatus(): void;
  startViewerMode(): void;

  wscAttach(instance: any): WsCommunicator;
  wscDetach(instance: any): void;
}

declare module 'vue/types/vue' {
  interface Vue {
    '$appsvc': AppService;
  }
}

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    'appsvc'?: AppService;
  }
}

declare module 'axios' {
  interface AxiosRequestConfig {
    appNoErrorHandling?: boolean;
    retriedCount?: number;
  }
}

const rootContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: undefined as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vueConstructor: undefined as any
} as {
  instance: AppService;
  vueConstructor: VueConstructor;
};

function vueInit () {
  if (rootContext.vueConstructor && rootContext.instance) {
    rootContext.vueConstructor.mixin({
      beforeCreate (): void {
        rootContext.vueConstructor.observable(rootContext.instance);
      },
      created (): void {
        const instance: AppService = rootContext.instance;
        if (!instance[symbolGlobalInited]) {
          instance[symbolGlobalInited] = true;
        }
      }
    });
  }
}

export interface AppServicePriv {
  readonly ws: WebSocket | null;
  wsEmit (type: string, data?: any): boolean;
}

export class WsCommunicatorImpl extends events.EventEmitter implements WsCommunicator {
  constructor (private appService: AppServicePriv) {
    super();
  }

  public get isConnected (): boolean {
    return !!this.appService.ws;
  }

  public wsEmit (type: string, data?: any): boolean {
    return this.appService.wsEmit(type, data);
  }
}

export class AppServiceImpl implements AppService, AppServicePriv {
  public [symbolGlobalInited]: boolean = false;
  public app!: Vue;

  private _httpClient: AxiosInstance;
  private _ws: WebSocket | null = null;
  private _wsTimer: number = 0;
  private _wsErrorCount: number = 0;

  private _viewerMode: boolean = false;

  private _wsc: Record<any, WsCommunicatorImpl> = {};

  public static install (vueConstructor: VueConstructor /*, options?: never */): void {
    if (!vueConstructor.prototype[vueModulePropName]) {
      Object.defineProperty(vueConstructor.prototype, vueModulePropName, {
        get () {
          return rootContext.instance;
        },
      });
      rootContext.vueConstructor = vueConstructor;
      vueInit();
    }
  }

  constructor () {
    rootContext.instance = this;
    vueInit();
    const httpClient = axios.create();
    httpClient.interceptors.request.use((config) => {
      if (typeof config.withCredentials === 'undefined') {
        config.withCredentials = true;
      }
      return config;
    });
    httpClient.interceptors.response.use(undefined, (err: AxiosError) => {
      const status = err.response?.status;
      const retriedCount = err.config.retriedCount || 0;
      console.error(err);
      if (!err.config.appNoErrorHandling) {
        if (retriedCount < 1 && status === 502) {
          // Bad Gateway
          err.config.retriedCount = retriedCount + 1;
          return httpClient.request(err.config);
        }
        if (status === 401) {
          // Unauthorized
          this.goLogin();
        }
      }
      return Promise.reject(err);
    });
    this._httpClient = httpClient;
    this._wsTimer = setInterval(() => {
      if (this.ws) {
        this.wsEmit('ping');
      }
    }, 15000);
  }

  public get ws (): WebSocket | null {
    return this._ws;
  }

  public wsReconnect () {
    this.wsClose();
    const ws = new WebSocket(process.env.VUE_APP_WEBSOCKET_URL);
    this._ws = ws;
    (ws as any).useReconnect = true;
    ws.onopen = (ev) => {
      console.log('websocket open: ', ev);
      this._wsErrorCount = 0;
      this._emitEvent('connect');
    };
    ws.onclose = (ev) => {
      console.log('websocket close: ', ev);
      if ((ws as any).useReconnect) {
        setTimeout(() => {
          if (this.isLogon) {
            this.wsReconnect();
          }
        }, 3000);
      }
    };
    ws.onerror = (ev) => {
      this._wsErrorCount++;
      if (this._wsErrorCount >= 2) {
        this._wsErrorCount = 0;
        this.goLogin();
      }
    };
    ws.onmessage = (ev) => {
      const { event, data } = JSON.parse(ev.data);
      this._emitEvent(event, data);
    };
  }

  private _emitEvent (event: string, data?: any) {
    Object.values(this._wsc)
      .forEach((wsc) => {
        wsc.emit(event, data);
      });
  }

  public wsClose () {
    if (this._ws) {
      (this._ws as any).useReconnect = false;
      this._ws.close();
      this._ws = null;
    }
  }

  public attach (app: Vue) {
    this.app = app;
  }

  wscAttach (instance: any): WsCommunicator {
    const wsc = new WsCommunicatorImpl(this);
    this._wsc[instance] = wsc;
    this.app.$nextTick(() => {
      if (this._ws && this._ws.readyState === 1) {
        wsc.emit('connect');
      }
    });
    return wsc;
  }

  wscDetach (instance: any): void {
    delete this._wsc[instance];
  }

  public wsEmit (type: string, data?: any): boolean {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        event: type,
        data: data
      }));
      return true;
    }
    return false;
  }

  public goLogin (): void {
    if (this.app.$store.state.currentContext === 'voter') {
      this.app.$router.push('/voter/login');
    } else {
      this.app.$router.push('/login');
    }
  }

  public logout (): void {
    this.httpClient.get(
      '/api/auth/logout',
      {
        withCredentials: true
      }
    )
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.goLogin();
      });
  }

  public feedChangeLoginStatus (forceWsReconnect?: boolean): void {
    console.log(this.app.$store.state);
    this._wsErrorCount = 0;
    if (this.isLogon) {
      if (!this._ws || forceWsReconnect) {
        this.wsReconnect();
      }
    } else {
      this.wsClose();
    }
  }

  startViewerMode (): void {
    this._viewerMode = true;
    this.feedChangeLoginStatus();
  }

  public get httpClient (): Axios {
    return this._httpClient;
  }

  public get isLogon (): boolean {
    return (this.app.$store.state.authorizedScopes.length > 0) || this._viewerMode;
  }
}
