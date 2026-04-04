// Figma Plugin Main Code
import { showUI, on, emit } from "@create-figma-plugin/utilities";
import { ImageData } from "./types";
import { resolveDummyText } from "./randomDemoMode";

const STORAGE_KEY = "savedImages";

// UIサイズ管理用の変数
let currentUIWidth = 400;
let currentUIHeight = 1000;
let isAnimating = false;

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
          data.height,
        );
      } else {
        await applyImageDataToSelection(data.imageData);
      }
    },
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
    },
  );

  on(
    "PLACE_RANDOM_CONTENT_IN_FRAME",
    async (data: {
      images: Array<{ imageData: Uint8Array; width: number; height: number }>;
      seed: number;
      dummyTextTemplate: string;
    }) => {
      await placeRandomContentInFrame(
        data.images,
        data.seed,
        data.dummyTextTemplate,
      );
    },
  );

  on(
    "APPLY_DUMMY_TEXT_TO_SELECTION",
    async (data: { dummyTextTemplate: string }) => {
      await applyDummyTextToSelection(data.dummyTextTemplate);
    },
  );

  // ドラッグ&ドロップで画像を追加するリクエストを受け取る
  on(
    "DROP_IMAGE",
    async (data: { imageData: Uint8Array; width: number; height: number }) => {
      console.log("DROP_IMAGE received:", data.width, "x", data.height);
      try {
        await createRectangleWithImageData(
          data.imageData,
          data.width,
          data.height,
        );
        console.log("Image added to Figma successfully");
      } catch (error) {
        console.error("Error adding image to Figma:", error);
        const errorMessage =
          error instanceof Error ? error.message : "不明なエラー";
        figma.notify(`エラー: ${errorMessage}`, { error: true });
      }
    },
  );

  // UIからリサイズリクエストを受け取る（滑らかなアニメーション付き）
  on("RESIZE_UI", (data: { width: number; height: number }) => {
    const targetWidth = data.width;
    const targetHeight = data.height;

    // 既にアニメーション中の場合はスキップ（連続クリックを防ぐ）
    if (isAnimating) {
      return;
    }

    // 既に目標サイズと同じ場合は何もしない
    if (currentUIWidth === targetWidth && currentUIHeight === targetHeight) {
      return;
    }

    // アニメーション用のステップ数と間隔
    const steps = 10;
    const duration = 400; // ミリ秒
    const stepInterval = duration / steps;
    const widthStep = (targetWidth - currentUIWidth) / steps;
    const heightStep = (targetHeight - currentUIHeight) / steps;

    isAnimating = true;
    let step = 0;
    const animate = () => {
      if (step < steps) {
        currentUIWidth += widthStep;
        currentUIHeight += heightStep;
        figma.ui.resize(
          Math.round(currentUIWidth),
          Math.round(currentUIHeight),
        );
        step++;
        setTimeout(animate, stepInterval);
      } else {
        // 最終的に正確なサイズに設定
        currentUIWidth = targetWidth;
        currentUIHeight = targetHeight;
        figma.ui.resize(targetWidth, targetHeight);
        isAnimating = false;
      }
    };

    animate();
  });

  showUI({ width: 400, height: 500 });
}

async function loadFontsForTextNode(node: TextNode): Promise<void> {
  const len = node.characters.length;
  if (len === 0) {
    if (node.fontName !== figma.mixed) {
      await figma.loadFontAsync(node.fontName as FontName);
    }
    return;
  }
  if (node.fontName === figma.mixed) {
    for (let i = 0; i < len; i++) {
      const fn = node.getRangeFontName(i, i + 1);
      if (fn !== figma.mixed) {
        await figma.loadFontAsync(fn as FontName);
      }
    }
  } else {
    await figma.loadFontAsync(node.fontName as FontName);
  }
}

