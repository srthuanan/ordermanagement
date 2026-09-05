const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 600;
const HEIGHT = 160;
const FRAMES = 30;
const DELAY = 80;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 80, loopCount = 0, width = WIDTH, height = HEIGHT) {
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
    writeUInt24LE(anmfHeader, width - 1, 6);
    writeUInt24LE(anmfHeader, height - 1, 9);
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
  writeUInt24LE(vp8xHeader, width - 1, 12);
  writeUInt24LE(vp8xHeader, height - 1, 15);

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

// -----------------------------------------------------------------------------
// 🏎️ CONCEPT LOGO: VINFAST SHOWROOM 3S THUẬN AN (LUXURY 3D CHROME & SAPPHIRE EDITION)
// - Biểu tượng cánh chim VinFast chữ "V" mạ Liquid Chrome vát đa giác 3D
// - Vệt sáng phản chiếu ánh kim lướt qua bề mặt logo
// - Chữ VINFAST dập nổi kim loại mạ bạc sáng bóng
// - Huy hiệu THUẬN AN mạ vàng 24K & Dải đèn LED nhận diện thương hiệu
// -----------------------------------------------------------------------------
function renderConceptLogoFrame(frameIndex) {
  const progress = frameIndex / (FRAMES - 1);
  const glintX = (progress * (WIDTH + 200) - 100).toFixed(1);

  // V-Emblem Geometry (Tọa độ cánh chim chữ V VinFast)
  // Left Wing Outer
  const vLeftOuter = "M 80,30 L 105,95 L 90,95 L 45,30 Z";
  // Left Wing Inner Chamfer
  const vLeftInner = "M 80,30 L 105,95 L 98,95 L 65,30 Z";

  // Right Wing Outer
  const vRightOuter = "M 130,30 L 105,95 L 120,95 L 165,30 Z";
  // Right Wing Inner Chamfer
  const vRightInner = "M 130,30 L 105,95 L 112,95 L 145,30 Z";

  // Center Shield / Crest
  const vCenterBottom = "M 105,95 L 96,120 L 105,128 L 114,120 Z";

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Liquid Chrome Metal Gradient (Cánh chim Chrome Bạc) -->
        <linearGradient id="chromeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#cbd5e1" />
          <stop offset="50%" stop-color="#64748b" />
          <stop offset="75%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>

        <linearGradient id="chromeRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#94a3b8" />
          <stop offset="60%" stop-color="#475569" />
          <stop offset="85%" stop-color="#f1f5f9" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>

        <linearGradient id="chromeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>

        <!-- 24K Luxury Gold Metal (Huy hiệu Thuận An mạ vàng) -->
        <linearGradient id="goldBadge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#92400e" />
          <stop offset="25%" stop-color="#facc15" />
          <stop offset="50%" stop-color="#fffbeb" />
          <stop offset="75%" stop-color="#facc15" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>

        <!-- Laser Glint Sweep -->
        <linearGradient id="glintGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>

        <!-- Drop Shadows & Glows -->
        <filter id="logoShadow" x="-10%" y="-20%" width="130%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.6"/>
        </filter>
        <filter id="badgeShadow" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.7"/>
        </filter>
        <filter id="laserBeam" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- ================= 1. BIỂU TƯỢNG CÁNH CHIM VINFAST 3D CHROME ================= -->
      <g filter="url(#logoShadow)">
        <!-- Outer Left Wing -->
        <path d="${vLeftOuter}" fill="url(#chromeLeft)" stroke="#ffffff" stroke-width="1"/>
        <path d="${vLeftInner}" fill="url(#chromeHighlight)" opacity="0.6"/>

        <!-- Outer Right Wing -->
        <path d="${vRightOuter}" fill="url(#chromeRight)" stroke="#ffffff" stroke-width="1"/>
        <path d="${vRightInner}" fill="url(#chromeHighlight)" opacity="0.4"/>

        <!-- Bottom V-Tip Shield -->
        <path d="${vCenterBottom}" fill="url(#chromeLeft)" stroke="#94a3b8" stroke-width="1"/>

        <!-- Inner Ambient Glow Line -->
        <path d="M 50,32 L 105,94 L 160,32" fill="none" stroke="#38bdf8" stroke-width="2.5" opacity="0.85"/>
      </g>

      <!-- ================= 2. TYPOGRAPHY THƯƠNG HIỆU: VINFAST ================= -->
      <g filter="url(#logoShadow)">
        <!-- Chữ VINFAST kim loại dập nổi -->
        <text x="185" y="78" 
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="52" font-weight="900" 
              letter-spacing="4"
              fill="url(#chromeLeft)"
              stroke="#ffffff" stroke-width="0.8">
          VINFAST
        </text>

        <!-- Đường kẻ ánh sáng kim loại chân chữ VINFAST -->
        <line x1="185" y1="92" x2="480" y2="92" stroke="url(#chromeHighlight)" stroke-width="3" stroke-linecap="round"/>
      </g>

      <!-- ================= 3. HUY HIỆU: THUẬN AN • SHOWROOM 3S ================= -->
      <g filter="url(#badgeShadow)">
        <!-- Nền dải Badge mạ vàng 24K vát cạnh -->
        <rect x="185" y="102" width="375" height="34" rx="6" fill="#0f172a" stroke="url(#goldBadge)" stroke-width="2"/>

        <!-- Chữ THUẬN AN mạ vàng nổi bật -->
        <text x="200" y="125" 
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="18" font-weight="900" 
              letter-spacing="2"
              fill="url(#goldBadge)">
          THUẬN AN
        </text>

        <!-- Dấu phân cách sao vàng 3D -->
        <text x="325" y="124" font-size="14" fill="#facc15">★</text>

        <!-- Phụ đề SHOWROOM 3S CHÍNH HÃNG -->
        <text x="345" y="124" 
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="13.5" font-weight="800" 
              letter-spacing="1.5"
              fill="#f8fafc">
          SHOWROOM 3S PREMIUM
        </text>
      </g>

      <!-- ================= 4. VỆT SÁNG LASER PHẢN CHIẾU QUÉT QUA ================= -->
      <g style="mix-blend-mode: overlay;">
        <rect x="${glintX}" y="10" width="80" height="140" fill="url(#glintGlow)" transform="skewX(-25)"/>
      </g>

      <!-- Đốm sáng kim cương lấp lánh ở chóp cánh chim -->
      <g transform="translate(48, 30)">
        <polygon points="0,-7 2,-2 7,0 2,2 0,7 -2,2 -7,0 -2,-2" fill="#ffffff"/>
        <circle cx="0" cy="0" r="1.5" fill="#38bdf8"/>
      </g>
      <g transform="translate(162, 30)">
        <polygon points="0,-7 2,-2 7,0 2,2 0,7 -2,2 -7,0 -2,-2" fill="#ffffff"/>
        <circle cx="0" cy="0" r="1.5" fill="#38bdf8"/>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🏎️ Rendering Concept Logo (VinFast Thuận An 3S Premium Edition)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderConceptLogoFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 90, alphaQuality: 95, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  // Lưu file riêng biệt, TUYỆT ĐỐI KHÔNG ĐỤNG CHẠM ĐẾN logo_showroom_thuan_an.webp gốc
  const previewPaths = [
    path.join(__dirname, '../public/assets/logo_showroom_thuan_an_concept_preview.webp'),
    path.join(__dirname, '../pictures/logo_showroom_thuan_an_concept_preview.webp')
  ];

  for (const p of previewPaths) {
    fs.writeFileSync(p, animatedWebp);
  }

  console.log(`🎉 Concept Logo rendered successfully:`);
  console.log(`👉 Preview Path: ${previewPaths[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
