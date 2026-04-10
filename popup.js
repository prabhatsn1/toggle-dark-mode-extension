/**
 * popup.js
 * Controls the popup UI: reads/writes per-site settings and sends
 * real-time messages to the active tab's content script.
 */

(function () {
  "use strict";

  // ─── Restricted URL patterns ─────────────────────────────────────────────────

  const RESTRICTED_PATTERNS = [
    /^chrome:\/\//i,
    /^edge:\/\//i,
    /^brave:\/\//i,
    /^opera:\/\//i,
    /^about:/i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    // Chrome Web Store (both URL forms)
    /^https:\/\/chromewebstore\.google\.com/i,
    /^https:\/\/chrome\.google\.com\/webstore/i,
  ];

  function isRestrictedUrl(url) {
    return RESTRICTED_PATTERNS.some((re) => re.test(url));
  }

  // ─── Storage helpers ──────────────────────────────────────────────────────────

  function storageKey(host) {
    return `site:${host}`;
  }

  /**
   * Read settings for a hostname.
   * Tries sync first, then falls back to local.
   * @param {string} host
   * @returns {Promise<{ enabled: boolean, contrast: boolean }>}
   */
  async function readSettings(host) {
    const key = storageKey(host);
    try {
      const result = await chrome.storage.sync.get(key);
      if (result[key]) return result[key];
    } catch (_) {
      // sync unavailable
    }
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || { enabled: false, contrast: false };
    } catch (_) {
      return { enabled: false, contrast: false };
    }
  }

  /**
   * Write settings for a hostname to sync (with local fallback).
   * @param {string} host
   * @param {{ enabled: boolean, contrast: boolean }} settings
   */
  async function writeSettings(host, settings) {
    const key = storageKey(host);
    try {
      await chrome.storage.sync.set({ [key]: settings });
    } catch (_) {
      // sync write failed — try local
      await chrome.storage.local.set({ [key]: settings });
    }
  }

  // ─── Messaging helpers ────────────────────────────────────────────────────────

  /**
   * Send a message to the content script in the active tab.
   * Because popup → content script can fail if the content script isn't
   * ready (e.g., just navigated), we catch the error gracefully.
   *
   * @param {number} tabId
   * @param {object} payload
   * @returns {Promise<object|null>}
   */
  async function sendToTab(tabId, payload) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, payload);
      return response;
    } catch (err) {
      // Content script not alive on this tab (restricted page, mid-navigation, etc.)
      return null;
    }
  }

  // ─── UI elements ──────────────────────────────────────────────────────────────

  const hostnameEl = document.getElementById("hostname");
  const statusBanner = document.getElementById("status-banner");
  const statusText = document.getElementById("status-text");
  const controlsEl = document.getElementById("controls");
  const toggleDark = document.getElementById("toggle-dark");
  const toggleContrast = document.getElementById("toggle-contrast");
  const contrastRow = document.getElementById("contrast-row");

  // ─── Banner helpers ───────────────────────────────────────────────────────────

  function showError(msg) {
    statusBanner.classList.remove("hidden", "info");
    statusText.textContent = msg;
  }

  function showInfo(msg) {
    statusBanner.classList.remove("hidden");
    statusBanner.classList.add("info");
    statusText.textContent = msg;
  }

  function hideBanner() {
    statusBanner.classList.add("hidden");
    statusBanner.classList.remove("info");
    statusText.textContent = "";
  }

  /** Dim / enable the contrast row based on dark-mode toggle state */
  function syncContrastRowState(darkEnabled) {
    if (darkEnabled) {
      contrastRow.classList.remove("disabled");
      toggleContrast.disabled = false;
    } else {
      contrastRow.classList.add("disabled");
      toggleContrast.disabled = true;
    }
  }

  // ─── Main init ────────────────────────────────────────────────────────────────

  async function init() {
    // Get the active tab.
    let tab;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (err) {
      showError("Unable to determine the current tab.");
      controlsEl.style.display = "none";
      return;
    }

    if (!tab || !tab.url) {
      showError("No active tab or URL available.");
      controlsEl.style.display = "none";
      return;
    }

    const url = tab.url;

    // ── Restricted URL check ──
    if (isRestrictedUrl(url)) {
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (_) {}
      const display = urlObj ? urlObj.hostname || url : url;
      hostnameEl.textContent = display || "restricted page";
      hostnameEl.title = url;
      showError("This page doesn't allow extensions to modify it.");
      controlsEl.style.display = "none";
      return;
    }

    // ── Parse hostname ──
    let host;
    try {
      host = new URL(url).hostname;
    } catch (_) {
      showError("Cannot parse the page URL.");
      controlsEl.style.display = "none";
      return;
    }

    if (!host) {
      showError("No hostname found for this page.");
      controlsEl.style.display = "none";
      return;
    }

    hostnameEl.textContent = host;
    hostnameEl.title = host;

    // ── Load current settings ──
    let settings;
    try {
      settings = await readSettings(host);
    } catch (err) {
      showError("Storage read failed. Settings unavailable.");
      controlsEl.style.display = "none";
      return;
    }

    // ── Render state ──
    toggleDark.checked = !!settings.enabled;
    toggleDark.setAttribute("aria-checked", String(!!settings.enabled));

    toggleContrast.checked = !!settings.contrast;
    toggleContrast.setAttribute("aria-checked", String(!!settings.contrast));

    syncContrastRowState(settings.enabled);
    hideBanner();

    // ── Ping content script to confirm it's alive ──
    const pingResp = await sendToTab(tab.id, { action: "ping" });
    if (!pingResp) {
      showInfo(
        "Page will apply dark mode on next load (content script not yet active).",
      );
    }

    // ─── Event: dark mode toggle ─────────────────────────────────────────────

    toggleDark.addEventListener("change", async () => {
      const enabled = toggleDark.checked;
      const contrast = toggleContrast.checked;

      toggleDark.setAttribute("aria-checked", String(enabled));
      syncContrastRowState(enabled);

      const newSettings = { enabled, contrast: enabled ? contrast : false };

      // Persist to storage (content script in all tabs will react via onChanged).
      try {
        await writeSettings(host, newSettings);
      } catch (err) {
        showError("Failed to save settings.");
        // Revert UI.
        toggleDark.checked = !enabled;
        toggleDark.setAttribute("aria-checked", String(!enabled));
        syncContrastRowState(!enabled);
        return;
      }

      // Also message the active tab for immediate effect (no reload needed).
      if (enabled) {
        await sendToTab(tab.id, { action: "applyDark", contrast });
      } else {
        await sendToTab(tab.id, { action: "removeDark" });
      }
    });

    // ─── Event: contrast toggle ──────────────────────────────────────────────

    toggleContrast.addEventListener("change", async () => {
      const enabled = toggleDark.checked;
      const contrast = toggleContrast.checked;

      toggleContrast.setAttribute("aria-checked", String(contrast));

      if (!enabled) return; // shouldn't happen since row is disabled, but guard anyway

      const newSettings = { enabled, contrast };

      try {
        await writeSettings(host, newSettings);
      } catch (err) {
        showError("Failed to save settings.");
        toggleContrast.checked = !contrast;
        toggleContrast.setAttribute("aria-checked", String(!contrast));
        return;
      }

      await sendToTab(tab.id, { action: "updateContrast", contrast });
    });
  }

  // Kick off on popup open.
  init();
})();
