import { fileURLToPath } from 'node:url';
import rootConfig from '../../eslint.config.mjs';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default rootConfig.map((config) => ({
  ...config,
  basePath: config.basePath ?? repositoryRoot,
}));
