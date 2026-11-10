import {
  DEFAULT_OFFICIAL_CDN,
  DEFAULT_OFFICIAL_SERVER,
  corsPreflightResponse,
  ensureTrailingSlash,
  getEnv,
  jsonResponse,
  resolveGatewayHeaders
} from "../lib/gateway.js";

function handleConfig() {
  const defaultServerUrl = ensureTrailingSlash(getEnv("DEFAULT_SERVER_URL", DEFAULT_OFFICIAL_SERVER));
  const defaultCdnUrl = ensureTrailingSlash(getEnv("DEFAULT_CDN_URL", DEFAULT_OFFICIAL_CDN));
  const hasDefaultCfAccess = Boolean(getEnv("CF_ACCESS_CLIENT_ID") && getEnv("CF_ACCESS_CLIENT_SECRET"));

  return jsonResponse({
    defaultServerUrl,
    defaultCdnUrl,
    hasDefaultCfAccess,
    runtime: "netlify-edge",
    availableServers: [
      {
        id: "official",
        name: "Official Refitted Server",
        serverUrl: DEFAULT_OFFICIAL_SERVER,
        cdnUrl: DEFAULT_OFFICIAL_CDN,
        description: "Official public servers maintained by the BYM Refitted team"
      },
      {
        id: "local",
        name: "Local Server (Direct Browser Only)",
        serverUrl: "http://localhost:3001/",
        cdnUrl: "http://localhost:3001/",
        description: "Backend running on your local machine (requires Direct Connection mode)"
      }
    ]
  });
}

async function handlePing(request, context) {
  const reqUrl = new URL(request.url);
  const defaultServerUrl = ensureTrailingSlash(getEnv("DEFAULT_SERVER_URL", DEFAULT_OFFICIAL_SERVER));
  const target = reqUrl.searchParams.get("target") || defaultServerUrl;
  const startTime = Date.now();

  try {
    const base = ensureTrailingSlash(target);
    const targetUrl = new URL("connection", base);
    const gatewayHeaders = resolveGatewayHeaders(request, context);

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "BYMR-Web-Launcher/1.0",
        ...gatewayHeaders
      },
      signal: AbortSignal.timeout(5000)
    });

    const latencyMs = Date.now() - startTime;
    return jsonResponse({
      ok: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      latencyMs,
      target
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err?.name === "TimeoutError" ? "Connection timeout to remote server" : (err?.message || "Connection error"),
      latencyMs: Date.now() - startTime,
      target
    });
  }
}

async function handleLogin(request, context) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse({ error: 1, message: "Invalid JSON request body" }, 400);
  }

  const {
    serverUrl,
    email,
    password,
    token,
    sessionType = "game",
    cfClientId,
    cfClientSecret,
    customAuthHeader
  } = body;

  const defaultServerUrl = ensureTrailingSlash(getEnv("DEFAULT_SERVER_URL", DEFAULT_OFFICIAL_SERVER));
  const targetServer = (serverUrl || defaultServerUrl).replace(/\/$/, "");

  try {
    const loginUrl = new URL(`${targetServer}/api/v1.9.2-beta/player/getinfo`);
    const gatewayHeaders = resolveGatewayHeaders(request, context, {
      cfClientId,
      cfClientSecret,
      customAuthHeader
    });

    const response = await fetch(loginUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BYMR-Web-Launcher/1.0",
        ...gatewayHeaders
      },
      body: JSON.stringify({ email, password, token, sessionType }),
      signal: AbortSignal.timeout(10000)
    });

    const rawText = await response.text();
    try {
      const parsed = JSON.parse(rawText);
      return jsonResponse(parsed, response.status);
    } catch (_) {
      return new Response(rawText, {
        status: response.status,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  } catch (err) {
    return jsonResponse({
      error: 1,
      message: "Error connecting to auth server: " + (err?.message || "Unknown error")
    }, 502);
  }
}

export default async function handler(request, context) {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  const pathname = new URL(request.url).pathname;

  if (pathname === "/api/launcher/config" && request.method === "GET") {
    return handleConfig();
  }
  if (pathname === "/api/launcher/ping" && request.method === "GET") {
    return handlePing(request, context);
  }
  if (pathname === "/api/launcher/login" && request.method === "POST") {
    return handleLogin(request, context);
  }

  return jsonResponse({ error: 404, message: "Launcher API route not found" }, 404);
}
