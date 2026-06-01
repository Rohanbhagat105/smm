/**
 * SMM Panel — API Proxy Server
 * Ready for Railway deployment
 */

const http  = require('http');
const https = require('https');
const url   = require('url');

// Railway injects PORT automatically
const PORT = process.env.PORT || 3000;

// Fallback origin if environment variable is not explicitly set
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://tubular-youtiao-50c94ef.netlify.app';

const server = http.createServer((req, res) => {

  // ── CORS Settings ──
  // Cleans up any trailing slashes from the origin comparison to avoid CORS blocks
  const origin = req.headers.origin || '';
  const cleanAllowed = ALLOWED_ORIGIN.replace(/\/$/, '');
  
  if (origin === cleanAllowed || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || cleanAllowed);
  } else {
    res.setHeader('Access-Control-Allow-Origin', cleanAllowed);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight options check instantly
  if (req.method === 'OPTIONS') {
    res.writeHead(204); 
    res.end(); 
    return;
  }

  const parsed = url.parse(req.url, true);
  const normalizedPath = parsed.pathname.replace(/\/$/, ''); // strip trailing slash

  // ── Health Checks (Fixes the dashboard status bug) ──
  if (normalizedPath === '/health' || normalizedPath === '/proxy/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'SMM proxy running seamlessly on Railway' }));
    return;
  }

  // ── API Proxy Core Engine ──
  if (req.method === 'POST' && normalizedPath === '/proxy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {

      let params;
      try { params = JSON.parse(body); }
      catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body structure' }));
        return;
      }

      const { endpoint, key, action, service, link, quantity } = params;

      if (!endpoint || !key) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing endpoint target or API key identifier' }));
        return;
      }

      // Format payload payload to match x-www-form-urlencoded format required by SMM panels
      const postData = new URLSearchParams({
        key, action: action || 'add', service, link, quantity
      }).toString();

      let targetUrl;
      try { targetUrl = new URL(endpoint); }
      catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid endpoint target URL string provided' }));
        return;
      }

      const isHttps = targetUrl.protocol === 'https:';
      const lib     = isHttps ? https : http;

      const options = {
        hostname: targetUrl.hostname,
        port:     targetUrl.port || (isHttps ? 443 : 80),
        path:     targetUrl.pathname + (targetUrl.search || ''),
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent':     'SMM-Panel-Proxy/1.0',
        },
        timeout: 30000,
      };

      console.log(`[${new Date().toLocaleTimeString()}] → Relaying to ${targetUrl.hostname} | Svc ID: ${service} | Qty: ${quantity}`);

      const proxyReq = lib.request(options, proxyRes => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            console.log(`[${new Date().toLocaleTimeString()}] ← Response Received [${proxyRes.statusCode}]: ${JSON.stringify(json).slice(0, 100)}...`);
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(json));
          } catch(e) {
            // Graceful non-JSON output fallback handling
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'SMM Provider API returned non-JSON structure', raw: data.slice(0, 500) }));
          }
        });
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream gateway API timed out after 30s threshold' }));
      });

      proxyReq.on('error', err => {
        console.error(`[${new Date().toLocaleTimeString()}] ✗ Transport Error: ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });

      proxyReq.write(postData);
      proxyReq.end();
    });
    return;
  }

  // Fallback Catchall 404 handler
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Requested routing route not found' }));
});

server.listen(PORT, () => {
  console.log(`SMM Proxy engine running stably on port ${PORT}`);
  console.log(`Secured connection whitelist restricted to: ${ALLOWED_ORIGIN}`);
});