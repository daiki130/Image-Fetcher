let collectedImages = [];

// 画像収集ボタン
document.getElementById('collectBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  updateStatus('画像を収集中...', 'loading');
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: collectImagesFromPage
    });
    
    if (results && results[0] && results[0].result) {
      let collectedImages = results[0].result;
      
      // URLが長すぎる画像を除外(データURL等)
      collectedImages = collectedImages.filter(img => img.src.length < 500);
      
      // 最小限のデータのみ保存
      const simplifiedImages = collectedImages.map(img => ({
        src: img.src,
        w: img.width,
        h: img.height
      }));
      
      try {
        // まず既存データをクリア
        await chrome.storage.local.clear();
        
        // 新しいデータを保存
        await chrome.storage.local.set({ images: simplifiedImages });
        
        // 表示用に元のデータを使う
        window.collectedImages = collectedImages;
        collectedImages = window.collectedImages;
        
        updateStatus(`${collectedImages.length}個の画像を収集しました`, 'success');
        displayImages(collectedImages);
        document.getElementById('copyBtn').disabled = false;
      } catch (storageError) {
        console.error('Storage error:', storageError);
        // ストレージに保存できない場合でもメモリ上には保持
        window.collectedImages = collectedImages;
        collectedImages = window.collectedImages;
        
        updateStatus(`${collectedImages.length}個の画像を収集しました(※ストレージ保存失敗)`, 'info');
        displayImages(collectedImages);
        document.getElementById('copyBtn').disabled = false;
      }
    } else {
      updateStatus('画像が見つかりませんでした', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    updateStatus(`エラー: ${error.message}`, 'error');
  }
});

// 全てコピー(base64変換してエクスポート)
document.getElementById('copyBtn').addEventListener('click', async () => {
  const images = window.collectedImages || collectedImages || [];
  
  if (images.length === 0) {
    updateStatus('画像がありません', 'error');
    return;
  }

  updateStatus(`${images.length}個の画像を変換中...`, 'loading');
  
  try {
    const imagesWithBase64 = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        updateStatus(`画像を変換中... (${i + 1}/${images.length})`, 'loading');
        const base64 = await fetchImageAsBase64(img.src);
        imagesWithBase64.push({
          src: img.src,
          width: img.width,
          height: img.height,
          alt: img.alt || '',
          base64: base64
        });
        successCount++;
      } catch (error) {
        console.error('Failed to fetch:', img.src, error);
        failCount++;
        // エラーが出てもスキップして続行
      }
    }
    
    if (imagesWithBase64.length > 0) {
      await navigator.clipboard.writeText(JSON.stringify(imagesWithBase64, null, 2));
      updateStatus(`✅ ${successCount}個の画像をコピーしました!${failCount > 0 ? ` (${failCount}個失敗)` : ''}`, 'success');
    } else {
      updateStatus('❌ 全ての画像取得に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Copy error:', error);
    updateStatus(`❌ コピーに失敗しました: ${error.message}`, 'error');
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
document.getElementById('clearBtn').addEventListener('click', async () => {
  window.collectedImages = [];
  collectedImages = [];
  await chrome.storage.local.clear();
  document.getElementById('imageList').innerHTML = '';
  document.getElementById('copyBtn').disabled = true;
  updateStatus('クリアしました', 'success');
});

// ページロード時に保存済みの画像を復元
chrome.storage.local.get(['images'], (result) => {
  if (result.images && result.images.length > 0) {
    // 短縮形式から復元
    window.collectedImages = result.images.map(img => ({
      src: img.src,
      width: img.w,
      height: img.h,
      alt: ''
    }));
    collectedImages = window.collectedImages;
    displayImages(window.collectedImages);
    document.getElementById('copyBtn').disabled = false;
    updateStatus(`保存済み: ${window.collectedImages.length}個の画像`, 'success');
  }
});

// ステータス更新
function updateStatus(message, type = 'info') {
  const statusEl = document.getElementById('statusText');
  statusEl.textContent = message;
  statusEl.style.color = type === 'error' ? '#d32f2f' : type === 'success' ? '#388e3c' : '#666';
}

// 画像リスト表示
function displayImages(images) {
  const listEl = document.getElementById('imageList');
  listEl.innerHTML = '';
  
  images.forEach((img, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'image-item';
    itemEl.innerHTML = `
      <img src="${img.src}" alt="Image ${index + 1}" onerror="this.style.display='none'">
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
  const imageElements = document.querySelectorAll('img');
  
  // 画像形式をチェックする関数
  const isSupportedFormat = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // WebP, AVIF, SVGを除外
    if (lowerUrl.includes('.webp') || lowerUrl.includes('.avif') || lowerUrl.includes('.svg')) {
      return false;
    }
    // JPEG, PNG, GIFのみ許可
    return lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.gif');
  };
  
  imageElements.forEach((img) => {
    // 最小サイズフィルタ(小さすぎる画像は除外)
    if (img.naturalWidth > 50 && img.naturalHeight > 50) {
      const src = img.src || img.currentSrc;
      
      // サポートされている形式のみ収集
      if (isSupportedFormat(src)) {
        images.push({
          src: src,
          alt: img.alt || '',
          width: img.naturalWidth,
          height: img.naturalHeight
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