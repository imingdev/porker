import path from 'path';
import WebpackDynamicEntryPlugin from 'webpack-dynamic-entry-plugin';
import webpack from 'webpack';
import cloneDeep from 'lodash/cloneDeep';
import WebpackBarPlugin from 'webpackbar';
import { assetsLoaders, styleLoaders } from '../utils/loaders';

const resolve = (_p) => path.join(__dirname, '..', _p);

export default class WebpackBaseConfig {
  constructor(porker) {
    this.porker = porker;
    this.options = porker.options;
  }

  get assetsPath() {
    const { porker, env, options: { dev, build: { dir, filenames } } } = this;
    const { app, chunk, css, img, font, video } = filenames || {};

    const resolvePath = (_path) => path.posix.join(dev ? dir.static : '.', _path);

    const loadFileNamePath = (name) => {
      let fileName;
      if (typeof name === 'string') fileName = resolvePath(name);
      if (typeof name === 'function') fileName = resolvePath(name(env));
      if (fileName && dev) {
        const hash = /\[(chunkhash|contenthash|hash)(?::(\d+))?]/.exec(fileName);
        if (hash) porker.logger.warn(`Notice: Please do not use ${hash[1]} in dev mode to prevent memory leak`);
      }
      return fileName;
    };

    return {
      // eslint-disable-next-line
      app: loadFileNamePath(app) || (dev ? '[name].js' : resolvePath('js/[contenthash:8].js')),
      // eslint-disable-next-line
      chunk: loadFileNamePath(chunk) || (dev ? '[name].js' : resolvePath('js/[contenthash:8].js')),
      css: loadFileNamePath(css) || (dev ? '[name].css' : resolvePath('css/[contenthash:8].css')),
      img: loadFileNamePath(img) || (dev ? '[path][name].[ext]' : resolvePath('images/[contenthash:8].[ext]')),
      font: loadFileNamePath(font) || (dev ? '[path][name].[ext]' : resolvePath('fonts/[contenthash:8].[ext]')),
      video: loadFileNamePath(video) || (dev ? '[path][name].[ext]' : resolvePath('videos/[contenthash:8].[ext]'))
    };
  }

  // eslint-disable-next-line
  get loadDefaultPages() {
    const load = (name) => require.resolve(`../client/pages/${name}`);

    return {
      _document: load('_document'),
      _app: load('_app'),
      _error: load('_error')
    };
  }

  get color() {
    const { name } = this;
    const colors = {
      client: 'green',
      server: 'orange'
    };

    return colors[name];
  }

  get dev() {
    return this.options.dev;
  }

  get env() {
    return {
      isDev: this.dev,
      isServer: this.isServer,
      isClient: this.isClient
    };
  }

  get mode() {
    return this.dev ? 'development' : 'production';
  }

  get target() {
    return this.isServer ? 'node' : 'web';
  }

  get devtool() {
    const { dev, isServer } = this;
    if (!dev || isServer) return false;

    return 'source-map';
  }

  output() {
    const { porker, options } = this;
    const { build } = options;
    return {
      path: porker.resolve.buildDir,
      publicPath: build.publicPath
    };
  }

  nodeEnv() {
    const env = {
      'process.env.NODE_ENV': JSON.stringify(this.mode),
      'process.mode': JSON.stringify(this.mode),
      'process.dev': this.dev
    };

    Object.entries(this.options.env).forEach(([key, value]) => {
      const envPrefix = 'process.env.';
      const envKey = envPrefix + key.replace(new RegExp(`^${envPrefix}`), '');
      env[envKey] = ['boolean', 'number'].includes(typeof value) ? value : JSON.stringify(value);
    });

    return env;
  }

  getBabelOptions() {
    const { name: envName, env, options } = this;
    const { babel } = options.build;

    const opt = {
      ...babel,
      envName
    };

    if (opt.configFile || opt.babelrc) return opt;

    const defaultPlugins = [
      '@babel/plugin-transform-runtime',
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-proposal-class-properties'
    ];
    if (typeof opt.plugins === 'function') opt.plugins = opt.plugins({ envName, ...env }, defaultPlugins);
    if (!opt.plugins) opt.plugins = defaultPlugins;

    const defaultPreset = [
      ['@babel/preset-env', { modules: false }],
      '@babel/preset-react'
    ];
    if (typeof opt.presets === 'function') opt.presets = opt.presets({ envName, ...env }, defaultPreset);
    if (!opt.presets) opt.presets = defaultPreset;

    return opt;
  }

  get rules() {
    const { env, porker, assetsPath } = this;

    return [{
      test: /\.(js|jsx)$/,
      loader: 'babel-loader',
      include: [
        resolve('client'),
        resolve('loaders'),
        porker.resolve.srcDir
      ],
      options: this.getBabelOptions()
    }]
      .concat(styleLoaders({
        sourceMap: env.isDev,
        extract: env.isClient
      }))
      .concat(assetsLoaders({ emitFile: env.isClient, assetsPath }));
  }

  plugins() {
    const { name, color, nodeEnv } = this;
    return [
      new WebpackDynamicEntryPlugin(),
      new WebpackBarPlugin({
        name,
        color
      }),
      new webpack.DefinePlugin(nodeEnv())
    ];
  }

  extendConfig(config) {
    const { options, env } = this;
    const { extend } = options.build;
    if (typeof extend === 'function') return extend(config, env) || config;
    return config;
  }

  config() {
    const config = {
      name: this.name,
      target: this.target,
      mode: this.mode,
      devtool: this.devtool,
      entry: this.entry(),
      output: this.output(),
      module: {
        rules: this.rules
      },
      resolve: {
        extensions: ['.js', '.jsx', '.json'],
        alias: this.options.build.alias || {}
      },
      plugins: this.plugins(),
      performance: {
        hints: false
      },
      stats: {
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false,
        entrypoints: false
      }
    };

    return cloneDeep(this.extendConfig(config));
  }
}
