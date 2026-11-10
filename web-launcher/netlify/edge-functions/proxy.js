import {
  CORS_HEADERS,
  DEFAULT_OFFICIAL_CDN,
  DEFAULT_OFFICIAL_SERVER,
  corsPreflightResponse,
  ensureTrailingSlash,
  getEnv,
  jsonResponse,
  resolveGatewayHeaders,
  resolveTargetUrl
} from "../lib/gateway.js";

const SAFE_FORWARD_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "if-modified-since",
  "if-none-match",
  "range",
  "user-agent"
];

export default async function handler(request, context) {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  const reqUrl = new URL(request.url);
  const isServerProxy = reqUrl.pathname.startsWith("/proxy/server");
  const isCdnProxy = reqUrl.pathname.startsWith("/proxy/cdn");

  if (!isServerProxy && !isCdnProxy) {
    return jsonResponse({ error: 404, message: "Unknown proxy route" }, 404);
  }

  const prefix = isServerProxy ? "/proxy/server" : "/proxy/cdn";
  const defaultUrl = isServerProxy
    ? ensureTrailingSlash(getEnv("DEFAULT_SERVER_URL", DEFAULT_OFFICIAL_SERVER))
    : ensureTrailingSlash(getEnv("DEFAULT_CDN_URL", DEFAULT_OFFICIAL_CDN));
  const cookieKey = isServerProxy ? "bymr_target_server" : "bymr_target_cdn";

  const targetBase = resolveTargetUrl(request, context, defaultUrl, cookieKey);

  let relativePath = reqUrl.pathname.slice(prefix.length);
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.slice(1);
  }

  const searchParams = new URLSearchParams(reqUrl.search);
  searchParams.delete("target");
  const queryString = searchParams.toString();
  if (queryString) {
    relativePath += `?${queryString}`;
  }

  let targetFullUrl;
  try {
    targetFullUrl = new URL(relativePath, targetBase);
  } catch (err) {
    return jsonResponse({ error: 400, message: "Invalid target URL: " + err.message }, 400);
  }

  const outgoingHeaders = new Headers();
  for (const name of SAFE_FORWARD_HEADERS) {
    const val = request.headers.get(name);
    if (val) outgoingHeaders.set(name, val);
  }

  const gatewayHeaders = resolveGatewayHeaders(request, context);
  for (const [key, val] of Object.entries(gatewayHeaders)) {
    outgoingHeaders.set(key, val);
  }

  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const buf = await request.arrayBuffer();
      if (buf.byteLength > 0) body = buf;
    } catch (_) {}
  }

  try {
    const proxyRes = await fetch(targetFullUrl.toString(), {
      method: request.method,
      headers: outgoingHeaders,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(30000)
    });

    const responseHeaders = new Headers(proxyRes.headers);
    // Deno fetch auto-decompresses response streams, so strip encoding/length headers to prevent browser decode errors
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    for (const [key, val] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, val);
    }

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      headers: responseHeaders
    });
  } catch (err) {
    const isTimeout = err?.name === "TimeoutError";
    return jsonResponse({
      error: isTimeout ? 504 : 502,
      message: isTimeout
        ? "Gateway timeout from remote server"
        : `Error communicating with ${targetFullUrl.host}: ${err?.message || "Unknown error"}`
    }, isTimeout ? 504 : 502);
  }
}
