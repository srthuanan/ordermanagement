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

// BỘ DEFS ĐỒ HỌA SIÊU CẤP CHUNG
const MASTER_DEFS = `
  <defs>
    <!-- FILTER PHÁT QUANG BLOOM TỰ NHIÊN -->
    <filter id="bloomGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2"/>
        <feMergeNode in="blur1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="lanternGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- ĐỔ BÓNG CHIỀU SÂU THỰC TẾ -->
    <filter id="dropShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.65"/>
    </filter>

    <!-- VẦNG TRĂNG RẰM 3D SIÊU THỰC HOÀNG KIM -->
    <radialGradient id="photorealMoon" cx="35%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#fffbeb"/>
      <stop offset="45%" stop-color="#fef08a"/>
      <stop offset="72%" stop-color="#f59e0b"/>
      <stop offset="90%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#92400e"/>
    </radialGradient>

    <!-- HÀO QUANG MẶT TRĂNG KHỔNG LỒ -->
    <radialGradient id="moonAtmosphere" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.8"/>
      <stop offset="35%" stop-color="#fef08a" stop-opacity="0.4"/>
      <stop offset="65%" stop-color="#f59e0b" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- KIM LOẠI VÀNG 24K CUNG ĐÌNH (METALLIC GOLD CHROME) -->
    <linearGradient id="gold24k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#fef08a"/>
      <stop offset="45%" stop-color="#d97706"/>
      <stop offset="70%" stop-color="#ffffff"/>
      <stop offset="85%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>

    <!-- GẤM ĐỎ RUBY HOÀNG GIA -->
    <radialGradient id="royalRuby" cx="38%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#fca5a5"/>
      <stop offset="35%" stop-color="#ef4444"/>
      <stop offset="75%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </radialGradient>

    <!-- LỤA VÀNG HỘI AN 3D -->
    <radialGradient id="royalAmber" cx="38%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#fef08a"/>
      <stop offset="75%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#78350f"/>
    </radialGradient>

    <!-- LỬA NẾN PHÁT QUANG BẬP BÙNG -->
    <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#fef08a"/>
      <stop offset="75%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
    </radialGradient>
`;

