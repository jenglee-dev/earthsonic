import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../../web/public');

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createEarthSonicPng(size: number, isMaskable = false): Buffer {
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  const center = size / 2;
  // Safe zone for maskable is inner 80% (radius <= 0.36 * size)
  const earthRadius = isMaskable ? size * 0.33 : size * 0.38;
  const ringThickness = Math.max(3, size * 0.028);

  const barOffsets = [-0.21, -0.14, -0.07, 0, 0.07, 0.14, 0.21];
  const barHeights = [0.12, 0.24, 0.36, 0.48, 0.34, 0.22, 0.12];
  const barHalfWidth = Math.max(2, size * 0.018);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rawData[rowStart] = 0; // Filter type 0 (None)

    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background #050914
      let r = 5, g = 9, b = 20;

      if (dist <= earthRadius) {
        // Inside Earth circle #0A1220
        r = 10;
        g = 18;
        b = 32;

        // Check sound-wave bars
        for (let bIdx = 0; bIdx < barOffsets.length; bIdx++) {
          const bx = center + barOffsets[bIdx] * size;
          const bh = barHeights[bIdx] * size * (isMaskable ? 0.85 : 1.0);
          if (Math.abs(x - bx) <= barHalfWidth && Math.abs(y - center) <= bh / 2) {
            // Gradient from #52C7F5 to #57D6A0
            const t = (bIdx / (barOffsets.length - 1));
            r = Math.round(82 + t * (87 - 82));
            g = Math.round(199 + t * (214 - 199));
            b = Math.round(245 + t * (160 - 245));
          }
        }
      }

      // Earth orbital ring
      if (Math.abs(dist - earthRadius) <= ringThickness / 2) {
        r = 82;
        g = 199;
        b = 245;
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(rawData);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', iend)
  ]);
}

async function run() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'), createEarthSonicPng(192, false));
  await fs.writeFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'), createEarthSonicPng(512, false));
  await fs.writeFile(
    path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'),
    createEarthSonicPng(512, true)
  );
  await fs.writeFile(
    path.join(PUBLIC_DIR, 'apple-touch-icon-180x180.png'),
    createEarthSonicPng(180, false)
  );
  console.log('[EarthSonic Icons] Generated 192, 512, maskable 512, and apple-touch-icon 180 PNGs.');
}

run();
