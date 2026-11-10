export const DEFAULT_OFFICIAL_SERVER = "https://server.bymrefitted.com/";
export const DEFAULT_OFFICIAL_CDN = "https://cdn.bymrefitted.com/";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

/**
 * Safely read an environment variable in Netlify Edge Functions.
 */
export function getEnv(name, fallback = "") {
  try {
    const val = globalThis.Netlify?.env?.get(name);
    if (val !== undefined && val !== "") return val;
  } catch (_) {}
  return fallback;
}

/**
 * Ensure a URL string ends with a trailing slash.
 */
export function ensureTrailingSlash(url) {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
}

function safeDecode(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function readCookie(request, context, key) {
  const ctxCookie = context?.cookies?.get?.(key);
  if (ctxCookie) return safeDecode(ctxCookie);

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return "";

  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0 && part.slice(0, idx).trim() === key) {
      return safeDecode(part.slice(idx + 1).trim());
    }
  }
  return "";
}

/**
 * Resolve the target upstream base URL from query params, headers, cookies, or defaults.
 */
export function resolveTargetUrl(request, context, defaultUrl, cookieKey) {
  const reqUrl = new URL(request.url);
  const raw =
    reqUrl.searchParams.get("target") ||
    request.headers.get("x-target-server") ||
    readCookie(request, context, cookieKey) ||
    defaultUrl;

  return ensureTrailingSlash(raw.trim());
}

/**
 * Resolve Cloudflare Access service token headers and any custom authorization header.
 */
export function resolveGatewayHeaders(request, context, overrides = {}) {
  const headers = {};

  const cfClientId =
    overrides.cfClientId ||
    request.headers.get("x-cf-access-client-id") ||
    readCookie(request, context, "bymr_cf_client_id") ||
    getEnv("CF_ACCESS_CLIENT_ID");

  const cfClientSecret =
    overrides.cfClientSecret ||
    request.headers.get("x-cf-access-client-secret") ||
    readCookie(request, context, "bymr_cf_client_secret") ||
    getEnv("CF_ACCESS_CLIENT_SECRET");

  if (cfClientId) headers["CF-Access-Client-Id"] = cfClientId;
  if (cfClientSecret) headers["CF-Access-Client-Secret"] = cfClientSecret;

  const customAuth =
    overrides.customAuthHeader ||
    request.headers.get("x-custom-auth-header") ||
    readCookie(request, context, "bymr_custom_auth_header");

  if (customAuth) {
    const colonIdx = customAuth.indexOf(":");
    if (colonIdx > 0) {
      const key = customAuth.slice(0, colonIdx).trim();
      const val = customAuth.slice(colonIdx + 1).trim();
      if (key && val) headers[key] = val;
    }
  }

  return headers;
}

export function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
