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

// BỘ DEFS QUANG HỌC TIÊU CHUẨN MẪU A
const OPTICAL_DEFS = `
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
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#f59e0b" flood-opacity="0.85"/>
    </filter>
    <filter id="waterBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="dropShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.65"/>
    </filter>

    <!-- Hào quang Trăng Rằm tháng Tám khổng lồ -->
    <radialGradient id="optMoonHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.75"/>
      <stop offset="40%" stop-color="#f59e0b" stop-opacity="0.35"/>
      <stop offset="80%" stop-color="#d97706" stop-opacity="0.10"/>
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

    <!-- Vàng 24K Cung Đình Ánh Kim -->
    <linearGradient id="gold24k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#fef08a"/>
      <stop offset="45%" stop-color="#d97706"/>
      <stop offset="70%" stop-color="#ffffff"/>
      <stop offset="85%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#78350f"/>
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
`;

function renderCommonMoonAndGodRays(rayAngle = 0, cx = 445, cy = 55, r = 46) {
  return `
    <!-- HÀO QUANG KHUẾCH TÁN QUANG HỌC RỘNG LỚN -->
    <circle cx="${cx}" cy="${cy}" r="115" fill="url(#optMoonHalo)" filter="url(#megaHalo)"/>

    <!-- TIA SÁNG THỂ TÍCH (GOD RAYS) CHIẾU RỌI QUA SƯƠNG ĐÊM -->
    <g transform="translate(${cx}, ${cy}) rotate(${rayAngle.toFixed(1)})" filter="url(#softRay)">
      <polygon points="0,0 -220,150 -140,150" fill="url(#godRay1)"/>
      <polygon points="0,0 -340,150 -260,150" fill="url(#godRay2)"/>
      <polygon points="0,0 -160,150 -90,150" fill="url(#godRay1)"/>
    </g>

    <!-- MẶT TRĂNG RẰM THIÊN VĂN 3D SIÊU THỰC -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#optMoonSphere)" filter="url(#dropShadow)"/>
    <ellipse cx="${cx - 13}" cy="${cy - 10}" rx="14" ry="10" fill="#78350f" opacity="0.22" filter="url(#softRay)"/>
    <ellipse cx="${cx + 10}" cy="${cy + 7}" rx="16" ry="9" fill="#92400e" opacity="0.2" filter="url(#softRay)"/>
    <!-- Hố thiên thạch Tycho & Tia rẽ quạt -->
    <circle cx="${cx + 7}" cy="${cy + 19}" r="3" fill="#ffffff" opacity="0.8"/>
    <line x1="${cx + 7}" y1="${cy + 19}" x2="${cx - 15}" y2="${cy - 15}" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
    <line x1="${cx + 7}" y1="${cy + 19}" x2="${cx + 30}" y2="${cy - 7}" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 0.5}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>
  `;
}

function renderWaterRipples(waveY = 0, cx = 445) {
  return `
    <!-- MẶT HỒ HOÀNG KIM PHẢN CHIẾU ÁNH TRĂNG -->
    <rect x="0" y="145" width="${WIDTH}" height="55" fill="url(#lakeNight)"/>
    <ellipse cx="${cx}" cy="${165 + waveY}" rx="52" ry="8" fill="#fef08a" opacity="0.38" filter="url(#waterBlur)"/>
    <ellipse cx="${cx}" cy="${180 - waveY}" rx="38" ry="5" fill="#f59e0b" opacity="0.25" filter="url(#waterBlur)"/>
  `;
}

function renderFireflies(phase) {
  const f1X = 280 + Math.sin(phase) * 12;
  const f1Y = 85 + Math.cos(phase) * 8;
  const f2X = 340 + Math.cos(phase + 1) * 14;
  const f2Y = 115 + Math.sin(phase + 1) * 6;
  return `
    <circle cx="${f1X.toFixed(1)}" cy="${f1Y.toFixed(1)}" r="2.5" fill="#fef08a" filter="url(#softRay)" opacity="0.85"/>
    <circle cx="${f1X.toFixed(1)}" cy="${f1Y.toFixed(1)}" r="1.0" fill="#ffffff"/>
    <circle cx="${f2X.toFixed(1)}" cy="${f2Y.toFixed(1)}" r="2.0" fill="#fde047" filter="url(#softRay)" opacity="0.8"/>
    <circle cx="${f2X.toFixed(1)}" cy="${f2Y.toFixed(1)}" r="0.8" fill="#ffffff"/>
  `;
}

