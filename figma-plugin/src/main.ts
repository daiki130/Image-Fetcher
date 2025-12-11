// Figma Plugin Main Code
import { showUI, on, emit } from "@create-figma-plugin/utilities";
import { ImageData } from "./types";

const STORAGE_KEY = "savedImages";

export default function () {
  // UIから変換済み画像を受け取る
  on(
    "APPLY_IMAGE_DATA",
    async (data: {
      imageData: Uint8Array;
      isNewRect?: boolean;
      width?: number;
      height?: number;
    }) => {
      if (data.isNewRect && data.width && data.height) {
        await createRectangleWithImageData(
          data.imageData,
          data.width,
          data.height
        );
      } else {
        await applyImageDataToSelection(data.imageData);
      }
    }
  );

  // UIから画像データを保存するリクエストを受け取る
  on("SAVE_IMAGES", async (images: ImageData[]) => {
    try {
      // base64データを除外して保存（サイズ制限を回避）
      const imagesToSave = images.map(({ base64, ...rest }) => rest);
      await figma.clientStorage.setAsync(STORAGE_KEY, imagesToSave);
      figma.notify(`${images.length}個の画像を保存しました`);
    } catch (error) {
      console.error("保存エラー:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      figma.notify(`保存エラー: ${errorMessage}`, { error: true });
    }
  });

  // UIから画像データを読み込むリクエストを受け取る
  on("LOAD_IMAGES", async () => {
    try {
      const images = (await figma.clientStorage.getAsync(STORAGE_KEY)) as
        | ImageData[]
        | undefined;
      if (images && Array.isArray(images) && images.length > 0) {
        emit("IMAGES_LOADED", images);
      } else {
        emit("IMAGES_LOADED", []);
      }
    } catch (error) {
      console.error("読み込みエラー:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      figma.notify(`読み込みエラー: ${errorMessage}`, { error: true });
      emit("IMAGES_LOADED", []);
    }
  });

  // UIから既存の保存データを取得するリクエストを受け取る
  on("GET_SAVED_IMAGES", async () => {
    try {
      const images = (await figma.clientStorage.getAsync(STORAGE_KEY)) as
        | ImageData[]
        | undefined;
      if (images && Array.isArray(images)) {
        emit("SAVED_IMAGES_RETRIEVED", images);
      } else {
        emit("SAVED_IMAGES_RETRIEVED", []);
      }
    } catch (error) {
      console.error("取得エラー:", error);
      emit("SAVED_IMAGES_RETRIEVED", []);
    }
  });

  showUI({ width: 320, height: 600 });
}

// 選択ノードに画像データを適用
async function applyImageDataToSelection(imageData: Uint8Array) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("ノードを選択してください", { error: true });
    return;
  }

  try {
    let appliedCount = 0;

    for (const node of selection) {
      if ("fills" in node && node.fills !== figma.mixed) {
        const imageHash = figma.createImage(imageData).hash;

        node.fills = [
          {
            type: "IMAGE",
            imageHash: imageHash,
            scaleMode: "FILL",
          },
        ];

        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      figma.notify(`${appliedCount}個のノードに画像を適用しました`);
    } else {
      figma.notify("画像を適用できるノードがありませんでした", { error: true });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    figma.notify(`エラー: ${errorMessage}`, { error: true });
  }
}

// 新規レクタングルを作成して画像データを適用
async function createRectangleWithImageData(
  imageData: Uint8Array,
  width: number,
  height: number
) {
  try {
    const rect = figma.createRectangle();

    // サイズを調整
    const maxSize = 1000;
    let finalWidth = width;
    let finalHeight = height;

    if (width > maxSize || height > maxSize) {
      const ratio = width / height;
      if (width > height) {
        finalWidth = maxSize;
        finalHeight = maxSize / ratio;
      } else {
        finalHeight = maxSize;
        finalWidth = maxSize * ratio;
      }
    }

    rect.resize(finalWidth, finalHeight);

    // 画像を適用
    const imageHash = figma.createImage(imageData).hash;
    rect.fills = [
      {
        type: "IMAGE",
        imageHash: imageHash,
        scaleMode: "FILL",
      },
    ];

    // ビューポートの中心に配置
    rect.x = figma.viewport.center.x - finalWidth / 2;
    rect.y = figma.viewport.center.y - finalHeight / 2;

    figma.currentPage.selection = [rect];
    figma.viewport.scrollAndZoomIntoView([rect]);

    figma.notify("画像を配置しました");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    figma.notify(`エラー: ${errorMessage}`, { error: true });
  }
}
