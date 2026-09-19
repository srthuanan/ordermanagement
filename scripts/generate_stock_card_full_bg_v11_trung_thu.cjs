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
    anmfHeader[15] = 0x02; // Dispose to background

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
  console.log('--- BẮT ĐẦU TẠO V11: ĐOÀN RƯỚC ĐÈN ÔNG SAO & TRỐNG ẾCH TRUNG THU ---');
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chuyển động lắc nhẹ của Đèn Ông Sao
    const starSway = Math.sin(phase) * 4.5;
    const starGlow = 0.75 + 0.25 * Math.sin(phase);

    // Chuyển động quay của Đèn Cù (Pinwheel)
    const pinwheelAngle = (t * 360).toFixed(1);

    // Tiếng trống ếch nhịp nhàng rung rinh
    const drumBounce = Math.abs(Math.sin(phase * 2)) * 3;
    const soundWave1 = ((f * 3) % 24) * 1.5;
    const soundWaveAlpha1 = Math.max(0, 1 - soundWave1 / 30);

    // Sao lấp lánh
    const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
    const s2 = 0.3 + 0.7 * Math.max(0, Math.sin(phase + 2));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v11MoonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#fef08a"/>
            <stop offset="70%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>
          <radialGradient id="v11Aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.6"/>
            <stop offset="60%" stop-color="#fde68a" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="v11DrumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="50%" stop-color="#b91c1c"/>
            <stop offset="100%" stop-color="#7f1d1d"/>
          </linearGradient>
          <radialGradient id="v11Stage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.4"/>
            <stop offset="60%" stop-color="#fde68a" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>
        <ellipse cx="160" cy="110" rx="135" ry="24" fill="url(#v11Stage)"/>

        <!-- DẢI DÂY CỜ ĐUÔI NHEO LỄ HỘI RỰC RỠ TRÊN CAO -->
        <path d="M 0,16 Q 80,28 160,20 Q 240,12 320,18" fill="none" stroke="#e2e8f0" stroke-width="1"/>
        <polygon points="35,21 47,23 41,35" fill="#ef4444" opacity="0.85"/>
        <polygon points="75,25 87,26 81,38" fill="#f59e0b" opacity="0.85"/>
        <polygon points="120,23 132,22 126,35" fill="#10b981" opacity="0.85"/>
        <polygon points="180,18 192,17 186,30" fill="#3b82f6" opacity="0.85"/>
        <polygon points="225,16 237,17 231,29" fill="#ec4899" opacity="0.85"/>
        <polygon points="275,17 287,19 281,31" fill="#f59e0b" opacity="0.85"/>

        <!-- ================= ĐÈN ÔNG SAO 5 CÁNH TRUYỀN THỐNG (Góc Trên Trái cx=48, cy=46) ================= -->
        <g transform="translate(48, 46) rotate(${starSway.toFixed(2)})">
          <!-- Vòng tre tròn bao quanh đèn ông sao -->
          <circle cx="0" cy="0" r="25" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="2,2"/>
          <circle cx="0" cy="0" r="28" fill="#fef08a" opacity="${(starGlow * 0.25).toFixed(2)}"/>

          <!-- 5 Cánh Sao Giấy Kiếng Đỏ - Vàng đan xen -->
          <!-- Cánh 1 (Đỉnh) -->
          <polygon points="0,0 -7,-8 0,-24 7,-8" fill="#ef4444"/>
          <!-- Cánh 2 (Phải trên) -->
          <polygon points="0,0 3,-10 23,-8 10,2" fill="#f59e0b"/>
          <!-- Cánh 3 (Phải dưới) -->
          <polygon points="0,0 8,6 14,21 0,11" fill="#ef4444"/>
          <!-- Cánh 4 (Trái dưới) -->
          <polygon points="0,0 0,11 -14,21 -8,6" fill="#f59e0b"/>
          <!-- Cánh 5 (Trái trên) -->
          <polygon points="0,0 -10,2 -23,-8 -3,-10" fill="#ef4444"/>

          <!-- Tâm đèn ông sao tròn dát vàng -->
          <circle cx="0" cy="0" r="5.5" fill="#fef08a" stroke="#d97706" stroke-width="1.2"/>
          <circle cx="0" cy="0" r="2" fill="#ef4444"/>

          <!-- Cán cầm bằng tre & Tua rua đuôi đèn -->
          <line x1="0" y1="24" x2="0" y2="42" stroke="#d97706" stroke-width="1.8"/>
          <path d="M -6,22 Q -8,32 -5,38" fill="none" stroke="#ef4444" stroke-width="1.2"/>
          <path d="M 6,22 Q 8,32 5,38" fill="none" stroke="#f59e0b" stroke-width="1.2"/>
        </g>

        <!-- ================= ĐÈN CÙ / CHONG CHÓNG QUAY TÍT (Góc Trên Phải cx=268, cy=44) ================= -->
        <g transform="translate(268, 44)">
          <!-- Vầng trăng nền -->
          <circle cx="0" cy="0" r="28" fill="url(#v11Aura)"/>
          <circle cx="0" cy="0" r="20" fill="url(#v11MoonGrad)"/>

          <!-- Đèn Cù xoay tròn -->
          <g transform="rotate(${pinwheelAngle})">
            <!-- Cánh 1 -->
            <path d="M 0,0 C 0,-12 10,-14 12,-4 Z" fill="#ef4444"/>
            <!-- Cánh 2 -->
            <path d="M 0,0 C 12,0 14,10 4,12 Z" fill="#3b82f6"/>
            <!-- Cánh 3 -->
            <path d="M 0,0 C 0,12 -10,14 -12,4 Z" fill="#10b981"/>
            <!-- Cánh 4 -->
            <path d="M 0,0 C -12,0 -14,-10 -4,-12 Z" fill="#f59e0b"/>
            <!-- Trục chong chóng -->
            <circle cx="0" cy="0" r="3" fill="#ffffff" stroke="#d97706" stroke-width="0.8"/>
          </g>
        </g>

        <!-- ================= TRỐNG ẾCH TRUNG THU GÕ NHỊP PHÁ CỖ (Dưới góc phải cx=275, cy=420) ================= -->
        <g transform="translate(275, ${425 - drumBounce})">
          <!-- Sóng âm thanh rộn rã -->
          <ellipse cx="0" cy="-14" rx="${12 + soundWave1}" ry="${5 + soundWave1 * 0.4}" fill="none" stroke="#f59e0b" stroke-width="1.2" opacity="${soundWaveAlpha1.toFixed(2)}"/>
          <!-- Thân trống đỏ viền đinh đồng -->
          <ellipse cx="0" cy="10" rx="18" ry="6" fill="#7f1d1d"/>
          <rect x="-18" y="-10" width="36" height="20" fill="url(#v11DrumGrad)"/>
          <!-- Đinh đồng bao quanh -->
          <circle cx="-14" cy="0" r="1.3" fill="#fef08a"/>
          <circle cx="-7" cy="2" r="1.3" fill="#fef08a"/>
          <circle cx="0" cy="3" r="1.3" fill="#fef08a"/>
          <circle cx="7" cy="2" r="1.3" fill="#fef08a"/>
          <circle cx="14" cy="0" r="1.3" fill="#fef08a"/>
          <!-- Mặt trống da trâu -->
          <ellipse cx="0" cy="-10" rx="18" ry="6" fill="#fef08a" stroke="#b45309" stroke-width="1"/>
          <!-- Dùi trống bằng gỗ gõ nhịp -->
          <line x1="-12" y1="-22" x2="-4" y2="-11" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="-20" x2="4" y2="-10" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
        </g>

        <!-- NỐT NHẠC RỘN RÃ BAY LƯỢN -->
        <g transform="translate(245, 385)" opacity="0.75">
          <circle cx="0" cy="0" r="2.2" fill="#ef4444"/>
          <line x1="2" y1="0" x2="2" y2="-8" stroke="#ef4444" stroke-width="1.2"/>
          <line x1="2" y1="-8" x2="6" y2="-6" stroke="#ef4444" stroke-width="1.2"/>
        </g>

        ${renderSparkle(160, 26, 3.6, s1)}
        ${renderSparkle(38, 200, 3.0, s2)}
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);
  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v11_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v11_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);
  console.log(`HOÀN TẤT V11! ${(animatedWebp.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
