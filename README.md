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
  <img src="https://img.shields.io/badge/Ruffle-WebAssembly%20AS3-DD0031.svg?style=for-the-badge" alt="Ruffle AS3">
</p>

<br>

## 🌐 Acerca de este Fork (Web Player & Docker Launcher)

Este repositorio es un **fork** de [Backyard Monsters Refitted](https://github.com/bym-refitted/backyard-monsters-refitted) que añade un **Lanzador y Reproductor Web completo en Docker**, diseñado para poder jugar a Backyard Monsters **directamente desde cualquier navegador web moderno** (PC, Mac, Linux, iPad, Android, etc.) y servirlo fácilmente en tu propio servidor doméstico a través de un **Cloudflare Tunnel** (`https://bym.tudominio.com`).

### ✨ Novedades y Características de este Fork:
1. **Juega directamente en el Navegador**:
   - Integra **Ruffle WebAssembly** (emulador ActionScript 3) para ejecutar el cliente Flash del juego (`v128.5690`) de forma nativa en el navegador, sin necesidad de instalar lanzadores de escritorio (Tauri) ni plugins obsoletos de Flash.
2. **Conexión a los Servidores Oficiales por Defecto**:
   - Por defecto, el lanzador se conecta directamente a los servidores mantenidos por el equipo de BYM Refitted (`https://server.bymrefitted.com/`), por lo que no necesitas configurar nada para jugar en la red oficial.
3. **Modificador Dinámico de Endpoint (Garantía de Preservación)**:
   - Permite cambiar en cualquier momento el servidor contra el que deseas jugar:
     - 🌐 **Servidor Oficial (Por Defecto)**: `https://server.bymrefitted.com/`
     - 🏠 **Servidor Local / Auto-hospedado**: `http://localhost:3001/`
     - ⚙️ **Servidor Propio / Personalizado**: Cualquier IP o dominio de un servidor privado comunitario.
   - Si los servidores oficiales cierran o sufren caídas en el futuro, puedes apuntar a tu propio servidor privado con 1 clic sin tener que recompilar nada.
4. **Proxy Inverso Anti-CORS & Anti-Mixed-Content para Cloudflare Tunnel**:
   - Resuelve de raíz los bloqueos del navegador cuando el juego se sirve bajo HTTPS (`https://bym.tudominio.com`), asegurando que las peticiones al backend pasen limpias y con cabeceras CORS permisivas.
5. **Herramientas de Juego en Pantalla**:
   - Modo Pantalla Completa nativo (⛶).
   - Escalado adaptable (Fitted, Original 760x670, Llenar ventana).
   - Selector multilingüe (Español, English, Français, Deutsch, Português, Türkçe).
   - Gestor de sesión (login con email/contraseña o login clásico in-game).
   - Consola de diagnóstico integrada.

---

## ⚡ Despliegue Rápido con Docker

### 1. Desplegar el Web Launcher (Conectado a los servidores oficiales)

Solo necesitas Docker y Docker Compose instalados:

```bash
# Clona el fork
git clone https://github.com/sPROFFEs/backyard-monsters-refitted-webplayer.git
cd backyard-monsters-refitted-webplayer

# Inicia el lanzador web
docker compose -f docker-compose.web-launcher.yml up -d
```

Abre en tu navegador:
👉 **`http://localhost:8080`**

---

### 2. Exponer a través de Cloudflare Tunnel

Para acceder a tu juego desde cualquier parte del mundo bajo tu propio dominio (ej. `https://bym.tudominio.com`):

#### Método rápido con Cloudflare Zero Trust:
1. Ve al panel de [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) > **Networks** > **Tunnels**.
2. Crea un túnel nuevo (ej. `bym-tunnel`).
3. En **Public Hostname**:
   - **Subdomain**: `bym`
   - **Domain**: `tudominio.com`
   - **Type**: `HTTP`
   - **URL**: `localhost:8080` (o `web-launcher:8080` si corre en la misma red Docker).
4. Copia tu `TUNNEL_TOKEN` y arranca el contenedor con el túnel:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN="tu_token_aqui" docker compose -f docker-compose.web-launcher.yml --profile tunnel up -d
   ```

---

### 3. Despliegue Full-Stack (Servidor Privado Propio + Base de Datos + Web Launcher)

Si deseas auto-hospedar también tu propio backend de Backyard Monsters en local:

```bash
docker compose -f docker-compose.full-stack.yml up -d
```

Este comando levantará:
- **Base de Datos PostgreSQL**
- **Caché y Sesiones Redis**
- **Servidor API & WebSocket de Chat Backyard Monsters** (`:3001` y `:3010`)
- **Web Launcher & Player** (`:8080`)

Para más detalles, consulta la [Guía completa del Web Launcher](./web-launcher/README.md).

---

## 📖 Sobre el Proyecto Original Backyard Monsters Refitted

This repository is a digital preservation and restoration of Backyard Monsters, Kixeye’s 2010 Flash-based strategy game. It features a reconstructed client, decompiled from original game files, alongside a custom-built server component implemented through extensive reverse engineering efforts.
The client runs on version 128.5690 and remains fully compatible with the original ActionScript 3 codebase, rendered through Adobe Flash Player. The backend is powered by Bun, using the Koa framework, with a PostgreSQL database managed via MikroORM and written entirely in TypeScript.
This project aims to keep a piece of gaming history alive and playable for future generations.

<br>

## 🛠️ Setup & Guías Adicionales

| Setup Type | Documentation |
|------------|---------------|
| 🌐 **Web Launcher (Docker)** | [Web Launcher Guide](./web-launcher/README.md) |
| 🖥️ **Server Setup** | [Server & Database Configuration](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Server-&-Database-Setup) |
| 🎮 **Client Setup** | [Client Recompilation Guide](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Client-Recompilation-Guide) |
| 🐳 **Docker Setup** | [Docker Configuration](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Docker-Setup) |
| 📱 **Android Setup** | [Android APK Compilation](https://github.com/bym-refitted/backyard-monsters-refitted/wiki/Android-APK-Setup) |

<br>

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

Please read our [Contributing Guidelines](./CONTRIBUTING.md) to get started.

<br>

## Preservation of digital heritage
- [Exemption to PCCPSACT](https://www.federalregister.gov/documents/2018/10/26/2018-23241/exemption-to-prohibition-on-circumvention-of-copyright-protection-systems-for-access-control), exemptions to the provision of the Digital Millennium Copyright Act (“DMCA”).
- [EFGAMP](https://efgamp.eu/), the European Federation of Video Game Archives, Museums and Preservation projects.
- [UNESCO PERSIST Programme](https://unescopersist.org/), helps ensure that digital information can continue to be accessed in the future.
- [The Internet Archive](https://archive.org/), a digital library of Internet sites and other cultural artifacts in digital form.
- [Flashpoint Archive](https://flashpointarchive.org/), the webgame preservation project.
- [Adobe Flash Player Archive](https://archive.org/download/flashplayerarchive/), the Adobe Inc. archive.org Flash Player Archive.
- [Stop Killing Games](https://www.stopkillinggames.com/) a campaign advocating for the legal right to preserve and play digital games.

<br />

## License [![GPL v3](https://img.shields.io/badge/GPL%20v3-blue)](http://www.gnu.org/licenses/gpl-3.0)

```
Backyard Monsters preservation project.
Copyright (C) 2025 | The Backyard Monsters Refitted team
See the GNU General Public License <https://www.gnu.org/licenses/>.
```
