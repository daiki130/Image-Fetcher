// Service Worker - バックグラウンドで動作

// 拡張機能がインストールされた時
chrome.runtime.onInstalled.addListener(() => {
  console.log("image-fetcher installed");
});

// メッセージリスナー - 他のスクリプトからの通信を受け取る
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_STORED_IMAGES") {
    chrome.storage.local.get(["images"], (result) => {
      sendResponse({ images: result.images || [] });
    });
    return true; // 非同期レスポンスを示す
  }

  if (request.type === "SAVE_IMAGES") {
    chrome.storage.local.set({ images: request.images }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // 画像をダウンロードしてbase64で返す
  if (request.type === "DOWNLOAD_IMAGE") {
    downloadImageAsBase64(request.url)
      .then((base64) => {
        sendResponse({ success: true, base64: base64 });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// 外部からのメッセージ(Figmaプラグインなど)
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "GET_IMAGES") {
      chrome.storage.local.get(["images"], (result) => {
        sendResponse({ images: result.images || [] });
      });
      return true;
    }

    if (request.type === "DOWNLOAD_IMAGE") {
      downloadImageAsBase64(request.url)
        .then((base64) => {
          sendResponse({ success: true, base64: base64 });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  }
);

// 画像をダウンロードしてbase64で返す
async function downloadImageAsBase64(url) {
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