// ----------------------------------------------------
// 10 MẪU CÙNG ĐẲNG CẤP MẪU A (OPTICAL & VOLUMETRIC SVG)
// ----------------------------------------------------

// 1. MẪU 1: ĐÈN LỒNG GẤM CUNG ĐÌNH HỘI AN & TRĂNG RẰM QUANG HỌC
function getSuperModel1(t, phase) {
  const rayAngle = Math.sin(phase) * 4;
  const sway1 = Math.sin(phase) * 4.5;
  const sway2 = Math.cos(phase + 0.7) * 4.0;
  const waveY = Math.sin(phase * 2) * 2;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}</defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- MÁI NGÓI PHỐ CỔ & DÀN ĐÈN LỒNG HỘI AN -->
      <g transform="translate(0, 0)">
        <path d="M 0,0 L 260,0 Q 230,16 200,20 Q 100,26 0,28 Z" fill="#261205"/>
        <path d="M 0,22 Q 100,20 200,16 Q 230,12 255,2 Q 240,16 210,24 Q 100,30 0,32 Z" fill="#c2410c"/>
        <path d="M 235,5 Q 260,-4 270,-10 Q 260,10 240,14 Z" fill="url(#gold24k)"/>

        <!-- ĐÈN 1: GẤM ĐỎ RUBY (cx=65) -->
        <g transform="translate(65, 24)">
          <line x1="0" y1="0" x2="0" y2="18" stroke="url(#gold24k)" stroke-width="1.4"/>
          <g transform="translate(0, 18) rotate(${sway1.toFixed(1)})" filter="url(#lanternGlowOpt)">
            <rect x="-8" y="-3" width="16" height="5" rx="1.5" fill="url(#gold24k)"/>
            <ellipse cx="0" cy="24" rx="18" ry="24" fill="url(#silkRuby)"/>
            <path d="M 0,0 C -12,8 -12,40 0,48" fill="none" stroke="url(#gold24k)" stroke-width="1.2"/>
            <path d="M 0,0 C 12,8 12,40 0,48" fill="none" stroke="url(#gold24k)" stroke-width="1.2"/>
            <circle cx="0" cy="24" r="8" fill="#fef08a" filter="url(#softRay)"/>
            <rect x="-8" y="46" width="16" height="5" rx="1.5" fill="url(#gold24k)"/>
            <line x1="0" y1="51" x2="0" y2="84" stroke="url(#gold24k)" stroke-width="2" stroke-linecap="round"/>
          </g>
        </g>

        <!-- ĐÈN 2: QUẢ TRÁM VÀNG (cx=135) -->
        <g transform="translate(135, 18)">
          <line x1="0" y1="0" x2="0" y2="16" stroke="url(#gold24k)" stroke-width="1.4"/>
          <g transform="translate(0, 16) rotate(${sway2.toFixed(1)})" filter="url(#lanternGlowOpt)">
            <polygon points="0,0 18,22 0,44 -18,22" fill="#f59e0b"/>
            <polygon points="0,0 8,22 0,44 -8,22" fill="#fef08a"/>
            <line x1="0" y1="44" x2="0" y2="74" stroke="url(#gold24k)" stroke-width="2"/>
          </g>
        </g>
      </g>
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 2. MẪU 2: THỎ NGỌC LÔNG TUYẾT & ĐẦM SEN NGỌC BÍCH NỞ HOA
function getSuperModel2(t, phase) {
  const rayAngle = Math.sin(phase) * 3.5;
  const waveY = Math.sin(phase * 2) * 2;
  const earTilt = Math.sin(phase) * 4;
  const rabbitBreathe = Math.sin(phase) * 2;
  const lotusBreath = 1 + 0.05 * Math.sin(phase);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}
        <radialGradient id="rabbitFurOpt" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="65%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </radialGradient>
        <linearGradient id="lotusPinkOpt" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="40%" stop-color="#fbcfe8"/>
          <stop offset="80%" stop-color="#f43f5e"/>
          <stop offset="100%" stop-color="#be123c"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- ĐẦM SEN NGỌC BÍCH TRÊN MẶT NƯỚC (cx=160, cy=150) -->
      <g transform="translate(160, 150) scale(${lotusBreath})" filter="url(#dropShadow)">
        <ellipse cx="0" cy="12" rx="40" ry="10" fill="#047857" stroke="#10b981" stroke-width="1.2"/>
        <path d="M -26,6 C -32,-8 -12,-22 0,-26 C 12,-22 32,-8 26,6 Z" fill="url(#lotusPinkOpt)" opacity="0.85"/>
        <path d="M -18,6 C -22,-2 -8,-18 0,-22 C 8,-18 22,-2 18,6 Z" fill="url(#lotusPinkOpt)"/>
        <circle cx="0" cy="-6" r="5" fill="#fef08a" filter="url(#softRay)"/>
      </g>

      <!-- THỎ NGỌC LÔNG TUYẾT 3D CHÂN THẬT (cx=85, cy=132) -->
      <g transform="translate(85, ${132 + rabbitBreathe})" filter="url(#dropShadow)">
        <!-- Đám mây tiên nâng chân -->
        <ellipse cx="0" cy="20" rx="30" ry="8" fill="#ffffff" opacity="0.3"/>
        <ellipse cx="0" cy="8" rx="26" ry="20" fill="url(#rabbitFurOpt)"/>
        <circle cx="24" cy="4" r="8" fill="#ffffff" filter="url(#softRay)"/>
        <circle cx="-16" cy="-6" r="16" fill="url(#rabbitFurOpt)"/>
        <!-- Mắt ngọc ruby đỏ lóng lánh -->
        <circle cx="-21" cy="-8" r="3.8" fill="#e11d48"/>
        <circle cx="-23" cy="-10" r="1.4" fill="#ffffff"/>
        <!-- Đôi tai thỏ dài -->
        <g transform="translate(-16, -20) rotate(${-10 + earTilt})">
          <ellipse cx="0" cy="-14" rx="5" ry="18" fill="url(#rabbitFurOpt)"/>
          <ellipse cx="0" cy="-14" rx="2.8" ry="14" fill="#fbcfe8"/>
        </g>
        <g transform="translate(-8, -20) rotate(${10 - earTilt})">
          <ellipse cx="0" cy="-14" rx="5" ry="18" fill="url(#rabbitFurOpt)"/>
          <ellipse cx="0" cy="-14" rx="2.8" ry="14" fill="#fbcfe8"/>
        </g>
      </g>
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 3. MẪU 3: DÀN 5 ĐÈN LỒNG HỘI AN NGŨ SẮC DƯỚI MÁI NGÓI PHỐ CỔ
function getSuperModel3(t, phase) {
  const rayAngle = Math.sin(phase) * 4.0;
  const waveY = Math.sin(phase * 2) * 2;
  const lanterns = [
    { x: 50, color: '#ef4444', off: 0 },
    { x: 110, color: '#f59e0b', off: 0.8 },
    { x: 170, color: '#10b981', off: 1.6 },
    { x: 230, color: '#3b82f6', off: 2.4 },
    { x: 290, color: '#ec4899', off: 3.2 },
  ];

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}</defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- MÁI NGÓI CỔ KÍNH UỐN CONG -->
      <path d="M 0,0 L 350,0 Q 320,18 290,22 Q 160,28 0,30 Z" fill="#261205"/>
      <path d="M 0,24 Q 160,22 290,16 Q 325,12 355,2 Q 340,16 300,24 Q 160,32 0,34 Z" fill="#c2410c"/>
      <path d="M 335,5 Q 365,-4 375,-10 Q 365,10 345,14 Z" fill="url(#gold24k)"/>

      ${lanterns.map(l => {
        const sway = Math.sin(phase + l.off) * 5;
        const roofY = 26 - Math.sin((l.x / 350) * Math.PI) * 6;
        return `
          <g transform="translate(${l.x}, ${roofY})">
            <line x1="0" y1="0" x2="0" y2="16" stroke="url(#gold24k)" stroke-width="1.2"/>
            <g transform="translate(0, 16) rotate(${sway.toFixed(1)})" filter="url(#lanternGlowOpt)">
              <rect x="-7" y="-3" width="14" height="4" rx="1" fill="url(#gold24k)"/>
              <ellipse cx="0" cy="20" rx="15" ry="19" fill="${l.color}"/>
              <path d="M 0,0 C -10,6 -10,34 0,40" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.6"/>
              <circle cx="0" cy="20" r="7" fill="#fef08a" filter="url(#softRay)"/>
              <rect x="-7" y="38" width="14" height="4" rx="1" fill="url(#gold24k)"/>
              <line x1="0" y1="42" x2="0" y2="72" stroke="url(#gold24k)" stroke-width="1.8"/>
            </g>
          </g>
        `;
      }).join('')}
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 4. MẪU 4: ĐẦU LÂN SƯ RỒNG GIÁP VÀNG MẮT NGỌC BÍCH & PHÁO HOA
function getSuperModel4(t, phase) {
  const rayAngle = Math.sin(phase) * 3.8;
  const waveY = Math.sin(phase * 2) * 2;
  const lionBob = Math.sin(phase) * 3.5;
  const eyeBlink = Math.sin(phase * 3) > 0.85 ? 0.2 : 1.0;
  const fw1R = 14 + ((t * 2) % 1) * 32;
  const fw1A = Math.sin(((t * 2) % 1) * Math.PI);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}</defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- PHÁO HOA BUNG TỎA RỰC RỠ -->
      <g transform="translate(260, 50)" opacity="${fw1A.toFixed(2)}" filter="url(#softRay)">
        <circle cx="0" cy="0" r="${fw1R}" fill="none" stroke="url(#gold24k)" stroke-width="1.8" stroke-dasharray="3,4"/>
        <line x1="-${fw1R}" y1="0" x2="${fw1R}" y2="0" stroke="#ef4444" stroke-width="1.6"/>
        <line x1="0" y1="-${fw1R}" x2="0" y2="${fw1R}" stroke="#ef4444" stroke-width="1.6"/>
      </g>

      <!-- ĐẦU LÂN SƯ RỒNG HOÀNG GIA (cx=85, cy=115) -->
      <g transform="translate(85, ${115 + lionBob})" filter="url(#dropShadow)">
        <path d="M -34,-10 Q -46,-24 -24,-28 Q -8,-38 0,-26 Q 8,-38 24,-28 Q 46,-24 34,-10 Z" fill="#ef4444"/>
        <path d="M -24,-6 Q -34,-18 -16,-20 Q -4,-28 0,-18 Q 4,-28 16,-20 Q 34,-18 24,-6 Z" fill="url(#gold24k)"/>
        <ellipse cx="0" cy="4" rx="30" ry="24" fill="url(#silkRuby)"/>
        <polygon points="0,-24 -5,-8 5,-8" fill="url(#gold24k)" stroke="#b45309" stroke-width="1"/>
        <!-- Mắt lân ngọc bích phát sáng -->
        <ellipse cx="-12" cy="0" rx="8" ry="9" fill="#ffffff"/>
        <circle cx="-12" cy="0" r="5" fill="#10b981" opacity="${eyeBlink}" filter="url(#softRay)"/>
        <ellipse cx="12" cy="0" rx="8" ry="9" fill="#ffffff"/>
        <circle cx="12" cy="0" r="5" fill="#10b981" opacity="${eyeBlink}" filter="url(#softRay)"/>
        <circle cx="0" cy="10" r="6" fill="#ea580c"/>
        <path d="M -18,12 Q -36,22 -28,36" fill="none" stroke="url(#gold24k)" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M 18,12 Q 36,22 28,36" fill="none" stroke="url(#gold24k)" stroke-width="2.6" stroke-linecap="round"/>
      </g>
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 5. MẪU 5: ĐÈN CÁ CHÉP VƯỢT VŨ MÔN HÓA RỒNG TRÊN SÓNG NƯỚC
function getSuperModel5(t, phase) {
  const rayAngle = Math.sin(phase) * 4.0;
  const waveY = Math.sin(phase * 2) * 2;
  const fishY = Math.sin(phase) * 7;
  const fishRot = Math.cos(phase) * 6;
  const tailWag = Math.sin(phase * 3) * 12;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}</defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- ĐÈN CÁ CHÉP HÓA RỒNG VƯƠN CAO (cx=95, cy=115) -->
      <g transform="translate(95, ${115 + fishY}) rotate(${fishRot.toFixed(1)})" filter="url(#dropShadow)">
        <ellipse cx="0" cy="0" rx="34" ry="18" fill="url(#gold24k)"/>
        <ellipse cx="-4" cy="0" rx="22" ry="12" fill="#ea580c"/>
        <path d="M -8,-8 Q 0,-3 -8,2 Q 0,7 -8,12" fill="none" stroke="url(#gold24k)" stroke-width="1.4"/>
        <circle cx="18" cy="-4" r="3.5" fill="#0f172a"/>
        <circle cx="19.5" cy="-5" r="1.2" fill="#ffffff"/>
        <!-- Đuôi cá vẫy sóng -->
        <g transform="translate(-30, 0) rotate(${tailWag.toFixed(1)})">
          <path d="M 0,0 Q -20,-18 -30,-10 Q -16,0 -30,10 Q -20,18 0,0" fill="#f97316"/>
        </g>
        <!-- Râu rồng vàng óng phát sáng -->
        <path d="M 26,-2 Q 42,-14 50,-6" fill="none" stroke="url(#gold24k)" stroke-width="2.2" filter="url(#softRay)"/>
        <path d="M 26,2 Q 42,14 50,6" fill="none" stroke="url(#gold24k)" stroke-width="2.2" filter="url(#softRay)"/>
      </g>
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 6. MẪU 6: ĐÊM HỘI THẢ THIÊN ĐĂNG KHỔNG MINH LƠ LỬNG
function getSuperModel6(t, phase) {
  const rayAngle = Math.sin(phase) * 3.5;
  const waveY = Math.sin(phase * 2) * 2;
  const lanterns = [
    { x: 50, speed: 0.85, scale: 0.75, delay: 0 },
    { x: 105, speed: 1.15, scale: 1.25, delay: 0.2 },
    { x: 165, speed: 0.75, scale: 0.65, delay: 0.5 },
    { x: 225, speed: 1.05, scale: 1.05, delay: 0.1 },
    { x: 285, speed: 1.25, scale: 0.85, delay: 0.7 },
  ];

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}</defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- THIÊN ĐĂNG KHỔNG MINH LƠ LỬNG TRÊN KHÔNG -->
      ${lanterns.map(l => {
        const y = 210 - (((t * l.speed + l.delay) % 1) * 230);
        const x = l.x + Math.sin(phase + l.delay * 4) * 8;
        const alpha = Math.sin((Math.max(0, Math.min(200, y)) / 200) * Math.PI);
        return `
          <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${l.scale})" opacity="${alpha.toFixed(2)}" filter="url(#dropShadow)">
            <ellipse cx="0" cy="12" rx="20" ry="22" fill="#f59e0b" opacity="0.4" filter="url(#softRay)"/>
            <path d="M -10,0 L -14,24 L 14,24 L 10,0 Z" fill="#ea580c"/>
            <ellipse cx="0" cy="24" rx="14" ry="4" fill="url(#gold24k)"/>
            <circle cx="0" cy="18" r="4" fill="#fef08a" filter="url(#softRay)"/>
          </g>
        `;
      }).join('')}
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 7. MẪU 7: BÁNH NƯỚNG HOÀNG KIM 3D CHỮ PHÚC & CHÉN TRÀ SEN
function getSuperModel7(t, phase) {
  const rayAngle = Math.sin(phase) * 3.8;
  const waveY = Math.sin(phase * 2) * 2;
  const leafY = 115 + (t * 85);
  const leafX = 265 + Math.sin(phase) * 16;
  const steamY = Math.sin(phase) * 4;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}
        <radialGradient id="crustOpt" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="25%" stop-color="#fef08a"/>
          <stop offset="55%" stop-color="#f59e0b"/>
          <stop offset="85%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#78350f"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- BÁNH TRUNG THU 3D CHẠM NỔI CHỮ PHÚC (cx=90, cy=130) -->
      <g transform="translate(90, 130)" filter="url(#dropShadow)">
        <ellipse cx="0" cy="18" rx="38" ry="15" fill="#000000" opacity="0.45"/>
        <ellipse cx="0" cy="12" rx="36" ry="16" fill="#78350f"/>
        <ellipse cx="0" cy="0" rx="34" ry="15" fill="url(#crustOpt)"/>
        <ellipse cx="0" cy="0" rx="24" ry="10" fill="none" stroke="url(#gold24k)" stroke-width="1.8"/>
        <circle cx="0" cy="0" r="6.5" fill="url(#gold24k)"/>
      </g>

      <!-- CHÉN TRÀ SEN BỐC KHÓI THƠM LƯỢN SÓNG (cx=165, cy=142) -->
      <g transform="translate(165, 142)" filter="url(#dropShadow)">
        <ellipse cx="0" cy="10" rx="18" ry="7" fill="#78350f"/>
        <ellipse cx="0" cy="2" rx="15" ry="6" fill="#065f46"/>
        <path d="M -4,-2 Q 0,${-14 + steamY} 6,-26" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.65" stroke-linecap="round"/>
      </g>

      <!-- LÁ THU VÀNG BAY -->
      <g transform="translate(${leafX.toFixed(1)}, ${leafY.toFixed(1)})" opacity="0.85" filter="url(#softRay)">
        <path d="M 0,-8 Q 6,-5 7,0 Q 3,6 0,8 Q -3,6 -7,0 Q -6,-5 0,-8 Z" fill="#f59e0b"/>
      </g>
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 8. MẪU 8: ĐÈN KÉO QUÂN HOÀNG GIA CHIẾU BÓNG & DIỀM GẤM
function getSuperModel8(t, phase) {
  const rayAngle = Math.sin(phase) * 3.8;
  const waveY = Math.sin(phase * 2) * 2;
  const cosRot = Math.cos(t * Math.PI * 2);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}</defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- DIỀM GẤM CUNG ĐÌNH DÁT VÀNG -->
      <path d="M 0,0 L 540,0 L 540,16 Q 472,24 405,16 Q 337,8 270,16 Q 202,24 135,16 Q 67,8 0,16 Z" fill="#991b1b"/>
      <line x1="0" y1="16" x2="540" y2="16" stroke="url(#gold24k)" stroke-width="2"/>

      <!-- ĐÈN KÉO QUÂN LỤC GIÁC 3D (cx=95, cy=112) -->
      <g transform="translate(95, 112)" filter="url(#dropShadow)">
        <polygon points="0,-42 34,-26 -34,-26" fill="url(#gold24k)" stroke="#b45309" stroke-width="1"/>
        <rect x="-28" y="-26" width="56" height="48" fill="#fef08a" opacity="0.9" rx="3" filter="url(#softRay)"/>
        <rect x="-28" y="-26" width="56" height="48" fill="none" stroke="url(#gold24k)" stroke-width="1.8" rx="3"/>
        <g transform="scale(${cosRot.toFixed(2)}, 1)">
          <circle cx="0" cy="-6" r="6" fill="#1e1b4b"/>
          <line x1="0" y1="0" x2="0" y2="14" stroke="#1e1b4b" stroke-width="3"/>
          <line x1="0" y1="3" x2="10" y2="-3" stroke="#1e1b4b" stroke-width="1.8"/>
        </g>
        <rect x="-32" y="22" width="64" height="8" rx="2" fill="url(#gold24k)"/>
      </g>
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 9. MẪU 9: CÂY ĐA CỔ THỤ NGHÌN NĂM & CHÚ CUỘI THỔI SÁO
function getSuperModel9(t, phase) {
  const rayAngle = Math.sin(phase) * 3.8;
  const waveY = Math.sin(phase * 2) * 2;
  const cuoiBob = Math.sin(phase) * 2.5;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}</defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- CÂY ĐA ĐẠI THỤ NGHÌN NĂM (cx=70, cy=105) -->
      <g transform="translate(70, 105)" filter="url(#dropShadow)">
        <circle cx="-20" cy="-55" r="32" fill="#14532d" opacity="0.9"/>
        <circle cx="8" cy="-65" r="36" fill="#15803d" opacity="0.95"/>
        <path d="M -18,45 Q -6,0 4,-35 Q 12,0 20,45 Z" fill="#78350f"/>
        <path d="M -12,5 Q -18,25 -14,45" fill="none" stroke="#92400e" stroke-width="2"/>
        <path d="M 12,5 Q 16,25 14,45" fill="none" stroke="#92400e" stroke-width="2"/>

        <g transform="translate(22, ${20 + cuoiBob})">
          <ellipse cx="0" cy="2" rx="9" ry="11" fill="#b45309"/>
          <circle cx="0" cy="-12" r="6" fill="#fef08a"/>
          <line x1="-12" y1="-8" x2="16" y2="-13" stroke="#16a34a" stroke-width="2.4" stroke-linecap="round"/>
        </g>
      </g>

      <!-- DẢI NỐT NHẠC ÁNH SAO NỐI TẬN CUNG TRĂNG -->
      <path d="M 115,92 Q 280,25 425,65" fill="none" stroke="url(#gold24k)" stroke-width="2.5" stroke-dasharray="5,5" filter="url(#softRay)"/>
      ${renderFireflies(phase)}
    </svg>
  `;
}

// 10. MẪU 10: CHỊ HẰNG NGA BAY LƯỢN & DẢI LỤA TIÊN ĐÀO HỒNG
function getSuperModel10(t, phase) {
  const rayAngle = Math.sin(phase) * 3.8;
  const waveY = Math.sin(phase * 2) * 2;
  const hangBob = Math.sin(phase) * 4.0;
  const ribbonWave = Math.sin(phase) * 10;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${OPTICAL_DEFS}
        <linearGradient id="silkFairyOpt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.95"/>
          <stop offset="50%" stop-color="#fef08a" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#fb7185" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#optSky)"/>
      ${renderCommonMoonAndGodRays(rayAngle)}
      ${renderWaterRipples(waveY)}

      <!-- DẢI LỤA TIÊN ĐÀO HỒNG TRẢI RỘNG TOÀN BANNER -->
      <path d="M 35,110 Q 220,${32 + ribbonWave} 405,${65 + hangBob}" fill="none" stroke="url(#silkFairyOpt)" stroke-width="3.2" stroke-linecap="round" filter="url(#softRay)"/>

      <!-- CHỊ HẰNG NGA BAY LƯỢN TRÊN MÂY (cx=410, cy=65) -->
      <g transform="translate(410, ${65 + hangBob})" filter="url(#dropShadow)">
        <ellipse cx="6" cy="18" rx="16" ry="6" fill="#ffffff" opacity="0.95" filter="url(#softRay)"/>
        <circle cx="0" cy="15" r="6" fill="#ffffff"/>
        <path d="M -6,4 C -10,14 -14,24 -4,26 C 6,26 10,18 8,4 Z" fill="#f472b6" stroke="url(#gold24k)" stroke-width="0.8"/>
        <ellipse cx="1" cy="0" rx="4.5" ry="6" fill="#ffffff"/>
        <circle cx="2" cy="-10" r="4.5" fill="#fef08a"/>
        <ellipse cx="0.5" cy="-15" rx="4.5" ry="3" fill="#1e293b"/>
      </g>
      ${renderFireflies(phase)}
    </svg>
  `;
}

