const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Chuẩn kích thước VIN Hero Card: 540 x 200 px
const WIDTH = 540;
const HEIGHT = 200;
const TOTAL_FRAMES = 24;
const DELAY = 80; // 80ms x 24 = ~1.92s vòng lặp hoàn hảo

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
  vp8xHeader[8] = 0x12; // Animated + Alpha
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

// BỘ DEFS ĐỒ HỌA SANG TRỌNG HIỆN ĐẠI (LUXURY MINIMALIST PALETTE)
const LUXURY_DEFS = `
  <defs>
    <!-- Filter phát quang êm dịu, mờ ảo cao cấp -->
    <filter id="luxeGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="softMist" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
    </filter>

    <filter id="subtleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Kim loại Vàng 24K Champagne thanh lịch sang trọng -->
    <linearGradient id="gold24k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="25%" stop-color="#fef08a"/>
      <stop offset="55%" stop-color="#f59e0b"/>
      <stop offset="80%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#92400e"/>
    </linearGradient>

    <!-- Vàng ánh kim nhẹ (Fine Gold Hairline) -->
    <linearGradient id="goldHairline" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.1"/>
      <stop offset="30%" stop-color="#fde047" stop-opacity="0.65"/>
      <stop offset="70%" stop-color="#f59e0b" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0.1"/>
    </linearGradient>

    <!-- Hào quang Mặt Trăng rằm thanh khiết -->
    <radialGradient id="pureMoonHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffbeb" stop-opacity="0.55"/>
      <stop offset="40%" stop-color="#fde047" stop-opacity="0.22"/>
      <stop offset="75%" stop-color="#f59e0b" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Mặt Trăng rằm Gradient 3D tối giản -->
    <radialGradient id="minimalMoonGrad" cx="36%" cy="34%" r="66%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#fffbeb"/>
      <stop offset="70%" stop-color="#fef08a"/>
      <stop offset="90%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>

    <!-- Vàng Hồng Champagne Rose Gold -->
    <linearGradient id="roseGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff1f2"/>
      <stop offset="30%" stop-color="#fecdd3"/>
      <stop offset="70%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#be123c"/>
    </linearGradient>
`;

// Viền thẻ VIP Titanium / Khung viền kim loại mảnh mai tinh tế
function renderCardBorder(opacity = 0.35) {
  return `
    <rect x="0.75" y="0.75" width="${WIDTH - 1.5}" height="${HEIGHT - 1.5}" rx="18" fill="none" stroke="url(#goldHairline)" stroke-width="0.9" opacity="${opacity}"/>
  `;
}

