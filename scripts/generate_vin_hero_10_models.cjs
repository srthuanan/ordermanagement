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

function renderSparkle(cx, cy, size, opacity, color = '#eab308') {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="${color}" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

// ----------------------------------------------------
// 10 MODEL GENERATORS FOR VIN HERO CARD (540 x 200)
// ----------------------------------------------------

// MODEL 1: Midnight Celestial Lanterns & Full Moon
function getModel1Svg(t, phase) {
  const sway1 = Math.sin(phase) * 4;
  const sway2 = Math.cos(phase) * 3.5;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 2));
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m1Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#070a14"/><stop offset="50%" stop-color="#0f172a"/><stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <radialGradient id="m1Moon" cx="38%" cy="38%" r="62%">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="35%" stop-color="#fef08a"/><stop offset="75%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m1Sky)"/>
      <circle cx="450" cy="65" r="55" fill="#fef08a" opacity="0.3"/>
      <circle cx="450" cy="65" r="38" fill="url(#m1Moon)"/>
      <path d="M 438,55 Q 448,45 458,52 Q 465,65 455,75 Z" fill="#b45309" opacity="0.2"/>
      
      <!-- Đèn lồng treo góc trái -->
      <g transform="translate(60, 0)">
        <line x1="0" y1="0" x2="0" y2="35" stroke="#94a3b8" stroke-width="1.2"/>
        <g transform="translate(0, 35) rotate(${sway1.toFixed(1)})">
          <ellipse cx="0" cy="18" rx="14" ry="17" fill="#ef4444"/>
          <ellipse cx="0" cy="18" rx="7" ry="17" fill="#f87171"/>
          <rect x="-6" y="0" width="12" height="3" fill="#f59e0b" rx="1"/>
          <rect x="-6" y="33" width="12" height="3" fill="#f59e0b" rx="1"/>
          <line x1="0" y1="36" x2="0" y2="55" stroke="#ef4444" stroke-width="1.8"/>
        </g>
      </g>
      <g transform="translate(120, 0)">
        <line x1="0" y1="0" x2="0" y2="25" stroke="#94a3b8" stroke-width="1.2"/>
        <g transform="translate(0, 25) rotate(${sway2.toFixed(1)})">
          <polygon points="0,0 14,18 0,36 -14,18" fill="#f59e0b"/>
          <polygon points="0,0 6,18 0,36 -6,18" fill="#fef08a"/>
          <line x1="0" y1="36" x2="0" y2="52" stroke="#f59e0b" stroke-width="1.5"/>
        </g>
      </g>
      ${renderSparkle(260, 45, 4.5, s1)}
      ${renderSparkle(360, 85, 3.5, s2)}
      ${renderSparkle(490, 140, 3.8, s1)}
    </svg>
  `;
}

// MODEL 2: Thỏ Ngọc Cung Trăng & Vườn Hoa Sen
function getModel2Svg(t, phase) {
  const rabbitEar = Math.sin(phase) * 3;
  const lotusBreath = 1 + 0.04 * Math.sin(phase);
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m2Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f0c29"/><stop offset="50%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#090d16"/>
        </linearGradient>
        <radialGradient id="m2Moon" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="40%" stop-color="#fef9c3"/><stop offset="80%" stop-color="#fde047"/><stop offset="100%" stop-color="#eab308"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m2Sky)"/>
      <circle cx="450" cy="65" r="50" fill="#fef08a" opacity="0.25"/>
      <circle cx="450" cy="65" r="36" fill="url(#m2Moon)"/>

      <!-- Thỏ Ngọc dễ thương ở góc trái -->
      <g transform="translate(80, 130)">
        <ellipse cx="0" cy="12" rx="20" ry="15" fill="#ffffff"/>
        <circle cx="-12" cy="0" r="13" fill="#ffffff"/>
        <circle cx="-15" cy="-2" r="2.2" fill="#ef4444"/>
        <!-- Tai thỏ ngọc -->
        <ellipse cx="-16" cy="-18" rx="4" ry="12" fill="#ffffff" transform="rotate(${-10 + rabbitEar}, -16, -18)"/>
        <ellipse cx="-16" cy="-18" rx="2" ry="9" fill="#fbcfe8" transform="rotate(${-10 + rabbitEar}, -16, -18)"/>
        <ellipse cx="-9" cy="-18" rx="4" ry="12" fill="#ffffff" transform="rotate(${10 - rabbitEar}, -9, -18)"/>
        <ellipse cx="-9" cy="-18" rx="2" ry="9" fill="#fbcfe8" transform="rotate(${10 - rabbitEar}, -9, -18)"/>
        <!-- Đuôi bông tròn -->
        <circle cx="18" cy="8" r="6" fill="#ffffff"/>
      </g>

      <!-- Đèn Hoa Sen ngọc bích -->
      <g transform="translate(150, 140) scale(${lotusBreath})">
        <ellipse cx="0" cy="8" rx="24" ry="6" fill="#10b981" opacity="0.8"/>
        <path d="M -16,4 C -18,-6 -6,-16 0,-18 C 6,-16 18,-6 16,4 Z" fill="#ec4899" opacity="0.85"/>
        <path d="M -10,4 C -12,-3 0,-14 0,-14 C 0,-14 12,-3 10,4 Z" fill="#fbcfe8"/>
        <circle cx="0" cy="-4" r="3" fill="#fef08a"/>
      </g>
      ${renderSparkle(280, 50, 4.2, s1)}
      ${renderSparkle(380, 80, 3.5, s1)}
    </svg>
  `;
}