const SUPER_MODELS = [
  getSuperModel1,
  getSuperModel2,
  getSuperModel3,
  getSuperModel4,
  getSuperModel5,
  getSuperModel6,
  getSuperModel7,
  getSuperModel8,
  getSuperModel9,
  getSuperModel10,
];

async function generateModel(modelIdx) {
  const modelNum = modelIdx + 1;
  console.log(`Đang render Mẫu A Siêu Cấp Model ${modelNum}/10...`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;
    const svgStr = SUPER_MODELS[modelIdx](t, phase);

    const webpBuf = await sharp(Buffer.from(svgStr))
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animWebp = muxAnimatedWebP(frames, DELAY, 0);

  const filePictures = path.resolve(__dirname, `../pictures/vin_hero_card_bg_v${modelNum}_trung_thu.webp`);
  const filePublic = path.resolve(__dirname, `../public/assets/vin_hero_card_bg_v${modelNum}_trung_thu.webp`);

  fs.writeFileSync(filePictures, animWebp);
  fs.writeFileSync(filePublic, animWebp);

  if (modelNum === 1) {
    fs.writeFileSync(path.resolve(__dirname, '../pictures/vin_hero_card_bg_trung_thu.webp'), animWebp);
    fs.writeFileSync(path.resolve(__dirname, '../public/assets/vin_hero_card_bg_trung_thu.webp'), animWebp);
  }

  console.log(`Hoàn tất Model ${modelNum}: ${(animWebp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log('=== BẮT ĐẦU NÂNG CẤP TOÀN BỘ 10 MẪU THEO CHUẨN MẪU A (OPTICAL & VOLUMETRIC SVG) ===');
  for (let i = 0; i < 10; i++) {
    await generateModel(i);
  }
  console.log('=== ĐÃ XUẤT SẮC HOÀN THÀNH TOÀN BỘ 10 MẪU THEO PHONG CÁCH MẪU A! ===');
}

main().catch(console.error);
