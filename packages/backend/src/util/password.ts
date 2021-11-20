import util from 'util';
import crypto from 'crypto';

function b64UrlToNormalize(input: string): string {
  let out = input
    .replace(/\./g, '+')
    .replace(/_/g, '/');
  const padding = out.length % 3;
  if (padding) {
    out += '='.repeat(3 - padding);
  }
  return out;
}

function toBase64Url(input: Buffer): string {
  return input.toString('base64')
    .replace(/\+/g, '.')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function verifyPassword(stored: string, input: string): Promise<boolean> {
  const tokens = stored.split('$');
  if (tokens[1].startsWith('pbkdf2-')) {
    const iterations = parseInt(tokens[2]);
    const salt = Buffer.from(b64UrlToNormalize(tokens[3]), 'base64');
    const hash = Buffer.from(b64UrlToNormalize(tokens[4]), 'base64');
    return util.promisify(crypto.pbkdf2)(input, salt, iterations, hash.length, tokens[1].substr(7))
      .then((res) => res.equals(hash));
  }
  return Promise.reject(new Error('Not supported algorithm: ' + tokens[1]));
}

export function digestPasswordWithPbkdf2(input: string): Promise<string> {
  const iterations = 29000;
  const algo = 'sha256';
  const salt = crypto.randomBytes(8);
  return util.promisify(crypto.pbkdf2)(input, salt, iterations, 32, algo)
    .then((res) => {
      return `$pbkdf2-${algo}$${iterations}$${toBase64Url(salt)}$${toBase64Url(res)}`;
    });
}
