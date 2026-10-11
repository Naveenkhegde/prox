'use strict';

const http = require('http');
const httpProxy = require('http-proxy');
const config = require('./config');
const dashboard = require('./dashboard');

function createProxyApp(options = {}) {
  const proxy = httpProxy.createProxyServer({
    ws: true,
    xfwd: true,
    autoRewrite: true
  });

  // Handle proxy errors (e.g. backend down / connection refused)
  proxy.on('error', (err, req, res) => {
    console.error(`[prox] Proxy error for host "${req.headers.host}":`, err.message);
    if (res && res.writeHead && !res.headersSent) {
      const rawHost = req.headers.host || '';
      const host = rawHost.split(':')[0].toLowerCase();
      const route = config.findRoute(host);
      const ip = route ? route.ip : '127.0.0.1';
      const port = route ? route.port : 'unknown';

      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboard.get502ErrorHtml(host, ip, port));
    }
  });

  // Rewrite Location redirect headers to prevent backend redirects leaking internal port/ip
  proxy.on('proxyRes', (proxyRes, req, res) => {
    const location = proxyRes.headers.location;
    if (location) {
      const rawHost = req.headers.host || '';
      const host = rawHost.split(':')[0].toLowerCase();
      const route = config.findRoute(host);
      if (route) {
        const backendOrigin = `http://${route.ip}:${route.port}`;
        if (location.startsWith(backendOrigin)) {
          proxyRes.headers.location = location.replace(backendOrigin, `http://${host}`);
        }
      }
    }
  });

  const server = http.createServer(async (req, res) => {
    const rawHost = req.headers.host || '';
    const host = rawHost.split(':')[0].toLowerCase();
    const url = new URL(req.url, `http://${rawHost || 'localhost'}`);

    // If request is directed to dashboard or proxy itself
    const isDashboardHost = (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'prox.localhost' ||
      host === 'prox.local' ||
      host === ''
    );

    if (isDashboardHost) {
      if (url.pathname.startsWith('/api/')) {
        const handled = await dashboard.handleApi(req, res, url.pathname);
        if (handled) return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const cfg = config.loadConfig();
      res.end(dashboard.getDashboardHtml(options.port || cfg.port || 80));
      return;
    }

    // Lookup matching route for the requested domain
    const route = config.findRoute(host);
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboard.get404ErrorHtml(host));
      return;
    }

    // Forward request to backend
    const targetUrl = `http://${route.ip}:${route.port}`;
    proxy.web(req, res, {
      target: targetUrl,
      changeOrigin: route.changeOrigin !== false
    });
  });

  // Handle WebSocket upgrades
  server.on('upgrade', (req, socket, head) => {
    const rawHost = req.headers.host || '';
    const host = rawHost.split(':')[0].toLowerCase();
    const route = config.findRoute(host);

    if (!route) {
      socket.destroy();
      return;
    }

    const targetWsUrl = `ws://${route.ip}:${route.port}`;
    proxy.ws(req, socket, head, {
      target: targetWsUrl,
      changeOrigin: route.changeOrigin !== false
    });
  });

  return { server, proxy };
}

function startServer(portOverride) {
  const cfg = config.loadConfig();
  const port = portOverride || process.env.PORT || cfg.port || 80;
  const { server, proxy } = createProxyApp({ port });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      reject(err);
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`[prox] Reverse proxy server listening on port ${port}`);
      console.log(`[prox] Web Dashboard: http://localhost${port === 80 ? '' : ':' + port}`);
      resolve({ server, proxy, port });
    });
  });
}

module.exports = {
  createProxyApp,
  startServer
};
