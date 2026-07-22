import { spawnSync } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const args = rawArgs.filter((arg) => arg !== '--' && arg !== '--run');

const vitestArgs = ['run', '--config', 'config/vitest.config.ts', ...args];
const result = spawnSync('vitest', vitestArgs, { stdio: 'inherit' });

process.exit(result.status ?? 1);