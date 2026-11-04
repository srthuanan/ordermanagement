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
  console.log('--- BẮT ĐẦU TẠO V16: CHỊ HẰNG NGA & CHÚ CUỘI SUM VẦY CUNG TRĂNG ---');
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chị Hằng bay bổng lơ lửng
    const hangBobY = Math.sin(phase) * 3.5;
    const hangTilt = Math.sin(phase) * 2.5;

    // Chú Cuội thổi sáo nhịp nhàng
    const cuoiBobY = Math.sin(phase + 1) * 2.0;
    const fluteAngle = Math.sin(phase * 2) * 4;

    // Dải lụa tiên kết nối Chị Hằng và Chú Cuội
    const ribbonWave = Math.sin(phase) * 6;

    // Bụi sao di chuyển từ Chị Hằng sang Cuội
    const starProgress1 = (t * 1.5) % 1;
    const star1X = 230 - starProgress1 * 130;
    const star1Y = 35 + Math.sin(starProgress1 * Math.PI * 2) * 10;
    const star1Alpha = Math.sin(starProgress1 * Math.PI);

    // Rễ cây đa đu đưa trong gió thu
    const banyanRootSway = Math.sin(phase) * 3;

    // Sao lấp lánh
    const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.8));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient vầng trăng rằm thần tiên -->
          <radialGradient id="v16MoonGrad" cx="38%" cy="38%" r="62%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="25%" stop-color="#fef9c3"/>
            <stop offset="65%" stop-color="#fde047"/>
            <stop offset="90%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>

          <!-- Gradient dải lụa tiên kết duyên -->
          <linearGradient id="v16RibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8"/>
            <stop offset="50%" stop-color="#f472b6" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#fb7185" stop-opacity="0.9"/>
          </linearGradient>

          <!-- Gradient áo tiên Chị Hằng -->
          <linearGradient id="v16DressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#fbcfe8"/>
            <stop offset="100%" stop-color="#f472b6"/>
          </linearGradient>

          <!-- Gradient bục mây dưới chân xe -->
          <radialGradient id="v16Stage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.45"/>
            <stop offset="55%" stop-color="#fde68a" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>
        <ellipse cx="160" cy="110" rx="138" ry="24" fill="url(#v16Stage)"/>

        <!-- ================= VẦNG TRĂNG RẰM HOÀNG KIM (Trung tâm trên cao cx=160, cy=38) ================= -->
        <g transform="translate(160, 38)">
          <circle cx="0" cy="0" r="30" fill="#fef08a" opacity="0.4"/>
          <circle cx="0" cy="0" r="22" fill="url(#v16MoonGrad)"/>
          <path d="M -6,-4 Q 0,-10 6,-6 Q 8,2 2,6 Q -4,4 -6,-4 Z" fill="#d97706" opacity="0.18"/>
        </g>

        <!-- DẢI LỤA TIÊN UỐN LƯỢN NỐI CHỊ HẰNG VỚI CHÚ CUỘI -->
        <path d="M 72,${48 + cuoiBobY} Q 160,${18 + ribbonWave} 235,${42 + hangBobY}" 
              fill="none" stroke="url(#v16RibbonGrad)" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M 72,${48 + cuoiBobY} Q 160,${18 + ribbonWave} 235,${42 + hangBobY}" 
              fill="none" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.75"/>

        <!-- Bụi sao di chuyển giữa Chị Hằng và Chú Cuội -->
        <circle cx="${star1X.toFixed(1)}" cy="${star1Y.toFixed(1)}" r="1.8" fill="#f59e0b" opacity="${star1Alpha.toFixed(2)}"/>

        <!-- ================= GỐC CÂY ĐA & CHÚ CUỘI NGỒI THỔI SÁO (Góc Trên Trái cx=52, cy=46) ================= -->
        <g transform="translate(52, 46)">
          <!-- Tán lá cây đa cổ thụ rợp bóng -->
          <circle cx="-12" cy="-14" r="15" fill="#15803d" opacity="0.7"/>
          <circle cx="0" cy="-20" r="17" fill="#16a34a" opacity="0.8"/>
          <circle cx="12" cy="-14" r="14" fill="#22c55e" opacity="0.75"/>

          <!-- Thân cây đa uốn cong vững chãi -->
          <path d="M -10,18 Q -4,0 -2,-12 Q 2,0 8,18 Z" fill="#78350f"/>
          <!-- Rễ cây đa buông rủ đu đưa -->
          <path d="M -6,0 Q ${-9 + banyanRootSway},8 -6,16" fill="none" stroke="#92400e" stroke-width="1.2"/>
          <path d="M 4,0 Q ${6 + banyanRootSway},8 5,16" fill="none" stroke="#92400e" stroke-width="1.2"/>

          <!-- HÌNH BÓNG CHÚ CUỘI NGỒI DƯỚI GỐC ĐA (cx=8, cy=10) -->
          <g transform="translate(10, ${10 + cuoiBobY})">
            <!-- Thân áo nâu chàm truyền thống -->
            <ellipse cx="0" cy="2" rx="4.5" ry="5.5" fill="#b45309"/>
            <polygon points="-4,6 4,6 0,-2" fill="#78350f"/>

            <!-- Khăn đóng / búi tóc củ hành ngộ nghĩnh của Chú Cuội -->
            <circle cx="0" cy="-6" r="3.2" fill="#fef08a" stroke="#d97706" stroke-width="0.5"/>
            <ellipse cx="0" cy="-9.2" rx="1.8" ry="1.4" fill="#78350f"/>
            <circle cx="0" cy="-10.5" r="1" fill="#ea580c"/>

            <!-- Chiếc sáo trúc Chú Cuội cầm ngang thổi -->
            <g transform="translate(1, -5) rotate(${fluteAngle.toFixed(1)})">
              <line x1="-7" y1="2" x2="9" y2="-1" stroke="#16a34a" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="-3" cy="1.3" r="0.4" fill="#ffffff"/>
              <circle cx="0" cy="0.8" r="0.4" fill="#ffffff"/>
              <circle cx="3" cy="0.3" r="0.4" fill="#ffffff"/>
              <!-- Tua rua sáo màu đỏ -->
              <line x1="8" y1="-1" x2="11" y2="4" stroke="#ef4444" stroke-width="0.8"/>
            </g>
          </g>
        </g>

        <!-- ================= CHỊ HẰNG NGA BAY LƯỢN THƯỚT THA (Góc Trên Phải cx=250, cy=44) ================= -->
        <g transform="translate(250, ${44 + hangBobY}) rotate(${hangTilt.toFixed(1)})">
          <!-- Đám mây tiên bồng bềnh dưới chân -->
          <ellipse cx="6" cy="14" rx="13" ry="4.5" fill="#ffffff" opacity="0.9"/>
          <circle cx="0" cy="12" r="4.8" fill="#ffffff" opacity="0.95"/>
          <circle cx="11" cy="13" r="4.8" fill="#ffffff" opacity="0.95"/>

          <!-- Tà váy lụa tiên thướt tha mềm mại -->
          <path d="M -4,2 C -7,8 -10,16 -3,17 C 4,18 8,14 6,2 Z" fill="url(#v16DressGrad)" stroke="#f472b6" stroke-width="0.5"/>

          <!-- Thân áo tiên trắng ngọc -->
          <ellipse cx="1" cy="-1" rx="3.5" ry="4.5" fill="#ffffff" stroke="#fbcfe8" stroke-width="0.5"/>

          <!-- Dải khăn choàng vai tiên nữ vắt chéo -->
          <path d="M -4,-3 Q 1,-6 6,-3 Q 9,1 7,8" fill="none" stroke="#f472b6" stroke-width="1.2" stroke-linecap="round"/>

          <!-- Khuôn mặt Chị Hằng thanh tú -->
          <circle cx="2" cy="-9" r="3.2" fill="#fef08a" stroke="#f59e0b" stroke-width="0.5"/>

          <!-- Búi tóc tiên nữ mây bồng bềnh & Trâm cài hoa ngọc -->
          <ellipse cx="0.5" cy="-12.5" rx="3.5" ry="2.2" fill="#1e293b"/>
          <circle cx="-1.5" cy="-13" r="1.2" fill="#fb7185"/>
          <line x1="-1.5" y1="-13" x2="-4" y2="-15" stroke="#fef08a" stroke-width="0.8"/>

          <!-- Quạt lụa tròn hoa sen trên tay Chị Hằng -->
          <g transform="translate(6, -6)">
            <circle cx="0" cy="0" r="2.8" fill="#ffffff" stroke="#f472b6" stroke-width="0.6"/>
            <line x1="0" y1="2.8" x2="0" y2="5.5" stroke="#b45309" stroke-width="0.6"/>
            <circle cx="0" cy="0" r="1.0" fill="#fb7185"/>
          </g>
        </g>

        <!-- NỐT NHẠC VÀ BỤI SAO LUNG LINH -->
        <g transform="translate(100, 32)" opacity="0.75">
          <circle cx="0" cy="0" r="1.8" fill="#ef4444"/>
          <line x1="1.6" y1="0" x2="1.6" y2="-6" stroke="#ef4444" stroke-width="1"/>
          <line x1="1.6" y1="-6" x2="5" y2="-4.5" stroke="#ef4444" stroke-width="1"/>
        </g>

        ${renderSparkle(160, 20, 3.8, s1)}
        ${renderSparkle(285, 95, 3.2, s2)}
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);
  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v16_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v16_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);
  console.log(`HOÀN TẤT V16 (CHỊ HẰNG & CHÚ CUỘI)! ${(animatedWebp.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
