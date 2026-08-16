#!/usr/bin/env node

import { runCli } from '../src/cli.js';

const exitCode = runCli(process.argv.slice(2));
if (exitCode !== 0) {
  process.exit(exitCode);
}