/** 選択中の Text ノードの文字をダミーに置き換える（数字・記号を含む原文はスキップ） */
async function applyDummyTextToSelection(dummyTextTemplate: string) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify("ノードを選択してください", { error: true });
    return;
  }

  let replaced = 0;
  let skippedProtected = 0;

  for (let i = 0; i < selection.length; i++) {
    const node = selection[i];
    if (node.type !== "TEXT") {
      continue;
    }
    const textNode = node as TextNode;
    const original = textNode.characters;
    const next = resolveDummyText(original, dummyTextTemplate);
    if (next === null) {
      skippedProtected++;
      continue;
    }
    try {
      await loadFontsForTextNode(textNode);
      textNode.characters = next;
      replaced++;
    } catch (e) {
      console.error("Dummy text apply failed:", e);
    }
  }

  if (replaced > 0) {
    figma.notify(`${replaced}件のテキストをダミーに置き換えました`);
  } else if (skippedProtected > 0) {
    figma.notify(
      "数字や記号を含むテキストは置換しませんでした（該当しないテキストを選択してください）",
      { error: true },
    );
  } else {
    figma.notify("テキストレイヤーが選択されていません", { error: true });
  }
}

function collectTextNodesInSubtree(root: SceneNode): TextNode[] {
  const out: TextNode[] = [];
  function visit(n: SceneNode) {
    if (n.type === "TEXT") {
      out.push(n as TextNode);
    }
    if ("children" in n) {
      for (const child of n.children) {
        visit(child);
      }
    }
  }
  visit(root);
  return out;
}

/** フレーム配下のすべてのテキストをダミーに置換（数字・記号を含む原文はスキップ） */
async function applyDummyTextToFrameSubtree(
  frame: FrameNode,
  dummyTextTemplate: string,
): Promise<{ replaced: number; skippedProtected: number }> {
  const texts = collectTextNodesInSubtree(frame);
  let replaced = 0;
  let skippedProtected = 0;
  for (let i = 0; i < texts.length; i++) {
    const textNode = texts[i];
    const original = textNode.characters;
    const next = resolveDummyText(original, dummyTextTemplate);
    if (next === null) {
      skippedProtected++;
      continue;
    }
    try {
      await loadFontsForTextNode(textNode);
      textNode.characters = next;
      replaced++;
    } catch (e) {
      console.error("Dummy text apply failed:", e);
    }
  }
  return { replaced, skippedProtected };
}

/**
 * Random タブ用: フレーム内テキストをダミーにしたうえで、サンプル画像をプレースホルダーへ配置
 */
async function placeRandomContentInFrame(
  images: Array<{ imageData: Uint8Array; width: number; height: number }>,
  _seed: number,
  dummyTextTemplate: string,
) {
  const selection = figma.currentPage.selection;
  let targetFrame: FrameNode | null = null;
  for (const node of selection) {
    if (node.type === "FRAME") {
      targetFrame = node;
      break;
    }
  }
  if (!targetFrame) {
    figma.notify("フレームを選択してください", { error: true });
    return;
  }

  const { replaced: textCount, skippedProtected } =
    await applyDummyTextToFrameSubtree(targetFrame, dummyTextTemplate);
  const imageResult = await placeImagesInFrame(images, {
    silent: true,
    sequentialImgPlaceholders: true,
  });

  if (imageResult.errorMessage) {
    figma.notify(
      textCount > 0
        ? `テキスト${textCount}件をダミーにしました。画像は適用できませんでした（${imageResult.errorMessage}）`
        : imageResult.errorMessage,
      { error: true },
    );
    return;
  }

  const skipHint =
    skippedProtected > 0
      ? `（数字・記号を含む${skippedProtected}件のテキストはスキップ）`
      : "";
  figma.notify(
    `テキスト${textCount}件をダミーにし、画像を${imageResult.appliedCount}箇所に適用しました${skipHint}`,
  );
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
  height: number,
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
  }>,
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
        imageAspectRatio - placeholderAspectRatio,
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
              (fill) => fill.type === "IMAGE" && fill.imageHash !== figma.mixed,
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

type PlaceImagesResult = {
  appliedCount: number;
  errorMessage?: string;
};

