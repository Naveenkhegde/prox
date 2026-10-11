'use strict';

const fs = require('fs');
const cp = require('child_process');

function getHostsPath() {
  return process.env.PROX_HOSTS_PATH || '/etc/hosts';
}
const START_MARKER = '# --- BEGIN PROX MANAGED DOMAINS ---';
const END_MARKER = '# --- END PROX MANAGED DOMAINS ---';

function readHosts() {
  const hostsFile = getHostsPath();
  try {
    return fs.readFileSync(hostsFile, 'utf8');
  } catch (err) {
    console.error(`[prox] Error reading ${hostsFile}:`, err.message);
    return '';
  }
}

function writeHosts(content) {
  const hostsFile = getHostsPath();
  try {
    // Test write access
    fs.accessSync(hostsFile, fs.constants.W_OK);
    fs.writeFileSync(hostsFile, content, 'utf8');
  } catch {
    // Fall back to sudo tee
    try {
      cp.execSync(`sudo tee ${hostsFile} > /dev/null`, {
        input: content,
        encoding: 'utf8'
      });
    } catch (sudoErr) {
      throw new Error(`Failed to update ${hostsFile}: ${sudoErr.message}`);
    }
  }
}

/**
 * Checks if a domain is already mapped to 127.0.0.1 outside the PROX block.
 */
function isMappedOutsideProx(content, domain) {
  const normDomain = domain.toLowerCase().trim();
  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  let cleanContent = content;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleanContent = content.substring(0, startIdx) + content.substring(endIdx + END_MARKER.length);
  }

  const lines = cleanContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && parts[0] === '127.0.0.1') {
      const hostnames = parts.slice(1).map(h => h.toLowerCase());
      if (hostnames.includes(normDomain)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Synchronizes a list of domains into /etc/hosts within the managed block.
 * @param {string[]} domains 
 */
function syncHosts(domains) {
  const currentContent = readHosts();
  const uniqueDomains = Array.from(new Set(
    domains
      .map(d => (d || '').trim().toLowerCase())
      .filter(d => d && !isMappedOutsideProx(currentContent, d))
  ));

  const startIdx = currentContent.indexOf(START_MARKER);
  const endIdx = currentContent.indexOf(END_MARKER);

  let baseContent = currentContent;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = currentContent.substring(0, startIdx).trimEnd();
    const after = currentContent.substring(endIdx + END_MARKER.length).trimStart();
    baseContent = before + (after ? '\n\n' + after : '\n');
  }

  baseContent = baseContent.trimEnd();

  if (uniqueDomains.length === 0) {
    // If no domains to manage, write clean baseContent
    writeHosts(baseContent + '\n');
    return true;
  }

  const blockLines = [
    '',
    START_MARKER,
    ...uniqueDomains.map(d => `127.0.0.1\t${d}`),
    END_MARKER,
    ''
  ];

  const newContent = baseContent + '\n' + blockLines.join('\n');
  writeHosts(newContent);
  return true;
}

/**
 * Adds a single domain to /etc/hosts managed block.
 */
function addDomain(domain) {
  const currentContent = readHosts();
  const norm = domain.trim().toLowerCase();
  if (isMappedOutsideProx(currentContent, norm)) {
    return true; // Already mapped externally
  }

  const existingDomains = getManagedDomains();
  if (!existingDomains.includes(norm)) {
    existingDomains.push(norm);
  }
  return syncHosts(existingDomains);
}

/**
 * Removes a domain from /etc/hosts managed block.
 */
function removeDomain(domain) {
  const norm = domain.trim().toLowerCase();
  const existingDomains = getManagedDomains();
  const filtered = existingDomains.filter(d => d !== norm);
  return syncHosts(filtered);
}

/**
 * Returns array of domains currently in the managed block.
 */
function getManagedDomains() {
  const content = readHosts();
  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return [];
  }

  const block = content.substring(startIdx + START_MARKER.length, endIdx);
  const lines = block.split('\n');
  const domains = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && parts[0] === '127.0.0.1') {
      domains.push(parts[1].toLowerCase());
    }
  }

  return domains;
}

/**
 * Checks whether a domain is resolving locally (either in managed block or elsewhere in /etc/hosts).
 */
function isDomainResolvingLocally(domain) {
  const content = readHosts();
  const norm = domain.trim().toLowerCase();

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && (parts[0] === '127.0.0.1' || parts[0] === '::1')) {
      if (parts.slice(1).map(h => h.toLowerCase()).includes(norm)) {
        return true;
      }
    }
  }
  return false;
}

module.exports = {
  readHosts,
  writeHosts,
  syncHosts,
  addDomain,
  removeDomain,
  getManagedDomains,
  isDomainResolvingLocally
};
