/**
 * service_worker.js
 * MV3 background service worker.
 * Responsibilities:
 *   - Set default settings on install
 *   - Centralized error logging helper
 *   - Act as a message relay for tabs that cannot receive messages
 *     (e.g., freshly navigated pages before content script initializes)
 */

// ─── Install defaults ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.log(
      "[DarkMode SW] Extension installed. No global defaults needed.",
    );
  }
});

// ─── Message handling ─────────────────────────────────────────────────────────

/**
 * Relay messages from the popup to the active tab's content script.
 * The popup sends: { action: "relay", tabId, payload }
 * The SW forwards payload to that tab and replies with the result.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "relay") return false;

  const { tabId, payload } = message;

  chrome.tabs.sendMessage(tabId, payload, (response) => {
    if (chrome.runtime.lastError) {
      // Content script not ready or restricted page — not a fatal error.
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ ok: true, data: response });
    }
  });

  // Return true to keep the message channel open for the async sendResponse.
  return true;
});
