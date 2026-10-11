#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "=== Installing Prox Local Reverse Proxy ==="

# 1. Ensure node permissions
NODE_BIN="$(which node)"
echo "Setting port 80 binding capability on ${NODE_BIN}..."
sudo setcap 'cap_net_bind_service=+ep' "${NODE_BIN}" || true

# 2. Symlink global CLI command
echo "Linking CLI to /usr/local/bin/prox..."
sudo ln -sf "${DIR}/bin/prox" /usr/local/bin/prox
sudo chmod +x "${DIR}/bin/prox"

# 3. Setup systemd service
echo "Configuring systemd service..."
sudo cp "${DIR}/prox.service" /etc/systemd/system/prox.service
sudo systemctl daemon-reload
sudo systemctl enable --now prox

echo ""
echo "=== Installation Complete ==="
echo "Prox is now active and running on port 80!"
echo ""
echo "Web Dashboard: http://localhost"
echo "CLI command:   prox add <domain> <port> [ip]"
echo "               prox list"
echo "               prox status"
