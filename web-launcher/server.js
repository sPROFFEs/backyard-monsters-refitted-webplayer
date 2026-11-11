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
const DEFAULT_CF_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || "";
const DEFAULT_CF_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || "";

// Enable permissive CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: false
}));

// Cookie parser helper
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

// API: Configuration
app.get("/api/launcher/config", (req, res) => {
  res.json({
    defaultServerUrl: DEFAULT_SERVER_URL,
    defaultCdnUrl: DEFAULT_CDN_URL,
    hasDefaultCfAccess: Boolean(DEFAULT_CF_CLIENT_ID && DEFAULT_CF_CLIENT_SECRET),
    availableServers: [
      {
        id: "official",
        name: "Official Refitted Server",
        serverUrl: "https://server.bymrefitted.com/",
        cdnUrl: "https://cdn.bymrefitted.com/",
        description: "Official public servers maintained by the BYM Refitted team"
      },
      {
        id: "local",
        name: "Local / Self-Hosted Server",
        serverUrl: "http://localhost:3001/",
        cdnUrl: "http://localhost:3001/",
        description: "Private backend server running on your machine or local network"
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

// Helper function to resolve Cloudflare Access and custom gateway headers
function resolveGatewayHeaders(req) {
  const cookies = parseCookies(req.headers.cookie);
  const headers = {};

  const cfClientId = req.headers["x-cf-access-client-id"] || cookies["bymr_cf_client_id"] || DEFAULT_CF_CLIENT_ID;
  const cfClientSecret = req.headers["x-cf-access-client-secret"] || cookies["bymr_cf_client_secret"] || DEFAULT_CF_CLIENT_SECRET;

  if (cfClientId) {
    headers["CF-Access-Client-Id"] = cfClientId;
  }
  if (cfClientSecret) {
    headers["CF-Access-Client-Secret"] = cfClientSecret;
  }

  const customAuth = req.headers["x-custom-auth-header"] || cookies["bymr_custom_auth_header"];
  if (customAuth) {
    const colonIdx = customAuth.indexOf(":");
    if (colonIdx > 0) {
      const key = customAuth.substring(0, colonIdx).trim();
      const val = customAuth.substring(colonIdx + 1).trim();
      if (key && val) headers[key] = val;
    }
  }

  return headers;
}

// API: Ping target server
app.get("/api/launcher/ping", async (req, res) => {
  const target = req.query.target || DEFAULT_SERVER_URL;
  const startTime = Date.now();
  let settled = false;

  const finishPing = (payload) => {
    if (settled || res.headersSent) return;
    settled = true;
    res.json(payload);
  };

  try {
    const targetUrl = new URL(target.endsWith("/") ? target + "connection" : target + "/connection");
    const client = targetUrl.protocol === "https:" ? https : http;
    const gatewayHeaders = resolveGatewayHeaders(req);

    const request = client.request(targetUrl, {
      method: "GET",
      timeout: 5000,
      headers: {
        "User-Agent": "BYMR-Web-Launcher/1.0",
        ...gatewayHeaders
      }
    }, (response) => {
      const latency = Date.now() - startTime;
      response.resume();
      finishPing({
        ok: response.statusCode >= 200 && response.statusCode < 400,
        statusCode: response.statusCode,
        latencyMs: latency,
        target: target
      });
    });

    request.on("error", (err) => {
      finishPing({
        ok: false,
        error: err.message,
        latencyMs: Date.now() - startTime,
        target: target
      });
    });

    request.on("timeout", () => {
      request.destroy();
      finishPing({
        ok: false,
        error: "Connection timeout to remote server",
        latencyMs: 5000,
        target: target
      });
    });

    request.end();
  } catch (err) {
    finishPing({
      ok: false,
      error: "Invalid URL: " + err.message,
      latencyMs: 0,
      target: target
    });
  }
});

// JSON body parser for API helper routes only
const jsonParser = express.json({ limit: "10mb" });

// API: Proxy login
app.post("/api/launcher/login", jsonParser, async (req, res) => {
  const { serverUrl, email, password, token, sessionType = "game", cfClientId, cfClientSecret, customAuthHeader } = req.body;
  const targetServer = (serverUrl || DEFAULT_SERVER_URL).replace(/\/$/, "");
  const loginUrl = `${targetServer}/api/v1.9.2-beta/player/getinfo`;
  let settled = false;

  try {
    const parsedUrl = new URL(loginUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const payload = JSON.stringify({ email, password, token, sessionType });
    const gatewayHeaders = resolveGatewayHeaders(req);

    if (cfClientId) gatewayHeaders["CF-Access-Client-Id"] = cfClientId;
    if (cfClientSecret) gatewayHeaders["CF-Access-Client-Secret"] = cfClientSecret;
    if (customAuthHeader && customAuthHeader.includes(":")) {
      const [k, ...v] = customAuthHeader.split(":");
      gatewayHeaders[k.trim()] = v.join(":").trim();
    }

    const proxyReq = client.request(parsedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "User-Agent": "BYMR-Web-Launcher/1.0",
        ...gatewayHeaders
      },
      timeout: 10000
    }, (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => { data += chunk; });
      proxyRes.on("end", () => {
        if (settled || res.headersSent) return;
        settled = true;
        try {
          const json = JSON.parse(data);
          res.status(proxyRes.statusCode).json(json);
        } catch (e) {
          res.status(proxyRes.statusCode).send(data);
        }
      });
    });

    proxyReq.on("error", (err) => {
      if (settled || res.headersSent) return;
      settled = true;
      res.status(502).json({ error: 1, message: "Error connecting to auth server: " + err.message });
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      if (settled || res.headersSent) return;
      settled = true;
      res.status(504).json({ error: 1, message: "Gateway timeout connecting to auth server" });
    });

    proxyReq.write(payload);
    proxyReq.end();
  } catch (err) {
    if (!settled && !res.headersSent) {
      settled = true;
      res.status(400).json({ error: 1, message: "Invalid URL: " + err.message });
    }
  }
});

// Generic forwarder function for reverse proxy
function forwardProxyRequest(req, res, targetBase) {
  let relativePath = req.url;
  try {
    const parsedRel = new URL(relativePath, "http://localhost");
    parsedRel.searchParams.delete("target");
    relativePath = parsedRel.pathname + (parsedRel.search ? parsedRel.search : "");
  } catch (e) {}

  if (relativePath.startsWith("/")) relativePath = relativePath.slice(1);
  const targetFullUrl = new URL(relativePath, targetBase);
  const client = targetFullUrl.protocol === "https:" ? https : http;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["content-length"];

  headers["host"] = targetFullUrl.host;
  headers["x-forwarded-for"] = req.ip || req.connection.remoteAddress;
  headers["x-forwarded-proto"] = req.protocol;

  // Inject Cloudflare Access and custom gateway headers
  const gatewayHeaders = resolveGatewayHeaders(req);
  for (const [key, val] of Object.entries(gatewayHeaders)) {
    headers[key.toLowerCase()] = val;
  }

  const proxyReq = client.request(targetFullUrl, {
    method: req.method,
    headers: headers,
    timeout: 30000
  }, (proxyRes) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

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
        message: `Error communicating with ${targetFullUrl.host}: ${err.message}`
      });
    }
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 504, message: "Gateway timeout from remote server" });
    }
  });

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
------------------------------------------------------
  Backyard Monsters Refitted - Web Launcher & Proxy
------------------------------------------------------
  Launcher Web UI:   http://localhost:${PORT}
  Default Server:    ${DEFAULT_SERVER_URL}
  Default CDN:       ${DEFAULT_CDN_URL}
  CF Access Gateway: ${DEFAULT_CF_CLIENT_ID ? "Configured" : "Disabled (None)"}
  Status:            ONLINE & READY FOR CLOUDFLARE TUNNEL
------------------------------------------------------
  `);
});
