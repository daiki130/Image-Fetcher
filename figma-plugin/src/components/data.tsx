import { Button, Text, IconButton, IconTrash24 } from "@create-figma-plugin/ui";
import { emit } from "@create-figma-plugin/utilities";
import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { ImageData } from "../types";
import "../styles.css";

interface DataProps {
  images: ImageData[];
  onDeleteService: (service: string) => void;
}

export const Data = ({ images, onDeleteService }: DataProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">(
    "info"
  );
  const [modalService, setModalService] = useState<string | null>(null); // モーダルで表示するサービス名

  const [mouseEnterServices, setMouseEnterServices] = useState<
    Record<string, boolean>
  >({});

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

  // 画像選択
  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index);
  };

  // ステータス表示
  const showStatus = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setStatus(message);
    setStatusType(type);
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

  const handleDeleteService = (service: string) => {
    onDeleteService(service);
  };

  return (
    <>
      <div>
        {images.length > 0 && (
          <>
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
                  // サービス内の最初の画像からfaviconを取得（存在する場合）
                  const favicon = serviceImages.find(
                    (img) => img.favicon
                  )?.favicon;
                  return {
                    service,
                    images: serviceImages,
                    latestDate: latestDate || "1970-01-01T00:00:00.000Z", // デフォルト値を固定値に
                    count: serviceImages.length,
                    favicon: favicon,
                  };
                }
              );

              // 最新の追加日時でソート（新しい配列を作成してソート）
              const sortedServiceList = [...serviceList].sort(
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
                  }}
                >
                  {sortedServiceList.map(
                    ({
                      service,
                      images: serviceImages,
                      latestDate,
                      count,
                      favicon,
                    }) => (
                      <div
                        key={service}
                        onClick={() => setModalService(service)}
                        style={{
                          padding: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "row",
                          transition: "background 0.2s",
                          height: "48px",
                        }}
                        onMouseEnter={(e: MouseEvent) => {
                          setMouseEnterServices((prev) => ({
                            ...prev,
                            [service]: true,
                          }));
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--figma-color-bg-hover)";
                        }}
                        onMouseLeave={(e: MouseEvent) => {
                          setMouseEnterServices((prev) => ({
                            ...prev,
                            [service]: false,
                          }));
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: "8px",
                            flex: 1,
                          }}
                        >
                          <ServiceLogo
                            serviceName={service}
                            size={20}
                            favicon={favicon}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: "600",
                              }}
                            >
                              {service}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#666",
                              padding: "0px 4px",
                              borderRadius: "4px",
                              border: "1px solid var(--figma-color-border)",
                            }}
                          >
                            {count}
                          </div>
                        </div>
                        {mouseEnterServices[service] && (
                          <IconButton
                            onClick={(e: MouseEvent) => {
                              e.stopPropagation();
                              handleDeleteService(service);
                            }}
                            onMouseEnter={(e: MouseEvent) => {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background =
                                "var(--figma-color-bg-disabled)";
                            }}
                            onMouseLeave={(e: MouseEvent) => {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = "transparent";
                            }}
                          >
                            <IconTrash24 />
                          </IconButton>
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

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
              background: "var(--figma-color-bg)",
              boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
              maxHeight: "60vh",
              display: "flex",
              flexDirection: "column",
              zIndex: 1000,
              borderRadius:
                "var(--border-radius-12) var(--border-radius-12) 0 0",
            }}
          >
            <div
              style={{
                padding: "12px",
                borderBottom: "1px solid var(--figma-color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {modalService &&
                  (() => {
                    // モーダル内の画像からfaviconを取得
                    const modalImages = images.filter(
                      (img) => (img.service || "Unknown") === modalService
                    );
                    const modalFavicon = modalImages.find(
                      (img) => img.favicon
                    )?.favicon;
                    return (
                      <ServiceLogo
                        serviceName={modalService}
                        size={20}
                        favicon={modalFavicon}
                      />
                    );
                  })()}
                <Text>
                  <strong>{modalService || ""}</strong>
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
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderBottom: "1px solid var(--figma-color-border)",
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
                        onMouseEnter={(e: MouseEvent) => {
                          if (selectedImageIndex !== img.originalIndex) {
                            (e.currentTarget as HTMLElement).style.background =
                              "var(--figma-color-bg-hover)";
                          }
                        }}
                        onMouseLeave={(e: MouseEvent) => {
                          if (selectedImageIndex !== img.originalIndex) {
                            (e.currentTarget as HTMLElement).style.background =
                              "transparent";
                          }
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
                          onError={(e: Event) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
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
                borderTop: "1px solid var(--figma-color-border)",
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
    </>
  );
};
