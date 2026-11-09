# Backyard Monsters Refitted - Web Launcher & Proxy

This web launcher enables playing **Backyard Monsters Refitted** directly from any modern web browser (Chrome, Firefox, Safari, Edge, or mobile browsers) without requiring desktop client installations or legacy Flash plugins. It is containerized with Docker and ready to be served over a **Cloudflare Tunnel** or reverse proxy on your own server.

---

## Key Features

1. **In-Browser WebAssembly Runtime (Zero Desktop Plugins)**:
   - Uses **Ruffle WebAssembly (AVM2 / AS3)** to emulate the ActionScript 3 Flash client directly inside the browser using Canvas and WebGL acceleration.
   - Fully compatible with desktop PCs, laptops, tablets, and smartphones.

2. **Dynamic Endpoint & Server Modifier**:
   - Real-time selector to configure which server to authenticate and play against:
     - **Official Refitted Server (Default)**: `https://server.bymrefitted.com/` (CDN: `https://cdn.bymrefitted.com/`)
     - **Local / Self-Hosted Server**: `http://localhost:3001/`
     - **Custom Server**: Custom IP, domain, or community server.
   - **Real-Time Latency Meter (Ping)**: Tests response times in milliseconds before saving.
   - **Preservation Guarantee**: If official servers go offline or shut down in the future, your web player remains 100% functional by switching endpoints to your private server without rebuilding or recompiling code.

3. **Cloudflare Access Gateway & Service Token Support**:
   - If your backend server is protected behind a **Cloudflare Access (Zero Trust Application)** gate or an authentication proxy, you can specify Service Token credentials:
     - `CF-Access-Client-Id`
     - `CF-Access-Client-Secret`
     - Custom authorization headers (e.g., `Authorization: Bearer <token>`)
   - The built-in proxy forwards these security headers automatically with every API and asset call.

4. **CORS & Mixed-Content Reverse Proxy**:
   - Modern browsers block requests from an HTTPS origin (`https://bym.yourdomain.com`) to non-CORS or plain HTTP backends.
   - The launcher includes an embedded reverse proxy (`/proxy/server/` and `/proxy/cdn/`) that forwards requests cleanly with permissive CORS headers.

5. **Session & Profile Management**:
   - Log in using your email and password to load your village automatically.
   - Direct JWT token authentication support.
   - Guest / In-game login option to let the Flash client's native authentication handle sign-in.

6. **In-Game Display Controls**:
   - Native Fullscreen mode.
   - Aspect ratio scaling: Fitted (aspect ratio preserved), Original (760x670), or Full Screen.
   - Real-time language selector (English, Spanish, French, German, Portuguese, Turkish).
   - One-click client restart.
   - Integrated debug and network console.

---

## Deployment with Docker

### Option A: Web Launcher Only (Connecting to Official or Remote Servers)

```bash
docker compose -f docker-compose.web-launcher.yml up -d
```

Open your browser at:
`http://localhost:8080`

### Option B: Full Stack (Self-Hosted Game Server + Database + Redis + Web Launcher)

To run a completely self-hosted, private backend alongside the web player:

```bash
docker compose -f docker-compose.full-stack.yml up -d
```

This starts:
- PostgreSQL database
- Redis cache & session store
- Backyard Monsters API server (`:3001`) and WebSocket chat (`:3010`)
- Web Launcher & Player (`:8080`)

---

## Minimum Hardware Requirements (VM / LXC)

The hardware requirements differ significantly depending on whether you run **only the Web Launcher** (connecting to the official server) or the **Full-Stack self-hosted environment** (database, redis, and game API).

Because **Ruffle (the Flash WebAssembly engine) and the game execute client-side in the player's web browser**, the server does not perform Flash rendering or GPU emulation. The server only delivers static assets and handles lightweight HTTP/JSON proxying.

### Scenario 1: Web Launcher Only (Recommended)
*(Web Launcher + Anti-CORS Reverse Proxy + Cloudflare Tunnel)*

| Resource | Minimum | Recommended |
|---|---|---|
| **RAM** | 256 MB | 512 MB |
| **CPU** | 1 vCPU (< 1-2% active utilization) | 1 vCPU |
| **Storage** | 2 GB | 4 GB |
| **Actual Process Memory** | ~40 MB (Node.js) + ~30 MB (cloudflared) = **~70 MB RAM total** |

### Scenario 2: Full-Stack Self-Hosting
*(Web Launcher + Backyard Monsters Koa/Bun API + PostgreSQL 18 + Redis 8)*