// MODEL 3: Mái Vòm 7 Đèn Lồng Đa Sắc Phố Cổ Hội An
function getModel3Svg(t, phase) {
  const lanterns = [
    { x: 50, color: '#ef4444', off: 0 },
    { x: 110, color: '#f59e0b', off: 0.8 },
    { x: 170, color: '#10b981', off: 1.6 },
    { x: 230, color: '#3b82f6', off: 2.4 },
    { x: 290, color: '#ec4899', off: 3.2 },
    { x: 350, color: '#f59e0b', off: 4.0 },
    { x: 410, color: '#ef4444', off: 4.8 },
  ];
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m3Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b0f19"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#030712"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m3Sky)"/>
      <circle cx="480" cy="70" r="42" fill="#fef08a" opacity="0.2"/>
      <circle cx="480" cy="70" r="28" fill="#fde047"/>

      <!-- Dây đèn giăng ngang uốn cong -->
      <path d="M 0,20 Q 270,45 540,20" fill="none" stroke="#64748b" stroke-width="1.2"/>

      ${lanterns.map(l => {
        const sway = Math.sin(phase + l.off) * 4.5;
        const cy = 20 + Math.sin((l.x / 540) * Math.PI) * 20;
        return `
          <g transform="translate(${l.x}, ${cy}) rotate(${sway.toFixed(1)})">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#94a3b8" stroke-width="1"/>
            <ellipse cx="0" cy="24" rx="10" ry="12" fill="${l.color}"/>
            <ellipse cx="0" cy="24" rx="5" ry="12" fill="#ffffff" opacity="0.3"/>
            <line x1="0" y1="36" x2="0" y2="48" stroke="${l.color}" stroke-width="1.4"/>
          </g>
        `;
      }).join('')}
    </svg>
  `;
}

// MODEL 4: Lân Sư Rồng Rước Lộc & Pháo Hoa Trăng Rằm
function getModel4Svg(t, phase) {
  const lionBob = Math.sin(phase) * 3;
  const fwRadius = 12 + ((t * 2) % 1) * 26;
  const fwAlpha = Math.sin(((t * 2) % 1) * Math.PI);
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m4Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1c0a0a"/><stop offset="50%" stop-color="#2d0f0f"/><stop offset="100%" stop-color="#0a0505"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m4Sky)"/>
      <circle cx="450" cy="65" r="36" fill="#fde047"/>

      <!-- Pháo hoa bung tỏa -->
      <g transform="translate(280, 50)" opacity="${fwAlpha.toFixed(2)}">
        <circle cx="0" cy="0" r="${fwRadius}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,4"/>
        <line x1="-${fwRadius}" y1="0" x2="${fwRadius}" y2="0" stroke="#ef4444" stroke-width="1.2"/>
        <line x1="0" y1="-${fwRadius}" x2="0" y2="${fwRadius}" stroke="#ef4444" stroke-width="1.2"/>
      </g>

      <!-- Đầu Lân sư rồng góc trái -->
      <g transform="translate(75, ${110 + lionBob})">
        <ellipse cx="0" cy="0" rx="28" ry="22" fill="#ef4444"/>
        <circle cx="0" cy="-14" r="7" fill="#f59e0b"/>
        <!-- Mắt lân -->
        <circle cx="-11" cy="-4" r="6" fill="#ffffff"/>
        <circle cx="-11" cy="-4" r="3.5" fill="#10b981"/>
        <circle cx="11" cy="-4" r="6" fill="#ffffff"/>
        <circle cx="11" cy="-4" r="3.5" fill="#10b981"/>
        <!-- Miệng lân & Râu lân -->
        <path d="M -18,12 Q 0,22 18,12 Z" fill="#b91c1c"/>
        <path d="M -22,6 Q -30,16 -24,24" fill="none" stroke="#f59e0b" stroke-width="2"/>
        <path d="M 22,6 Q 30,16 24,24" fill="none" stroke="#f59e0b" stroke-width="2"/>
      </g>
    </svg>
  `;
}