// フレーム内に画像を自動配置する関数
async function placeImagesInFrame(
  images: Array<{ imageData: Uint8Array; width: number; height: number }>,
  opts?: { silent?: boolean; sequentialImgPlaceholders?: boolean },
): Promise<PlaceImagesResult> {
  const silent = opts?.silent === true;
  const sequential = opts?.sequentialImgPlaceholders === true;
  const notify = (msg: string, isError?: boolean) => {
    if (silent && !isError) {
      return;
    }
    figma.notify(msg, isError ? { error: true } : undefined);
  };

  const selection = figma.currentPage.selection;

  let targetFrame: FrameNode | null = null;
  for (const node of selection) {
    if (node.type === "FRAME") {
      targetFrame = node;
      break;
    }
  }

  if (!targetFrame) {
    notify("フレームを選択してください", true);
    return { appliedCount: 0, errorMessage: "フレームを選択してください" };
  }

  try {
    const placeholders = findImagePlaceholders(targetFrame);

    if (placeholders.length === 0) {
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

      if (existingImageNodes.length > 0) {
        if (images.length === 0) {
          notify("画像データがありません", true);
          return { appliedCount: 0, errorMessage: "画像データがありません" };
        }
        let appliedCount = 0;
        if (sequential) {
          const imageHash = figma.createImage(images[0].imageData).hash;
          for (const node of existingImageNodes) {
            if ("fills" in node && node.fills !== figma.mixed) {
              node.fills = [
                {
                  type: "IMAGE",
                  imageHash,
                  scaleMode: "FILL",
                },
              ];
              appliedCount++;
            }
          }
        } else {
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
                  scaleMode: "FILL",
                },
              ];
              appliedCount++;
            }
          }
        }
        notify(`${appliedCount}個の既存ノードに画像を適用しました`);
        return { appliedCount };
      }

      const errMsg =
        "画像を適用できる要素が見つかりませんでした。画像プレースホルダー（img、画像などの名前が含まれる要素）を用意してください。";
      notify(errMsg, true);
      return { appliedCount: 0, errorMessage: errMsg };
    }

    const updatedNodes: SceneNode[] = [];

    if (images.length === 0) {
      notify("画像データがありません", true);
      return { appliedCount: 0, errorMessage: "画像データがありません" };
    }

    if (sequential) {
      // Random など: 1枚の画像をすべての img 枠に繰り返し（各枠を画像の塗りで埋める＝FILL）
      const imageHash = figma.createImage(images[0].imageData).hash;
      for (const ph of placeholders) {
        if ("fills" in ph.node && ph.node.fills !== figma.mixed) {
          ph.node.fills = [
            {
              type: "IMAGE",
              imageHash,
              scaleMode: "FILL",
            },
          ];
          updatedNodes.push(ph.node);
        }
      }
    } else {
      const pairs = matchImagesToPlaceholders(images, placeholders).map(
        (p) => ({
          image: p.image,
          placeholder: p.placeholder,
        }),
      );

      for (const pair of pairs) {
        const img = pair.image;
        const placeholder = pair.placeholder;

        if (
          "fills" in placeholder.node &&
          placeholder.node.fills !== figma.mixed
        ) {
          const imageHash = figma.createImage(img.imageData).hash;
          placeholder.node.fills = [
            {
              type: "IMAGE",
              imageHash: imageHash,
              scaleMode: "FILL",
            },
          ];
          updatedNodes.push(placeholder.node);
        }
      }
    }

    if (updatedNodes.length > 0) {
      figma.currentPage.selection = updatedNodes;
      figma.viewport.scrollAndZoomIntoView(updatedNodes);
      notify(`${updatedNodes.length}個の画像を既存の要素に適用しました`);
      return { appliedCount: updatedNodes.length };
    }
    notify("画像を適用できる要素が見つかりませんでした", true);
    return {
      appliedCount: 0,
      errorMessage: "画像を適用できる要素が見つかりませんでした",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    notify(`エラー: ${errorMessage}`, true);
    return { appliedCount: 0, errorMessage: `エラー: ${errorMessage}` };
  }
}
