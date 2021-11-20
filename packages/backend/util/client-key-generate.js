const fs = require('fs');
const path = require('path');
const util = require('util');
const { generateKeyPair, exportJWK, calculateJwkThumbprint, generateSecret} = require('jose');

const name = process.argv[2];
const outputDirectory = process.argv[3];

if (!name) {
  console.error('need name andor output directory');
  process.exit(1);
}

(async () => {
  const keyPair = await generateKeyPair(
    'ES256',
    {
      namedCurve: 'prime256v1'
    }
  );
  const privateJwk = await exportJWK(keyPair.privateKey);
  const publicJwk = await exportJWK(keyPair.publicKey);
  const kid = await calculateJwkThumbprint(publicJwk, 'sha256');

  privateJwk.alg = 'ES256';
  privateJwk.use = 'sig';
  privateJwk.kid = kid;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';
  publicJwk.kid = kid;

  console.log('publicJwk : ', publicJwk);
  console.log('outputDirectory: ', outputDirectory);

  if (outputDirectory) {
    await util.promisify(fs.writeFile)(path.join(outputDirectory, name + '-private.key.json'), JSON.stringify(privateJwk));
    await util.promisify(fs.writeFile)(path.join(outputDirectory, name + '-public.key.json'), JSON.stringify(publicJwk));
  } else {
    console.log('privateJwk : ', privateJwk);
  }
})();
