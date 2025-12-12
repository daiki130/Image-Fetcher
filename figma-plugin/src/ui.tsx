import {
  render,
  Button,
  Container,
  Text,
  VerticalSpace,
  Textbox,
  TextboxMultiline,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import CryptoJS from "crypto-js";
import { ImageData, ImagesLoadedHandler } from "./types";
import { Data } from "./components/data";

// ImageData は types.ts からインポート

// 暗号化キー（Chrome拡張機能と同じキー）
// Uint8Arrayを16進数文字列に変換（crypto-js用）
const ENCRYPTION_KEY_BYTES = new Uint8Array([
  0x2a, 0x7f, 0x9c, 0x3e, 0x1b, 0x8d, 0x4f, 0x6a, 0x5c, 0x2e, 0x9a, 0x1d, 0x8b,
  0x4c, 0x6f, 0x3a, 0x7b, 0x2c, 0x9d, 0x1e, 0x8a, 0x4b, 0x6c, 0x3d, 0x5e, 0x2f,
  0x9b, 0x1c, 0x8c, 0x4d, 0x6e, 0x3b,
]);
const ENCRYPTION_KEY = CryptoJS.lib.WordArray.create(ENCRYPTION_KEY_BYTES);

// 復号化関数
function decryptData(encryptedBase64: string): string | null {
  try {
    // Base64デコードしてバイナリデータを取得
    const binaryString = atob(encryptedBase64);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // IV（16バイト）と暗号化データを分離（AES-CBC用）
    const ivBytes = combined.slice(0, 16);
    const encryptedBytes = combined.slice(16);

    // crypto-js用に変換
    const iv = CryptoJS.lib.WordArray.create(ivBytes);

    // 暗号化データをBase64文字列に変換
    let encryptedBase64String = "";
    for (let i = 0; i < encryptedBytes.length; i++) {
      encryptedBase64String += String.fromCharCode(encryptedBytes[i]);
    }
    const encryptedBase64Data = btoa(encryptedBase64String);

    // AES-CBC復号化
    const decrypted = CryptoJS.AES.decrypt(
      encryptedBase64Data,
      ENCRYPTION_KEY,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    return decryptedString || null;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

// データが暗号化されているかチェック（Base64文字列で、JSONとしてパースできない場合）
function isEncrypted(data: string): boolean {
  // Base64文字列の特徴をチェック（長さ、文字種など）
  if (data.trim().length < 20) return false;

  // JSONとしてパースを試みる
  try {
    JSON.parse(data);
    return false; // JSONとしてパースできれば暗号化されていない
  } catch {
    // Base64文字列のパターンをチェック
    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    return base64Pattern.test(data.trim());
  }
}

// サービス名からロゴURLを取得する関数
function getServiceLogoUrl(serviceName: string): string {
  if (!serviceName || serviceName === "Unknown") {
    return "";
  }

  // サービス名からドメインを推測
  const serviceDomains: Record<string, string> = {
    Netflix: "netflix.com",
    YouTube: "youtube.com",
    Amazon: "amazon.com",
    "Prime Video": "primevideo.com",
    "Amazon Music": "music.amazon.com",
    Kindle: "kindle.amazon.com",
    Audible: "audible.com",
    "DMM TV": "tv.dmm.com",
    DMM: "dmm.com",
    "U-NEXT": "unext.jp",
    "Twitter/X": "twitter.com",
    Instagram: "instagram.com",
    Facebook: "facebook.com",
    LinkedIn: "linkedin.com",
    GitHub: "github.com",
    Spotify: "spotify.com",
    Discord: "discord.com",
    Reddit: "reddit.com",
    Pinterest: "pinterest.com",
    TikTok: "tiktok.com",
    Twitch: "twitch.tv",
    Vimeo: "vimeo.com",
    Dribbble: "dribbble.com",
    Behance: "behance.net",
    Figma: "figma.com",
    Notion: "notion.so",
    Medium: "medium.com",
    Dropbox: "dropbox.com",
    Google: "google.com",
    Apple: "apple.com",
    Microsoft: "microsoft.com",
    Adobe: "adobe.com",
  };

  const domain =
    serviceDomains[serviceName] || serviceName.toLowerCase() + ".com";
  // Google Favicon APIを使用
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// サービスロゴコンポーネント（ロゴ + 名前を表示）
function ServiceLogo({
  serviceName,
  size = 16,
  favicon,
}: {
  serviceName: string;
  size?: number;
  favicon?: string; // ページから取得したfaviconのURL（優先的に使用）
}) {
  const [logoError, setLogoError] = useState(false);
  // faviconが提供されている場合はそれを優先、なければGoogle Favicon APIを使用
  const logoUrl = favicon || getServiceLogoUrl(serviceName);

  if (!serviceName || serviceName === "Unknown") {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {logoUrl && !logoError && (
        <img
          src={logoUrl}
          alt={serviceName}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "2px",
            objectFit: "contain",
          }}
          onError={() => setLogoError(true)}
        />
      )}
      {/* <span
        style={{
          fontSize: `${size - 2}px`,
          fontWeight: "500",
          color: "var(--figma-color-text-secondary)",
        }}
      >
        {serviceName}
      </span> */}
    </div>
  );
}

function Plugin() {
  const [jsonInput, setJsonInput] = useState("");
  const [images, setImages] = useState<ImageData[]>([]);
  const [displayImages, setDisplayImages] = useState<ImageData[]>([]); // Topタブで表示する画像（「データを読み込む」で追加したもののみ）
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">(
    "info"
  );
  const [modalService, setModalService] = useState<string | null>(null); // モーダルで表示するサービス名
  const [isEditing, setIsEditing] = useState(false); // 編集中かどうか
  const [displayValue, setDisplayValue] = useState<string>(""); // 表示用の値

  // 起動時に保存された画像データを読み込む
  useEffect(() => {
    emit("LOAD_IMAGES");
  }, []);

  // main.ts から画像データを受け取る
  useEffect(() => {
    const handler = (loadedImages: ImageData[]) => {
      if (loadedImages && loadedImages.length > 0) {
        setImages(loadedImages);
        showStatus(
          `${loadedImages.length}個の保存された画像を読み込みました`,
          "success"
        );
      }
    };
    on("IMAGES_LOADED", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 画像の重複チェック（srcまたはidで判定）
  const isDuplicateImage = (
    existing: ImageData,
    newImage: ImageData
  ): boolean => {
    // idが存在する場合はidで比較
    if (existing.id && newImage.id && existing.id === newImage.id) {
      return true;
    }
    // srcで比較
    if (existing.src && newImage.src && existing.src === newImage.src) {
      return true;
    }
    return false;
  };

  // 既存データと新規データをマージ
  const mergeImages = (
    existing: ImageData[],
    newImages: ImageData[]
  ): ImageData[] => {
    const merged = [...existing];

    for (const newImage of newImages) {
      // 重複チェック
      const isDuplicate = merged.some((existingImage) =>
        isDuplicateImage(existingImage, newImage)
      );

      if (!isDuplicate) {
        merged.push(newImage);
      }
    }

    return merged;
  };

  // データ読み込み
  const handleLoadData = async () => {
    if (!jsonInput.trim()) {
      showStatus("データを入力してください", "error");
      return;
    }

    try {
      let dataToParse = jsonInput.trim();

      // 暗号化されている場合は復号化
      if (isEncrypted(dataToParse)) {
        showStatus("データを処理中...", "info");
        const decrypted = await decryptData(dataToParse);

        if (!decrypted) {
          // 復号化に失敗した場合、元のデータでJSONパースを試みる
          try {
            const parsed = JSON.parse(dataToParse);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // 既存データを取得してマージ
              const existingImages = images.length > 0 ? images : [];
              const merged = mergeImages(existingImages, parsed);
              setImages(merged);
              // 表示用画像を新しいデータに置き換え（parsed内の重複を排除）
              const uniqueParsed: ImageData[] = [];
              for (const newImage of parsed) {
                const isDuplicate = uniqueParsed.some((existingImage) =>
                  isDuplicateImage(existingImage, newImage)
                );
                if (!isDuplicate) {
                  uniqueParsed.push(newImage);
                }
              }
              setDisplayImages(uniqueParsed);
              // 画像データを figmaClientStorage に保存
              emit("SAVE_IMAGES", merged);
              // 状態更新後にメッセージを表示
              setTimeout(() => {
                showStatus(
                  `${parsed.length}個の画像を追加しました（合計: ${merged.length}個）`,
                  "success"
                );
              }, 0);
              return;
            }
          } catch {
            // JSONパースも失敗した場合
          }
          showStatus(
            "データの読み込みに失敗しました。正しいデータを入力してください",
            "error"
          );
          return;
        }

        dataToParse = decrypted;
      }

      const parsed = JSON.parse(dataToParse);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        showStatus("有効な画像配列を入力してください", "error");
        return;
      }

      // 既存データと新規データをマージ
      // 既存の images ステートを使用（起動時に自動で読み込まれている）
      const existingImages = images.length > 0 ? images : [];
      const merged = mergeImages(existingImages, parsed);

      setImages(merged);
      // 表示用画像を新しいデータに置き換え（parsed内の重複を排除）
      const uniqueParsed: ImageData[] = [];
      for (const newImage of parsed) {
        const isDuplicate = uniqueParsed.some((existingImage) =>
          isDuplicateImage(existingImage, newImage)
        );
        if (!isDuplicate) {
          uniqueParsed.push(newImage);
        }
      }
      setDisplayImages(uniqueParsed);
      // 画像データを figmaClientStorage に保存
      emit("SAVE_IMAGES", merged);
      // 状態更新後にメッセージを表示
      const addedCount = merged.length - existingImages.length;
      setTimeout(() => {
        if (addedCount > 0) {
          showStatus(
            `${addedCount}個の画像を追加しました（合計: ${merged.length}個）`,
            "success"
          );
        } else {
          showStatus(
            `すべての画像は既に追加されています（合計: ${merged.length}個）`,
            "info"
          );
        }
      }, 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      showStatus(`データ読み込みエラー: ${errorMessage}`, "error");
    }
  };

  // 画像選択（Topタブ用：displayImagesのインデックスからimages全体のインデックスを計算）
  const handleSelectImage = (index: number, isTopTab: boolean = false) => {
    if (isTopTab && displayImages[index]) {
      // displayImagesの画像をimages全体から探す
      const selectedImage = displayImages[index];
      const globalIndex = images.findIndex((img) => {
        if (img.id && selectedImage.id && img.id === selectedImage.id) {
          return true;
        }
        if (img.src && selectedImage.src && img.src === selectedImage.src) {
          return true;
        }
        return false;
      });
      if (globalIndex !== -1) {
        setSelectedImageIndex(globalIndex);
      }
    } else {
      setSelectedImageIndex(index);
    }
  };

  // 選択ノードに適用
  const handleApplyImage = async () => {
    if (selectedImageIndex === null) {
      showStatus("画像を選択してください", "error");
      return;
    }

    const selectedImage = images[selectedImageIndex];

    const imageData = await downloadAndConvertImage(selectedImage);

    if (imageData) {
      emit("APPLY_IMAGE_DATA", { imageData });
      showStatus("画像を適用しました", "success");
    } else {
      showStatus(
        "画像の処理に失敗しました。画像データを確認してください",
        "error"
      );
    }
  };

  // 新規レクタングル作成
  const handleCreateRectangle = async () => {
    if (selectedImageIndex === null) {
      showStatus("画像を選択してください", "error");
      return;
    }

    const selectedImage = images[selectedImageIndex];

    const imageData = await downloadAndConvertImage(selectedImage);

    if (imageData) {
      emit("APPLY_IMAGE_DATA", {
        imageData,
        isNewRect: true,
        width: selectedImage.width,
        height: selectedImage.height,
      });
      showStatus("レクタングルを作成しました", "success");
    } else {
      showStatus(
        "画像の処理に失敗しました。画像データを確認してください",
        "error"
      );
    }
  };

  // 画像をダウンロードして変換
  const downloadAndConvertImage = async (
    image: ImageData
  ): Promise<Uint8Array | null> => {
    try {
      let blob: Blob;

      // base64データがある場合はそれを優先的に使用(CORS回避)
      if (image.base64) {
        showStatus("base64データを変換中...", "info");
        const base64Data = image.base64.split(",")[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const mimeType =
          image.base64.split(",")[0].match(/:(.*?);/)?.[1] || "image/png";
        blob = new Blob([bytes], { type: mimeType });
      } else {
        // base64がない場合は直接fetch
        showStatus("画像をダウンロード中...", "info");
        const response = await fetch(image.src);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        blob = await response.blob();
      }

      // WebPの場合はPNGに変換
      if (
        image.src.toLowerCase().includes(".webp") ||
        blob.type === "image/webp"
      ) {
        showStatus("WebPをPNGに変換中...", "info");
        return await convertWebPToPNG(blob);
      }

      // そのまま返す
      const arrayBuffer = await blob.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error("Download error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      showStatus(`エラー: ${errorMessage}`, "error");
      return null;
    }
  };

  // WebPをPNGに変換
  const convertWebPToPNG = async (blob: Blob): Promise<Uint8Array | null> => {
    try {
      const imageUrl = URL.createObjectURL(blob);

      // Imageオブジェクトで読み込み
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Canvasで描画してPNGに変換
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      ctx.drawImage(img, 0, 0);

      // PNGとして取得
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert to PNG"));
          }
        }, "image/png");
      });

      // Uint8Arrayに変換
      const pngArrayBuffer = await pngBlob.arrayBuffer();
      const pngUint8Array = new Uint8Array(pngArrayBuffer);

      // クリーンアップ
      URL.revokeObjectURL(imageUrl);

      return pngUint8Array;
    } catch (error) {
      console.error("Conversion error:", error);
      return null;
    }
  };

  // ステータス表示
  const showStatus = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setStatus(message);
    setStatusType(type);
  };

  // サービスを削除
  const handleDeleteService = (serviceName: string) => {
    const filteredImages = images.filter(
      (img) => (img.service || "Unknown") !== serviceName
    );
    const filteredDisplayImages = displayImages.filter(
      (img) => (img.service || "Unknown") !== serviceName
    );
    const deletedCount = images.length - filteredImages.length;

    if (deletedCount > 0) {
      setImages(filteredImages);
      setDisplayImages(filteredDisplayImages);
      emit("SAVE_IMAGES", filteredImages);
      showStatus(
        `${serviceName}の${deletedCount}個の画像を削除しました`,
        "success"
      );
    } else {
      showStatus("削除する画像が見つかりませんでした", "error");
    }
  };

  const [tabValue, setTabValue] = useState<string>("Top");
  const tabOptions = [
    {
      text: "Top",
      value: "Top",
    },
    {
      text: "Data",
      value: "Data",
    },
  ];

  // 表示用の値を計算する関数（最初の値のみ表示、残りは「...」）
  const getDisplayValue = (input: string): string => {
    if (!input || !input.trim()) {
      return "";
    }

    const trimmedInput = input.trim();

    try {
      // 暗号化されている場合はそのまま表示
      if (isEncrypted(trimmedInput)) {
        return trimmedInput;
      }

      const parsed = JSON.parse(trimmedInput);

      // 配列の場合、最初の要素のみ表示
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstItem = parsed[0];

        // 最初の要素をJSON文字列化（コンパクト形式）
        let firstItemStr: string;
        try {
          firstItemStr = JSON.stringify(firstItem, null, 0);
          // 空文字列の場合は代替表示
          if (!firstItemStr || firstItemStr.trim() === "") {
            firstItemStr = String(firstItem);
          }
        } catch {
          firstItemStr = String(firstItem);
        }

        // nullやundefinedの場合は特別な表示
        if (firstItem === null) {
          firstItemStr = "null";
        } else if (firstItem === undefined) {
          firstItemStr = "undefined";
        }

        // 長すぎる場合は切り詰める
        const maxLength = 150;
        if (firstItemStr.length > maxLength) {
          firstItemStr = firstItemStr.substring(0, maxLength) + "...";
        }

        // 複数要素がある場合は「...」を追加
        return parsed.length > 1 ? `${firstItemStr} ...` : firstItemStr;
      }

      // 配列でない場合はそのまま表示
      return trimmedInput;
    } catch (error) {
      // JSONとしてパースできない場合はそのまま表示
      return trimmedInput;
    }
  };

  // 表示用の値を更新
  useEffect(() => {
    if (!isEditing && jsonInput) {
      const newDisplayValue = getDisplayValue(jsonInput);
      setDisplayValue(newDisplayValue);
    } else if (!isEditing && !jsonInput) {
      setDisplayValue("");
    }
  }, [jsonInput, isEditing]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {/* カスタムステータスタブ */}
      <div
        style={{
          overflowX: "auto",
          whiteSpace: "nowrap",
          padding: "0 var(--space-8)",
          borderBottom: "1px solid var(--figma-color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-4)",
            height: "40px",
            alignItems: "center",
            minWidth: "fit-content",
          }}
        >
          {tabOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTabValue(option.value)}
              style={{
                background:
                  tabValue === option.value
                    ? "var(--figma-color-bg-secondary)"
                    : "transparent",
                color:
                  tabValue === option.value
                    ? "var(--figma-color-text)"
                    : "var(--figma-color-text-secondary)",
                border: "none",
                borderRadius: "var(--border-radius-6)",
                padding: "0 var(--space-8)",
                height: "24px",
                fontSize: "11px",
                fontWeight: "400",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (tabValue !== option.value) {
                  e.currentTarget.style.background =
                    "var(--figma-color-bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (tabValue !== option.value) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-6)",
                }}
              >
                {option.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Container space="small">
        {tabValue === "Top" && (
          <>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                height: "40px",
                display: "flex",
                alignItems: "center",
              }}
            >
              Image Src
            </div>
            <TextboxMultiline
              value={jsonInput}
              onValueInput={setJsonInput}
              placeholder="データを貼り付けてください..."
            />

            <VerticalSpace space="small" />
            <Button fullWidth onClick={handleLoadData}>
              データを読み込む
            </Button>
          </>
        )}
        {tabValue === "Top" && displayImages.length > 0 && (
          <>
            <VerticalSpace space="medium" />
            <Text>
              <strong>{displayImages.length}個の画像</strong>
            </Text>
            <VerticalSpace space="extraSmall" />

            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            >
              {displayImages.map((img, index) => {
                // images全体でのインデックスを計算
                const globalIndex = images.findIndex((globalImg) => {
                  if (globalImg.id && img.id && globalImg.id === img.id) {
                    return true;
                  }
                  if (globalImg.src && img.src && globalImg.src === img.src) {
                    return true;
                  }
                  return false;
                });
                const isSelected =
                  globalIndex !== -1 && selectedImageIndex === globalIndex;
                return (
                  <div
                    key={index}
                    onClick={() => handleSelectImage(index, true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px",
                      borderBottom:
                        index < displayImages.length - 1
                          ? "1px solid #f0f0f0"
                          : "none",
                      cursor: "pointer",
                      background: isSelected ? "#e3f2fd" : "transparent",
                      borderLeft: isSelected
                        ? "3px solid #18A0FB"
                        : "3px solid transparent",
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt || `Image ${index + 1}`}
                      style={{
                        width: "40px",
                        height: "40px",
                        objectFit: "cover",
                        marginRight: "8px",
                        borderRadius: "3px",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                        }}
                      >
                        <strong>{index + 1}.</strong> {img.alt || "No title"}
                        {/* {img.service && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <ServiceLogo serviceName={img.service} size={14} />
                        </div>
                      )} */}
                      </div>
                      <div style={{ fontSize: "10px", color: "#666" }}>
                        {img.width} × {img.height}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <VerticalSpace space="small" />
            <Button
              fullWidth
              onClick={handleApplyImage}
              disabled={selectedImageIndex === null}
            >
              選択ノードに画像を適用
            </Button>

            <VerticalSpace space="extraSmall" />
            <Button
              fullWidth
              secondary
              onClick={handleCreateRectangle}
              disabled={selectedImageIndex === null}
            >
              新規レクタングルを作成
            </Button>
          </>
        )}

        {tabValue === "Top" && status && (
          <>
            <VerticalSpace space="small" />
            <div
              style={{
                padding: "8px",
                background:
                  statusType === "error"
                    ? "#ffe0e0"
                    : statusType === "success"
                    ? "#e0f5e0"
                    : "#f5f5f5",
                color:
                  statusType === "error"
                    ? "#d32f2f"
                    : statusType === "success"
                    ? "#388e3c"
                    : "#333",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              {status}
            </div>
          </>
        )}
      </Container>
      <div>
        {tabValue === "Data" && (
          <Data images={images} onDeleteService={handleDeleteService} />
        )}
      </div>
    </div>
  );
}

export default render(Plugin);
