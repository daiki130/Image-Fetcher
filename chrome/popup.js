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
      let collectedImages = results[0].result;

      // 現在のページURLを各画像に追加
      const currentPageUrl = tab.url || "";
      collectedImages = collectedImages.map((img) => ({
        ...img,
        pageUrl: currentPageUrl,
      }));

      // URLが長すぎる画像を除外(データURL等)
      collectedImages = collectedImages.filter((img) => img.src.length < 500);

      // 最小限のデータのみ保存
      const simplifiedImages = collectedImages.map((img) => ({
        src: img.src,
        w: img.width,
        h: img.height,
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
    { pattern: /dmm\.com/i, name: "DMM" },
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
  if (domainParts.length >= 2) {
    const mainDomain = domainParts[domainParts.length - 2];
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
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

// クリアボタン
document.getElementById("clearBtn").addEventListener("click", async () => {
  window.collectedImages = [];
  collectedImages = [];
  await chrome.storage.local.clear();
  document.getElementById("imageList").innerHTML = "";
  document.getElementById("copyBtn").disabled = true;
  updateStatus("クリアしました", "success");
});

// ページロード時に保存済みの画像を復元
chrome.storage.local.get(["images"], (result) => {
  if (result.images && result.images.length > 0) {
    // 短縮形式から復元
    window.collectedImages = result.images.map((img) => ({
      src: img.src,
      width: img.w,
      height: img.h,
      alt: "",
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

// ページ内で実行される画像収集関数
function collectImagesFromPage() {
  const images = [];
  const imageElements = document.querySelectorAll("img");

  // 画像形式をチェックする関数
  const isSupportedFormat = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // WebP, AVIF, SVGを除外
    if (
      lowerUrl.includes(".webp") ||
      lowerUrl.includes(".avif") ||
      lowerUrl.includes(".svg")
    ) {
      return false;
    }
    // JPEG, PNG, GIFのみ許可
    return (
      lowerUrl.includes(".jpg") ||
      lowerUrl.includes(".jpeg") ||
      lowerUrl.includes(".png") ||
      lowerUrl.includes(".gif")
    );
  };

  imageElements.forEach((img) => {
    // 最小サイズフィルタ(小さすぎる画像は除外)
    if (img.naturalWidth > 50 && img.naturalHeight > 50) {
      const src = img.src || img.currentSrc;

      // サポートされている形式のみ収集
      if (isSupportedFormat(src)) {
        images.push({
          src: src,
          alt: img.alt || "",
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      }
    }
  });

  // 重複URLを削除
  const uniqueImages = [];
  const seenUrls = new Set();
  for (const img of images) {
    if (!seenUrls.has(img.src)) {
      seenUrls.add(img.src);
      uniqueImages.push(img);
    }
  }

  return uniqueImages;
}
