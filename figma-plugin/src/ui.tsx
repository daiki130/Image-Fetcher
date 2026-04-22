import {
  render,
  Button,
  Checkbox,
  Container,
  Text,
  IconLanguageSmall24,
  IconSizeSmall24,
  IconToggleButton,
  SearchTextbox,
} from "@create-figma-plugin/ui";
import { emit, on, MIXED_BOOLEAN } from "@create-figma-plugin/utilities";
import { h, Fragment, JSX } from "preact";
import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import CryptoJS from "crypto-js";
import {
  CanvasSelectionNodeSummary,
  ImageData,
  ImagesLoadedHandler,
} from "./types";
import { buildRandomDemoImages } from "./randomDemoMode";
import { Data } from "./components/data";
import { Card } from "./components/card";
import { Tooltip } from "./components/Tooltip";
import { SettingsMenu } from "./components/SettingsMenu";
import { Loading } from "./components/loading";
import { Dummy } from "./components/dummy";
import { Footer } from "./components/footer";
import { ApplyImageLoadingModal } from "./components/ApplyImageLoadingModal";
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
      },
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

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const short = withHash.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const full = withHash.match(/^#([0-9a-fA-F]{6})$/);
  if (full) {
    return withHash.toLowerCase();
  }
  return "#C4C4C4";
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
    new Set(),
  );
  // 選択された順序を追跡（最新の選択が最後に来る）
  const [selectedImageOrder, setSelectedImageOrder] = useState<number[]>([]);
  // アニメーション用：新しく追加された画像のインデックス
  const [newlyAddedIndex, setNewlyAddedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">(
    "info",
  );
  const [modalService, setModalService] = useState<string | null>(null); // モーダルで表示するサービス名
  const [isEditing, setIsEditing] = useState(false); // 編集中かどうか
  const [displayValue, setDisplayValue] = useState<string>(""); // 表示用の値
  const [isLoading, setIsLoading] = useState(false); // データ読み込み中かどうか
  const [loadingProgress, setLoadingProgress] = useState(0); // 進捗率（0-100）
  const [applyButtonLoading, setApplyButtonLoading] = useState(false); // 適用ボタンのローディング状態
  /** Apply 実行中の進捗（プレビュー表示時は null） */
  const [applyPlaceProgress, setApplyPlaceProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  /** Top タブの Apply: オンでアスペクト比が近い枠にマッチ、オフは選択画像を枠の順に割り当て */
  const [matchAspectRatioForFrame, setMatchAspectRatioForFrame] =
    useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false); // 一番下までスクロールしたかどうか
  const scrollContainerRef = useRef<HTMLDivElement>(null); // スクロール可能なコンテナのref

  const [tabValue, setTabValue] = useState<string>("Top");
  const [randomDemoSeed, setRandomDemoSeed] = useState(1);
  const [selectedRandomIndices, setSelectedRandomIndices] = useState<
    Set<number>
  >(new Set());

  const randomDemoImages = useMemo(
    () => buildRandomDemoImages(randomDemoSeed, 5),
    [randomDemoSeed],
  );

  const DUMMY_TEXT_STORAGE_KEY = "image-fetcher-dummy-text-template";
  const RANDOM_MASK_COLOR_STORAGE_KEY = "image-fetcher-random-mask-color";
  const [dummyTextTemplate, setDummyTextTemplate] = useState(() => {
    try {
      const v = localStorage.getItem(DUMMY_TEXT_STORAGE_KEY);
      return v != null && v !== "" ? v : "テキスト";
    } catch {
      return "テキスト";
    }
  });
  const [randomMaskColor, setRandomMaskColor] = useState(() => {
    try {
      const saved = localStorage.getItem(RANDOM_MASK_COLOR_STORAGE_KEY);
      return saved ? normalizeHexColor(saved) : "#C4C4C4";
    } catch {
      return "#C4C4C4";
    }
  });
  /** Dummy タブ: Apply 時にダミーテキストを適用するか */
  const [dummyApplyDummyText, setDummyApplyDummyText] = useState(true);
  /** Dummy タブ: Apply 時にマスク色を適用するか */
  const [dummyApplyMaskImage, setDummyApplyMaskImage] = useState(true);
  const [searchValue, setSearchValue] = useState<string>("");
  function handleSearchInput(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    console.log(newValue);
    setSearchValue(newValue);
  }

  useEffect(() => {
    try {
      localStorage.setItem(DUMMY_TEXT_STORAGE_KEY, dummyTextTemplate);
    } catch {
      /* ignore */
    }
  }, [dummyTextTemplate]);

  useEffect(() => {
    try {
      localStorage.setItem(
        RANDOM_MASK_COLOR_STORAGE_KEY,
        normalizeHexColor(randomMaskColor),
      );
    } catch {
      /* ignore */
    }
  }, [randomMaskColor]);

  useEffect(() => {
    setSelectedRandomIndices(new Set());
  }, [randomDemoSeed]);

  useEffect(() => {
    if (tabValue !== "Dummy") {
      setSelectedRandomIndices(new Set());
    }
  }, [tabValue]);

  // スクロール位置を監視
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // 一番下までスクロールしたかどうかを判定（5pxの余裕を持たせる）
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      setIsScrolledToBottom(isAtBottom);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    // 初回チェック
    handleScroll();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [displayImages]); // displayImagesが変更されたら再チェック

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
            window.draggedImageData.height,
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

  // main.ts から画像データを受け取る
  useEffect(() => {
    const handler = (loadedImages: ImageData[]) => {
      if (loadedImages && loadedImages.length > 0) {
        setImages(loadedImages);
        showStatus(
          `${loadedImages.length}個の保存された画像を読み込みました`,
          "success",
        );
      }
    };
    on("IMAGES_LOADED", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** キャンバス上の選択（main の selectionchange / 起動時同期） */
  const [canvasSelection, setCanvasSelection] = useState<
    CanvasSelectionNodeSummary[]
  >([]);

  useEffect(() => {
    const handler = (data: { nodes: CanvasSelectionNodeSummary[] }) => {
      setCanvasSelection(data.nodes ?? []);
    };
    on("CANVAS_SELECTION_CHANGED", handler);
    emit("REQUEST_CANVAS_SELECTION");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 画像の重複チェック（srcまたはidで判定）
  const isDuplicateImage = (
    existing: ImageData,
    newImage: ImageData,
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
    newImages: ImageData[],
  ): ImageData[] => {
    const merged = [...existing];

    for (const newImage of newImages) {
      // 重複チェック
      const isDuplicate = merged.some((existingImage) =>
        isDuplicateImage(existingImage, newImage),
      );

      if (!isDuplicate) {
        merged.push(newImage);
      }
    }

    return merged;
  };

  // 進捗更新を確実に反映させるためのヘルパー関数
  const updateProgress = (progress: number): Promise<void> => {
    return new Promise((resolve) => {
      setLoadingProgress(progress);
      requestAnimationFrame(() => {
        setTimeout(resolve, 50); // UI更新を確実にするための小さな遅延
      });
    });
  };

  // データ読み込み（引数でデータを直接渡すことも可能）
  const handleLoadData = async (data?: string) => {
    const dataToProcess = data || jsonInput;
    if (!dataToProcess.trim()) {
      showStatus("データを入力してください", "error");
      return;
    }

    // ローディング開始
    setIsLoading(true);
    await updateProgress(0);

    try {
      await updateProgress(5);
      let dataToParse = dataToProcess.trim();

      // 暗号化されている場合は復号化
      if (isEncrypted(dataToParse)) {
        await updateProgress(10);
        showStatus("データを復号化中...", "info");
        console.log("Attempting to decrypt data, length:", dataToParse.length);

        try {
          await updateProgress(20);
          const decrypted = decryptData(dataToParse);
          await updateProgress(30);

          if (!decrypted) {
            console.error("Decryption returned null or empty string");
            // 復号化に失敗した場合、元のデータでJSONパースを試みる
            try {
              await updateProgress(40);
              const parsed = JSON.parse(dataToParse);
              if (Array.isArray(parsed) && parsed.length > 0) {
                await updateProgress(50);
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
                await updateProgress(70);
                const existingImages = images.length > 0 ? images : [];
                const merged = mergeImages(existingImages, convertedParsed);
                setImages(merged);
                // 表示用画像を新しいデータに置き換え（convertedParsed内の重複を排除）
                const uniqueParsed: ImageData[] = [];
                for (const newImage of convertedParsed) {
                  const isDuplicate = uniqueParsed.some((existingImage) =>
                    isDuplicateImage(existingImage, newImage),
                  );
                  if (!isDuplicate) {
                    uniqueParsed.push(newImage);
                  }
                }
                setDisplayImages(uniqueParsed);
                setSelectedImageSizes(new Set(["__ALL__"]));
                await updateProgress(90);
                // 画像データを figmaClientStorage に保存
                emit("SAVE_IMAGES", merged);
                await updateProgress(100);
                // 状態更新後にメッセージを表示（少し長めの遅延で完了を確認できるように）
                setTimeout(() => {
                  setIsLoading(false);
                  showStatus(
                    `${parsed.length}個の画像を追加しました（合計: ${merged.length}個）`,
                    "success",
                  );
                }, 300);
                return;
              }
            } catch (parseError) {
              console.error(
                "JSON parse error after decryption failure:",
                parseError,
              );
            }
            setIsLoading(false);
            showStatus(
              "データの復号化に失敗しました。ファイルが正しい形式か確認してください",
              "error",
            );
            return;
          }

          console.log(
            "Decryption successful, decrypted length:",
            decrypted.length,
          );
          dataToParse = decrypted;
        } catch (decryptError) {
          console.error("Decryption error:", decryptError);
          setIsLoading(false);
          showStatus(
            `復号化エラー: ${
              decryptError instanceof Error
                ? decryptError.message
                : "不明なエラー"
            }`,
            "error",
          );
          return;
        }
      }

      await updateProgress(40);
      let parsed = JSON.parse(dataToParse);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setIsLoading(false);
        showStatus("有効な画像配列を入力してください", "error");
        return;
      }

      await updateProgress(50);
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

      await updateProgress(60);
      // 既存データと新規データをマージ
      // 既存の images ステートを使用（起動時に自動で読み込まれている）
      const existingImages = images.length > 0 ? images : [];
      const merged = mergeImages(existingImages, parsed);

      await updateProgress(70);
      setImages(merged);
      // 表示用画像を新しいデータに置き換え（parsed内の重複を排除）
      const uniqueParsed: ImageData[] = [];
      for (const newImage of parsed) {
        const isDuplicate = uniqueParsed.some((existingImage) =>
          isDuplicateImage(existingImage, newImage),
        );
        if (!isDuplicate) {
          uniqueParsed.push(newImage);
        }
      }
      setDisplayImages(uniqueParsed);
      setSelectedImageSizes(new Set(["__ALL__"]));
      await updateProgress(90);
      // 画像データを figmaClientStorage に保存
      emit("SAVE_IMAGES", merged);
      await updateProgress(100);
      // 状態更新後にメッセージを表示（少し長めの遅延で完了を確認できるように）
      const addedCount = merged.length - existingImages.length;
      setTimeout(() => {
        setIsLoading(false);
        if (addedCount > 0) {
          showStatus(
            `${addedCount}個の画像を追加しました（合計: ${merged.length}個）`,
            "success",
          );
        } else {
          showStatus(
            `すべての画像は既に追加されています（合計: ${merged.length}個）`,
            "info",
          );
        }
      }, 300);
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      showStatus(`データ読み込みエラー: ${errorMessage}`, "error");
    }
  };

  // 画像選択（Topタブ用：グリッドの画像から images 全体のインデックスを計算）
  // 複数選択対応：クリックで選択/選択解除をトグル
  // topImage: サイズフィルタ適用時は imagesToDisplay の要素を渡す（displayImages[index] とずれないように）
  const handleSelectImage = (
    index: number,
    isTopTab: boolean = false,
    topImage?: ImageData,
  ) => {
    setSelectedImageIndices((prev) => {
      const newSet = new Set(prev);
      let targetIndex: number;

      if (isTopTab) {
        const selectedImage = topImage ?? displayImages[index];
        if (!selectedImage) {
          return prev;
        }
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
        // 選択順序からも削除
        setSelectedImageOrder((prevOrder) =>
          prevOrder.filter((idx) => idx !== targetIndex),
        );
        setNewlyAddedIndex(null);
      } else {
        newSet.add(targetIndex);
        // 選択順序に追加（最新が最後に来る）
        setSelectedImageOrder((prevOrder) => [...prevOrder, targetIndex]);
        // アニメーション用：新しく追加された画像を記録
        setNewlyAddedIndex(targetIndex);
        // アニメーション完了後にリセット
        setTimeout(() => {
          setNewlyAddedIndex(null);
        }, 500);
      }

      return newSet;
    });
  };

  /** Dummy は1枚だけ選択（同じ画像をフレーム内の各 img 枠に繰り返し適用） */
  const toggleRandomImageSelect = (index: number) => {
    setSelectedRandomIndices((prev) => {
      if (prev.has(index) && prev.size === 1) {
        return new Set();
      }
      return new Set([index]);
    });
  };

  // 選択ノードに適用（複数選択されている場合は最初の選択を適用）
  // const handleApplyImage = async () => {
  //   if (tabValue === "Dummy") {
  //     if (selectedRandomIndices.size === 0) {
  //       showStatus("画像を選択してください", "error");
  //       return;
  //     }
  //     const idx = Array.from(selectedRandomIndices).sort((a, b) => a - b)[0];
  //     const selectedImage = randomDemoImages[idx];
  //     if (!selectedImage) {
  //       showStatus("画像を選択してください", "error");
  //       return;
  //     }
  //     const imageData = await downloadAndConvertImage(selectedImage);
  //     if (imageData) {
  //       emit("APPLY_IMAGE_DATA", { imageData });
  //       showStatus("画像を適用しました", "success");
  //     } else {
  //       showStatus(
  //         "画像の処理に失敗しました。画像データを確認してください",
  //         "error",
  //       );
  //     }
  //     return;
  //   }

  //   if (selectedImageIndices.size === 0) {
  //     showStatus("画像を選択してください", "error");
  //     return;
  //   }

  //   const firstSelectedIndex = Array.from(selectedImageIndices)[0];
  //   const selectedImage = images[firstSelectedIndex];

  //   const imageData = await downloadAndConvertImage(selectedImage);

  //   if (imageData) {
  //     emit("APPLY_IMAGE_DATA", { imageData });
  //     showStatus("画像を適用しました", "success");
  //   } else {
  //     showStatus(
  //       "画像の処理に失敗しました。画像データを確認してください",
  //       "error",
  //     );
  //   }
  // };

  // フレーム内にすべての画像を自動配置
  const handlePlaceAllImagesInFrame = async () => {
    setApplyButtonLoading(true);
    setApplyPlaceProgress(null);

    // Dummy タブは画像配置を行わず、applyDummyText / applyMaskImage のフラグに応じて
    // テキスト置換・マスク色適用のみを実行する
    if (tabValue === "Dummy") {
      showStatus("フレームに適用中...", "info");
      // モーダルのスキャンライン等のアニメーションが1サイクル以上回るように
      // 最低表示時間を確保する（セル毎の animation-delay が最大 2.6s なので
      // それ以上に設定しないと「止まって見える」セルが出る）
      const MIN_MODAL_MS = 2800;
      const startedAt = Date.now();
      try {
        const result = await new Promise<{
          ok: boolean;
          appliedText: number;
          appliedMask: number;
          skippedProtected: number;
          errorMessage?: string;
        }>((resolve) => {
          const off = on(
            "APPLY_DUMMY_CONTENT_IN_FRAME_DONE",
            (data: {
              ok: boolean;
              appliedText: number;
              appliedMask: number;
              skippedProtected: number;
              errorMessage?: string;
            }) => {
              if (typeof off === "function") {
                off();
              }
              resolve(data);
            },
          );
          emit("APPLY_DUMMY_CONTENT_IN_FRAME", {
            dummyTextTemplate,
            maskColor: normalizeHexColor(randomMaskColor),
            applyDummyText: dummyApplyDummyText,
            applyMaskImage: dummyApplyMaskImage,
          });
        });

        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_MODAL_MS) {
          await new Promise((r) => setTimeout(r, MIN_MODAL_MS - elapsed));
        }

        if (result.ok) {
          const parts: string[] = [];
          if (dummyApplyDummyText) {
            parts.push(`テキスト${result.appliedText}件`);
          }
          if (dummyApplyMaskImage) {
            parts.push(`マスク色${result.appliedMask}箇所`);
          }
          const skipHint =
            dummyApplyDummyText && result.skippedProtected > 0
              ? `（数字・記号を含む${result.skippedProtected}件はスキップ）`
              : "";
          showStatus(
            `${parts.join("と")}を適用しました${skipHint}`,
            "success",
          );
        } else {
          showStatus(result.errorMessage ?? "適用に失敗しました", "error");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "不明なエラー";
        showStatus(`エラー: ${errorMessage}`, "error");
      } finally {
        setApplyButtonLoading(false);
      }
      return;
    }

    /** Top タブ用 */
    if (selectedImageIndices.size === 0) {
      showStatus("フレームに入れる画像を選択してください", "error");
      setApplyButtonLoading(false);
      return;
    }
    const orderedIndices = selectedImageOrder.filter((i) =>
      selectedImageIndices.has(i),
    );
    const seen = new Set(orderedIndices);
    for (const i of Array.from(selectedImageIndices).sort((a, b) => a - b)) {
      if (!seen.has(i)) {
        orderedIndices.push(i);
        seen.add(i);
      }
    }
    const sourceImages: ImageData[] = orderedIndices
      .map((i) => images[i])
      .filter((img): img is ImageData => img != null);

    if (sourceImages.length === 0) {
      showStatus("配置する画像がありません", "error");
      setApplyButtonLoading(false);
      return;
    }

    showStatus("画像を処理中...", "info");

    try {
      const imagesToPlace: Array<{
        imageData: Uint8Array;
        width: number;
        height: number;
      }> = [];

      const total = sourceImages.length;
      setApplyPlaceProgress({ current: 0, total });

      for (let i = 0; i < sourceImages.length; i++) {
        const img = sourceImages[i];
        showStatus(`画像を処理中... (${i + 1}/${sourceImages.length})`, "info");

        const imageData = await downloadAndConvertImage(img);
        if (imageData) {
          imagesToPlace.push({
            imageData,
            width: img.width || 200,
            height: img.height || 200,
          });
        }
        setApplyPlaceProgress({ current: i + 1, total });
      }

      if (imagesToPlace.length > 0) {
        emit("PLACE_IMAGES_IN_FRAME", {
          images: imagesToPlace,
          matchAspectRatio: matchAspectRatioForFrame,
        });
        showStatus(
          `${imagesToPlace.length}個の画像をフレーム内に配置しました`,
          "success",
        );
      } else {
        showStatus("配置できる画像がありませんでした", "error");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      showStatus(`エラー: ${errorMessage}`, "error");
    } finally {
      setApplyButtonLoading(false);
      setApplyPlaceProgress(null);
    }
  };

  // 画像をダウンロードして変換
  const downloadAndConvertImage = async (
    image: ImageData,
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
    type: "info" | "success" | "error" = "info",
  ) => {
    setStatus(message);
    setStatusType(type);
  };

  // サービスを削除
  const handleDeleteService = (serviceName: string) => {
    const filteredImages = images.filter(
      (img) => (img.service || "Unknown") !== serviceName,
    );
    const filteredDisplayImages = displayImages.filter(
      (img) => (img.service || "Unknown") !== serviceName,
    );
    const deletedCount = images.length - filteredImages.length;

    if (deletedCount > 0) {
      setImages(filteredImages);
      setDisplayImages(filteredDisplayImages);
      emit("SAVE_IMAGES", filteredImages);
      showStatus(
        `${serviceName}の${deletedCount}個の画像を削除しました`,
        "success",
      );
    } else {
      showStatus("削除する画像が見つかりませんでした", "error");
    }
  };

  const tabOptions = [
    {
      text: "Top",
      value: "Top",
    },
    {
      text: "Dummy",
      value: "Dummy",
    },
  ];
  const TAB_PILL_SEGMENT_PX = 63;
  const tabPillPaddingPx = 4;
  const activeTabIndex = Math.max(
    0,
    tabOptions.findIndex((o) => o.value === tabValue),
  );

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
        "error",
      );
    }
  }

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  function handleClick(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.checked;
    setIsOpen(newValue);
  }

  // 外側クリックで設定メニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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
    new Set(["__ALL__"]),
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
    _withoutDueDate: boolean,
  ) => {};
  const handleLabelFilterChange = (_label: string) => {};

  // 画像サイズ + 検索文字列でフィルターするロジック
  const imagesToDisplay = (() => {
    let list: ImageData[];

    // 「すべて」が選択されている場合はすべて表示
    if (selectedImageSizes.has("__ALL__")) {
      list = displayImages;
    } else {
      // 選択されたサイズの画像のみ表示
      list = displayImages.filter((img) => {
        const width = img.width || 0;
        const height = img.height || 0;
        if (width === 0 || height === 0) return false;
        const sizeStr = `${width}×${height}`;
        return selectedImageSizes.has(sizeStr);
      });
    }

    const q = searchValue.trim().toLowerCase();
    if (!q) return list;

    return list.filter((img) => {
      const alt = (img.alt || "").toLowerCase();
      const src = (img.src || "").toLowerCase();
      const service = (img.service || "").toLowerCase();
      const sizeStr = `${img.width || 0}×${img.height || 0}`.toLowerCase();
      return (
        alt.includes(q) ||
        src.includes(q) ||
        service.includes(q) ||
        sizeStr.includes(q)
      );
    });
  })();

  useEffect(() => {
    const hasWideLayout = displayImages.length > 0 || tabValue === "Dummy";
    emit("RESIZE_UI", {
      width: tabValue === "Dummy" ? 350 : hasWideLayout ? 500 : 350,
      // width: tabValue === "Dummy" ? 350 : hasWideLayout ? 500 : 500,
      height: tabValue === "Dummy" ? 400 : hasWideLayout ? 820 : 200,
    });
  }, [imagesToDisplay.length, tabValue]);

  useEffect(() => {
    emit("selectionchange", { dummyApplyDummyText });
    console.log("dummyApplyDummyText", dummyApplyDummyText);
    console.log("dummyApplyMaskImage", dummyApplyMaskImage);
  }, [dummyApplyDummyText, dummyApplyMaskImage]);

  const areAllDisplayImagesSelected: boolean =
    imagesToDisplay.length > 0 &&
    imagesToDisplay.every((displayImg) => {
      const globalIndex = images.findIndex((img) => {
        if (img.id && displayImg.id && img.id === displayImg.id) return true;
        if (img.src && displayImg.src && img.src === displayImg.src)
          return true;
        return false;
      });
      return globalIndex !== -1 && selectedImageIndices.has(globalIndex);
    });

  const hasSomeDisplayImagesSelected: boolean =
    imagesToDisplay.length > 0 &&
    imagesToDisplay.some((displayImg) => {
      const globalIndex = images.findIndex((img) => {
        if (img.id && displayImg.id && img.id === displayImg.id) return true;
        if (img.src && displayImg.src && img.src === displayImg.src)
          return true;
        return false;
      });
      return globalIndex !== -1 && selectedImageIndices.has(globalIndex);
    });

  const selectAllCheckboxValue: boolean | typeof MIXED_BOOLEAN =
    imagesToDisplay.length === 0
      ? false
      : areAllDisplayImagesSelected
        ? true
        : hasSomeDisplayImagesSelected
          ? MIXED_BOOLEAN
          : false;

  const deselectAllDisplayedImages = () => {
    const indicesToRemove = new Set<number>();
    imagesToDisplay.forEach((displayImg) => {
      const globalIndex = images.findIndex((img) => {
        if (img.id && displayImg.id && img.id === displayImg.id) return true;
        if (img.src && displayImg.src && img.src === displayImg.src)
          return true;
        return false;
      });
      if (globalIndex !== -1) indicesToRemove.add(globalIndex);
    });

    setSelectedImageIndices((prev) => {
      const next = new Set(prev);
      indicesToRemove.forEach((i) => next.delete(i));
      return next;
    });
    setSelectedImageOrder((prevOrder) =>
      prevOrder.filter((idx) => !indicesToRemove.has(idx)),
    );
    setNewlyAddedIndex(null);
    showStatus(
      `${indicesToRemove.size}件の画像の選択を解除しました`,
      "success",
    );
  };

  const selectAllDisplayedImages = () => {
    const newIndices = new Set(selectedImageIndices);
    const newOrder = [...selectedImageOrder];
    let addedCount = 0;

    imagesToDisplay.forEach((displayImg) => {
      const globalIndex = images.findIndex((img) => {
        if (img.id && displayImg.id && img.id === displayImg.id) return true;
        if (img.src && displayImg.src && img.src === displayImg.src)
          return true;
        return false;
      });
      if (globalIndex !== -1 && !newIndices.has(globalIndex)) {
        newIndices.add(globalIndex);
        newOrder.push(globalIndex);
        addedCount++;
      }
    });

    setSelectedImageIndices(newIndices);
    setSelectedImageOrder(newOrder);

    if (newOrder.length > 0) {
      const lastAdded = newOrder[newOrder.length - 1];
      setNewlyAddedIndex(lastAdded);
      setTimeout(() => setNewlyAddedIndex(null), 500);
    }

    showStatus(`${addedCount}件の画像を選択しました`, "success");
  };

  const handleSelectAllCheckboxValueChange = (checked: boolean) => {
    if (checked) {
      selectAllDisplayedImages();
    } else {
      deselectAllDisplayedImages();
    }
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        backgroundColor: "var(--figma-color-bg)",
        // backgroundColor: "#141414",
      }}
    >
      {/* Apply 押下〜処理完了まで */}
      {/* {
        tabValue === "Dummy" && (
          <ApplyImageLoadingModal
            visible={true}
            progress={applyPlaceProgress}
          />
        )
      } */}
      <ApplyImageLoadingModal
        visible={applyButtonLoading}
        progress={applyPlaceProgress}
      />

      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--figma-color-bg)",
              borderRadius: "8px",
              padding: "var(--space-medium)",
              minWidth: "200px",
            }}
          >
            <Loading message="Loading data..." progress={loadingProgress} />
          </div>
        </div>
      )}
      {/* カスタムステータスタブ */}
      <div
        style={{
          overflowX: "auto",
          whiteSpace: "nowrap",
          borderBottom: "1px solid var(--figma-color-border)",
          padding: "4px 8px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-4)",
            height: "40px",
            alignItems: "center",
            minWidth: "fit-content",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              position: "relative",
              backgroundColor: "var(--figma-color-bg-secondary)",
              borderRadius: "9999px",
              // border: "1px solid var(--figma-color-border)",
              padding: `${tabPillPaddingPx}px`,
              width: "fit-content",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "34px",
              boxSizing: "border-box",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: tabPillPaddingPx,
                top: "50%",
                width: TAB_PILL_SEGMENT_PX,
                height: "28px",
                boxSizing: "border-box",
                borderRadius: "9999px",
                background: "var(--figma-color-bg)",
                border: "1px solid var(--figma-color-border)",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
                transform: `translateX(${activeTabIndex * TAB_PILL_SEGMENT_PX}px) translateY(-50%)`,
                transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            {tabOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTabValue(option.value)}
                style={{
                  position: "relative",
                  zIndex: 1,
                  background: "transparent",
                  color:
                    tabValue === option.value
                      ? "var(--figma-color-text)"
                      : "var(--figma-color-text-secondary)",
                  border: "none",
                  padding: "0 var(--space-8)",
                  height: "24px",
                  fontSize: "12px",
                  fontWeight: tabValue === option.value ? "700" : "400",
                  transition: "color 0.2s ease, font-weight 0.15s ease",
                  whiteSpace: "nowrap",
                  width: `${TAB_PILL_SEGMENT_PX}px`,
                  borderRadius: "9999px",
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

          {tabValue === "Top" &&
            displayImages.length > 0 &&
            (() => {
              // ユニークなサービス名とfavicon（検索で絞り込んでも一覧は displayImages ベース）
              const uniqueServices = new Map<string, string>();
              displayImages.forEach((img) => {
                const serviceName = img.service || "Unknown";
                if (!uniqueServices.has(serviceName) && img.favicon) {
                  uniqueServices.set(serviceName, img.favicon);
                }
              });

              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  {Array.from(uniqueServices.entries()).map(
                    ([serviceName, favicon]) => (
                      <div
                        key={serviceName}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderRadius: "6px",
                          backgroundColor: "var(--figma-color-bg-secondary)",
                          padding: "4px 8px",
                          height: "34px",
                          gap: "8px",
                          border: "0.05px solid var(--figma-color-border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <ServiceLogo
                            serviceName={serviceName}
                            favicon={favicon}
                            size={20}
                          />
                          <div
                            style={{
                              fontSize: "13px",
                              color: "var(--figma-color-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "140px",
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
                              backgroundColor: "var(--figma-color-bg)",
                            }}
                          >
                            {
                              displayImages.filter(
                                (i) => (i.service || "Unknown") === serviceName,
                              ).length
                            }{" "}
                            images
                          </span>
                        </div>
                        <Button
                          danger
                          onClick={() => handleDeleteService(serviceName)}
                        >
                          Remove
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              );
            })()}
        </div>
      </div>
      {tabValue === "Top" && (
        <div>
          <div
            style={{
              padding: "var(--space-extra-small)",
              borderRight: "1px solid var(--figma-color-border)",
              position: "sticky",
              top: 0,
              alignSelf: "flex-start",
              zIndex: 99,
              background:
                displayImages.length === 0
                  ? "var(--figma-color-bg-secondary)"
                  : "var(--figma-color-bg)",
              borderBottom:
                displayImages.length > 0
                  ? "1px solid var(--figma-color-border)"
                  : ("none" as string),
            }}
          >
            {displayImages.length === 0 && (
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
            {displayImages.length > 0 &&
              (() => {
                // ユニークなサービス名とfavicon（検索で絞り込んでも一覧は displayImages ベース）
                const uniqueServices = new Map<string, string>();
                displayImages.forEach((img) => {
                  const serviceName = img.service || "Unknown";
                  if (!uniqueServices.has(serviceName) && img.favicon) {
                    uniqueServices.set(serviceName, img.favicon);
                  }
                });

                return (
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-small)",
                      justifyContent: "space-between",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                          minHeight: "32px",
                        }}
                      >
                        <Checkbox
                          value={selectAllCheckboxValue}
                          onValueChange={handleSelectAllCheckboxValueChange}
                          disabled={imagesToDisplay?.length === 0}
                        >
                          <Text>Select all images</Text>
                        </Checkbox>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <SearchTextbox
                          onInput={handleSearchInput}
                          placeholder="Search"
                          value={searchValue}
                        />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            ref={settingsMenuRef}
                            style={{
                              position: "relative",
                              display: "inline-block",
                            }}
                            onMouseEnter={() => showTooltip("filter")}
                            onMouseLeave={() => hideTooltip("filter")}
                          >
                            <IconToggleButton
                              onChange={handleClick}
                              value={isOpen}
                            >
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
                                  selectedImageSizes={Array.from(
                                    selectedImageSizes,
                                  )}
                                  showWithDueDate={showWithDueDate}
                                  showWithoutDueDate={showWithoutDueDate}
                                  availableLabels={availableLabels}
                                  selectedLabels={selectedLabels}
                                  onSortHighChange={handleSortHighChange}
                                  onSortLowChange={handleSortLowChange}
                                  onSortLabelChange={handleSortLabelChange}
                                  onImageSizeFilterChange={
                                    handleImageSizeFilterChange
                                  }
                                  onDueDateFilterChange={
                                    handleDueDateFilterChange
                                  }
                                  onLabelFilterChange={handleLabelFilterChange}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
                ref={scrollContainerRef}
                style={{
                  height: "660px",
                  overflowY: "auto",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                    gap: "8px",
                    width: "100%",
                    padding: "var(--space-extra-small)",
                  }}
                >
                  {imagesToDisplay.length === 0 && displayImages.length > 0 && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        padding: "var(--space-large)",
                        textAlign: "center",
                        color: "var(--figma-color-text-secondary)",
                        fontSize: "12px",
                      }}
                    >
                      {searchValue.trim()
                        ? "検索に一致する画像がありません"
                        : "表示する画像がありません"}
                    </div>
                  )}
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
                        onClick={() => handleSelectImage(index, true, img)}
                        onDragStart={async (image) => {
                          // ドラッグ開始時に画像を処理（非同期で準備）
                          console.log(
                            "Drag start, preparing image:",
                            image.src,
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
                                  image.height,
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
              <Footer
                tabValue="Top"
                matchAspectRatioForFrame={matchAspectRatioForFrame}
                setMatchAspectRatioForFrame={setMatchAspectRatioForFrame}
                selectAllCheckboxValue={selectAllCheckboxValue as boolean}
                handleSelectAllCheckboxValueChange={
                  handleSelectAllCheckboxValueChange
                }
                imagesToDisplay={imagesToDisplay}
                onApplyAll={handlePlaceAllImagesInFrame}
                applyToSelectionDisabled={selectedImageIndices.size === 0}
                applyAllDisabled={
                  displayImages.length === 0 ||
                  selectedImageIndices.size === 0 ||
                  !canvasSelection.some((n) => n.type === "FRAME")
                }
                applyAllLoading={applyButtonLoading}
                canvasSelection={canvasSelection}
              />
            </div>
          )}
        </div>
      )}

      {tabValue === "Dummy" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <Dummy
            images={randomDemoImages}
            dummyTextTemplate={dummyTextTemplate}
            onDummyTextTemplateChange={setDummyTextTemplate}
            maskColor={randomMaskColor}
            onMaskColorChange={setRandomMaskColor}
            applyDummyText={dummyApplyDummyText}
            onApplyDummyTextChange={setDummyApplyDummyText}
            applyMaskImage={dummyApplyMaskImage}
            onApplyMaskImageChange={setDummyApplyMaskImage}
            onShuffle={() => setRandomDemoSeed((s) => s + 1)}
            selectedIndices={selectedRandomIndices}
            onToggleSelect={toggleRandomImageSelect}
            onDragPrepare={async (image) => {
              const imageData = await downloadAndConvertImage(image);
              if (imageData) {
                window.draggedImageData = {
                  imageData,
                  width: image.width,
                  height: image.height,
                };
              }
            }}
          />
          <Footer
            tabValue="Dummy"
            matchAspectRatioForFrame={matchAspectRatioForFrame}
            setMatchAspectRatioForFrame={setMatchAspectRatioForFrame}
            selectAllCheckboxValue={selectAllCheckboxValue as boolean}
            handleSelectAllCheckboxValueChange={
              handleSelectAllCheckboxValueChange
            }
            imagesToDisplay={randomDemoImages}
            // onApplyToSelection={handleApplyImage}
            onApplyAll={handlePlaceAllImagesInFrame}
            applyToSelectionDisabled={selectedRandomIndices.size === 0}
            applyAllDisabled={
              !canvasSelection.some((n) => n.type === "FRAME") ||
              (!dummyApplyDummyText && !dummyApplyMaskImage)
            }
            applyAllLoading={applyButtonLoading}
            canvasSelection={canvasSelection}
          />
        </div>
      )}
    </div>
  );
}

export default render(Plugin);
