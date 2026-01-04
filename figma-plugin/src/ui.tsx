import {
  render,
  Button,
  Container,
  Text,
  VerticalSpace,
  IconSizeSmall24,
  IconToggleButton,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { h, Fragment, JSX } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import CryptoJS from "crypto-js";
import { ImageData, ImagesLoadedHandler } from "./types";
import { Data } from "./components/data";
import { Card } from "./components/card";
import { Tooltip } from "./components/Tooltip";
import { SettingsMenu } from "./components/SettingsMenu";
// import "./styles.css";

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
    if (!encryptedBase64 || encryptedBase64.trim().length === 0) {
      console.error("Decryption error: Empty input");
      return null;
    }

    const trimmedInput = encryptedBase64.trim();
    const binaryString = atob(trimmedInput);

    if (binaryString.length < 16) {
      console.error("Decryption error: Data too short (less than 16 bytes)");
      return null;
    }

    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // IV（16バイト）と暗号化データを分離（AES-CBC用）
    const ivBytes = combined.slice(0, 16);
    const encryptedBytes = combined.slice(16);

    if (encryptedBytes.length === 0) {
      console.error("Decryption error: No encrypted data after IV");
      return null;
    }

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

    if (!decryptedString || decryptedString.length === 0) {
      console.error("Decryption error: Decrypted string is empty");
      return null;
    }

    return decryptedString;
  } catch (error) {
    console.error("Decryption error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
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

// グローバルにドラッグ中の画像データを保存
interface DraggedImageData {
  imageData: Uint8Array;
  width: number;
  height: number;
}

declare global {
  interface Window {
    draggedImageData?: DraggedImageData;
  }
}

function Plugin() {
  const [jsonInput, setJsonInput] = useState("");
  const [images, setImages] = useState<ImageData[]>([]);
  const [displayImages, setDisplayImages] = useState<ImageData[]>([]); // Topタブで表示する画像（「データを読み込む」で追加したもののみ）
  const [selectedImageIndices, setSelectedImageIndices] = useState<Set<number>>(
    new Set()
  );
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">(
    "info"
  );
  const [modalService, setModalService] = useState<string | null>(null); // モーダルで表示するサービス名
  const [isEditing, setIsEditing] = useState(false); // 編集中かどうか
  const [displayValue, setDisplayValue] = useState<string>(""); // 表示用の値

  // ドラッグ終了時にFigmaに追加
  useEffect(() => {
    const handleDragEnd = async (e: Event) => {
      console.log("Drag end event fired");
      // 少し遅延を入れて、ドラッグ終了を確実に検出
      setTimeout(() => {
        if (window.draggedImageData) {
          console.log(
            "Adding image to Figma:",
            window.draggedImageData.width,
            "x",
            window.draggedImageData.height
          );
          emit("DROP_IMAGE", window.draggedImageData);
          window.draggedImageData = undefined;
          showStatus("画像をFigmaに追加しました", "success");
        } else {
          console.log("No dragged image data found");
        }
      }, 100);
    };

    // グローバルにドラッグ終了イベントをリッスン
    document.addEventListener("dragend", handleDragEnd);

    return () => {
      document.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  // 起動時に保存された画像データを読み込む
  useEffect(() => {
    emit("LOAD_IMAGES");
  }, []);

  // displayImagesの表示状態に応じてプラグインの幅を変更（アニメーションはmain.tsで処理）
  useEffect(() => {
    if (displayImages.length > 0) {
      emit("RESIZE_UI", { width: 410, height: 1000 });
    } else {
      emit("RESIZE_UI", { width: 400, height: 1000 });
    }
  }, [displayImages.length]);

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

  // データ読み込み（引数でデータを直接渡すことも可能）
  const handleLoadData = async (data?: string) => {
    const dataToProcess = data || jsonInput;
    if (!dataToProcess.trim()) {
      showStatus("データを入力してください", "error");
      return;
    }

    try {
      let dataToParse = dataToProcess.trim();

      // 暗号化されている場合は復号化
      if (isEncrypted(dataToParse)) {
        showStatus("データを復号化中...", "info");
        console.log("Attempting to decrypt data, length:", dataToParse.length);

        try {
          const decrypted = decryptData(dataToParse);

          if (!decrypted) {
            console.error("Decryption returned null or empty string");
            // 復号化に失敗した場合、元のデータでJSONパースを試みる
            try {
              const parsed = JSON.parse(dataToParse);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Chrome拡張機能の短縮形式（w, h）を通常形式（width, height, alt）に変換
                let convertedParsed = parsed.map((img: any) => {
                  // 既に通常形式の場合はそのまま返す（base64やserviceなどのフィールドも保持）
                  if (img.width && img.height) {
                    return {
                      ...img,
                      alt: img.alt || "",
                      favicon: img.favicon || null,
                    };
                  }
                  // 短縮形式の場合は変換（base64やserviceなどのフィールドも保持）
                  return {
                    src: img.src,
                    alt: img.alt || "",
                    width: img.w || img.width || 0,
                    height: img.h || img.height || 0,
                    base64: img.base64 || null, // base64データを保持
                    service: img.service || null, // serviceを保持
                    favicon: img.favicon || null,
                  };
                });

                // 既存データを取得してマージ
                const existingImages = images.length > 0 ? images : [];
                const merged = mergeImages(existingImages, convertedParsed);
                setImages(merged);
                // 表示用画像を新しいデータに置き換え（convertedParsed内の重複を排除）
                const uniqueParsed: ImageData[] = [];
                for (const newImage of convertedParsed) {
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
            } catch (parseError) {
              console.error(
                "JSON parse error after decryption failure:",
                parseError
              );
            }
            showStatus(
              "データの復号化に失敗しました。ファイルが正しい形式か確認してください",
              "error"
            );
            return;
          }

          console.log(
            "Decryption successful, decrypted length:",
            decrypted.length
          );
          dataToParse = decrypted;
        } catch (decryptError) {
          console.error("Decryption error:", decryptError);
          showStatus(
            `復号化エラー: ${
              decryptError instanceof Error
                ? decryptError.message
                : "不明なエラー"
            }`,
            "error"
          );
          return;
        }
      }

      let parsed = JSON.parse(dataToParse);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        showStatus("有効な画像配列を入力してください", "error");
        return;
      }

      // Chrome拡張機能の短縮形式（w, h）を通常形式（width, height, alt）に変換
      parsed = parsed.map((img: any) => {
        // 既に通常形式の場合はそのまま返す（base64やserviceなどのフィールドも保持）
        if (img.width && img.height) {
          return {
            ...img,
            alt: img.alt || "",
            favicon: img.favicon || null,
          };
        }
        // 短縮形式の場合は変換（base64やserviceなどのフィールドも保持）
        return {
          src: img.src,
          alt: img.alt || "",
          width: img.w || img.width || 0,
          height: img.h || img.height || 0,
          base64: img.base64 || null, // base64データを保持
          service: img.service || null, // serviceを保持
          favicon: img.favicon || null,
        };
      });

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
  // 複数選択対応：クリックで選択/選択解除をトグル
  const handleSelectImage = (index: number, isTopTab: boolean = false) => {
    setSelectedImageIndices((prev) => {
      const newSet = new Set(prev);
      let targetIndex: number;

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
        if (globalIndex === -1) {
          return prev; // 見つからない場合は変更なし
        }
        targetIndex = globalIndex;
      } else {
        targetIndex = index;
      }

      // トグル：既に選択されている場合は解除、されていない場合は追加
      if (newSet.has(targetIndex)) {
        newSet.delete(targetIndex);
      } else {
        newSet.add(targetIndex);
      }

      return newSet;
    });
  };

  // 選択ノードに適用（複数選択されている場合は最初の選択を適用）
  const handleApplyImage = async () => {
    if (selectedImageIndices.size === 0) {
      showStatus("画像を選択してください", "error");
      return;
    }

    // 複数選択されている場合は最初の選択を適用
    const firstSelectedIndex = Array.from(selectedImageIndices)[0];
    const selectedImage = images[firstSelectedIndex];

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

  // フレーム内にすべての画像を自動配置
  const handlePlaceAllImagesInFrame = async () => {
    if (displayImages.length === 0) {
      showStatus("配置する画像がありません", "error");
      return;
    }

    showStatus("画像を処理中...", "info");

    try {
      const imagesToPlace: Array<{
        imageData: Uint8Array;
        width: number;
        height: number;
      }> = [];

      // すべての画像を変換
      for (let i = 0; i < displayImages.length; i++) {
        const img = displayImages[i];
        showStatus(
          `画像を処理中... (${i + 1}/${displayImages.length})`,
          "info"
        );

        const imageData = await downloadAndConvertImage(img);
        if (imageData) {
          imagesToPlace.push({
            imageData,
            width: img.width || 200,
            height: img.height || 200,
          });
        }
      }

      if (imagesToPlace.length > 0) {
        emit("PLACE_IMAGES_IN_FRAME", { images: imagesToPlace });
        showStatus(
          `${imagesToPlace.length}個の画像をフレーム内に配置しました`,
          "success"
        );
      } else {
        showStatus("配置できる画像がありませんでした", "error");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      showStatus(`エラー: ${errorMessage}`, "error");
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

  async function handleSelectedFiles(files: Array<File>) {
    if (files.length === 0) {
      return;
    }

    const file = files[0];

    // .imagefetcherファイルのみを受け付ける
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".imagefetcher")) {
      showStatus(".imagefetcherファイルのみ読み込めます", "error");
      return;
    }

    try {
      showStatus("ファイルを読み込み中...", "info");
      const text = await file.text();

      // ファイルの内容を確認（デバッグ用）
      console.log("File content length:", text.length);
      console.log("File content preview:", text.substring(0, 100));

      // BOMを削除（UTF-8 BOM: \uFEFF）
      const cleanedText = text.replace(/^\uFEFF/, "").trim();

      if (!cleanedText || cleanedText.length === 0) {
        showStatus("ファイルが空です", "error");
        return;
      }

      // ファイルの内容をそのまま設定（表示用）
      setJsonInput(cleanedText);
      // データを直接渡して読み込む（setJsonInputの状態更新を待たない）
      await handleLoadData(cleanedText);
    } catch (error) {
      console.error("File read error:", error);
      showStatus(
        `ファイルの読み込みに失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
        "error"
      );
    }
  }

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  function handleClick(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.checked;
    setIsOpen(newValue);
  }

  const [tooltipStates, setTooltipStates] = useState<{
    [key: string]: boolean;
  }>({});

  const showTooltip = (key: string) => {
    setTooltipStates((prev) => ({ ...prev, [key]: true }));
  };

  const hideTooltip = (key: string) => {
    setTooltipStates((prev) => ({ ...prev, [key]: false }));
  };

  const isTooltipVisible = (key: string) => tooltipStates[key] || false;

  // 画像サイズフィルター用の状態
  // 画像サイズを文字列として管理（例："319×240"）
  // 特別な値 "__ALL__" は「すべて」を表す
  const [selectedImageSizes, setSelectedImageSizes] = useState<Set<string>>(
    new Set(["__ALL__"])
  );

  // 利用可能な画像サイズのリストを取得
  const availableImageSizes = (() => {
    const sizeSet = new Set<string>();
    displayImages.forEach((img) => {
      const width = img.width || 0;
      const height = img.height || 0;
      if (width > 0 && height > 0) {
        sizeSet.add(`${width}×${height}`);
      }
    });
    // サイズでソート（幅×高さの順）
    return Array.from(sizeSet).sort((a, b) => {
      const [aWidth, aHeight] = a.split("×").map(Number);
      const [bWidth, bHeight] = b.split("×").map(Number);
      if (aWidth !== bWidth) return aWidth - bWidth;
      return aHeight - bHeight;
    });
  })();

  // 画像サイズフィルター用のハンドラー
  const handleImageSizeFilterChange = (size: string) => {
    setSelectedImageSizes((prev) => {
      const newSet = new Set(prev);

      if (size === "__ALL__") {
        // 「すべて」が選択された場合
        if (newSet.has("__ALL__")) {
          // 既に選択されている場合は解除しない（常に1つは選択されている必要がある）
          return prev;
        } else {
          // 「すべて」を選択し、個別のサイズをすべて解除
          return new Set(["__ALL__"]);
        }
      } else {
        // 個別のサイズが選択された場合
        if (newSet.has(size)) {
          // 選択解除
          newSet.delete(size);
        } else {
          // 選択追加
          newSet.add(size);
          // 「すべて」を解除
          newSet.delete("__ALL__");
        }

        // 個別のサイズがすべて外れた場合、「すべて」を自動選択
        const hasAnySize = Array.from(newSet).some((s) => s !== "__ALL__");
        if (!hasAnySize) {
          return new Set(["__ALL__"]);
        }

        return newSet;
      }
    });
  };

  // 既存のソート/フィルター用の状態（ダミー実装）
  const [sortHighEnabled] = useState<boolean>(false);
  const [sortLowEnabled] = useState<boolean>(false);
  const [sortLabelEnabled] = useState<boolean>(false);
  const [showWithDueDate] = useState<boolean>(false);
  const [showWithoutDueDate] = useState<boolean>(false);
  const [availableLabels] = useState<string[]>([]);
  const [selectedLabels] = useState<string[]>([]);

  // 既存のソート/フィルター用のハンドラー（ダミー実装）
  const handleSortHighChange = (_enabled: boolean) => {};
  const handleSortLowChange = (_enabled: boolean) => {};
  const handleSortLabelChange = (_enabled: boolean) => {};
  const handleDueDateFilterChange = (
    _withDueDate: boolean,
    _withoutDueDate: boolean
  ) => {};
  const handleLabelFilterChange = (_label: string) => {};

  // 画像サイズでフィルターするロジック
  const imagesToDisplay = (() => {
    // 「すべて」が選択されている場合はすべて表示
    if (selectedImageSizes.has("__ALL__")) {
      return displayImages;
    }

    // 選択されたサイズの画像のみ表示
    return displayImages.filter((img) => {
      const width = img.width || 0;
      const height = img.height || 0;
      if (width === 0 || height === 0) return false;
      const sizeStr = `${width}×${height}`;
      return selectedImageSizes.has(sizeStr);
    });
  })();

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        backgroundColor: "var(--figma-color-bg-secondary)",
        // backgroundColor: "#141414",
      }}
    >
      {/* カスタムステータスタブ */}
      {/* <div
        style={{
          overflowX: "auto",
          whiteSpace: "nowrap",
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
      </div> */}
      {tabValue === "Top" && (
        <div>
          <div
            style={{
              padding: "var(--space-small)",
              borderRight: "1px solid var(--figma-color-border)",
            }}
          >

            {imagesToDisplay.length === 0 && (
            <div
              style={{
                border: `2px dashed var(--figma-color-border)`,
                borderRadius: "12px",
                padding: "40px 20px",
                textAlign: "center",
                cursor: "pointer",
                position: "relative",
                color: "var(--figma-color-text)",
                backgroundColor: "var(--figma-color-bg)",
                lineHeight: "2.3",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--figma-color-border-selected)";
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--figma-color-border)";
              }}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--figma-color-border)";
                const dataTransfer = e.dataTransfer;
                if (dataTransfer && dataTransfer.files) {
                  const files = Array.from(dataTransfer.files);
                  if (files.length > 0) {
                    handleSelectedFiles(files);
                  }
                }
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".imagefetcher";
                input.onchange = async (e: Event) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files.length > 0) {
                    handleSelectedFiles(Array.from(files));
                  }
                };
                input.click();
              }}
            >
              Drag-and-drop or click to
              <br />
              upload a{" "}
              <span
                style={{
                  padding: "4px",
                  background: "var(--figma-color-bg-secondary)",
                  borderRadius: "4px",
                }}
              >
                .imagefetcher
              </span>{" "}
              file
            </div>
            )}
            {imagesToDisplay.length > 0 &&
              (() => {
                // ユニークなサービス名とfaviconを取得
                const uniqueServices = new Map<string, string>();
                imagesToDisplay.forEach((img) => {
                  const serviceName = img.service || "Unknown";
                  if (!uniqueServices.has(serviceName) && img.favicon) {
                    uniqueServices.set(serviceName, img.favicon);
                  }
                });

                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {Array.from(uniqueServices.entries()).map(
                        ([serviceName, favicon]) => (
                          <div
                            key={serviceName}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              borderRadius: "6px",
                              backgroundColor: "var(--figma-color-bg)",
                              padding: "8px",
                            }}
                          >
                            <ServiceLogo
                              serviceName={serviceName}
                              favicon={favicon}
                              size={24}
                            />
                            <div
                              style={{
                                fontSize: "13px",
                                color: "var(--figma-color-text)",
                              }}
                            >
                              {serviceName}
                            </div>
                            <span
                              style={{
                                fontSize: "10px",
                                borderRadius: "4px",
                                padding: "2px 8px",
                                border: "1px solid var(--figma-color-border)",
                              }}
                            >
                              {displayImages.length} images
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>

          {displayImages.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                }}
              >
                <Text>
                  <strong>{displayImages.length} images</strong>
                </Text>
                <VerticalSpace space="extraSmall" />

                <div
                  ref={settingsMenuRef}
                  style={{ position: "relative", display: "inline-block" }}
                  onMouseEnter={() => showTooltip("filter")}
                  onMouseLeave={() => hideTooltip("filter")}
                >
                  <IconToggleButton onChange={handleClick} value={isOpen}>
                    <IconSizeSmall24 />
                  </IconToggleButton>
                  {/* Tooltip */}
                  {isTooltipVisible("filter") && !isOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "24px",
                        right: "-4px",
                        zIndex: 1000,
                      }}
                    >
                      <Tooltip
                        message="Size"
                        arrowPosition="top"
                        arrowOffset="74%"
                      />
                    </div>
                  )}

                  {/* Settings Menu */}
                  {isOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "28px",
                        right: "-3px",
                        zIndex: 1001,
                      }}
                    >
                      <SettingsMenu
                        sortHighEnabled={sortHighEnabled}
                        sortLowEnabled={sortLowEnabled}
                        sortLabelEnabled={sortLabelEnabled}
                        availableImageSizes={availableImageSizes}
                        selectedImageSizes={Array.from(selectedImageSizes)}
                        showWithDueDate={showWithDueDate}
                        showWithoutDueDate={showWithoutDueDate}
                        availableLabels={availableLabels}
                        selectedLabels={selectedLabels}
                        onSortHighChange={handleSortHighChange}
                        onSortLowChange={handleSortLowChange}
                        onSortLabelChange={handleSortLabelChange}
                        onImageSizeFilterChange={handleImageSizeFilterChange}
                        onDueDateFilterChange={handleDueDateFilterChange}
                        onLabelFilterChange={handleLabelFilterChange}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  maxHeight: "530px",
                  // overflowY: "auto",
                  padding: "0 var(--space-small)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  {imagesToDisplay.map((img, index) => {
                    // images全体でのインデックスを計算
                    const globalIndex = images.findIndex((globalImg) => {
                      if (globalImg.id && img.id && globalImg.id === img.id) {
                        return true;
                      }
                      if (
                        globalImg.src &&
                        img.src &&
                        globalImg.src === img.src
                      ) {
                        return true;
                      }
                      return false;
                    });
                    const isSelected =
                      globalIndex !== -1 &&
                      selectedImageIndices.has(globalIndex);
                    return (
                      <Card
                        key={index}
                        image={img}
                        isSelected={isSelected}
                        onClick={() => handleSelectImage(index, true)}
                        onDragStart={async (image) => {
                          // ドラッグ開始時に画像を処理（非同期で準備）
                          console.log(
                            "Drag start, preparing image:",
                            image.src
                          );
                          downloadAndConvertImage(image)
                            .then((imageData) => {
                              if (imageData) {
                                // 画像データを準備（ドロップ時に使用）
                                window.draggedImageData = {
                                  imageData,
                                  width: image.width,
                                  height: image.height,
                                };
                                console.log(
                                  "Image data prepared:",
                                  image.width,
                                  "x",
                                  image.height
                                );
                              } else {
                                console.error("Failed to convert image");
                              }
                            })
                            .catch((error) => {
                              console.error("Error converting image:", error);
                            });
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <VerticalSpace space="small" />
              <div
                style={{
                  position: "fixed",
                  bottom: "0",
                  left: "0",
                  right: "0",
                  padding: "12px 12px ",
                  zIndex: 99,
                  background: "var(--figma-color-bg)",
                  display: "flex",
                  gap: "4px",
                }}
              >
                <Button
                  fullWidth
                  onClick={handleApplyImage}
                  disabled={selectedImageIndices.size === 0}
                  style={{
                    backgroundColor: "var(--figma-color-background-secondary)",
                    color: "var(--figma-color-text-tertiary)",
                    height: "32px",
                  }}
                >
                  選択ノードに画像を適用
                </Button>
                <Button
                  fullWidth
                  onClick={handlePlaceAllImagesInFrame}
                  disabled={displayImages.length === 0}
                  style={{
                    color: "var(--figma-color-text)",
                    height: "32px",
                  }}
                >
                  フレーム内に自動配置
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <div>
        {tabValue === "Data" && (
          <Data images={images} onDeleteService={handleDeleteService} />
        )}
      </div>
    </div>
  );
}

export default render(Plugin);
