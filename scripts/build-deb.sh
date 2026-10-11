#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
BUILD_DIR="${DIR}/dist/deb_build"
PKG_VERSION="1.0.0"
DEB_NAME="prox_${PKG_VERSION}_all.deb"
OUTPUT_DEB="${DIR}/dist/${DEB_NAME}"

echo "=== Building Debian Package: ${DEB_NAME} ==="

# Clean build directory
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/DEBIAN"
mkdir -p "${BUILD_DIR}/opt/prox"
mkdir -p "${BUILD_DIR}/usr/bin"
mkdir -p "${BUILD_DIR}/etc/systemd/system"
mkdir -p "${DIR}/dist"

# 1. Create control file
cat <<EOF > "${BUILD_DIR}/DEBIAN/control"
Package: prox
Version: ${PKG_VERSION}
Section: net
Priority: optional
Architecture: all
Depends: nodejs (>= 18.0.0)
Maintainer: Naveen Hegde <naveenkhegde@gmail.com>
Homepage: https://github.com/Naveenkhegde/prox
Description: Simple local reverse proxy for developers and web applications
 Prox allows developers to map custom domain names directly to local or
 network IP:port targets with zero friction, automatic /etc/hosts sync,
 WebSocket support, and an intuitive web management dashboard.
EOF

# 2. Create postinst
cat <<'EOF' > "${BUILD_DIR}/DEBIAN/postinst"
#!/usr/bin/env bash
set -e

NODE_BIN="$(which node || echo /usr/bin/node)"
if [ -x "$NODE_BIN" ]; then
  setcap 'cap_net_bind_service=+ep' "$NODE_BIN" 2>/dev/null || true
fi

# Ensure routes configuration file exists
if [ ! -f /opt/prox/routes.json ]; then
  if [ -f /opt/prox/routes.example.json ]; then
    cp /opt/prox/routes.example.json /opt/prox/routes.json
  else
    echo '{"port": 80, "routes": []}' > /opt/prox/routes.json
  fi
fi
chmod 666 /opt/prox/routes.json 2>/dev/null || true
chmod 777 /opt/prox 2>/dev/null || true

# Systemd setup
if command -v systemctl >/dev/null 2>&1; then
  systemctl daemon-reload 2>/dev/null || true
  systemctl enable prox 2>/dev/null || true
  systemctl restart prox 2>/dev/null || true
fi

echo ""
echo "=========================================================="
echo "  PROX installed and service started successfully!"
echo "  Web Dashboard: http://localhost"
echo "  CLI Command:   prox add <domain> <port> [ip]"
echo "                 prox list"
echo "                 prox status"
echo "=========================================================="
echo ""
exit 0
EOF

# 3. Create prerm
cat <<'EOF' > "${BUILD_DIR}/DEBIAN/prerm"
#!/usr/bin/env bash
set -e
if command -v systemctl >/dev/null 2>&1; then
  systemctl stop prox 2>/dev/null || true
  systemctl disable prox 2>/dev/null || true
fi
exit 0
EOF

# 4. Create postrm
cat <<'EOF' > "${BUILD_DIR}/DEBIAN/postrm"
#!/usr/bin/env bash
set -e
if [ "$1" = "purge" ]; then
  rm -rf /opt/prox
fi
if command -v systemctl >/dev/null 2>&1; then
  systemctl daemon-reload 2>/dev/null || true
fi
exit 0
EOF

# Make DEBIAN scripts executable
chmod 755 "${BUILD_DIR}/DEBIAN/postinst"
chmod 755 "${BUILD_DIR}/DEBIAN/prerm"
chmod 755 "${BUILD_DIR}/DEBIAN/postrm"
chmod 644 "${BUILD_DIR}/DEBIAN/control"

# 5. Copy application source files
echo "Copying application files..."
cp -r "${DIR}/bin" "${BUILD_DIR}/opt/prox/"
cp -r "${DIR}/lib" "${BUILD_DIR}/opt/prox/"
cp "${DIR}/package.json" "${BUILD_DIR}/opt/prox/"
cp "${DIR}/package-lock.json" "${BUILD_DIR}/opt/prox/"
cp "${DIR}/server.js" "${BUILD_DIR}/opt/prox/"
cp "${DIR}/routes.example.json" "${BUILD_DIR}/opt/prox/"

# Ensure node_modules are included
if [ -d "${DIR}/node_modules" ]; then
  echo "Bundling dependencies (node_modules)..."
  cp -r "${DIR}/node_modules" "${BUILD_DIR}/opt/prox/"
fi

# 6. Create binary wrapper in /usr/bin/prox
cat <<'EOF' > "${BUILD_DIR}/usr/bin/prox"
#!/usr/bin/env bash
exec /usr/bin/node /opt/prox/bin/prox "$@"
EOF
chmod 755 "${BUILD_DIR}/usr/bin/prox"
chmod 755 "${BUILD_DIR}/opt/prox/bin/prox"

# 7. Create systemd service file
cat <<'EOF' > "${BUILD_DIR}/etc/systemd/system/prox.service"
[Unit]
Description=Prox - Simple Local Reverse Proxy
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/prox
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/prox/server.js
Restart=always
RestartSec=3
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
chmod 644 "${BUILD_DIR}/etc/systemd/system/prox.service"

# 8. Build Debian package
echo "Packaging with dpkg-deb..."
dpkg-deb --build --root-owner-group "${BUILD_DIR}" "${OUTPUT_DEB}"

# Clean temp build directory
rm -rf "${BUILD_DIR}"

echo ""
echo "=== Package Built Successfully! ==="
echo "Artifact: ${OUTPUT_DEB}"
ls -lh "${OUTPUT_DEB}"
