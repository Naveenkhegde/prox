'use strict';

const config = require('./config');
const hosts = require('./hosts');
const health = require('./health');

function getDashboardHtml(port) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PROX &bull; Local Reverse Proxy Dashboard</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .logo {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.25rem;
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    .brand h1 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .brand span {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 400;
      margin-left: 0.5rem;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--primary);
      color: white;
      padding: 0.55rem 1.1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #334155;
      color: var(--text);
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-danger:hover {
      background: var(--danger);
      color: white;
    }
    .btn-sm {
      padding: 0.35rem 0.7rem;
      font-size: 0.8rem;
    }
    main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .stat-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.4);
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: rgba(15, 23, 42, 0.3);
      color: var(--text-muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.85rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 1.1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .domain-link {
      color: #818cf8;
      text-decoration: none;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .domain-link:hover {
      text-decoration: underline;
      color: #a5b4fc;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-online {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-offline {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .badge-online .badge-dot {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .badge-offline .badge-dot {
      background: #ef4444;
    }
    .target-badge {
      font-family: monospace;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      color: #cbd5e1;
    }
    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-muted);
    }
    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      stroke: var(--text-muted);
    }
    .empty-state p {
      margin-bottom: 1.5rem;
      font-size: 1rem;
    }
    /* Modal */
    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .modal-backdrop.open {
      display: flex;
    }
    .modal {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      cursor: pointer;
    }
    .close-btn:hover { color: var(--text); }
    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    input[type="text"], input[type="number"] {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      padding: 0.7rem 0.9rem;
      border-radius: 8px;
      color: var(--text);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus, input[type="number"]:focus {
      border-color: var(--primary);
    }
    .form-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1rem;
    }
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      cursor: pointer;
    }
    .checkbox-group input {
      accent-color: var(--primary);
      width: 16px;
      height: 16px;
    }
    .modal-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: rgba(15, 23, 42, 0.3);
    }
    .actions-cell {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #1e293b;
      border: 1px solid var(--border);
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      z-index: 200;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
    }
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="logo">&hArr;</div>
      <div>
        <h1>PROX <span>Local Reverse Proxy</span></h1>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary btn-sm" onclick="fetchRoutes()">&#x21bb; Refresh</button>
      <button class="btn" onclick="openAddModal()">+ Add Application</button>
    </div>
  </header>

  <main>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title">Proxy Port</div>
        <div class="stat-value" id="stat-port">${port}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Configured Routes</div>
        <div class="stat-value" id="stat-total">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Online Backends</div>
        <div class="stat-value" style="color: #34d399;" id="stat-online">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Offline Backends</div>
        <div class="stat-value" style="color: #f87171;" id="stat-offline">0</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Mapped Applications</div>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Real-time Health Checking</span>
      </div>
      <div id="table-container">
        <!-- Rendered via JS -->
      </div>
    </div>
  </main>

  <!-- Add/Edit Modal -->
  <div class="modal-backdrop" id="route-modal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title" id="modal-title">Map Application</div>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <form id="route-form" onsubmit="handleSaveRoute(event)">
        <div class="modal-body">
          <div class="form-group">
            <label for="route-domain">Domain Name</label>
            <input type="text" id="route-domain" placeholder="e.g. myapp.local or api.dev" required>
            <small style="color: var(--text-muted); font-size: 0.75rem;">Opening this domain in your browser will route directly to your app.</small>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="route-ip">Target IP</label>
              <input type="text" id="route-ip" value="127.0.0.1" required>
              <small style="color: var(--text-muted); font-size: 0.75rem;">127.0.0.1 (local) or another IP</small>
            </div>
            <div class="form-group">
              <label for="route-port">Target Port</label>
              <input type="number" id="route-port" placeholder="3000" min="1" max="65535" required>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Port of your app</small>
            </div>
          </div>
          <div class="form-group">
            <label for="route-desc">Description (Optional)</label>
            <input type="text" id="route-desc" placeholder="e.g. React frontend or FastAPI backend">
          </div>
          <label class="checkbox-group">
            <input type="checkbox" id="route-hosts" checked>
            <span>Automatically configure <code>/etc/hosts</code></span>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn">Save & Route</button>
        </div>
      </form>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    let routes = [];

    async function fetchRoutes() {
      try {
        const res = await fetch('/api/routes');
        routes = await res.json();
        renderTable();
        updateStats();
      } catch (err) {
        showToast('Failed to fetch routes: ' + err.message, true);
      }
    }

    function updateStats() {
      document.getElementById('stat-total').innerText = routes.length;
      const online = routes.filter(r => r.online).length;
      document.getElementById('stat-online').innerText = online;
      document.getElementById('stat-offline').innerText = routes.length - online;
    }

    function renderTable() {
      const container = document.getElementById('table-container');
      if (routes.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No applications mapped yet.</p>
            <button class="btn" onclick="openAddModal()">Map Your First App</button>
          </div>
        \`;
        return;
      }

      let html = \`
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Target Destination</th>
              <th>Status</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
      \`;

      routes.forEach(r => {
        const statusBadge = r.online
          ? \`<span class="badge badge-online"><span class="badge-dot"></span> Online</span>\`
          : \`<span class="badge badge-offline"><span class="badge-dot"></span> Offline</span>\`;

        html += \`
          <tr>
            <td>
              <a href="http://\${r.domain}" target="_blank" class="domain-link" title="Open in browser">
                \${r.domain}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </td>
            <td>
              <span class="target-badge">\${r.ip}:\${r.port}</span>
            </td>
            <td>\${statusBadge}</td>
            <td style="color: var(--text-muted);">\${r.description || '-'}</td>
            <td>
              <div class="actions-cell">
                <a href="http://\${r.domain}" target="_blank" class="btn btn-secondary btn-sm">Open</a>
                <button class="btn btn-secondary btn-sm" onclick='editRoute(\${JSON.stringify(r)})'>Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteRoute('\${r.domain}')">Delete</button>
              </div>
            </td>
          </tr>
        \`;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    }

    function openAddModal(prefillDomain = '') {
      document.getElementById('modal-title').innerText = 'Map Application';
      document.getElementById('route-domain').value = prefillDomain;
      document.getElementById('route-domain').disabled = false;
      document.getElementById('route-ip').value = '127.0.0.1';
      document.getElementById('route-port').value = '';
      document.getElementById('route-desc').value = '';
      document.getElementById('route-hosts').checked = true;
      document.getElementById('route-modal').classList.add('open');
      document.getElementById(prefillDomain ? 'route-port' : 'route-domain').focus();
    }

    function editRoute(route) {
      document.getElementById('modal-title').innerText = 'Edit Mapping';
      document.getElementById('route-domain').value = route.domain;
      document.getElementById('route-domain').disabled = true;
      document.getElementById('route-ip').value = route.ip || '127.0.0.1';
      document.getElementById('route-port').value = route.port;
      document.getElementById('route-desc').value = route.description || '';
      document.getElementById('route-hosts').checked = true;
      document.getElementById('route-modal').classList.add('open');
      document.getElementById('route-port').focus();
    }

    function closeModal() {
      document.getElementById('route-modal').classList.remove('open');
    }

    async function handleSaveRoute(event) {
      event.preventDefault();
      const domain = document.getElementById('route-domain').value.trim();
      const ip = document.getElementById('route-ip').value.trim();
      const port = parseInt(document.getElementById('route-port').value, 10);
      const description = document.getElementById('route-desc').value.trim();
      const syncHosts = document.getElementById('route-hosts').checked;

      try {
        const res = await fetch('/api/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain, ip, port, description, syncHosts })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save route');
        closeModal();
        showToast(\`Successfully mapped \${domain} to \${ip}:\${port}\`);
        fetchRoutes();
      } catch (err) {
        alert(err.message);
      }
    }

    async function deleteRoute(domain) {
      if (!confirm(\`Delete mapping for \${domain}?\`)) return;
      try {
        const res = await fetch(\`/api/routes/\${encodeURIComponent(domain)}\`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete route');
        showToast(\`Removed route for \${domain}\`);
        fetchRoutes();
      } catch (err) {
        showToast(err.message, true);
      }
    }

    function showToast(msg, isError = false) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.style.borderColor = isError ? 'var(--danger)' : 'var(--success)';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // Initial load and periodic polling
    fetchRoutes();
    setInterval(fetchRoutes, 5000);
  </script>
</body>
</html>`;
}

function get502ErrorHtml(domain, ip, port) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>502 &bull; Backend App Offline</title>
  <style>
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      text-align: center;
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: #ef4444;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .badge {
      background: rgba(0, 0, 0, 0.3);
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-family: monospace;
      color: #cbd5e1;
      display: inline-block;
      margin-bottom: 1.5rem;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }
    a, button {
      background: #6366f1;
      color: white;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      border: none;
      cursor: pointer;
    }
    a.btn-secondary {
      background: #334155;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#x26A0;</div>
    <h1>Application Not Reachable</h1>
    <p>Prox received your request for <strong>${domain}</strong>, but cannot connect to your backend application.</p>
    <div class="badge">Target: ${ip}:${port}</div>
    <p style="font-size: 0.85rem; color: #64748b;">Make sure your application is started and listening on port <strong>${port}</strong>.</p>
    <div class="actions">
      <button onclick="window.location.reload()">Retry Connection</button>
      <a href="http://localhost" class="btn-secondary">Prox Dashboard</a>
    </div>
  </div>
</body>
</html>`;
}

function get404ErrorHtml(domain) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 &bull; Domain Not Configured</title>
  <style>
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: #f59e0b;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
    }
    .domain-tag {
      font-family: monospace;
      background: rgba(0,0,0,0.3);
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      color: #a5b4fc;
    }
    a {
      background: #6366f1;
      color: white;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Domain Not Configured</h1>
    <p>Prox is running, but no application is mapped to <span class="domain-tag">${domain}</span> yet.</p>
    <a href="http://localhost">Open Prox Dashboard to Map It</a>
  </div>
</body>
</html>`;
}

