/**
 * content.js
 * Injected at document_start into every http/https page.
 *
 * Responsibilities:
 *   1. Read per-hostname settings from chrome.storage.sync (fallback: local).
 *   2. Apply or remove the dark-mode <style> tag accordingly.
 *   3. Re-apply on SPA navigations (history API + MutationObserver).
 *   4. Listen for real-time messages from the popup.
 *   5. Listen for storage changes to sync across tabs.
 */

(function () {
  "use strict";

  // ─── Constants ──────────────────────────────────────────────────────────────

  const STYLE_ID = "__ext_dark_mode_style__";
  const CONTRAST_STYLE_ID = "__ext_dark_mode_contrast__";
  const hostname = location.hostname; // e.g. "example.com"

  // ─── Dark Mode CSS ──────────────────────────────────────────────────────────

  /**
   * Base dark-mode stylesheet.
   * - Targets structural/text containers, form controls, tables.
   * - Deliberately does NOT use global filter: invert() to protect images/video.
   * - Uses !important sparingly — only on background/color where sites resist.
   */
  const DARK_CSS = `
    /* ── Base surfaces ── */
    html, body {
      background-color: #121212 !important;
      color: #e4e4e4 !important;
    }

    /* ── Layout containers ── */
    main, section, article, aside, header, footer, nav,
    div, span, li, ul, ol, dl, dt, dd,
    p, blockquote, pre, code, figure, figcaption,
    details, summary, dialog {
      background-color: inherit;
      color: inherit;
      border-color: #3a3a3a;
    }

    /* ── Headings & inline text ── */
    h1, h2, h3, h4, h5, h6,
    label, legend, caption, th {
      color: #f0f0f0;
    }

    /* ── Links ── */
    a { color: #89b4fa; }
    a:visited { color: #cba6f7; }

    /* ── Form controls ── */
    input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]),
    textarea,
    select {
      background-color: #1e1e1e !important;
      color: #e4e4e4 !important;
      border: 1px solid #4a4a4a !important;
    }

    input[type="submit"],
    input[type="button"],
    input[type="reset"],
    button {
      background-color: #2a2a2a !important;
      color: #e4e4e4 !important;
      border: 1px solid #555 !important;
    }

    /* ── Tables ── */
    table {
      background-color: #1a1a1a;
      color: #e4e4e4;
    }
    th {
      background-color: #252525;
    }
    td, th {
      border-color: #3a3a3a;
    }
    tr:nth-child(even) td {
      background-color: #1f1f1f;
    }

    /* ── Scrollbars (Chromium) ── */
    ::-webkit-scrollbar { background-color: #1a1a1a; }
    ::-webkit-scrollbar-thumb { background-color: #555; border-radius: 4px; }

    /* ── Preserve media — do NOT invert ── */
    img, video, canvas, svg image,
    picture, source,
    iframe {
      filter: none !important;
    }

    /* ── SVG icons that use currentColor inherit text color naturally ── */
    svg:not([src]) {
      color: inherit;
    }

    /* ── Placeholders ── */
    ::placeholder { color: #888 !important; opacity: 1; }

    /* ── Selection ── */
    ::selection { background-color: #264f78; color: #fff; }
  `;

  /**
   * Stronger-contrast overlay on top of the base dark CSS.
   * Boosts text brightness, darkens backgrounds further,
   * and adds more distinct borders.
   */
  const CONTRAST_CSS = `
    html, body {
      background-color: #000 !important;
      color: #fff !important;
    }
    h1, h2, h3, h4, h5, h6, label, legend, caption, th {
      color: #fff !important;
    }
    a { color: #6cb4ff !important; }
    a:visited { color: #d9a0ff !important; }
    input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]),
    textarea,
    select {
      background-color: #111 !important;
      color: #fff !important;
      border: 1px solid #888 !important;
    }
    td, th {
      border-color: #666 !important;
    }
  `;

  // ─── Style injection helpers ─────────────────────────────────────────────────

  function injectStyle(id, css) {
    // Remove existing first to avoid duplicates (e.g., after SPA nav).
    removeStyle(id);
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    // Prefer <head>, fallback to <html> or <body> for document_start timing.
    const target = document.head || document.documentElement || document.body;
    if (target) {
      target.appendChild(style);
    }
  }

  function removeStyle(id) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
  }

  // ─── Apply / Remove dark mode ────────────────────────────────────────────────

  /**
   * @param {{ contrast: boolean }} options
   */
  function applyDarkMode({ contrast = false } = {}) {
    injectStyle(STYLE_ID, DARK_CSS);
    if (contrast) {
      injectStyle(CONTRAST_STYLE_ID, CONTRAST_CSS);
    } else {
      removeStyle(CONTRAST_STYLE_ID);
    }
  }

  function removeDarkMode() {
    removeStyle(STYLE_ID);
    removeStyle(CONTRAST_STYLE_ID);
  }

  /**
   * Update contrast overlay without re-injecting the full base style.
   * @param {{ contrast: boolean }} options
   */
  function updateContrast({ contrast = false } = {}) {
    if (!document.getElementById(STYLE_ID)) {
      // Dark mode not active; nothing to update.
      return;
    }
    if (contrast) {
      injectStyle(CONTRAST_STYLE_ID, CONTRAST_CSS);
    } else {
      removeStyle(CONTRAST_STYLE_ID);
    }
  }

  // ─── Storage helpers ─────────────────────────────────────────────────────────

  /**
   * Read siteSettings from storage.sync, falling back to storage.local.
   * @returns {Promise<{ enabled: boolean, contrast: boolean }>}
   */
  async function loadSettings() {
    const key = `site:${hostname}`;
    try {
      const result = await chrome.storage.sync.get(key);
      if (result[key]) return result[key];
    } catch (_) {
      // sync may not be available (e.g., not signed into browser)
    }
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || { enabled: false, contrast: false };
    } catch (_) {
      return { enabled: false, contrast: false };
    }
  }

  // ─── Initial application ─────────────────────────────────────────────────────

  let _currentSettings = { enabled: false, contrast: false };

  async function initDarkMode() {
    const settings = await loadSettings();
    _currentSettings = settings;
    if (settings.enabled) {
      applyDarkMode({ contrast: settings.contrast });
    }
  }

  initDarkMode();

  // ─── SPA navigation handling ─────────────────────────────────────────────────

  /**
   * Re-apply dark mode after SPA navigation.
   * Called when URL changes without a full page reload.
   */
  function onSpaNavigation() {
    if (_currentSettings.enabled) {
      // The new "page" may have wiped our <style> from the DOM.
      // Re-inject to be safe.
      applyDarkMode({ contrast: _currentSettings.contrast });
    }
  }

  // Patch history API.
  (function patchHistory() {
    const _pushState = history.pushState.bind(history);
    const _replaceState = history.replaceState.bind(history);

    history.pushState = function (...args) {
      _pushState(...args);
      onSpaNavigation();
    };
    history.replaceState = function (...args) {
      _replaceState(...args);
      onSpaNavigation();
    };
  })();

  // Listen for back/forward navigation.
  window.addEventListener("popstate", onSpaNavigation);

  /**
   * MutationObserver: watches for major DOM additions (e.g., framework
   * swapping root content) and re-injects the style tag if it was removed.
   * Throttled to avoid performance cost on heavy pages.
   */
  let _moTimer = null;
  const _observer = new MutationObserver(() => {
    if (!_currentSettings.enabled) return;
    // Throttle to once per 300 ms.
    if (_moTimer) return;
    _moTimer = setTimeout(() => {
      _moTimer = null;
      if (!document.getElementById(STYLE_ID)) {
        applyDarkMode({ contrast: _currentSettings.contrast });
      }
    }, 300);
  });

  // Start observing once the document is interactive enough.
  function startObserver() {
    _observer.observe(document.documentElement, {
      childList: true,
      subtree: false, // only watch direct children of <html> for performance
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }

  // ─── Storage change listener ──────────────────────────────────────────────────

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" && area !== "local") return;
    const key = `site:${hostname}`;
    if (!changes[key]) return;

    const newValue = changes[key].newValue || {
      enabled: false,
      contrast: false,
    };
    _currentSettings = newValue;

    if (newValue.enabled) {
      applyDarkMode({ contrast: newValue.contrast });
    } else {
      removeDarkMode();
    }
  });

  // ─── Message listener (from popup) ───────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.action) {
      case "ping":
        // Popup uses this to detect whether content script is alive.
        sendResponse({ alive: true, hostname });
        break;

      case "applyDark":
        _currentSettings = {
          enabled: true,
          contrast: message.contrast || false,
        };
        applyDarkMode({ contrast: _currentSettings.contrast });
        sendResponse({ ok: true });
        break;

      case "removeDark":
        _currentSettings = { enabled: false, contrast: false };
        removeDarkMode();
        sendResponse({ ok: true });
        break;

      case "updateContrast":
        _currentSettings.contrast = message.contrast || false;
        updateContrast({ contrast: _currentSettings.contrast });
        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ ok: false, error: "Unknown action" });
    }
    // Return false — all handlers are synchronous.
    return false;
  });
})();