// MODEL 5: Đèn Cá Chép Vượt Vũ Môn Hóa Rồng & Hồ Sen
function getModel5Svg(t, phase) {
  const fishY = Math.sin(phase) * 6;
  const fishRot = Math.cos(phase) * 5;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m5Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021526"/><stop offset="50%" stop-color="#032b43"/><stop offset="100%" stop-color="#010e1a"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m5Sky)"/>
      <circle cx="460" cy="65" r="38" fill="#fef08a"/>

      <!-- Sóng nước hoàng kim phía dưới -->
      <path d="M 0,160 Q 135,150 270,160 T 540,160" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.4"/>
      <path d="M 0,175 Q 135,168 270,175 T 540,175" fill="none" stroke="#38bdf8" stroke-width="0.8" opacity="0.3"/>

      <!-- Đèn Cá Chép Hóa Rồng nhảy sóng -->
      <g transform="translate(90, ${115 + fishY}) rotate(${fishRot.toFixed(1)})">
        <ellipse cx="0" cy="0" rx="26" ry="13" fill="#ea580c"/>
        <ellipse cx="-5" cy="0" rx="16" ry="9" fill="#fde047"/>
        <circle cx="15" cy="-4" r="2.5" fill="#0f172a"/>
        <circle cx="16" cy="-5" r="0.8" fill="#ffffff"/>
        <!-- Đuôi cá chép uốn lượn -->
        <path d="M -24,0 Q -38,-14 -42,-8 Q -32,0 -42,8 Q -38,14 -24,0" fill="#f97316"/>
        <!-- Râu rồng oai vệ -->
        <path d="M 22,-2 Q 32,-10 38,-4" fill="none" stroke="#fef08a" stroke-width="1.5"/>
        <path d="M 22,2 Q 32,10 38,4" fill="none" stroke="#fef08a" stroke-width="1.5"/>
      </g>
      ${renderSparkle(260, 60, 4.5, s1)}
    </svg>
  `;
}

// MODEL 6: Đêm Hội Thả Đèn Trời Thiên Đăng Bay Ngút Ngàn
function getModel6Svg(t, phase) {
  const lanterns = [
    { baseX: 60, speed: 1.0, size: 0.9 },
    { baseX: 130, speed: 1.3, size: 1.2 },
    { baseX: 200, speed: 0.8, size: 0.7 },
    { baseX: 270, speed: 1.1, size: 1.0 },
    { baseX: 340, speed: 1.4, size: 0.85 },
    { baseX: 410, speed: 0.9, size: 1.15 },
  ];
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m6Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090514"/><stop offset="50%" stop-color="#1a0c2e"/><stop offset="100%" stop-color="#05020a"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m6Sky)"/>
      <circle cx="450" cy="65" r="40" fill="#fef08a" opacity="0.3"/>
      <circle cx="450" cy="65" r="30" fill="#fde047"/>

      ${lanterns.map((l, i) => {
        const y = 190 - (((t * l.speed + i * 0.18) % 1) * 200);
        const x = l.baseX + Math.sin(phase + i) * 6;
        const opacity = Math.sin((y / 200) * Math.PI);
        return `
          <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${l.size})" opacity="${opacity.toFixed(2)}">
            <path d="M -8,0 L -10,16 L 10,16 L 8,0 Z" fill="#ea580c" opacity="0.9"/>
            <ellipse cx="0" cy="16" rx="10" ry="3" fill="#f59e0b"/>
            <ellipse cx="0" cy="8" rx="5" ry="6" fill="#fef08a"/>
          </g>
        `;
      }).join('')}
    </svg>
  `;
}

