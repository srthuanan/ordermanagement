const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 540;
const HEIGHT = 200;
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
    writeUInt24Header(anmfHeader, delayMs, 12);
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

function writeUInt24Header(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO MẪU A: VECTOR SVG SIÊU CẤP (QUANG HỌC, GOD RAYS & TRĂNG THIÊN VĂN) ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Quầng sáng trăng nhịp thở
    const moonHaloPulse = 0.65 + 0.25 * Math.sin(phase);
    // Độ quét của luồng sáng thể tích (God rays sweep)
    const rayAngle = Math.sin(phase) * 4;
    // Đèn lồng đung đưa
    const sway1 = Math.sin(phase) * 4.5;
    const sway2 = Math.cos(phase + 0.7) * 4.0;
    // Sóng nước lăn tăn
    const waveY = Math.sin(phase * 2) * 2;

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Bầu trời đêm Hội An sâu thẳm -->
          <linearGradient id="optSky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#02040a"/>
            <stop offset="40%" stop-color="#070c1e"/>
            <stop offset="75%" stop-color="#101a38"/>
            <stop offset="100%" stop-color="#04060e"/>
          </linearGradient>

          <!-- BỘ LỌC KHUẾCH TÁN QUANG HỌC CỰC ĐẠI (OPTICAL DIFFUSION) -->
          <filter id="megaHalo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="35"/>
          </filter>
          <filter id="softRay" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="12"/>
          </filter>
          <filter id="lanternGlowOpt" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#f59e0b" flood-opacity="0.8"/>
          </filter>
          <filter id="waterBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8"/>
          </filter>

          <!-- Hào quang Trăng Rằm tháng Tám khổng lồ -->
          <radialGradient id="optMoonHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="${moonHaloPulse.toFixed(2)}"/>
            <stop offset="40%" stop-color="#f59e0b" stop-opacity="${(moonHaloPulse * 0.45).toFixed(2)}"/>
            <stop offset="80%" stop-color="#d97706" stop-opacity="${(moonHaloPulse * 0.1).toFixed(2)}"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>

          <!-- Mặt Trăng Rằm 3D Thiên Văn NASA -->
          <radialGradient id="optMoonSphere" cx="35%" cy="32%" r="68%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="20%" stop-color="#fffbeb"/>
            <stop offset="48%" stop-color="#fef08a"/>
            <stop offset="75%" stop-color="#f59e0b"/>
            <stop offset="92%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#92400e"/>
          </radialGradient>

          <!-- Luồng sáng thể tích God Rays -->
          <linearGradient id="godRay1" x1="0%" y1="0%" x2="40%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.32"/>
            <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="godRay2" x1="0%" y1="0%" x2="30%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
            <stop offset="60%" stop-color="#fde047" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </linearGradient>

          <!-- Lụa gấm đỏ Ruby Hội An -->
          <radialGradient id="silkRuby" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#fca5a5"/>
            <stop offset="35%" stop-color="#ef4444"/>
            <stop offset="80%" stop-color="#991b1b"/>
            <stop offset="100%" stop-color="#450a0a"/>
          </radialGradient>

          <!-- Mặt nước đêm phản chiếu -->
          <linearGradient id="lakeNight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#071124"/>
            <stop offset="50%" stop-color="#0c1d3c"/>
            <stop offset="100%" stop-color="#030812"/>
          </linearGradient>
        </defs>

        <!-- 1. BẦU TRỜI ĐÊM -->
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>

        <!-- 2. HÀO QUANG TRĂNG KHUẾCH TÁN QUANG HỌC RỘNG LỚN -->
        <circle cx="445" cy="55" r="110" fill="url(#optMoonHalo)" filter="url(#megaHalo)"/>

        <!-- 3. TIA SÁNG THỂ TÍCH (GOD RAYS) CHIẾU RỌI QUA MÀN SƯƠNG -->
        <g transform="translate(445, 55) rotate(${rayAngle.toFixed(1)})" filter="url(#softRay)">
          <polygon points="0,0 -220,150 -140,150" fill="url(#godRay1)"/>
          <polygon points="0,0 -340,150 -260,150" fill="url(#godRay2)"/>
          <polygon points="0,0 -160,150 -90,150" fill="url(#godRay1)"/>
        </g>

        <!-- 4. VẦNG TRĂNG RẰM THIÊN VĂN 3D SIÊU THỰC -->
        <circle cx="445" cy="55" r="46" fill="url(#optMoonSphere)"/>
        <!-- Biển mặt trăng & hố thiên thạch -->
        <ellipse cx="432" cy="45" rx="14" ry="10" fill="#78350f" opacity="0.22" filter="url(#softRay)"/>
        <ellipse cx="455" cy="62" rx="16" ry="9" fill="#92400e" opacity="0.2" filter="url(#softRay)"/>
        <!-- Tia hố Tycho -->
        <circle cx="452" cy="74" r="3" fill="#ffffff" opacity="0.8"/>
        <line x1="452" y1="74" x2="430" y2="40" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
        <line x1="452" y1="74" x2="475" y2="48" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
        <!-- Viền phản quang mặt trăng -->
        <circle cx="445" cy="55" r="45" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>

        <!-- 5. MẶT HỒ HOÀNG KIM PHẢN CHIẾU ÁNH TRĂNG (Dưới đáy banner) -->
        <rect x="0" y="145" width="${WIDTH}" height="55" fill="url(#lakeNight)"/>
        <!-- Bóng trăng vỡ lung linh trên mặt hồ gợn sóng -->
        <ellipse cx="445" cy="${165 + waveY}" rx="48" ry="8" fill="#fef08a" opacity="0.38" filter="url(#waterBlur)"/>
        <ellipse cx="445" cy="${180 - waveY}" rx="36" ry="5" fill="#f59e0b" opacity="0.25" filter="url(#waterBlur)"/>

        <!-- 6. MÁI NGÓI PHỐ CỔ HỘI AN VÀ DÀN ĐÈN LỒNG GẤM THẦN TIÊN -->
        <g transform="translate(0, 0)">
          <!-- Mái đao cong vút cổ kính -->
          <path d="M 0,0 L 260,0 Q 230,16 200,20 Q 100,26 0,28 Z" fill="#261205"/>
          <path d="M 0,22 Q 100,20 200,16 Q 230,12 255,2 Q 240,16 210,24 Q 100,30 0,32 Z" fill="#c2410c"/>
          <path d="M 235,5 Q 260,-4 270,-10 Q 260,10 240,14 Z" fill="#f59e0b"/>

          <!-- ĐÈN LỒNG 1: GẤM ĐỎ RUBY (cx=65) -->
          <g transform="translate(65, 24)">
            <line x1="0" y1="0" x2="0" y2="18" stroke="#f59e0b" stroke-width="1.2"/>
            <g transform="translate(0, 18) rotate(${sway1.toFixed(1)})" filter="url(#lanternGlowOpt)">
              <rect x="-8" y="-3" width="16" height="5" rx="1.5" fill="#f59e0b"/>
              <ellipse cx="0" cy="24" rx="18" ry="24" fill="url(#silkRuby)"/>
              <!-- Nan vàng uốn lượn -->
              <path d="M 0,0 C -12,8 -12,40 0,48" fill="none" stroke="#fef08a" stroke-width="1.2"/>
              <path d="M 0,0 C 12,8 12,40 0,48" fill="none" stroke="#fef08a" stroke-width="1.2"/>
              <circle cx="0" cy="24" r="8" fill="#fef08a" filter="url(#softRay)"/>
              <rect x="-8" y="46" width="16" height="5" rx="1.5" fill="#f59e0b"/>
              <line x1="0" y1="51" x2="0" y2="84" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
            </g>
          </g>

          <!-- ĐÈN LỒNG 2: QUẢ TRÁM VÀNG (cx=135) -->
          <g transform="translate(135, 18)">
            <line x1="0" y1="0" x2="0" y2="16" stroke="#f59e0b" stroke-width="1.2"/>
            <g transform="translate(0, 16) rotate(${sway2.toFixed(1)})" filter="url(#lanternGlowOpt)">
              <polygon points="0,0 18,22 0,44 -18,22" fill="#f59e0b"/>
              <polygon points="0,0 8,22 0,44 -8,22" fill="#fef08a"/>
              <line x1="0" y1="44" x2="0" y2="74" stroke="#f59e0b" stroke-width="1.8"/>
            </g>
          </g>
        </g>

        <!-- 7. ĐOM ĐÓM & BỤI SAO VÀNG LƠ LỬNG -->
        <circle cx="280" cy="85" r="2.5" fill="#fef08a" filter="url(#softRay)" opacity="0.85"/>
        <circle cx="280" cy="85" r="1.0" fill="#ffffff"/>
        <circle cx="340" cy="115" r="2.0" fill="#fde047" filter="url(#softRay)" opacity="0.8"/>
        <circle cx="190" cy="110" r="2.2" fill="#f59e0b" filter="url(#softRay)" opacity="0.75"/>
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/vin_hero_test_svg_masterpiece.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/vin_hero_test_svg_masterpiece.webp');

  fs.writeFileSync(outPictures, animWebp);
  fs.writeFileSync(outPublic, animWebp);

  console.log(`HOÀN TẤT MẪU A (SVG QUANG HỌC SIÊU CẤP): ${(animWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Lưu tại: ${outPictures}`);
}

main().catch(console.error);
