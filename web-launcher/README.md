# 🎮 Backyard Monsters Refitted — Web Launcher & Proxy

Este lanzador web permite jugar a **Backyard Monsters Refitted** directamente desde cualquier navegador moderno (Chrome, Firefox, Safari, Edge o navegadores móviles) sin necesidad de instalar clientes de escritorio nativos ni el plugin obsoleto de Flash Player, pudiendo publicarlo fácilmente en internet a través de un **Cloudflare Tunnel** en tu propio servidor.

---

## 🌟 Características Principales

1. **Reproducción Web 100% Nativa (Sin plugins de escritorio)**:
   - Utiliza **Ruffle WebAssembly (AS3)** para emular el cliente ActionScript 3 de Flash directamente en el navegador del usuario con aceleración Canvas/WebGL.
   - Compatible con ordenadores, tablets y teléfonos móviles.

2. **Modificador de Endpoints y Servidor Dinámico**:
   - Selector en tiempo real del servidor contra el que deseas jugar:
     - 🌐 **Servidor Oficial Refitted**: `https://server.bymrefitted.com/`
     - 🏠 **Servidor Local / Auto-hospedado**: `http://localhost:3001/`
     - ⚙️ **Servidor Personalizado**: Cualquier URL de un servidor privado comunitario.
   - **Comprobador de latencia (Ping)**: Mide en milisegundos el estado de respuesta del servidor antes de conectar.
   - **Garantía de Preservación**: Si los servidores oficiales de los desarrolladores caen o se cierran en el futuro, no pierdes nada; basta con cambiar el endpoint a tu propio servidor privado.

3. **Proxy Inverso Anti-CORS y Anti-Mixed-Content para Cloudflare Tunnel**:
   - Cuando sirves una web por Cloudflare Tunnel bajo HTTPS (`https://bym.tudominio.com`), los navegadores modernos **bloquean peticiones HTTP inseguras** (Mixed Content) o peticiones entre dominios sin cabeceras CORS.
   - El lanzador incluye un proxy inverso integrado en el contenedor Docker (`/proxy/server/` y `/proxy/cdn/`) que reenvía el tráfico de manera transparente con las cabeceras CORS adecuadas.

4. **Gestor de Cuentas y Sesión**:
   - Permite iniciar sesión con correo y contraseña para cargar automáticamente tu aldea.
   - Soporte para token JWT manual.
   - Opción *"Jugar con Login In-Game"* para usar la pantalla de login original de Backyard Monsters dentro del juego.

5. **Controles de Juego Integrados**:
   - ⛶ Pantalla completa nativa (F11 / Botón integrado).
   - 📏 Modos de escalado: Original (760x670), Adaptado a la ventana manteniendo aspecto, o Pantalla Completa.
   - 🌐 Selector de idioma (Español, Inglés, Francés, Alemán, Portugués, Turco).
   - 🔄 Reinicio rápido del juego con un clic.
   - 🐞 Consola de diagnóstico integrada para depurar errores de red y eventos de Flash.

---

## 🚀 Despliegue con Docker (Recomendado)

### Opción A: Solo el Web Launcher (Conectando a los servidores oficiales o externos)

1. En la carpeta raíz del proyecto, ejecuta:
   ```bash
   docker compose -f docker-compose.web-launcher.yml up -d
   ```
2. Accede en tu navegador a:
   ```
   http://localhost:8080
   ```

### Opción B: Full Stack (Tu propio Servidor de Juego + Base de Datos + Redis + Web Launcher)

Si quieres tener tu propio servidor privado 100% independiente en tu máquina:
```bash
docker compose -f docker-compose.full-stack.yml up -d
```
Esto levantará:
- Servidor de base de datos PostgreSQL.
- Servidor de caché y sesiones Redis.
- Servidor de juego y WebSocket de chat Backyard Monsters (`bymr-api-server`).
- Web Launcher en el puerto `8080`.

---

## ☁️ Exponer a través de Cloudflare Tunnel

Para jugar desde cualquier lugar a través de tu propio dominio (ej. `https://bym.tudominio.com`):

### Método 1: Desde el panel web de Cloudflare Zero Trust (Más fácil)
1. Ve a [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) > **Networks** > **Tunnels**.
2. Haz clic en **Create a Tunnel** y dale un nombre (ej. `bym-tunnel`).
3. En la sección **Public Hostname**:
   - **Subdomain**: `bym` (o el que prefieras).
   - **Domain**: `tudominio.com`.
   - **Type**: `HTTP`.
   - **URL**: `web-launcher:8080` (si corre en la misma red Docker) o `localhost:8080`.
4. Copia el `TUNNEL_TOKEN` que te proporciona Cloudflare.
5. Puedes agregarlo a tu `.env` como `CLOUDFLARE_TUNNEL_TOKEN=ey...` y correr:
   ```bash
   docker compose -f docker-compose.web-launcher.yml --profile tunnel up -d
   ```
   ¡Y listo! Tu juego web estará disponible de inmediato bajo HTTPS con certificado SSL automático.

### Método 2: Con `cloudflared` instalado en tu servidor
En tu archivo de configuración de Cloudflare (`config.yml`):
```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: bym.tudominio.com
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```
Ejecuta:
```bash
cloudflared tunnel run
```

---

## 🛠️ Ejecución Local para Desarrollo (Sin Docker)

Si deseas probar o modificar el lanzador en tu máquina local:

1. Entra en la carpeta del lanzador:
   ```bash
   cd web-launcher
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor:
   ```bash
   node server.js
   ```
   o con Bun:
   ```bash
   bun server.js
   ```
4. Abre `http://localhost:8080` en tu navegador.

---

## 📁 Estructura del Proyecto Web Launcher

```
web-launcher/
├── Dockerfile                  # Imagen Docker optimizada (Node 20 Alpine)
├── docker-compose.yml          # Compose standalone para el launcher
├── package.json                # Dependencias (Express, CORS, Ruffle)
├── server.js                   # Servidor web y reverse proxy dinámico
├── public/                     # Archivos servidos al navegador
│   ├── index.html              # Interfaz de usuario del lanzador
│   ├── app.js                  # Lógica del cliente, selector de servidor y Ruffle
│   ├── styles.css              # Tema visual oscuro inspirado en BYM
│   ├── swfs/                   # Binarios SWF del cliente de juego
│   │   └── bymr-client.swf     # Cliente ActionScript 3 (v128.5690)
│   └── vendor/
│       └── ruffle/             # Motor WebAssembly de Flash Player
```

---

## ❓ Preguntas Frecuentes

### ¿El juego se conecta a los servidores que ellos mantienen?
**Sí**. Por defecto viene configurado apuntando a `https://server.bymrefitted.com/` y su CDN oficial `https://cdn.bymrefitted.com/`. Todas las partidas, progreso, clanes y ataques se comunican directamente con sus servidores.

### ¿Qué pasa si cierran o cambian de servidor?
Haces clic en el botón superior **"⚙️ Servidor / Endpoints"**, eliges **"Personalizado"**, introduces la nueva URL de tu propio servidor (o el de la comunidad) y pulsas **"Guardar"**. Tu juego continuará funcionando sin tener que volver a compilar nada.

### ¿Por qué se recomienda el "Modo Proxy Docker"?
Al publicar tu web con Cloudflare Tunnel bajo `https://`, tu navegador aplicará políticas estrictas de seguridad (CORS y Mixed-Content). El modo proxy hace que las llamadas salgan desde el servidor Docker hacia el backend del juego, devolviendo respuestas limpias al navegador sin bloqueos.
