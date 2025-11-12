// コンテンツスクリプト - ページに注入されるスクリプト

// Figmaプラグインとの通信用にカスタムイベントを使用
window.addEventListener("message", (event) => {
  // Figmaプラグインからのリクエスト
  if (event.data && event.data.type === "GET_IMAGES_FROM_EXTENSION") {
    chrome.storage.local.get(["images"], (result) => {
      window.postMessage(
        {
          type: "IMAGES_FROM_EXTENSION",
          images: result.images || [],
        },
        "*"
      );
    });
  }
});

// ページが読み込まれたことを通知
console.log("image-fetcher: Content script loaded");
