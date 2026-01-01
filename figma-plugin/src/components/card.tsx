import { h } from "preact";
import { useState } from "preact/hooks";
import { ImageData } from "../types";
import { colors } from "../colors";
import "../styles.css";

interface CardProps {
  serviceName?: string;
  logoUrl?: string;
  image?: ImageData;
  isSelected?: boolean;
  onClick?: () => void;
  onDragStart?: (image: ImageData) => void;
}

export const Card = ({
  serviceName,
  logoUrl,
  image,
  isSelected = false,
  onClick,
  onDragStart,
}: CardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent) => {
    if (!image || !onDragStart) return;

    setIsDragging(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.dropEffect = "copy";

      // 画像データをDataTransferに設定
      const imageData = {
        src: image.src,
        width: image.width,
        height: image.height,
        alt: image.alt,
        base64: image.base64,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(imageData));
      e.dataTransfer.setData("text/plain", image.src);

      // ドラッグ画像を設定（小さなサムネイル）
      if (
        e.currentTarget &&
        e.currentTarget instanceof HTMLElement &&
        e.dataTransfer
      ) {
        // 画像要素を取得
        const imgElement = e.currentTarget.querySelector("img");
        if (imgElement && imgElement.src) {
          // 小さなキャンバスを作成してドラッグ画像として使用
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const maxSize = 100; // 最大サイズ
            const aspectRatio = image.width / image.height;
            let dragWidth = maxSize;
            let dragHeight = maxSize;

            if (aspectRatio > 1) {
              dragHeight = maxSize / aspectRatio;
            } else {
              dragWidth = maxSize * aspectRatio;
            }

            canvas.width = dragWidth;
            canvas.height = dragHeight;

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              ctx.drawImage(img, 0, 0, dragWidth, dragHeight);
              if (e.dataTransfer) {
                e.dataTransfer.setDragImage(
                  canvas,
                  dragWidth / 2,
                  dragHeight / 2
                );
              }
            };
            img.onerror = () => {
              // 画像の読み込みに失敗した場合は、小さなカードのクローンを作成
              if (
                e.currentTarget &&
                e.currentTarget instanceof HTMLElement &&
                e.dataTransfer
              ) {
                const dragImage = e.currentTarget.cloneNode(
                  true
                ) as HTMLElement;
                dragImage.style.position = "absolute";
                dragImage.style.top = "-1000px";
                dragImage.style.width = "80px";
                dragImage.style.height = "80px";
                dragImage.style.transform = "scale(1)";
                dragImage.style.boxShadow = "none";
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 40, 40);
                setTimeout(() => {
                  if (document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                  }
                }, 0);
              }
            };
            img.src = imgElement.src;
          }
        } else {
          // 画像がない場合は、小さなカードのクローンを作成
          const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
          dragImage.style.position = "absolute";
          dragImage.style.top = "-1000px";
          dragImage.style.width = "80px";
          dragImage.style.height = "80px";
          dragImage.style.transform = "scale(1)";
          dragImage.style.boxShadow = "none";
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 40, 40);
          setTimeout(() => {
            if (document.body.contains(dragImage)) {
              document.body.removeChild(dragImage);
            }
          }, 0);
        }
      }
    }

    // カスタムイベントを発火
    onDragStart(image);
  };

  const handleDragEnd = (e: DragEvent) => {
    setIsDragging(false);
    // ドラッグ終了時にグローバルイベントを発火
    const dragEndEvent = new CustomEvent("dragend");
    document.dispatchEvent(dragEndEvent);
  };

  if (image) {
    // 画像カード
    return (
      <div
        draggable={true}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          borderRadius: "4px",
          overflow: "visible",
          background: isSelected
            ? colors.background.cardSelected
            : colors.background.card,
          transition: isDragging
            ? "none"
            : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isHovered ? "scale(1.3)" : "scale(1)",
          boxShadow: isDragging
            ? "0 12px 32px rgba(0, 0, 0, 0.5)"
            : isHovered
            ? colors.shadow.hover
            : colors.shadow.none,
          zIndex: isDragging ? 100 : isHovered ? 10 : 1,
          position: "relative",
          width: "100%",
          minWidth: 0,
          opacity: isDragging ? 0.8 : 1,
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "1",
            overflow: "hidden",
            background: colors.background.imagePlaceholder,
            borderRadius: "4px",
          }}
        >
          <img
            src={image.src}
            alt={image.alt || "Image"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isHovered ? "scale(1.1)" : "scale(1)",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        {isHovered && (
          <div
            style={{
              padding: "6px",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 50%, rgba(0, 0, 0, 0) 100%)",
              borderRadius: "0 0 4px 4px",
              overflow: "hidden",
              backdropFilter: "blur(4px)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "8px",
                  color: "#fff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
                title={image.alt || "No title"}
              >
                {image.alt || "No title"}
              </div>
              <div
                style={{
                  fontSize: "8px",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
              >
                {image.width} × {image.height}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // サービスロゴカード（既存の機能）
  return (
    <div className="card">
      <img src={logoUrl} alt={serviceName} />
    </div>
  );
};