// Ngôi sao 4 cánh tinh tế sang trọng (nhỏ gọn, không làm rối chữ)
function renderElegantStar(cx, cy, size = 4, opacity = 0.8) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.2;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}" filter="url(#subtleGlow)">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#ffffff" />
      <circle cx="0" cy="0" r="${(inner * 0.9).toFixed(1)}" fill="#fef08a"/>
    </g>
  `;
}

// Bụi sao vàng lơ lửng tối giản ở các góc
function renderLuxuryStardust(t, offset = 0) {
  const f1 = Math.sin((t + offset) * Math.PI * 2);
  const f2 = Math.cos((t + offset) * Math.PI * 2);
  return `
    <circle cx="35" cy="${45 + f1 * 4}" r="1" fill="#fef08a" opacity="0.45"/>
    <circle cx="120" cy="${25 - f2 * 3}" r="1.2" fill="#ffffff" opacity="0.6"/>
    <circle cx="480" cy="${165 + f2 * 4}" r="1" fill="#fde047" opacity="0.4"/>
    <circle cx="510" cy="${135 - f1 * 3}" r="1.3" fill="#ffffff" opacity="0.5"/>
  `;
}

// Mặt trăng rằm hiện đại tối giản với quầng sáng thanh lịch
function renderModernMoon(cx = 460, cy = 60, r = 36, breath = 0) {
  const haloR = (r * 2.1) + breath * 3;
  return `
    <!-- Quầng sáng dịu êm -->
    <circle cx="${cx}" cy="${cy}" r="${haloR.toFixed(1)}" fill="url(#pureMoonHalo)"/>
    <!-- Vòng quỹ đạo hình học vàng mảnh hiện đại -->
    <ellipse cx="${cx}" cy="${cy}" rx="${(r * 1.5).toFixed(1)}" ry="${(r * 0.55).toFixed(1)}" fill="none" stroke="url(#goldHairline)" stroke-width="0.75" transform="rotate(-15, ${cx}, ${cy})" opacity="0.5"/>
    <!-- Đĩa trăng chính -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#minimalMoonGrad)" filter="url(#subtleGlow)"/>
    <!-- Họa tiết bóng trăng mờ tối giản -->
    <path d="M ${cx - 10},${cy - 12} Q ${cx + 4},${cy - 20} ${cx + 14},${cy - 6} Q ${cx + 16},${cy + 10} ${cx + 2},${cy + 14} Q ${cx - 8},${cy + 8} ${cx - 10},${cy - 12} Z" fill="#d97706" opacity="0.12"/>
    <circle cx="${cx + 8}" cy="${cy + 12}" r="5" fill="#d97706" opacity="0.1"/>
    <!-- Viền phản quang sáng -->
    <circle cx="${cx}" cy="${cy}" r="${r - 0.5}" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.4"/>
  `;
}

// =============================================================================
// MẪU 1: HOÀNG KIM DẠ NGUYỆT (Imperial Obsidian & Minimalist Silk Lantern)
// Phong cách: Đen huyền vũ, trăng rằm hoàng kim và đèn lồng gấm tơ tằm buông nhẹ góc trái
// =============================================================================
function getModel1(t, phase) {
  const sway = Math.sin(phase) * 3;
  const candlePulse = 0.85 + 0.15 * Math.sin(phase * 2);
  const starPulse = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  const moonBreath = Math.sin(phase);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#050814"/>
          <stop offset="50%" stop-color="#0c142b"/>
          <stop offset="100%" stop-color="#060a17"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg1)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0)}

      <!-- Trăng Rằm Hoàng Kim Tinh Tế -->
      ${renderModernMoon(465, 58, 36, moonBreath)}

      <!-- Sao băng mỏng thanh lịch lướt qua phía trên -->
      <line x1="260" y1="18" x2="190" y2="10" stroke="url(#goldHairline)" stroke-width="1.2" stroke-linecap="round" opacity="${(0.3 + 0.5 * Math.sin(phase)).toFixed(2)}"/>

      <!-- ĐÈN LỒNG GẤM TƠ TẰM TỐI GIẢN GÓC TRÁI (cx=65) -->
      <g transform="translate(65, 0)">
        <line x1="0" y1="0" x2="0" y2="28" stroke="url(#gold24k)" stroke-width="1"/>
        <g transform="translate(0, 28) rotate(${sway.toFixed(1)})" filter="url(#subtleGlow)">
          <!-- Núm vàng tròn mini -->
          <circle cx="0" cy="-2" r="2.5" fill="url(#gold24k)"/>
          <!-- Khung đèn lồng dáng giọt nước thanh mảnh -->
          <path d="M 0,0 C -14,10 -16,30 0,42 C 16,30 14,10 0,0 Z" fill="#7f1d1d" stroke="url(#gold24k)" stroke-width="1.2"/>
          <path d="M 0,0 C -7,10 -8,30 0,42 C 8,30 7,10 0,0 Z" fill="none" stroke="url(#gold24k)" stroke-width="0.8" opacity="0.6"/>
          <!-- Lõi nến ấm áp thở nhẹ bên trong -->
          <ellipse cx="0" cy="22" rx="6" ry="10" fill="#fef08a" opacity="${candlePulse.toFixed(2)}" filter="url(#subtleGlow)"/>
          <circle cx="0" cy="22" r="3" fill="#ffffff" opacity="${candlePulse.toFixed(2)}"/>
          <!-- Tua rua lụa dài thanh thoát -->
          <line x1="0" y1="42" x2="0" y2="68" stroke="url(#gold24k)" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="0" cy="68" r="2" fill="url(#gold24k)"/>
        </g>
      </g>

      <!-- Dải mây tơ vàng uốn lượn mỏng manh qua mặt trăng -->
      <path d="M 370,68 C 410,55 450,75 490,62 C 520,52 540,60 540,60" fill="none" stroke="url(#goldHairline)" stroke-width="1.2" opacity="0.5" stroke-linecap="round"/>

      ${renderElegantStar(280, 42, 4, starPulse)}
      ${renderElegantStar(380, 85, 3, 0.4 + 0.6 * Math.cos(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 2: NGUYỆT LẠC QUỲNH HOA (Midnight Sapphire & Osmanthus Golden Flora)
// Phong cách: Cành hoa mộc quế dát vàng thanh nhã ven viền trên, hoa nở lung linh
// =============================================================================
function getModel2(t, phase) {
  const floraGlow = 0.65 + 0.35 * Math.sin(phase);
  const moonBreath = Math.cos(phase);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#040b1e"/>
          <stop offset="50%" stop-color="#0c1b3d"/>
          <stop offset="100%" stop-color="#060d24"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg2)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0.2)}

      <!-- Vầng trăng đêm rằm xanh thẳm -->
      ${renderModernMoon(470, 56, 35, moonBreath)}

      <!-- CÀNH HOA MỘC QUẾ (OSMANTHUS) DÁT VÀNG THANH LỊCH VEN VIỀN TRÊN -->
      <g stroke="url(#gold24k)" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.85">
        <path d="M 0,18 Q 45,26 85,16 T 165,22 T 225,12"/>
        <path d="M 55,22 Q 70,32 82,34"/>
        <path d="M 125,19 Q 138,29 146,28"/>
      </g>

      <!-- Các bông hoa mộc quế 4 cánh nhỏ li ti phát quang vàng dịu -->
      <g filter="url(#subtleGlow)" opacity="${floraGlow.toFixed(2)}">
        <!-- Cụm 1 -->
        <circle cx="85" cy="16" r="2.2" fill="#fef08a"/>
        <circle cx="82" cy="12" r="1.6" fill="#fde047"/>
        <circle cx="88" cy="13" r="1.6" fill="#fde047"/>
        <circle cx="85" cy="20" r="1.6" fill="#fde047"/>
        <!-- Cụm 2 -->
        <circle cx="146" cy="28" r="2.2" fill="#fef08a"/>
        <circle cx="143" cy="25" r="1.6" fill="#fde047"/>
        <circle cx="149" cy="26" r="1.6" fill="#fde047"/>
        <!-- Cụm 3 -->
        <circle cx="205" cy="14" r="2.0" fill="#fef08a"/>
        <circle cx="208" cy="11" r="1.5" fill="#fde047"/>
      </g>

      <!-- Cánh hoa vàng rơi khẽ khàng góc trái -->
      <path d="M 95,${55 + Math.sin(phase) * 6} Q 98,${60 + Math.sin(phase) * 6} 94,${65 + Math.sin(phase) * 6}" stroke="url(#gold24k)" stroke-width="1" fill="none" opacity="0.5"/>

      ${renderElegantStar(310, 40, 4.5, 0.4 + 0.6 * Math.max(0, Math.sin(phase)))}
      ${renderElegantStar(395, 75, 3.5, 0.3 + 0.7 * Math.max(0, Math.cos(phase)))}
    </svg>
  `;
}