// Họa tiết ngôi sao 4 cánh hoàng kim rực rỡ
function renderStarFlare(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.18;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}" filter="url(#softGlow)">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#ffffff" />
      <circle cx="0" cy="0" r="${(inner * 0.9).toFixed(1)}" fill="#fef08a" />
      <!-- Vòng tròn flare ánh sáng -->
      <circle cx="0" cy="0" r="${(r * 0.55).toFixed(1)}" fill="none" stroke="#fef08a" stroke-width="0.5" opacity="0.6"/>
    </g>
  `;
}

// Mây vân cuộn xoắn ốc cung đình dát vàng 3D
function renderOrnateCloud(cx, cy, scale, opacity, flip = false) {
  return `
    <g transform="translate(${cx}, ${cy}) scale(${flip ? -scale : scale}, ${scale})" opacity="${opacity}" filter="url(#dropShadow)">
      <!-- Lớp mây ngoài có viền vàng kim -->
      <path d="M 0,0 C 12,-16 36,-18 50,-6 C 64,-22 96,-18 108,2 C 124,-4 144,10 138,26 C 132,40 114,46 94,42 C 78,48 32,48 14,34 C -6,30 -12,14 0,0 Z" 
            fill="#0f172a" stroke="url(#gold24k)" stroke-width="1.6"/>
      <!-- Lớp lót mây dạ quang -->
      <path d="M 4,2 C 14,-12 34,-14 46,-4 C 58,-18 88,-14 98,4 C 112,-2 130,10 126,22 C 120,34 106,38 88,36 C 74,42 34,42 18,30 C 2,26 -4,12 4,2 Z" 
            fill="#1e293b" opacity="0.85"/>
      <!-- Hoa văn xoắn ốc dát vàng tinh xảo -->
      <path d="M 32,16 C 42,8 58,10 60,22 C 62,30 52,36 44,32 C 38,28 40,20 46,20" fill="none" stroke="url(#gold24k)" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M 82,14 C 90,6 104,10 104,20 C 104,26 96,30 90,28" fill="none" stroke="url(#gold24k)" stroke-width="1.0" stroke-linecap="round"/>
    </g>
  `;
}

// Bụi sao và hạt Bokeh lơ lửng trong không gian
function renderCosmicDust(t) {
  const b1 = Math.sin(t * Math.PI * 2) * 6;
  const b2 = Math.cos(t * Math.PI * 2) * 8;
  return `
    <!-- Bụi tinh vân hoàng kim -->
    <circle cx="210" cy="${60 + b1}" r="1.5" fill="#fef08a" opacity="0.6"/>
    <circle cx="290" cy="${85 - b2}" r="2.2" fill="#f59e0b" opacity="0.4" filter="url(#softGlow)"/>
    <circle cx="340" cy="${45 + b2}" r="1.2" fill="#ffffff" opacity="0.7"/>
    <circle cx="380" cy="${110 + b1}" r="3.0" fill="#fde047" opacity="0.25" filter="url(#softGlow)"/>
    <circle cx="490" cy="${140 - b1}" r="2.0" fill="#fef08a" opacity="0.5"/>
    <circle cx="160" cy="${130 + b2}" r="1.8" fill="#f59e0b" opacity="0.4"/>
  `;
}

// Mặt trăng rằm 3D hoàng kim tuyệt mỹ
function renderMasterMoon(cx = 455, cy = 68, r = 44) {
  return `
    <!-- Quầng hào quang phát sáng nở rộ -->
    <circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="url(#moonAtmosphere)" filter="url(#bloomGlow)"/>
    <!-- Khối trăng rằm 3D chính -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#photorealMoon)" filter="url(#dropShadow)"/>
    
    <!-- Các mảng biển mặt trăng (Lunar Maria) chi tiết siêu thực -->
    <!-- Biển Yên Bình & Biển Mưa (Sea of Tranquility & Imbrium) -->
    <path d="M ${cx - 18},${cy - 16} Q ${cx - 4},${cy - 30} ${cx + 14},${cy - 20} Q ${cx + 28},${cy - 2} ${cx + 12},${cy + 14} Q ${cx - 6},${cy + 8} ${cx - 18},${cy - 16} Z" 
          fill="#78350f" opacity="0.22"/>
    <path d="M ${cx - 28},${cy + 4} Q ${cx - 20},${cy - 6} ${cx - 12},${cy + 2} Q ${cx - 10},${cy + 18} ${cx - 22},${cy + 20} Z" 
          fill="#92400e" opacity="0.2"/>
    <circle cx="${cx + 18}" cy="${cy + 18}" r="7" fill="#b45309" opacity="0.18"/>

    <!-- Vành hố thiên thạch Tycho với hệ thống tia sáng tỏa (Tycho Crater & Rays) -->
    <circle cx="${cx + 8}" cy="${cy + 24}" r="3.5" fill="#fef9c3" opacity="0.7"/>
    <line x1="${cx + 8}" y1="${cy + 24}" x2="${cx - 14}" y2="${cy - 12}" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
    <line x1="${cx + 8}" y1="${cy + 24}" x2="${cx + 26}" y2="${cy - 8}" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>
    <line x1="${cx + 8}" y1="${cy + 24}" x2="${cx - 24}" y2="${cy + 12}" stroke="#fef08a" stroke-width="0.8" opacity="0.35"/>

    <!-- Viền phản quang ánh sáng rực rỡ ở rìa trăng -->
    <circle cx="${cx}" cy="${cy}" r="${r - 0.5}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>
  `;
}

// =========================================================================
// 1. KIỆT TÁC 1: ĐÈN LỒNG GẤM CUNG ĐÌNH THÊU RỒNG VÀNG & SAO BĂNG TRĂNG RẰM
// =========================================================================
function getMasterModel1(t, phase) {
  const sway1 = Math.sin(phase) * 4.5;
  const sway2 = Math.cos(phase + 0.8) * 3.8;
  const flamePulse = 0.85 + 0.15 * Math.sin(phase * 4);
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));

  // Sao băng lướt qua trời đêm
  const starProg = (t * 1.5) % 1;
  const starX = 160 + starProg * 250;
  const starY = 12 + starProg * 55;
  const starAlpha = Math.sin(starProg * Math.PI);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#030611"/>
          <stop offset="40%" stop-color="#070e24"/>
          <stop offset="80%" stop-color="#0e183a"/>
          <stop offset="100%" stop-color="#040816"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad1)"/>
      ${renderCosmicDust(t)}

      <!-- Sao băng lướt chân thực -->
      <line x1="${starX}" y1="${starY}" x2="${starX - 50}" y2="${starY - 12}" stroke="url(#gold24k)" stroke-width="2.2" stroke-linecap="round" opacity="${starAlpha.toFixed(2)}" filter="url(#softGlow)"/>

      <!-- Trăng Rằm 3D Siêu Thực -->
      ${renderMasterMoon(455, 68, 44)}

      <!-- Mây gấm cung đình vắt ngang trăng -->
      ${renderOrnateCloud(340, 50, 0.65, 0.75)}
      ${renderOrnateCloud(405, 95, 0.55, 0.65, true)}

      <!-- ĐÈN LỒNG GẤM ĐỎ RUBY HOÀNG CUNG (Trái cx=75) -->
      <g transform="translate(75, 0)">
        <line x1="0" y1="0" x2="0" y2="24" stroke="url(#gold24k)" stroke-width="1.8"/>
        <g transform="translate(0, 24) rotate(${sway1.toFixed(1)})" filter="url(#dropShadow)">
          <!-- Núm vàng cung đình chạm khắc rồng -->
          <rect x="-10" y="-4" width="20" height="6" rx="2" fill="url(#gold24k)" stroke="#b45309" stroke-width="0.8"/>
          <circle cx="0" cy="-6" r="3" fill="url(#gold24k)"/>

          <!-- Thân đèn tròn gấm thêu hoa -->
          <ellipse cx="0" cy="25" rx="22" ry="26" fill="url(#royalRuby)"/>
          <!-- Múi nan tre vàng uốn lượn 3D -->
          <path d="M 0,-1 C -16,8 -16,42 0,51" fill="none" stroke="url(#gold24k)" stroke-width="1.4" opacity="0.9"/>
          <path d="M 0,-1 C 16,8 16,42 0,51" fill="none" stroke="url(#gold24k)" stroke-width="1.4" opacity="0.9"/>
          <path d="M 0,-1 C -8,8 -8,42 0,51" fill="none" stroke="#fef08a" stroke-width="1.0" opacity="0.8"/>
          <path d="M 0,-1 C 8,8 8,42 0,51" fill="none" stroke="#fef08a" stroke-width="1.0" opacity="0.8"/>
          <line x1="0" y1="-1" x2="0" y2="51" stroke="#ffffff" stroke-width="1.4" opacity="0.7"/>

          <!-- Hào quang lửa nến bên trong đèn -->
          <ellipse cx="0" cy="25" rx="12" ry="14" fill="url(#flameGlow)" opacity="${flamePulse.toFixed(2)}" filter="url(#lanternGlow)"/>

          <!-- Đế đèn vàng chạm trổ & Chùm tua rua lụa tơ tằm dài buông lơi -->
          <rect x="-10" y="50" width="20" height="6" rx="2" fill="url(#gold24k)" stroke="#b45309" stroke-width="0.8"/>
          <!-- Hạt ngọc bích phong thủy giữa đế tua rua -->
          <circle cx="0" cy="62" r="3.5" fill="#10b981" stroke="#fef08a" stroke-width="0.8"/>
          <line x1="-5" y1="56" x2="-6" y2="92" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="0" y1="65" x2="0" y2="102" stroke="url(#gold24k)" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="5" y1="56" x2="6" y2="92" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Chuông đồng mini ở đuôi tua rua -->
          <circle cx="0" cy="98" r="2.5" fill="#f59e0b"/>
        </g>
      </g>

      <!-- ĐÈN LỒNG QUẢ TRÁM VÀNG HOÀNG KIM (cx=145) -->
      <g transform="translate(145, 0)">
        <line x1="0" y1="0" x2="0" y2="16" stroke="url(#gold24k)" stroke-width="1.5"/>
        <g transform="translate(0, 16) rotate(${sway2.toFixed(1)})" filter="url(#dropShadow)">
          <polygon points="0,0 22,26 0,52 -22,26" fill="url(#royalAmber)"/>
          <polygon points="0,0 10,26 0,52 -10,26" fill="#ffffff" opacity="0.35"/>
          <ellipse cx="0" cy="26" rx="9" ry="11" fill="url(#flameGlow)" opacity="${flamePulse.toFixed(2)}"/>
          <rect x="-8" y="51" width="16" height="5" rx="1.5" fill="url(#gold24k)"/>
          <line x1="0" y1="56" x2="0" y2="88" stroke="url(#gold24k)" stroke-width="2.2" stroke-linecap="round"/>
        </g>
      </g>

      ${renderStarFlare(270, 45, 5.5, s1)}
      ${renderStarFlare(360, 95, 4.5, s1)}
    </svg>
  `;
}

// =========================================================================
// 2. KIỆT TÁC 2: THỎ NGỌC LÔNG TUYẾT 3D & HOA SEN PHÁT QUANG THẦN THOẠI
// =========================================================================
function getMasterModel2(t, phase) {
  const earTilt = Math.sin(phase) * 4;
  const rabbitBreath = Math.sin(phase) * 2;
  const lotusBreath = 1 + 0.05 * Math.sin(phase);
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c0721"/>
          <stop offset="45%" stop-color="#18113c"/>
          <stop offset="85%" stop-color="#241554"/>
          <stop offset="100%" stop-color="#060312"/>
        </linearGradient>
        <radialGradient id="rabbitFur3D" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="65%" stop-color="#f8fafc"/>
          <stop offset="85%" stop-color="#e2e8f0"/>
          <stop offset="100%" stop-color="#94a3b8"/>
        </radialGradient>
        <linearGradient id="masterLotusPetal" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="35%" stop-color="#fbcfe8"/>
          <stop offset="75%" stop-color="#f43f5e"/>
          <stop offset="100%" stop-color="#9f1239"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad2)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(455, 68, 44)}

      <!-- ĐẦM SEN NGỌC BÍCH NỞ HOA 5 TẦNG CÁNH (cx=165, cy=140) -->
      <g transform="translate(165, 140) scale(${lotusBreath})" filter="url(#dropShadow)">
        <ellipse cx="0" cy="14" rx="42" ry="12" fill="#065f46" stroke="#10b981" stroke-width="1.2"/>
        <!-- Tầng cánh sen 1 (ngoài) -->
        <path d="M -28,8 C -34,-8 -12,-24 0,-28 C 12,-24 34,-8 28,8 Z" fill="url(#masterLotusPetal)" opacity="0.85"/>
        <!-- Tầng cánh sen 2 (giữa) -->
        <path d="M -20,8 C -24,-2 -10,-20 0,-24 C 10,-20 24,-2 20,8 Z" fill="url(#masterLotusPetal)"/>
        <!-- Tầng cánh sen 3 (trong) -->
        <path d="M -10,8 C -12,0 0,-22 0,-22 C 0,-22 12,0 10,8 Z" fill="url(#masterLotusPetal)"/>
        <!-- Nhụy sen phát sáng rực rỡ với hạt phấn hoa -->
        <circle cx="0" cy="-6" r="6" fill="#fef08a" filter="url(#softGlow)"/>
        <circle cx="0" cy="-6" r="2.8" fill="#f59e0b"/>
      </g>

      <!-- THỎ NGỌC LÔNG TUYẾT 3D CHÂN THẬT (cx=85, cy=128) -->
      <g transform="translate(85, ${128 + rabbitBreath})" filter="url(#dropShadow)">
        <!-- Đám mây ngũ sắc nâng đỡ -->
        <ellipse cx="0" cy="22" rx="34" ry="10" fill="url(#goldCloudGrad)" stroke="url(#gold24k)" stroke-width="1"/>
        <!-- Thân thỏ ngọc 3D bầu bĩnh -->
        <ellipse cx="0" cy="8" rx="28" ry="22" fill="url(#rabbitFur3D)"/>
        <!-- Đuôi thỏ bông trắng muốt -->
        <circle cx="26" cy="4" r="8.5" fill="#ffffff" filter="url(#softGlow)"/>
        <!-- Chân trước thỏ -->
        <ellipse cx="-16" cy="22" rx="8" ry="5" fill="#f8fafc"/>
        <ellipse cx="-6" cy="24" rx="9" ry="5" fill="#ffffff"/>

        <!-- Đầu thỏ ngọc 3D -->
        <circle cx="-16" cy="-6" r="17" fill="url(#rabbitFur3D)"/>
        <!-- Đôi mắt hồng ngọc ruby long lanh có phản quang -->
        <circle cx="-22" cy="-9" r="4.2" fill="#e11d48"/>
        <circle cx="-22" cy="-9" r="3.2" fill="#be123c"/>
        <circle cx="-24" cy="-11" r="1.5" fill="#ffffff"/>
        <!-- Mũi hồng chúm chím & Râu thỏ trắng -->
        <circle cx="-31" cy="-4" r="1.8" fill="#fb7185"/>
        <line x1="-31" y1="-2" x2="-44" y2="-4" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>
        <line x1="-31" y1="-1" x2="-43" y2="4" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>

        <!-- Đôi tai thỏ ngọc dài vươn cao lắc lư -->
        <g transform="translate(-18, -22) rotate(${-12 + earTilt})">
          <ellipse cx="0" cy="-14" rx="5.5" ry="20" fill="url(#rabbitFur3D)"/>
          <ellipse cx="0" cy="-14" rx="3" ry="15" fill="#fbcfe8"/>
        </g>
        <g transform="translate(-8, -22) rotate(${10 - earTilt})">
          <ellipse cx="0" cy="-14" rx="5.5" ry="20" fill="url(#rabbitFur3D)"/>
          <ellipse cx="0" cy="-14" rx="3" ry="15" fill="#fbcfe8"/>
        </g>
      </g>

      ${renderStarFlare(280, 50, 5.0, s1)}
    </svg>
  `;
}

// =========================================================================
// 3. KIỆT TÁC 3: MÁI NGÓI ÂM DƯƠNG CỔ KÍNH & DÀN 5 ĐÈN LỒNG HỘI AN NGŨ SẮC
// =========================================================================
function getMasterModel3(t, phase) {
  const lanterns = [
    { x: 55, colorGrad: 'royalRuby', off: 0 },
    { x: 125, colorGrad: 'royalAmber', off: 0.8 },
    { x: 195, colorGrad: 'royalRuby', off: 1.6 },
    { x: 265, colorGrad: 'royalAmber', off: 2.4 },
    { x: 335, colorGrad: 'royalRuby', off: 3.2 },
  ];
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#050814"/>
          <stop offset="50%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#02040a"/>
        </linearGradient>
        <linearGradient id="ancientTile" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ea580c"/>
          <stop offset="35%" stop-color="#c2410c"/>
          <stop offset="70%" stop-color="#7c2d12"/>
          <stop offset="100%" stop-color="#451a03"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad3)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(465, 75, 42)}

      <!-- MÁI NGÓI ÂM DƯƠNG RÊU PHONG CỔ KÍNH UỐN LƯỢN -->
      <g filter="url(#dropShadow)">
        <!-- Khung gỗ xà gồ nhà cổ -->
        <path d="M 0,0 L 400,0 Q 360,18 330,22 Q 180,32 0,34 Z" fill="#291505"/>
        <!-- Từng lớp ngói ống âm dương lượn sóng -->
        <path d="M 0,26 Q 180,24 330,18 Q 365,14 400,2 Q 380,20 340,28 Q 180,36 0,38 Z" fill="url(#ancientTile)"/>
        <!-- Mũi đao cong vút Hội An chạm khắc rồng vàng -->
        <path d="M 375,6 Q 410,-6 422,-14 Q 410,12 380,18 Z" fill="url(#gold24k)"/>
      </g>

      <!-- DÀN 5 ĐÈN LỒNG LỤA HỘI AN ĐUNG ĐƯA THEO GIÓ THU -->
      ${lanterns.map(l => {
        const sway = Math.sin(phase + l.off) * 5;
        const roofY = 30 - Math.sin((l.x / 400) * Math.PI) * 8;
        return `
          <g transform="translate(${l.x}, ${roofY})">
            <line x1="0" y1="0" x2="0" y2="18" stroke="url(#gold24k)" stroke-width="1.4"/>
            <g transform="translate(0, 18) rotate(${sway.toFixed(1)})" filter="url(#dropShadow)">
              <!-- Núm đồng vàng -->
              <rect x="-8" y="-3" width="16" height="5" rx="1.5" fill="url(#gold24k)"/>
              <!-- Thân đèn lồng gấm quả cầu -->
              <ellipse cx="0" cy="22" rx="18" ry="22" fill="url(#${l.colorGrad})"/>
              <!-- Nan tre vàng uốn cong -->
              <path d="M 0,0 C -12,8 -12,36 0,44" fill="none" stroke="url(#gold24k)" stroke-width="1.0" opacity="0.85"/>
              <path d="M 0,0 C 12,8 12,36 0,44" fill="none" stroke="url(#gold24k)" stroke-width="1.0" opacity="0.85"/>
              <!-- Lửa nến rực rỡ bên trong -->
              <circle cx="0" cy="22" r="7" fill="url(#flameGlow)" filter="url(#softGlow)"/>
              <!-- Chùm tua rua buông dài -->
              <rect x="-8" y="43" width="16" height="5" rx="1.5" fill="url(#gold24k)"/>
              <line x1="0" y1="48" x2="0" y2="82" stroke="url(#gold24k)" stroke-width="2" stroke-linecap="round"/>
              <circle cx="0" cy="56" r="2.5" fill="#fef08a"/>
            </g>
          </g>
        `;
      }).join('')}
    </svg>
  `;
}

