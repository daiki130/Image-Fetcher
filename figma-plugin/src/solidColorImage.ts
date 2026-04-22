/**
 * 指定色の 1x1 PNG バイト列を生成するユーティリティ。
 * Figma の図形にマスク色の「画像」を差し込むために使う。
 * 外部ライブラリを使わず、PNG の最小構成（IHDR + IDAT + IEND）を手書きする。
 */

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function u32BE(n: number): Uint8Array {
  return new Uint8Array([
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  ]);
  const typeAndData = new Uint8Array(typeBytes.length + data.length);
  typeAndData.set(typeBytes, 0);
  typeAndData.set(data, typeBytes.length);
  const crc = crc32(typeAndData);
  const out = new Uint8Array(4 + typeAndData.length + 4);
  out.set(u32BE(data.length), 0);
  out.set(typeAndData, 4);
  out.set(u32BE(crc), 4 + typeAndData.length);
  return out;
}

/**
 * 1x1 の単色 RGB PNG を生成する。
 * r, g, b は 0〜1 の値（Figma の RGB と同じ）。
 */
export function createSolidColorPng(r: number, g: number, b: number): Uint8Array {
  const rr = Math.max(0, Math.min(255, Math.round(r * 255)));
  const gg = Math.max(0, Math.min(255, Math.round(g * 255)));
  const bb = Math.max(0, Math.min(255, Math.round(b * 255)));

  const ihdr = new Uint8Array(13);
  ihdr.set(u32BE(1), 0); // width
  ihdr.set(u32BE(1), 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // 1 row = filter byte(0) + RGB(3) = 4 bytes
  const raw = new Uint8Array([0, rr, gg, bb]);

  // zlib: 2 bytes header + 1 stored block + 4 bytes adler32
  // stored block: [BFINAL|BTYPE=0x01, LEN (LE 2bytes), NLEN (LE 2bytes), ...data]
  const zlibHeader = new Uint8Array([0x78, 0x01]);
  const blockHeader = new Uint8Array(5);
  blockHeader[0] = 0x01;
  const len = raw.length;
  blockHeader[1] = len & 0xff;
  blockHeader[2] = (len >>> 8) & 0xff;
  blockHeader[3] = ~len & 0xff;
  blockHeader[4] = (~len >>> 8) & 0xff;
  const adler = u32BE(adler32(raw));

  const idatData = new Uint8Array(
    zlibHeader.length + blockHeader.length + raw.length + adler.length,
  );
  let offset = 0;
  idatData.set(zlibHeader, offset);
  offset += zlibHeader.length;
  idatData.set(blockHeader, offset);
  offset += blockHeader.length;
  idatData.set(raw, offset);
  offset += raw.length;
  idatData.set(adler, offset);

  const signature = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdrChunk = chunk("IHDR", ihdr);
  const idatChunk = chunk("IDAT", idatData);
  const iendChunk = chunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    signature.length +
      ihdrChunk.length +
      idatChunk.length +
      iendChunk.length,
  );
  let p = 0;
  png.set(signature, p);
  p += signature.length;
  png.set(ihdrChunk, p);
  p += ihdrChunk.length;
  png.set(idatChunk, p);
  p += idatChunk.length;
  png.set(iendChunk, p);
  return png;
}

const imageHashCache = new Map<string, string>();

/**
 * Figma 上に指定色の単色画像を登録し、その imageHash を返す。
 * 同じ色は結果をキャッシュして再利用する。
 */
export function getSolidColorImageHash(rgb: RGB): string {
  const key = `${Math.round(rgb.r * 255)},${Math.round(rgb.g * 255)},${Math.round(rgb.b * 255)}`;
  const cached = imageHashCache.get(key);
  if (cached) {
    return cached;
  }
  const png = createSolidColorPng(rgb.r, rgb.g, rgb.b);
  const hash = figma.createImage(png).hash;
  imageHashCache.set(key, hash);
  return hash;
}
