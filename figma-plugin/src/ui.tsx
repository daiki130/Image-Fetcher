import {
  render,
  Button,
  Container,
  Text,
  VerticalSpace,
  Textbox,
  TextboxMultiline,
} from "@create-figma-plugin/ui";
import { emit } from "@create-figma-plugin/utilities";
import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import CryptoJS from "crypto-js";

interface ImageData {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  id?: string;
  type?: string;
  base64?: string;
}

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
              showStatus(`${parsed.length}個の画像を読み込みました`, "success");
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
      showStatus(`${parsed.length}個の画像を読み込みました`, "success");
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

  return (
    <div>
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
      <VerticalSpace space="small" />

      <Container space="medium">
        <div
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
        </div>

        <VerticalSpace space="medium" />

        <Text>画像データ:</Text>
        <VerticalSpace space="extraSmall" />
        <TextboxMultiline
          value={jsonInput}
          onValueInput={setJsonInput}
          placeholder="データを貼り付けてください..."
          rows={6}
        />

        <VerticalSpace space="small" />
        <Button fullWidth onClick={handleLoadData}>
          データを読み込む
        </Button>

        {images.length > 0 && (
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
                    <div style={{ fontSize: "11px" }}>
                      <strong>{index + 1}.</strong> {img.alt || "No title"}
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
    </div>
  );
}

export default render(Plugin);
