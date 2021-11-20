import { HttpException, Injectable, Logger } from '@nestjs/common';
import * as uuid from 'uuid';
import * as http from 'http';
import * as ws from 'ws';
import AWS from 'aws-sdk';
import { Context } from 'aws-lambda';
import { WebsocketController } from './websocket_controller';
import { NestApplication } from '@nestjs/core';
import ConfigManager from '../config';

function isLambda(): boolean {
  return !!process.env.LAMBDA_TASK_ROOT;
}

@Injectable()
export class WebsocketGateway {
  private log: Logger;
  public controller!: WebsocketController;

  private apig_: AWS.ApiGatewayManagementApi;
  private _nativeWsServer!: ws.Server;
  private _connections: Record<string, ws.WebSocket> = {};

  constructor() {
    this.log = new Logger(WebsocketGateway.name);
    this.apig_ = new AWS.ApiGatewayManagementApi({
      endpoint: ConfigManager.APIG_ENDPOINT
    });
    console.log(process.env);
    console.log('ConfigManager.APIG_ENDPOINT: ', ConfigManager.APIG_ENDPOINT);
  }

  public sendEvent(connectionId: string, event: string, data: any) {
    return this.sendMessage(connectionId, JSON.stringify({event, data}));
  }

  public deleteConnection(connectionId: string): Promise<void> {
    if (isLambda()) {
      return this.apig_.deleteConnection({
        ConnectionId: connectionId
      })
        .promise().then(() => {});
    } else {
      const client = this._connections[connectionId];
      if (client) {
        client.close();
        delete this._connections[connectionId];
      }
    }
  }

  public sendMessage(connectionId: string, data: string): Promise<void> {
    if (isLambda()) {
      // USE API Gateway
      return this.apig_.postToConnection({
        ConnectionId: connectionId,
        Data: data
      }).promise().then(() => {});
    } else {
      const client = this._connections[connectionId];
      if (!client) return Promise.reject(new Error('no client connection: ' + connectionId));
      return new Promise<void>((resolve, reject) => {
        client.send(data, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
  // endregion

  // region native websocket
  public initServer(app: any) {
    const httpServer: http.Server = (app as NestApplication).getUnderlyingHttpServer();

    this._nativeWsServer = new ws.Server({
      noServer: true,
      path: '/ws',
      verifyClient: (info, cb) => {
        const connectionId = uuid.v4();
        (info.req as any).connectionId = connectionId;
        this.controller.onConnect(connectionId, info.req.headers as any)
          .then(() => {
            cb(true, 200);
          })
          .catch((err) => {
            this.log.warn('ws connect error', err);
            if (err instanceof HttpException) {
              cb(false, err.getStatus());
            } else {
              cb(false, 500);
            }
          });
      }
    });
    this._nativeWsServer.on('connection', (client, request) => {
      const connectionId = (request as any).connectionId;
      (client as any).id = connectionId;
      this._connections[connectionId] = client;
      client.onmessage = (event) => {
        // {type: 'message', data: 'string message'}
        if (this._connections[connectionId]) {
          this.controller.onRawMessage(connectionId, event.data as string);
        }
      };
      client.onclose = (event) => {
        if (this._connections[connectionId]) {
          this.controller.onDisconnect(connectionId);
          delete this._connections[connectionId];
        }
      };
      client.onerror = (event) => {
        console.error(event);
      };
    });

    httpServer.on('upgrade', (request, socket, head) => {
      const baseUrl = 'ws://' + request.headers.host + '/';
      const pathname = new URL(request.url, baseUrl).pathname;
      if (pathname === '/ws') {
        this._nativeWsServer.handleUpgrade(request, socket as any, head, (ws: any) => {
          this._nativeWsServer.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }
  // endregion

  // region lambda
  public lambdaHandler (
    event: any,
    context: Context
  ): Promise<null | any> {
    const {
      requestContext: { connectionId, routeKey }
    } = event;
    if (routeKey === '$connect') {
      return this.controller.onConnect(connectionId, event.headers)
        .then(() => {
          this.log.log(`websocket connected: ${connectionId}`);
          return {
            statusCode: 200
          };
        })
        .catch((err: Error) => {
          this.log.error(`websocket connect error (status=${(err instanceof HttpException) ? err.getStatus() : '?'})`, err);
          if (err instanceof HttpException) {
            return {
              statusCode: err.getStatus()
            };
          }
          return Promise.reject(err);
        });
    } else
    if (routeKey === '$disconnect') {
      this.controller.onDisconnect(connectionId);
      return Promise.resolve({
        statusCode: 200
      });
    }
    else if (routeKey === '$default') {
      return Promise.resolve()
        .then(() => {
          if (event.isBase64Encoded) {
            return this.controller.onRawMessage(connectionId, Buffer.from(event.body, 'base64').toString());
          } else {
            return this.controller.onRawMessage(connectionId, event.body);
          }
        })
        .then(() => {
          return {};
        });
    }
    return Promise.resolve(null);
  }
  // endregion
}
