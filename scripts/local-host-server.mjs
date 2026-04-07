import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { exec } from 'node:child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const targetDir = args[0] || 'dist';
const preferredPort = Number(args[1] || process.env.PORT || 4173);
const liveMode = args.includes('--live');
const strictPort = args.includes('--strict-port');
const maxPortAttempts = 15;
const hostDir = path.resolve(ROOT, targetDir);
const liveClients = new Set();
let changeBroadcastTimer = null;
let directoryWatcher = null;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
};

const LIVE_RELOAD_CLIENT = `
<script>
(() => {
  const source = new EventSource('/__live_reload');
  source.addEventListener('reload', () => window.location.reload());
})();
</script>
`;

function openBrowser(url) {
  const platform = process.platform;
  if (platform === 'win32') {
    exec(`start "" "${url}"`);
    return;
  }
  if (platform === 'darwin') {
    exec(`open "${url}"`);
    return;
  }
  exec(`xdg-open "${url}"`);
}

function resolvePath(urlPathname) {
  const clean = decodeURIComponent(urlPathname.split('?')[0]);
  const requested = clean === '/' ? '/index.html' : clean;
  const fullPath = path.resolve(hostDir, `.${requested}`);

  if (!fullPath.startsWith(hostDir)) {
    return null;
  }

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return fullPath;
  }

  const asDirIndex = path.join(fullPath, 'index.html');
  if (fs.existsSync(asDirIndex) && fs.statSync(asDirIndex).isFile()) {
    return asDirIndex;
  }

  return null;
}

function setNoCacheHeaders(res, contentType) {
  res.writeHead(200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    'Content-Type': contentType
  });
}

function injectLiveReload(html) {
  if (!liveMode) {
    return html;
  }

  if (html.includes('/__live_reload')) {
    return html;
  }

  if (html.includes('</body>')) {
    return html.replace('</body>', `${LIVE_RELOAD_CLIENT}\n</body>`);
  }

  return `${html}\n${LIVE_RELOAD_CLIENT}`;
}

function broadcastReload() {
  for (const client of liveClients) {
    client.write('event: reload\n');
    client.write(`data: ${Date.now()}\n\n`);
  }
}

function queueReload() {
  if (!liveMode) {
    return;
  }

  if (changeBroadcastTimer) {
    clearTimeout(changeBroadcastTimer);
  }

  changeBroadcastTimer = setTimeout(() => {
    broadcastReload();
    changeBroadcastTimer = null;
  }, 120);
}

function setupWatcher() {
  if (!liveMode) {
    return;
  }

  const startWatch = () => {
    try {
      if (directoryWatcher) {
        directoryWatcher.close();
      }

      directoryWatcher = fs.watch(hostDir, { recursive: true }, (eventType, filename) => {
        if (!filename) {
          return;
        }
        console.log(`[NOMETA] Change detected (${eventType}): ${filename}`);
        queueReload();
      });

      directoryWatcher.on('error', (error) => {
        console.warn(`[NOMETA] Watcher error: ${error.message}. Reconnecting...`);
        setTimeout(startWatch, 400);
      });
    } catch (error) {
      console.warn(`[NOMETA] Live watcher unavailable: ${error.message}. Retrying...`);
      setTimeout(startWatch, 1000);
    }
  };

  startWatch();
}

function cleanupWatcher() {
  if (directoryWatcher) {
    try {
      directoryWatcher.close();
    } catch {
      // ignore close errors on shutdown
    }
    directoryWatcher = null;
  }
}

if (!fs.existsSync(hostDir)) {
  console.error(`[ERROR] Directory not found: ${hostDir}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const requestPath = req.url || '/';
  if (liveMode && requestPath.startsWith('/__live_reload')) {
    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 800\n\n');
    liveClients.add(res);
    req.on('close', () => liveClients.delete(res));
    return;
  }

  const filePath = resolvePath(requestPath);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  if (ext === '.html') {
    fs.readFile(filePath, 'utf8', (error, html) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }

      setNoCacheHeaders(res, contentType);
      res.end(injectLiveReload(html));
    });
    return;
  }

  setNoCacheHeaders(res, contentType);
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
  });
  stream.pipe(res);
});

let activePort = preferredPort;

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    if (strictPort) {
      console.error(`[ERROR] Port ${preferredPort} is already in use.`);
      process.exit(1);
    }

    const upperLimit = preferredPort + maxPortAttempts;
    if (activePort >= upperLimit) {
      console.error(`[ERROR] No free port found in range ${preferredPort}-${upperLimit}.`);
      process.exit(1);
    }
    activePort += 1;
    console.warn(`[NOMETA] Port busy. Retrying on ${activePort}...`);
    server.listen(activePort);
    return;
  }

  console.error(`[ERROR] Failed to start server: ${error.message}`);
  process.exit(1);
});

server.on('listening', () => {
  const url = `http://localhost:${activePort}`;
  console.log(`[NOMETA] Hosting folder: ${hostDir}`);
  console.log(`[NOMETA] Local URL: ${url}`);
  if (liveMode) {
    console.log('[NOMETA] Live reload: enabled');
  }
  console.log('[NOMETA] Press Ctrl+C to stop.');
  openBrowser(url);
});

server.listen(activePort);
setupWatcher();

process.on('SIGINT', () => {
  console.log('\n[NOMETA] Server stopped.');
  cleanupWatcher();
  server.close(() => process.exit(0));
});
