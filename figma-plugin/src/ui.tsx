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
}: {
  serviceName: string;
  size?: number;
}) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = getServiceLogoUrl(serviceName);

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
              setImages(parsed);
              // 状態更新後にメッセージを表示
              setTimeout(() => {
                showStatus(
                  `${parsed.length}個の画像を読み込みました`,
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

      setImages(parsed);
      // 画像データを figmaClientStorage に保存
      emit("SAVE_IMAGES", parsed);
      // 状態更新後にメッセージを表示
      setTimeout(() => {
        showStatus(`${parsed.length}個の画像を読み込みました`, "success");
      }, 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      showStatus(`データ読み込みエラー: ${errorMessage}`, "error");
    }
  };

  // 画像選択
  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index);
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

                {/* <span>
                    <strong
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 var(--space-4)",
                        height: "16px",
                        borderRadius: "var(--border-radius-4)",
                        fontSize: "11px",
                        fontWeight: "500",
                        color:
                          tabValue === option.value
                            ? "var(--figma-color-text)"
                            : "var(--figma-color-text-secondary)",
                        border: "1px solid var(--figma-color-border)",
                      }}
                    >
                      {getCommentCount(option.value)}
                    </strong>
                  </span> */}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Container space="small">
        {/* <div
          style={{
            padding: "12px",
            background: "#f9f9f9",
            borderRadius: "4px",
            fontSize: "11px",
            lineHeight: "1.6",
          }}
        >
          <strong>使い方:</strong>
          <ol style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
            <li>画像データをコピー</li>
            <li>下のテキストエリアに貼り付け</li>
            <li>「データを読み込む」をクリック</li>
            <li>画像を選択してFigmaに適用</li>
          </ol>
        </div> */}

        {/* <VerticalSpace space="medium" /> */}

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

        {tabValue === "Data" && images.length > 0 && (
          <>
            <VerticalSpace space="small" />
            <Text>
              <strong>サービス別画像 ({images.length}個)</strong>
            </Text>
            <VerticalSpace space="extraSmall" />
            {(() => {
              // サービスごとにグループ化
              const groupedByService = images.reduce((acc, img, index) => {
                const service = img.service || "Unknown";
                if (!acc[service]) {
                  acc[service] = [];
                }
                acc[service].push({ ...img, originalIndex: index });
                return acc;
              }, {} as Record<string, Array<ImageData & { originalIndex: number }>>);

              // 各サービスの最新の追加日時を取得
              const serviceList = Object.entries(groupedByService).map(
                ([service, serviceImages]) => {
                  const latestDate = serviceImages
                    .map((img) => img.addedAt)
                    .filter((date) => date)
                    .sort()
                    .reverse()[0];
                  return {
                    service,
                    images: serviceImages,
                    latestDate: latestDate || new Date().toISOString(),
                    count: serviceImages.length,
                  };
                }
              );

              // 最新の追加日時でソート
              serviceList.sort(
                (a, b) =>
                  new Date(b.latestDate).getTime() -
                  new Date(a.latestDate).getTime()
              );

              // 日時をフォーマットする関数
              const formatDate = (dateString: string) => {
                const date = new Date(dateString);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                return `${year}/${month}/${day} ${hours}:${minutes}`;
              };

              return (
                <div
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                  }}
                >
                  {serviceList.map(
                    ({ service, images: serviceImages, latestDate, count }) => (
                      <div
                        key={service}
                        onClick={() => setModalService(service)}
                        style={{
                          padding: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <ServiceLogo serviceName={service} size={20} />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              marginBottom: "4px",
                            }}
                          >
                            {service}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#666",
                            }}
                          >
                            {formatDate(latestDate)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#666",
                            padding: "4px 8px",
                            background: "#f0f0f0",
                            borderRadius: "4px",
                          }}
                        >
                          {count}個
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            })()}
          </>
        )}

        {tabValue === "Top" && images.length > 0 && (
          <>
            <VerticalSpace space="medium" />
            <Text>
              <strong>{images.length}個の画像</strong>
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
              {images.map((img, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectImage(index)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px",
                    borderBottom:
                      index < images.length - 1 ? "1px solid #f0f0f0" : "none",
                    cursor: "pointer",
                    background:
                      selectedImageIndex === index ? "#e3f2fd" : "transparent",
                    borderLeft:
                      selectedImageIndex === index
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
              ))}
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

        {status && (
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

      {/* 下部モーダル */}
      {modalService && (
        <>
          {/* オーバーレイ */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 999,
            }}
            onClick={() => setModalService(null)}
          />
          {/* モーダル */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "white",
              borderTop: "1px solid #e0e0e0",
              boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
              maxHeight: "60vh",
              display: "flex",
              flexDirection: "column",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                padding: "12px",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {modalService && (
                  <ServiceLogo serviceName={modalService} size={20} />
                )}
                <Text>
                  <strong>{modalService}</strong>
                </Text>
              </div>
              <button
                onClick={() => setModalService(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "4px 8px",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px",
              }}
            >
              {(() => {
                const serviceImages = images
                  .map((img, index) => ({ ...img, originalIndex: index }))
                  .filter((img) => (img.service || "Unknown") === modalService);

                return (
                  <div>
                    {serviceImages.map((img) => (
                      <div
                        key={img.originalIndex}
                        onClick={() => {
                          handleSelectImage(img.originalIndex);
                          setModalService(null);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderBottom: "1px solid #f0f0f0",
                          cursor: "pointer",
                          background:
                            selectedImageIndex === img.originalIndex
                              ? "#e3f2fd"
                              : "transparent",
                          borderLeft:
                            selectedImageIndex === img.originalIndex
                              ? "3px solid #18A0FB"
                              : "3px solid transparent",
                        }}
                      >
                        <img
                          src={img.src}
                          alt={img.alt || `Image ${img.originalIndex + 1}`}
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
                          <div style={{ fontSize: "11px" }}>
                            <strong>{img.originalIndex + 1}.</strong>{" "}
                            {img.alt || "No title"}
                          </div>
                          <div style={{ fontSize: "10px", color: "#666" }}>
                            {img.width} × {img.height}
                            {img.addedAt && (
                              <span style={{ marginLeft: "8px" }}>
                                {new Date(img.addedAt).toLocaleString("ja-JP")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div
              style={{
                padding: "12px",
                borderTop: "1px solid #e0e0e0",
                display: "flex",
                gap: "8px",
              }}
            >
              <Button
                fullWidth
                onClick={() => {
                  if (selectedImageIndex !== null) {
                    handleApplyImage();
                    setModalService(null);
                  }
                }}
                disabled={selectedImageIndex === null}
              >
                選択ノードに画像を適用
              </Button>
              <Button
                fullWidth
                secondary
                onClick={() => {
                  if (selectedImageIndex !== null) {
                    handleCreateRectangle();
                    setModalService(null);
                  }
                }}
                disabled={selectedImageIndex === null}
              >
                新規レクタングルを作成
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default render(Plugin);
