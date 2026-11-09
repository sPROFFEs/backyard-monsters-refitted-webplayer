// Backyard Monsters Refitted - Web Launcher Engine
(function() {
  "use strict";

  // Application State
  const state = {
    serverUrl: localStorage.getItem("bymr_server_url") || "https://server.bymrefitted.com/",
    cdnUrl: localStorage.getItem("bymr_cdn_url") || "https://cdn.bymrefitted.com/",
    proxyMode: localStorage.getItem("bymr_proxy_mode") || "proxy",
    token: localStorage.getItem("bymr_auth_token") || "",
    userProfile: null,
    language: localStorage.getItem("bymr_language") || "spanish",
    scale: localStorage.getItem("bymr_scale") || "fitted",
    preset: localStorage.getItem("bymr_preset") || "official",
    rufflePlayer: null,
    isPinging: false,
    pingMs: null,
    serverOnline: false
  };

  try {
    const savedUser = localStorage.getItem("bymr_user_profile");
    if (savedUser) state.userProfile = JSON.parse(savedUser);
  } catch (e) {}

  // DOM Elements
  const elements = {
    // Header & Badges
    statusDot: document.getElementById("statusDot"),
    currentEndpointDisplay: document.getElementById("currentEndpointDisplay"),
    pingDisplay: document.getElementById("pingDisplay"),
    btnOpenSettings: document.getElementById("btnOpenSettings"),
    btnOpenAuth: document.getElementById("btnOpenAuth"),
    userPill: document.getElementById("userPill"),
    userPillName: document.getElementById("userPillName"),
    btnLogout: document.getElementById("btnLogout"),
    
    // Viewport & Toolbar
    playerWrapper: document.getElementById("playerWrapper"),
    gameViewport: document.getElementById("gameViewport"),
    ruffleContainer: document.getElementById("ruffleContainer"),
    loadingSplash: document.getElementById("loadingSplash"),
    splashStatusText: document.getElementById("splashStatusText"),
    connectionModeTag: document.getElementById("connectionModeTag"),
    btnReloadGame: document.getElementById("btnReloadGame"),
    scaleSelect: document.getElementById("scaleSelect"),
    langSelect: document.getElementById("langSelect"),
    btnToggleFullscreen: document.getElementById("btnToggleFullscreen"),
    fullscreenIcon: document.getElementById("fullscreenIcon"),
    btnToggleConsole: document.getElementById("btnToggleConsole"),
    
    // Console
    debugConsole: document.getElementById("debugConsole"),
    consoleLogs: document.getElementById("consoleLogs"),
    btnClearLogs: document.getElementById("btnClearLogs"),
    btnCloseConsole: document.getElementById("btnCloseConsole"),
    
    // Settings Modal
    settingsModal: document.getElementById("settingsModal"),
    btnCloseSettings: document.getElementById("btnCloseSettings"),
    btnCancelSettings: document.getElementById("btnCancelSettings"),
    btnSaveSettings: document.getElementById("btnSaveSettings"),
    inputServerUrl: document.getElementById("inputServerUrl"),
    inputCdnUrl: document.getElementById("inputCdnUrl"),
    btnTestConnection: document.getElementById("btnTestConnection"),
    testResultText: document.getElementById("testResultText"),
    presetCards: document.querySelectorAll(".preset-card"),
    proxyRadios: document.querySelectorAll("input[name='proxyMode']"),
    
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

  // Logging utility
  function log(msg, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${timestamp}] ${msg}`;
    elements.consoleLogs.appendChild(entry);
    elements.consoleLogs.scrollTop = elements.consoleLogs.scrollHeight;
    console.log(`[BYMR Launcher] ${msg}`);
  }

  // Ensure target trailing slash
  function ensureTrailingSlash(url) {
    if (!url) return "";
    return url.endsWith("/") ? url : url + "/";
  }

  // Set cookies for Docker reverse proxy
  function updateProxyCookies() {
    document.cookie = `bymr_target_server=${encodeURIComponent(state.serverUrl)}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `bymr_target_cdn=${encodeURIComponent(state.cdnUrl)}; path=/; max-age=31536000; SameSite=Lax`;
    log(`Cookies de destino actualizadas: server=${state.serverUrl}`, "info");
  }

  // Ping server and update UI badge
  async function pingServer(targetUrl = state.serverUrl) {
    elements.statusDot.className = "status-dot status-checking";
    elements.currentEndpointDisplay.textContent = new URL(targetUrl).hostname;
    elements.pingDisplay.textContent = "...";

    try {
      const res = await fetch(`/api/launcher/ping?target=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();

      if (data.ok) {
        state.serverOnline = true;
        state.pingMs = data.latencyMs;
        elements.statusDot.className = "status-dot status-online";
        elements.pingDisplay.textContent = `${data.latencyMs} ms`;
        log(`Ping a ${targetUrl} OK (${data.latencyMs}ms)`, "success");
        return { ok: true, latency: data.latencyMs };
      } else {
        state.serverOnline = false;
        elements.statusDot.className = "status-dot status-offline";
        elements.pingDisplay.textContent = "Offline";
        log(`Ping a ${targetUrl} falló: ${data.error || "Código HTTP " + data.statusCode}`, "warn");
        return { ok: false, error: data.error || `HTTP ${data.statusCode}` };
      }
    } catch (err) {
      state.serverOnline = false;
      elements.statusDot.className = "status-dot status-offline";
      elements.pingDisplay.textContent = "Error";
      log(`Error al contactar proxy de ping: ${err.message}`, "error");
      return { ok: false, error: err.message };
    }
  }

  // Update User Profile UI
  function updateAuthUI() {
    if (state.token && state.userProfile) {
      elements.userPill.classList.remove("hidden");
      elements.btnOpenAuth.classList.add("hidden");
      elements.userPillName.textContent = state.userProfile.username || "Jugador";
      elements.userPill.title = `ID: ${state.userProfile.userId || state.userProfile.userid} | Nivel: ${state.userProfile.level || 1}`;
    } else if (state.token) {
      elements.userPill.classList.remove("hidden");
      elements.btnOpenAuth.classList.add("hidden");
      elements.userPillName.textContent = "Token Activo";
      elements.userPill.title = "Sesión iniciada con token directo";
    } else {
      elements.userPill.classList.add("hidden");
      elements.btnOpenAuth.classList.remove("hidden");
    }
  }

  // Apply Scale
  function applyScale(scaleMode) {
    state.scale = scaleMode;
    localStorage.setItem("bymr_scale", scaleMode);
    elements.gameViewport.className = `game-viewport scale-${scaleMode}`;
    elements.scaleSelect.value = scaleMode;
  }

  // Fullscreen Management
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      elements.playerWrapper.requestFullscreen().then(() => {
        document.body.classList.add("is-fullscreen");
        elements.fullscreenIcon.textContent = "🗗";
      }).catch(err => {
        log(`Error al entrar a pantalla completa: ${err.message}`, "error");
      });
    } else {
      document.exitFullscreen().then(() => {
        document.body.classList.remove("is-fullscreen");
        elements.fullscreenIcon.textContent = "⛶";
      });
    }
  }

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove("is-fullscreen");
      elements.fullscreenIcon.textContent = "⛶";
    }
  });

  // Launch or Reload Flash Game with Ruffle
  async function launchGame() {
    log("Iniciando carga del cliente Backyard Monsters...", "info");
    updateProxyCookies();

    // Show loading splash
    elements.loadingSplash.classList.remove("hidden");
    elements.splashStatusText.textContent = "Iniciando Ruffle Flash Emulator...";

    // Determine effective server and cdn URLs
    let effectiveServerUrl;
    let effectiveCdnUrl;

    if (state.proxyMode === "proxy") {
      effectiveServerUrl = ensureTrailingSlash(window.location.origin + "/proxy/server");
      effectiveCdnUrl = ensureTrailingSlash(window.location.origin + "/proxy/cdn");
      elements.connectionModeTag.textContent = "Modo: Proxy Docker";
      elements.connectionModeTag.style.borderColor = "rgba(59, 130, 246, 0.4)";
    } else {
      effectiveServerUrl = ensureTrailingSlash(state.serverUrl);
      effectiveCdnUrl = ensureTrailingSlash(state.cdnUrl);
      elements.connectionModeTag.textContent = "Modo: Conexión Directa";
      elements.connectionModeTag.style.borderColor = "rgba(16, 185, 129, 0.4)";
    }

    log(`Endpoint del juego: ${effectiveServerUrl}`, "info");
    log(`Endpoint del CDN: ${effectiveCdnUrl}`, "info");

    // Clear previous Ruffle Player
    if (state.rufflePlayer) {
      try {
        state.rufflePlayer.remove();
      } catch (e) {}
      state.rufflePlayer = null;
    }

    // Check if Ruffle is loaded
    if (!window.RufflePlayer) {
      elements.splashStatusText.textContent = "Descargando motor Ruffle WebAssembly...";
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!window.RufflePlayer) {
        elements.splashStatusText.textContent = "Error: no se pudo cargar Ruffle. Revisa la consola.";
        log("No se encontró window.RufflePlayer en la página", "error");
        return;
      }
    }

    try {
      const ruffle = window.RufflePlayer.newest();
      const player = ruffle.createPlayer();
      state.rufflePlayer = player;
      player.id = "bymrFlashPlayer";

      // Configure player
      player.config = {
        autoplay: "on",
        unmuteOverlay: "hidden",
        letterbox: "on",
        warnOnUnsupportedContent: false,
        allowScriptAccess: true,
        quality: "high",
        parameters: {
          serverUrl: effectiveServerUrl,
          cdnUrl: effectiveCdnUrl,
          token: state.token || "",
          language: state.language || "spanish"
        }
      };

      // Append player to container
      elements.ruffleContainer.appendChild(player);

      // Load SWF
      elements.splashStatusText.textContent = "Descargando ejecutable SWF (v128.5690)...";
      await player.load({
        url: "/swfs/bymr-client.swf",
        parameters: player.config.parameters
      });

      // Hide loading splash on load
      elements.loadingSplash.classList.add("hidden");
      log("¡Cliente SWF cargado exitosamente en Ruffle!", "success");

      // Log Ruffle events if available
      player.addEventListener("loadedmetadata", () => {
        log(`Metadatos del SWF recibidos: ${player.metadata?.width}x${player.metadata?.height} @ ${player.metadata?.frameRate} FPS`, "info");
      });

    } catch (err) {
      elements.splashStatusText.textContent = `Error al cargar juego: ${err.message}`;
      log(`Error crítico al montar Ruffle: ${err.message}`, "error");
    }
  }

  // Preset Card Handlers
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

  // Event Listeners: Modals
  elements.btnOpenSettings.addEventListener("click", () => {
    elements.inputServerUrl.value = state.serverUrl;
    elements.inputCdnUrl.value = state.cdnUrl;
    elements.testResultText.textContent = "";

    // Set radio
    elements.proxyRadios.forEach(r => {
      r.checked = r.value === state.proxyMode;
    });

    applyPreset(state.preset);
    elements.settingsModal.classList.remove("hidden");
  });

  elements.btnCloseSettings.addEventListener("click", () => elements.settingsModal.classList.add("hidden"));
  elements.btnCancelSettings.addEventListener("click", () => elements.settingsModal.classList.add("hidden"));

  // Reset to official default button
  const btnResetOfficial = document.getElementById("btnResetOfficial");
  if (btnResetOfficial) {
    btnResetOfficial.addEventListener("click", () => {
      applyPreset("official");
      elements.testResultText.textContent = "";
      log("Restaurado servidor oficial por defecto (bymrefitted.com)", "info");
    });
  }

  // Auto-sync CDN if typing custom server URL
  elements.inputServerUrl.addEventListener("input", () => {
    if (state.preset === "custom") {
      const val = elements.inputServerUrl.value.trim();
      elements.inputCdnUrl.placeholder = val || "https://cdn.bymrefitted.com/";
    }
  });

  elements.presetCards.forEach(card => {
    card.addEventListener("click", () => applyPreset(card.dataset.preset));
  });

  // Test Connection Button
  elements.btnTestConnection.addEventListener("click", async () => {
    const testUrl = elements.inputServerUrl.value.trim();
    if (!testUrl) return;

    elements.testResultText.className = "test-result";
    elements.testResultText.textContent = "Comprobando conexión...";

    const res = await pingServer(testUrl);
    if (res.ok) {
      elements.testResultText.className = "test-result test-success";
      elements.testResultText.textContent = `✓ Conexión exitosa (${res.latency} ms)`;
    } else {
      elements.testResultText.className = "test-result test-error";
      elements.testResultText.textContent = `✕ No disponible (${res.error})`;
    }
  });

  // Save Settings
  elements.btnSaveSettings.addEventListener("click", () => {
    const newServer = ensureTrailingSlash(elements.inputServerUrl.value.trim());
    const newCdn = ensureTrailingSlash(elements.inputCdnUrl.value.trim() || newServer);
    let selectedMode = "proxy";
    elements.proxyRadios.forEach(r => { if (r.checked) selectedMode = r.value; });

    if (!newServer) {
      alert("Por favor ingresa una URL de servidor válida.");
      return;
    }

    state.serverUrl = newServer;
    state.cdnUrl = newCdn;
    state.proxyMode = selectedMode;
    localStorage.setItem("bymr_server_url", newServer);
    localStorage.setItem("bymr_cdn_url", newCdn);
    localStorage.setItem("bymr_proxy_mode", selectedMode);
    localStorage.setItem("bymr_preset", state.preset);

    elements.settingsModal.classList.add("hidden");
    log(`Configuración guardada. Servidor: ${newServer} [${selectedMode}]`, "success");

    pingServer();
    launchGame();
  });

  // Auth Modal
  elements.btnOpenAuth.addEventListener("click", () => {
    elements.authErrorMsg.classList.add("hidden");
    elements.authModal.classList.remove("hidden");
  });

  elements.btnCloseAuth.addEventListener("click", () => elements.authModal.classList.add("hidden"));

  // Tab switching
  elements.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      elements.tabButtons.forEach(b => b.classList.remove("active"));
      elements.tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`form${btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)}`).classList.add("active");
    });
  });

  // Login with Credentials
  elements.formCredentials.addEventListener("submit", async (e) => {
    e.preventDefault();
    elements.authErrorMsg.classList.add("hidden");
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;

    log(`Intentando autenticar usuario ${email} en ${state.serverUrl}...`, "info");
    const submitBtn = document.getElementById("btnSubmitLogin");
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando...";

    try {
      const res = await fetch("/api/launcher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: state.serverUrl,
          email,
          password,
          sessionType: "game"
        })
      });

      const data = await res.json();
      submitBtn.disabled = false;
      submitBtn.textContent = "Iniciar Sesión y Jugar";

      if (data.token) {
        state.token = data.token;
        state.userProfile = data;
        localStorage.setItem("bymr_auth_token", data.token);
        if (elements.authRemember.checked) {
          localStorage.setItem("bymr_user_profile", JSON.stringify(data));
        }

        log(`¡Sesión iniciada con éxito! Usuario: ${data.username} (ID: ${data.userId || data.userid})`, "success");
        updateAuthUI();
        elements.authModal.classList.add("hidden");
        launchGame();
      } else {
        elements.authErrorMsg.textContent = data.message || "Credenciales incorrectas o usuario no encontrado.";
        elements.authErrorMsg.classList.remove("hidden");
        log(`Error de autenticación: ${elements.authErrorMsg.textContent}`, "warn");
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Iniciar Sesión y Jugar";
      elements.authErrorMsg.textContent = `Error de conexión: ${err.message}`;
      elements.authErrorMsg.classList.remove("hidden");
      log(`Error en llamada de login: ${err.message}`, "error");
    }
  });

  // Login with Direct Token
  elements.formToken.addEventListener("submit", (e) => {
    e.preventDefault();
    const token = elements.authTokenInput.value.trim();
    if (!token) return;

    state.token = token;
    state.userProfile = { username: "Token User" };
    localStorage.setItem("bymr_auth_token", token);
    updateAuthUI();
    elements.authModal.classList.add("hidden");
    log("Token JWT aplicado manualmente", "success");
    launchGame();
  });

  elements.btnCancelToken.addEventListener("click", () => elements.authModal.classList.add("hidden"));

  // Play as Guest (In-game Flash login)
  elements.btnPlayAsGuest.addEventListener("click", () => {
    state.token = "";
    state.userProfile = null;
    localStorage.removeItem("bymr_auth_token");
    localStorage.removeItem("bymr_user_profile");
    updateAuthUI();
    elements.authModal.classList.add("hidden");
    log("Iniciando modo invitado / login in-game", "info");
    launchGame();
  });

  // Logout
  elements.btnLogout.addEventListener("click", () => {
    if (confirm("¿Deseas cerrar sesión en este launcher?")) {
      state.token = "";
      state.userProfile = null;
      localStorage.removeItem("bymr_auth_token");
      localStorage.removeItem("bymr_user_profile");
      updateAuthUI();
      log("Sesión cerrada", "info");
      launchGame();
    }
  });

  // Scale Selector
  elements.scaleSelect.addEventListener("change", (e) => applyScale(e.target.value));

  // Language Selector
  elements.langSelect.value = state.language;
  elements.langSelect.addEventListener("change", (e) => {
    state.language = e.target.value;
    localStorage.setItem("bymr_language", state.language);
    log(`Idioma cambiado a: ${state.language}. Reiniciando cliente...`, "info");
    launchGame();
  });

  // Reload Button
  elements.btnReloadGame.addEventListener("click", () => {
    log("Reiniciando juego a petición del usuario...", "info");
    launchGame();
  });

  // Fullscreen Button
  elements.btnToggleFullscreen.addEventListener("click", toggleFullscreen);

  // Debug Console Toggle
  elements.btnToggleConsole.addEventListener("click", () => {
    elements.debugConsole.classList.toggle("hidden");
  });
  elements.btnCloseConsole.addEventListener("click", () => elements.debugConsole.classList.add("hidden"));
  elements.btnClearLogs.addEventListener("click", () => { elements.consoleLogs.innerHTML = ""; });

  // Endpoint Badge quick-click opens Settings
  document.getElementById("endpointBadge").addEventListener("click", () => {
    elements.btnOpenSettings.click();
  });

  // Initialization
  async function init() {
    log("Iniciando Backyard Monsters Refitted Web Launcher...", "info");
    applyScale(state.scale);
    updateAuthUI();

    // Check configuration from server
    try {
      const configRes = await fetch("/api/launcher/config");
      const config = await configRes.json();
      log(`Configuración del servidor cargada. Servidor por defecto: ${config.defaultServerUrl}`, "info");
    } catch (e) {
      log("Aviso: No se pudo obtener /api/launcher/config, usando valores locales", "warn");
    }

    // Ping server
    pingServer();

    // Launch game
    launchGame();
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
