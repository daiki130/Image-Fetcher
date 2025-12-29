let collectedImages = [];

// 画像収集ボタン
document.getElementById("collectBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  updateStatus("画像を収集中...", "loading");

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: collectImagesFromPage,
    });

    if (results && results[0] && results[0].result) {
      const result = results[0].result;
      let collectedImages = result.images || [];
      const faviconUrl = result.favicon || null;

      // 現在のページURLを各画像に追加
      const currentPageUrl = tab.url || "";
      collectedImages = collectedImages.map((img) => ({
        ...img,
        pageUrl: currentPageUrl,
        favicon: faviconUrl, // faviconも各画像に追加
      }));

      // URLが長すぎる画像を除外(データURL等)
      collectedImages = collectedImages.filter((img) => img.src.length < 500);

      // 最小限のデータのみ保存（faviconも含める）
      const simplifiedImages = collectedImages.map((img) => ({
        src: img.src,
        w: img.width,
        h: img.height,
        favicon: img.favicon || null, // faviconも保存
      }));

      try {
        // まず既存データをクリア
        await chrome.storage.local.clear();

        // 新しいデータを保存
        await chrome.storage.local.set({ images: simplifiedImages });

        // 表示用に元のデータを使う
        window.collectedImages = collectedImages;
        collectedImages = window.collectedImages;

        updateStatus(
          `${collectedImages.length}個の画像を収集しました`,
          "success"
        );
        displayImages(collectedImages);
        document.getElementById("copyBtn").disabled = false;

        // 画像収集完了後、自動的に.imagefetcherファイルとしてダウンロード
        await exportToImageFetcherFile(collectedImages);
      } catch (storageError) {
        console.error("Storage error:", storageError);
        // ストレージに保存できない場合でもメモリ上には保持
        window.collectedImages = collectedImages;
        collectedImages = window.collectedImages;

        updateStatus(
          `${collectedImages.length}個の画像を収集しました(※ストレージ保存失敗)`,
          "info"
        );
        displayImages(collectedImages);
        document.getElementById("copyBtn").disabled = false;

        // 画像収集完了後、自動的に.imagefetcherファイルとしてダウンロード
        await exportToImageFetcherFile(collectedImages);
      }
    } else {
      updateStatus("画像が見つかりませんでした", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    updateStatus(`エラー: ${error.message}`, "error");
  }
});

// 暗号化キー（固定キーを使用）
const ENCRYPTION_KEY = new Uint8Array([
  0x2a, 0x7f, 0x9c, 0x3e, 0x1b, 0x8d, 0x4f, 0x6a, 0x5c, 0x2e, 0x9a, 0x1d, 0x8b,
  0x4c, 0x6f, 0x3a, 0x7b, 0x2c, 0x9d, 0x1e, 0x8a, 0x4b, 0x6c, 0x3d, 0x5e, 0x2f,
  0x9b, 0x1c, 0x8c, 0x4d, 0x6e, 0x3b,
]);

