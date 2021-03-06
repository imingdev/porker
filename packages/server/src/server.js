import { sep } from 'path';
import serveStatic from 'serve-static';
import connect from 'connect';
import Renderer from '@porker/renderer';
import Regexp from 'path-to-regexp';
import porkerMiddleware from './middleware/porker';

export default class Server {
  constructor(porker) {
    this.porker = porker;
    this.options = porker.options;
    this.app = connect();

    this.renderer = new Renderer(this);

    // devMiddleware placeholder
    if (porker.options.dev) {
      porker.hook('server:devMiddleware', (devMiddleware) => {
        this.devMiddleware = devMiddleware;
      });
    }

    this.compileRouteRegex = this.compileRouteRegex.bind(this);
    this.setupMiddleware = this.setupMiddleware.bind(this);
    this.useMiddleware = this.useMiddleware.bind(this);
  }

  async ready() {
    const { _readyCalled, renderer, setupMiddleware } = this;
    if (_readyCalled) return this;
    this._readyCalled = true;

    await renderer.ready();

    // Setup nuxt middleware
    await setupMiddleware();

    return this;
  }

  compileRouteRegex(name, pathToRegexpOptions) {
    let _path;
    if (name === '_error') {
      _path = '*';
    } else if (name === 'index') {
      _path = '/';
    } else {
      const normalUrl = name
        .split(sep)
        .filter(Boolean)
        .join('/')
        .replace(new RegExp('/index$'), '')
        .replace(/_/g, ':');
      _path = `/${normalUrl}`;
    }
    return Regexp(_path, [], {
      sensitive: false,
      strict: false,
      end: true,
      delimiter: '/',
      ...pathToRegexpOptions
    });
  }

  setupMiddleware() {
    const { porker, options, useMiddleware, renderer } = this;
    const { dev, server, build } = options;
    const { compressor } = server || {};

    if (!dev) {
      // gzip
      if (typeof compressor === 'object') {
        // If only setting for `compression` are provided, require the module and insert
        const compression = require('compression');
        useMiddleware(compression(compressor));
      } else if (compressor) {
        // Else, require own compression middleware if compressor is actually truthy
        useMiddleware(compressor);
      }

      if (!build.publicPath.startsWith('http')) {
        // static
        const staticMiddleware = serveStatic(porker.resolve.buildStaticDir);
        useMiddleware({ route: `/${build.dir.static}`, handle: staticMiddleware });
      }
    }

    // Dev middleware
    if (dev) {
      useMiddleware((req, res, next) => {
        const { devMiddleware } = this;
        if (!devMiddleware) return next();

        devMiddleware(req, res, next);
      });
    }

    // Finally use router middleware
    useMiddleware(porkerMiddleware({
      options,
      porker,
      renderer
    }));
  }

  useMiddleware(middleware) {
    const { app } = this;

    if (typeof middleware === 'object') {
      app.use(middleware.route = '/', middleware.handle);
      return;
    }

    app.use(middleware);
  }
}
