/**
 * 画像プレースホルダー検出に使う「レイヤー名キーワード」の共通定義。
 *
 * - main.ts: `findImagePlaceholdersIn` でレイヤー名にこれらが含まれるかを判定する。
 * - ui.tsx / ImageSettingsPicker.tsx: ユーザーがキーワード一覧を編集し、
 *   `figma.clientStorage` に保存する。
 *
 * 比較は常に lowercase で行うため、保存値も常に lowercase に正規化する。
 */

/** 初回起動 / リセット時のデフォルトキーワード（変更前の挙動と同じ5件） */
export const DEFAULT_IMAGE_NAME_KEYWORDS: ReadonlyArray<string> = [
  "img",
  "画像",
  "image",
  "picture",
  "photo",
];

/** figma.clientStorage に保存するときのキー */
export const IMAGE_NAME_KEYWORDS_STORAGE_KEY = "imageNameKeywords";

/** 入力値を比較用に正規化（trim + lowercase） */
export function normalizeImageNameKeyword(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * 配列を保存用に正規化する（空文字 / 重複を除外、入力順は維持）。
 * 不正な値（非文字列）は無視する。
 */
export function sanitizeImageNameKeywords(
  raw: ReadonlyArray<unknown>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const normalized = normalizeImageNameKeyword(item);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
