const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn Panorama Full HD: 1920 x 1080 px (16:9 Retina)
const WIDTH = 1920;
const HEIGHT = 1080;
const TOTAL_FRAMES = 16;
const DELAY = 100; // 100ms/frame = 1.6s chu kỳ tuần hoàn mượt mà vô tận

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 100, loopCount = 0) {
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
  vp8xHeader[8] = 0x12; // Animated + Alpha
  writeUInt24LE(vp8xHeader, WIDTH - 1, 12);
  writeUInt24LE(vp8xHeader, HEIGHT - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8); // Transparent canvas
  animChunk.writeUInt16LE(loopCount, 12); // 0 = Infinite loop

  const bodyData = Buffer.concat([vp8xHeader, animChunk, ...anmfChunks]);
  const riffSize = 4 + bodyData.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(riffSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, bodyData]);
}

function renderStar(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#EAB308"/>
      <circle cx="0" cy="0" r="${(inner * 0.7).toFixed(1)}" fill="#FFFFFF"/>
    </g>
  `;
}

function renderFrameSvg(f) {
  const t = f / TOTAL_FRAMES;
  const phase = t * Math.PI * 2;

  // Dao động lồng đèn đung đưa nhẹ
  const sway1 = Math.sin(phase) * 3.2;
  const sway2 = Math.sin(phase + 1.2) * 2.8;
  const sway3 = Math.sin(phase + 2.4) * 3.5;
  const sway4 = Math.sin(phase + 3.6) * 2.6;

  // Quầng sáng vầng trăng rằm nhịp thở
  const moonGlowR = 340 + 20 * Math.sin(phase);
  const moonGlowOpacity = 0.5 + 0.12 * Math.sin(phase);

  // Mây tơ trôi lượn sóng
  const cloudShiftX = Math.sin(phase) * 18;
  const cloudShiftY = Math.cos(phase) * 5;

  // Chim hạc vỗ cánh nhấp nhô
  const craneY1 = Math.sin(phase) * 8;
  const craneY2 = Math.sin(phase + 1.5) * 6;

  // Mặt nước dập dềnh và hoa đăng sen bập bềnh
  const waterWaveY = Math.sin(phase) * 4;
  const lotusY1 = Math.sin(phase) * 5;
  const lotusY2 = Math.sin(phase + 1.8) * 4.5;
  const lotusY3 = Math.sin(phase + 3.2) * 5.2;
  const lotusY4 = Math.sin(phase + 4.5) * 4.2;
  const lotusY5 = Math.sin(phase + 2.1) * 4.8;

  // Thỏ Ngọc thở nhẹ nhấp nhô tai
  const bunnyY = Math.sin(phase) * 2.5;
  const bunnyEarRot = Math.sin(phase) * 2.0;

  // Ánh sao hoàng kim chớp tắt luân phiên
  const starOp1 = 0.25 + 0.35 * Math.sin(phase);
  const starOp2 = 0.25 + 0.35 * Math.sin(phase + 2.0);
  const starOp3 = 0.25 + 0.35 * Math.sin(phase + 4.0);

  return `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient: Trắng ngọc trai ấm dịu -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCFDFF"/>
      <stop offset="35%" stop-color="#F8FAFD"/>
      <stop offset="70%" stop-color="#FFFDF6"/>
      <stop offset="100%" stop-color="#FAF7EE"/>
    </linearGradient>

    <!-- Quầng sáng Vầng Trăng Hoàng Kim -->
    <radialGradient id="moonAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="${moonGlowOpacity.toFixed(2)}"/>
      <stop offset="45%" stop-color="#FEF9C3" stop-opacity="${(moonGlowOpacity * 0.55).toFixed(2)}"/>
      <stop offset="80%" stop-color="#FEF08A" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FEF08A" stop-opacity="0"/>
    </radialGradient>

    <!-- Thân Vầng Trăng -->
    <linearGradient id="moonBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="25%" stop-color="#FEFCE8"/>
      <stop offset="70%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#FDE047"/>
    </linearGradient>

    <linearGradient id="moonCrater" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EAB308" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#CA8A04" stop-opacity="0.06"/>
    </linearGradient>

    <!-- Gradient Đèn lồng -->
    <linearGradient id="lanternRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCA5A5"/>
      <stop offset="50%" stop-color="#F87171"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
    <linearGradient id="lanternGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <linearGradient id="lanternLotus" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBCFE8"/>
      <stop offset="50%" stop-color="#F472B6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
    <linearGradient id="lanternJade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A7F3D0"/>
      <stop offset="50%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>

    <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#F59E0B" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>

    <!-- Mây tơ thủy mặc -->
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F1F5F9" stop-opacity="0"/>
      <stop offset="25%" stop-color="#FEF9C3" stop-opacity="0.4"/>
      <stop offset="75%" stop-color="#FEE2E2" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#F1F5F9" stop-opacity="0"/>
    </linearGradient>

    <!-- Mặt nước hồ sông Hoài -->
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC" stop-opacity="0"/>
      <stop offset="35%" stop-color="#F1F5F9" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#E2E8F0" stop-opacity="0.85"/>
    </linearGradient>

    <!-- Cánh hoa sen thả đăng -->
    <linearGradient id="petalGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#F472B6" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#FBCFE8" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.95"/>
    </linearGradient>
  </defs>

  <!-- 1. NỀN CHỦ ĐẠO -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>

  <!-- 2. CÀNH LIỄU / TRÚC TƠ BUÔNG MỀM Ở GÓC TRÊN TRÁI & PHẢI -->
  <g opacity="0.35" stroke="#78350F" stroke-width="1.2" fill="none">
    <path d="M 0,80 Q 120,130 180,190 M 180,190 Q 220,240 250,300"/>
    <path d="M 0,120 Q 80,165 130,220 M 130,220 Q 160,260 190,320"/>
  </g>

  <!-- 3. VẦNG TRĂNG RẰM ĐẠI NGUYỆT Ở GÓC TRÊN PHẢI (Hạ xuống cy=370 để luôn hiện trọn vẹn cả vầng trăng) -->
  <circle cx="1650" cy="370" r="${moonGlowR.toFixed(1)}" fill="url(#moonAura)"/>
  <circle cx="1650" cy="370" r="190" fill="url(#moonAura)" opacity="0.85"/>
  <circle cx="1650" cy="370" r="115" fill="url(#moonBody)" filter="drop-shadow(0 0 35px rgba(254, 240, 138, 0.65))"/>
  <path d="M 1620,325 Q 1640,310 1660,330 T 1680,360 Q 1670,395 1635,400 T 1605,375 Z" fill="url(#moonCrater)"/>
  <circle cx="1690" cy="340" r="16" fill="url(#moonCrater)"/>
  <circle cx="1615" cy="390" r="14" fill="url(#moonCrater)"/>

  <!-- THỎ NGỌC DƯỚI TRĂNG RẰM (Ngắm trăng rằm, nhấp nhô nhẹ) -->
  <g transform="translate(1770, ${(410 + bunnyY).toFixed(1)})" opacity="0.88">
    <ellipse cx="0" cy="18" rx="16" ry="14" fill="#FFFFFF" filter="drop-shadow(0 2px 4px rgba(234, 179, 8, 0.2))"/>
    <ellipse cx="-7" cy="8" rx="10" ry="10" fill="#FFFFFF"/>
    <circle cx="-11" cy="0" r="8" fill="#FFFFFF"/>
    <circle cx="-13" cy="-1" r="1.3" fill="#F472B6"/>
    <g transform="rotate(${bunnyEarRot.toFixed(1)}, -11, -7)">
      <ellipse cx="-13" cy="-14" rx="3" ry="9" fill="#FFFFFF"/>
      <ellipse cx="-13" cy="-14" rx="1.5" ry="6" fill="#FBCFE8"/>
      <ellipse cx="-8" cy="-13" rx="2.8" ry="8" fill="#FFFFFF" transform="rotate(15, -8, -13)"/>
      <ellipse cx="-8" cy="-13" rx="1.4" ry="5.5" fill="#FBCFE8" transform="rotate(15, -8, -13)"/>
    </g>
    <circle cx="15" cy="20" r="4" fill="#FFFFFF"/>
  </g>

  <!-- 4. MÂY TƠ THỦY MẶC TRÔI LỮNG LỜ -->
  <g transform="translate(${cloudShiftX.toFixed(1)}, ${cloudShiftY.toFixed(1)})" opacity="0.85">
    <path d="M 1250,400 C 1370,365 1480,415 1600,390 C 1720,365 1830,410 1950,385 C 1850,425 1740,405 1630,420 C 1510,435 1410,410 1250,400 Z" fill="url(#cloudGrad)"/>
    <path d="M 650,315 C 800,280 930,330 1070,300 C 1210,275 1330,320 1480,295 C 1350,335 1220,315 1100,330 C 960,345 840,325 650,315 Z" fill="url(#cloudGrad)" opacity="0.65"/>
    <path d="M 50,290 C 190,255 320,305 450,275 C 580,250 700,295 840,270 C 720,310 600,290 480,305 C 350,320 240,300 50,290 Z" fill="url(#cloudGrad)" opacity="0.55"/>
  </g>

  <!-- 5. ĐÀN CHIM HẠC / ÉN VÀNG BAY VỀ PHÍA TRĂNG -->
  <g fill="#D97706" opacity="0.42">
    <g transform="translate(1180, ${(350 + craneY1).toFixed(1)})">
      <path d="M 0,0 C 22,-14 44,-8 66,-17 C 53,-5 42,1 35,10 C 48,15 61,13 77,10 C 57,20 40,20 28,13 C 18,21 9,24 -4,20 C 2,13 2,6 0,0 Z"/>
    </g>
    <g transform="translate(960, ${(310 + craneY2).toFixed(1)}) scale(0.85)">
      <path d="M 0,0 C 22,-14 44,-8 66,-17 C 53,-5 42,1 35,10 C 48,15 61,13 77,10 C 57,20 40,20 28,13 C 18,21 9,24 -4,20 C 2,13 2,6 0,0 Z"/>
    </g>
    <g transform="translate(750, ${(340 + craneY1 * 0.7).toFixed(1)}) scale(0.68)">
      <path d="M 0,0 C 22,-14 44,-8 66,-17 C 53,-5 42,1 35,10 C 48,15 61,13 77,10 C 57,20 40,20 28,13 C 18,21 9,24 -4,20 C 2,13 2,6 0,0 Z"/>
    </g>
  </g>

  <!-- 6. DÂY LỒNG ĐÈN HỘI AN ĐƯỢC HẠ THẤP XUỐNG y=200 ĐỂ KHÔNG BỊ THANH MENU CHE MẤT ĐẦU -->
  <!-- Dây tơ uốn lượn liên tục buông từ trên cao xuống -->
  <path d="M -20,180 Q 120,235 260,195 T 520,205 T 780,190 T 1040,210 T 1300,195 T 1560,208 T 1820,190 T 1940,200" fill="none" stroke="#D97706" stroke-width="1.2" opacity="0.35"/>

  <!-- Đèn 1 (x=90, y=210): Đèn quả trám đỏ san hô (Thân đèn trọn vẹn trong thẻ xe) -->
  <g transform="translate(90, 205) rotate(${sway1.toFixed(2)})" opacity="0.94">
    <line x1="0" y1="-35" x2="0" y2="0" stroke="#B45309" stroke-width="1.2" opacity="0.6"/>
    <circle cx="0" cy="30" r="42" fill="url(#lanternGlow)"/>
    <rect x="-11" y="-3" width="22" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-9" y="55" width="18" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 20,14 20,40 0,58 C -20,40 -20,14 0,0 Z" fill="url(#lanternRed)"/>
    <path d="M 0,0 C 9,14 9,40 0,58 C -9,40 -9,14 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,60 L 0,95 M -3,60 L -2,90 M 3,60 L 2,90" stroke="#F59E0B" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- Đèn 2 (x=290, y=220): ĐÈN ÔNG SAO 5 CÁNH NGŨ SẮC TRUYỀN THỐNG (Hiện trọn vẹn cả ngôi sao và vòng tre) -->
  <g transform="translate(290, 220) rotate(${sway2.toFixed(2)})" opacity="0.95">
    <line x1="0" y1="-40" x2="0" y2="0" stroke="#B45309" stroke-width="1.2" opacity="0.6"/>
    <circle cx="0" cy="25" r="45" fill="url(#lanternGlow)"/>
    <circle cx="0" cy="25" r="28" fill="none" stroke="#F59E0B" stroke-width="1.5" opacity="0.7"/>
    <g transform="translate(0, 25) scale(1.6)">
      <polygon points="0,-16 4.7,-4.8 16.2,-4.8 7.1,2.5 10.4,14 0,7 -10.4,14 -7.1,2.5 -16.2,-4.8 -4.7,-4.8" fill="url(#lanternRed)"/>
      <polygon points="0,-16 4.7,-4.8 16.2,-4.8 7.1,2.5 10.4,14 0,7 -10.4,14 -7.1,2.5 -16.2,-4.8 -4.7,-4.8" fill="none" stroke="#FDE047" stroke-width="0.8"/>
      <circle cx="0" cy="0" r="3.5" fill="#FEF08A"/>
    </g>
    <path d="M 0,55 L 0,92 M -3,55 L -2,88 M 3,55 L 2,88" stroke="#F59E0B" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- Đèn 3 (x=490, y=212): Đèn tròn vàng ấm Hội An (Trọn vẹn bầu đèn) -->
  <g transform="translate(490, 212) rotate(${sway3.toFixed(2)})" opacity="0.92">
    <line x1="0" y1="-35" x2="0" y2="0" stroke="#B45309" stroke-width="1.2" opacity="0.6"/>
    <circle cx="0" cy="26" r="42" fill="url(#lanternGlow)"/>
    <rect x="-11" y="-2" width="22" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-9" y="50" width="18" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <ellipse cx="0" cy="26" rx="24" ry="26" fill="url(#lanternGold)"/>
    <ellipse cx="0" cy="26" rx="12" ry="26" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <line x1="0" y1="0" x2="0" y2="52" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <path d="M 0,54 L 0,88 M -3,54 L -2,84 M 3,54 L 2,84" stroke="#D97706" stroke-width="1.2" opacity="0.7"/>
  </g>

  <!-- Đèn 4 (x=710, y=218): Đèn hoa sen tím hồng pastel -->
  <g transform="translate(710, 218) rotate(${sway4.toFixed(2)})" opacity="0.92">
    <line x1="0" y1="-38" x2="0" y2="0" stroke="#B45309" stroke-width="1.2" opacity="0.6"/>
    <circle cx="0" cy="28" r="40" fill="url(#lanternGlow)"/>
    <rect x="-10" y="-2" width="20" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-8" y="52" width="16" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 20,14 20,38 0,54 C -20,38 -20,14 0,0 Z" fill="url(#lanternLotus)"/>
    <path d="M 0,0 C 9,14 9,38 0,54 C -9,38 -9,14 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,56 L 0,90 M -3,56 L -2,86 M 3,56 L 2,86" stroke="#F472B6" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- Đèn 5 (x=930, y=208): Đèn quả trám vàng hổ phách -->
  <g transform="translate(930, 208) rotate(${sway1.toFixed(2)})" opacity="0.94">
    <line x1="0" y1="-32" x2="0" y2="0" stroke="#B45309" stroke-width="1.2" opacity="0.6"/>
    <circle cx="0" cy="28" r="40" fill="url(#lanternGlow)"/>
    <rect x="-10" y="-2" width="20" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-8" y="52" width="16" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 20,14 20,38 0,54 C -20,38 -20,14 0,0 Z" fill="url(#lanternGold)"/>
    <path d="M 0,0 C 9,14 9,38 0,54 C -9,38 -9,14 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,56 L 0,90 M -3,56 L -2,86 M 3,56 L 2,86" stroke="#F59E0B" stroke-width="1.2" opacity="0.7"/>
  </g>

  <!-- Đèn 6 (x=1150, y=216): Đèn ngọc bích pastel thanh lịch -->
  <g transform="translate(1150, 216) rotate(${sway2.toFixed(2)})" opacity="0.92">
    <line x1="0" y1="-36" x2="0" y2="0" stroke="#B45309" stroke-width="1.2" opacity="0.6"/>
    <circle cx="0" cy="26" r="40" fill="url(#lanternGlow)"/>
    <rect x="-10" y="-2" width="20" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-8" y="50" width="16" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <ellipse cx="0" cy="26" rx="23" ry="25" fill="url(#lanternJade)"/>
    <ellipse cx="0" cy="26" rx="11" ry="25" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <path d="M 0,52 L 0,86 M -3,52 L -2,82 M 3,52 L 2,82" stroke="#059669" stroke-width="1.2" opacity="0.7"/>
  </g>

  <!-- Đèn 7 (x=1370, y=210): Đèn quả trám đỏ san hô -->
  <g transform="translate(1370, 210) rotate(${sway3.toFixed(2)})" opacity="0.94">
    <line x1="0" y1="-35" x2="0" y2="0" stroke="#B45309" stroke-width="1.2" opacity="0.6"/>
    <circle cx="0" cy="28" r="40" fill="url(#lanternGlow)"/>
    <rect x="-10" y="-2" width="20" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-8" y="52" width="16" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 20,14 20,38 0,54 C -20,38 -20,14 0,0 Z" fill="url(#lanternRed)"/>
    <path d="M 0,0 C 9,14 9,38 0,54 C -9,38 -9,14 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,56 L 0,90 M -3,56 L -2,86 M 3,56 L 2,86" stroke="#F59E0B" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- 7. PHẦN DƯỚI: MẶT NƯỚC SÔNG HOÀI & HOA ĐĂNG BẬP BỀNH LĂN TĂN -->
  <rect x="0" y="820" width="${WIDTH}" height="260" fill="url(#waterGrad)"/>

  <g fill="none" stroke="#CBD5E1" stroke-width="1.2" opacity="0.65" transform="translate(0, ${waterWaveY.toFixed(1)})">
    <path d="M 0,900 C 200,885 400,915 600,900 C 800,885 1000,915 1200,900 C 1400,885 1600,915 1800,900 T 1920,905"/>
    <path d="M 50,950 C 280,935 500,965 720,950 C 940,935 1160,965 1380,950 C 1600,935 1820,965 1920,955" stroke="#E2E8F0" opacity="0.8"/>
    <path d="M 0,1000 C 240,985 480,1015 720,1000 C 960,985 1200,1015 1440,1000 C 1680,985 1840,1015 1920,1005" opacity="0.5"/>
  </g>

  <!-- HOA ĐĂNG 1 -->
  <g transform="translate(150, ${(920 + lotusY1).toFixed(1)})" opacity="0.9">
    <ellipse cx="0" cy="12" rx="35" ry="9" fill="url(#lanternGlow)" opacity="0.7"/>
    <path d="M -18,6 C -14,-4 -5,-13 0,-16 C 5,-13 14,-4 18,6 Z" fill="url(#petalGrad)"/>
    <path d="M -24,8 C -18,0 -10,-6 -2,-10 C -5,2 -14,6 -24,8 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <path d="M 24,8 C 18,0 10,-6 2,-10 C 5,2 14,6 24,8 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <ellipse cx="0" cy="8" rx="14" ry="5" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="0" cy="0" rx="3.5" ry="6" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2.2" fill="#FFFFFF"/>
  </g>

  <!-- HOA ĐĂNG 2 -->
  <g transform="translate(480, ${(960 + lotusY2).toFixed(1)})" opacity="0.88">
    <ellipse cx="0" cy="12" rx="32" ry="8" fill="url(#lanternGlow)" opacity="0.65"/>
    <path d="M -16,5 C -12,-4 -4,-12 0,-15 C 4,-12 12,-4 16,5 Z" fill="url(#petalGrad)"/>
    <path d="M -21,7 C -16,0 -9,-5 -2,-9 C -4,2 -12,5 -21,7 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <path d="M 21,7 C 16,0 9,-5 2,-9 C 4,2 12,5 21,7 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <ellipse cx="0" cy="7" rx="12" ry="4.5" fill="#F472B6" opacity="0.5"/>
    <ellipse cx="0" cy="0" rx="3.2" ry="5.5" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2" fill="#FFFFFF"/>
  </g>

  <!-- HOA ĐĂNG 3 -->
  <g transform="translate(850, ${(930 + lotusY3).toFixed(1)})" opacity="0.92">
    <ellipse cx="0" cy="13" rx="36" ry="10" fill="url(#lanternGlow)" opacity="0.7"/>
    <path d="M -19,6 C -15,-5 -5,-14 0,-17 C 5,-14 15,-5 19,6 Z" fill="url(#petalGrad)"/>
    <path d="M -25,8 C -19,0 -10,-6 -2,-10 C -5,2 -14,6 -25,8 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <path d="M 25,8 C 19,0 10,-6 2,-10 C 5,2 14,6 25,8 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <ellipse cx="0" cy="8" rx="14" ry="5" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="0" cy="0" rx="3.5" ry="6.5" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2.2" fill="#FFFFFF"/>
  </g>

  <!-- HOA ĐĂNG 4 -->
  <g transform="translate(1220, ${(970 + lotusY4).toFixed(1)})" opacity="0.88">
    <ellipse cx="0" cy="12" rx="32" ry="8" fill="url(#lanternGlow)" opacity="0.65"/>
    <path d="M -16,5 C -12,-4 -4,-12 0,-15 C 4,-12 12,-4 16,5 Z" fill="url(#petalGrad)"/>
    <path d="M -21,7 C -16,0 -9,-5 -2,-9 C -4,2 -12,5 -21,7 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <path d="M 21,7 C 16,0 9,-5 2,-9 C 4,2 12,5 21,7 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <ellipse cx="0" cy="7" rx="12" ry="4.5" fill="#F472B6" opacity="0.5"/>
    <ellipse cx="0" cy="0" rx="3.2" ry="5.5" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2" fill="#FFFFFF"/>
  </g>

  <!-- HOA ĐĂNG 5 -->
  <g transform="translate(1580, ${(935 + lotusY5).toFixed(1)})" opacity="0.95">
    <ellipse cx="0" cy="15" rx="42" ry="12" fill="url(#lanternGlow)" opacity="0.75"/>
    <path d="M -21,7 C -17,-5 -6,-15 0,-19 C 6,-15 17,-5 21,7 Z" fill="url(#petalGrad)"/>
    <path d="M -27,9 C -21,0 -11,-7 -2,-11 C -5,2 -15,7 -27,9 Z" fill="url(#petalGrad)" opacity="0.95"/>
    <path d="M 27,9 C 21,0 11,-7 2,-11 C 5,2 15,7 27,9 Z" fill="url(#petalGrad)" opacity="0.95"/>
    <ellipse cx="0" cy="9" rx="16" ry="6" fill="#F472B6" opacity="0.65"/>
    <ellipse cx="0" cy="0" rx="4" ry="7" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2.5" fill="#FFFFFF"/>
  </g>

  <!-- 8. BỤI SAO HOÀNG KIM LẤP LÁNH TUẦN HOÀN -->
  ${renderStar(240, 310, 7, starOp1)}
  ${renderStar(580, 270, 6, starOp2)}
  ${renderStar(880, 330, 6.5, starOp3)}
  ${renderStar(1120, 280, 6, starOp1)}
  ${renderStar(1450, 320, 7, starOp2)}
  ${renderStar(1820, 270, 6.5, starOp3)}
</svg>
  `;
}

async function main() {
  console.log(`--- ĐANG RENDER LẠI TRANH ĐỘNG VỚI TỌA ĐỘ LỒNG ĐÈN HẠ XUỐNG DƯỚI THANH MENU ---`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const svg = renderFrameSvg(f);
    const frameBuffer = await sharp(Buffer.from(svg))
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    frames.push(frameBuffer);
    process.stdout.write(`\rRendered frame ${f + 1}/${TOTAL_FRAMES}...`);
  }
  console.log('\nĐang đóng gói lại Animated WebP...');

  const animatedBuffer = muxAnimatedWebP(frames, DELAY, 0);
  const outputPath = path.resolve(__dirname, '../pictures/stock_card_panorama_trung_thu.webp');
  fs.writeFileSync(outputPath, animatedBuffer);

  console.log(`ĐÃ XUẤT THÀNH CÔNG TRANH ĐỘNG TẠI: ${outputPath}`);
  console.log(`Dung lượng file: ${(animatedBuffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Lỗi khi render lại:', err);
  process.exit(1);
});
