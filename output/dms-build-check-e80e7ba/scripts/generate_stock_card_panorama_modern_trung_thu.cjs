const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn Panorama: 1920 x 1080 px
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

// Vẽ đèn lồng hình học Origami đa giác hiện đại (Modern Geometric Polyhedral Lantern)
function renderModernLantern(cx, cy, rotation, type = 'diamond', scale = 1.0, opacity = 0.9) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <!-- Cáp quang treo thanh mảnh -->
      <line x1="0" y1="-50" x2="0" y2="0" stroke="#CBD5E1" stroke-width="1" opacity="0.8"/>
      <!-- Quầng sáng neon ấm -->
      <circle cx="0" cy="30" r="42" fill="url(#neonGlow)" opacity="0.65"/>
      ${type === 'diamond' ? `
        <!-- Đèn Kim Cương Origami Đa Diện -->
        <polygon points="0,0 24,20 0,64 -24,20" fill="url(#polyGrad1)"/>
        <polygon points="0,0 0,64 -24,20" fill="url(#polyGrad2)" opacity="0.85"/>
        <polygon points="0,0 12,20 0,64" fill="#FFFFFF" opacity="0.45"/>
        <!-- Đường viền phát sáng công nghệ -->
        <polygon points="0,0 24,20 0,64 -24,20" fill="none" stroke="#FDE047" stroke-width="1.2" opacity="0.9"/>
        <line x1="0" y1="0" x2="0" y2="64" stroke="#FFFFFF" stroke-width="0.8" opacity="0.7"/>
        <line x1="-24" y1="20" x2="24" y2="20" stroke="#FDE047" stroke-width="0.8" opacity="0.6"/>
      ` : type === 'star' ? `
        <!-- Đèn Ngôi Sao Công Nghệ Neon Hiện Đại -->
        <polygon points="0,0 8,16 26,18 13,31 16,48 0,39 -16,48 -13,31 -26,18 -8,16" fill="url(#polyGrad3)"/>
        <polygon points="0,0 8,16 26,18 13,31 16,48 0,39 -16,48 -13,31 -26,18 -8,16" fill="none" stroke="#F59E0B" stroke-width="1.2"/>
        <circle cx="0" cy="26" r="6" fill="#FFFFFF" opacity="0.9"/>
      ` : `
        <!-- Đèn Khối Tròn Khí Cầu Tương Lai -->
        <ellipse cx="0" cy="28" rx="25" ry="28" fill="url(#polyGrad1)"/>
        <ellipse cx="0" cy="28" rx="14" ry="28" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.6"/>
        <line x1="0" y1="0" x2="0" y2="56" stroke="#FFFFFF" stroke-width="1" opacity="0.7"/>
        <!-- Vòng đai neon bao quanh đèn -->
        <ellipse cx="0" cy="28" rx="34" ry="9" fill="none" stroke="#38BDF8" stroke-width="1.2" transform="rotate(-15, 0, 28)"/>
      `}
      <!-- Tua rua ánh sáng kỹ thuật số -->
      <line x1="0" y1="64" x2="0" y2="96" stroke="#FBBF24" stroke-width="1.5" opacity="0.8"/>
      <circle cx="0" cy="98" r="2" fill="#FDE047"/>
    </g>
  `;
}

// Vẽ Thỏ Phi Hành Gia Công Nghệ (Astro-Rabbit) bồng bềnh không trọng lực
function renderAstroRabbit(cx, cy, rotation, scale = 1.0, opacity = 0.95) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <!-- Ba lô phản lực phát quang phía sau -->
      <rect x="18" y="-12" width="12" height="24" rx="4" fill="#64748B" opacity="0.8"/>
      <circle cx="24" cy="14" r="3" fill="#38BDF8" filter="drop-shadow(0 0 6px #38bdf8)"/>
      <line x1="24" y1="17" x2="24" y2="28" stroke="#38BDF8" stroke-width="2" opacity="0.85"/>
      <!-- Thân đồ phi hành gia trắng công nghệ -->
      <ellipse cx="6" cy="2" rx="18" ry="16" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(15, 23, 42, 0.15))"/>
      <!-- Điểm nhấn vạch công nghệ cam VinFast trên trang phục -->
      <path d="M -6,-6 Q 6,-2 18,-6" stroke="#F97316" stroke-width="1.5" fill="none"/>
      <!-- Tay chân phi hành gia tròn trịa đáng yêu -->
      <ellipse cx="-10" cy="12" rx="6" ry="5" fill="#FFFFFF"/>
      <ellipse cx="12" cy="15" rx="5" ry="6" fill="#FFFFFF"/>
      <ellipse cx="-16" cy="-2" rx="5" ry="4" fill="#FFFFFF"/>
      <!-- Mũ bảo hộ phi hành gia trong suốt (Space Helmet) -->
      <circle cx="-12" cy="-14" r="15" fill="#E2E8F0" opacity="0.6"/>
      <circle cx="-12" cy="-14" r="14" fill="url(#visorGrad)" stroke="#38BDF8" stroke-width="1.2"/>
      <!-- Vệt phản quang ánh sao trên kính mũ -->
      <path d="M -20,-20 A 11 11 0 0 1 -8,-24" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.85"/>
      <!-- Khuôn mặt chú thỏ bên trong kính -->
      <circle cx="-13" cy="-14" r="9" fill="#FFFFFF"/>
      <!-- Mắt thỏ đen láy tinh anh -->
      <circle cx="-16" cy="-14" r="1.5" fill="#0F172A"/>
      <circle cx="-16.5" cy="-14.5" r="0.6" fill="#FFFFFF"/>
      <!-- Má hồng nhẹ -->
      <circle cx="-17" cy="-10" r="1.5" fill="#F472B6" opacity="0.7"/>
      <!-- Tai thỏ dài vươn ra ngoài mũ (bọc giáp bảo hộ) -->
      <g transform="rotate(-15, -12, -26)">
        <ellipse cx="-14" cy="-35" rx="3.5" ry="11" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.8"/>
        <ellipse cx="-14" cy="-35" rx="1.8" ry="7" fill="#F472B6" opacity="0.6"/>
        <ellipse cx="-6" cy="-33" rx="3.5" ry="10" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.8" transform="rotate(18, -6, -33)"/>
        <ellipse cx="-6" cy="-33" rx="1.8" ry="6.5" fill="#F472B6" opacity="0.6" transform="rotate(18, -6, -33)"/>
      </g>
      <!-- Thỏ cầm bông sen phát sáng mini (Cyber Lotus Lamp) -->
      <g transform="translate(-24, 0) scale(0.6)">
        <path d="M 0,0 C -6,-10 -2,-20 6,-24 C 14,-20 18,-10 12,0 Z" fill="#F472B6"/>
        <circle cx="6" cy="-12" r="5" fill="#FEF08A" filter="drop-shadow(0 0 8px #fef08a)"/>
      </g>
    </g>
  `;
}

