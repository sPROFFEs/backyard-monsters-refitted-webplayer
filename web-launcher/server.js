const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);
const DEFAULT_SERVER_URL = process.env.DEFAULT_SERVER_URL || "https://server.bymrefitted.com/";
const DEFAULT_CDN_URL = process.env.DEFAULT_CDN_URL || "https://cdn.bymrefitted.com/";

// Enable permissive CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: false
}));

// Simple cookie parser helper
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.trim().split("=");
    if (parts.length >= 2) {
      cookies[parts[0]] = decodeURIComponent(parts.slice(1).join("="));
    }
  });
  return cookies;
}

// Serve public static directory with explicit MIME types
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".wasm")) {
      res.setHeader("Content-Type", "application/wasm");
    } else if (filePath.endsWith(".swf")) {
      res.setHeader("Content-Type", "application/x-shockwave-flash");
    }
  }
}));

// Fallback: serve Ruffle directly from node_modules if needed
const ruffleNodeModules = path.join(__dirname, "node_modules", "@ruffle-rs", "ruffle");
if (fs.existsSync(ruffleNodeModules)) {
  app.use("/vendor/ruffle", express.static(ruffleNodeModules, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".wasm")) {
        res.setHeader("Content-Type", "application/wasm");
      }
    }
  }));
}

// API: Config
app.get("/api/launcher/config", (req, res) => {
  res.json({
    defaultServerUrl: DEFAULT_SERVER_URL,
    defaultCdnUrl: DEFAULT_CDN_URL,
    availableServers: [
      {
        id: "official",
        name: "Servidor Oficial Refitted",
        serverUrl: "https://server.bymrefitted.com/",
        cdnUrl: "https://cdn.bymrefitted.com/",
        description: "Servidores públicos mantenidos por el equipo de BYM Refitted"
      },
      {
        id: "local",
        name: "Servidor Local / Auto-hospedado",
        serverUrl: "http://localhost:3001/",
        cdnUrl: "http://localhost:3001/",
        description: "Servidor corriendo en tu misma máquina o red local"
      }
    ]
  });
});

// Helper function to resolve target URL
function resolveTargetUrl(req, defaultUrl, cookieKey) {
  const cookies = parseCookies(req.headers.cookie);
  let target = req.query.target || req.headers["x-target-server"] || cookies[cookieKey] || defaultUrl;
  if (!target.endsWith("/")) target += "/";
  return target;
}

// API: Ping target server
app.get("/api/launcher/ping", async (req, res) => {
  const target = req.query.target || DEFAULT_SERVER_URL;
  const startTime = Date.now();
  
  try {
    const targetUrl = new URL(target.endsWith("/") ? target + "connection" : target + "/connection");
    const client = targetUrl.protocol === "https:" ? https : http;

    const request = client.request(targetUrl, {
      method: "GET",
      timeout: 5000,
      headers: {
        "User-Agent": "BYMR-Web-Launcher/1.0"
      }
    }, (response) => {
      const latency = Date.now() - startTime;
      res.json({
        ok: response.statusCode >= 200 && response.statusCode < 400,
        statusCode: response.statusCode,
        latencyMs: latency,
        target: target
      });
    });

    request.on("error", (err) => {
      res.json({
        ok: false,
        error: err.message,
        latencyMs: Date.now() - startTime,
        target: target
      });
    });

    request.on("timeout", () => {
      request.destroy();
      res.json({
        ok: false,
        error: "Timeout al conectar al servidor",
        latencyMs: 5000,
        target: target
      });
    });

    request.end();
  } catch (err) {
    res.json({
      ok: false,
      error: "URL inválida: " + err.message,
      latencyMs: 0,
      target: target
    });
  }
});

// JSON body parser for API helper routes only
const jsonParser = express.json({ limit: "10mb" });

// API: Proxy login
app.post("/api/launcher/login", jsonParser, async (req, res) => {
  const { serverUrl, email, password, token, sessionType = "game" } = req.body;
  const targetServer = (serverUrl || DEFAULT_SERVER_URL).replace(/\/$/, "");
  const loginUrl = `${targetServer}/api/v1.9.2-beta/player/getinfo`;

  try {
    const parsedUrl = new URL(loginUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const payload = JSON.stringify({ email, password, token, sessionType });

    const proxyReq = client.request(parsedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "User-Agent": "BYMR-Web-Launcher/1.0"
      },
      timeout: 10000
    }, (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => { data += chunk; });
      proxyRes.on("end", () => {
        try {
          const json = JSON.parse(data);
          res.status(proxyRes.statusCode).json(json);
        } catch (e) {
          res.status(proxyRes.statusCode).send(data);
        }
      });
    });

    proxyReq.on("error", (err) => {
      res.status(502).json({ error: 1, message: "Error conectando al servidor de autenticación: " + err.message });
    });

    proxyReq.write(payload);
    proxyReq.end();
  } catch (err) {
    res.status(400).json({ error: 1, message: "URL inválida: " + err.message });
  }
});

// Generic forwarder function for reverse proxy
function forwardProxyRequest(req, res, targetBase) {
  let relativePath = req.url;
  // Remove query param `target` if present so it's not forwarded to backend
  try {
    const parsedRel = new URL(relativePath, "http://localhost");
    parsedRel.searchParams.delete("target");
    relativePath = parsedRel.pathname + (parsedRel.search ? parsedRel.search : "");
  } catch (e) {}

  // Clean double slashes
  if (relativePath.startsWith("/")) relativePath = relativePath.slice(1);
  const targetFullUrl = new URL(relativePath, targetBase);
  const client = targetFullUrl.protocol === "https:" ? https : http;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["content-length"]; // let Node recompute if chunked

  headers["host"] = targetFullUrl.host;
  headers["x-forwarded-for"] = req.ip || req.connection.remoteAddress;
  headers["x-forwarded-proto"] = req.protocol;

  const proxyReq = client.request(targetFullUrl, {
    method: req.method,
    headers: headers,
    timeout: 30000
  }, (proxyRes) => {
    // Add CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    // Pass through status and headers
    res.status(proxyRes.statusCode);
    for (const [key, val] of Object.entries(proxyRes.headers)) {
      if (key.toLowerCase() !== "access-control-allow-origin") {
        res.setHeader(key, val);
      }
    }

    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[Proxy Error] ${req.method} ${targetFullUrl.toString()} - ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({
        error: 502,
        message: `Error al comunicar con ${targetFullUrl.host}: ${err.message}`
      });
    }
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 504, message: "Tiempo de espera agotado en el servidor remoto" });
    }
  });

  // Pipe incoming request body to the proxy request
  req.pipe(proxyReq);
}

// Reverse Proxy: Server API
app.use("/proxy/server", (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    return res.status(204).end();
  }

  const targetBase = resolveTargetUrl(req, DEFAULT_SERVER_URL, "bymr_target_server");
  forwardProxyRequest(req, res, targetBase);
});

// Reverse Proxy: CDN Assets
app.use("/proxy/cdn", (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    return res.status(204).end();
  }

  const targetBase = resolveTargetUrl(req, DEFAULT_CDN_URL, "bymr_target_cdn");
  forwardProxyRequest(req, res, targetBase);
});

// Catch-all route to serve the launcher UI for single-page experience
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start HTTP server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
======================================================
  Backyard Monsters Refitted - Web Launcher & Proxy
======================================================
  Launcher Web UI:   http://localhost:${PORT}
  Default Server:    ${DEFAULT_SERVER_URL}
  Default CDN:       ${DEFAULT_CDN_URL}
  Status:            ONLINE & READY FOR CLOUDFLARE TUNNEL
======================================================
  `);
});