// =========================================================================
// 4. KIỆT TÁC 4: ĐẦU LÂN SƯ RỒNG 3D GIÁP VÀNG MẮT BÍCH & ĐẠI TIỆC PHÁO HOA
// =========================================================================
function getMasterModel4(t, phase) {
  const lionBob = Math.sin(phase) * 4;
  const eyeBlink = Math.sin(phase * 3) > 0.85 ? 0.2 : 1.0;
  const fw1R = 14 + ((t * 2) % 1) * 32;
  const fw1A = Math.sin(((t * 2) % 1) * Math.PI);
  const fw2R = 10 + (((t * 2) + 0.5) % 1) * 28;
  const fw2A = Math.sin((((t * 2) + 0.5) % 1) * Math.PI);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#180404"/>
          <stop offset="50%" stop-color="#2c0808"/>
          <stop offset="100%" stop-color="#080101"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad4)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(460, 65, 42)}

      <!-- CHÙM PHÁO HOA ĐA SẮC RỰC SÁNG BẦU TRỜI -->
      <g transform="translate(280, 52)" opacity="${fw1A.toFixed(2)}" filter="url(#bloomGlow)">
        <circle cx="0" cy="0" r="${fw1R}" fill="none" stroke="url(#gold24k)" stroke-width="1.8" stroke-dasharray="3,4"/>
        <line x1="-${fw1R}" y1="0" x2="${fw1R}" y2="0" stroke="#ef4444" stroke-width="1.6"/>
        <line x1="0" y1="-${fw1R}" x2="0" y2="${fw1R}" stroke="#ef4444" stroke-width="1.6"/>
      </g>
      <g transform="translate(370, 78)" opacity="${fw2A.toFixed(2)}" filter="url(#bloomGlow)">
        <circle cx="0" cy="0" r="${fw2R}" fill="none" stroke="#f43f5e" stroke-width="1.4" stroke-dasharray="2,3"/>
      </g>

      <!-- ĐẦU LÂN SƯ RỒNG HOÀNG GIA 3D (cx=85, cy=112) -->
      <g transform="translate(85, ${112 + lionBob})" filter="url(#dropShadow)">
        <!-- Bờm lửa rực cháy quanh đầu -->
        <path d="M -38,-12 Q -52,-28 -28,-32 Q -10,-46 0,-30 Q 10,-46 28,-32 Q 52,-28 38,-12 Z" fill="#ef4444"/>
        <path d="M -28,-8 Q -38,-22 -18,-24 Q -4,-34 0,-22 Q 4,-34 18,-24 Q 38,-22 28,-8 Z" fill="url(#gold24k)"/>
        <!-- Khối sọ lân bọc gấm đỏ ruby -->
        <ellipse cx="0" cy="4" rx="34" ry="28" fill="url(#royalRuby)"/>
        <!-- Sừng lân độc giác trung tâm dát vàng 24k -->
        <polygon points="0,-28 -6,-10 6,-10" fill="url(#gold24k)" stroke="#b45309" stroke-width="1"/>
        <circle cx="0" cy="-28" r="3.5" fill="#ef4444" filter="url(#softGlow)"/>

        <!-- Đôi mắt Lân ngọc bích phát sáng linh thiêng -->
        <ellipse cx="-14" cy="0" rx="9" ry="10" fill="#ffffff"/>
        <circle cx="-14" cy="0" r="6" fill="#10b981" opacity="${eyeBlink}" filter="url(#softGlow)"/>
        <circle cx="-16" cy="-2" r="2" fill="#ffffff"/>
        <ellipse cx="14" cy="0" rx="9" ry="10" fill="#ffffff"/>
        <circle cx="14" cy="0" r="6" fill="#10b981" opacity="${eyeBlink}" filter="url(#softGlow)"/>
        <circle cx="12" cy="-2" r="2" fill="#ffffff"/>

        <!-- Mũi sư tử & Miệng Lân há rộng ngậm châu ngọc -->
        <circle cx="0" cy="12" r="7.5" fill="#ea580c"/>
        <circle cx="0" cy="20" r="5.5" fill="#ef4444"/>
        <!-- Râu lân vàng bay phấp phới -->
        <path d="M -22,14 Q -42,26 -34,42" fill="none" stroke="url(#gold24k)" stroke-width="3" stroke-linecap="round"/>
        <path d="M 22,14 Q 42,26 34,42" fill="none" stroke="url(#gold24k)" stroke-width="3" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 5. KIỆT TÁC 5: ĐÈN CÁ CHÉP VƯỢT VŨ MÔN HÓA RỒNG & THÁC SÓNG BẠC
