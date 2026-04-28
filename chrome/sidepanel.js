// =============================================================================
// Image Fetcher - Side Panel Script
// -----------------------------------------------------------------------------
// Chrome のサイドパネルに表示される UI のロジック。
// 画像の収集はアクティブタブの content script に対して
// chrome.scripting.executeScript で関数注入して実行する。
// =============================================================================

const $ = (id) => document.getElementById(id);

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
  0x2a, 0x7f, 0x9c, 0x3e, 0x1b, 0x8d, 0x4f, 0x6a, 0x5c, 0x2e, 0x9a, 0x1d, 0x8b,
  0x4c, 0x6f, 0x3a, 0x7b, 0x2c, 0x9d, 0x1e, 0x8a, 0x4b, 0x6c, 0x3d, 0x5e, 0x2f,
  0x9b, 0x1c, 0x8c, 0x4d, 0x6e, 0x3b,
]);

function getServiceNameFromHostname(hostname) {
  const servicePatterns = [
    {
      pattern: /netflix\.com|nflxext\.|nflximg\.|nflxso\.|^nflx/i,
      name: "Netflix",
    },
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
        {
          pattern: /\/gp\/video\/|\/video\/|prime.*video/i,
          name: "Prime Video",
        },
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

// ---------------------------------------------------------------------------
// Image fetch to base64 (runs in side panel context)
// ---------------------------------------------------------------------------
async function fetchImageAsBase64(url) {
  // まずサイドパネル自身で fetch を試みる。CORS で弾かれた場合は
  // service worker (background) 側に委譲してダウンロードする。
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (directErr) {
    try {
      const res = await chrome.runtime.sendMessage({
        type: "DOWNLOAD_IMAGE",
        url,
      });
      if (res && res.success && res.base64) return res.base64;
      throw new Error((res && res.error) || "background download failed");
    } catch (bgErr) {
      throw directErr;
    }
  }
}

function blobToBase64(blob) {
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
  "Hero",
  "Card 01",
  "Banner",
  "Promo",
  "Card 02",
  "Thumb A",
  "Card 03",
  "Sidebar",
  "Footer",
  "Modal",
  "Thumb B",
  "Card 04",
];
const SCAN_AC = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#22c55e",
  "#8b5cf6",
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
];
const SCAN_BG = [
  "#1a3a25",
  "#1a2a3a",
  "#3a2a10",
  "#3a1a2a",
  "#1a3a25",
  "#2a1a3a",
  "#1a2a3a",
  "#3a2a10",
  "#1a3a25",
  "#3a1a2a",
  "#2a1a3a",
  "#1a2a3a",
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
  const stagger = -(
    (idx * (SCAN_CELL_CYCLE_S / SCAN_CELLS_IN_BLOCK)) %
    SCAN_CELL_CYCLE_S
  );
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
        updateStatus(
          `Scanning images... (${i + 1}/${images.length})`,
          "loading",
        );
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
        serviceName = Array.from(services)[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_");
      } else if (services.size > 1) {
        serviceName = "mixed";
      } else {
        serviceName = "unknown";
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
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
// Collect images from the active tab
// -----------------------------------------------------------------------------
// chrome.scripting.executeScript で注入する関数。サイドパネル外のクロージャを
// 参照できないため、この関数は自己完結している必要がある。
// ---------------------------------------------------------------------------
function collectImagesFromPage() {
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
          return href.startsWith("http")
            ? href
            : new URL(href, window.location.href).href;
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
    try {
      return document.getElementById(id);
    } catch (e) {
      return null;
    }
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
  // ある要素の中で「カードのタイトルとして使える」見出しを探す。
  // ul のように複数カードを束ねる祖先まで遡ったときに別カードの見出しを拾わないよう
  // 見出しが 1 つしか含まれていないコンテナだけ採用する。
  function findScopedHeadingText(container) {
    if (!container || !container.querySelectorAll) return "";
    const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (!headings || headings.length !== 1) return "";
    const t = normalizeLabel(headings[0].textContent);
    if (!t || t.length > 200) return "";
    return t;
  }

  // バッジ・グラデーション・オーバーレイなどタイトルではない装飾要素の判定。
  // Prime Video の「人気上昇中 / セール」バッジや Amazon の eocGradient,
  // card-overlay などを誤ってタイトルとして拾わないために使う。
  function isMetadataBadgeLike(el) {
    if (!el || !el.getAttribute) return false;
    const testid = el.getAttribute("data-testid") || "";
    if (/badge|overlay|gradient/i.test(testid)) return true;
    const cls =
      el.className && typeof el.className === "string" ? el.className : "";
    if (/badge|gradient|overlay|eocAndTextMetadata|statusBadge/i.test(cls)) {
      return true;
    }
    return false;
  }

  // 画像と同じカード内の兄弟要素から「タイトル」候補を取り出す。
  // - aria-label / title / data-card-title などの属性
  // - <a> / <button> のテキスト
  // - 単独見出し（h1-h6）
  // - 短いテキスト（<= 80 chars）
  function getTitleFromSibling(sib) {
    if (!sib || !sib.getAttribute) return "";
    if (isMetadataBadgeLike(sib)) return "";

    const al = normalizeLabel(sib.getAttribute("aria-label"));
    if (al) return al;
    const ti = normalizeLabel(sib.getAttribute("title"));
    if (ti) return ti;

    const dataAttrs = [
      "data-card-title",
      "data-title",
      "data-card-name",
      "data-name",
    ];
    for (const attr of dataAttrs) {
      const v = normalizeLabel(sib.getAttribute(attr));
      if (v) return v;
    }

    const h = findScopedHeadingText(sib);
    if (h) return h;

    if (sib.tagName === "A" || sib.tagName === "BUTTON") {
      const t = normalizeLabel(sib.textContent || "");
      if (t && t.length > 0 && t.length <= 120) return t;
    }

    const txt = normalizeLabel(sib.innerText || sib.textContent || "");
    if (txt && txt.length > 0 && txt.length <= 80) return txt;
    return "";
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
    let prev = img;
    for (let depth = 0; depth < 10 && p; depth++) {
      if (p.tagName === "FIGURE") {
        const cap = p.querySelector("figcaption");
        if (cap) {
          const t = normalizeLabel(cap.textContent);
          if (t) return t;
        }
      }

      const al = normalizeLabel(p.getAttribute("aria-label"));
      if (al) return al;
      const ti = normalizeLabel(p.getAttribute("title"));
      if (ti) return ti;

      // Amazon Prime Video など、カードのルート article に
      // data-card-title でタイトルが埋め込まれているケース。
      const ancestorDataAttrs = [
        "data-card-title",
        "data-title",
        "data-card-name",
        "data-name",
      ];
      for (const attr of ancestorDataAttrs) {
        const v = normalizeLabel(p.getAttribute(attr));
        if (v) return v;
      }

      // 祖先 p の兄弟（= prev と並ぶ要素）からタイトル候補を探す。
      // Amazon Prime Video のカード:
      //   <div class="packshot">
      //     <button aria-label="..."></button>     ← これがマッチ
      //     <a class="detailLink">タイトル</a>     ← フォールバック
      //     <div class="imageContainer">          ← prev
      //       <picture><img/></picture>
      //     </div>
      //     <span data-testid="metadata-badge">..</span>  ← 除外
      //   </div>
      if (p.children && p.children.length) {
        for (let i = 0; i < p.children.length; i++) {
          const sib = p.children[i];
          if (sib === prev) continue;
          const t = getTitleFromSibling(sib);
          if (t) return t;
        }
      }

      // フォールバック: 祖先カード内に単独の見出しがあればそれをタイトルとする。
      const headingText = findScopedHeadingText(p);
      if (headingText) return headingText;

      prev = p;
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

    const imageElements = document.querySelectorAll("img");
    imageElements.forEach((img) => {
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
      const sources = picture.querySelectorAll("source");
      sources.forEach((source) => {
        const srcset = source.srcset;
        const titleFromPicture = getImageTitleFromPicture(picture);
        if (srcset) {
          const urls = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]);
          urls.forEach((url) => {
            if (url && isSupportedFormat(url) && !seenSrcs.has(url)) {
              seenSrcs.add(url);
              images.push({
                src: url,
                alt: titleFromPicture,
                width: 0,
                height: 0,
              });
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

  return new Promise(async (resolve) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
      if (currentHeight === previousHeight && scrollPosition >= maxScroll)
        break;
      previousHeight = currentHeight;
    }

    window.scrollTo(0, 0);

    resolve({ images: allImages, favicon: faviconUrl });
  });
}

async function runCollect() {
  updateStatus("Collecting images...", "loading");
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab || tab.id == null) {
      updateStatus("No active tab found", "error");
      return;
    }

    let scriptResults;
    try {
      scriptResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectImagesFromPage,
      });
    } catch (execErr) {
      console.error("executeScript failed:", execErr);
      updateStatus(
        `Can't access this page: ${execErr.message || execErr}`,
        "error",
      );
      return;
    }

    const result =
      scriptResults && scriptResults[0] && scriptResults[0].result
        ? scriptResults[0].result
        : { images: [], favicon: null };
    let images = result.images || [];
    const faviconUrl = result.favicon || null;
    const currentPageUrl = tab.url || "";

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
      await exportToImageFetcherFile(collectedImages);
    } catch (storageError) {
      console.error("Storage error:", storageError);
      collectedImages = images;
      updateStatus(
        `Collected ${collectedImages.length} images (storage save failed)`,
        "idle",
      );
      displayImages(collectedImages);
      await exportToImageFetcherFile(collectedImages);
    }
  } catch (error) {
    console.error("Error:", error);
    updateStatus(`Error: ${error.message}`, "error");
  }
}

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const collectBtn = $("collectBtn");
  if (collectBtn) {
    collectBtn.addEventListener("click", runCollect);
  }

  // 起動時に保存済みの画像を復元する
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
      updateStatus(
        `Loaded ${collectedImages.length} saved images`,
        "success",
      );
    }
  });
});
