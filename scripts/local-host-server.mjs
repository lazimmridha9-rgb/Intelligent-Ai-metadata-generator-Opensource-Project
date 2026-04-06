import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { exec } from 'node:child_process';

const ROOT = process.cwd();
const targetDir = process.argv[2] || 'dist';
const preferredPort = Number(process.argv[3] || process.env.PORT || 4173);
const maxPortAttempts = 15;
const hostDir = path.resolve(ROOT, targetDir);

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

if (!fs.existsSync(hostDir)) {
  console.error(`[ERROR] Directory not found: ${hostDir}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const requestPath = req.url || '/';
  const filePath = resolvePath(requestPath);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType
  });

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
  console.log('[NOMETA] Press Ctrl+C to stop.');
  openBrowser(url);
});

server.listen(activePort);

process.on('SIGINT', () => {
  console.log('\n[NOMETA] Server stopped.');
  server.close(() => process.exit(0));
});
