'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');

// Use temporary config and hosts paths for test isolation
const TEST_CONFIG_PATH = '/tmp/prox_test_routes.json';
const TEST_HOSTS_PATH = '/tmp/prox_test_hosts';

process.env.PROX_CONFIG_PATH = TEST_CONFIG_PATH;
process.env.PROX_HOSTS_PATH = TEST_HOSTS_PATH;

const config = require('../lib/config');
const hosts = require('../lib/hosts');
const proxy = require('../lib/proxy');
const health = require('../lib/health');

function makeRequest({ port, path = '/', hostHeader, method = 'GET', body = null }) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (hostHeader) headers['host'] = hostHeader;
    if (body) {
      headers['content-type'] = 'application/json';
      headers['content-length'] = Buffer.byteLength(body);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers,
      agent: false
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('Prox Reverse Proxy Test Suite', async (t) => {
  // Clean up any existing temp files
  if (fs.existsSync(TEST_CONFIG_PATH)) fs.unlinkSync(TEST_CONFIG_PATH);
  fs.writeFileSync(TEST_HOSTS_PATH, '127.0.0.1 localhost\n', 'utf8');

  // 1. Setup Backend 1 (local 127.0.0.1)
  const backend1 = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Received-Host': req.headers.host || '',
      'X-Forwarded-For': req.headers['x-forwarded-for'] || ''
    });
    res.end(JSON.stringify({ message: 'Hello from Backend 1', url: req.url }));
  });

  await new Promise(resolve => backend1.listen(9101, '127.0.0.1', resolve));

  // 2. Setup Backend 2 (custom IP on loopback 127.0.0.2)
  const backend2 = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello from Backend 2 on 127.0.0.2');
  });

  await new Promise(resolve => backend2.listen(9102, '127.0.0.2', resolve));

  // 3. Setup Prox on port 9180
  const { server: proxServer, proxy: proxyInstance } = proxy.createProxyApp({ port: 9180 });
  await new Promise(resolve => proxServer.listen(9180, '127.0.0.1', resolve));

  t.after(() => {
    proxServer.close();
    proxyInstance.close();
    backend1.close();
    backend2.close();
    if (fs.existsSync(TEST_CONFIG_PATH)) fs.unlinkSync(TEST_CONFIG_PATH);
    if (fs.existsSync(TEST_HOSTS_PATH)) fs.unlinkSync(TEST_HOSTS_PATH);
  });

  await t.test('Health check accurately detects online and offline servers', async () => {
    const is9101Online = await health.checkTargetHealth('127.0.0.1', 9101);
    assert.strictEqual(is9101Online, true, 'Backend 1 should be online');

    const is9999Online = await health.checkTargetHealth('127.0.0.1', 9999);
    assert.strictEqual(is9999Online, false, 'Unused port 9999 should be offline');
  });

  await t.test('Routes can be added and saved to config', () => {
    const r1 = config.addRoute({ domain: 'app1.test', port: 9101, ip: '127.0.0.1', description: 'App 1' });
    assert.strictEqual(r1.domain, 'app1.test');
    assert.strictEqual(r1.port, 9101);
    assert.strictEqual(r1.ip, '127.0.0.1');

    const r2 = config.addRoute({ domain: 'app2.test', port: 9102, ip: '127.0.0.2', description: 'App 2' });
    assert.strictEqual(r2.domain, 'app2.test');
    assert.strictEqual(r2.port, 9102);
    assert.strictEqual(r2.ip, '127.0.0.2');

    const loaded = config.loadConfig();
    assert.strictEqual(loaded.routes.length, 2);
  });

  await t.test('Hosts file sync writes and cleans domains correctly', () => {
    hosts.syncHosts(['app1.test', 'app2.test']);
    const managed = hosts.getManagedDomains();
    assert.ok(managed.includes('app1.test'));
    assert.ok(managed.includes('app2.test'));

    hosts.removeDomain('app1.test');
    const managedAfter = hosts.getManagedDomains();
    assert.ok(!managedAfter.includes('app1.test'));
    assert.ok(managedAfter.includes('app2.test'));
  });

  await t.test('Proxies HTTP request to app1.test (127.0.0.1:9101)', async () => {
    const res = await makeRequest({
      port: 9180,
      path: '/api/hello?foo=bar',
      hostHeader: 'app1.test'
    });
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.message, 'Hello from Backend 1');
    assert.strictEqual(data.url, '/api/hello?foo=bar');
  });

  await t.test('Proxies HTTP request to app2.test with custom IP (127.0.0.2:9102)', async () => {
    const res = await makeRequest({
      port: 9180,
      path: '/test',
      hostHeader: 'app2.test'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'Hello from Backend 2 on 127.0.0.2');
  });

  await t.test('Serves Web Dashboard when accessed via localhost', async () => {
    const res = await makeRequest({
      port: 9180,
      path: '/',
      hostHeader: 'localhost'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('PROX'), 'Dashboard HTML should mention PROX');
    assert.ok(res.body.includes('Local Reverse Proxy'));
  });

  await t.test('Returns 404 page for unconfigured domain', async () => {
    const res = await makeRequest({
      port: 9180,
      path: '/',
      hostHeader: 'nonexistent.test'
    });
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.includes('Domain Not Configured'));
  });

  await t.test('Returns 502 Bad Gateway page when backend is down', async () => {
    config.addRoute({ domain: 'down.test', port: 9999, ip: '127.0.0.1' });
    const res = await makeRequest({
      port: 9180,
      path: '/',
      hostHeader: 'down.test'
    });
    assert.strictEqual(res.statusCode, 502);
    assert.ok(res.body.includes('Application Not Reachable'));
    assert.ok(res.body.includes('127.0.0.1:9999'));
  });

  await t.test('Dashboard REST API allows adding and listing routes', async () => {
    const addRes = await makeRequest({
      port: 9180,
      path: '/api/routes',
      method: 'POST',
      hostHeader: 'localhost',
      body: JSON.stringify({
        domain: 'api-added.test',
        port: 9101,
        ip: '127.0.0.1',
        description: 'Via API'
      })
    });
    assert.strictEqual(addRes.statusCode, 200);

    const listRes = await makeRequest({
      port: 9180,
      path: '/api/routes',
      hostHeader: 'localhost'
    });
    assert.strictEqual(listRes.statusCode, 200);
    const routes = JSON.parse(listRes.body);
    const found = routes.find(r => r.domain === 'api-added.test');
    assert.ok(found);
    assert.strictEqual(found.online, true);
  });

  await t.test('Proxies WebSocket upgrade connections', async () => {
    let backendWsSocket = null;
    const wsBackend = http.createServer();
    wsBackend.on('upgrade', (req, socket, head) => {
      backendWsSocket = socket;
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\nWS_PONG');
    });
    await new Promise(resolve => wsBackend.listen(9103, '127.0.0.1', resolve));

    config.addRoute({ domain: 'wsapp.test', port: 9103, ip: '127.0.0.1' });

    const wsResponse = await new Promise((resolve, reject) => {
      const client = net.connect(9180, '127.0.0.1', () => {
        client.write('GET / HTTP/1.1\r\nHost: wsapp.test\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      });

      client.on('data', chunk => {
        const resp = chunk.toString();
        client.destroy();
        if (backendWsSocket) backendWsSocket.destroy();
        resolve(resp);
      });

      client.on('error', reject);
    });

    wsBackend.close();
    assert.ok(wsResponse.includes('101 Switching Protocols'), 'Response should include 101 Switching Protocols');
    assert.ok(wsResponse.includes('WS_PONG'), 'Response should proxy WebSocket data');
  });
});