// MODEL 7: Bánh Nướng Hoàng Kim 3D & Trà Sen Thưởng Nguyệt
function getModel7Svg(t, phase) {
  const leafY = 140 + (t * 60);
  const leafX = 260 + Math.sin(phase) * 12;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m7Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#140f07"/><stop offset="50%" stop-color="#241a0e"/><stop offset="100%" stop-color="#0a0703"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m7Sky)"/>
      <circle cx="450" cy="65" r="38" fill="#fde047"/>

      <!-- Bánh nướng hoàng kim 3D -->
      <g transform="translate(85, 125)">
        <ellipse cx="0" cy="12" rx="30" ry="14" fill="#78350f"/>
        <ellipse cx="0" cy="4" rx="30" ry="14" fill="#b45309"/>
        <ellipse cx="0" cy="0" rx="28" ry="13" fill="#d97706"/>
        <!-- Hoa văn bánh Trung Thu -->
        <circle cx="0" cy="0" r="14" fill="none" stroke="#fef08a" stroke-width="1.4"/>
        <circle cx="0" cy="0" r="6" fill="#fef08a"/>
      </g>

      <!-- Tách trà bốc khói -->
      <g transform="translate(155, 135)">
        <ellipse cx="0" cy="8" rx="16" ry="6" fill="#92400e"/>
        <ellipse cx="0" cy="2" rx="14" ry="5" fill="#15803d"/>
        <path d="M -4,-2 Q 0,${-10 + Math.sin(phase)*3} 4,-18" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.6"/>
      </g>

      <!-- Lá thu rơi -->
      <g transform="translate(${leafX.toFixed(1)}, ${leafY.toFixed(1)})" opacity="0.75">
        <path d="M 0,-6 Q 4,-4 5,0 Q 2,4 0,6 Q -2,4 -5,0 Q -4,-4 0,-6 Z" fill="#f59e0b"/>
      </g>
      ${renderSparkle(320, 60, 4.2, s1)}
    </svg>
  `;
}

// MODEL 8: Đèn Kéo Quân Hoàng Gia Chiếu Bóng & Diềm Gấm
function getModel8Svg(t, phase) {
  const rotAngle = (t * 360).toFixed(1);
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m8Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#120409"/><stop offset="50%" stop-color="#240713"/><stop offset="100%" stop-color="#080204"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m8Sky)"/>
      <circle cx="450" cy="65" r="36" fill="#fde047"/>

      <!-- Diềm gấm cung đình phía trên -->
      <path d="M 0,0 L 540,0 L 540,16 Q 472,24 405,16 Q 337,8 270,16 Q 202,24 135,16 Q 67,8 0,16 Z" fill="#b91c1c"/>
      <line x1="0" y1="16" x2="540" y2="16" stroke="#f59e0b" stroke-width="1.5"/>

      <!-- Đèn kéo quân hoàng gia xoay -->
      <g transform="translate(85, 115)">
        <polygon points="0,-36 28,-22 -28,-22" fill="#d97706"/>
        <rect x="-24" y="-22" width="48" height="42" fill="#fef08a" opacity="0.85" rx="3"/>
        <!-- Trục xoay bóng hình bên trong -->
        <g transform="scale(${Math.cos(phase)}, 1)">
          <circle cx="0" cy="0" r="8" fill="#1e1b4b"/>
          <line x1="0" y1="8" x2="0" y2="16" stroke="#1e1b4b" stroke-width="2"/>
        </g>
        <rect x="-26" y="20" width="52" height="6" fill="#b45309" rx="2"/>
      </g>
    </svg>
  `;
}

