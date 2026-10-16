import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve(import.meta.dirname, 'verify-production-parity.mjs');
const required = [
  'src/App.jsx', 'src/Inventory.jsx', 'src/Schedule.jsx',
  'src/WorkOrder.jsx', 'src/Organization.jsx',
  'src/organization.css', 'public/via-lock-logo.webp',
];

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'vialock-parity-'));
  for (const path of required) {
    const dest = join(dir, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, 'fixture');
  }
  return dir;
}

test('complete production file inventory passes', () => {
  const dir = fixture();
  try {
    const result = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('missing organization module blocks release', () => {
  const dir = fixture();
  try {
    rmSync(join(dir, 'src/Organization.jsx'));
    const result = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /src\\/Organization\\.jsx/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('empty logo blocks release', () => {
  const dir = fixture();
  try {
    writeFileSync(join(dir, 'public/via-lock-logo.webp'), '');
    const result = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /public\\/via-lock-logo\\.webp/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});