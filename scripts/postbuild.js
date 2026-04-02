#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_META_FILE = '.pxc-build-meta.json';
const BUILD_DIR = path.resolve(ROOT_DIR, 'build');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');
const buildMetaPath = path.resolve(ROOT_DIR, BUILD_META_FILE);

function removeEmptyParentDirs(startDir, stopDir) {
  let currentDir = startDir;
  const normalizedStopDir = path.resolve(stopDir);

  while (currentDir.startsWith(normalizedStopDir) && currentDir !== normalizedStopDir) {
    if (!fs.existsSync(currentDir)) {
      currentDir = path.dirname(currentDir);
      continue;
    }

    if (fs.readdirSync(currentDir).length > 0) {
      break;
    }

    fs.rmdirSync(currentDir);
    currentDir = path.dirname(currentDir);
  }
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error('[postbuild] ERROR: build/ does not exist. Run react-scripts build first.');
  process.exit(1);
}

if (!fs.existsSync(buildMetaPath)) {
  console.error('[postbuild] ERROR: build metadata missing. Run scripts/prebuild.js first.');
  process.exit(1);
}

const buildMeta = JSON.parse(fs.readFileSync(buildMetaPath, 'utf-8'));
const targetDir = path.resolve(ROOT_DIR, `build-${buildMeta.buildTarget}`);

fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync(BUILD_DIR, targetDir, { recursive: true });

for (const asset of buildMeta.stagedPublicAssets || []) {
  const assetPath = path.resolve(ROOT_DIR, asset.path);

  if (!asset.existedBefore && fs.existsSync(assetPath)) {
    fs.rmSync(assetPath, { force: true });
    removeEmptyParentDirs(path.dirname(assetPath), PUBLIC_DIR);
  }
}

fs.rmSync(buildMetaPath, { force: true });

console.log(`[postbuild] ✓ Copied build/ to build-${buildMeta.buildTarget}`);
console.log('[postbuild] ✓ Cleaned staged public assets');