// MODEL 9: Cây Đa Chú Cuội Thổi Sáo & Dải Nốt Nhạc Ánh Sao
function getModel9Svg(t, phase) {
  const cuoiBob = Math.sin(phase) * 2;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m9Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021a14"/><stop offset="50%" stop-color="#062e24"/><stop offset="100%" stop-color="#010f0b"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m9Sky)"/>
      <circle cx="450" cy="65" r="38" fill="#fef08a"/>

      <!-- Cây Đa Cổ Thụ góc trái -->
      <g transform="translate(70, 110)">
        <circle cx="-16" cy="-45" r="28" fill="#15803d" opacity="0.8"/>
        <circle cx="10" cy="-55" r="30" fill="#16a34a" opacity="0.85"/>
        <path d="M -14,40 Q -4,0 2,-30 Q 8,0 16,40 Z" fill="#78350f"/>

        <!-- Chú Cuội ngồi thổi sáo -->
        <g transform="translate(18, ${18 + cuoiBob})">
          <ellipse cx="0" cy="2" rx="7" ry="9" fill="#b45309"/>
          <circle cx="0" cy="-10" r="5" fill="#fef08a"/>
          <!-- Cây sáo trúc -->
          <line x1="-10" y1="-6" x2="12" y2="-10" stroke="#16a34a" stroke-width="1.8"/>
        </g>
      </g>

      <!-- Dải nốt nhạc ánh sao bay ngang trời -->
      <path d="M 120,95 Q 280,30 430,65" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="4,4"/>
      ${renderSparkle(250, 50, 4.5, s1)}
    </svg>
  `;
}

// MODEL 10: Chị Hằng Nga Bay Lượn Cung Quảng Hàn & Dải Lụa Tiên
function getModel10Svg(t, phase) {
  const hangBob = Math.sin(phase) * 3.5;
  const ribbonWave = Math.sin(phase) * 8;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="m10Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#140a1c"/><stop offset="50%" stop-color="#241233"/><stop offset="100%" stop-color="#0b050f"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m10Sky)"/>
      <circle cx="450" cy="65" r="50" fill="#fef08a" opacity="0.3"/>
      <circle cx="450" cy="65" r="38" fill="#fde047"/>

      <!-- Dải lụa tiên đào hồng bay lượn trải dài cả banner -->
      <path d="M 50,110 Q 200,${40 + ribbonWave} 390,${65 + hangBob}" fill="none" stroke="#f472b6" stroke-width="2.5" opacity="0.85"/>
      <path d="M 50,110 Q 200,${40 + ribbonWave} 390,${65 + hangBob}" fill="none" stroke="#fef08a" stroke-width="1" opacity="0.75"/>

      <!-- Chị Hằng Nga bay trên cung trăng -->
      <g transform="translate(410, ${65 + hangBob})">
        <ellipse cx="6" cy="16" rx="14" ry="5" fill="#ffffff" opacity="0.9"/>
        <path d="M -5,4 C -8,12 -12,20 -4,22 C 4,22 8,16 6,4 Z" fill="#f472b6"/>
        <ellipse cx="1" cy="0" rx="4" ry="5" fill="#ffffff"/>
        <circle cx="2" cy="-9" r="4" fill="#fef08a"/>
        <ellipse cx="0.5" cy="-13" rx="4" ry="2.5" fill="#1e293b"/>
      </g>
      ${renderSparkle(180, 70, 4.2, s1)}
    </svg>
  `;
}

const MODEL_GENERATORS = [
  getModel1Svg,
  getModel2Svg,
  getModel3Svg,
  getModel4Svg,
  getModel5Svg,
  getModel6Svg,
  getModel7Svg,
  getModel8Svg,
  getModel9Svg,
  getModel10Svg
];

async function generateModel(modelIdx) {
  const modelNum = modelIdx + 1;
  console.log(`Bắt đầu render Model ${modelNum}/10 cho VIN Hero Card...`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;
    const svgStr = MODEL_GENERATORS[modelIdx](t, phase);

    const webpBuf = await sharp(Buffer.from(svgStr))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animWebp = muxAnimatedWebP(frames, DELAY, 0);

  const filePictures = path.resolve(__dirname, `../pictures/vin_hero_card_bg_v${modelNum}_trung_thu.webp`);
  const filePublic = path.resolve(__dirname, `../public/assets/vin_hero_card_bg_v${modelNum}_trung_thu.webp`);

  fs.writeFileSync(filePictures, animWebp);
  fs.writeFileSync(filePublic, animWebp);

  // Đối với Model 1: Lưu thêm vào vin_hero_card_bg_trung_thu.webp để tương thích ngược 100%
  if (modelNum === 1) {
    fs.writeFileSync(path.resolve(__dirname, '../pictures/vin_hero_card_bg_trung_thu.webp'), animWebp);
    fs.writeFileSync(path.resolve(__dirname, '../public/assets/vin_hero_card_bg_trung_thu.webp'), animWebp);
  }

  console.log(`Hoàn tất Model ${modelNum}: ${(animWebp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log('=== TẠO 10 MẪU VIN HERO CARD TRUNG THU (540 x 200) ===');
  for (let i = 0; i < 10; i++) {
    await generateModel(i);
  }
  console.log('=== ĐÃ TẠO XONG TOÀN BỘ 10 MẪU CHO VIN HERO CARD! ===');
}

main().catch(console.error);