// URLからサービス名を抽出する関数
function extractServiceName(imageUrl, pageUrl) {
  // まずページURLからサービス名を取得（より正確）
  if (pageUrl) {
    try {
      const pageUrlObj = new URL(pageUrl);
      const pageHostname = pageUrlObj.hostname.toLowerCase();
      const pagePathname = pageUrlObj.pathname.toLowerCase();

      // パスベースのサービス判定（より具体的なサービスを優先）
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
        if (pattern.test(pagePathname) || pattern.test(pageUrl)) {
          return name;
        }
      }

      // ページURLからサービス名を取得
      const serviceFromPage = getServiceNameFromHostname(pageHostname);
      if (serviceFromPage !== "Unknown") {
        return serviceFromPage;
      }
    } catch (e) {
      // ページURLの解析に失敗した場合は画像URLを使用
    }
  }

  // ページURLから取得できない場合、画像URLを使用
  let urlToCheck = imageUrl;
  if (!urlToCheck) return "Unknown";

  try {
    // 相対パスの場合は、ページURLから完全なURLを作成
    let urlObj;
    try {
      urlObj = new URL(urlToCheck);
    } catch (e) {
      // 相対パスの場合
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

// ホスト名からサービス名を取得する関数
function getServiceNameFromHostname(hostname) {
  // 主要なサービスのドメインパターン
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
    if (pattern.test(hostname)) {
      return name;
    }
  }

  // nflxで始まるドメインはNetflixとして認識
  const domainParts = hostname.split(".");
  if (domainParts.length >= 2) {
    const mainDomain = domainParts[domainParts.length - 2];
    if (mainDomain.toLowerCase().startsWith("nflx")) {
      return "Netflix";
    }
  }

  // ドメイン名から推測（例: example.com -> Example）
  // .co.jp, .com.au などの2段階TLDを考慮
  const twoPartTlds = ["co", "com", "net", "org", "edu", "gov", "ac", "ne"];
  if (domainParts.length >= 2) {
    let mainDomainIndex = domainParts.length - 2;

    // 2段階TLDの場合は1つ前のドメインを取得
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

// 暗号化関数（AES-CBCを使用）
async function encryptData(data) {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      ENCRYPTION_KEY,
      { name: "AES-CBC", length: 256 },
      false,
      ["encrypt"]
    );

    // AES-CBCではIVは16バイト
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: iv },
      key,
      encodedData
    );

    // IVと暗号化データを結合してBase64エンコード
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Base64エンコードして返す（大きな配列にも対応）
    let binaryString = "";
    for (let i = 0; i < combined.length; i++) {
      binaryString += String.fromCharCode(combined[i]);
    }
    return btoa(binaryString);
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
}

// 画像を.imagefetcherファイルとしてエクスポートする関数
async function exportToImageFetcherFile(images) {
  if (!images || images.length === 0) {
    return;
  }

  updateStatus(`${images.length}個の画像を変換中...`, "loading");

  try {
    const imagesWithBase64 = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        updateStatus(`画像を変換中... (${i + 1}/${images.length})`, "loading");
        const base64 = await fetchImageAsBase64(img.src);
        // ページURLからサービス名を取得（画像URLが相対パスの場合に対応）
        const serviceName = extractServiceName(img.src, img.pageUrl);
        imagesWithBase64.push({
          src: img.src,
          width: img.width,
          height: img.height,
          alt: img.alt || "",
          base64: base64,
          service: serviceName,
          favicon: img.favicon || null, // faviconも含める
        });
        successCount++;
      } catch (error) {
        console.error("Failed to fetch:", img.src, error);
        failCount++;
        // エラーが出てもスキップして続行
      }
    }

    if (imagesWithBase64.length > 0) {
      // JSON文字列を暗号化
      const jsonString = JSON.stringify(imagesWithBase64, null, 2);
      const encryptedData = await encryptData(jsonString);

      // サービス名を取得（最初の画像のサービス名を使用、複数のサービスが混在している場合は"mixed"）
      const services = new Set(
        imagesWithBase64.map((img) => img.service).filter(Boolean)
      );
      let serviceName = "";
      if (services.size === 1) {
        // 1つのサービスのみの場合
        serviceName = Array.from(services)[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_");
      } else if (services.size > 1) {
        // 複数のサービスが混在している場合
        serviceName = "mixed";
      } else {
        // サービス名が取得できない場合
        serviceName = "unknown";
      }

      // ファイル名を生成（サービス名とタイムスタンプを含める）
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const filename = serviceName
        ? `${serviceName}_${timestamp}.imagefetcher`
        : `images_${timestamp}.imagefetcher`;

      // Blobを作成してファイルとしてダウンロード
      const blob = new Blob([encryptedData], { type: "text/plain" });
      const blobUrl = URL.createObjectURL(blob);

      try {
        // 一時的なaタグを作成してダウンロード
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        updateStatus(
          `✅ ${successCount}個の画像を.imagefetcherファイルに保存しました!${
            failCount > 0 ? ` (${failCount}個失敗)` : ""
          }`,
          "success"
        );
      } catch (downloadError) {
        console.error("Download error:", downloadError);
        updateStatus(
          `❌ ファイルのダウンロードに失敗しました: ${downloadError.message}`,
          "error"
        );
      }
    } else {
      updateStatus("❌ 全ての画像取得に失敗しました", "error");
    }
  } catch (error) {
    console.error("Export error:", error);
    updateStatus(`❌ エクスポートに失敗しました: ${error.message}`, "error");
  }
}

