'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = process.env.PROX_CONFIG_PATH || path.join(__dirname, '..', 'routes.json');

const DEFAULT_CONFIG = {
  port: 80,
  routes: []
};

function getConfigPath() {
  return DEFAULT_CONFIG_PATH;
}

function loadConfig() {
  const configPath = getConfigPath();
  try {
    if (!fs.existsSync(configPath)) {
      saveConfig(DEFAULT_CONFIG);
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
    const content = fs.readFileSync(configPath, 'utf8');
    const data = JSON.parse(content);
    if (!Array.isArray(data.routes)) {
      data.routes = [];
    }
    if (!data.port || typeof data.port !== 'number') {
      data.port = 80;
    }
    return data;
  } catch (err) {
    console.error(`[prox] Error reading config from ${configPath}:`, err.message);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

function saveConfig(config) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      const cp = require('child_process');
      cp.execSync(`sudo mkdir -p "${dir}"`);
    }
  }
  const tmpPath = `${configPath}.tmp.${Date.now()}`;
  const data = JSON.stringify(config, null, 2);
  try {
    fs.writeFileSync(tmpPath, data, 'utf8');
    fs.renameSync(tmpPath, configPath);
  } catch (err) {
    const cp = require('child_process');
    try {
      cp.execSync(`sudo tee "${configPath}" > /dev/null`, { input: data, encoding: 'utf8' });
    } catch (sudoErr) {
      throw new Error(`Failed to save config to ${configPath}: ${sudoErr.message}`);
    }
  }
}

function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') return '';
  return domain.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
}

function validateRoute({ domain, port, ip }) {
  const normDomain = normalizeDomain(domain);
  if (!normDomain) {
    throw new Error('Domain name is required.');
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(normDomain)) {
    throw new Error(`Invalid domain name: "${domain}". Only alphanumeric characters, dashes, and dots are allowed.`);
  }

  const numPort = parseInt(port, 10);
  if (isNaN(numPort) || numPort < 1 || numPort > 65535) {
    throw new Error(`Invalid port: "${port}". Must be between 1 and 65535.`);
  }

  const targetIp = (ip || '127.0.0.1').trim();
  // Basic IPv4 / IPv6 / hostname check
  if (!targetIp) {
    throw new Error('Target IP cannot be empty.');
  }

  return {
    domain: normDomain,
    port: numPort,
    ip: targetIp
  };
}

function addRoute({ domain, port, ip, description, changeOrigin }) {
  const validated = validateRoute({ domain, port, ip });
  const config = loadConfig();

  const existingIdx = config.routes.findIndex(r => normalizeDomain(r.domain) === validated.domain);
  const routeObj = {
    domain: validated.domain,
    ip: validated.ip,
    port: validated.port,
    changeOrigin: changeOrigin !== undefined ? Boolean(changeOrigin) : true,
    description: description ? description.trim() : '',
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    config.routes[existingIdx] = routeObj;
  } else {
    routeObj.createdAt = new Date().toISOString();
    config.routes.push(routeObj);
  }

  saveConfig(config);
  return routeObj;
}

function removeRoute(domain) {
  const normDomain = normalizeDomain(domain);
  const config = loadConfig();
  const beforeCount = config.routes.length;
  config.routes = config.routes.filter(r => normalizeDomain(r.domain) !== normDomain);
  const removed = beforeCount !== config.routes.length;
  if (removed) {
    saveConfig(config);
  }
  return removed;
}

function findRoute(domain) {
  if (!domain) return null;
  const normDomain = normalizeDomain(domain);
  const config = loadConfig();
  return config.routes.find(r => normalizeDomain(r.domain) === normDomain) || null;
}

module.exports = {
  getConfigPath,
  loadConfig,
  saveConfig,
  normalizeDomain,
  validateRoute,
  addRoute,
  removeRoute,
  findRoute
};