async function handleApi(req, res, pathname) {
  const method = req.method.toUpperCase();

  if (pathname === '/api/routes' && method === 'GET') {
    const cfg = config.loadConfig();
    const routesWithHealth = await health.checkAllRoutesHealth(cfg.routes);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(routesWithHealth));
    return true;
  }

  if (pathname === '/api/routes' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const route = config.addRoute(payload);
        if (payload.syncHosts !== false) {
          try {
            hosts.addDomain(route.domain);
          } catch (hErr) {
            console.error('[prox] Hosts update error:', hErr.message);
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, route }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  if (pathname.startsWith('/api/routes/') && method === 'DELETE') {
    const domain = decodeURIComponent(pathname.replace('/api/routes/', ''));
    const removed = config.removeRoute(domain);
    try {
      hosts.removeDomain(domain);
    } catch (hErr) {
      console.error('[prox] Hosts remove error:', hErr.message);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: removed, domain }));
    return true;
  }

  if (pathname === '/api/status' && method === 'GET') {
    const cfg = config.loadConfig();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      running: true,
      port: cfg.port,
      routesCount: cfg.routes.length,
      uptime: process.uptime()
    }));
    return true;
  }

  return false;
}

module.exports = {
  getDashboardHtml,
  get502ErrorHtml,
  get404ErrorHtml,
  handleApi
};
