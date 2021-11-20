const fs = require('fs-extra');
const path = require('path');

fs.removeSync(path.resolve(path.join(__dirname, 'node_modules/serverless-plugin-typescript/node_modules/fs-extra')));
