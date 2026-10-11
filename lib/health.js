'use strict';

const net = require('net');

/**
 * Checks whether a given host/IP and port is currently accepting TCP connections.
 * @param {string} host 
 * @param {number} port 
 * @param {number} [timeoutMs=800] 
 * @returns {Promise<boolean>}
 */
function checkTargetHealth(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const finalize = (status) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(status);
      }
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      finalize(true);
    });

    socket.once('timeout', () => {
      finalize(false);
    });

    socket.once('error', () => {
      finalize(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Checks health for an array of route objects in parallel.
 * @param {Array<{domain: string, ip: string, port: number}>} routes 
 * @returns {Promise<Array<object>>}
 */
async function checkAllRoutesHealth(routes) {
  const promises = routes.map(async (route) => {
    const isOnline = await checkTargetHealth(route.ip, route.port);
    return {
      ...route,
      online: isOnline
    };
  });

  return Promise.all(promises);
}

module.exports = {
  checkTargetHealth,
  checkAllRoutesHealth
};
