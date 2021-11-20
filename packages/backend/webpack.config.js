const fs = require('fs');
const path = require('path');
const nodeExternals = require('webpack-node-externals');

const slsw = require('serverless-webpack');
const isLocal = slsw.lib.webpack.isLocal;

class PackageJsonCopyPlugin {
  constructor () {
  }

  apply (compiler) {
    compiler.hooks.done.tap(PackageJsonCopyPlugin.name, (compilation) => {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', {encoding: 'utf-8'}));
      if (packageJson.devDependencies) delete packageJson['devDependencies'];
      if (packageJson.scripts) delete packageJson['scripts'];
      fs.writeFileSync(path.join(compiler.options.output.path, 'package.json'), JSON.stringify(packageJson));
    });
  }
}

const plugins = [];
if (isLocal) {
  plugins.push(new PackageJsonCopyPlugin());
}

module.exports = {
  entry: slsw.lib.entries,
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js'
    // filename: 'index.js',
    // path: process.env.BUNDLE_JS_DIR ? path.resolve(process.env.BUNDLE_JS_DIR) : path.resolve(__dirname, 'dist'),
    // libraryTarget: 'umd'
  },
  node: {
    __filename: true,
    __dirname: true
  },
  target: 'node',
  externals: [
    nodeExternals({
      allowlist: ['@jclab-wp/vote-lite-common']
    })
  ],
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.(ts)$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: isLocal
          }
        }
      }
    ]
  },
  plugins: plugins,
  optimization: {
    minimize: false,
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false
  }
};
