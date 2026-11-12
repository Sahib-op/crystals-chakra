import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { start } from './start.ts';
export { createApp } from './app.ts';
export { validBirthDate } from './validation.js';

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  start().catch(() => {
    // Startup exceptions may contain provider details; keep console output bounded.
    console.error('API startup failed. Check server configuration.');
    process.exitCode = 1;
  });
}
