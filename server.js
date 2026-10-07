/**
 * OEE Report Portal - Standalone Zero-Dependency Web Server
 * Built with Node.js standard library (http, fs, path, url, crypto)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');
const { exec } = require('node:child_process');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // Binds securely to localhost
const BASE_DIR = __dirname;
const DATA_FILE = path.join(BASE_DIR, 'data.json');

// MIME types for permitted web assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip'
};

// Strict list of files allowed to be served statically
const ALLOWED_STATIC_FILES = new Set([
  'index.html',
  'style.css',
  'app.js',
  'data.json',
  'favicon.svg',
  'README.md',
  'oee-report-github.zip'
]);

/**
 * Standard Security Headers
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.google-analytics.com; connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://*.google-analytics.com https://*.firebasestorage.app; script-src 'self' 'unsafe-inline' https://www.gstatic.com; frame-ancestors 'self';"
  );
}

/**
 * Hash password with SHA-256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password).trim()).digest('hex');
}

/**
 * Validate HTTP/HTTPS URLs
 */
function isValidHttpUrl(string) {
  if (!string || typeof string !== 'string') return false;
  const trimmed = string.trim();
  if (trimmed === '') return true; // empty allowed
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Sanitize plain string input
 */
function sanitizeString(str, maxLength = 250) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

/**
 * Read current data file
 */
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading data.json:', err.message);
  }

  // Fallback defaults with hashed 'admin123'
  return {
    portalTitle: 'OEE Report',
    portalSubtitle: 'Centralized Operational Equipment Effectiveness Reports & Logs',
    openInNewTab: true,
    adminPasswordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    lastPublished: new Date().toISOString(),
    reports: {
      anwar: {
        id: 'anwar',
        name: 'Anwar',
        title: "Anwar's OEE Report",
        department: 'Production & Efficiency',
        description: 'Daily production rates, line availability, and machine efficiency logs.',
        url: '',
        notes: 'Primary tracking sheet managed by Anwar',
        updatedAt: new Date().toISOString()
      },
      monir: {
        id: 'monir',
        name: 'Monir',
        title: "Monir's OEE Report",
        department: 'Maintenance & Downtime',
        description: 'Machine breakdown analysis, speed loss records, and operational quality data.',
        url: '',
        notes: 'Primary tracking sheet managed by Monir',
        updatedAt: new Date().toISOString()
      }
    }
  };
}

/**
 * Write updated data to data.json
 */
function writeData(newData) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2), 'utf-8');
}

/**
 * Main HTTP Server
 */
const server = http.createServer((req, res) => {
  setSecurityHeaders(res);

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (!['GET', 'POST', 'OPTIONS'].includes(method)) {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': `http://127.0.0.1:${PORT}`,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password'
    });
    res.end();
    return;
  }

  // Health check
  if (pathname === '/api/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Password verification endpoint
  if (pathname === '/api/verify-password' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const data = readData();
        const inputHash = hashPassword(payload.password || '');
        const valid = inputHash === data.adminPasswordHash;
        if (valid) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Password verified' }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Incorrect password' }));
        }
      } catch (_) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // API: Get reports data
  if (pathname === '/api/reports' && method === 'GET') {
    const currentData = readData();
    // Return data without leaking password hash directly in API response
    const safeData = {
      ...currentData,
      hasPassword: Boolean(currentData.adminPasswordHash)
    };
    // Include hash so client-side static mode can verify locally if needed
    safeData.adminPasswordHash = currentData.adminPasswordHash;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(JSON.stringify(safeData));
    return;
  }

  // API: Update reports & publish links
  if (pathname === '/api/reports' && method === 'POST') {
    let body = '';
    const MAX_BODY_SIZE = 1024 * 64; // 64 KB

    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const existingData = readData();

        // Verify Admin Password
        const inputPass = payload.adminPassword || req.headers['x-admin-password'] || '';
        const inputHash = hashPassword(inputPass);

        if (existingData.adminPasswordHash && inputHash !== existingData.adminPasswordHash) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Incorrect admin password. Changes not authorized.' }));
          return;
        }

        // Validate URLs
        const anwarUrl = payload.reports?.anwar?.url || '';
        const monirUrl = payload.reports?.monir?.url || '';

        if (!isValidHttpUrl(anwarUrl)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Invalid URL for Anwar's Report. Must start with http:// or https://" }));
          return;
        }

        if (!isValidHttpUrl(monirUrl)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Invalid URL for Monir's Report. Must start with http:// or https://" }));
          return;
        }

        const now = new Date().toISOString();

        // Handle password change request if provided
        let newPasswordHash = existingData.adminPasswordHash;
        if (payload.newPassword && typeof payload.newPassword === 'string' && payload.newPassword.trim().length >= 4) {
          newPasswordHash = hashPassword(payload.newPassword);
        }

        const updated = {
          portalTitle: sanitizeString(payload.portalTitle || existingData.portalTitle, 80),
          portalSubtitle: sanitizeString(payload.portalSubtitle || existingData.portalSubtitle, 160),
          openInNewTab: payload.openInNewTab !== false,
          adminPasswordHash: newPasswordHash,
          lastPublished: now,
          reports: {
            anwar: {
              id: 'anwar',
              name: 'Anwar',
              title: sanitizeString(payload.reports?.anwar?.title || existingData.reports.anwar.title, 100),
              department: sanitizeString(payload.reports?.anwar?.department || existingData.reports.anwar.department, 100),
              description: sanitizeString(payload.reports?.anwar?.description || existingData.reports.anwar.description, 300),
              url: sanitizeString(anwarUrl, 1000),
              notes: sanitizeString(payload.reports?.anwar?.notes || existingData.reports.anwar.notes, 200),
              updatedAt: now
            },
            monir: {
              id: 'monir',
              name: 'Monir',
              title: sanitizeString(payload.reports?.monir?.title || existingData.reports.monir.title, 100),
              department: sanitizeString(payload.reports?.monir?.department || existingData.reports.monir.department, 100),
              description: sanitizeString(payload.reports?.monir?.description || existingData.reports.monir.description, 300),
              url: sanitizeString(monirUrl, 1000),
              notes: sanitizeString(payload.reports?.monir?.notes || existingData.reports.monir.notes, 200),
              updatedAt: now
            }
          }
        };

        writeData(updated);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Links and settings published successfully!',
          data: updated,
          passwordChanged: newPasswordHash !== existingData.adminPasswordHash
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON request payload' }));
      }
    });
    return;
  }

  // Static File Serving
  let requestedFile = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  
  // Enforce allowed static files whitelist
  if (!ALLOWED_STATIC_FILES.has(requestedFile)) {
    requestedFile = 'index.html';
  }

  const resolvedPath = path.join(BASE_DIR, requestedFile);

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(resolvedPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`  OEE Report Portal is running at: http://${HOST}:${PORT}`);
  console.log(`  Local URL:                      http://localhost:${PORT}`);
  console.log(`  Default Admin Password:         admin123`);
  console.log(`=======================================================`);
});
