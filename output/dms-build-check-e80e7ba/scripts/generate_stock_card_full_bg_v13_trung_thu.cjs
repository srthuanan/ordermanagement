const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 320;
const HEIGHT = 480;
const TOTAL_FRAMES = 24;
const DELAY = 80;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 80, loopCount = 0) {
  const anmfChunks = [];

  for (const frameBuf of frameWebpBuffers) {
    let pos = 12;
    const payloads = [];

    while (pos < frameBuf.length) {
      const fourcc = frameBuf.toString('latin1', pos, pos + 4);
      const size = frameBuf.readUInt32LE(pos + 4);
      const chunkSize = 8 + size + (size % 2);

      if (fourcc === 'VP8 ' || fourcc === 'VP8L' || fourcc === 'ALPH') {
        payloads.push(frameBuf.subarray(pos, pos + chunkSize));
      }
      pos += chunkSize;
    }

    const payloadData = Buffer.concat(payloads);
    const anmfHeader = Buffer.alloc(16);
    writeUInt24LE(anmfHeader, 0, 0);
    writeUInt24LE(anmfHeader, 0, 3);
    writeUInt24LE(anmfHeader, WIDTH - 1, 6);
    writeUInt24LE(anmfHeader, HEIGHT - 1, 9);
    writeUInt24LE(anmfHeader, delayMs, 12);
    anmfHeader[15] = 0x02;

    const anmfData = Buffer.concat([anmfHeader, payloadData]);
    const anmfPayloadSize = anmfData.length;
    const anmfChunkHeader = Buffer.alloc(8);
    anmfChunkHeader.write('ANMF', 0, 4, 'latin1');
    anmfChunkHeader.writeUInt32LE(anmfPayloadSize, 4);

    const pad = (anmfPayloadSize % 2 !== 0) ? Buffer.from([0]) : Buffer.alloc(0);
    anmfChunks.push(Buffer.concat([anmfChunkHeader, anmfData, pad]));
  }

  const vp8xHeader = Buffer.alloc(8 + 10);
  vp8xHeader.write('VP8X', 0, 4, 'latin1');
  vp8xHeader.writeUInt32LE(10, 4);
  vp8xHeader[8] = 0x12;
  writeUInt24LE(vp8xHeader, WIDTH - 1, 12);
  writeUInt24LE(vp8xHeader, HEIGHT - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8);
  animChunk.writeUInt16LE(loopCount, 12);

  const bodyData = Buffer.concat([vp8xHeader, animChunk, ...anmfChunks]);
  const riffSize = 4 + bodyData.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(riffSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, bodyData]);
}

