/**
 * SMM Panel — API Proxy Server
 * Ready for Railway deployment
 */

const http  = require('http');
const https = require('https');
const url   = require('url');

// Railway injects PORT automatically
const PORT = process.env.PORT || 3000;

// Your Netlify site — update this to your real domain
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://tubular-youtiao-50c94ef.netlify.app';

const server = http.createServer((req, res) => {

  // ── CORS — only allow your Netlify site ──
  res.setHeader('Access-Control-Allow-Origin',  ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const parsed = url.parse(req.url, true);

  // ── Health check ──
  if (parsed.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'SMM proxy running on Railway' }));
    return;
  }

  // ── API Proxy ──
  if (req.method === 'POST' && parsed.pathname === '/proxy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {

      let params;
      try { params = JSON.parse(body); }
      catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }

      const { endpoint, key, action, service, link, quantity } = params;

      if (!endpoint || !key) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing endpoint or key' }));
        return;
      }

      const postData = new URLSearchParams({
        key, action: action || 'add', service, link, quantity
      }).toString();

      let targetUrl;
      try { targetUrl = new URL(endpoint); }
      catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid endpoint URL' }));
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

      console.log(`[${new Date().toLocaleTimeString()}] → ${targetUrl.hostname} svc:${service} qty:${quantity}`);

      const proxyReq = lib.request(options, proxyRes => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            console.log(`[${new Date().toLocaleTimeString()}] ← ${proxyRes.statusCode} ${JSON.stringify(json).slice(0,100)}`);
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(json));
          } catch(e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API returned non-JSON', raw: data.slice(0, 500) }));
          }
        });
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API timed out after 30s' }));
      });

      proxyReq.on('error', err => {
        console.error(`[${new Date().toLocaleTimeString()}] ✗ ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });

      proxyReq.write(postData);
      proxyReq.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`SMM Proxy running on port ${PORT}`);
  console.log(`Accepting requests from: ${ALLOWED_ORIGIN}`);
});
