const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function extract() {
  const inputPath = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\20283d69-1a33-4b02-a664-4c400b1f10f4\\thongoc_3d_1788771583708.jpg';
  const outputPath = path.join(__dirname, '../pictures/tho_ngoc_clean.png');

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels; // 4

  // Alpha flood fill from borders to cleanly remove solid white background
  const visited = new Uint8Array(width * height);
  const queue = [];

  function isWhite(x, y) {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return r > 240 && g > 240 && b > 240;
  }

  // Seed borders
  for (let x = 0; x < width; x++) {
    if (isWhite(x, 0)) { queue.push((0 << 16) | x); visited[x] = 1; }
    if (isWhite(x, height - 1)) { queue.push(((height - 1) << 16) | x); visited[(height - 1) * width + x] = 1; }
  }
  for (let y = 0; y < height; y++) {
    if (isWhite(0, y) && !visited[y * width]) { queue.push((y << 16) | 0); visited[y * width] = 1; }
    if (isWhite(width - 1, y) && !visited[y * width + (width - 1)]) { queue.push((y << 16) | (width - 1)); visited[y * width + (width - 1)] = 1; }
  }

  let head = 0;
  while (head < queue.length) {
    const val = queue[head++];
    const x = val & 0xffff;
    const y = val >> 16;

    const neighbors = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos] && isWhite(nx, ny)) {
          visited[nPos] = 1;
          queue.push((ny << 16) | nx);
        }
      }
    }
  }

  // Now set alpha
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      const idx = pos * 4;
      if (visited[pos]) {
        // Pure background
        data[idx + 3] = 0;
      } else {
        // Edge anti-aliasing: if close to pure white, smooth alpha
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const minBright = Math.min(r, g, b);
        if (minBright > 235) {
          const alphaFactor = (255 - minBright) / 20;
          // Feather alpha slightly
          data[idx + 3] = Math.round(255 * Math.max(0.1, alphaFactor));
        }
      }
    }
  }

  // Trim transparent edges
  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .trim()
    .png()
    .toFile(outputPath);

  console.log('Đã tạo thành công icon Thỏ Ngọc trong suốt tại:', outputPath);
}

extract().catch(console.error);