// 全てコピー(base64変換してエクスポート)
document.getElementById("copyBtn").addEventListener("click", async () => {
  const images = window.collectedImages || collectedImages || [];

  if (images.length === 0) {
    updateStatus("画像がありません", "error");
    return;
  }

  updateStatus(`${images.length}個の画像を変換中...`, "loading");

  try {
    const imagesWithBase64 = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        updateStatus(`画像を変換中... (${i + 1}/${images.length})`, "loading");
        const base64 = await fetchImageAsBase64(img.src);
        // ページURLからサービス名を取得（画像URLが相対パスの場合に対応）
        const serviceName = extractServiceName(img.src, img.pageUrl);
        imagesWithBase64.push({
          src: img.src,
          width: img.width,
          height: img.height,
          alt: img.alt || "",
          base64: base64,
          service: serviceName,
          favicon: img.favicon || null, // faviconも含める
        });
        successCount++;
      } catch (error) {
        console.error("Failed to fetch:", img.src, error);
        failCount++;
        // エラーが出てもスキップして続行
      }
    }

    if (imagesWithBase64.length > 0) {
      // JSON文字列を暗号化
      const jsonString = JSON.stringify(imagesWithBase64, null, 2);
      const encryptedData = await encryptData(jsonString);

      // 暗号化されたデータをクリップボードにコピー
      await navigator.clipboard.writeText(encryptedData);
      updateStatus(
        `✅ ${successCount}個の画像をコピーしました!${
          failCount > 0 ? ` (${failCount}個失敗)` : ""
        }`,
        "success"
      );
    } else {
      updateStatus("❌ 全ての画像取得に失敗しました", "error");
    }
  } catch (error) {
    console.error("Copy error:", error);
    updateStatus(`❌ コピーに失敗しました: ${error.message}`, "error");
  }
});

// 画像をbase64として取得
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

// ページロード時に保存済みの画像を復元
chrome.storage.local.get(["images"], (result) => {
  if (result.images && result.images.length > 0) {
    // 短縮形式から復元（faviconも含める）
    window.collectedImages = result.images.map((img) => ({
      src: img.src,
      width: img.w,
      height: img.h,
      alt: "",
      favicon: img.favicon || null, // faviconも復元
    }));
    collectedImages = window.collectedImages;
    displayImages(window.collectedImages);
    document.getElementById("copyBtn").disabled = false;
    updateStatus(
      `保存済み: ${window.collectedImages.length}個の画像`,
      "success"
    );
  }
});

// ステータス更新
function updateStatus(message, type = "info") {
  const statusEl = document.getElementById("statusText");
  statusEl.textContent = message;
  statusEl.style.color =
    type === "error" ? "#d32f2f" : type === "success" ? "#388e3c" : "#666";
}

// 画像リスト表示
function displayImages(images) {
  const listEl = document.getElementById("imageList");
  listEl.innerHTML = "";

  images.forEach((img, index) => {
    const itemEl = document.createElement("div");
    itemEl.className = "image-item";
    itemEl.innerHTML = `
      <img src="${img.src}" alt="Image ${
      index + 1
    }" onerror="this.style.display='none'">
      <div class="image-info">
        <div><strong>Size:</strong> ${img.width} × ${img.height}</div>
        <div class="image-url" title="${img.src}">${img.src}</div>
      </div>
    `;
    listEl.appendChild(itemEl);
  });
}

