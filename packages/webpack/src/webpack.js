import pify from 'pify';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import fs from 'fs';
import MFS from 'memory-fs';
import getWebpackConfig from './config';

export default class WebpackBundle {
  constructor(porker) {
    this.porker = porker;
    this.options = porker.options;
    this.webpackConfig = getWebpackConfig(porker);

    // Initialize shared MFS for dev
    if (porker.options.dev) this.mfs = new MFS();

    this.webpackCompile = this.webpackCompile.bind(this);
    this.middleware = this.middleware.bind(this);
  }

  async build() {
    const { client, server } = this.webpackConfig;

    await Promise.all([client, server].map((c) => this.webpackCompile(webpack(c))));
  }

  async webpackCompile(compiler) {
    const { options, porker, mfs } = this;
    const { name } = compiler.options;

    // Load renderer resources after build
    compiler.hooks.done.tap('load-resources', async (stats) => {
      await porker.callHook('server:compiled', {
        name,
        compiler,
        stats
      });

      // Reload renderer
      await porker.callHook('renderer:resources', options.dev ? mfs : fs);
    });

    if (options.dev) {
      // Client Build, watch is started by dev-middleware
      if (name === 'client') {
        // In dev, write files in memory FS
        compiler.outputFileSystem = mfs;

        return new Promise((resolve) => {
          compiler.hooks.done.tap('porker-dev', () => resolve());
          return this.webpackDev(compiler);
        });
      }

      // Server, build and watch for changes
      if (name === 'server') {
        return new Promise((resolve, reject) => {
          compiler.watch(options.build.watch, (err) => {
            if (err) return reject(err);

            resolve();
          });
        });
      }
    }

    compiler.run = pify(compiler.run);
    const stats = await compiler.run();

    if (stats.hasErrors()) {
      const error = new Error('porker build error');
      error.stack = stats.toString('errors-only');
      throw error;
    }
  }

  async webpackDev(compiler) {
    const { middleware } = this;
    // Create webpack dev middleware
    this.devMiddleware = pify(
      webpackDevMiddleware(compiler, {
        stats: false,
        logLevel: 'silent',
        fs: compiler.outputFileSystem
      })
    );
    // Create webpack hot middleware
    this.hotMiddleware = pify(
      webpackHotMiddleware(compiler, {
        log: false,
        heartbeat: 10000,
        path: '/__porker__/hmr'
      })
    );

    // Register devMiddleware
    await this.porker.callHook('server:devMiddleware', middleware);
  }

  // dev middle
  async middleware(req, res, next) {
    const { devMiddleware, hotMiddleware } = this;
    if (devMiddleware) await devMiddleware(req, res);

    if (hotMiddleware) await hotMiddleware(req, res);

    next();
  }
}
