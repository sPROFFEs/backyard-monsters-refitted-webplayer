<p align="center">
  <img width="90%" src="./server/public/assets/popups/outpost-takeover.png">
</p>

<br>

<p align="center">
  <a href="https://github.com/sPROFFEs/backyard-monsters-refitted-webplayer">
    <img src="https://img.shields.io/badge/Fork-Web%20Player%20%26%20Launcher-f59e0b?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Web Player Fork">
  </a>
  <img src="https://img.shields.io/badge/Docker-Supported-0db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Cloudflare%20Tunnel-Ready-f38020.svg?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Tunnel">
  <img src="https://img.shields.io/badge/Cloudflare%20Access-Supported-f38020.svg?style=for-the-badge" alt="Cloudflare Access">
  <img src="https://img.shields.io/badge/Ruffle-WebAssembly%20AS3-DD0031.svg?style=for-the-badge" alt="Ruffle AS3">
</p>

<br>

## About This Fork (Web Player & Docker Launcher)

This repository is a fork of [Backyard Monsters Refitted](https://github.com/bym-refitted/backyard-monsters-refitted) providing a **Dockerized Web Launcher & Player**, allowing you to play Backyard Monsters **directly in any modern web browser** (PC, Mac, Linux, iPad, Android, etc.) and expose it to the internet through a **Cloudflare Tunnel** (`https://bym.yourdomain.com`).

### Features in this Fork:
1. **In-Browser Flash Gameplay**:
   - Integrates **Ruffle WebAssembly** (ActionScript 3 engine) to render the game SWF client (`v128.5690`) natively in the browser without installing desktop launchers or legacy Flash player plugins.
2. **Default Connection to Official Servers**:
   - By default, the launcher connects directly to the official community servers maintained by the BYM Refitted team (`https://server.bymrefitted.com/`), requiring zero initial configuration to play on the official network.
3. **Dynamic Endpoint Modifier (Preservation Guarantee)**:
   - Switch the target server at any time:
     - **Official Server (Default)**: `https://server.bymrefitted.com/`
     - **Local / Self-Hosted**: `http://localhost:3001/`
     - **Custom Server**: Custom IP, domain, or private community server.
   - If official servers are ever taken down or experience outages, you can point to your own private server with one click without recompiling the game.
4. **Cloudflare Access Gateway & Service Token Support**:
   - Supports backend instances protected behind **Cloudflare Access (Zero Trust Applications)** or reverse proxy gates by passing `CF-Access-Client-Id` and `CF-Access-Client-Secret` Service Tokens through the proxy.
5. **CORS & Mixed-Content Reverse Proxy**:
   - Resolves browser security blocks when serving the game over HTTPS via Cloudflare Tunnel (`https://bym.yourdomain.com`), proxying API calls cleanly with appropriate CORS headers.
6. **In-Game Display Controls**:
   - Native Fullscreen toggle.
   - Scalable viewport (Fit window, Original 760x670, Fullscreen).
   - Multi-language switcher (English, Spanish, French, German, Portuguese, Turkish).
   - Account session manager (Email/Password login, direct JWT token, or in-game Flash login).
   - Real-time latency meter (ping) and debug console.

---

## Quickstart Deployment with Docker

### 1. Run the Web Launcher (Connecting to Official Servers)

Prerequisites: Docker and Docker Compose.

```bash
git clone https://github.com/sPROFFEs/backyard-monsters-refitted-webplayer.git
cd backyard-monsters-refitted-webplayer

docker compose -f docker-compose.web-launcher.yml up -d
```

Open your browser at:
`http://localhost:8080`

---

### 2. Expose via Cloudflare Tunnel

To make your web launcher accessible over the internet under your domain (e.g. `https://bym.yourdomain.com`):

#### Using Cloudflare Zero Trust:
1. Open [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) > **Networks** > **Tunnels**.
2. Create a tunnel (e.g. `bym-tunnel`).
3. Under **Public Hostname**:
   - **Subdomain**: `bym`
   - **Domain**: `yourdomain.com`
   - **Type**: `HTTP`
   - **URL**: `localhost:8080` (or `web-launcher:8080` if in the same Docker network).
4. Run with your tunnel token:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN="your_token_here" docker compose -f docker-compose.web-launcher.yml --profile tunnel up -d
   ```

---

### 3. Full-Stack Self-Hosting (Private Server + Database + Web Launcher)

To run a private backend instance locally alongside the web player:

```bash
docker compose -f docker-compose.full-stack.yml up -d
```

This starts:
- **PostgreSQL Database**
- **Redis Cache & Session Store**
- **Backyard Monsters API Server & Chat WebSocket** (`:3001` and `:3010`)
- **Web Launcher & Player** (`:8080`)

For complete details, see the [Web Launcher Guide](./web-launcher/README.md).

---

## About the Upstream Project (Backyard Monsters Refitted)

This repository is a digital preservation and restoration of Backyard Monsters, Kixeye's 2010 Flash-based strategy game. It features a reconstructed client, decompiled from original game files, alongside a custom-built server component implemented through reverse engineering efforts.
The client runs on version 128.5690 and remains compatible with the original ActionScript 3 codebase, rendered through Adobe Flash Player. The backend is powered by Bun, using the Koa framework, with a PostgreSQL database managed via MikroORM and written in TypeScript.

<br>

## Setup & Additional Guides

| Setup Type | Documentation |
|------------|---------------|
| Web Launcher (Docker) | [Web Launcher Guide](./web-launcher/README.md) |
| Server Setup | [Server & Database Configuration](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Server-&-Database-Setup) |
| Client Setup | [Client Recompilation Guide](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Client-Recompilation-Guide) |
| Docker Setup | [Docker Configuration](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Docker-Setup) |
| Android Setup | [Android APK Compilation](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Android-APK-Setup) |

<br>

## Contributing

We welcome contributions from the community. Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

Please read our [Contributing Guidelines](./CONTRIBUTING.md) to get started.

<br>

## Preservation of Digital Heritage
- [Exemption to PCCPSACT](https://www.federalregister.gov/documents/2018/10/26/2018-23241/exemption-to-prohibition-on-circumvention-of-copyright-protection-systems-for-access-control), exemptions to the provision of the Digital Millennium Copyright Act ("DMCA").
- [EFGAMP](https://efgamp.eu/), the European Federation of Video Game Archives, Museums and Preservation projects.
- [UNESCO PERSIST Programme](https://unescopersist.org/), helps ensure that digital information can continue to be accessed in the future.
- [The Internet Archive](https://archive.org/), a digital library of Internet sites and other cultural artifacts in digital form.
- [Flashpoint Archive](https://flashpointarchive.org/), the webgame preservation project.
- [Adobe Flash Player Archive](https://archive.org/download/flashplayerarchive/), the Adobe Inc. archive.org Flash Player Archive.
- [Stop Killing Games](https://www.stopkillinggames.com/), a campaign advocating for the legal right to preserve and play digital games.

<br />

## License [![GPL v3](https://img.shields.io/badge/GPL%20v3-blue)](http://www.gnu.org/licenses/gpl-3.0)

```
Backyard Monsters preservation project.
Copyright (C) 2025 | The Backyard Monsters Refitted team
See the GNU General Public License <https://www.gnu.org/licenses/>.
```