// =============================================================================
// MẪU 3: THỎ NGỌC VỌNG NGUYỆT (Cosmic Violet & Minimalist Jade Rabbit Silhouette)
// Phong cách: Art-deco hiện đại, vầng trăng khuyết ôm trọn dáng thỏ ngọc tối giản kiêu sa
// =============================================================================
function getModel3(t, phase) {
  const rabbitFloat = Math.sin(phase) * 2;
  const starTwinkle = 0.5 + 0.5 * Math.sin(phase * 2);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a051d"/>
          <stop offset="50%" stop-color="#150d38"/>
          <stop offset="100%" stop-color="#080318"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg3)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0.4)}

      <!-- Trăng Tròn Hào Quang Tím Mờ Bí Ẩn phía xa -->
      <circle cx="465" cy="55" r="70" fill="url(#pureMoonHalo)" opacity="0.6"/>

      <!-- VÒM TRĂNG KHUYẾT ART-DECO DÁT VÀNG & BẠCH KIM (cx=465, cy=55) -->
      <path d="M 470,18 C 440,18 420,40 420,68 C 420,96 442,114 470,114 C 448,104 436,88 436,68 C 436,44 452,28 470,18 Z" 
            fill="url(#gold24k)" filter="url(#subtleGlow)"/>

      <!-- HÌNH BÓNG THỎ NGỌC TỐI GIẢN CỰC KỲ TINH TẾ (cx=450, cy=68) -->
      <g transform="translate(450, ${68 + rabbitFloat})" filter="url(#subtleGlow)">
        <!-- Thân thỏ thanh tú ngồi ngắm trăng -->
        <path d="M 0,22 C -6,22 -11,17 -11,10 C -11,3 -6,-2 0,-5 C 5,-2 9,3 9,10 C 9,17 5,22 0,22 Z" fill="#ffffff" opacity="0.95"/>
        <!-- Đuôi bông tròn xíu -->
        <circle cx="8" cy="15" r="2.8" fill="#ffffff"/>
        <!-- Đầu thỏ ngước nhìn lên -->
        <circle cx="-3" cy="-9" r="4.5" fill="#ffffff"/>
        <!-- Đôi tai thỏ vươn cao thanh mảnh -->
        <ellipse cx="-5" cy="-19" rx="1.8" ry="7" fill="#ffffff" transform="rotate(-8, -5, -19)"/>
        <ellipse cx="-1" cy="-18" rx="1.6" ry="6.5" fill="#fef08a" transform="rotate(10, -1, -18)"/>
      </g>

      <!-- Ngôi sao Kim Cương phát sáng trên đầu thỏ -->
      ${renderElegantStar(435, 32, 5, starTwinkle)}
      ${renderElegantStar(220, 48, 4, 0.4 + 0.6 * Math.sin(phase))}
      ${renderElegantStar(340, 80, 3.5, 0.4 + 0.6 * Math.cos(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 4: THỦY MẶC NGUYỆT QUANG (Emerald Noir & Minimalist Water Lotus)
// Phong cách: Đêm ngọc bích tĩnh mịch, đóa sen vàng đường nét Zen thanh khiết soi bóng
// =============================================================================
function getModel4(t, phase) {
  const lotusBreath = 1 + 0.03 * Math.sin(phase);
  const rippleR = 18 + ((t * 24) % 24);
  const rippleAlpha = Math.max(0, 1 - (((t * 24) % 24) / 24));

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021411"/>
          <stop offset="50%" stop-color="#062b24"/>
          <stop offset="100%" stop-color="#010e0c"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg4)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0.6)}

      <!-- Trăng vàng trên nền trời ngọc bích -->
      ${renderModernMoon(465, 54, 34, Math.sin(phase))}

      <!-- ĐÓA SEN TỐI GIẢN LINE-ART DÁT VÀNG 24K GÓC PHẢI DƯỚI (cx=470, cy=155) -->
      <g transform="translate(470, 155) scale(${lotusBreath})" filter="url(#subtleGlow)">
        <!-- Vòng gợn sóng nước lăn tăn phản chiếu -->
        <ellipse cx="0" cy="18" rx="${rippleR * 1.6}" ry="${rippleR * 0.4}" fill="none" stroke="url(#goldHairline)" stroke-width="0.8" opacity="${(rippleAlpha * 0.5).toFixed(2)}"/>
        <ellipse cx="0" cy="18" rx="16" ry="4" fill="none" stroke="url(#goldHairline)" stroke-width="0.8" opacity="0.3"/>
        
        <!-- Cánh sen chính giữa vươn cao -->
        <path d="M 0,-18 C -5,-8 -6,6 0,14 C 6,6 5,-8 0,-18 Z" fill="url(#gold24k)" opacity="0.85"/>
        <!-- Cánh sen trái -->
        <path d="M 0,14 C -12,8 -16,-4 -8,-12 C -6,-4 -2,6 0,14 Z" fill="url(#gold24k)" opacity="0.75"/>
        <!-- Cánh sen phải -->
        <path d="M 0,14 C 12,8 16,-4 8,-12 C 6,-4 2,6 0,14 Z" fill="url(#gold24k)" opacity="0.75"/>
        <!-- Nhụy sen phát sáng dịu dàng -->
        <circle cx="0" cy="0" r="2.5" fill="#ffffff"/>
      </g>

      <!-- Đom đóm vàng bay lượn nhẹ nhàng thanh thoát -->
      <circle cx="160" cy="${140 - Math.sin(phase) * 8}" r="1.5" fill="#fde047" opacity="0.7" filter="url(#subtleGlow)"/>
      <circle cx="280" cy="${160 + Math.cos(phase) * 6}" r="1.2" fill="#fde047" opacity="0.5" filter="url(#subtleGlow)"/>

      ${renderElegantStar(180, 45, 4, 0.4 + 0.6 * Math.sin(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 5: THIÊN ĐĂNG CÁT TƯỜNG (Charcoal Bronze & Minimalist Floating Lanterns)
// Phong cách: Sắc hổ phách trầm ấm hoàng gia, 3 thiên đăng tối giản bay lượn êm đềm
// =============================================================================
function getModel5(t, phase) {
  const lanterns = [
    { x: 75, baseSpeed: 0.9, scale: 0.9, delay: 0 },
    { x: 145, baseSpeed: 1.1, scale: 0.7, delay: 0.35 },
    { x: 385, baseSpeed: 0.85, scale: 0.8, delay: 0.7 },
  ];

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#140904"/>
          <stop offset="50%" stop-color="#261308"/>
          <stop offset="100%" stop-color="#0c0502"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg5)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0.8)}

      <!-- Mặt Trăng rằm mật ong ấm áp -->
      ${renderModernMoon(460, 58, 36, Math.sin(phase))}

      <!-- CÁC THIÊN ĐĂNG (KHỔNG MINH ĐĂNG) TỐI GIẢN LƠ LỬNG ÊM ĐỀM -->
      ${lanterns.map(l => {
        const prog = ((t * l.baseSpeed + l.delay) % 1);
        const y = 190 - prog * 180;
        const swayX = l.x + Math.sin(phase + l.delay * 4) * 6;
        const alpha = Math.sin(prog * Math.PI);
        return `
          <g transform="translate(${swayX.toFixed(1)}, ${y.toFixed(1)}) scale(${l.scale})" opacity="${alpha.toFixed(2)}" filter="url(#subtleGlow)">
            <!-- Hào quang ấm quanh lồng đèn -->
            <ellipse cx="0" cy="10" rx="14" ry="16" fill="#f59e0b" opacity="0.35"/>
            <!-- Dáng đèn hình khối tối giản thanh thoát -->
            <path d="M -8,0 L -10,20 L 10,20 L 8,0 Z" fill="#d97706" stroke="url(#gold24k)" stroke-width="0.8"/>
            <line x1="-10" y1="20" x2="10" y2="20" stroke="url(#gold24k)" stroke-width="1.2"/>
            <!-- Tim nến rực sáng bên trong -->
            <circle cx="0" cy="14" r="3.5" fill="#ffffff" filter="url(#subtleGlow)"/>
          </g>
        `;
      }).join('')}

      ${renderElegantStar(250, 40, 4.5, 0.4 + 0.6 * Math.cos(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 6: VŨ NGUYỆT NGHÊ THƯỜNG (Amethyst Noir & Golden Silk Ribbon Aurora)
// Phong cách: Dải lụa tiên vàng hồng uốn lượn mượt mà như cực quang đêm rằm
// =============================================================================
function getModel6(t, phase) {
  const wave = Math.sin(phase) * 8;
  const starTwinkle = 0.4 + 0.6 * Math.sin(phase);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#12051c"/>
          <stop offset="50%" stop-color="#240c36"/>
          <stop offset="100%" stop-color="#0c0314"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg6)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0.1)}

      <!-- Trăng Rằm Tuyệt Mỹ -->
      ${renderModernMoon(465, 56, 36, Math.cos(phase))}

      <!-- DẢI LỤA TIÊN DÁT VÀNG & ROSE GOLD UỐN LƯỢN THANH THOÁT -->
      <path d="M 15,160 Q 140,${120 + wave} 270,${75 - wave} T 525,${45 + wave * 0.5}" 
            fill="none" stroke="url(#roseGold)" stroke-width="2.5" stroke-linecap="round" opacity="0.75" filter="url(#luxeGlow)"/>
      <path d="M 15,160 Q 140,${120 + wave} 270,${75 - wave} T 525,${45 + wave * 0.5}" 
            fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.9"/>

      <!-- Dải lụa phụ mỏng manh phía sau -->
      <path d="M 30,175 Q 160,${140 - wave} 290,${95 + wave} T 535,${60 - wave * 0.5}" 
            fill="none" stroke="url(#goldHairline)" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>

      ${renderElegantStar(160, 52, 4.5, starTwinkle)}
      ${renderElegantStar(380, 85, 3.5, 0.3 + 0.7 * Math.cos(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 7: KIM NGƯ VỌNG NGUYỆT (Midnight Azure & Minimalist Twin Golden Koi)
// Phong cách: Đôi cá chép vàng uốn lượn tối giản theo vòng tròn âm dương phong thủy
// =============================================================================
function getModel7(t, phase) {
  const koiAngle = phase;
  const kx1 = 75 + Math.cos(koiAngle) * 22;
  const ky1 = 65 + Math.sin(koiAngle) * 16;
  const kx2 = 75 + Math.cos(koiAngle + Math.PI) * 22;
  const ky2 = 65 + Math.sin(koiAngle + Math.PI) * 16;
  const rot1 = (koiAngle * 180 / Math.PI) + 90;
  const rot2 = ((koiAngle + Math.PI) * 180 / Math.PI) + 90;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021024"/>
          <stop offset="50%" stop-color="#05244c"/>
          <stop offset="100%" stop-color="#010a18"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg7)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0.3)}

      <!-- Trăng Rằm Biển Đêm -->
      ${renderModernMoon(465, 58, 36, Math.sin(phase))}

      <!-- ĐÔI CÁ CHÉP VÀNG TỐI GIẢN (SONG NGƯ) UỐN LƯỢN GÓC TRÁI (cx=75, cy=65) -->
      <!-- Vòng tròn quỹ đạo nước mỏng tinh tế -->
      <ellipse cx="75" cy="65" rx="28" ry="20" fill="none" stroke="url(#goldHairline)" stroke-width="0.8" opacity="0.4"/>

      <!-- Cá 1 -->
      <g transform="translate(${kx1.toFixed(1)}, ${ky1.toFixed(1)}) rotate(${rot1.toFixed(1)})" filter="url(#subtleGlow)">
        <path d="M 0,-8 C -3,-2 -3,4 0,8 C 3,4 3,-2 0,-8 Z" fill="url(#gold24k)"/>
        <path d="M 0,8 Q -4,14 0,16 Q 4,14 0,8" fill="url(#gold24k)" opacity="0.8"/>
      </g>

      <!-- Cá 2 -->
      <g transform="translate(${kx2.toFixed(1)}, ${ky2.toFixed(1)}) rotate(${rot2.toFixed(1)})" filter="url(#subtleGlow)">
        <path d="M 0,-8 C -3,-2 -3,4 0,8 C 3,4 3,-2 0,-8 Z" fill="url(#gold24k)"/>
        <path d="M 0,8 Q -4,14 0,16 Q 4,14 0,8" fill="url(#gold24k)" opacity="0.8"/>
      </g>

      <!-- Sóng nước phẳng lặng ven đáy -->
      <path d="M 0,185 Q 135,178 270,185 T 540,185" fill="none" stroke="url(#goldHairline)" stroke-width="0.75" opacity="0.3"/>

      ${renderElegantStar(290, 45, 4, 0.4 + 0.6 * Math.sin(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 8: CỔ CÁC VỌNG NGUYỆT (Royal Slate & Modern Moon Gate Architecture)
// Phong cách: Vòm cổng trăng hoàng cung hiện đại, cành trúc thanh nhã lay động
// =============================================================================
function getModel8(t, phase) {
  const bambooSway = Math.sin(phase) * 3;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg8" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#040916"/>
          <stop offset="50%" stop-color="#0b1730"/>
          <stop offset="100%" stop-color="#050a19"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg8)"/>
      ${renderCardBorder(0.35)}
      ${renderLuxuryStardust(t, 0.5)}

      <!-- VÒM CỔNG TRĂNG TRÒN (MOON GATE) HOÀNG GIA DÁT VÀNG PHÍA SAU TRĂNG (cx=465, cy=58) -->
      <circle cx="465" cy="58" r="54" fill="none" stroke="url(#gold24k)" stroke-width="1.2" opacity="0.45"/>
      <circle cx="465" cy="58" r="50" fill="none" stroke="url(#goldHairline)" stroke-width="0.6" opacity="0.3"/>

      <!-- Mặt Trăng rằm lồng trong cổng -->
      ${renderModernMoon(465, 58, 34, Math.sin(phase))}

      <!-- KHÓM TRÚC QUÂN TỬ THANH MÃNH GÓC TRÁI (cx=40) -->
      <g transform="translate(40, 0)">
        <!-- Thân trúc thẳng tắp -->
        <line x1="0" y1="0" x2="0" y2="90" stroke="url(#gold24k)" stroke-width="1.4" opacity="0.65"/>
        <line x1="16" y1="0" x2="16" y2="70" stroke="url(#gold24k)" stroke-width="1.0" opacity="0.5"/>
        <!-- Đốt trúc -->
        <circle cx="0" cy="30" r="1.5" fill="url(#gold24k)"/>
        <circle cx="0" cy="60" r="1.5" fill="url(#gold24k)"/>
        <circle cx="16" cy="35" r="1.2" fill="url(#gold24k)"/>

        <!-- Lá trúc mảnh mai đung đưa nhẹ theo gió thu -->
        <g transform="translate(0, 30) rotate(${bambooSway.toFixed(1)})" filter="url(#subtleGlow)">
          <path d="M 0,0 Q 18,6 28,14 Q 14,10 0,0" fill="url(#gold24k)" opacity="0.8"/>
          <path d="M 0,0 Q 14,-8 24,-12 Q 10,-4 0,0" fill="url(#gold24k)" opacity="0.8"/>
        </g>
        <g transform="translate(16, 35) rotate(${(-bambooSway).toFixed(1)})" filter="url(#subtleGlow)">
          <path d="M 0,0 Q 16,8 24,16 Q 12,10 0,0" fill="url(#gold24k)" opacity="0.75"/>
        </g>
      </g>

      ${renderElegantStar(240, 40, 4.5, 0.4 + 0.6 * Math.sin(phase))}
      ${renderElegantStar(350, 75, 3.5, 0.4 + 0.6 * Math.cos(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 9: PHƯỢNG CÁC NGHÊNH THU (Ruby Noir & Imperial Golden Filigree)
// Phong cách: Gấm đỏ hồng ngọc quý phái, hoa văn diềm vàng cung đình vương giả
// =============================================================================
function getModel9(t, phase) {
  const glow = 0.5 + 0.5 * Math.sin(phase);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg9" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#160307"/>
          <stop offset="50%" stop-color="#2d0811"/>
          <stop offset="100%" stop-color="#0f0205"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg9)"/>
      ${renderCardBorder(0.4)}
      ${renderLuxuryStardust(t, 0.7)}

      <!-- Trăng Rằm Hoàng Kim -->
      ${renderModernMoon(465, 58, 36, Math.cos(phase))}

      <!-- HỌA TIẾT HOA VĂN GẤM CUNG ĐÌNH DÁT VÀNG TINH XẢO GÓC TRÁI TRÊN -->
      <g stroke="url(#gold24k)" stroke-width="1.2" fill="none" opacity="0.75" filter="url(#subtleGlow)">
        <!-- Góc vuông hoa văn hồi văn cung đình -->
        <path d="M 12,38 L 12,12 L 38,12"/>
        <path d="M 18,34 L 18,18 L 34,18"/>
        <!-- Nút thắt cát tường tối giản -->
        <circle cx="26" cy="26" r="3.5" fill="url(#gold24k)"/>
        <!-- Dải hoa văn viền trên uốn lượn sang trọng -->
        <path d="M 45,12 Q 75,6 105,12 T 165,12" stroke-width="0.8" opacity="0.5"/>
      </g>

      <!-- Đèn hoa đăng ruby mini buông nhẹ -->
      <g transform="translate(135, 0)">
        <line x1="0" y1="0" x2="0" y2="24" stroke="url(#gold24k)" stroke-width="0.8"/>
        <circle cx="0" cy="28" r="4" fill="#ef4444" filter="url(#subtleGlow)"/>
        <circle cx="0" cy="28" r="2" fill="#ffffff" opacity="${glow.toFixed(2)}"/>
        <line x1="0" y1="32" x2="0" y2="44" stroke="url(#gold24k)" stroke-width="1"/>
      </g>

      ${renderElegantStar(270, 46, 4.5, 0.4 + 0.6 * Math.sin(phase))}
    </svg>
  `;
}

// =============================================================================
// MẪU 10: TINH HÀ HỘI NGUYỆT (Obsidian Noir & Celestial Gold Sacred Geometry)
// Phong cách: Đồng hồ thiên văn cao cấp (Patek / Lange), vòng tinh đồ hoàng kim chuẩn xác
// =============================================================================
function getModel10(t, phase) {
  const dialRot = t * 360;
  const compassTwinkle = 0.5 + 0.5 * Math.sin(phase * 2);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${LUXURY_DEFS}
        <linearGradient id="bg10" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#03060c"/>
          <stop offset="50%" stop-color="#081324"/>
          <stop offset="100%" stop-color="#020408"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg10)"/>
      ${renderCardBorder(0.4)}
      ${renderLuxuryStardust(t, 0.9)}

      <!-- VÒNG TRÒN THIÊN VĂN HOÀNG GIA XOAY CHẬM QUANH MẶT TRĂNG (cx=465, cy=58) -->
      <g transform="translate(465, 58)">
        <!-- Vành đĩa đo độ thiên văn -->
        <circle cx="0" cy="0" r="56" fill="none" stroke="url(#goldHairline)" stroke-width="0.75" stroke-dasharray="2,4" opacity="0.45"/>
        <circle cx="0" cy="0" r="68" fill="none" stroke="url(#goldHairline)" stroke-width="0.5" stroke-dasharray="8,8" opacity="0.3" transform="rotate(${dialRot.toFixed(1)})"/>
        <line x1="-75" y1="0" x2="75" y2="0" stroke="url(#goldHairline)" stroke-width="0.5" opacity="0.3" transform="rotate(${-dialRot.toFixed(1)})"/>
        <line x1="0" y1="-75" x2="0" y2="75" stroke="url(#goldHairline)" stroke-width="0.5" opacity="0.3" transform="rotate(${-dialRot.toFixed(1)})"/>
      </g>

      <!-- Mặt Trăng rằm Hoàng Kim trung tâm tọa độ -->
      ${renderModernMoon(465, 58, 35, Math.sin(phase))}

      <!-- La bàn chòm sao góc trái (cx=55, cy=55) -->
      <g transform="translate(55, 55)" opacity="0.65" filter="url(#subtleGlow)">
        <circle cx="0" cy="0" r="18" fill="none" stroke="url(#gold24k)" stroke-width="0.8"/>
        <line x1="-22" y1="0" x2="22" y2="0" stroke="url(#gold24k)" stroke-width="0.6"/>
        <line x1="0" y1="-22" x2="0" y2="22" stroke="url(#gold24k)" stroke-width="0.6"/>
        <circle cx="0" cy="0" r="2" fill="#ffffff"/>
      </g>

      ${renderElegantStar(55, 55, 5.5, compassTwinkle)}
      ${renderElegantStar(250, 42, 4, 0.4 + 0.6 * Math.sin(phase))}
      ${renderElegantStar(360, 80, 3.5, 0.4 + 0.6 * Math.cos(phase))}
    </svg>
  `;
}

const LUXURY_MODELS = [
  getModel1,
  getModel2,
  getModel3,
  getModel4,
  getModel5,
  getModel6,
  getModel7,
  getModel8,
  getModel9,
  getModel10,
];

async function generateModel(modelIdx) {
  const modelNum = modelIdx + 1;
  console.log(`Đang render Model ${modelNum}/10 (Sang trọng, Tinh tế, Hiện đại)...`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;
    const svgStr = LUXURY_MODELS[modelIdx](t, phase);

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

  // Model 1 cũng đồng thời cập nhật file gốc vin_hero_card_bg_trung_thu.webp
  if (modelNum === 1) {
    fs.writeFileSync(path.resolve(__dirname, '../pictures/vin_hero_card_bg_trung_thu.webp'), animWebp);
    fs.writeFileSync(path.resolve(__dirname, '../public/assets/vin_hero_card_bg_trung_thu.webp'), animWebp);
  }

  console.log(`✓ Hoàn tất Model ${modelNum}: ${(animWebp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log('=== BẮT ĐẦU TẠO 10 MẪU VIN HERO CARD SANG TRỌNG, TINH TẾ, HIỆN ĐẠI (PHONG CÁCH TRUNG THU) ===');
  for (let i = 0; i < 10; i++) {
    await generateModel(i);
  }
  console.log('=== TOÀN BỘ 10 MẪU ĐÃ ĐƯỢC TẠO XONG HOÀN HẢO! ===');
}

main().catch(console.error);
