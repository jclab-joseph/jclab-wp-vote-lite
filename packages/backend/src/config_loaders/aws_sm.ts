import AWS from 'aws-sdk';
import {ConfigProvider} from './provider';

const region = process.env.AWS_SECRETS_MANAGER_REGION || process.env.AWS_REGION;
const secretName = process.env.AWS_SECRETS_SECRET_MANAGER_NAME;

export class AWSSecretsManagerConfigLoader implements ConfigProvider {
  private _client: AWS.SecretsManager;

  constructor() {
    this._client = new AWS.SecretsManager({
      region: region
    });
  }

  get name(): string {
    return 'AWSSecretsManagerConfigLoader';
  }

  probe(): Promise<boolean> {
    return Promise.resolve((!!process.env.LAMBDA_TASK_ROOT) && (!!secretName));
  }

  read(): Promise<Record<string, string>> {
    return new Promise<Record<string, string>>((resolve, reject) => {
      this._client.getSecretValue({SecretId: secretName}, (err, data) => {
        if (err) {
          reject(err);
          return ;
        }
        try {
          const secret = ('SecretString' in data) ? data.SecretString : (Buffer.isBuffer(data.SecretBinary) ? data.SecretBinary.toString() : Buffer.from(data.SecretBinary as string, 'base64').toString());
          resolve(JSON.parse(secret));
        } catch (e) {
          reject(e);
        }
      });
    });
    return Promise.resolve(undefined);
  }
}
