import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(size) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with filter byte (0) per row
  const rowSize = 1 + size * 4;
  const rawData = Buffer.alloc(rowSize * size);

  const center = (size - 1) / 2;
  const cornerRadius = size * 0.24;
  const half = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);

      // Check rounded squircle bounds
      let inBounds = true;
      if (dx > half - cornerRadius && dy > half - cornerRadius) {
        const cx = dx - (half - cornerRadius);
        const cy = dy - (half - cornerRadius);
        if (cx * cx + cy * cy > cornerRadius * cornerRadius) {
          inBounds = false;
        }
      }

      if (inBounds) {
        // Red squircle with darker inner contrast and stylized play / timer emblem
        const distFromCenter = Math.sqrt((x - center) * (x - center) + (y - center) * (y - center));
        const normalizedDist = distFromCenter / (size / 2);

        // Center symbol: Play triangle pointing right with timer cut
        const relX = (x - center) / (size * 0.4);
        const relY = (y - center) / (size * 0.4);

        // Stylized right-facing play triangle: x from -0.4 to 0.5, |y| <= (0.5 - x) * 0.7
        const inPlayTriangle = relX >= -0.35 && relX <= 0.45 && Math.abs(relY) <= (0.45 - relX) * 0.65;

        // Hourglass cutout across the play triangle: |relY| >= |relX| * 1.5 within central slit
        const inTimerCutout = Math.abs(relX + 0.05) < 0.12 && Math.abs(relY) < 0.35;

        if (inPlayTriangle && !inTimerCutout) {
          // Pure white symbol
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else if (inPlayTriangle && inTimerCutout) {
          // Cutout in crimson red
          rawData[pxOffset] = 220;
          rawData[pxOffset + 1] = 38;
          rawData[pxOffset + 2] = 38;
          rawData[pxOffset + 3] = 255;
        } else {
          // Gradient red background (brighter top-left, deeper bottom-right)
          const gradientFactor = 1 - (relX + relY) * 0.2;
          const r = Math.min(255, Math.max(180, Math.round(239 * gradientFactor)));
          const g = Math.min(255, Math.max(20, Math.round(68 * gradientFactor)));
          const b = Math.min(255, Math.max(20, Math.round(68 * gradientFactor)));

          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0; // transparent outside rounded corner
      }
    }
  }

  // Deflate IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const outDir = path.resolve('extension/icons');
fs.mkdirSync(outDir, { recursive: true });

const publicDir = path.resolve('public/icons');
fs.mkdirSync(publicDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const png = createPng(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  fs.writeFileSync(path.join(publicDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
});

// Copy generated AI art to public directory for app display
const generatedImgPath = path.resolve('src/assets/images/shorts_limit_icon_1788932605911.jpg');
if (fs.existsSync(generatedImgPath)) {
  fs.copyFileSync(generatedImgPath, path.join(publicDir, 'app_icon.jpg'));
  fs.copyFileSync(generatedImgPath, path.resolve('public/icon.jpg'));
  console.log('Copied app_icon.jpg to public directories');
}

