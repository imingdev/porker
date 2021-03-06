import WebpackManifestPlugin from 'webpack-manifest-plugin';

export default class ClientManifestPlugin extends WebpackManifestPlugin {
  constructor(options = {}) {
    super({
      ...options,
      fileName: options.fileName,
      generate: (seed, files, entryPoints) => Object.assign.apply(Object, Object.keys(entryPoints)
        .sort((a, b) => a.indexOf('_error') - b.indexOf('_error'))
        .map((name) => {
          const fileList = entryPoints[name].map((file) => `${options.publicPath}${file}`);

          const scripts = fileList.filter((row) => /\.js$/.test(row))
            .filter((row) => !/hot-update.js$/.test(row));

          const styles = fileList.filter((row) => /\.css$/.test(row));
          const view = `${name}.js`;

          return {
            [name]: {
              view,
              scripts,
              styles
            }
          };
        }))
    });
  }
}
