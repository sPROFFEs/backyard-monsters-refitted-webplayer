// Backyard Monsters Refitted - Web Launcher Engine
(function() {
  "use strict";

  const isGitHubPages =
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith(".github.io") ||
      window.location.hostname.endsWith(".githubpages.io") ||
      window.location.hostname.includes("pages.dev"));

  function resolveInitialRenderer() {
    const saved = localStorage.getItem("bymr_renderer");
    if (!saved || saved === "webgl" || saved === "canvas") {
      if (saved) localStorage.setItem("bymr_renderer", "wgpu-webgl");
      return "wgpu-webgl";
    }
    return saved;
  }

  function resolveInitialProxyMode() {
    const saved = localStorage.getItem("bymr_proxy_mode");
    if (saved) return saved;
    return isGitHubPages ? "direct" : "proxy";
  }

  // Application State
  const state = {
    serverUrl: localStorage.getItem("bymr_server_url") || "https://server.bymrefitted.com/",
    cdnUrl: localStorage.getItem("bymr_cdn_url") || "https://cdn.bymrefitted.com/",
    proxyMode: resolveInitialProxyMode(),
    token: localStorage.getItem("bymr_auth_token") || "",
    cfClientId: localStorage.getItem("bymr_cf_client_id") || "",
    cfClientSecret: localStorage.getItem("bymr_cf_client_secret") || "",
    customAuthHeader: localStorage.getItem("bymr_custom_auth_header") || "",
    userProfile: null,
    language: localStorage.getItem("bymr_language") || "english",
    scale: localStorage.getItem("bymr_scale") || "fitted",
    renderer: resolveInitialRenderer(),
    quality: localStorage.getItem("bymr_quality") || "medium",
    fontRenderer: localStorage.getItem("bymr_font_renderer") || "embedded",
    directCdn: localStorage.getItem("bymr_direct_cdn") !== "false",
    preset: localStorage.getItem("bymr_preset") || "official",
    rufflePlayer: null,
    isPinging: false,
    pingMs: null,
    serverOnline: false,
    runtimeName: isGitHubPages ? "github-pages" : "node",
    proxyLabel: isGitHubPages ? "Direct Browser" : "Edge Proxy"
  };

  try {
    const savedUser = localStorage.getItem("bymr_user_profile");
    if (savedUser) state.userProfile = JSON.parse(savedUser);
  } catch (e) {}

  // DOM Elements
  const elements = {
    // Header & Badges
    statusDot: document.getElementById("statusDot"),
    endpointBadge: document.getElementById("endpointBadge"),
    currentEndpointDisplay: document.getElementById("currentEndpointDisplay"),
    btnOpenSettings: document.getElementById("btnOpenSettings"),
    btnOpenAuth: document.getElementById("btnOpenAuth"),
    userPill: document.getElementById("userPill"),
    userPillName: document.getElementById("userPillName"),
    btnLogout: document.getElementById("btnLogout"),
    btnToggleFullscreen: document.getElementById("btnToggleFullscreen"),
    btnExitFullscreen: document.getElementById("btnExitFullscreen"),
    fullscreenIcon: document.getElementById("fullscreenIcon"),

    // Viewport
    playerWrapper: document.getElementById("playerWrapper"),
    gameViewport: document.getElementById("gameViewport"),
    ruffleContainer: document.getElementById("ruffleContainer"),
    loadingSplash: document.getElementById("loadingSplash"),
    splashStatusText: document.getElementById("splashStatusText"),

    // Settings Modal & Tabs
    settingsModal: document.getElementById("settingsModal"),
    btnCloseSettings: document.getElementById("btnCloseSettings"),
    btnCancelSettings: document.getElementById("btnCancelSettings"),
    btnSaveSettings: document.getElementById("btnSaveSettings"),
    settingsTabButtons: document.querySelectorAll(".settings-tab-btn"),
    settingsPanels: document.querySelectorAll(".settings-panel"),

    // Settings -> Game & Display
    scaleSelect: document.getElementById("scaleSelect"),
    langSelect: document.getElementById("langSelect"),
    rendererSelect: document.getElementById("rendererSelect"),
    qualitySelect: document.getElementById("qualitySelect"),
    fontRendererSelect: document.getElementById("fontRendererSelect"),
    btnReloadGame: document.getElementById("btnReloadGame"),

    // Settings -> Server & Gateway
    btnResetOfficial: document.getElementById("btnResetOfficial"),
    inputServerUrl: document.getElementById("inputServerUrl"),
    inputCdnUrl: document.getElementById("inputCdnUrl"),
    inputCfClientId: document.getElementById("inputCfClientId"),
    inputCfClientSecret: document.getElementById("inputCfClientSecret"),
    inputCustomAuthHeader: document.getElementById("inputCustomAuthHeader"),
    gatewayToggle: document.getElementById("gatewayToggle"),
    gatewayToggleArrow: document.getElementById("gatewayToggleArrow"),
    gatewayContent: document.getElementById("gatewayContent"),
    btnTestConnection: document.getElementById("btnTestConnection"),
    testResultText: document.getElementById("testResultText"),
    presetCards: document.querySelectorAll(".preset-card"),
    proxyRadios: document.querySelectorAll("input[name='proxyMode']"),
    directCdnCheck: document.getElementById("directCdnCheck"),

    // Settings -> Diagnostics & Logs
    diagRuntime: document.getElementById("diagRuntime"),
    connectionModeTag: document.getElementById("connectionModeTag"),
    pingDisplay: document.getElementById("pingDisplay"),
    diagApiUrl: document.getElementById("diagApiUrl"),
    diagCdnUrl: document.getElementById("diagCdnUrl"),
    consoleLogs: document.getElementById("consoleLogs"),
    btnClearLogs: document.getElementById("btnClearLogs"),

    // Auth Modal
    authModal: document.getElementById("authModal"),
    btnCloseAuth: document.getElementById("btnCloseAuth"),
    formCredentials: document.getElementById("formCredentials"),
    authEmail: document.getElementById("authEmail"),
    authPassword: document.getElementById("authPassword"),
    authRemember: document.getElementById("authRemember"),
    authErrorMsg: document.getElementById("authErrorMsg"),
    btnPlayAsGuest: document.getElementById("btnPlayAsGuest"),
    formToken: document.getElementById("formToken"),
    authTokenInput: document.getElementById("authTokenInput"),
    btnCancelToken: document.getElementById("btnCancelToken"),
    tabButtons: document.querySelectorAll(".tab-btn"),
    tabContents: document.querySelectorAll(".tab-content")
  };

  function log(msg, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${timestamp}] ${msg}`;
    elements.consoleLogs.appendChild(entry);
    elements.consoleLogs.scrollTop = elements.consoleLogs.scrollHeight;
    console.log(`[BYMR Launcher] ${msg}`);
  }

  function ensureTrailingSlash(url) {
    if (!url) return "";
    return url.endsWith("/") ? url : url + "/";
  }

  function updateProxyCookies() {
    document.cookie = `bymr_target_server=${encodeURIComponent(state.serverUrl)}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `bymr_target_cdn=${encodeURIComponent(state.cdnUrl)}; path=/; max-age=31536000; SameSite=Lax`;

    if (state.cfClientId) {
      document.cookie = `bymr_cf_client_id=${encodeURIComponent(state.cfClientId)}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = "bymr_cf_client_id=; path=/; max-age=0";
    }

    if (state.cfClientSecret) {
      document.cookie = `bymr_cf_client_secret=${encodeURIComponent(state.cfClientSecret)}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = "bymr_cf_client_secret=; path=/; max-age=0";
    }

    if (state.customAuthHeader) {
      document.cookie = `bymr_custom_auth_header=${encodeURIComponent(state.customAuthHeader)}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = "bymr_custom_auth_header=; path=/; max-age=0";
    }

    if (state.proxyMode === "proxy") {
      log(`Proxy target updated: server=${state.serverUrl}`, "info");
      if (state.cfClientId) {
        log("Cloudflare Access Service Token attached to proxy headers", "info");
      }
    } else {
      log(`Connection target: server=${state.serverUrl} [direct]`, "info");
    }
  }

  function updateDiagnosticsUI(effectiveServerUrl, effectiveCdnUrl) {
    elements.diagRuntime.textContent = state.runtimeName;
    elements.connectionModeTag.textContent =
      state.proxyMode === "proxy" ? state.proxyLabel : "Direct Connection";
    if (effectiveServerUrl) elements.diagApiUrl.textContent = effectiveServerUrl;
    if (effectiveCdnUrl) elements.diagCdnUrl.textContent = effectiveCdnUrl;
  }

  async function pingServer(targetUrl = state.serverUrl) {
    elements.statusDot.className = "status-dot status-checking";
    let hostname = targetUrl;
    try {
      hostname = new URL(targetUrl).hostname;
    } catch (_) {}
    elements.currentEndpointDisplay.textContent = hostname;
    elements.pingDisplay.textContent = "Checking...";

    async function directPing() {
      const startTime = performance.now();
      const testUrl = ensureTrailingSlash(targetUrl) + "connection";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      try {
        const res = await fetch(testUrl, {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const latency = Math.max(1, Math.round(performance.now() - startTime));
        if (res.ok) {
          state.serverOnline = true;
          state.pingMs = latency;
          elements.statusDot.className = "status-dot status-online";
          elements.pingDisplay.textContent = `${latency} ms`;
          elements.endpointBadge.title = `${hostname} (${latency} ms) - Click for Server Settings`;
          log(`Ping to ${targetUrl} successful (${latency}ms) [direct]`, "success");
          return { ok: true, latency };
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        state.serverOnline = false;
        elements.statusDot.className = "status-dot status-offline";
        elements.pingDisplay.textContent = "Offline";
        elements.endpointBadge.title = `${hostname} (Offline) - Click for Server Settings`;
        const errMsg = err.name === "AbortError" ? "Timed out (7s)" : err.message;
        log(`Ping to ${targetUrl} failed: ${errMsg}`, "warn");
        return { ok: false, error: errMsg };
      }
    }

    if (state.proxyMode === "direct" || isGitHubPages) {
      return await directPing();
    }

    try {
      const headers = {};
      if (state.cfClientId) headers["x-cf-access-client-id"] = state.cfClientId;
      if (state.cfClientSecret) headers["x-cf-access-client-secret"] = state.cfClientSecret;
      if (state.customAuthHeader) headers["x-custom-auth-header"] = state.customAuthHeader;

      const pingUrl = `/api/launcher/ping?target=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(pingUrl, { headers }).catch(() => null);
      if (!res || !res.ok) {
        return await directPing();
      }

      const data = await res.json().catch(() => null);
      if (!data) return await directPing();

      if (data.ok) {
        state.serverOnline = true;
        state.pingMs = data.latencyMs;
        elements.statusDot.className = "status-dot status-online";
        elements.pingDisplay.textContent = `${data.latencyMs} ms`;
        elements.endpointBadge.title = `${hostname} (${data.latencyMs} ms) - Click for Server Settings`;
        log(`Ping to ${targetUrl} successful (${data.latencyMs}ms)`, "success");
        return { ok: true, latency: data.latencyMs };
      } else {
        state.serverOnline = false;
        elements.statusDot.className = "status-dot status-offline";
        elements.pingDisplay.textContent = "Offline";
        elements.endpointBadge.title = `${hostname} (Offline) - Click for Server Settings`;
        log(`Ping to ${targetUrl} failed: ${data.error || "HTTP " + data.statusCode}`, "warn");
        return { ok: false, error: data.error || `HTTP ${data.statusCode}` };
      }
    } catch (err) {
      return await directPing();
    }
  }

  function updateAuthUI() {
    if (state.token && state.userProfile) {
      elements.userPill.classList.remove("hidden");
      elements.btnOpenAuth.classList.add("hidden");
      elements.userPillName.textContent = state.userProfile.username || "Player";
      elements.userPill.title = `ID: ${state.userProfile.userId || state.userProfile.userid} | Level: ${state.userProfile.level || 1}`;
    } else if (state.token) {
      elements.userPill.classList.remove("hidden");
      elements.btnOpenAuth.classList.add("hidden");
      elements.userPillName.textContent = "Token Active";
      elements.userPill.title = "Logged in using direct session token";
    } else {
      elements.userPill.classList.add("hidden");
      elements.btnOpenAuth.classList.remove("hidden");
    }
  }

  function clearStoredSession() {
    state.token = "";
    state.userProfile = null;
    localStorage.removeItem("bymr_auth_token");
    localStorage.removeItem("bymr_user_profile");
    updateAuthUI();
  }

  async function callAuthEndpoint(authPayload) {
    const isDirect = state.proxyMode === "direct" || isGitHubPages;
    const endpoint =
      isDirect
        ? ensureTrailingSlash(state.serverUrl) + "api/v1.9.2-beta/player/getinfo"
        : "/api/launcher/login";

    const body =
      isDirect
        ? authPayload
        : {
            serverUrl: state.serverUrl,
            cfClientId: state.cfClientId,
            cfClientSecret: state.cfClientSecret,
            customAuthHeader: state.customAuthHeader,
            ...authPayload
          };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function validateStoredToken() {
    if (!state.token) return;

    try {
      const { res, data } = await callAuthEndpoint({
        token: state.token,
        sessionType: "launcher"
      });

      if (res.ok && data.token) {
        state.token = data.token;
        state.userProfile = data;
        localStorage.setItem("bymr_auth_token", data.token);
        localStorage.setItem("bymr_user_profile", JSON.stringify(data));
        updateAuthUI();
        log(`Session verified for ${data.username || "player"}`, "success");
      } else if (res.status === 401 || res.status === 403 || data.error) {
        clearStoredSession();
        log("Saved session expired or was invalidated; cleared stored token.", "warn");
      }
    } catch (err) {
      log(`Could not verify saved session: ${err.message}`, "warn");
    }
  }

  function applyScale(scaleMode) {
    state.scale = scaleMode;
    localStorage.setItem("bymr_scale", scaleMode);
    elements.gameViewport.className = `game-viewport scale-${scaleMode}`;
    elements.scaleSelect.value = scaleMode;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      elements.playerWrapper.requestFullscreen().then(() => {
        document.body.classList.add("is-fullscreen");
        elements.fullscreenIcon.textContent = "[X]";
      }).catch(err => {
        log(`Error entering fullscreen: ${err.message}`, "error");
      });
    } else {
      document.exitFullscreen().then(() => {
        document.body.classList.remove("is-fullscreen");
        elements.fullscreenIcon.textContent = "[ ]";
      });
    }
  }

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove("is-fullscreen");
      elements.fullscreenIcon.textContent = "[ ]";
    }
  });

  async function launchGame() {
    log("Starting Backyard Monsters client...", "info");
    updateProxyCookies();

    elements.loadingSplash.classList.remove("hidden");
    elements.splashStatusText.textContent = "Initializing Ruffle Flash emulator...";

    const targetCdnUrl = ensureTrailingSlash(state.cdnUrl);
    let effectiveServerUrl;
    let effectiveCdnUrl;

    if (state.proxyMode === "proxy") {
      effectiveServerUrl = ensureTrailingSlash(window.location.origin + "/proxy/server");
      const hasGatewayAuth = Boolean(state.cfClientId || state.cfClientSecret || state.customAuthHeader);
      if (state.directCdn && !hasGatewayAuth && targetCdnUrl.startsWith("https://")) {
        effectiveCdnUrl = targetCdnUrl;
      } else {
        effectiveCdnUrl = ensureTrailingSlash(window.location.origin + "/proxy/cdn");
      }
    } else {
      effectiveServerUrl = ensureTrailingSlash(state.serverUrl);
      effectiveCdnUrl = targetCdnUrl;
    }

    updateDiagnosticsUI(effectiveServerUrl, effectiveCdnUrl);
    log(`Game API Endpoint: ${effectiveServerUrl}`, "info");
    log(`Asset CDN Endpoint: ${effectiveCdnUrl}`, "info");

    if (state.rufflePlayer) {
      try {
        state.rufflePlayer.remove();
      } catch (e) {}
      state.rufflePlayer = null;
      await new Promise(resolve => setTimeout(resolve, 120));
    }

    if (!window.RufflePlayer) {
      elements.splashStatusText.textContent = "Downloading Ruffle WebAssembly runtime...";
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!window.RufflePlayer) {
        elements.splashStatusText.textContent = "Error: Ruffle could not be loaded. Check Diagnostics.";
        log("window.RufflePlayer not found on page", "error");
        return;
      }
    }

    try {
      const ruffle = window.RufflePlayer.newest();
      const player = ruffle.createPlayer();
      state.rufflePlayer = player;
      player.id = "bymrFlashPlayer";

      // Keep allowScriptAccess disabled so ExternalInterface.available is false,
      // which sets GLOBAL._local = true inside the BYMR client and enables HTTP/launcher auth.
      const ruffleConfig = {
        autoplay: "on",
        unmuteOverlay: "hidden",
        letterbox: "on",
        wmode: "opaque",
        backgroundColor: "#000000",
        warnOnUnsupportedContent: false,
        allowScriptAccess: false,
        quality: state.quality || "medium",
        deviceFontRenderer: state.fontRenderer || "embedded",
        parameters: {
          serverUrl: effectiveServerUrl,
          cdnUrl: effectiveCdnUrl,
          token: state.token || "",
          language: state.language || "english"
        }
      };
      if (state.renderer && state.renderer !== "auto" && state.renderer !== "webgl" && state.renderer !== "canvas") {
        ruffleConfig.preferredRenderer = state.renderer;
      }

      player.config = ruffleConfig;

      elements.ruffleContainer.appendChild(player);

      const swfUrl = new URL("swfs/bymr-client.swf?v=1.9.2-beta", window.location.href).href;
      elements.splashStatusText.textContent = "Loading BYMR client SWF (v1.9.2-beta)...";
      await player.load(Object.assign({ url: swfUrl }, ruffleConfig));

      elements.loadingSplash.classList.add("hidden");
      log("Client SWF loaded successfully in Ruffle", "success");

      player.addEventListener("loadedmetadata", () => {
        log(`SWF metadata: ${player.metadata?.width}x${player.metadata?.height} @ ${player.metadata?.frameRate} FPS`, "info");
      });
    } catch (err) {
      elements.splashStatusText.textContent = `Error loading game: ${err.message}`;
      log(`Error mounting Ruffle: ${err.message}`, "error");
    }
  }

  function applyPreset(presetId) {
    state.preset = presetId;
    elements.presetCards.forEach(c => {
      if (c.dataset.preset === presetId) c.classList.add("active");
      else c.classList.remove("active");
    });

    if (presetId === "official") {
      elements.inputServerUrl.value = "https://server.bymrefitted.com/";
      elements.inputCdnUrl.value = "https://cdn.bymrefitted.com/";
      elements.inputServerUrl.disabled = true;
      elements.inputCdnUrl.disabled = true;
    } else if (presetId === "local") {
      elements.inputServerUrl.value = "http://localhost:3001/";
      elements.inputCdnUrl.value = "http://localhost:3001/";
      elements.inputServerUrl.disabled = true;
      elements.inputCdnUrl.disabled = true;
    } else {
      elements.inputServerUrl.disabled = false;
      elements.inputCdnUrl.disabled = false;
      if (!elements.inputServerUrl.value) elements.inputServerUrl.value = state.serverUrl;
      if (!elements.inputCdnUrl.value) elements.inputCdnUrl.value = state.cdnUrl;
    }
  }

  function switchSettingsTab(tabName) {
    elements.settingsTabButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.settingsTab === tabName);
    });
    const targetPanelId = `settingsPanel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
    elements.settingsPanels.forEach(panel => {
      panel.classList.toggle("active", panel.id === targetPanelId);
    });
  }

  function openSettingsModal(initialTab = "game") {
    elements.scaleSelect.value = state.scale;
    elements.langSelect.value = state.language;
    elements.rendererSelect.value = state.renderer;
    elements.qualitySelect.value = state.quality;
    elements.fontRendererSelect.value = state.fontRenderer;
    elements.directCdnCheck.checked = state.directCdn;
    elements.inputServerUrl.value = state.serverUrl;
    elements.inputCdnUrl.value = state.cdnUrl;
    elements.inputCfClientId.value = state.cfClientId || "";
    elements.inputCfClientSecret.value = state.cfClientSecret || "";
    elements.inputCustomAuthHeader.value = state.customAuthHeader || "";
    elements.testResultText.textContent = "";

    elements.proxyRadios.forEach(r => {
      r.checked = r.value === state.proxyMode;
    });

    applyPreset(state.preset);
    switchSettingsTab(initialTab);
    elements.settingsModal.classList.remove("hidden");
  }

  // Settings Modal Listeners
  elements.btnOpenSettings.addEventListener("click", () => openSettingsModal("game"));
  elements.endpointBadge.addEventListener("click", () => openSettingsModal("server"));
  elements.btnCloseSettings.addEventListener("click", () => elements.settingsModal.classList.add("hidden"));
  elements.btnCancelSettings.addEventListener("click", () => elements.settingsModal.classList.add("hidden"));

  elements.settingsTabButtons.forEach(btn => {
    btn.addEventListener("click", () => switchSettingsTab(btn.dataset.settingsTab));
  });

  if (elements.btnResetOfficial) {
    elements.btnResetOfficial.addEventListener("click", () => {
      applyPreset("official");
      elements.testResultText.textContent = "";
      log("Reset to default official server (bymrefitted.com)", "info");
    });
  }

  if (elements.gatewayToggle) {
    elements.gatewayToggle.addEventListener("click", () => {
      elements.gatewayContent.classList.toggle("hidden");
      elements.gatewayToggleArrow.textContent = elements.gatewayContent.classList.contains("hidden") ? "+" : "-";
    });
  }

  elements.inputServerUrl.addEventListener("input", () => {
    if (state.preset === "custom") {
      const val = elements.inputServerUrl.value.trim();
      elements.inputCdnUrl.placeholder = val || "https://cdn.bymrefitted.com/";
    }
  });

  elements.presetCards.forEach(card => {
    card.addEventListener("click", () => applyPreset(card.dataset.preset));
  });

  elements.btnTestConnection.addEventListener("click", async () => {
    const testUrl = elements.inputServerUrl.value.trim();
    if (!testUrl) return;

    elements.testResultText.className = "test-result";
    elements.testResultText.textContent = "Testing connection...";

    state.cfClientId = elements.inputCfClientId.value.trim();
    state.cfClientSecret = elements.inputCfClientSecret.value.trim();
    state.customAuthHeader = elements.inputCustomAuthHeader.value.trim();

    const res = await pingServer(testUrl);
    if (res.ok) {
      elements.testResultText.className = "test-result test-success";
      elements.testResultText.textContent = `Connection successful (${res.latency} ms)`;
    } else {
      elements.testResultText.className = "test-result test-error";
      elements.testResultText.textContent = `Unreachable (${res.error})`;
    }
  });

  // Live preview scale changes immediately
  elements.scaleSelect.addEventListener("change", (e) => applyScale(e.target.value));

  // Reload button inside Settings
  elements.btnReloadGame.addEventListener("click", async () => {
    elements.settingsModal.classList.add("hidden");
    log("Reloading game instance...", "info");
    await validateStoredToken();
    launchGame();
  });

  // Save & Apply in Settings Modal
  elements.btnSaveSettings.addEventListener("click", () => {
    const newServer = ensureTrailingSlash(elements.inputServerUrl.value.trim());
    const newCdn = ensureTrailingSlash(elements.inputCdnUrl.value.trim() || newServer);
    const newLang = elements.langSelect.value;
    const newRenderer = elements.rendererSelect.value;
    const newQuality = elements.qualitySelect.value;
    const newFontRenderer = elements.fontRendererSelect.value;
    const newDirectCdn = elements.directCdnCheck.checked;
    const newCfId = elements.inputCfClientId.value.trim();
    const newCfSecret = elements.inputCfClientSecret.value.trim();
    const newCustomHeader = elements.inputCustomAuthHeader.value.trim();

    let selectedMode = "proxy";
    elements.proxyRadios.forEach(r => { if (r.checked) selectedMode = r.value; });

    if (!newServer) {
      alert("Please enter a valid server URL.");
      return;
    }

    const prevServerUrl = state.serverUrl;
    const needsRestart =
      newServer !== state.serverUrl ||
      newCdn !== state.cdnUrl ||
      selectedMode !== state.proxyMode ||
      newLang !== state.language ||
      newRenderer !== state.renderer ||
      newQuality !== state.quality ||
      newFontRenderer !== state.fontRenderer ||
      newDirectCdn !== state.directCdn ||
      newCfId !== state.cfClientId ||
      newCfSecret !== state.cfClientSecret ||
      newCustomHeader !== state.customAuthHeader;

    state.serverUrl = newServer;
    state.cdnUrl = newCdn;
    state.proxyMode = selectedMode;
    state.language = newLang;
    state.renderer = newRenderer;
    state.quality = newQuality;
    state.fontRenderer = newFontRenderer;
    state.directCdn = newDirectCdn;
    state.cfClientId = newCfId;
    state.cfClientSecret = newCfSecret;
    state.customAuthHeader = newCustomHeader;

    localStorage.setItem("bymr_server_url", newServer);
    localStorage.setItem("bymr_cdn_url", newCdn);
    localStorage.setItem("bymr_proxy_mode", selectedMode);
    localStorage.setItem("bymr_preset", state.preset);
    localStorage.setItem("bymr_language", newLang);
    localStorage.setItem("bymr_renderer", newRenderer);
    localStorage.setItem("bymr_quality", newQuality);
    localStorage.setItem("bymr_font_renderer", newFontRenderer);
    localStorage.setItem("bymr_direct_cdn", String(newDirectCdn));
    localStorage.setItem("bymr_cf_client_id", newCfId);
    localStorage.setItem("bymr_cf_client_secret", newCfSecret);
    localStorage.setItem("bymr_custom_auth_header", newCustomHeader);

    elements.settingsModal.classList.add("hidden");
    log(`Settings saved. Server: ${newServer} [${selectedMode}]`, "success");

    if (needsRestart) {
      if (newServer !== prevServerUrl) {
        clearStoredSession();
      }
      pingServer();
      launchGame();
    }
  });

  // Auth Modal
  elements.btnOpenAuth.addEventListener("click", () => {
    elements.authErrorMsg.classList.add("hidden");
    elements.authModal.classList.remove("hidden");
  });

  elements.btnCloseAuth.addEventListener("click", () => elements.authModal.classList.add("hidden"));

  elements.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      elements.tabButtons.forEach(b => b.classList.remove("active"));
      elements.tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`form${btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)}`).classList.add("active");
    });
  });

  elements.formCredentials.addEventListener("submit", async (e) => {
    e.preventDefault();
    elements.authErrorMsg.classList.add("hidden");
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;

    log(`Authenticating user ${email} against ${state.serverUrl}...`, "info");
    const submitBtn = document.getElementById("btnSubmitLogin");
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    try {
      const { data } = await callAuthEndpoint({
        email,
        password,
        sessionType: "launcher"
      });
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In & Play";

      if (data.token) {
        state.token = data.token;
        state.userProfile = data;
        localStorage.setItem("bymr_auth_token", data.token);
        if (elements.authRemember.checked) {
          localStorage.setItem("bymr_user_profile", JSON.stringify(data));
        }

        log(`Logged in successfully! User: ${data.username} (ID: ${data.userId || data.userid})`, "success");
        updateAuthUI();
        elements.authModal.classList.add("hidden");
        launchGame();
      } else {
        elements.authErrorMsg.textContent =
          data.message ||
          data.errorDetails?.message ||
          (typeof data.error === "string" ? data.error : null) ||
          "Invalid credentials or user not found.";
        elements.authErrorMsg.classList.remove("hidden");
        log(`Authentication error: ${elements.authErrorMsg.textContent}`, "warn");
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In & Play";
      elements.authErrorMsg.textContent = `Connection error: ${err.message}`;
      elements.authErrorMsg.classList.remove("hidden");
      log(`Login request failed: ${err.message}`, "error");
    }
  });

  elements.formToken.addEventListener("submit", (e) => {
    e.preventDefault();
    const token = elements.authTokenInput.value.trim();
    if (!token) return;

    state.token = token;
    state.userProfile = { username: "Token User" };
    localStorage.setItem("bymr_auth_token", token);
    updateAuthUI();
    elements.authModal.classList.add("hidden");
    log("Direct JWT session token applied", "success");
    launchGame();
  });

  elements.btnCancelToken.addEventListener("click", () => elements.authModal.classList.add("hidden"));

  elements.btnPlayAsGuest.addEventListener("click", () => {
    clearStoredSession();
    elements.authModal.classList.add("hidden");
    log("Starting guest / in-game authentication mode", "info");
    launchGame();
  });

  elements.btnLogout.addEventListener("click", () => {
    if (confirm("Do you want to sign out from this web launcher?")) {
      clearStoredSession();
      log("Signed out", "info");
      launchGame();
    }
  });

  elements.btnToggleFullscreen.addEventListener("click", toggleFullscreen);
  elements.btnExitFullscreen.addEventListener("click", toggleFullscreen);
  elements.btnClearLogs.addEventListener("click", () => { elements.consoleLogs.innerHTML = ""; });

  let initialized = false;
  async function init() {
    if (initialized) return;
    initialized = true;
    log("Initializing Backyard Monsters Refitted Web Launcher...", "info");
    applyScale(state.scale);
    updateAuthUI();

    let hasBackend = false;
    try {
      const configRes = await fetch("./api/launcher/config").catch(() => null);
      if (configRes && configRes.ok) {
        const config = await configRes.json();
        hasBackend = true;
        state.runtimeName = config.runtime || "node";
        state.proxyLabel = config.runtime === "netlify-edge" ? "Edge Proxy" : "Docker Proxy";
        if (!localStorage.getItem("bymr_server_url") && config.defaultServerUrl) {
          state.serverUrl = config.defaultServerUrl;
          state.cdnUrl = config.defaultCdnUrl || config.defaultServerUrl;
          if (state.serverUrl !== "https://server.bymrefitted.com/") {
            state.preset = "custom";
          }
        }
        log(`Server config loaded (${state.runtimeName}). Default server: ${config.defaultServerUrl}`, "info");
      }
    } catch (e) {
      hasBackend = false;
    }

    if (!hasBackend) {
      state.runtimeName = isGitHubPages ? "github-pages" : "static";
      state.proxyLabel = "Direct Browser";
      state.proxyMode = "direct";
      log(`Static environment detected (${state.runtimeName}). Operating in Direct Connection mode.`, "info");
    }

    pingServer();
    await validateStoredToken();
    launchGame();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
