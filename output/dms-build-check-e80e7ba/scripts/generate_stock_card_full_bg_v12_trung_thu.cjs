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
  console.log('--- BẮT ĐẦU TẠO V12: ĐÈN HOA SEN NGỌC BÍCH & SONG NGƯ HOÀNG KIM ---');
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Cánh sen thở nhẹ nhàng
    const lotusBreath = 1 + 0.04 * Math.sin(phase);

    // Cá Koi 1 bơi lượn uốn khúc
    const fish1Angle = (phase * (180 / Math.PI)).toFixed(1);
    const fish1X = 240 + Math.cos(phase) * 25;
    const fish1Y = 48 + Math.sin(phase) * 14;
    const fish1Tail = Math.sin(phase * 4) * 15;

    // Cá Koi 2 bơi đối xứng dưới bục xe
    const fish2Angle = ((phase + Math.PI) * (180 / Math.PI)).toFixed(1);
    const fish2X = 80 + Math.cos(phase + Math.PI) * 20;
    const fish2Y = 112 + Math.sin(phase + Math.PI) * 8;
    const fish2Tail = Math.sin((phase + Math.PI) * 4) * 15;

    // Đèn hoa đăng bập bềnh
    const floatBob1 = Math.sin(phase) * 2.5;
    const candleGlow = 0.8 + 0.2 * Math.sin(phase * 3);

    // Sao lấp lánh
    const s1 = 0.35 + 0.65 * Math.max(0, Math.sin(phase));
    const s2 = 0.40 + 0.60 * Math.max(0, Math.sin(phase + 1.8));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v12MoonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#fef9c3"/>
            <stop offset="70%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#eab308"/>
          </radialGradient>
          <linearGradient id="v12LotusGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="40%" stop-color="#fbcfe8"/>
            <stop offset="85%" stop-color="#f43f5e"/>
            <stop offset="100%" stop-color="#e11d48"/>
          </linearGradient>
          <radialGradient id="v12WaterStage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.45"/>
            <stop offset="60%" stop-color="#bae6fd" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>
        <ellipse cx="160" cy="110" rx="140" ry="24" fill="url(#v12WaterStage)"/>

        <!-- GỢN SÓNG NƯỚC HỒ TÂY TRONG TRẺO -->
        <path d="M 20,114 Q 90,110 160,114 T 300,114" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.35"/>
        <path d="M 40,119 Q 100,116 160,119 T 280,119" fill="none" stroke="#38bdf8" stroke-width="0.6" opacity="0.25"/>

        <!-- ================= ĐÈN HOA SEN NGỌC BÍCH NỞ HOA (Góc Trên Trái cx=48, cy=44) ================= -->
        <g transform="translate(48, 44) scale(${lotusBreath})">
          <!-- Hào quang sen hồng ngọc -->
          <circle cx="0" cy="0" r="24" fill="#fbcfe8" opacity="0.4"/>

          <!-- Lá sen ngọc bích phía dưới -->
          <ellipse cx="0" cy="8" rx="20" ry="5" fill="#10b981" opacity="0.85"/>
          <ellipse cx="0" cy="8" rx="16" ry="3.5" fill="#059669"/>

          <!-- Cánh sen ngoài -->
          <path d="M -16,6 C -18,-4 -8,-14 0,-16 C 8,-14 18,-4 16,6 Z" fill="url(#v12LotusGrad)" opacity="0.75"/>
          <!-- Cánh sen giữa trái & phải -->
          <path d="M -12,6 C -15,-2 -7,-12 0,-18 C -3,-6 -6,3 -12,6 Z" fill="url(#v12LotusGrad)"/>
          <path d="M 12,6 C 15,-2 7,-12 0,-18 C 3,-6 6,3 12,6 Z" fill="url(#v12LotusGrad)"/>
          <!-- Cánh sen trung tâm vươn cao -->
          <path d="M -7,6 C -9,-6 0,-20 0,-20 C 0,-20 9,-6 7,6 Z" fill="url(#v12LotusGrad)"/>

          <!-- Nhụy sen vàng phát sáng với nến lung linh -->
          <circle cx="0" cy="-4" r="3.5" fill="#fef08a" opacity="${candleGlow.toFixed(2)}"/>
          <circle cx="0" cy="-4" r="1.5" fill="#f59e0b"/>
        </g>

        <!-- ================= VẦNG TRĂNG VÀNG & CÁ KOI 1 BƠI LƯỢN (Góc Trên Phải) ================= -->
        <g transform="translate(255, 45)">
          <circle cx="0" cy="0" r="25" fill="url(#v12MoonGrad)"/>
        </g>

        <!-- Cá Koi Hoàng Kim 1 (Góc trên) -->
        <g transform="translate(${fish1X.toFixed(1)}, ${fish1Y.toFixed(1)}) rotate(${fish1Angle})">
          <!-- Thân cá koi thon dài mềm mại -->
          <ellipse cx="0" cy="0" rx="8" ry="3.8" fill="#f97316"/>
          <ellipse cx="-2" cy="0" rx="5" ry="2.8" fill="#fef08a"/>
          <circle cx="5" cy="-1.5" r="0.7" fill="#0f172a"/>
          <!-- Đuôi cá vẫy sóng -->
          <g transform="translate(-7, 0) rotate(${fish1Tail.toFixed(1)})">
            <path d="M 0,0 Q -6,-4 -8,-6 Q -4,0 -8,6 Q -6,4 0,0" fill="#fb923c" opacity="0.85"/>
          </g>
          <!-- Vây bơi hai bên -->
          <path d="M 1,-3 Q -2,-6 -4,-4" fill="none" stroke="#fb923c" stroke-width="1"/>
          <path d="M 1,3 Q -2,6 -4,4" fill="none" stroke="#fb923c" stroke-width="1"/>
        </g>

        <!-- Cá Koi Hoàng Kim 2 (Dưới sàn bực mây) -->
        <g transform="translate(${fish2X.toFixed(1)}, ${fish2Y.toFixed(1)}) rotate(${fish2Angle})">
          <ellipse cx="0" cy="0" rx="7" ry="3.2" fill="#ea580c"/>
          <ellipse cx="-1" cy="0" rx="4" ry="2.2" fill="#ffffff" opacity="0.9"/>
          <!-- Đuôi cá vẫy sóng -->
          <g transform="translate(-6, 0) rotate(${fish2Tail.toFixed(1)})">
            <path d="M 0,0 Q -5,-3 -7,-5 Q -3,0 -7,5 Q -5,3 0,0" fill="#f97316" opacity="0.85"/>
          </g>
        </g>

        <!-- ================= ĐÈN HOA ĐĂNG THẢ NƯỚC LỮNG LỜ (cx=40, cy=415) ================= -->
        <g transform="translate(42, ${415 + floatBob1})">
          <ellipse cx="0" cy="6" rx="14" ry="4" fill="#38bdf8" opacity="0.3"/>
          <path d="M -12,2 C -10,-4 0,-10 0,-10 C 0,-10 10,-4 12,2 Z" fill="#ec4899"/>
          <path d="M -7,2 C -5,-2 0,-7 0,-7 C 0,-7 5,-2 7,2 Z" fill="#fbcfe8"/>
          <!-- Ngọn nến lung linh -->
          <line x1="0" y1="0" x2="0" y2="-5" stroke="#d97706" stroke-width="1.2"/>
          <ellipse cx="0" cy="-6" rx="1.6" ry="2.8" fill="#fef08a" opacity="${candleGlow.toFixed(2)}"/>
          <ellipse cx="0" cy="-6" rx="0.8" ry="1.5" fill="#ef4444"/>
        </g>

        ${renderSparkle(160, 24, 3.4, s1)}
        ${renderSparkle(280, 85, 3.0, s2)}
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);
  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v12_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v12_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);
  console.log(`HOÀN TẤT V12! ${(animatedWebp.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
