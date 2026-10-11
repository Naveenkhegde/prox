'use strict';

const proxy = require('./lib/proxy');

async function main() {
  try {
    const { server, port } = await proxy.startServer();

    const shutdown = () => {
      console.log('\n[prox] Shutting down gracefully...');
      server.close(() => {
        console.log('[prox] Closed remaining connections.');
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 3000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[prox] Failed to start server:', err.message);
    if (err.code === 'EACCES') {
      console.error('[prox] Port 80 requires binding permissions. Run: sudo setcap cap_net_bind_service=+ep $(which node)');
    }
    process.exit(1);
  }
}

main();
