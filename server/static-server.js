#!/usr/bin/env node
/**
 * Minimal static file server for the built Travel M app.
 *
 * It exists for one reason: the app uses real URLs (BrowserRouter), so a request
 * for /trips/<id>/expenses must return index.html and let the client router take
 * over instead of a 404. Everything else is plain file serving.
 *
 * No dependencies. Usage: node static-server.js [port] [rootDir]
 */
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number(process.argv[2] || process.env.PORT || 8802);
const root = resolve(process.argv[3] || process.env.ROOT || new URL('./dist', import.meta.url).pathname);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), payment=()',
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function contentType(filePath) {
  return TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/** Resolves a URL path inside the root, refusing anything that escapes it. */
function resolveInside(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const candidate = join(root, normalize(decoded));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  return candidate;
}

function fileStat(path) {
  try {
    const stat = statSync(path);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
}

function send(res, status, headers = {}, filePathStream) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  if (filePathStream) {
    filePathStream.on('error', () => res.destroy());
    filePathStream.pipe(res);
  } else res.end();
}

function serveFile(req, res, filePath, stat, cacheControl) {
  const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': contentType(filePath),
    'Cache-Control': cacheControl,
    ETag: etag,
    'Last-Modified': stat.mtime.toUTCString(),
  };
  if (req.headers['if-none-match'] === etag) {
    send(res, 304, headers);
    return;
  }
  send(res, 200, { ...headers, 'Content-Length': stat.size },
    req.method === 'HEAD' ? null : createReadStream(filePath));
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    return;
  }

  const filePath = resolveInside(req.url || '/');
  if (!filePath) {
    send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  // Fingerprinted assets are immutable; the dataset and index revalidate with ETag.
  const stat = fileStat(filePath);
  if (stat) {
    const hashed = filePath.includes(`${sep}assets${sep}`);
    serveFile(req, res, filePath, stat,
      hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    return;
  }

  // Missing asset URLs must not return HTML 200, or browser cache errors follow.
  if (extname(filePath)) {
    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return;
  }

  const indexPath = join(root, 'index.html');
  const indexStat = fileStat(indexPath);
  if (!indexStat) {
    send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  // Deep SPA routes serve the HTML shell; client-side React handles 404 pages.
  serveFile(req, res, indexPath, indexStat, 'no-cache');
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`travel-m-react serving ${root} on http://127.0.0.1:${server.address().port}\n`);
});
