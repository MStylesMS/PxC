#!/usr/bin/env node

/**
 * Build a PxC clock outside the shared checkout.
 *
 *   node scripts/build-clock.js --ini <file> --out <dir> [--prebuild-only]
 *
 * Copies sources to a temp directory, symlinks node_modules, and runs prebuild
 * there. Without --prebuild-only it then runs react-scripts with BUILD_PATH
 * pointed at --out. The shared apps/PxC tree is not written.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) return null;
  return process.argv[index + 1];
}

const iniFile = arg('--ini');
const outDir = arg('--out');
const prebuildOnly = process.argv.includes('--prebuild-only');

if (!iniFile || !outDir) {
  console.error('Usage: node scripts/build-clock.js --ini <file> --out <dir> [--prebuild-only]');
  process.exit(1);
}

const iniPath = path.resolve(iniFile);
const outputPath = path.resolve(outDir);
if (!fs.existsSync(iniPath)) {
  console.error(`[build-clock] INI not found: ${iniPath}`);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-build-'));
const copyNames = ['src', 'public', 'scripts', 'config', 'assets', 'package.json', 'package-lock.json'];
let exitCode = 0;

try {
  copyNames.forEach((name) => {
    const from = path.join(ROOT, name);
    if (!fs.existsSync(from)) return;
    fs.cpSync(from, path.join(tmp, name), { recursive: true });
  });

  const modules = path.join(ROOT, 'node_modules');
  if (!fs.existsSync(modules)) {
    throw new Error('node_modules is missing in apps/PxC');
  }
  fs.symlinkSync(modules, path.join(tmp, 'node_modules'));

  const prebuild = spawnSync(process.execPath, ['scripts/prebuild.js', iniPath], {
    cwd: tmp,
    stdio: 'inherit',
  });
  if (prebuild.status !== 0) {
    exitCode = prebuild.status || 1;
  } else if (!prebuildOnly) {
    fs.mkdirSync(outputPath, { recursive: true });
    const build = spawnSync('npx', ['react-scripts', 'build'], {
      cwd: tmp,
      stdio: 'inherit',
      env: { ...process.env, BUILD_PATH: outputPath, CI: 'true' },
    });
    if (build.status !== 0) exitCode = build.status || 1;
    else console.log(`[build-clock] Wrote ${outputPath}`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

process.exit(exitCode);