// =========================================================================
function getMasterModel5(t, phase) {
  const fishY = Math.sin(phase) * 8;
  const fishRot = Math.cos(phase) * 6;
  const tailWag = Math.sin(phase * 3) * 14;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021120"/>
          <stop offset="50%" stop-color="#052844"/>
          <stop offset="100%" stop-color="#010810"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad5)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(460, 65, 42)}

      <!-- SÓNG NƯỚC BẠC ÁNH TRĂNG NÂNG BƯỚC -->
      <path d="M 0,165 Q 135,150 270,165 T 540,165" fill="none" stroke="#38bdf8" stroke-width="2.2" opacity="0.5" filter="url(#softGlow)"/>
      <path d="M 0,180 Q 135,170 270,180 T 540,180" fill="none" stroke="#38bdf8" stroke-width="1.4" opacity="0.35"/>

      <!-- ĐÈN CÁ CHÉP HÓA RỒNG VƯƠN CAO 3D (cx=105, cy=112) -->
      <g transform="translate(105, ${112 + fishY}) rotate(${fishRot.toFixed(1)})" filter="url(#dropShadow)">
        <ellipse cx="0" cy="0" rx="38" ry="20" fill="url(#royalAmber)"/>
        <!-- Vảy cá chép xếp tầng dát vàng 3D -->
        <path d="M -10,-10 Q 0,-4 -10,2 Q 0,8 -10,14" fill="none" stroke="url(#gold24k)" stroke-width="1.6"/>
        <path d="M 6,-10 Q 16,-4 6,2 Q 16,8 6,14" fill="none" stroke="url(#gold24k)" stroke-width="1.6"/>
        <!-- Mắt cá chép ngọc đen láy -->
        <circle cx="22" cy="-5" r="4" fill="#0f172a"/>
        <circle cx="23.5" cy="-6.5" r="1.4" fill="#ffffff"/>
        <!-- Vây lưng dựng đứng kiêu hãnh -->
        <path d="M -18,-18 Q 0,-30 18,-16" fill="none" stroke="#ea580c" stroke-width="3"/>
        <!-- Đuôi cá vẫy sóng -->
        <g transform="translate(-34, 0) rotate(${tailWag.toFixed(1)})">
          <path d="M 0,0 Q -24,-22 -34,-12 Q -18,0 -34,12 Q -24,22 0,0" fill="#f97316" opacity="0.9"/>
        </g>
        <!-- Râu rồng oai phong phát sáng -->
        <path d="M 30,-3 Q 48,-16 56,-8" fill="none" stroke="url(#gold24k)" stroke-width="2.5" stroke-linecap="round" filter="url(#softGlow)"/>
        <path d="M 30,3 Q 48,16 56,8" fill="none" stroke="url(#gold24k)" stroke-width="2.5" stroke-linecap="round" filter="url(#softGlow)"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 6. KIỆT TÁC 6: ĐÊM HỘI THẢ ĐÈN TRỜI THIÊN ĐĂNG KHỔNG MINH
