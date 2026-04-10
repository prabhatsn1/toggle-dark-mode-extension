# Dark Mode per Site — Browser Extension

A Manifest V3 Chrome/Edge/Brave/Vivaldi extension that applies **per-website dark mode** automatically on every page load. No library dependencies. Pure HTML, CSS, and JavaScript.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [How to Install Locally (Load Unpacked)](#how-to-install-locally-load-unpacked)
3. [How to Use the Extension](#how-to-use-the-extension)
4. [How to Publish on the Chrome Web Store](#how-to-publish-on-the-chrome-web-store)
5. [Customization](#customization)
6. [Test Checklist](#test-checklist)
7. [How It Works](#how-it-works)
8. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
Extension/
├── manifest.json           # MV3 manifest
├── service_worker.js       # Background service worker
├── content.js              # Dark mode injection engine
├── popup.html              # Popup UI markup
├── popup.css               # Popup UI styles
├── popup.js                # Popup UI logic
├── generate_icons.py       # One-time icon generator (Python 3)
├── README.md               # This file
└── icons/
    ├── README.md
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## How to Install Locally (Load Unpacked)

Use this method during development or to use the extension privately without publishing.

### Step 1 — Generate icons (first time only)

Open a terminal in the `Extension/` folder and run:

```bash
python3 generate_icons.py
```

This creates placeholder PNG icons in the `icons/` folder. Replace them with your own artwork before publishing.

### Step 2 — Open the Extensions page

| Browser | URL to open            |
| ------- | ---------------------- |
| Chrome  | `chrome://extensions`  |
| Edge    | `edge://extensions`    |
| Brave   | `brave://extensions`   |
| Vivaldi | `vivaldi://extensions` |

### Step 3 — Enable Developer Mode

Toggle **Developer mode** on — it's in the **top-right corner** of the Extensions page.

### Step 4 — Load Unpacked

1. Click **Load unpacked**
2. In the file picker, navigate to and select the **`Extension/`** folder (the one that contains `manifest.json`)
3. Click **Select** / **Open**

The extension will appear in the list and its icon will show up in the browser toolbar. **Pin it** by clicking the puzzle-piece icon → pin icon next to "Dark Mode per Site".

### Step 5 — Reload after edits

After changing any source file, go back to `chrome://extensions` and click the **refresh icon** (↺) on the extension card to reload it.

---

## How to Use the Extension

### Enabling dark mode on a site

1. Navigate to any website (e.g., `https://example.com`)
2. Click the **Dark Mode per Site** icon in the toolbar
3. The popup shows the current site's hostname at the top
4. Flip the **Enable Dark Mode** toggle → the page goes dark immediately
5. Close the popup — that's it. The setting is saved.

### Auto-apply on every visit

Once enabled for a hostname, dark mode applies **automatically on every future page load** — no need to open the popup again. This works across:

- Normal page loads and refreshes
- Tab restores after browser restart
- Single-page app (SPA) navigation within the site

### Stronger Contrast mode

With dark mode enabled, flip the **Stronger Contrast** toggle for:

- Deeper black backgrounds (`#000`)
- Brighter white text
- More distinct borders and link colors

This is useful for low-light environments or accessibility needs.

### Disabling dark mode for a site

Open the popup on the site and flip **Enable Dark Mode** off. The page reverts to its original appearance instantly.

### Restricted pages

On browser-internal pages (`chrome://`, `edge://`, `brave://`) and the Chrome Web Store, the popup will display:

> "This page doesn't allow extensions to modify it."

This is expected browser behavior — extensions cannot inject into these pages.

---

## How to Publish on the Chrome Web Store

Publishing makes the extension available to anyone via the store. You need a one-time **$5 USD** developer registration fee.

### Prerequisites

- A Google account
- $5 USD for the one-time developer registration
- Your extension **production-ready** (replace placeholder icons, review all code)
- Icons: 16×16, 32×32, 48×48, 128×128 PNG (already in `icons/`)
- At least one **store screenshot** (1280×800 or 640×400 PNG/JPEG)
- An optional **promotional image** (440×280 PNG)

---

### Step 1 — Prepare for production

Before packaging, make sure:

- [ ] Replace placeholder icons in `icons/` with polished artwork
- [ ] Update `"version"` in `manifest.json` if needed (must be `"1.0.0"` or higher)
- [ ] Remove or clean up `generate_icons.py` (not needed in the package)
- [ ] Test the extension thoroughly using the [Test Checklist](#test-checklist)

---

### Step 2 — Package the extension as a ZIP

Create a ZIP of the extension folder contents (**not** the folder itself — zip the files inside it):

**macOS / Linux (Terminal):**

```bash
cd "/Users/psoni24/Documents/Practice"
zip -r DarkModePerSite.zip Extension/ \
  --exclude "Extension/generate_icons.py" \
  --exclude "Extension/__MACOSX/*" \
  --exclude "Extension/.DS_Store" \
  --exclude "Extension/icons/README.md" \
  --exclude "Extension/README.md"
```

> **Important:** The ZIP must contain `manifest.json` at its root level (not inside a subfolder).

You can verify this by opening the ZIP and confirming `manifest.json` is directly visible — not nested under another folder.

---

### Step 3 — Register as a Chrome Web Store developer

1. Go to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Accept the Developer Agreement
4. Pay the **one-time $5 USD registration fee** via Google Pay

---

### Step 4 — Create a new item

1. In the Developer Dashboard, click **New item**
2. Drag and drop your `DarkModePerSite.zip` file, or click **Browse files**
3. Chrome will validate the ZIP. Fix any errors it reports before continuing.

---

### Step 5 — Fill in store listing details

You'll be asked to provide:

| Field                                 | Recommended content                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Name**                              | Dark Mode per Site                                                                              |
| **Short description** (132 chars max) | Auto-apply dark mode per website. Toggle individually per site. Settings saved across sessions. |
| **Detailed description**              | Explain features: per-site toggle, auto-apply, stronger contrast, SPA support, no tracking      |
| **Category**                          | Productivity                                                                                    |
| **Language**                          | English                                                                                         |
| **Screenshots**                       | At least 1 screenshot (1280×800 or 640×400). Show the popup + a dark page.                      |
| **Promotional tile**                  | 440×280 PNG (optional but recommended for visibility)                                           |
| **Icon**                              | 128×128 PNG (pulled from your ZIP automatically)                                                |

---

### Step 6 — Set privacy practices

The store now requires a **Privacy Practices** declaration:

1. Navigate to the **Privacy practices** tab in the dashboard
2. For each permission, explain its use:
   - `storage` → "Saves dark mode toggle state per hostname"
   - `host_permissions: <all_urls>` → "Required to auto-apply dark mode on any visited website. No data is collected or transmitted."
3. Declare that the extension **does not collect user data**
4. Save

---

### Step 7 — Submit for review

1. Set **Visibility** to _Public_ (or _Unlisted_ if you only want to share via link)
2. Click **Submit for review**

Review typically takes **1–3 business days** for new submissions. Google may ask for additional justification for `<all_urls>` host permissions — use the privacy explanation from Step 6.

---

### Step 8 — After approval

Once approved:

- Your extension gets a permanent store URL
- Users can install it with one click
- Updates: increment `"version"` in `manifest.json`, create a new ZIP, upload via **Package** → **Upload new package** in the dashboard

---

## Customization

Edit the CSS variables in `content.js` — they're in the `DARK_CSS` and `CONTRAST_CSS` template literals near the top of the file.

| What to change    | Variable / property                              | Default   |
| ----------------- | ------------------------------------------------ | --------- |
| Page background   | `html, body { background-color }`                | `#121212` |
| Body text         | `html, body { color }`                           | `#e4e4e4` |
| Link color        | `a { color }`                                    | `#89b4fa` |
| Visited link      | `a:visited { color }`                            | `#cba6f7` |
| Input background  | `input { background-color }`                     | `#1e1e1e` |
| Button background | `button { background-color }`                    | `#2a2a2a` |
| Border color      | `border-color`                                   | `#3a3a3a` |
| Contrast bg       | `CONTRAST_CSS → html, body { background-color }` | `#000`    |
| Toggle accent     | `popup.css → input:checked + .toggle-track`      | `#4a90d9` |

After editing `content.js`, reload the extension on `chrome://extensions`.

---

## Test Checklist

- [ ] **Auto-apply on page load** — Enable dark mode for `github.com`, close and reopen the tab. Dark mode applies with no flash of light content.
- [ ] **Instant disable** — Toggle off in the popup. Page returns to normal immediately, no reload.
- [ ] **Stronger Contrast** — Enable then disable. Verify brightness changes and reverts correctly.
- [ ] **SPA navigation** — On `github.com`, click between repos. Dark mode persists through each navigation.
- [ ] **Cross-tab sync** — Open two tabs of the same site. Enable dark mode via one tab's popup. The other tab updates immediately.
- [ ] **Images not inverted** — On `unsplash.com` or similar, photos should look color-accurate.
- [ ] **Restricted pages** — Open `chrome://settings`, click the icon. Popup shows the restricted-page error message with controls hidden.
- [ ] **Chrome Web Store page** — Visit `https://chromewebstore.google.com`. Same restricted error shown.
- [ ] **Per-site isolation** — Enabling dark mode on `example.com` must not affect `example.org`.
- [ ] **Persistence across restarts** — Enable dark mode, close the browser entirely, reopen. Dark mode still applies.

---

## How It Works

| Component             | Role                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `content.js`          | Injected at `document_start`. Reads storage, injects `<style>` before the page renders. Handles SPA navigation and storage sync. |
| `popup.js`            | Reads the active tab URL, shows current state, writes to storage, and sends a live message to the tab for instant effect.        |
| `service_worker.js`   | Lightweight background worker. Handles install defaults and acts as a message relay.                                             |
| `chrome.storage.sync` | Persists settings per hostname across devices. Falls back to `local` if sync is unavailable.                                     |
| `MutationObserver`    | Throttled DOM watcher that re-injects the style tag if a JavaScript framework removes it.                                        |

---

## Troubleshooting

| Problem                                     | Fix                                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Dark mode doesn't apply on first load       | Make sure the extension is loaded and `content.js` is not blocked. Check `chrome://extensions` for errors. |
| Popup shows "content script not yet active" | Reload the page. This appears on tabs opened before the extension was installed.                           |
| Settings not persisting                     | Check if you're signed into Chrome (required for sync). Fallback to local should still work.               |
| Icons look broken / missing                 | Run `python3 generate_icons.py` from the `Extension/` folder and reload the extension.                     |
| Extension rejected from Web Store           | Review the privacy declaration (Step 6). Justify `<all_urls>` usage explicitly in the submission notes.    |
| Colors break a specific site                | Add a site-specific CSS exception in `content.js` inside the `DARK_CSS` block, scoped with a URL check.    |
