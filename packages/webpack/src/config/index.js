import WebpackClientConfig from './client';
import WebpackServerConfig from './server';

export default (porker) => ({
  client: (new WebpackClientConfig(porker)).config(),
  server: (new WebpackServerConfig(porker)).config()
});