| Resource | Minimum | Recommended |
|---|---|---|
| **RAM** | 1 GB | 2 GB |
| **CPU** | 1 vCPU | 2 vCPU |
| **Storage** | 10 GB | 15 - 20 GB (for database storage, layers, and logs) |

---

## Proxmox LXC vs KVM VM Optimization

### Running in Proxmox LXC (Recommended)
An LXC container is the ideal deployment choice due to near-zero OS virtualization overhead:
- A base Debian or Alpine LXC container typically idles at under 40 MB RAM.
- **Docker inside LXC**: If you run Docker Compose inside a Proxmox LXC container, ensure the following features are enabled in the container configuration (`/etc/pve/lxc/<id>.conf` or under **Options > Features** in the Proxmox GUI):
  - `keyctl: 1`
  - `nesting: 1`

### Bare-Metal LXC without Docker (Ultra-Lightweight)
If you want the lowest possible memory footprint without Docker overhead, you can run the launcher directly with Node.js inside the LXC container:

1. Install Node.js:
   ```bash
   apt update && apt install -y nodejs npm
   ```
2. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/sPROFFEs/backyard-monsters-refitted-webplayer.git /opt/bymr-webplayer
   cd /opt/bymr-webplayer/web-launcher
   npm install --omit=dev
   ```
3. Create a systemd service (`/etc/systemd/system/bymr-launcher.service`):
   ```ini
   [Unit]
   Description=Backyard Monsters Web Launcher
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/bymr-webplayer/web-launcher
   ExecStart=/usr/bin/node server.js
   Restart=always
   Environment=PORT=8080
   Environment=DEFAULT_SERVER_URL=https://server.bymrefitted.com/
   Environment=DEFAULT_CDN_URL=https://cdn.bymrefitted.com/

   [Install]
   WantedBy=multi-user.target
   ```
4. Enable and start:
   ```bash
   systemctl daemon-reload
   systemctl enable --now bymr-launcher
   ```
   *Memory footprint in this mode is only ~35 MB RAM.*

---

## Cloudflare Tunnel Setup

To expose the launcher to the internet under your custom domain (e.g., `https://bym.yourdomain.com`):

### Method 1: Cloudflare Zero Trust Dashboard (Recommended)
1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) > **Networks** > **Tunnels**.
2. Click **Create a Tunnel** and enter a name (e.g. `bym-tunnel`).
3. Under **Public Hostname**:
   - **Subdomain**: `bym`
   - **Domain**: `yourdomain.com`
   - **Type**: `HTTP`
   - **URL**: `web-launcher:8080` (if running in the same Docker network) or `localhost:8080`.
4. Copy the `TUNNEL_TOKEN`.
5. Run the container with tunnel enabled:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN="your_token_here" docker compose -f docker-compose.web-launcher.yml --profile tunnel up -d
   ```

### Method 2: Local `cloudflared` CLI
In your `config.yml`:
```yaml
ingress:
  - hostname: bym.yourdomain.com
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```
Run:
```bash
cloudflared tunnel run
```

---

## Backend Protected by Cloudflare Access

If your backend is behind Cloudflare Access (Cloudflare Zero Trust application gate requiring a Service Token):

1. Generate a Service Token in Cloudflare Zero Trust: **Access** > **Service Auth** > **Create Service Token**.
2. In the Web Launcher:
   - Click **Server / Endpoints** in the top navigation bar.
   - Expand **Access Gateway / Cloudflare Access (Optional)**.
   - Fill in:
     - `CF-Access-Client-Id`
     - `CF-Access-Client-Secret`
   - Click **Save & Connect**.
3. Or pass them as environment variables in `docker-compose.yml`:
   ```yaml
   environment:
     - CF_ACCESS_CLIENT_ID=your_client_id.access
     - CF_ACCESS_CLIENT_SECRET=your_client_secret
   ```

---

## Local Development (Without Docker)

1. Enter the launcher directory:
   ```bash
   cd web-launcher
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Open `http://localhost:8080` in your browser.

---

## Project Structure

```
web-launcher/
├── Dockerfile                  # Container definition (Node 20 Alpine)
├── docker-compose.yml          # Standalone compose file
├── package.json                # Dependencies (Express, CORS, Ruffle)
├── server.js                   # Web server, reverse proxy, and gateway handler
├── public/                     # Static web assets
│   ├── index.html              # Web launcher user interface
│   ├── app.js                  # Client state, endpoint switcher, and Ruffle loader
│   ├── styles.css              # Dark strategy game UI theme
│   ├── swfs/                   # Flash game binaries
│   │   └── bymr-client.swf     # Reconstructed ActionScript 3 client (v128.5690)
│   └── vendor/
│       └── ruffle/             # Self-hosted Ruffle WebAssembly runtime
```
