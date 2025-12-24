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

  // UIから複数画像をフレーム内に自動配置するリクエストを受け取る
  on(
    "PLACE_IMAGES_IN_FRAME",
    async (data: {
      images: Array<{ imageData: Uint8Array; width: number; height: number }>;
    }) => {
      await placeImagesInFrame(data.images);
    }
  );

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

// 画像とプレースホルダーの最適なマッチングを計算する関数
const matchImagesToPlaceholders = (
  images: Array<{ imageData: Uint8Array; width: number; height: number }>,
  placeholders: Array<{
    node: SceneNode;
    x: number;
    y: number;
    width: number;
    height: number;
  }>
): Array<{
  image: { imageData: Uint8Array; width: number; height: number };
  placeholder: {
    node: SceneNode;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score: number; // マッチングスコア（高いほど適切）
}> => {
  const pairs: Array<{
    image: { imageData: Uint8Array; width: number; height: number };
    placeholder: {
      node: SceneNode;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    score: number;
  }> = [];

  // 各画像に対して、最も適切なプレースホルダーを見つける
  const usedPlaceholders = new Set<number>();

  for (const image of images) {
    let bestMatch: {
      placeholderIndex: number;
      score: number;
    } | null = null;

    const imageAspectRatio = image.width / image.height;
    const imageArea = image.width * image.height;

    for (let i = 0; i < placeholders.length; i++) {
      if (usedPlaceholders.has(i)) continue;

      const placeholder = placeholders[i];
      const placeholderAspectRatio = placeholder.width / placeholder.height;
      const placeholderArea = placeholder.width * placeholder.height;

      // アスペクト比の差を計算
      const aspectRatioDiff = Math.abs(
        imageAspectRatio - placeholderAspectRatio
      );

      // アスペクト比の差が大きすぎる場合はスキップ（閾値: 0.3）
      // 例: 横長画像(2.0)と縦長画像(0.5)の差は1.5で、これは大きすぎる
      if (aspectRatioDiff > 0.3) {
        continue; // このマッチングは拒否
      }

      // 正方形画像（アスペクト比が0.9-1.1の範囲）と非正方形要素の組み合わせを拒否
      const imageIsSquare = imageAspectRatio >= 0.9 && imageAspectRatio <= 1.1;
      const placeholderIsSquare =
        placeholderAspectRatio >= 0.9 && placeholderAspectRatio <= 1.1;

      // 一方が正方形で、もう一方が正方形でない場合は拒否
      if (imageIsSquare !== placeholderIsSquare) {
        continue; // このマッチングは拒否
      }

      // 画像のサイズと要素のサイズの比率をチェック
      // 画像が要素より大きすぎる、または要素が画像より大きすぎる場合は拒否
      const widthRatio = image.width / placeholder.width;
      const heightRatio = image.height / placeholder.height;

      // サイズ比が0.3未満または3.0超過の場合は拒否（大きすぎる差）
      if (
        widthRatio < 0.3 ||
        widthRatio > 3.0 ||
        heightRatio < 0.3 ||
        heightRatio > 3.0
      ) {
        continue; // このマッチングは拒否
      }

      // スコア計算：
      // 1. アスペクト比の差が小さいほど良い（重み: 0.5）
      // 2. サイズの差が小さいほど良い（重み: 0.3）
      // 3. プレースホルダーが画像より大きい場合にボーナス（重み: 0.2）

      const aspectRatioScore = 1 / (1 + aspectRatioDiff * 10); // 0-1の範囲

      const areaDiff = Math.abs(imageArea - placeholderArea);
      const areaScore = 1 / (1 + areaDiff / 10000); // 0-1の範囲

      const sizeBonus =
        placeholder.width >= image.width && placeholder.height >= image.height
          ? 1.2
          : 1.0; // プレースホルダーが画像より大きい場合にボーナス

      // アスペクト比の一致度をより重視
      const score =
        aspectRatioScore * 0.5 + areaScore * 0.3 + (sizeBonus - 1) * 0.2;

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { placeholderIndex: i, score };
      }
    }

    if (bestMatch) {
      usedPlaceholders.add(bestMatch.placeholderIndex);
      pairs.push({
        image,
        placeholder: placeholders[bestMatch.placeholderIndex],
        score: bestMatch.score,
      });
    }
  }

  // スコア順にソート（高い順）
  pairs.sort((a, b) => b.score - a.score);

  return pairs;
};

// フレーム内の画像プレースホルダーを検出する関数
function findImagePlaceholders(frame: FrameNode): Array<{
  node: SceneNode;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const placeholders: Array<{
    node: SceneNode;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  function traverse(node: SceneNode) {
    // 画像プレースホルダーとして検出する条件：
    // 1. Rectangle、Frame、Component、Instanceなど
    // 2. レイヤー名に "img" または "画像" が含まれている、または既に画像が含まれている
    // 3. ある程度のサイズがある（小さすぎる要素は除外）
    if (
      node.type === "RECTANGLE" ||
      node.type === "FRAME" ||
      node.type === "COMPONENT" ||
      node.type === "INSTANCE"
    ) {
      // 型ガード: これらの型はwidthとheightを持つ
      const nodeWithSize = node as
        | RectangleNode
        | FrameNode
        | ComponentNode
        | InstanceNode;

      if (nodeWithSize.width > 50 && nodeWithSize.height > 50) {
        // レイヤー名をチェック（大文字小文字を区別しない）
        const nodeName = node.name.toLowerCase();
        const hasImageName =
          nodeName.includes("img") ||
          nodeName.includes("画像") ||
          // nodeName.includes("image") ||
          nodeName.includes("picture") ||
          nodeName.includes("photo");

        // 既に画像が含まれているかチェック
        let hasImageFill = false;
        if ("fills" in node) {
          hasImageFill =
            Array.isArray(node.fills) &&
            node.fills.some(
              (fill) => fill.type === "IMAGE" && fill.imageHash !== figma.mixed
            );
        }

        // レイヤー名に "img" または "画像" が含まれている、または既に画像が含まれている場合のみ
        if (hasImageName || hasImageFill) {
          // 画像フィルがない場合はプレースホルダーとみなす
          if (!hasImageFill) {
            placeholders.push({
              node,
              x: nodeWithSize.x,
              y: nodeWithSize.y,
              width: nodeWithSize.width,
              height: nodeWithSize.height,
            });
          } else {
            // 既に画像が含まれている場合も、置き換え可能なノードとして追加
            placeholders.push({
              node,
              x: nodeWithSize.x,
              y: nodeWithSize.y,
              width: nodeWithSize.width,
              height: nodeWithSize.height,
            });
          }
        }
      }
    }

    // 子要素を再帰的に探索
    if ("children" in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  // フレーム内のすべてのノードを探索
  for (const child of frame.children) {
    traverse(child);
  }

  // 位置でソート（上から下、左から右）
  placeholders.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 10) {
      // ほぼ同じY座標の場合はX座標で比較
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  return placeholders;
}

// フレーム内に画像を自動配置する関数
async function placeImagesInFrame(
  images: Array<{ imageData: Uint8Array; width: number; height: number }>
) {
  const selection = figma.currentPage.selection;

  // フレームが選択されているか確認
  let targetFrame: FrameNode | null = null;
  for (const node of selection) {
    if (node.type === "FRAME") {
      targetFrame = node;
      break;
    }
  }

  // フレームが選択されていない場合はエラー
  if (!targetFrame) {
    figma.notify("フレームを選択してください", { error: true });
    return;
  }

  try {
    // フレーム内の画像プレースホルダーを検出
    const placeholders = findImagePlaceholders(targetFrame);

    if (placeholders.length === 0) {
      // プレースホルダーが見つからない場合は、既存の画像ノードを探す
      const existingImageNodes: SceneNode[] = [];
      const findImageNodes = (node: SceneNode) => {
        if (
          (node.type === "RECTANGLE" ||
            node.type === "FRAME" ||
            node.type === "COMPONENT" ||
            node.type === "INSTANCE") &&
          "fills" in node &&
          Array.isArray(node.fills) &&
          node.fills.some((fill) => fill.type === "IMAGE")
        ) {
          existingImageNodes.push(node);
        }
        if ("children" in node) {
          for (const child of node.children) {
            findImageNodes(child);
          }
        }
      };
      for (const child of targetFrame.children) {
        findImageNodes(child);
      }

      // 既存の画像ノードに直接画像を適用
      if (existingImageNodes.length > 0) {
        let appliedCount = 0;
        for (
          let i = 0;
          i < Math.min(images.length, existingImageNodes.length);
          i++
        ) {
          const node = existingImageNodes[i];
          if ("fills" in node && node.fills !== figma.mixed) {
            const imageHash = figma.createImage(images[i].imageData).hash;
            node.fills = [
              {
                type: "IMAGE",
                imageHash: imageHash,
                scaleMode: "FIT",
              },
            ];
            appliedCount++;
          }
        }
        figma.notify(`${appliedCount}個の既存ノードに画像を適用しました`);
        return;
      }

      // プレースホルダーも既存の画像ノードも見つからない場合は、グリッドレイアウトで配置
      figma.notify(
        "画像プレースホルダーが見つかりません。グリッドレイアウトで配置します。",
        { timeout: 2000 }
      );
    }

    const placedRects: RectangleNode[] = [];
    const updatedNodes: SceneNode[] = [];

    // プレースホルダーが見つかった場合
    if (placeholders.length > 0) {
      // 画像とプレースホルダーの最適なマッチングを計算
      const matchedPairs = matchImagesToPlaceholders(images, placeholders);

      for (const pair of matchedPairs) {
        const img = pair.image;
        const placeholder = pair.placeholder;

        // 既存のノードに直接画像を適用
        if (
          "fills" in placeholder.node &&
          placeholder.node.fills !== figma.mixed
        ) {
          const imageHash = figma.createImage(img.imageData).hash;
          placeholder.node.fills = [
            {
              type: "IMAGE",
              imageHash: imageHash,
              scaleMode: "FIT",
            },
          ];
          updatedNodes.push(placeholder.node);
        } else {
          // ノードに画像を適用できない場合は、新しいRectangleを作成
          const rect = figma.createRectangle();
          rect.resize(placeholder.width, placeholder.height);
          rect.x = placeholder.x;
          rect.y = placeholder.y;

          const imageHash = figma.createImage(img.imageData).hash;
          rect.fills = [
            {
              type: "IMAGE",
              imageHash: imageHash,
              scaleMode: "FIT",
            },
          ];

          targetFrame.appendChild(rect);
          placedRects.push(rect);
        }
      }

      // 残りの画像がある場合は、グリッドレイアウトで配置
      if (images.length > placeholders.length) {
        const remainingImages = images.slice(placeholders.length);
        const frameWidth = targetFrame.width;
        const frameHeight = targetFrame.height;
        const padding = 20;
        const gap = 16;

        // 既存要素の位置を記録
        const occupiedAreas: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
        }> = [];

        targetFrame.children.forEach((child) => {
          occupiedAreas.push({
            x: child.x,
            y: child.y,
            width: child.width,
            height: child.height,
          });
        });

        const availableWidth = frameWidth - padding * 2;
        const availableHeight = frameHeight - padding * 2;
        const avgWidth =
          remainingImages.reduce((sum, img) => sum + img.width, 0) /
          remainingImages.length;
        const avgHeight =
          remainingImages.reduce((sum, img) => sum + img.height, 0) /
          remainingImages.length;

        const cols = Math.max(
          1,
          Math.floor((availableWidth + gap) / (avgWidth + gap))
        );
        const rows = Math.ceil(remainingImages.length / cols);
        const cellWidth = (availableWidth - gap * (cols - 1)) / cols;
        const cellHeight = (availableHeight - gap * (rows - 1)) / rows;

        for (let i = 0; i < remainingImages.length; i++) {
          const img = remainingImages[i];
          const row = Math.floor(i / cols);
          const col = i % cols;

          const aspectRatio = img.width / img.height;
          let finalWidth = cellWidth;
          let finalHeight = cellHeight;

          if (aspectRatio > 1) {
            finalHeight = cellWidth / aspectRatio;
            if (finalHeight > cellHeight) {
              finalHeight = cellHeight;
              finalWidth = cellHeight * aspectRatio;
            }
          } else {
            finalWidth = cellHeight * aspectRatio;
            if (finalWidth > cellWidth) {
              finalWidth = cellWidth;
              finalHeight = cellWidth / aspectRatio;
            }
          }

          let x =
            padding + col * (cellWidth + gap) + (cellWidth - finalWidth) / 2;
          let y =
            padding + row * (cellHeight + gap) + (cellHeight - finalHeight) / 2;

          // 衝突チェック
          let hasCollision = false;
          for (const area of occupiedAreas) {
            if (
              x < area.x + area.width &&
              x + finalWidth > area.x &&
              y < area.y + area.height &&
              y + finalHeight > area.y
            ) {
              hasCollision = true;
              break;
            }
          }

          if (hasCollision) {
            x += finalWidth + gap;
            if (x + finalWidth > frameWidth - padding) {
              x = padding;
              y += finalHeight + gap;
            }
          }

          const rect = figma.createRectangle();
          rect.resize(finalWidth, finalHeight);
          rect.x = x;
          rect.y = y;

          const imageHash = figma.createImage(img.imageData).hash;
          rect.fills = [
            {
              type: "IMAGE",
              imageHash: imageHash,
              scaleMode: "FIT",
            },
          ];

          targetFrame.appendChild(rect);
          placedRects.push(rect);
          occupiedAreas.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          });
        }
      }

      const totalPlaced = updatedNodes.length + placedRects.length;
      if (totalPlaced > 0) {
        const nodesToSelect = [...updatedNodes, ...placedRects];
        figma.currentPage.selection = nodesToSelect;
        figma.viewport.scrollAndZoomIntoView(nodesToSelect);
        figma.notify(
          `${totalPlaced}個の画像を配置しました（${updatedNodes.length}個は既存ノードに適用、${placedRects.length}個は新規作成）`
        );
      }
    } else {
      // プレースホルダーが見つからない場合のグリッドレイアウト（既存のコード）
      const frameWidth = targetFrame.width;
      const frameHeight = targetFrame.height;
      const padding = 20;
      const gap = 16;

      const existingChildren = targetFrame.children.filter(
        (child) => child.type !== "FRAME" || child !== targetFrame
      );

      const occupiedAreas: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      existingChildren.forEach((child) => {
        occupiedAreas.push({
          x: child.x,
          y: child.y,
          width: child.width,
          height: child.height,
        });
      });

      const availableWidth = frameWidth - padding * 2;
      const availableHeight = frameHeight - padding * 2;

      const avgWidth =
        images.reduce((sum, img) => sum + img.width, 0) / images.length;
      const avgHeight =
        images.reduce((sum, img) => sum + img.height, 0) / images.length;

      const cols = Math.max(
        1,
        Math.floor((availableWidth + gap) / (avgWidth + gap))
      );
      const rows = Math.ceil(images.length / cols);

      const cellWidth = (availableWidth - gap * (cols - 1)) / cols;
      const cellHeight = (availableHeight - gap * (rows - 1)) / rows;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const row = Math.floor(i / cols);
        const col = i % cols;

        const aspectRatio = img.width / img.height;
        let finalWidth = cellWidth;
        let finalHeight = cellHeight;

        if (aspectRatio > 1) {
          finalHeight = cellWidth / aspectRatio;
          if (finalHeight > cellHeight) {
            finalHeight = cellHeight;
            finalWidth = cellHeight * aspectRatio;
          }
        } else {
          finalWidth = cellHeight * aspectRatio;
          if (finalWidth > cellWidth) {
            finalWidth = cellWidth;
            finalHeight = cellWidth / aspectRatio;
          }
        }

        let x =
          padding + col * (cellWidth + gap) + (cellWidth - finalWidth) / 2;
        let y =
          padding + row * (cellHeight + gap) + (cellHeight - finalHeight) / 2;

        let hasCollision = false;
        for (const area of occupiedAreas) {
          if (
            x < area.x + area.width &&
            x + finalWidth > area.x &&
            y < area.y + area.height &&
            y + finalHeight > area.y
          ) {
            hasCollision = true;
            break;
          }
        }

        if (hasCollision) {
          x += finalWidth + gap;
          if (x + finalWidth > frameWidth - padding) {
            x = padding;
            y += finalHeight + gap;
          }
        }

        const rect = figma.createRectangle();
        rect.resize(finalWidth, finalHeight);
        rect.x = x;
        rect.y = y;

        const imageHash = figma.createImage(img.imageData).hash;
        rect.fills = [
          {
            type: "IMAGE",
            imageHash: imageHash,
            scaleMode: "FIT",
          },
        ];

        targetFrame.appendChild(rect);
        placedRects.push(rect);

        occupiedAreas.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }

      if (placedRects.length > 0) {
        figma.currentPage.selection = placedRects;
        figma.viewport.scrollAndZoomIntoView(placedRects);
        figma.notify(`${placedRects.length}個の画像をフレーム内に配置しました`);
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    figma.notify(`エラー: ${errorMessage}`, { error: true });
  }
}
