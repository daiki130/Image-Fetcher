// Service Worker - バックグラウンドで動作

chrome.runtime.onInstalled.addListener(() => {
  console.log("image-fetcher installed");
});

// 拡張アイコンをクリックしたら、アクティブタブの content script に
// パネルの開閉を依頼する。content script が未注入（拡張インストール直後の
// 既存タブ等）なら executeScript で注入してから再送する。
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || tab.id == null) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });
  } catch (err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });
    } catch (injectErr) {
      console.error(
        "image-fetcher: failed to toggle panel",
        injectErr instanceof Error ? injectErr.message : injectErr,
      );
    }
  }
});

// メッセージリスナー - 他のスクリプトからの通信を受け取る
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_STORED_IMAGES") {
    chrome.storage.local.get(["images"], (result) => {
      sendResponse({ images: result.images || [] });
    });
    return true;
  }

  if (request.type === "SAVE_IMAGES") {
    chrome.storage.local.set({ images: request.images }, () => {
      sendResponse({ success: true });
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
  },
);

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
