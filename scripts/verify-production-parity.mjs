import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// This is a minimum production-feature inventory guard, not a full source diff.
// Do not remove entries to make an incomplete recovery pass.
const required = [
  'src/App.jsx',
  'src/Inventory.jsx',
  'src/Schedule.jsx',
  'src/WorkOrder.jsx',
  'src/Organization.jsx',
  'src/organization.css',
  'public/via-lock-logo.svg',
];

const missing = required.filter((path) => {
  const full = resolve(process.cwd(), path);
  return !existsSync(full) || !statSync(full).isFile() || statSync(full).size === 0;
});

if (missing.length) {
  console.error('VIA LOCK PRODUCTION PARITY BLOCKED: required production files are missing or empty:');
  for (const path of missing) console.error(` - ${path}`);
  console.error('Recover the original production files and verify their contents before any production release.');
  process.exitCode = 1;
} else {
  console.log('Minimum production file inventory present. Full feature parity still requires source diff and end-to-end tests.');
}