function renderSparkle(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#eab308" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO V13: MÂM NGŨ QUẢ & CHÓ BƯỞI PHÚ QUÝ ---');
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chú chó bưởi lúc lắc đầu dễ thương
    const dogHeadTilt = Math.sin(phase) * 3;
    const dogEarFlap = Math.cos(phase) * 2;

    // Nơ đỏ rung rinh
    const bowBounce = Math.sin(phase * 2) * 1.5;

    // Quả hồng chín lấp lánh ánh trăng
    const persimmonGlow = 0.8 + 0.2 * Math.sin(phase);

    // Lá thu rơi nhè nhẹ
    const leafY = 160 + (t * 220);
    const leafX = 270 + Math.sin(phase) * 15;
    const leafRot = (t * 360).toFixed(0);

    // Sao lấp lánh
    const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 2.5));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v13MoonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="35%" stop-color="#fef3c7"/>
            <stop offset="70%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </radialGradient>
          <radialGradient id="v13Stage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.45"/>
            <stop offset="60%" stop-color="#fef08a" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
          <!-- Gradient múi bưởi xù xì ngọc ngà -->
          <radialGradient id="pomeloFur" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#fde047"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>
        <ellipse cx="160" cy="110" rx="138" ry="24" fill="url(#v13Stage)"/>

        <!-- ================= CHÚ CHÓ BƯỞI LÔNG XÙ TRUYỀN THỐNG (Góc Trên Trái cx=48, cy=46) ================= -->
        <g transform="translate(48, 48)">
          <!-- Hào quang ngọt ngào -->
          <circle cx="0" cy="0" r="26" fill="#fef9c3" opacity="0.6"/>

          <!-- Thân chó bưởi từ các múi bưởi trắng hồng kết chùm -->
          <ellipse cx="0" cy="8" rx="14" ry="11" fill="url(#pomeloFur)"/>
          <circle cx="-6" cy="12" r="4.5" fill="#fef08a"/>
          <circle cx="6" cy="12" r="4.5" fill="#fef08a"/>
          <circle cx="0" cy="15" r="4" fill="#fde047"/>

          <!-- Đầu chó bưởi xoay lắc nhẹ -->
          <g transform="translate(0, -3) rotate(${dogHeadTilt.toFixed(1)})">
            <circle cx="0" cy="0" r="10" fill="url(#pomeloFur)"/>
            <!-- Tai xù cụp hai bên -->
            <ellipse cx="-8" cy="-5" rx="3.5" ry="5.5" fill="#fef08a" transform="rotate(${-15 + dogEarFlap})" />
            <ellipse cx="8" cy="-5" rx="3.5" ry="5.5" fill="#fef08a" transform="rotate(${15 - dogEarFlap})" />

            <!-- Mắt hạt nhãn đen láy lấp lánh -->
            <circle cx="-3.5" cy="-1.5" r="1.8" fill="#0f172a"/>
            <circle cx="-4" cy="-2" r="0.6" fill="#ffffff"/>
            <circle cx="3.5" cy="-1.5" r="1.8" fill="#0f172a"/>
            <circle cx="3" cy="-2" r="0.6" fill="#ffffff"/>

            <!-- Mũi hạt tiêu đen -->
            <ellipse cx="0" cy="2" rx="1.5" ry="1" fill="#1e293b"/>
            <path d="M -1.5,4 Q 0,6 1.5,4" fill="none" stroke="#ef4444" stroke-width="0.7"/>

            <!-- Nơ đỏ thắt cổ xinh xắn -->
            <g transform="translate(0, 8)">
              <polygon points="-6,-3 0,0 -6,3" fill="#ef4444"/>
              <polygon points="6,-3 0,0 6,3" fill="#ef4444"/>
              <circle cx="0" cy="0" r="1.6" fill="#fef08a"/>
            </g>
          </g>
        </g>

        <!-- ================= VẦNG TRĂNG & QUẢ HỒNG ĐỎ TRUNG THU (Góc Trên Phải) ================= -->
        <g transform="translate(258, 44)">
          <circle cx="0" cy="0" r="24" fill="url(#v13MoonGrad)"/>

          <!-- Quả hồng chín đỏ mọng đặt bên cạnh -->
          <g transform="translate(-16, 12)">
            <ellipse cx="0" cy="0" rx="9" ry="8" fill="#ea580c" opacity="${persimmonGlow.toFixed(2)}"/>
            <ellipse cx="0" cy="-1" rx="7" ry="5" fill="#f97316"/>
            <!-- Tai cuống quả hồng 4 cánh xanh -->
            <polygon points="0,-7 -2,-9 0,-11 2,-9" fill="#15803d"/>
            <polygon points="-5,-6 -8,-7 -7,-5" fill="#16a34a"/>
            <polygon points="5,-6 8,-7 7,-5" fill="#16a34a"/>
            <circle cx="0" cy="-7" r="1" fill="#14532d"/>
          </g>
        </g>

        <!-- Lá phong vàng rơi nhè nhẹ -->
        <g transform="translate(${leafX.toFixed(1)}, ${leafY.toFixed(1)}) rotate(${leafRot})" opacity="0.65">
          <path d="M 0,-6 Q 4,-4 5,0 Q 2,4 0,6 Q -2,4 -5,0 Q -4,-4 0,-6 Z" fill="#f59e0b"/>
          <line x1="0" y1="-6" x2="0" y2="7" stroke="#b45309" stroke-width="0.5"/>
        </g>

        ${renderSparkle(160, 24, 3.5, s1)}
        ${renderSparkle(42, 220, 2.8, s2)}
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);
  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v13_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v13_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);
  console.log(`HOÀN TẤT V13! ${(animatedWebp.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