// =========================================================================
function getMasterModel6(t, phase) {
  const lanterns = [
    { x: 50, speed: 0.85, scale: 0.75, delay: 0 },
    { x: 105, speed: 1.15, scale: 1.25, delay: 0.2 },
    { x: 165, speed: 0.75, scale: 0.65, delay: 0.5 },
    { x: 225, speed: 1.05, scale: 1.05, delay: 0.1 },
    { x: 285, speed: 1.25, scale: 0.85, delay: 0.7 },
    { x: 345, speed: 0.90, scale: 1.35, delay: 0.35 },
    { x: 405, speed: 1.00, scale: 0.70, delay: 0.6 },
  ];
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0418"/>
          <stop offset="50%" stop-color="#1b0a33"/>
          <stop offset="100%" stop-color="#05010b"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad6)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(455, 65, 42)}

      <!-- HÀNG CHỤC THIÊN ĐĂNG KHỔNG MINH LƠ LỬNG TRƯỜNG ẢNH CHIỀU SÂU -->
      ${lanterns.map(l => {
        const y = 215 - (((t * l.speed + l.delay) % 1) * 235);
        const x = l.x + Math.sin(phase + l.delay * 4) * 9;
        const alpha = Math.sin((Math.max(0, Math.min(200, y)) / 200) * Math.PI);
        return `
          <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${l.scale})" opacity="${alpha.toFixed(2)}" filter="url(#dropShadow)">
            <!-- Hào quang ấm tỏa ra từ tim đèn -->
            <ellipse cx="0" cy="14" rx="22" ry="24" fill="#f59e0b" opacity="0.4" filter="url(#bloomGlow)"/>
            <!-- Thân đèn giấy bọc lụa ấm áp -->
            <path d="M -12,0 L -16,28 L 16,28 L 12,0 Z" fill="#ea580c"/>
            <ellipse cx="0" cy="28" rx="16" ry="5" fill="url(#gold24k)"/>
            <!-- Lửa nến rực sáng từ đáy đèn -->
            <ellipse cx="0" cy="18" rx="7" ry="9" fill="url(#flameGlow)"/>
            <circle cx="0" cy="20" r="3.5" fill="#ffffff"/>
          </g>
        `;
      }).join('')}
    </svg>
  `;
}

// =========================================================================
// 7. KIỆT TÁC 7: BÁNH NƯỚNG HOÀNG KIM 3D CUNG ĐÌNH & TRÀ SEN BỐC KHÓI
// =========================================================================
function getMasterModel7(t, phase) {
  const leafY = 115 + (t * 85);
  const leafX = 265 + Math.sin(phase) * 16;
  const steamY = Math.sin(phase) * 5;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#140902"/>
          <stop offset="50%" stop-color="#2a1404"/>
          <stop offset="100%" stop-color="#0a0400"/>
        </linearGradient>
        <radialGradient id="cakeCrustMaster" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="25%" stop-color="#fef08a"/>
          <stop offset="55%" stop-color="#f59e0b"/>
          <stop offset="85%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#78350f"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad7)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(455, 65, 42)}

      <!-- BÁNH TRUNG THU HOÀNG KIM 3D CHẠM NỔI CHỮ PHÚC (cx=95, cy=128) -->
      <g transform="translate(95, 128)" filter="url(#dropShadow)">
        <ellipse cx="0" cy="18" rx="42" ry="16" fill="#000000" opacity="0.45"/>
        <ellipse cx="0" cy="14" rx="38" ry="17" fill="#78350f"/>
        <ellipse cx="0" cy="6" rx="38" ry="17" fill="#b45309"/>
        <ellipse cx="0" cy="0" rx="36" ry="16" fill="url(#cakeCrustMaster)"/>
        <!-- Rãnh hoa văn hoa cúc & chữ Phúc đúc nổi vàng kim -->
        <ellipse cx="0" cy="0" rx="26" ry="11" fill="none" stroke="url(#gold24k)" stroke-width="2"/>
        <circle cx="0" cy="0" r="7.5" fill="url(#gold24k)"/>
      </g>

      <!-- CHÉN TRÀ MEN NGỌC BỐC LÀN KHÓI THƠM LƯỢN SÓNG (cx=175, cy=140) -->
      <g transform="translate(175, 140)" filter="url(#dropShadow)">
        <ellipse cx="0" cy="12" rx="20" ry="8" fill="#78350f"/>
        <ellipse cx="0" cy="4" rx="18" ry="7" fill="#065f46"/>
        <ellipse cx="0" cy="2" rx="16" ry="6" fill="#10b981"/>
        <!-- Làn khói trà bốc lên mềm mại -->
        <path d="M -5,-2 Q 0,${-16 + steamY} 8,-30" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.65" stroke-linecap="round"/>
      </g>

      <!-- LÁ THU VÀNG RƠI CHAO NGHIÊNG -->
      <g transform="translate(${leafX.toFixed(1)}, ${leafY.toFixed(1)})" opacity="0.85" filter="url(#softGlow)">
        <path d="M 0,-10 Q 8,-6 9,0 Q 4,8 0,10 Q -4,8 -9,0 Q -8,-6 0,-10 Z" fill="#f59e0b"/>
        <line x1="0" y1="-10" x2="0" y2="11" stroke="#b45309" stroke-width="0.8"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 8. KIỆT TÁC 8: ĐÈN KÉO QUÂN HOÀNG GIA 6 MẶT DÁT VÀNG CHIẾU BÓNG 3D
// =========================================================================
function getMasterModel8(t, phase) {
  const rotAngle = (t * Math.PI * 2);
  const cosRot = Math.cos(rotAngle);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad8" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14030a"/>
          <stop offset="50%" stop-color="#260514"/>
          <stop offset="100%" stop-color="#080104"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad8)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(455, 65, 40)}

      <!-- DIỀM GẤM CUNG ĐÌNH DÁT VÀNG NẸP HOA VĂN -->
      <path d="M 0,0 L 540,0 L 540,18 Q 472,26 405,18 Q 337,10 270,18 Q 202,26 135,18 Q 67,10 0,18 Z" fill="#991b1b"/>
      <line x1="0" y1="18" x2="540" y2="18" stroke="url(#gold24k)" stroke-width="2.2"/>

      <!-- ĐÈN KÉO QUÂN LỤC GIÁC KHỔNG LỒ 3D (cx=100, cy=112) -->
      <g transform="translate(100, 112)" filter="url(#dropShadow)">
        <!-- Mái che đèn kéo quân chạm rồng vàng -->
        <polygon points="0,-46 38,-28 -38,-28" fill="url(#gold24k)" stroke="#b45309" stroke-width="1.2"/>
        <!-- Thân đèn lồng kính sáng rực rỡ -->
        <rect x="-32" y="-28" width="64" height="54" fill="#fef08a" opacity="0.9" rx="3" filter="url(#softGlow)"/>
        <rect x="-32" y="-28" width="64" height="54" fill="none" stroke="url(#gold24k)" stroke-width="2" rx="3"/>
        
        <!-- BÓNG ĐOÀN RƯỚC ĐÈN XOAY 3D CHIẾU BÓNG -->
        <g transform="scale(${cosRot.toFixed(2)}, 1)">
          <circle cx="0" cy="-8" r="7" fill="#1e1b4b"/>
          <line x1="0" y1="-1" x2="0" y2="16" stroke="#1e1b4b" stroke-width="3.5"/>
          <line x1="0" y1="3" x2="12" y2="-4" stroke="#1e1b4b" stroke-width="2"/>
          <polygon points="12,-8 17,-3 10,-3" fill="#1e1b4b"/>
        </g>
        <rect x="-36" y="26" width="72" height="9" rx="2" fill="url(#gold24k)"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 9. KIỆT TÁC 9: CÂY ĐA ĐẠI THỤ NGHÌN NĂM & CHÚ CUỘI THỔI SÁO ÁNH SAO
// =========================================================================
function getMasterModel9(t, phase) {
  const cuoiBob = Math.sin(phase) * 3;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad9" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021711"/>
          <stop offset="50%" stop-color="#062e21"/>
          <stop offset="100%" stop-color="#010d0a"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad9)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(455, 65, 42)}

      <!-- CÂY ĐA ĐẠI THỤ NGHÌN NĂM GÂN GUỐC (cx=75, cy=105) -->
      <g transform="translate(75, 105)" filter="url(#dropShadow)">
        <circle cx="-24" cy="-60" r="36" fill="#14532d" opacity="0.9"/>
        <circle cx="10" cy="-70" r="40" fill="#15803d" opacity="0.95"/>
        <circle cx="32" cy="-50" r="32" fill="#16a34a" opacity="0.85"/>
        <!-- Thân cây đa uốn lượn cổ kính -->
        <path d="M -22,50 Q -6,0 4,-40 Q 14,0 24,50 Z" fill="#78350f"/>
        <!-- Rễ phụ buông rủ -->
        <path d="M -14,6 Q -22,28 -16,50" fill="none" stroke="#92400e" stroke-width="2.2"/>
        <path d="M 14,6 Q 20,28 18,50" fill="none" stroke="#92400e" stroke-width="2.2"/>

        <!-- CHÚ CUỘI NGỒI GỐC CÂY THỔI SÁO TRÚC -->
        <g transform="translate(26, ${22 + cuoiBob})">
          <ellipse cx="0" cy="2" rx="10" ry="12" fill="#b45309"/>
          <circle cx="0" cy="-14" r="7" fill="#fef08a"/>
          <!-- Cây sáo trúc phát ra nốt nhạc ánh sao -->
          <line x1="-14" y1="-9" x2="18" y2="-15" stroke="#16a34a" stroke-width="2.6" stroke-linecap="round"/>
        </g>
      </g>

      <!-- DẢI NỐT NHẠC ÁNH SAO NỐI TẬN CUNG TRĂNG -->
      <path d="M 120,90 Q 280,22 425,65" fill="none" stroke="url(#gold24k)" stroke-width="2.8" stroke-dasharray="5,5" filter="url(#softGlow)"/>
      <path d="M 120,90 Q 280,22 425,65" fill="none" stroke="#ffffff" stroke-width="1.0" opacity="0.85"/>
      ${renderStarFlare(270, 45, 5.5, s1)}
    </svg>
  `;
}

