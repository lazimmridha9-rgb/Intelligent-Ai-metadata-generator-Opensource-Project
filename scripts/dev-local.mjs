import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const WATCH_ROOT = path.join(ROOT, 'src');
const GENERATED_FILES = [
  path.join('css', 'tailwind.generated.css')
];
const EXTRA_WATCH_FILES = [
  path.join(ROOT, 'scripts', 'build-vercel.mjs'),
  path.join(ROOT, 'tailwind.config.cjs'),
  path.join(ROOT, 'package.json')
];

let hostProcess = null;
let isBuilding = false;
let pendingBuild = false;
let changeTimer = null;
let shuttingDown = false;

function runShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} interrupted (${signal})`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} failed with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function buildDist() {
  if (isBuilding) {
    pendingBuild = true;
    return false;
  }

  isBuilding = true;
  let buildOk = false;
  try {
    console.log('[dev] Building dist...');
    await runShell('npm run build');
    console.log('[dev] Build complete.');
    buildOk = true;
  } catch (error) {
    console.error(`[dev] Build failed: ${error.message}`);
  } finally {
    isBuilding = false;
    if (pendingBuild && !shuttingDown) {
      pendingBuild = false;
      await buildDist();
    }
  }

  return buildOk;
}

function queueBuild() {
  if (changeTimer) {
    clearTimeout(changeTimer);
  }
  changeTimer = setTimeout(() => {
    buildDist();
    changeTimer = null;
  }, 160);
}

function startWatcher(targetPath, recursive = false) {
  try {
    return fs.watch(targetPath, { recursive }, (_eventType, filename) => {
      if (shuttingDown) return;
      if (!filename) return;
      if (filename.includes('~') || filename.endsWith('.tmp')) return;
      const normalized = filename.replace(/\//g, path.sep);
      if (GENERATED_FILES.some((generatedRelPath) => normalized.endsWith(generatedRelPath))) {
        return;
      }
      console.log(`[dev] Change detected: ${filename}`);
      queueBuild();
    });
  } catch (error) {
    console.warn(`[dev] Watch unavailable for ${targetPath}: ${error.message}`);
    return null;
  }
}

function startHost() {
  hostProcess = spawn(process.execPath, [
    path.join(ROOT, 'scripts', 'local-host-server.mjs'),
    'dist',
    '4173',
    '--live'
  ], { stdio: 'inherit' });

  hostProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.log(`[dev] host stopped (${signal})`);
      shutdown(1);
      return;
    }
    if (code !== 0) {
      console.error(`[dev] host failed with code ${code}`);
      shutdown(code || 1);
    }
  });
}

function shutdown(exitCode = 0) {
  shuttingDown = true;
  if (changeTimer) {
    clearTimeout(changeTimer);
    changeTimer = null;
  }
  if (hostProcess && !hostProcess.killed) {
    hostProcess.kill('SIGINT');
  }
  setTimeout(() => process.exit(exitCode), 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev] Starting full dev pipeline (src watch -> dist build -> dist live host)...');
const bootBuildOk = await buildDist();
if (!bootBuildOk) {
  console.error('[dev] Initial dist sync build failed. Local host was not started to avoid mismatch between src and dist.');
  process.exit(1);
}
startHost();

const watchers = [];
watchers.push(startWatcher(WATCH_ROOT, true));
for (const file of EXTRA_WATCH_FILES) {
  const parent = path.dirname(file);
  const base = path.basename(file);
  const watcher = fs.watch(parent, { recursive: false }, (_eventType, filename) => {
    if (shuttingDown) return;
    if (!filename) return;
    if (filename !== base) return;
    console.log(`[dev] Config changed: ${filename}`);
    queueBuild();
  });
  watchers.push(watcher);
}
