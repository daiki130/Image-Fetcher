import { ImageData } from "./types";

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
