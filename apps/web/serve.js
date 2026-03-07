import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST_DIR = '/app/dist';
const PORT = parseInt(process.env.PORT || '8080', 10);
const PUBLIC_SERVER_ORIGIN = (() => {
  try {
    return process.env.PUBLIC_SERVER_URL
      ? new URL(process.env.PUBLIC_SERVER_URL).origin
      : null;
  } catch {
    return null;
  }
})();

const MIME_TYPES = /** @type {const} */ ({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
});

const indexHtml = await readFile(join(DIST_DIR, 'index.html'));
const connectSrc = ["'self'"];

if (PUBLIC_SERVER_ORIGIN) {
  connectSrc.push(PUBLIC_SERVER_ORIGIN);
}

connectSrc.push('https:', 'wss:');

const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' https: blob:",
    `connect-src ${connectSrc.join(' ')}`,
    "form-action 'self'",
  ].join('; '),
});

function withSecurityHeaders(headers = {}) {
  return { ...SECURITY_HEADERS, ...headers };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/healthcheck') {
    res.writeHead(200, withSecurityHeaders({ 'Content-Type': 'text/plain' }));
    return res.end('ok');
  }

  // Try to serve the requested file
  const filePath = join(DIST_DIR, url.pathname);
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
      const headers = withSecurityHeaders({ 'Content-Type': contentType });

      // Immutable caching for hashed assets (Vite output in /assets/)
      if (url.pathname.startsWith('/assets/')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      }

      const content = await readFile(filePath);
      res.writeHead(200, headers);
      return res.end(content);
    }
  } catch {
    // File not found — fall through to SPA fallback
  }

  // SPA fallback — serve index.html for all unmatched routes
  res.writeHead(
    200,
    withSecurityHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }),
  );
  res.end(indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving on port ${PORT}`);
});
