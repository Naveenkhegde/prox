# PROX &mdash; Local Reverse Proxy for Developers

**PROX** is a fast, lightweight local reverse proxy designed for local web applications and development environments. It allows you to map custom domain names (like `myapp.local` or `admin.dev`) directly to any local or network IP and port (defaulting to `127.0.0.1`), so you can open clean domain names directly in your browser without typing port numbers.

[![Build Status](https://img.shields.io/badge/tests-passing-brightgreen)](#testing)
[![Package](https://img.shields.io/badge/deb-package%20ready-blue)](#installing-via-deb-package)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

---

## ✨ Features

- **Port 80 Clean URL Routing**: Access apps without typing port numbers in the URL (e.g. `http://myapp.local` instead of `http://127.0.0.1:3000`).
- **Flexible Target Host & Port**: Default IP is `127.0.0.1`, but you can easily proxy to any IP on your network (e.g. `192.168.1.150:8080`).
- **Automatic `/etc/hosts` Sync**: Automatically adds and removes local DNS entries safely without breaking your existing `/etc/hosts` configuration.
- **WebSocket & SSE Ready**: Full support for real-time applications, Next.js / Vite HMR, and Socket.io.
- **Modern Web Dashboard**: Accessible at [`http://localhost`](http://localhost) with real-time backend health monitoring (🟢 Online / 🔴 Offline) and one-click app management.
- **Smart Redirect Handling**: Automatically rewrites backend redirects so internal ports and IPs don't leak into the browser address bar.
- **Polished Error Pages**: Friendly 502 page when a target backend is not running yet, showing what port to check and a quick retry button.
- **Systemd Background Service**: Runs continuously in the background and starts automatically on system boot.

---

## 📦 Installation Options

### Option 1: Installing via `.deb` Package (Recommended for Debian / Ubuntu / Kali)

Download the pre-built `.deb` package directly from [GitHub Releases](https://github.com/Naveenkhegde/prox/releases/latest) or use `dist/prox_1.0.0_all.deb`:

```bash
# 1. Download the Debian package:
wget https://github.com/Naveenkhegde/prox/releases/download/v1.0.0/prox_1.0.0_all.deb

# 2. Install the package:
sudo dpkg -i prox_1.0.0_all.deb

# 3. If any dependencies are missing:
sudo apt-get install -f
```

The package automatically:
- Installs the binary launcher to `/usr/bin/prox`.
- Bundles all dependencies (zero extra npm downloads needed).
- Enables and starts the `prox` systemd background service.
- Grants port 80 binding capabilities (`CAP_NET_BIND_SERVICE`).

---

### Option 2: Building from Source (`build-essential`)

#### Prerequisites
Ensure your system has the standard build packages and Node.js:

```bash
# On Debian / Ubuntu / Kali:
sudo apt-get update
sudo apt-get install -y build-essential dpkg-dev nodejs npm
```

#### Clone and Install
```bash
git clone https://github.com/Naveenkhegde/prox.git
cd prox

# Install dependencies
npm install

# Run automated tests
npm test

# Run installer (sets up systemd service & /usr/local/bin/prox symlink)
sudo ./install.sh
```

#### Building the `.deb` Package from Source
You can build your own `.deb` package using the included Makefile:
```bash
make deb
# Output generated at: dist/prox_1.0.0_all.deb
```

---

## 📖 Command Guide After Installation

Once installed, the `prox` command is globally accessible from any terminal.

### 1. Map a Local App (`127.0.0.1` default)
To route `http://myapp.local` to a local server running on port `3000`:
```bash
prox add myapp.local 3000
```
- IP defaults to `127.0.0.1`.
- `/etc/hosts` is automatically updated.
- You can now open **`http://myapp.local`** directly in your browser!

### 2. Map with an Optional Description
```bash
prox add api.local 5000 -d "Express API backend"
```

### 3. Map to Another IP and Port (Network Target)
To route `http://nas.local` to another device or IP on your LAN:
```bash
prox add nas.local 8080 192.168.1.150 -d "Home Server"
```
Now opening **`http://nas.local`** in your browser will route seamlessly to `192.168.1.150:8080`!

### 4. Check All Mapped Apps & Live Health Status
```bash
prox list
# or
prox ls
```
Output:
```text
Checking backend health for 2 application(s)...

DOMAIN        TARGET              STATUS      HOSTS     DESCRIPTION
-------------------------------------------------------------------------
myapp.local   127.0.0.1:3000      ONLINE     ✔ Yes    Frontend app
nas.local     192.168.1.150:8080  ONLINE     ✔ Yes    Home Server
```

### 5. Open an App in Default Browser
```bash
prox open myapp.local
# or open dashboard:
prox open
```

### 6. Remove a Mapping
```bash
prox rm myapp.local
```
Removes the route and cleanly cleans up its line from `/etc/hosts`.

### 7. Manage the Background Service
```bash
# Check service status and port:
prox status

# Restart service:
prox restart

# Stop service:
prox stop

# Start service:
prox start

# View live service logs:
prox logs
```

---

## 🌐 Web Dashboard

Prox features an interactive Web Dashboard built right into the proxy!

Open **[http://localhost](http://localhost)** in your browser:
- **Real-time Health Checking**: Live green/red indicators show which backend apps are running.
- **Visual App Management**: Map new domains, edit ports/IPs, or delete routes with one click.
- **One-Click Launch**: Click "Open" next to any app to launch it in a new tab.

---

## ⚙️ Configuration File (`routes.json`)

All configurations are stored in JSON:
```json
{
  "port": 80,
  "routes": [
    {
      "domain": "myapp.local",
      "ip": "127.0.0.1",
      "port": 3000,
      "changeOrigin": true,
      "description": "My React frontend",
      "createdAt": "2026-10-11T12:00:00.000Z"
    },
    {
      "domain": "nas.local",
      "ip": "192.168.1.150",
      "port": 8080,
      "changeOrigin": true,
      "description": "Home NAS server",
      "createdAt": "2026-10-11T12:05:00.000Z"
    }
  ]
}
```
Any modifications to routes take effect immediately without restarting the proxy.

---

## 🧪 Testing

To run the automated test suite:
```bash
npm test
```
Runs 11 automated test cases verifying HTTP proxying, custom IP proxying, WebSocket upgrades, health checks, error responses, and `/etc/hosts` synchronization.

---

## 📄 License

MIT &copy; 2026 Naveen Hegde
