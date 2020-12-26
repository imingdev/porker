export default class Require {
  constructor(porker) {
    this.porker = porker;
    this.options = porker.options;

    this.root = this.root.bind(this);
    this.src = this.src.bind(this);
    this.page = this.page.bind(this);
    this.build = this.build.bind(this);
    this.buildServer = this.buildServer.bind(this);
  }

  root(...p) {
    const { porker, options } = this;
    const { resolve } = porker;

    const filePath = resolve.root.apply(resolve, p);
    if (options.dev) delete require.cache[filePath];

    return require(filePath);
  }

  src(p) {
    const { root, options } = this;

    return root(options.dir.src, p);
  }

  page(p) {
    const { src, options } = this;

    return src(options.dir.page, p);
  }

  build(p) {
    const { root, options } = this;
    return root(options.dir.build, p);
  }

  buildServer(p) {
    const { build, options } = this;

    return build(options.build.dir.server, p);
  }
}
