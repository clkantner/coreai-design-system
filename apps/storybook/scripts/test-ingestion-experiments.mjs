import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, STORYBOOK_INGESTION_EXPERIMENTS: 'true' };
const commands = ['npm run build', 'npm run verify:build'];
for (const command of commands) {
  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command], {
          cwd,
          env,
          stdio: 'inherit',
        })
      : spawnSync('npm', command.split(' ').slice(1), { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