// ページ内で実行される画像収集関数（スクロールしながら収集）
async function collectImagesFromPage() {
  // ページからfaviconを取得する関数
  function getFaviconFromPage() {
    // 優先順位に従ってfaviconを探す
    // 1. <link rel="icon"> または <link rel="shortcut icon">
    const iconLinks = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );

    for (const link of iconLinks) {
      const href = link.getAttribute("href");
      if (href) {
        // 相対パスの場合は絶対URLに変換
        try {
          const url = new URL(href, window.location.href);
          return url.href;
        } catch (e) {
          // URL解析に失敗した場合は相対パスをそのまま返す
          return href.startsWith("http")
            ? href
            : new URL(href, window.location.href).href;
        }
      }
    }

    // 2. デフォルトの /favicon.ico を試す
    try {
      const defaultFavicon = new URL("/favicon.ico", window.location.href);
      return defaultFavicon.href;
    } catch (e) {
      return null;
    }
  }

  // 画像形式をチェックする関数（拡張子がない場合も許可）
  const isSupportedFormat = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // SVGを除外
    if (lowerUrl.includes(".svg")) {
      return false;
    }
    // データURLを除外（base64画像）
    if (lowerUrl.startsWith("data:")) {
      return false;
    }
    // 拡張子がある場合は、サポートされている形式のみ許可
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
    // 拡張子がない場合も許可（API経由の画像など）
    // ただし、明らかに画像でないURLは除外
    if (
      lowerUrl.includes("?") ||
      lowerUrl.includes("/image") ||
      lowerUrl.includes("/img") ||
      lowerUrl.includes("/photo") ||
      lowerUrl.includes("/picture")
    ) {
      return true;
    }
    // その他の場合は、拡張子がない場合は一旦許可（後でフィルタリング可能）
    return !lowerUrl.includes(".css") && !lowerUrl.includes(".js");
  };

  // CSSのbackground-imageからURLを抽出する関数
  function extractBackgroundImageUrl(element) {
    const style = window.getComputedStyle(element);
    const bgImage = style.backgroundImage;
    if (!bgImage || bgImage === "none") return null;

    // url("...") または url('...') の形式からURLを抽出
    const match = bgImage.match(/url\(["']?([^"']+)["']?\)/);
    if (match && match[1]) {
      let url = match[1];
      // 相対パスの場合は絶対URLに変換
      if (url.startsWith("/")) {
        url = window.location.origin + url;
      } else if (!url.startsWith("http")) {
        url = new URL(url, window.location.href).href;
      }
      return url;
    }
    return null;
  }

  // 現在表示されている画像を収集する関数
  function collectCurrentImages() {
    const images = [];
    const seenSrcs = new Set();

    // 1. <img>タグから画像を収集
    const imageElements = document.querySelectorAll("img");
    imageElements.forEach((img) => {
      // 最小サイズフィルタ(小さすぎる画像は除外)
      if (img.naturalWidth > 50 && img.naturalHeight > 50) {
        const src = img.src || img.currentSrc || img.dataset.src;
        if (src && isSupportedFormat(src) && !seenSrcs.has(src)) {
          seenSrcs.add(src);
          images.push({
            src: src,
            alt: img.alt || "",
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      }
    });

    // 2. <picture>タグと<source>タグから画像を収集
    const pictureElements = document.querySelectorAll("picture");
    pictureElements.forEach((picture) => {
      const sources = picture.querySelectorAll("source");
      sources.forEach((source) => {
        const srcset = source.srcset;
        if (srcset) {
          // srcsetからURLを抽出（"url1 1x, url2 2x"の形式）
          const urls = srcset.split(",").map((s) => {
            const url = s.trim().split(/\s+/)[0];
            return url;
          });
          urls.forEach((url) => {
            if (url && isSupportedFormat(url) && !seenSrcs.has(url)) {
              seenSrcs.add(url);
              images.push({
                src: url,
                alt: "",
                width: 0,
                height: 0,
              });
            }
          });
        }
      });
      // picture内のimgタグもチェック
      const img = picture.querySelector("img");
      if (img && img.naturalWidth > 50 && img.naturalHeight > 50) {
        const src = img.src || img.currentSrc || img.dataset.src;
        if (src && isSupportedFormat(src) && !seenSrcs.has(src)) {
          seenSrcs.add(src);
          images.push({
            src: src,
            alt: img.alt || "",
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      }
    });

    // 3. CSSのbackground-imageから画像を収集（div, section, article, figureなどの主要な要素のみ）
    // 主要な要素をチェック（パフォーマンスのため）
    const elementsToCheck = document.querySelectorAll(
      "div, section, article, figure, header, main"
    );
    elementsToCheck.forEach((element) => {
      const bgUrl = extractBackgroundImageUrl(element);
      if (bgUrl && isSupportedFormat(bgUrl) && !seenSrcs.has(bgUrl)) {
        const rect = element.getBoundingClientRect();
        // ある程度のサイズがある要素のみ（アイコンなどを除外）
        // かつ、画面内に表示されている要素のみ
        if (
          rect.width > 100 &&
          rect.height > 100 &&
          rect.top < window.innerHeight &&
          rect.bottom > 0
        ) {
          seenSrcs.add(bgUrl);
          images.push({
            src: bgUrl,
            alt: "",
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    });

    return images;
  }

  // 待機関数
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // faviconを取得
  const faviconUrl = getFaviconFromPage();

  // すべての画像を収集（重複を管理するためのSet）
  const allImages = [];
  const seenUrls = new Set();

  // ページの最上部にスクロール
  window.scrollTo(0, 0);
  await sleep(300); // DOM更新を待つ

  // 初期画像を収集
  const initialImages = collectCurrentImages();
  for (const img of initialImages) {
    if (!seenUrls.has(img.src)) {
      seenUrls.add(img.src);
      allImages.push(img);
    }
  }

  // スクロールしながら画像を収集
  const scrollStep = 500; // 一度にスクロールするピクセル数
  const scrollDelay = 300; // 各スクロール後の待機時間（ミリ秒）
  let previousHeight = 0;
  let currentHeight = document.documentElement.scrollHeight;
  let scrollPosition = 0;

  // ページの高さが変わるか、最下部に到達するまでスクロール
  while (true) {
    // スクロールダウン
    scrollPosition += scrollStep;
    window.scrollTo(0, scrollPosition);
    await sleep(scrollDelay); // DOM更新を待つ

    // 新しい画像を収集
    const newImages = collectCurrentImages();
    for (const img of newImages) {
      if (!seenUrls.has(img.src)) {
        seenUrls.add(img.src);
        allImages.push(img);
      }
    }

    // ページの高さを再チェック
    currentHeight = document.documentElement.scrollHeight;
    const maxScroll = currentHeight - window.innerHeight;

    // 最下部に到達したか、ページの高さが変わらなくなったら終了
    if (scrollPosition >= maxScroll) {
      // 最後にもう一度収集（最下部の画像を確実に取得）
      await sleep(scrollDelay);
      const finalImages = collectCurrentImages();
      for (const img of finalImages) {
        if (!seenUrls.has(img.src)) {
          seenUrls.add(img.src);
          allImages.push(img);
        }
      }
      break;
    }

    // ページの高さが変わらなくなった場合も終了
    if (currentHeight === previousHeight && scrollPosition >= maxScroll) {
      break;
    }

    previousHeight = currentHeight;
  }

  // 最上部に戻す
  window.scrollTo(0, 0);

  return {
    images: allImages,
    favicon: faviconUrl,
  };
}
