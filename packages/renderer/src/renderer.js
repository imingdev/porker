import fs from 'fs';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { Helmet } from 'react-helmet';

export default class Renderer {
  constructor(porker) {
    this.porker = porker;
    this.options = porker.options;

    this.resources = {};

    this.loadResources = this.loadResources.bind(this);
    this.render = this.render.bind(this);
    this.createReactElement = this.createReactElement.bind(this);
    this.requireReactElement = this.requireReactElement.bind(this);
    this.renderReactToString = this.renderReactToString.bind(this);
    this.renderReactToStaticMarkup = this.renderReactToStaticMarkup.bind(this);
  }

  async ready() {
    const { _readyCalled, porker, options, loadResources } = this;
    if (_readyCalled) return this;
    this._readyCalled = true;

    // -- Development mode --
    if (options.dev) {
      porker.hook('renderer:resources', (mfs) => loadResources(mfs));
      return;
    }

    // -- Production mode --

    // Try once to load SSR resources from fs
    await loadResources(fs);

    return this;
  }

  loadResources(_fs) {
    const { porker } = this;

    let result = {};

    try {
      const fullPath = porker.resolve.build(porker.resolve.buildManifest);

      if (!_fs.existsSync(fullPath)) return result;

      const contents = _fs.readFileSync(fullPath, 'utf-8');

      result = JSON.parse(contents) || {};
    } catch (err) {
      porker.logger.error('Unable to load resource:', err);
    }

    return result;
  }

  requireReactElement(viewName) {
    const { porker } = this;
    const { default: Component, getServerSideProps } = porker.require.buildServer(`${viewName}.js`);

    return {
      Component,
      getServerSideProps
    };
  }

  createReactElement(Component, locals) {
    return React.createElement(Component, locals);
  }

  renderReactToString(Component, locals) {
    const { createReactElement } = this;

    return ReactDOMServer.renderToString(createReactElement(Component, locals));
  }

  renderReactToStaticMarkup(Component, locals) {
    const { createReactElement } = this;

    return ReactDOMServer.renderToStaticMarkup(createReactElement(Component, locals));
  }

  async render(view, context) {
    const {
      options,
      resources,
      requireReactElement,
      renderReactToString,
      renderReactToStaticMarkup
    } = this;
    if (!resources[view]) view = '_error';
    const { scripts, styles } = resources[view];

    const { Component: Document } = requireReactElement('_document');
    const { Component: App, getServerSideProps: getAppServerSideProps } = requireReactElement('_app');
    const { Component, getServerSideProps } = requireReactElement(view);

    let state;
    if (getAppServerSideProps && typeof getAppServerSideProps === 'function') {
      state = await getAppServerSideProps(context);
    }
    if (getServerSideProps && typeof getServerSideProps === 'function') {
      const pageState = await getServerSideProps(context);
      if (state || pageState) {
        state = { ...state || {}, ...pageState || {} };
      } else {
        state = pageState;
      }
    }

    // body
    const body = renderReactToString(App, {
      pageProps: state,
      Component
    });

    // helmet
    const helmet = Helmet.renderStatic();

    // document(body, pageScripts, pageStyles, state, helmet, context, id)
    const content = renderReactToStaticMarkup(Document, {
      body,
      pageScripts: scripts,
      pageStyles: styles,
      state,
      helmet,
      context: options.globals.context,
      id: options.globals.id
    });

    return `<!doctype html>${content}`;
  }
}
