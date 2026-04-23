// =============================================================================
// Image Fetcher - Content Script
// -----------------------------------------------------------------------------
// Injects a DeepL-style floating panel into the top-right of the page using
// Shadow DOM instead of a popup. The panel is toggled by clicking the
// extension icon (background.js sends a TOGGLE_PANEL message).
//
// The entire UI is sealed inside Shadow DOM to isolate it from the page's
// CSS/JS. Image collection runs with content script privileges and scans the
// DOM directly.
// =============================================================================

(function () {
  // Guard against double injection: the content script may be auto-injected
  // via manifest content_scripts and then re-executed by background.js via
  // executeScript, so a global flag ensures init only runs once.
  if (window.__imageFetcherContentInjected) {
    return;
  }
  window.__imageFetcherContentInjected = true;

  // ---------------------------------------------------------------------------
  // postMessage bridge for the Figma plugin (backward compatible)
  // ---------------------------------------------------------------------------
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "GET_IMAGES_FROM_EXTENSION") {
      chrome.storage.local.get(["images"], (result) => {
        window.postMessage(
          {
            type: "IMAGES_FROM_EXTENSION",
            images: result.images || [],
          },
          "*",
        );
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Create the Shadow DOM host
  // ---------------------------------------------------------------------------
  const host = document.createElement("div");
  host.id = "image-fetcher-host";
  host.setAttribute("data-image-fetcher", "");
  // The host itself has no layout impact; the inner .panel uses position:fixed
  // to place itself. all:initial prevents page CSS from inheriting into it.
  host.style.cssText = "all: initial;";
  // Attaching directly under <html> minimizes fixed-positioning drift caused
  // by page CSS (e.g. transform on ancestor elements).
  (document.documentElement || document.body).appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // ---------------------------------------------------------------------------
  // Styles (ported from popup.html, adjusted for Shadow DOM)
  // ---------------------------------------------------------------------------
  const styleMarkup = `
    :host,
    :host * {
      box-sizing: border-box;
    }
    :host {
      all: initial;
      color-scheme: light dark;

      --if-bg: #ffffff;
      --if-bg-subtle: #fafafa;
      --if-bg-muted: #f5f5f5;
      --if-bg-item: #fafafa;
      --if-text: #1e1e1e;
      --if-text-muted: #4b5563;
      --if-text-subtle: #6b7280;
      --if-text-faint: #666;
      --if-border: rgba(0, 0, 0, 0.08);
      --if-border-strong: rgba(0, 0, 0, 0.12);
      --if-border-soft: rgba(0, 0, 0, 0.06);
      --if-border-dashed: rgba(0, 0, 0, 0.15);
      --if-hover-overlay: rgba(0, 0, 0, 0.06);
      --if-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.1);
      --if-pill-bg: #eef2ff;
      --if-pill-text: #3730a3;
      --if-img-placeholder: #e5e7eb;
      --if-label-text: rgba(0, 0, 0, 0.55);
      --if-scrim: rgba(0, 0, 0, 0.72);
      --if-error-bg: #fef2f2;
      --if-error-border: #fecaca;
      --if-error-text: #991b1b;
      --if-success-bg: #f0fdf4;
      --if-success-border: #bbf7d0;
      --if-success-text: #166534;
      --if-mask-color: black;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --if-bg: #1e1e1e;
        --if-bg-subtle: #242424;
        --if-bg-muted: #2a2a2a;
        --if-bg-item: #262626;
        --if-text: #e5e7eb;
        --if-text-muted: #b3b8c2;
        --if-text-subtle: #9ca3af;
        --if-text-faint: #9ca3af;
        --if-border: rgba(255, 255, 255, 0.1);
        --if-border-strong: rgba(255, 255, 255, 0.18);
        --if-border-soft: rgba(255, 255, 255, 0.08);
        --if-border-dashed: rgba(255, 255, 255, 0.18);
        --if-hover-overlay: rgba(255, 255, 255, 0.08);
        --if-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);
        --if-pill-bg: #312e81;
        --if-pill-text: #c7d2fe;
        --if-img-placeholder: #3f3f46;
        --if-label-text: rgba(255, 255, 255, 0.6);
        --if-scrim: rgba(0, 0, 0, 0.82);
        --if-error-bg: #3f1111;
        --if-error-border: #7f1d1d;
        --if-error-text: #fecaca;
        --if-success-bg: #0c2a15;
        --if-success-border: #166534;
        --if-success-text: #bbf7d0;
        --if-mask-color: white;
      }
    }

    .panel {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      width: 380px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      display: flex;
      flex-direction: column;
      gap: 0;
      background: var(--if-bg);
      color: var(--if-text);
      border: 1px solid var(--if-border);
      border-radius: 16px;
      box-shadow: var(--if-shadow);
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Oxygen, Ubuntu, Cantarell, "Helvetica Neue", "Hiragino Sans",
        "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      animation: panelIn 0.18s ease;
    }
    .panel[hidden] {
      display: none;
    }

    @keyframes panelIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ---------- Panel header ---------- */
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 12px 10px;
      border-bottom: 1px solid var(--if-border-soft);
      background: var(--if-bg-subtle);
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .header-title .emoji {
      font-size: 14px;
    }
    .header-title h1 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: var(--if-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .count-pill {
      margin-left: auto;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--if-pill-bg);
      color: var(--if-pill-text);
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .count-pill.is-hidden {
      display: none;
    }
    .close-btn {
      appearance: none;
      border: 1px solid transparent;
      background: transparent;
      color: var(--if-text-faint);
      width: 24px;
      height: 24px;
      border-radius: 6px;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .close-btn:hover {
      background: var(--if-hover-overlay);
      color: var(--if-text);
    }

    /* ---------- Main ---------- */
    .main {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      overflow-y: auto;
      min-height: 0;
      flex: 1 1 auto;
    }

    .btn {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
      font-family: inherit;
    }
    .btn-primary {
      background: #0d99ff;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #007be5;
    }
    .btn-secondary {
      background: var(--if-bg);
      color: var(--if-text);
      border-color: var(--if-border-strong);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--if-bg-muted);
    }
    .btn-secondary:disabled {
      color: var(--if-text-subtle);
      cursor: not-allowed;
      opacity: 0.7;
    }

    .status-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      border-radius: 8px;
      background: var(--if-bg-muted);
      border: 1px solid var(--if-border-soft);
      color: var(--if-text);
      font-size: 12px;
      line-height: 1.4;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      flex-shrink: 0;
    }
    .status-card[data-state="loading"] .status-dot {
      background: #0d99ff;
      animation: dotPulse 1s ease-in-out infinite;
    }
    .status-card[data-state="success"] .status-dot {
      background: #22c55e;
    }
    .status-card[data-state="error"] .status-dot {
      background: #ef4444;
    }
    .status-card[data-state="error"] {
      background: var(--if-error-bg);
      border-color: var(--if-error-border);
      color: var(--if-error-text);
    }
    .status-card[data-state="success"] {
      background: var(--if-success-bg);
      border-color: var(--if-success-border);
      color: var(--if-success-text);
    }
    @keyframes dotPulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.35;
      }
    }

    /* ---------- Image list ---------- */
    .image-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .image-item {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: var(--if-bg-item);
      border: 1px solid var(--if-border-soft);
      border-radius: 8px;
    }
    .image-item img {
      width: 56px;
      height: 56px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
      background: var(--if-img-placeholder);
    }
    .image-info {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 11px;
      color: var(--if-text-muted);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .image-info strong {
      color: var(--if-text);
      font-weight: 600;
    }
    .image-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .image-url {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--if-text-subtle);
      font-size: 10px;
    }

    /* ---------- Footer ---------- */
    .footer {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px 12px;
      border-top: 1px solid var(--if-border-soft);
      background: var(--if-bg-subtle);
    }
    .footer-hint {
      font-size: 10px;
      color: var(--if-text-subtle);
      text-align: center;
      min-height: 12px;
    }

    /* ---------- Scan modal ---------- */
    .scan-modal {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: var(--if-scrim);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .scan-modal[hidden] {
      display: none;
    }
    .scan-modal-panel {
      position: relative;
      background: var(--if-bg);
      border: 1px solid var(--if-border);
      border-radius: 12px;
      padding: 12px;
      width: calc(100% - 48px);
      max-width: 420px;
      color: var(--if-text);
      animation: scanModal_modalIn 0.25s ease;
      font-family: inherit;
    }
    .scan-modal-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .scan-modal-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--if-text);
    }
    .scan-modal-dots {
      margin-left: auto;
      display: flex;
      gap: 3px;
    }
    .scan-modal-dots > span {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #22c55e;
      animation: scanModal_blink 1s ease infinite;
    }
    .scan-modal-dots > span:nth-child(2) {
      animation-delay: 0.2s;
    }
    .scan-modal-dots > span:nth-child(3) {
      animation-delay: 0.4s;
    }
    .scan-modal-progress {
      margin-bottom: 12px;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--if-bg-muted);
      border: 1px solid var(--if-border);
      font-size: 12px;
      color: var(--if-text);
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .scan-modal-progress[hidden] {
      display: none;
    }
    .scan-modal-progress strong {
      font-weight: 600;
    }
    .scan-modal-progress .secondary {
      color: var(--if-text-subtle);
    }
    .scan-grid-wrap {
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      height: 180px;
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        var(--if-mask-color) 10%,
        var(--if-mask-color) 90%,
        transparent 100%
      );
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        var(--if-mask-color) 10%,
        var(--if-mask-color) 90%,
        transparent 100%
      );
    }
    .scan-grid-track {
      animation: scanModal_scrollUp 22s linear infinite;
      will-change: transform;
    }
    .scan-block {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      width: 100%;
      padding-bottom: 6px;
    }
    .scan-cell {
      aspect-ratio: 3 / 4;
      position: relative;
      overflow: hidden;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .scan-cell-base {
      position: absolute;
      inset: 0;
      border-radius: 4px;
      border: 1px dashed var(--if-border-dashed);
      background: var(--if-bg-muted);
      box-sizing: border-box;
      pointer-events: none;
      z-index: 0;
    }
    .scan-cell-accent {
      position: absolute;
      inset: 0;
      border-radius: 4px;
      border: 1px solid var(--apply-ac);
      background: var(--apply-bg);
      box-sizing: border-box;
      pointer-events: none;
      z-index: 0;
      opacity: 0;
      animation: scanModal_cellAccent 2.6s ease-in-out infinite;
      will-change: opacity;
    }
    .scan-cell-line-wrap {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 4;
    }
    .scan-cell-line-travel {
      position: absolute;
      inset: 0;
      animation: scanModal_scanTravel 2.6s ease-in-out infinite;
      will-change: transform;
    }
    .scan-cell-line {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 2px;
      background: var(--apply-ac);
      box-shadow: 0 0 6px var(--apply-ac);
      animation: scanModal_scanFade 2.6s ease-in-out infinite;
      will-change: opacity;
    }
    .scan-cell-icon {
      position: relative;
      z-index: 2;
      animation: scanModal_iconPulse 2.6s ease-in-out infinite;
    }
    .scan-cell-label {
      position: absolute;
      bottom: 3px;
      left: 2px;
      right: 2px;
      font-size: 6px;
      color: var(--if-label-text);
      font-family: monospace;
      text-align: center;
      line-height: 1.1;
      z-index: 1;
      animation: scanModal_labelFade 2.6s ease-in-out infinite;
    }
    .scan-cell-check {
      position: absolute;
      top: 3px;
      right: 3px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--apply-ac);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 6;
      animation: scanModal_checkPop 2.6s ease-in-out infinite;
    }

    @keyframes scanModal_modalIn {
      from {
        opacity: 0;
        transform: scale(0.94);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes scanModal_blink {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.15;
      }
    }
    @keyframes scanModal_scrollUp {
      from {
        transform: translateY(0);
      }
      to {
        transform: translateY(-50%);
      }
    }
    @keyframes scanModal_cellAccent {
      0%, 6% { opacity: 0; }
      10%, 50% { opacity: 1; }
      72%, 100% { opacity: 0; }
    }
    @keyframes scanModal_scanTravel {
      0%, 10% { transform: translateY(0); }
      38%, 100% { transform: translateY(calc(100% - 2px)); }
    }
    @keyframes scanModal_scanFade {
      0%, 7% { opacity: 0; }
      9%, 38% { opacity: 1; }
      39%, 100% { opacity: 0; }
    }
    @keyframes scanModal_iconPulse {
      0%, 6% { transform: scale(0.92); opacity: 0.65; }
      15% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.03); opacity: 1; }
      100% { transform: scale(1); opacity: 0.9; }
    }
    @keyframes scanModal_labelFade {
      0%, 10% { opacity: 0.45; }
      20%, 45% { opacity: 1; }
      60%, 100% { opacity: 0.35; }
    }
    @keyframes scanModal_checkPop {
      0%, 32% { transform: scale(0); opacity: 0; }
      38% { transform: scale(1.2); opacity: 1; }
      44%, 100% { transform: scale(1); opacity: 1; }
    }
  `;

  // ---------------------------------------------------------------------------
  // Initial UI markup
  // ---------------------------------------------------------------------------
  const panelMarkup = `
    <style>${styleMarkup}</style>
    <div class="panel" id="panel" hidden role="dialog" aria-label="Image Fetcher">
      <header class="header">
        <div class="header-title">
          <img src="${chrome.runtime.getURL("assets/icon.png")}" alt="Image Fetcher" class="icon" style="width: 20px; height: 20px; border-radius: 4px;">
          <h1>Image Fetcher</h1>
        </div>
        <span class="count-pill is-hidden" id="countPill">
          <strong id="countNumber">0</strong>
        </span>
        <button type="button" class="close-btn" id="closeBtn" aria-label="Close" title="Close">×</button>
      </header>

      <main class="main">
        <button type="button" class="btn btn-primary" id="collectBtn">Collect Images</button>

        <div class="status-card" id="status" data-state="idle">
          <span class="status-dot" aria-hidden="true"></span>
          <div id="statusText">Click "Collect Images" to start</div>
        </div>

        <div id="imageList" class="image-list"></div>
      </main>

      <footer class="footer">
        <button type="button" class="btn btn-secondary" id="copyBtn" disabled>Copy All</button>
        <div class="footer-hint">Copy to clipboard after collecting</div>
      </footer>
    </div>

    <div class="scan-modal" id="scanModal" hidden role="alertdialog" aria-busy="true" aria-label="Scanning images">
      <div class="scan-modal-panel">
        <div class="scan-modal-header">
          <div class="scan-modal-title">Scanning images...</div>
          <div class="scan-modal-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="scan-modal-progress" id="scanProgress" hidden>
          <strong id="scanProgressCurrent">0</strong>
          <span class="secondary"> / </span>
          <strong id="scanProgressTotal">0</strong>
          <span class="secondary"> scanned</span>
        </div>
        <div class="scan-grid-wrap">
          <div class="scan-grid-track" id="scanGridTrack"></div>
        </div>
      </div>
    </div>
  `;

  shadow.innerHTML = panelMarkup;

  // Helper to look up elements inside the shadow root
  const $ = (id) => shadow.getElementById(id);
  const panel = $("panel");

  // ===========================================================================
  // Logic ported from popup.js
  // ===========================================================================

  let collectedImages = [];

  // ---------------------------------------------------------------------------
  // Status display
  // ---------------------------------------------------------------------------
  function updateStatus(message, type) {
    const statusEl = $("statusText");
    const statusCard = $("status");
    if (!statusEl || !statusCard) return;
    const cleaned = String(message || "").replace(/^\s*(✅|❌|⚠️|ℹ️)\s*/u, "");
    statusEl.textContent = cleaned || String(message || "");
    const nextState =
      type === "error"
        ? "error"
        : type === "success"
          ? "success"
          : type === "loading"
            ? "loading"
            : "idle";
    statusCard.setAttribute("data-state", nextState);
  }

  function updateCountPill(count) {
    const pill = $("countPill");
    const num = $("countNumber");
    if (!pill || !num) return;
    if (count > 0) {
      num.textContent = String(count);
      pill.classList.remove("is-hidden");
    } else {
      pill.classList.add("is-hidden");
    }
  }

  function escapeHtmlAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  // ---------------------------------------------------------------------------
  // Render the image list
  // ---------------------------------------------------------------------------
  function displayImages(images) {
    const listEl = $("imageList");
    if (!listEl) return;
    listEl.innerHTML = "";
    updateCountPill(images.length);

    images.forEach((img, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "image-item";
      const titleHtml = img.alt
        ? `<div class="image-title"><strong>Title:</strong> ${escapeHtmlAttr(img.alt)}</div>`
        : "";
      itemEl.innerHTML = `
        <img src="${escapeHtmlAttr(img.src)}" alt="Image ${index + 1}" onerror="this.style.display='none'">
        <div class="image-info">
          <div><strong>Size:</strong> ${img.width} × ${img.height}</div>
          ${titleHtml}
          <div class="image-url" title="${escapeHtmlAttr(img.src)}">${escapeHtmlAttr(img.src)}</div>
        </div>
      `;
      listEl.appendChild(itemEl);
    });
  }

  // ---------------------------------------------------------------------------
  // Encryption key and service-name detection
  // ---------------------------------------------------------------------------
  const ENCRYPTION_KEY = new Uint8Array([
    0x2a, 0x7f, 0x9c, 0x3e, 0x1b, 0x8d, 0x4f, 0x6a, 0x5c, 0x2e, 0x9a, 0x1d,
    0x8b, 0x4c, 0x6f, 0x3a, 0x7b, 0x2c, 0x9d, 0x1e, 0x8a, 0x4b, 0x6c, 0x3d,
    0x5e, 0x2f, 0x9b, 0x1c, 0x8c, 0x4d, 0x6e, 0x3b,
  ]);

  function getServiceNameFromHostname(hostname) {
    const servicePatterns = [
      { pattern: /netflix\.com|nflxext\.|nflximg\.|nflxso\.|^nflx/i, name: "Netflix" },
      { pattern: /youtube\.com|youtu\.be|ytimg\.com/i, name: "YouTube" },
      { pattern: /amazon\.(com|co\.jp|jp)/i, name: "Amazon" },
      { pattern: /dmm\.(com|co\.jp)/i, name: "DMM" },
      { pattern: /video\.dmm\.co\.jp/i, name: "DMM" },
      { pattern: /unext\.jp/i, name: "U-NEXT" },
      { pattern: /twitter\.com|x\.com/i, name: "Twitter/X" },
      { pattern: /instagram\.com/i, name: "Instagram" },
      { pattern: /facebook\.com/i, name: "Facebook" },
      { pattern: /linkedin\.com/i, name: "LinkedIn" },
      { pattern: /github\.com/i, name: "GitHub" },
      { pattern: /spotify\.com/i, name: "Spotify" },
      { pattern: /discord\.com/i, name: "Discord" },
      { pattern: /reddit\.com/i, name: "Reddit" },
      { pattern: /pinterest\.com/i, name: "Pinterest" },
      { pattern: /tiktok\.com/i, name: "TikTok" },
      { pattern: /twitch\.tv/i, name: "Twitch" },
      { pattern: /vimeo\.com/i, name: "Vimeo" },
      { pattern: /dribbble\.com/i, name: "Dribbble" },
      { pattern: /behance\.net/i, name: "Behance" },
      { pattern: /figma\.com/i, name: "Figma" },
      { pattern: /notion\.so/i, name: "Notion" },
      { pattern: /medium\.com/i, name: "Medium" },
      { pattern: /dropbox\.com/i, name: "Dropbox" },
      { pattern: /google\.com/i, name: "Google" },
      { pattern: /apple\.com/i, name: "Apple" },
      { pattern: /microsoft\.com/i, name: "Microsoft" },
      { pattern: /adobe\.com/i, name: "Adobe" },
    ];
    for (const { pattern, name } of servicePatterns) {
      if (pattern.test(hostname)) return name;
    }
    const domainParts = hostname.split(".");
    if (domainParts.length >= 2) {
      const mainDomain = domainParts[domainParts.length - 2];
      if (mainDomain.toLowerCase().startsWith("nflx")) return "Netflix";
    }
    const twoPartTlds = ["co", "com", "net", "org", "edu", "gov", "ac", "ne"];
    if (domainParts.length >= 2) {
      let mainDomainIndex = domainParts.length - 2;
      if (
        domainParts.length >= 3 &&
        twoPartTlds.includes(domainParts[domainParts.length - 2].toLowerCase())
      ) {
        mainDomainIndex = domainParts.length - 3;
      }
      if (mainDomainIndex >= 0 && mainDomainIndex < domainParts.length) {
        const mainDomain = domainParts[mainDomainIndex];
        return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      }
    }
    return "Unknown";
  }

  function extractServiceName(imageUrl, pageUrl) {
    if (pageUrl) {
      try {
        const pageUrlObj = new URL(pageUrl);
        const pageHostname = pageUrlObj.hostname.toLowerCase();
        const pagePathname = pageUrlObj.pathname.toLowerCase();
        const pathBasedServices = [
          { pattern: /\/gp\/video\/|\/video\/|prime.*video/i, name: "Prime Video" },
          { pattern: /tv\.dmm\.com|\/vod\//i, name: "DMM TV" },
          { pattern: /\/music\/|music\./i, name: "Amazon Music" },
          { pattern: /\/kindle\/|kindle\./i, name: "Kindle" },
          { pattern: /\/audible\/|audible\./i, name: "Audible" },
        ];
        for (const { pattern, name } of pathBasedServices) {
          if (pattern.test(pagePathname) || pattern.test(pageUrl)) return name;
        }
        const serviceFromPage = getServiceNameFromHostname(pageHostname);
        if (serviceFromPage !== "Unknown") return serviceFromPage;
      } catch (e) {
        // ignore
      }
    }
    let urlToCheck = imageUrl;
    if (!urlToCheck) return "Unknown";
    try {
      let urlObj;
      try {
        urlObj = new URL(urlToCheck);
      } catch (e) {
        if (pageUrl) {
          try {
            urlObj = new URL(urlToCheck, pageUrl);
          } catch (e2) {
            return "Unknown";
          }
        } else {
          return "Unknown";
        }
      }
      const hostname = urlObj.hostname.toLowerCase();
      return getServiceNameFromHostname(hostname);
    } catch (error) {
      return "Unknown";
    }
  }

  async function encryptData(data) {
    const key = await crypto.subtle.importKey(
      "raw",
      ENCRYPTION_KEY,
      { name: "AES-CBC", length: 256 },
      false,
      ["encrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: iv },
      key,
      encodedData,
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    let binaryString = "";
    for (let i = 0; i < combined.length; i++) {
      binaryString += String.fromCharCode(combined[i]);
    }
    return btoa(binaryString);
  }

  async function fetchImageAsBase64(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ---------------------------------------------------------------------------
  // Scan modal (equivalent to ApplyImageLoadingModal)
  // ---------------------------------------------------------------------------
  const SCAN_NAMES = [
    "Hero", "Card 01", "Banner", "Promo", "Card 02", "Thumb A",
    "Card 03", "Sidebar", "Footer", "Modal", "Thumb B", "Card 04",
  ];
  const SCAN_AC = [
    "#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#22c55e", "#8b5cf6",
    "#3b82f6", "#f59e0b", "#22c55e", "#ec4899", "#8b5cf6", "#3b82f6",
  ];
  const SCAN_BG = [
    "#1a3a25", "#1a2a3a", "#3a2a10", "#3a1a2a", "#1a3a25", "#2a1a3a",
    "#1a2a3a", "#3a2a10", "#1a3a25", "#3a1a2a", "#2a1a3a", "#1a2a3a",
  ];
  const SCAN_ROWS_IN_BLOCK = 6;
  const SCAN_COLS = 4;
  const SCAN_CELLS_IN_BLOCK = SCAN_ROWS_IN_BLOCK * SCAN_COLS;
  const SCAN_CELL_CYCLE_S = 2.6;

  function buildScanIconSvg(ac) {
    return (
      '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
      `<rect x="1" y="1" width="12" height="12" rx="1.5" stroke="${ac}" stroke-width="0.8" opacity="0.85"/>` +
      `<circle cx="4.5" cy="4.5" r="1.3" fill="${ac}" opacity="0.75"/>` +
      `<path d="M1 9.5l3-2.5 2.5 2 2.5-3.5 4 5" stroke="${ac}" stroke-width="0.8" fill="none" stroke-linejoin="round"/>` +
      "</svg>"
    );
  }
  function buildScanCheckSvg() {
    return (
      '<svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true">' +
      '<path d="M1 3.5L2.8 5.2L6 1.5" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }
  function buildScanCell(i) {
    const tone = i % SCAN_NAMES.length;
    const ac = SCAN_AC[tone];
    const bg = SCAN_BG[tone];
    const idx = SCAN_CELLS_IN_BLOCK - 1 - i;
    const stagger = -((idx * (SCAN_CELL_CYCLE_S / SCAN_CELLS_IN_BLOCK)) % SCAN_CELL_CYCLE_S);
    const delay = `${stagger}s`;
    const cell = document.createElement("div");
    cell.className = "scan-cell";
    cell.style.setProperty("--apply-ac", ac);
    cell.style.setProperty("--apply-bg", bg);
    cell.innerHTML = `
      <div class="scan-cell-base"></div>
      <div class="scan-cell-accent" style="animation-delay: ${delay};"></div>
      <div class="scan-cell-line-wrap">
        <div class="scan-cell-line-travel" style="animation-delay: ${delay};">
          <div class="scan-cell-line" style="animation-delay: ${delay};"></div>
        </div>
      </div>
      <div class="scan-cell-icon" style="animation-delay: ${delay};">${buildScanIconSvg(ac)}</div>
      <div class="scan-cell-label" style="animation-delay: ${delay};">${SCAN_NAMES[tone]}</div>
      <div class="scan-cell-check" style="animation-delay: ${delay};">${buildScanCheckSvg()}</div>
    `;
    return cell;
  }
  let scanGridBuilt = false;
  function ensureScanGrid() {
    if (scanGridBuilt) return;
    const track = $("scanGridTrack");
    if (!track) return;
    for (let b = 0; b < 2; b++) {
      const block = document.createElement("div");
      block.className = "scan-block";
      for (let i = 0; i < SCAN_CELLS_IN_BLOCK; i++) {
        block.appendChild(buildScanCell(i));
      }
      track.appendChild(block);
    }
    scanGridBuilt = true;
  }
  function showScanModal(total) {
    ensureScanGrid();
    const modal = $("scanModal");
    const progress = $("scanProgress");
    if (!modal) return;
    modal.hidden = false;
    if (progress) {
      if (typeof total === "number" && total > 0) {
        progress.hidden = false;
        updateScanProgress(0, total);
      } else {
        progress.hidden = true;
      }
    }
  }
  function updateScanProgress(current, total) {
    const cur = $("scanProgressCurrent");
    const tot = $("scanProgressTotal");
    if (cur) cur.textContent = String(current);
    if (tot && typeof total === "number") tot.textContent = String(total);
  }
  function hideScanModal() {
    const modal = $("scanModal");
    if (modal) modal.hidden = true;
  }

  // ---------------------------------------------------------------------------
  // .imagefetcher export
  // ---------------------------------------------------------------------------
  async function exportToImageFetcherFile(images) {
    if (!images || images.length === 0) return;

    updateStatus(`Scanning ${images.length} images...`, "loading");
    showScanModal(images.length);

    try {
      const imagesWithBase64 = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        try {
          updateScanProgress(i, images.length);
          updateStatus(`Scanning images... (${i + 1}/${images.length})`, "loading");
          const base64 = await fetchImageAsBase64(img.src);
          const serviceName = extractServiceName(img.src, img.pageUrl);
          imagesWithBase64.push({
            src: img.src,
            width: img.width,
            height: img.height,
            alt: img.alt || "",
            base64: base64,
            service: serviceName,
            favicon: img.favicon || null,
          });
          successCount++;
          updateScanProgress(successCount, images.length);
        } catch (error) {
          console.error("Failed to fetch:", img.src, error);
          failCount++;
        }
      }

      if (imagesWithBase64.length > 0) {
        const jsonString = JSON.stringify(imagesWithBase64, null, 2);
        const encryptedData = await encryptData(jsonString);

        const services = new Set(
          imagesWithBase64.map((img) => img.service).filter(Boolean),
        );
        let serviceName = "";
        if (services.size === 1) {
          serviceName = Array.from(services)[0].toLowerCase().replace(/[^a-z0-9]/g, "_");
        } else if (services.size > 1) {
          serviceName = "mixed";
        } else {
          serviceName = "unknown";
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        const filename = serviceName
          ? `${serviceName}_${timestamp}.imagefetcher`
          : `images_${timestamp}.imagefetcher`;

        const blob = new Blob([encryptedData], { type: "text/plain" });
        const blobUrl = URL.createObjectURL(blob);
        try {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          updateStatus(
            `Saved ${successCount} images to .imagefetcher file!${failCount > 0 ? ` (${failCount} failed)` : ""}`,
            "success",
          );
        } catch (downloadError) {
          console.error("Download error:", downloadError);
          updateStatus(
            `Failed to download file: ${downloadError.message}`,
            "error",
          );
        }
      } else {
        updateStatus("Failed to fetch images", "error");
      }
    } catch (error) {
      console.error("Export error:", error);
      updateStatus(`Export failed: ${error.message}`, "error");
    } finally {
      hideScanModal();
    }
  }

  // ---------------------------------------------------------------------------
  // Collect images from the page (while scrolling)
  // ---------------------------------------------------------------------------
  async function collectImagesFromPage() {
    function getFaviconFromPage() {
      const iconLinks = document.querySelectorAll(
        'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
      );
      for (const link of iconLinks) {
        const href = link.getAttribute("href");
        if (href) {
          try {
            return new URL(href, window.location.href).href;
          } catch (e) {
            return href.startsWith("http") ? href : new URL(href, window.location.href).href;
          }
        }
      }
      try {
        return new URL("/favicon.ico", window.location.href).href;
      } catch (e) {
        return null;
      }
    }

    const isSupportedFormat = (url) => {
      if (!url) return false;
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes(".svg")) return false;
      if (lowerUrl.startsWith("data:")) return false;
      if (
        lowerUrl.includes(".jpg") ||
        lowerUrl.includes(".jpeg") ||
        lowerUrl.includes(".png") ||
        lowerUrl.includes(".gif") ||
        lowerUrl.includes(".webp") ||
        lowerUrl.includes(".avif")
      ) {
        return true;
      }
      if (
        lowerUrl.includes("?") ||
        lowerUrl.includes("/image") ||
        lowerUrl.includes("/img") ||
        lowerUrl.includes("/photo") ||
        lowerUrl.includes("/picture")
      ) {
        return true;
      }
      return !lowerUrl.includes(".css") && !lowerUrl.includes(".js");
    };

    function extractBackgroundImageUrl(element) {
      const style = window.getComputedStyle(element);
      const bgImage = style.backgroundImage;
      if (!bgImage || bgImage === "none") return null;
      const match = bgImage.match(/url\(["']?([^"']+)["']?\)/);
      if (match && match[1]) {
        let url = match[1];
        if (url.startsWith("/")) {
          url = window.location.origin + url;
        } else if (!url.startsWith("http")) {
          url = new URL(url, window.location.href).href;
        }
        return url;
      }
      return null;
    }

    function normalizeLabel(s) {
      if (s == null || typeof s !== "string") return "";
      return s.replace(/\s+/g, " ").trim();
    }
    function getByDomId(id) {
      if (!id) return null;
      try { return document.getElementById(id); } catch (e) { return null; }
    }
    function resolveAriaLabelledby(el) {
      const ids = el.getAttribute("aria-labelledby");
      if (!ids) return "";
      const parts = ids.trim().split(/\s+/).filter(Boolean);
      const out = [];
      for (const id of parts) {
        const node = getByDomId(id);
        if (node) {
          const t = normalizeLabel(node.textContent);
          if (t) out.push(t);
        }
      }
      return out.join(" ");
    }
    function getImageTitleFromImg(img) {
      const direct = [
        normalizeLabel(img.getAttribute("aria-label")),
        normalizeLabel(img.alt),
        normalizeLabel(img.getAttribute("title")),
        resolveAriaLabelledby(img),
      ];
      for (let i = 0; i < direct.length; i++) {
        if (direct[i]) return direct[i];
      }
      let p = img.parentElement;
      for (let depth = 0; depth < 8 && p; depth++) {
        if (p.tagName === "FIGURE") {
          const cap = p.querySelector("figcaption");
          if (cap) {
            const t = normalizeLabel(cap.textContent);
            if (t) return t;
          }
        }
        const a = normalizeLabel(p.getAttribute("aria-label"));
        if (a) return a;
        const tt = normalizeLabel(p.getAttribute("title"));
        if (tt) return tt;
        p = p.parentElement;
      }
      return "";
    }
    function getImageTitleFromBackgroundHost(el) {
      const direct = [
        normalizeLabel(el.getAttribute("aria-label")),
        normalizeLabel(el.getAttribute("title")),
        resolveAriaLabelledby(el),
      ];
      for (let i = 0; i < direct.length; i++) {
        if (direct[i]) return direct[i];
      }
      const heading = el.querySelector("h1, h2, h3, h4, h5, h6");
      if (heading) {
        const t = normalizeLabel(heading.textContent);
        if (t) return t;
      }
      let text = normalizeLabel(el.innerText || "");
      if (text.length > 200) text = text.slice(0, 200) + "…";
      if (text) return text;
      let p = el.parentElement;
      for (let depth = 0; depth < 5 && p; depth++) {
        if (p.tagName === "FIGURE") {
          const cap = p.querySelector("figcaption");
          if (cap) {
            const t = normalizeLabel(cap.textContent);
            if (t) return t;
          }
        }
        const a = normalizeLabel(p.getAttribute("aria-label"));
        if (a) return a;
        p = p.parentElement;
      }
      return "";
    }
    function getImageTitleFromPicture(picture) {
      const innerImg = picture.querySelector("img");
      if (innerImg) return getImageTitleFromImg(innerImg);
      const direct = [
        normalizeLabel(picture.getAttribute("aria-label")),
        normalizeLabel(picture.getAttribute("title")),
        resolveAriaLabelledby(picture),
      ];
      for (let i = 0; i < direct.length; i++) {
        if (direct[i]) return direct[i];
      }
      return "";
    }

    function collectCurrentImages() {
      const images = [];
      const seenSrcs = new Set();

      // Skip anything inside our own host so we don't collect <img> tags
      // (e.g. the logo) from this content script's Shadow DOM.
      const imageElements = document.querySelectorAll("img");
      imageElements.forEach((img) => {
        if (host.contains(img)) return;
        if (img.naturalWidth > 50 && img.naturalHeight > 50) {
          const src = img.src || img.currentSrc || img.dataset.src;
          if (src && isSupportedFormat(src) && !seenSrcs.has(src)) {
            seenSrcs.add(src);
            images.push({
              src: src,
              alt: getImageTitleFromImg(img),
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
        }
      });

      const pictureElements = document.querySelectorAll("picture");
      pictureElements.forEach((picture) => {
        if (host.contains(picture)) return;
        const sources = picture.querySelectorAll("source");
        sources.forEach((source) => {
          const srcset = source.srcset;
          const titleFromPicture = getImageTitleFromPicture(picture);
          if (srcset) {
            const urls = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]);
            urls.forEach((url) => {
              if (url && isSupportedFormat(url) && !seenSrcs.has(url)) {
                seenSrcs.add(url);
                images.push({ src: url, alt: titleFromPicture, width: 0, height: 0 });
              }
            });
          }
        });
        const img = picture.querySelector("img");
        if (img && img.naturalWidth > 50 && img.naturalHeight > 50) {
          const src = img.src || img.currentSrc || img.dataset.src;
          if (src && isSupportedFormat(src) && !seenSrcs.has(src)) {
            seenSrcs.add(src);
            images.push({
              src: src,
              alt: getImageTitleFromImg(img),
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
        }
      });

      const elementsToCheck = document.querySelectorAll(
        "div, section, article, figure, header, main",
      );
      elementsToCheck.forEach((element) => {
        if (host.contains(element)) return;
        const bgUrl = extractBackgroundImageUrl(element);
        if (bgUrl && isSupportedFormat(bgUrl) && !seenSrcs.has(bgUrl)) {
          const rect = element.getBoundingClientRect();
          if (
            rect.width > 100 &&
            rect.height > 100 &&
            rect.top < window.innerHeight &&
            rect.bottom > 0
          ) {
            seenSrcs.add(bgUrl);
            images.push({
              src: bgUrl,
              alt: getImageTitleFromBackgroundHost(element),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
      });

      return images;
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const faviconUrl = getFaviconFromPage();
    const allImages = [];
    const seenUrls = new Set();

    window.scrollTo(0, 0);
    await sleep(300);
    for (const img of collectCurrentImages()) {
      if (!seenUrls.has(img.src)) {
        seenUrls.add(img.src);
        allImages.push(img);
      }
    }

    const scrollStep = 500;
    const scrollDelay = 300;
    let previousHeight = 0;
    let scrollPosition = 0;

    while (true) {
      scrollPosition += scrollStep;
      window.scrollTo(0, scrollPosition);
      await sleep(scrollDelay);

      for (const img of collectCurrentImages()) {
        if (!seenUrls.has(img.src)) {
          seenUrls.add(img.src);
          allImages.push(img);
        }
      }

      const currentHeight = document.documentElement.scrollHeight;
      const maxScroll = currentHeight - window.innerHeight;
      if (scrollPosition >= maxScroll) {
        await sleep(scrollDelay);
        for (const img of collectCurrentImages()) {
          if (!seenUrls.has(img.src)) {
            seenUrls.add(img.src);
            allImages.push(img);
          }
        }
        break;
      }
      if (currentHeight === previousHeight && scrollPosition >= maxScroll) break;
      previousHeight = currentHeight;
    }

    window.scrollTo(0, 0);

    return { images: allImages, favicon: faviconUrl };
  }

  // ---------------------------------------------------------------------------
  // Event bindings
  // ---------------------------------------------------------------------------
  $("closeBtn").addEventListener("click", () => {
    if (panel) panel.hidden = true;
  });

  $("collectBtn").addEventListener("click", async () => {
    updateStatus("Collecting images...", "loading");
    try {
      const result = await collectImagesFromPage();
      let images = result.images || [];
      const faviconUrl = result.favicon || null;
      const currentPageUrl = window.location.href || "";

      images = images.map((img) => ({
        ...img,
        pageUrl: currentPageUrl,
        favicon: faviconUrl,
      }));
      images = images.filter((img) => img.src && img.src.length < 500);

      const simplifiedImages = images.map((img) => ({
        src: img.src,
        w: img.width,
        h: img.height,
        alt: img.alt || "",
        favicon: img.favicon || null,
      }));

      try {
        await chrome.storage.local.clear();
        await chrome.storage.local.set({ images: simplifiedImages });
        collectedImages = images;
        updateStatus(`Collected ${collectedImages.length} images`, "success");
        displayImages(collectedImages);
        $("copyBtn").disabled = false;
        await exportToImageFetcherFile(collectedImages);
      } catch (storageError) {
        console.error("Storage error:", storageError);
        collectedImages = images;
        updateStatus(
          `Collected ${collectedImages.length} images (storage save failed)`,
          "info",
        );
        displayImages(collectedImages);
        $("copyBtn").disabled = false;
        await exportToImageFetcherFile(collectedImages);
      }
    } catch (error) {
      console.error("Error:", error);
      updateStatus(`Error: ${error.message}`, "error");
    }
  });

  $("copyBtn").addEventListener("click", async () => {
    const images = collectedImages || [];
    if (images.length === 0) {
      updateStatus("No images found", "error");
      return;
    }
    updateStatus(`Scanning ${images.length} images...`, "loading");
    showScanModal(images.length);

    try {
      const imagesWithBase64 = [];
      let successCount = 0;
      let failCount = 0;
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        try {
          updateScanProgress(i, images.length);
          updateStatus(`Scanning images... (${i + 1}/${images.length})`, "loading");
          const base64 = await fetchImageAsBase64(img.src);
          const serviceName = extractServiceName(img.src, img.pageUrl);
          imagesWithBase64.push({
            src: img.src,
            width: img.width,
            height: img.height,
            alt: img.alt || "",
            base64: base64,
            service: serviceName,
            favicon: img.favicon || null,
          });
          successCount++;
          updateScanProgress(successCount, images.length);
        } catch (error) {
          console.error("Failed to fetch:", img.src, error);
          failCount++;
        }
      }

      if (imagesWithBase64.length > 0) {
        const jsonString = JSON.stringify(imagesWithBase64, null, 2);
        const encryptedData = await encryptData(jsonString);
        await navigator.clipboard.writeText(encryptedData);
        updateStatus(
          `Copied ${successCount} images!${failCount > 0 ? ` (${failCount} failed)` : ""}`,
          "success",
        );
      } else {
        updateStatus("Failed to fetch images", "error");
      }
    } catch (error) {
      console.error("Copy error:", error);
      updateStatus(`Copy failed: ${error.message}`, "error");
    } finally {
      hideScanModal();
    }
  });

  // ---------------------------------------------------------------------------
  // On startup: restore previously saved images
  // ---------------------------------------------------------------------------
  chrome.storage.local.get(["images"], (result) => {
    if (result && result.images && result.images.length > 0) {
      collectedImages = result.images.map((img) => ({
        src: img.src,
        width: img.w,
        height: img.h,
        alt: img.alt || "",
        favicon: img.favicon || null,
      }));
      displayImages(collectedImages);
      $("copyBtn").disabled = false;
      updateStatus(`Loaded ${collectedImages.length} saved images`, "success");
    }
  });

  // ---------------------------------------------------------------------------
  // Handle TOGGLE_PANEL messages from background
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.type === "TOGGLE_PANEL") {
      if (panel) {
        panel.hidden = !panel.hidden;
      }
      sendResponse({ ok: true, hidden: panel ? panel.hidden : true });
      return true;
    }
  });

  console.log("image-fetcher: Content script ready");
})();
