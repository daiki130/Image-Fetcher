import { ImageData } from "./types";

/**
 * 全体が数値のみで構成されるテキストはダミーにしない。
 * 例: "3.7" / "100" / "1,000" / "2026" / "50%" / "-3.14" / "3.7.1"(版数)
 * 文章中に数字が含まれるだけ（例: "2026年", "バージョン 3.7"）は置換対象にする。
 * 先頭・末尾の半角/全角スペースは許容する。
 */
const NUMERIC_ONLY_PATTERN =
  /^[\s\u3000]*[-−+]?[0-9０-９]+([.．,，][0-9０-９]+)*[%％]?[\s\u3000]*$/;

/**
 * 箇条書き・注釈・装飾記号で「始まる」テキストはダミーにしない。
 * 言葉の中にある中黒（例: "ジャン・ポール"）などは置換したいので先頭限定にしている。
 * 先頭の半角スペース・全角スペース・タブは許容して判定する。
 * - ・ · • ‧ ･ … ‥ ․ などの中点・省略記号
 * - ※ ★ ☆ ○ ● ■ □ などよく使う UI 記号
 */
const STARTS_WITH_SYMBOL_PATTERN =
  /^[\s\u3000]*[\u30FB\u00B7\u2022\u2027\uFF65\u2024\u2025\u2026\u203B\u2605\u2606\u25A0\u25A1\u25CB\u25CF]/;

/** 原文が「全体が数値のみ」または「記号で始まる」場合は true（ダミー置換しない） */
export function shouldSkipDummyReplacement(
  text: string | undefined | null,
): boolean {
  if (text == null || typeof text !== "string") {
    return false;
  }
  return (
    NUMERIC_ONLY_PATTERN.test(text) || STARTS_WITH_SYMBOL_PATTERN.test(text)
  );
}

const DEFAULT_DUMMY_TEMPLATE = "テキスト";

/**
 * 原文をダミーに置き換える文字列を決める。
 * - 数字や記号を含む原文は置換しない（null）。
 * - 空の template は「テキスト」を使う。
 */
export function resolveDummyText(
  original: string | undefined | null,
  template: string | undefined | null,
): string | null {
  if (shouldSkipDummyReplacement(original)) {
    return null;
  }
  const t = String(template ?? "").trim();
  return t.length > 0 ? t : DEFAULT_DUMMY_TEMPLATE;
}

/**
 * Unsplash の静的 CDN 用スラッグ（images.unsplash.com のみ使用）。
 * シードで開始位置をずらし、指定枚数のサンプルグリッドを生成する。
 */
const UNSPLASH_DEMO_SLUGS: ReadonlyArray<{
  slug: string;
  width: number;
  height: number;
}> = [
  { slug: "photo-1470071459604-3b5ec3a7fe05", width: 1920, height: 1080 },
  { slug: "photo-1506905925346-21bda4d32df4", width: 1600, height: 1067 },
  { slug: "photo-1469474968028-56623f02e42e", width: 1920, height: 1280 },
  { slug: "photo-1441974231531-c6227db76b6e", width: 1920, height: 1280 },
  { slug: "photo-1472214103451-9374bd1c798e", width: 1920, height: 1280 },
  { slug: "photo-1501854140801-50d01698950b", width: 1920, height: 1080 },
  { slug: "photo-1518837695005-2083093ee35b", width: 1920, height: 1080 },
  { slug: "photo-1433086966358-54859d0ed716", width: 1920, height: 1280 },
  { slug: "photo-1501785888041-af3ef285b470", width: 1920, height: 1080 },
  { slug: "photo-1447752875215-b2761acb3c5d", width: 1920, height: 1280 },
  { slug: "photo-1511593358241-7eea1f3c84e5", width: 1920, height: 1280 },
  { slug: "photo-1493246507139-91e8fad9978e", width: 1920, height: 1080 },
  { slug: "photo-1475924156734-496f6cac6e1b", width: 1920, height: 1080 },
  { slug: "photo-1500530855697-b586d89ba3ee", width: 1920, height: 1280 },
  { slug: "photo-1511884642898-4c92249e20b6", width: 1920, height: 1280 },
  { slug: "photo-1523712999610-f77fbcfc3843", width: 1920, height: 1280 },
  { slug: "photo-1507525428034-b723cf961d3e", width: 1920, height: 1280 },
  { slug: "photo-1519681393784-d120267933ba", width: 1920, height: 1280 },
];

export function buildRandomDemoImages(
  seed: number,
  count: number = 12,
): ImageData[] {
  const n = Math.max(1, Math.floor(count));
  const base = Math.max(0, Math.floor(seed)) % UNSPLASH_DEMO_SLUGS.length;
  const out: ImageData[] = [];
  for (let i = 0; i < n; i++) {
    const p = UNSPLASH_DEMO_SLUGS[(base + i) % UNSPLASH_DEMO_SLUGS.length];
    out.push({
      id: `unsplash-demo-${seed}-${i}`,
      src: `https://images.unsplash.com/${p.slug}?auto=format&fit=crop&w=400&q=80`,
      alt: `Unsplash sample ${i + 1}`,
      width: p.width,
      height: p.height,
      service: "Unsplash",
    });
  }
  return out;
}
