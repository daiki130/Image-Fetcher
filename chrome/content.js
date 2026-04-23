// =============================================================================
// Image Fetcher - Content Script
// -----------------------------------------------------------------------------
// UI は Chrome のサイドパネル (sidepanel.html / sidepanel.js) に移行済み。
// このスクリプトは Figma プラグイン等、ページ内コードから
// postMessage で保存済み画像を問い合わせるためのブリッジのみを提供する。
// =============================================================================

(function () {
  if (window.__imageFetcherContentInjected) {
    return;
  }
  window.__imageFetcherContentInjected = true;

  // postMessage ブリッジ (Figma プラグインなど、ページ内コード向け)
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

  console.log("image-fetcher: Content script ready (side panel mode)");
})();
