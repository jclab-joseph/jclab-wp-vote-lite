const fs = require('fs');
const path = require('path');
const util = require('util');
const { generateKeyPair, exportJWK, calculateJwkThumbprint, generateSecret} = require('jose');

const outputDirectory = process.argv[2];

(async () => {
  const keyPair = await generateKeyPair(
    'ES256',
    {
      namedCurve: 'prime256v1'
    }
  );
  const encKey = await generateSecret('A128GCM', { extractable: true });

  const privateJwk = await exportJWK(keyPair.privateKey);
  const publicJwk = await exportJWK(keyPair.publicKey);
  const encryptionKey = await exportJWK(encKey);

  const kid = await calculateJwkThumbprint(publicJwk, 'sha256');

  privateJwk.alg = 'ES256';
  privateJwk.use = 'sig';
  privateJwk.kid = kid;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';
  publicJwk.kid = kid;

  console.log('publicJwk : ', publicJwk);
  console.log('outputDirectory: ', outputDirectory);

  encryptionKey.enc = 'A128GCM';

  if (outputDirectory) {
    await util.promisify(fs.writeFile)(path.join(outputDirectory, 'private.key.json'), JSON.stringify(privateJwk));
    await util.promisify(fs.writeFile)(path.join(outputDirectory, 'enc.key.json'), JSON.stringify(encryptionKey));
    await util.promisify(fs.writeFile)(path.join(outputDirectory, 'public.keys.json'), JSON.stringify({
      keys: [publicJwk]
    }));
  } else {
    console.log('privateJwk : ', privateJwk);
    console.log('encryptionKey : ', encryptionKey);
  }
})();
