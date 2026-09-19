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
  console.log('--- BẮT ĐẦU TẠO V14: MÁI NGÓI ÂM DƯƠNG PHỐ CỔ & ĐÈN LỒNG DƯỚI HIÊN ---');
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Đèn lồng treo dưới mái đung đưa theo gió thu
    const lanternSway1 = Math.sin(phase) * 5;
    const lanternSway2 = Math.cos(phase + 0.8) * 4.5;
    const lanternSway3 = Math.sin(phase + 1.6) * 4.0;

    // Ánh sáng đèn lồng tỏa rạng
    const glow1 = 0.8 + 0.2 * Math.sin(phase);
    const glow2 = 0.75 + 0.25 * Math.cos(phase);

    // Mây trôi lãng đãng ngang vầng trăng
    const cloudX = 220 + Math.sin(phase) * 6;

    // Sao lấp lánh
    const s1 = 0.35 + 0.65 * Math.max(0, Math.sin(phase));
    const s2 = 0.40 + 0.60 * Math.max(0, Math.sin(phase + 2));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v14MoonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#fef3c7"/>
            <stop offset="70%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>
          <linearGradient id="v14RoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#78716c"/>
            <stop offset="40%" stop-color="#57534e"/>
            <stop offset="100%" stop-color="#44403c"/>
          </linearGradient>
          <linearGradient id="v14TileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ea580c"/>
            <stop offset="50%" stop-color="#c2410c"/>
            <stop offset="100%" stop-color="#9a3412"/>
          </linearGradient>
          <radialGradient id="v14Stage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.4"/>
            <stop offset="60%" stop-color="#fde68a" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>
        <ellipse cx="160" cy="110" rx="135" ry="24" fill="url(#v14Stage)"/>

        <!-- ================= VẦNG TRĂNG THU TRÊN CAO (cx=245, cy=42) ================= -->
        <g transform="translate(245, 42)">
          <circle cx="0" cy="0" r="28" fill="#fef08a" opacity="0.35"/>
          <circle cx="0" cy="0" r="22" fill="url(#v14MoonGrad)"/>
          <!-- Vết thỏ ngọc mờ trên trăng -->
          <circle cx="4" cy="-4" r="5" fill="#ffffff" opacity="0.15"/>
          <!-- Mây mỏng vắt ngang trăng -->
          <path d="M -26,6 Q -10,0 8,8 Q 20,4 28,10" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
        </g>

        <!-- ================= MÁI NGÓI ÂM DƯƠNG UỐN CONG CỔ KÍNH PHÍA TRÊN TRÁI ================= -->
        <g transform="translate(0, 0)">
          <!-- Khối mái ngói vươn từ trái sang phải -->
          <path d="M 0,0 L 150,0 Q 110,12 80,18 Q 40,24 0,26 Z" fill="url(#v14RoofGrad)"/>
          <!-- Mũi đao cong vuốt góc mái ngói Hội An -->
          <path d="M 0,22 Q 45,20 85,16 Q 120,10 145,2 Q 135,10 110,16 Q 60,24 0,28 Z" fill="url(#v14TileGrad)"/>

          <!-- Hàng ngói ống âm dương cổ kính -->
          <ellipse cx="20" cy="24" rx="4" ry="2" fill="#c2410c"/>
          <ellipse cx="40" cy="22" rx="4" ry="2" fill="#c2410c"/>
          <ellipse cx="60" cy="19" rx="4" ry="2" fill="#c2410c"/>
          <ellipse cx="80" cy="16" rx="4" ry="2" fill="#c2410c"/>
          <ellipse cx="100" cy="12" rx="4" ry="2" fill="#c2410c"/>

          <!-- ĐÈN LỒNG 1 (Đỏ Hồng Gấm - Trái) treo từ mái -->
          <g transform="translate(30, 24) rotate(${lanternSway1.toFixed(1)})">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#78716c" stroke-width="1"/>
            <!-- Thân đèn tròn đỏ -->
            <ellipse cx="0" cy="19" rx="8" ry="9" fill="#ef4444" opacity="${glow1.toFixed(2)}"/>
            <ellipse cx="0" cy="19" rx="5" ry="9" fill="#f87171"/>
            <!-- Nắp núm vàng & Tua rua -->
            <rect x="-3" y="9" width="6" height="2" rx="0.5" fill="#f59e0b"/>
            <rect x="-3" y="27" width="6" height="2" rx="0.5" fill="#f59e0b"/>
            <line x1="0" y1="29" x2="0" y2="39" stroke="#ef4444" stroke-width="1.2"/>
          </g>

          <!-- ĐÈN LỒNG 2 (Vàng Hội An - Giữa) treo từ mái -->
          <g transform="translate(70, 18) rotate(${lanternSway2.toFixed(1)})">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#78716c" stroke-width="1"/>
            <!-- Thân đèn quả trám vàng -->
            <polygon points="0,12 8,22 0,32 -8,22" fill="#f59e0b" opacity="${glow2.toFixed(2)}"/>
            <polygon points="0,12 4,22 0,32 -4,22" fill="#fef08a"/>
            <!-- Nắp núm & Tua rua -->
            <rect x="-3" y="11" width="6" height="2" rx="0.5" fill="#b45309"/>
            <rect x="-3" y="31" width="6" height="2" rx="0.5" fill="#b45309"/>
            <line x1="0" y1="33" x2="0" y2="45" stroke="#f59e0b" stroke-width="1.2"/>
          </g>

          <!-- ĐÈN LỒNG 3 (Xanh Lục Bảo - Phải) treo từ đầu đao mái -->
          <g transform="translate(110, 14) rotate(${lanternSway3.toFixed(1)})">
            <line x1="0" y1="0" x2="0" y2="9" stroke="#78716c" stroke-width="1"/>
            <!-- Thân đèn lồng trụ lục bảo -->
            <rect x="-5" y="9" width="10" height="14" rx="3" fill="#10b981" opacity="0.85"/>
            <rect x="-2" y="9" width="4" height="14" fill="#a7f3d0"/>
            <line x1="0" y1="23" x2="0" y2="33" stroke="#10b981" stroke-width="1.2"/>
          </g>
        </g>

        <!-- Bụi sao thu & Chim én bay đêm trăng -->
        <g transform="translate(180, 30)" opacity="0.65">
          <path d="M 0,0 Q -4,-3 -6,-1 Q -2,1 0,0 Q 2,1 6,-1 Q 4,-3 0,0" fill="#475569"/>
        </g>

        ${renderSparkle(160, 26, 3.2, s1)}
        ${renderSparkle(285, 95, 3.0, s2)}
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);
  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v14_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v14_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);
  console.log(`HOÀN TẤT V14! ${(animatedWebp.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