function renderFrameSvg(f) {
  const t = f / TOTAL_FRAMES;
  const phase = t * Math.PI * 2;

  // 1. Quầng sáng Neon Vầng Trăng Siêu Thực nhịp thở
  const moonR = 340 + 25 * Math.sin(phase);
  const moonGlowOpacity = 0.55 + 0.15 * Math.sin(phase);

  // 2. Vành đai ánh sáng quỹ đạo xoay quanh trăng (Orbit Ring)
  const ringRot = -22 + Math.sin(phase) * 4;
  const satX = 1630 + 170 * Math.cos(phase);
  const satY = 350 + 55 * Math.sin(phase);

  // 3. Thỏ phi hành gia bồng bềnh êm đềm trong không trọng lực
  const rabbitX = 1420 + Math.sin(phase) * 12;
  const rabbitY = 370 + Math.cos(phase) * 14;
  const rabbitRot = -8 + Math.sin(phase) * 6;

  // 4. Đèn lồng Origami hình học đung đưa thanh lịch
  const sway1 = Math.sin(phase) * 3.5;
  const sway2 = Math.sin(phase + 1.6) * 3.0;
  const sway3 = Math.sin(phase + 3.2) * 3.8;
  const sway4 = Math.sin(phase + 4.8) * 3.2;

  // 5. Vệt ánh sáng xe điện trên cầu dây văng tương lai
  const energyShift = ((t * 600) % 600);

  // 6. Tinh thể sao lấp lánh (Diamond Stars)
  const starGlow1 = 0.3 + 0.6 * Math.abs(Math.sin(phase));
  const starGlow2 = 0.3 + 0.6 * Math.abs(Math.sin(phase + 1.8));
  const starGlow3 = 0.3 + 0.6 * Math.abs(Math.sin(phase + 3.6));

  return `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient: Trắng ngọc trai Holographic sang trọng, hiện đại -->
    <linearGradient id="cyberBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#F8FAFC"/>
      <stop offset="70%" stop-color="#F1F5F9"/>
      <stop offset="100%" stop-color="#FFFDF7"/>
    </linearGradient>

    <!-- Quầng sáng Vầng Trăng Hoàng Kim Siêu Thực (Holographic Golden Moon) -->
    <radialGradient id="cyberMoonAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="${moonGlowOpacity.toFixed(2)}"/>
      <stop offset="35%" stop-color="#FEF9C3" stop-opacity="${(moonGlowOpacity * 0.6).toFixed(2)}"/>
      <stop offset="70%" stop-color="#38BDF8" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
    </radialGradient>

    <!-- Thân Vầng Trăng 3D Gradient sắc nét -->
    <linearGradient id="cyberMoonBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="25%" stop-color="#FEFCE8"/>
      <stop offset="75%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>

    <!-- Kính bảo hộ phi hành gia ánh xanh holographic -->
    <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.75"/>
      <stop offset="50%" stop-color="#818CF8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#C084FC" stop-opacity="0.7"/>
    </linearGradient>

    <!-- Gradient Đèn lồng Đa diện Origami -->
    <linearGradient id="polyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>
    <linearGradient id="polyGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FCA5A5"/>
      <stop offset="50%" stop-color="#F43F5E"/>
      <stop offset="100%" stop-color="#BE123C"/>
    </linearGradient>
    <linearGradient id="polyGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>

    <radialGradient id="neonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.65"/>
      <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>

    <!-- Thành phố hiện đại Skyline Gradient -->
    <linearGradient id="cityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#94A3B8" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#CBD5E1" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#F1F5F9" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Vệt sáng năng lượng giao thông thông minh -->
    <linearGradient id="energyBeam" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0"/>
      <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- 1. NỀN TRẮNG SỨ HOLOGRAPHIC CÔNG NGHỆ CAO -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#cyberBg)"/>

  <!-- 2. LƯỚI KHÔNG GIAN TỌA ĐỘ KỸ THUẬT SỐ TINH TẾ (CYBER GRID TỐI GIẢN) -->
  <g stroke="#E2E8F0" stroke-width="0.7" opacity="0.4">
    <line x1="0" y1="180" x2="${WIDTH}" y2="180" stroke-dasharray="6,12"/>
    <line x1="0" y1="450" x2="${WIDTH}" y2="450" stroke-dasharray="4,8"/>
    <line x1="0" y1="720" x2="${WIDTH}" y2="720" stroke-dasharray="8,16"/>
  </g>

  <!-- 3. CHÒM SAO HÌNH HỌC KẾT NỐI (GEOMETRIC CONSTELLATIONS) -->
  <g stroke="#CBD5E1" stroke-width="0.8" opacity="0.6">
    <line x1="280" y1="260" x2="420" y2="210"/>
    <line x1="420" y1="210" x2="560" y2="270"/>
    <line x1="560" y1="270" x2="700" y2="230"/>
    <line x1="880" y1="280" x2="1020" y2="220"/>
    <line x1="1020" y1="220" x2="1180" y2="270"/>
  </g>

  <!-- 4. THÀNH PHỐ TƯƠNG LAI SILHOUETTE & CẦU DÂY VĂNG HIỆN ĐẠI DƯỚI TRĂNG (SMART CITY SKYLINE) -->
  <g fill="url(#cityGrad)" opacity="0.65">
    <!-- Các tòa tháp Landmark cao vút hiện đại -->
    <rect x="180" y="660" width="45" height="280" rx="3"/>
    <rect x="235" y="610" width="60" height="330" rx="4"/>
    <polygon points="265,560 250,610 280,610"/> <!-- Tháp Landmark chóp kim -->
    <rect x="305" y="680" width="50" height="260" rx="3"/>
    <rect x="365" y="640" width="70" height="300" rx="4"/>

    <rect x="680" y="650" width="80" height="290" rx="4"/>
    <rect x="770" y="620" width="55" height="320" rx="4"/>
    <rect x="835" y="670" width="65" height="270" rx="3"/>

    <rect x="1100" y="630" width="75" height="310" rx="4"/>
    <polygon points="1137,580 1120,630 1155,630"/>
    <rect x="1185" y="670" width="60" height="270" rx="3"/>

    <!-- Cầu dây văng biểu tượng phát triển -->
    <polygon points="1350,590 1344,880 1356,880"/>
    <polygon points="1520,590 1514,880 1526,880"/>
    <!-- Dây văng thanh thoát -->
    <line x1="1350" y1="620" x2="1240" y2="840" stroke="#94A3B8" stroke-width="1" opacity="0.5"/>
    <line x1="1350" y1="650" x2="1270" y2="840" stroke="#94A3B8" stroke-width="1" opacity="0.5"/>
    <line x1="1350" y1="680" x2="1300" y2="840" stroke="#94A3B8" stroke-width="1" opacity="0.5"/>
    <line x1="1350" y1="620" x2="1435" y2="840" stroke="#94A3B8" stroke-width="1" opacity="0.5"/>
    <line x1="1520" y1="620" x2="1435" y2="840" stroke="#94A3B8" stroke-width="1" opacity="0.5"/>
    <line x1="1520" y1="620" x2="1630" y2="840" stroke="#94A3B8" stroke-width="1" opacity="0.5"/>
  </g>

  <!-- Vệt ánh sáng năng lượng xe điện di chuyển thông minh -->
  <g>
    <line x1="0" y1="840" x2="${WIDTH}" y2="840" stroke="#E2E8F0" stroke-width="2.5"/>
    <line x1="${energyShift}" y1="840" x2="${energyShift + 250}" y2="840" stroke="url(#energyBeam)" stroke-width="4"/>
    <line x1="${((energyShift + 900) % WIDTH)}" y1="840" x2="${((energyShift + 1150) % WIDTH)}" y2="840" stroke="url(#energyBeam)" stroke-width="3"/>
  </g>

  <!-- 5. VẦNG TRĂNG RẰM SIÊU THỰC VÀNH ĐAI QUỸ ĐẠO (NEO-MOON & ORBITAL RING) -->
  <!-- Quầng sáng neon trăng rằm -->
  <circle cx="1630" cy="350" r="${moonR.toFixed(1)}" fill="url(#cyberMoonAura)"/>
  <circle cx="1630" cy="350" r="180" fill="url(#cyberMoonAura)" opacity="0.8"/>
  <!-- Thân trăng tròn hoàn hảo, viền sắc nét hiện đại -->
  <circle cx="1630" cy="350" r="110" fill="url(#cyberMoonBody)" filter="drop-shadow(0 0 40px rgba(254, 240, 138, 0.7))"/>
  <!-- Đốm trăng hình học tinh tế -->
  <circle cx="1590" cy="320" r="14" fill="#F59E0B" opacity="0.25"/>
  <circle cx="1670" cy="340" r="18" fill="#F59E0B" opacity="0.2"/>
  <circle cx="1620" cy="390" r="12" fill="#F59E0B" opacity="0.22"/>

  <!-- Vành đai ánh sáng Quỹ Đạo tương lai (Orbital Light Ring) -->
  <g transform="translate(1630, 350) rotate(${ringRot.toFixed(1)})">
    <ellipse cx="0" cy="0" rx="175" ry="48" fill="none" stroke="#38BDF8" stroke-width="2" opacity="0.75" stroke-dasharray="12,6"/>
    <ellipse cx="0" cy="0" rx="175" ry="48" fill="none" stroke="#FDE047" stroke-width="1.2" opacity="0.9"/>
  </g>

  <!-- Vệ tinh ánh sáng / Ngọc Thỏ Kỹ thuật số di chuyển trên quỹ đạo -->
  <circle cx="${satX.toFixed(1)}" cy="${satY.toFixed(1)}" r="4.5" fill="#38BDF8" filter="drop-shadow(0 0 8px #38bdf8)"/>
  <circle cx="${satX.toFixed(1)}" cy="${satY.toFixed(1)}" r="2" fill="#FFFFFF"/>

  <!-- 6. THỎ PHI HÀNH GIA KHÁM PHÁ CUNG TRĂNG (ASTRO-RABBIT ZERO-GRAVITY) -->
  ${renderAstroRabbit(rabbitX, rabbitY, rabbitRot, 1.25, 0.96)}

  <!-- 7. DẢI LỒNG ĐÈN ORIGAMI & HÌNH HỌC HIỆN ĐẠI (TREO ĐỀU PHÍA TRÊN THẺ XE) -->
  <!-- Dây cáp quang uốn lượn công nghệ -->
  <path d="M -20,180 Q 140,230 300,190 T 600,205 T 900,190 T 1200,210 T 1500,195 T 1800,210 T 1940,200" fill="none" stroke="#CBD5E1" stroke-width="1.2" opacity="0.5"/>

  <!-- Đèn 1 (x=110): Đèn Kim Cương Origami Vàng Cam (Hạ thấp xuống y=210 để không bị che đầu) -->
  ${renderModernLantern(110, 210, sway1, 'diamond', 1.05, 0.95)}

  <!-- Đèn 2 (x=330): Đèn Ngôi Sao Công Nghệ Neon Hiện Đại -->
  ${renderModernLantern(330, 215, sway2, 'star', 1.1, 0.96)}

  <!-- Đèn 3 (x=550): Đèn Khí Cầu Vành Đai Tương Lai -->
  ${renderModernLantern(550, 205, sway3, 'sphere', 1.0, 0.92)}

  <!-- Đèn 4 (x=770): Đèn Kim Cương Origami Đỏ Ruby Pastel -->
  ${renderModernLantern(770, 218, sway4, 'diamond', 1.05, 0.95)}

  <!-- Đèn 5 (x=990): Đèn Ngôi Sao Neon Vàng Hoàng Kim -->
  ${renderModernLantern(990, 210, sway1, 'star', 1.1, 0.96)}

  <!-- Đèn 6 (x=1210): Đèn Khí Cầu Công Nghệ Xanh Cyan -->
  ${renderModernLantern(1210, 215, sway2, 'sphere', 1.0, 0.92)}

  <!-- 8. TINH THỂ SAO HÌNH HỌC LẤP LÁNH (DIAMOND STARS) -->
  <g transform="translate(240, 280) scale(1.2)" opacity="${starGlow1.toFixed(2)}">
    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#FBBF24"/>
    <circle cx="0" cy="0" r="2" fill="#FFFFFF"/>
  </g>
  <g transform="translate(680, 250) scale(1.0)" opacity="${starGlow2.toFixed(2)}">
    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#38BDF8"/>
    <circle cx="0" cy="0" r="2" fill="#FFFFFF"/>
  </g>
  <g transform="translate(1080, 260) scale(1.1)" opacity="${starGlow3.toFixed(2)}">
    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#FBBF24"/>
    <circle cx="0" cy="0" r="2" fill="#FFFFFF"/>
  </g>
  <g transform="translate(1820, 240) scale(1.1)" opacity="${starGlow1.toFixed(2)}">
    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#FBBF24"/>
    <circle cx="0" cy="0" r="2" fill="#FFFFFF"/>
  </g>
</svg>
  `;
}

async function main() {
  console.log(`--- ĐANG TẠO BỨC TRANH TRUNG THU HIỆN ĐẠI (CYBER MID-AUTUMN) 1920x1080 - ${TOTAL_FRAMES} FRAMES ---`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const svg = renderFrameSvg(f);
    const frameBuffer = await sharp(Buffer.from(svg))
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    frames.push(frameBuffer);
    process.stdout.write(`\rRendered frame ${f + 1}/${TOTAL_FRAMES}...`);
  }
  console.log('\nĐang đóng gói thành Animated WebP lặp vô tận...');

  const animatedBuffer = muxAnimatedWebP(frames, DELAY, 0);
  const outputPath = path.resolve(__dirname, '../pictures/stock_card_panorama_trung_thu.webp');
  fs.writeFileSync(outputPath, animatedBuffer);

  console.log(`ĐÃ XUẤT THÀNH CÔNG TRANH ĐỘNG HIỆN ĐẠI TẠI: ${outputPath}`);
  console.log(`Dung lượng file: ${(animatedBuffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Lỗi khi tạo tranh Trung Thu hiện đại:', err);
  process.exit(1);
});
