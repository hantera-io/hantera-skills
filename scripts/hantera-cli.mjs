#!/usr/bin/env node
// Starts a Hantera CLI command (`mcp` or `lsp`) for the Claude Code plugin.
//
// By default it runs the published CLI through npx, so users only need Node.js.
// Set HANTERA_CLI to a local CLI entry point (for example <repo>/cli/dist/index.js)
// to use a development build instead.
//
// A launcher is needed because Claude Code starts plugin servers without a shell,
// and on Windows npx is a .cmd script that can't be started that way.

import {spawn} from 'node:child_process';

const args = process.argv.slice(2);
const localCli = process.env.HANTERA_CLI;
const isWindows = process.platform === 'win32';

const child = localCli
  ? spawn(process.execPath, [localCli, ...args], { stdio: 'inherit' })
  : spawn(isWindows ? 'npx.cmd' : 'npx', ['--yes', '@hantera/cli@latest', ...args], {
      stdio: 'inherit',
      // Node refuses to start .cmd files without a shell.
      shell: isWindows,
    });

child.on('error', (error) => {
  process.stderr.write(`Could not start the Hantera CLI: ${error.message}\n`);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