// =========================================================================
// 10. KIỆT TÁC 10: CHỊ HẰNG NGA TUYỆT SẮC XIÊM Y NGHÊ THƯỜNG & DẢI LỤA TIÊN
// =========================================================================
function getMasterModel10(t, phase) {
  const hangBob = Math.sin(phase) * 4.5;
  const ribbonWave = Math.sin(phase) * 12;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${MASTER_DEFS}
        <linearGradient id="skyGrad10" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14061a"/>
          <stop offset="50%" stop-color="#280c36"/>
          <stop offset="100%" stop-color="#0a020d"/>
        </linearGradient>
        <linearGradient id="fairySilkMaster" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.95"/>
          <stop offset="40%" stop-color="#fef08a" stop-opacity="0.9"/>
          <stop offset="80%" stop-color="#fb7185" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad10)"/>
      ${renderCosmicDust(t)}
      ${renderMasterMoon(455, 65, 42)}

      <!-- DẢI LỤA TIÊN NGHÊ THƯỜNG UỐN LƯỢN TOÀN BỘ BANNER -->
      <path d="M 35,112 Q 220,${30 + ribbonWave} 410,${65 + hangBob}" fill="none" stroke="url(#fairySilkMaster)" stroke-width="3.6" stroke-linecap="round" filter="url(#bloomGlow)"/>
      <path d="M 35,112 Q 220,${30 + ribbonWave} 410,${65 + hangBob}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.9" stroke-linecap="round"/>

      <!-- HÌNH BÓNG TIÊN NỮ CHỊ HẰNG NGA BAY LƯỢN (cx=415, cy=65) -->
      <g transform="translate(415, ${65 + hangBob})" filter="url(#dropShadow)">
        <ellipse cx="6" cy="20" rx="18" ry="7" fill="#ffffff" opacity="0.95" filter="url(#softGlow)"/>
        <circle cx="0" cy="17" r="7" fill="#ffffff"/>
        <!-- Tà váy lụa tiên đào hồng -->
        <path d="M -7,4 C -12,16 -16,28 -5,30 C 7,30 12,20 9,4 Z" fill="#f472b6" stroke="url(#gold24k)" stroke-width="0.8"/>
        <!-- Áo tiên ngọc trắng -->
        <ellipse cx="1" cy="0" rx="5" ry="7" fill="#ffffff"/>
        <!-- Khuôn mặt thanh tú & Búi tóc tiên cài hoa -->
        <circle cx="2" cy="-11" r="5" fill="#fef08a"/>
        <ellipse cx="0.5" cy="-17" rx="5" ry="3.5" fill="#1e293b"/>
        <circle cx="-2.5" cy="-18" r="1.8" fill="#fb7185"/>
      </g>
      ${renderStarFlare(190, 65, 5.5, s1)}
    </svg>
  `;
}

const MASTER_MODELS = [
  getMasterModel1,
  getMasterModel2,
  getMasterModel3,
  getMasterModel4,
  getMasterModel5,
  getMasterModel6,
  getMasterModel7,
  getMasterModel8,
  getMasterModel9,
  getMasterModel10
];

async function generateModel(modelIdx) {
  const modelNum = modelIdx + 1;
  console.log(`Đang render SIÊU KIỆT TÁC Model ${modelNum}/10 (SVG Masterpiece)...`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;
    const svgStr = MASTER_MODELS[modelIdx](t, phase);

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

  console.log(`Hoàn tất Siêu Kiệt Tác Model ${modelNum}: ${(animWebp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log('=== BẮT ĐẦU KỸ THUẬT RENDER SVG SIÊU XỊN CHO 10 MẪU VIN HERO CARD ===');
  for (let i = 0; i < 10; i++) {
    await generateModel(i);
  }
  console.log('=== TOÀN BỘ 10 SIÊU KIỆT TÁC ĐÃ HOÀN TẤT ĐỈNH CAO! ===');
}

main().catch(console.error);
