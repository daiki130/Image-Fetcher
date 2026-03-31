import { Button, Text } from "@create-figma-plugin/ui";
import { h } from "preact";
import { useMemo, useState } from "preact/hooks";
import { ImageData } from "../types";
import { buildRandomDemoImages } from "../randomDemoMode";
import { Card } from "./card";

export function Random() {
  const [randomDemoSeed, setRandomDemoSeed] = useState(1);
  const [, setStatus] = useState("");
  const randomDemoImages = useMemo(
    () => buildRandomDemoImages(randomDemoSeed, 5),
    [randomDemoSeed],
  );

  const showStatus = (
    message: string,
    _type: "info" | "success" | "error" = "info",
  ) => {
    setStatus(message);
  };

  const convertWebPToPNG = async (blob: Blob): Promise<Uint8Array | null> => {
    try {
      const imageUrl = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      ctx.drawImage(img, 0, 0);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error("Failed to convert to PNG"));
          }
        }, "image/png");
      });

      const pngArrayBuffer = await pngBlob.arrayBuffer();
      const pngUint8Array = new Uint8Array(pngArrayBuffer);
      URL.revokeObjectURL(imageUrl);
      return pngUint8Array;
    } catch (error) {
      console.error("Conversion error:", error);
      return null;
    }
  };

  const downloadAndConvertImage = async (
    image: ImageData,
  ): Promise<Uint8Array | null> => {
    try {
      let blob: Blob;

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
        showStatus("画像をダウンロード中...", "info");
        const response = await fetch(image.src);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        blob = await response.blob();
      }

      if (
        image.src.toLowerCase().includes(".webp") ||
        blob.type === "image/webp"
      ) {
        showStatus("WebPをPNGに変換中...", "info");
        return await convertWebPToPNG(blob);
      }

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

  return (
    <div style={{ marginBottom: "12px", padding: "0 var(--space-extra-small)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <Text>サンプル画像（Unsplash）</Text>
        <Button secondary onClick={() => setRandomDemoSeed((s) => s + 1)}>
          別の画像
        </Button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "8px",
          width: "100%",
        }}
      >
        {randomDemoImages.map((img, sampleIdx) => (
          <Card
            key={img.id ?? `sample-${sampleIdx}`}
            image={img}
            isSelected={false}
            hideOnImageError
            onClick={() => {}}
            onDragStart={async (image) => {
              downloadAndConvertImage(image)
                .then((imageData) => {
                  if (imageData) {
                    window.draggedImageData = {
                      imageData,
                      width: image.width,
                      height: image.height,
                    };
                  }
                })
                .catch((error) => {
                  console.error("Error converting image:", error);
                });
            }}
          />
        ))}
      </div>
    </div>
  );
}
