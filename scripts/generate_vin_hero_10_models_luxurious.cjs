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

// Hàm vẽ ngôi sao 4 cánh hoàng kim lấp lánh
function renderSparkle(cx, cy, size, opacity, color = '#fef08a') {
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

// Đám mây xoắn ốc gấm cung đình phong cách hoàng gia
function renderRoyalCloud(cx, cy, scale, opacity, flip = false) {
  return `
    <g transform="translate(${cx}, ${cy}) scale(${flip ? -scale : scale}, ${scale})" opacity="${opacity}">
      <path d="M 0,0 C 8,-12 28,-14 38,-4 C 48,-16 72,-14 80,0 C 92,-4 106,6 102,18 C 98,28 84,32 70,30 C 58,34 24,34 10,24 C -4,22 -8,10 0,0 Z" 
            fill="url(#goldCloudGrad)" stroke="#f59e0b" stroke-width="0.8"/>
      <!-- Vân xoắn ốc bên trong mây -->
      <path d="M 25,12 C 32,6 45,8 46,16 C 47,22 40,26 34,24" fill="none" stroke="#fef08a" stroke-width="0.7" stroke-linecap="round"/>
      <path d="M 62,10 C 68,4 78,8 78,14 C 78,18 72,22 66,20" fill="none" stroke="#fef08a" stroke-width="0.7" stroke-linecap="round"/>
    </g>
  `;
}

// Header defs chung cao cấp: Gradient Trăng Rằm 3D siêu thực & Mây Gấm
const COMMON_DEFS = `
  <defs>
    <!-- Trăng Rằm 3D Hoàng Kim Siêu Thực -->
    <radialGradient id="luxMoonSurface" cx="36%" cy="36%" r="64%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#fef9c3"/>
      <stop offset="55%" stop-color="#fde047"/>
      <stop offset="82%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>
    
    <!-- Quầng hào quang vầng trăng -->
    <radialGradient id="luxMoonCorona" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="#f59e0b" stop-opacity="0.25"/>
      <stop offset="75%" stop-color="#d97706" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Mây gấm hoàng kim -->
    <linearGradient id="goldCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#fef3c7" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#fde68a" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Gradient lụa đỏ ruby cho lồng đèn gấm -->
    <radialGradient id="rubySilk" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#f87171"/>
      <stop offset="40%" stop-color="#ef4444"/>
      <stop offset="80%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </radialGradient>

    <!-- Gradient đèn lồng vàng kim Hội An -->
    <radialGradient id="amberSilk" cx="38%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="30%" stop-color="#fef08a"/>
      <stop offset="70%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>

    <!-- Ánh lửa nến bên trong lồng đèn -->
    <radialGradient id="candleFlame" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#fef08a"/>
      <stop offset="80%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
    </radialGradient>
`;

// =========================================================================
// 1. MẪU 1: BẦU TRỜI ĐÊM CUNG ĐÌNH, TRĂNG RẰM 3D & ĐÈN LỒNG GẤM THÊU HOA VĂN
// =========================================================================
function getModel1Svg(t, phase) {
  const sway1 = Math.sin(phase) * 4;
  const sway2 = Math.cos(phase + 0.6) * 3.5;
  const candlePulse = 0.8 + 0.2 * Math.sin(phase * 3);
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.8));

  // Vệt sao băng lướt qua
  const starProg = (t * 1.6) % 1;
  const starX = 180 + starProg * 220;
  const starY = 15 + starProg * 50;
  const starAlpha = Math.sin(starProg * Math.PI) * 0.85;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m1Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#04060d"/>
          <stop offset="45%" stop-color="#0a1020"/>
          <stop offset="85%" stop-color="#111836"/>
          <stop offset="100%" stop-color="#060913"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m1Sky)"/>

      <!-- Hào quang & Vầng trăng rằm 3D chân thật -->
      <circle cx="455" cy="68" r="75" fill="url(#luxMoonCorona)"/>
      <circle cx="455" cy="68" r="44" fill="url(#luxMoonSurface)"/>
      <!-- Vết biển mặt trăng chân thật -->
      <path d="M 440,54 Q 452,42 466,50 Q 476,66 464,78 Q 450,72 440,54 Z" fill="#b45309" opacity="0.18"/>
      <path d="M 430,72 Q 436,65 442,70 Q 444,80 436,82 Z" fill="#92400e" opacity="0.15"/>
      <circle cx="468" cy="80" r="5" fill="#d97706" opacity="0.16"/>

      <!-- Mây gấm bay ngang trăng -->
      ${renderRoyalCloud(360, 48, 0.7, 0.45)}
      ${renderRoyalCloud(410, 85, 0.6, 0.35, true)}

      <!-- Sao băng lướt nhẹ -->
      <line x1="${starX}" y1="${starY}" x2="${starX - 42}" y2="${starY - 10}" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round" opacity="${starAlpha.toFixed(2)}"/>

      <!-- ĐÈN LỒNG GẤM ĐỎ 1 (Bên Trái) -->
      <g transform="translate(68, 0)">
        <line x1="0" y1="0" x2="0" y2="28" stroke="#cbd5e1" stroke-width="1.2"/>
        <g transform="translate(0, 28) rotate(${sway1.toFixed(1)})">
          <!-- Núm treo đồng chạm trổ -->
          <rect x="-8" y="-3" width="16" height="5" rx="1.5" fill="#f59e0b" stroke="#b45309" stroke-width="0.8"/>
          <!-- Thân đèn lồng quả cầu gấm đỏ -->
          <ellipse cx="0" cy="22" rx="18" ry="22" fill="url(#rubySilk)"/>
          <!-- Nan tre vàng uốn cong chia múi đèn -->
          <path d="M 0,0 C -12,8 -12,36 0,44" fill="none" stroke="#fef08a" stroke-width="1.0" opacity="0.85"/>
          <path d="M 0,0 C 12,8 12,36 0,44" fill="none" stroke="#fef08a" stroke-width="1.0" opacity="0.85"/>
          <line x1="0" y1="0" x2="0" y2="44" stroke="#fde047" stroke-width="1.2" opacity="0.9"/>
          <!-- Đốm lửa nến rực rỡ bên trong -->
          <circle cx="0" cy="22" r="8" fill="url(#candleFlame)" opacity="${candlePulse.toFixed(2)}"/>
          <!-- Đế đèn đồng & Chùm tua rua lụa đỏ óng ả -->
          <rect x="-8" y="43" width="16" height="5" rx="1.5" fill="#f59e0b" stroke="#b45309" stroke-width="0.8"/>
          <line x1="-3" y1="48" x2="-4" y2="76" stroke="#ef4444" stroke-width="1.6"/>
          <line x1="0" y1="48" x2="0" y2="82" stroke="#f59e0b" stroke-width="1.8"/>
          <line x1="3" y1="48" x2="4" y2="76" stroke="#ef4444" stroke-width="1.6"/>
          <circle cx="0" cy="54" r="2.5" fill="#fef08a"/>
        </g>
      </g>

      <!-- ĐÈN LỒNG QUẢ TRÁM VÀNG HỘI AN 2 -->
      <g transform="translate(132, 0)">
        <line x1="0" y1="0" x2="0" y2="18" stroke="#cbd5e1" stroke-width="1.2"/>
        <g transform="translate(0, 18) rotate(${sway2.toFixed(1)})">
          <polygon points="0,0 18,22 0,44 -18,22" fill="url(#amberSilk)"/>
          <polygon points="0,0 8,22 0,44 -8,22" fill="#ffffff" opacity="0.35"/>
          <circle cx="0" cy="22" r="7" fill="url(#candleFlame)" opacity="${candlePulse.toFixed(2)}"/>
          <line x1="0" y1="44" x2="0" y2="72" stroke="#f59e0b" stroke-width="1.8"/>
        </g>
      </g>

      ${renderSparkle(260, 45, 4.8, s1)}
      ${renderSparkle(350, 95, 3.8, s2)}
      ${renderSparkle(490, 145, 4.2, s1)}
    </svg>
  `;
}

// =========================================================================
// 2. MẪU 2: THỎ NGỌC LÔNG TUYẾT CUNG TRĂNG & ĐẦM SEN NGỌC BÍCH NỞ HOA
// =========================================================================
function getModel2Svg(t, phase) {
  const earWiggle = Math.sin(phase) * 3.5;
  const rabbitBreathe = Math.sin(phase) * 1.5;
  const lotusBreath = 1 + 0.04 * Math.sin(phase);
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
  const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 2));

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m2Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c0721"/>
          <stop offset="50%" stop-color="#18133b"/>
          <stop offset="100%" stop-color="#060312"/>
        </linearGradient>
        <!-- Gradient đổ bóng 3D mượt mà cho Thỏ Ngọc -->
        <radialGradient id="rabbitFur" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="70%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </radialGradient>
        <!-- Gradient cánh sen hồng ngọc đa tầng -->
        <linearGradient id="lotusPetal" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="45%" stop-color="#fbcfe8"/>
          <stop offset="85%" stop-color="#f43f5e"/>
          <stop offset="100%" stop-color="#be123c"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m2Sky)"/>

      <!-- Vầng trăng rằm huyền ảo -->
      <circle cx="455" cy="68" r="70" fill="url(#luxMoonCorona)"/>
      <circle cx="455" cy="68" r="42" fill="url(#luxMoonSurface)"/>

      <!-- ĐẦM SEN NGỌC BÍCH NỞ HOA (Góc Trái Dưới cx=155, cy=145) -->
      <g transform="translate(155, 145) scale(${lotusBreath})">
        <!-- Lá sen xanh biếc nâng đỡ -->
        <ellipse cx="0" cy="12" rx="36" ry="10" fill="#047857" opacity="0.9"/>
        <ellipse cx="0" cy="12" rx="28" ry="6" fill="#10b981"/>
        <!-- Cánh sen lớp ngoài -->
        <path d="M -24,8 C -28,-6 -10,-20 0,-24 C 10,-20 28,-6 24,8 Z" fill="url(#lotusPetal)" opacity="0.8"/>
        <!-- Cánh sen lớp giữa -->
        <path d="M -16,8 C -20,-2 -8,-18 0,-22 C 8,-18 20,-2 16,8 Z" fill="url(#lotusPetal)"/>
        <!-- Cánh sen trung tâm ôm búp -->
        <path d="M -8,8 C -10,0 0,-20 0,-20 C 0,-20 10,0 8,8 Z" fill="url(#lotusPetal)"/>
        <!-- Nhụy sen vàng ngọc tỏa sáng -->
        <circle cx="0" cy="-6" r="4.5" fill="#fef08a"/>
        <circle cx="0" cy="-6" r="2.2" fill="#f59e0b"/>
      </g>

      <!-- THỎ NGỌC LÔNG TUYẾT 3D CHÂN THẬT (Góc Trái cx=80, cy=132) -->
      <g transform="translate(80, ${132 + rabbitBreathe})">
        <!-- Đám mây tiên nâng chân thỏ -->
        <ellipse cx="0" cy="20" rx="28" ry="8" fill="#ffffff" opacity="0.25"/>
        <!-- Thân thỏ ngọc 3D bầu bĩnh -->
        <ellipse cx="0" cy="10" rx="24" ry="18" fill="url(#rabbitFur)"/>
        <!-- Đuôi bông thỏ tròn xoe -->
        <circle cx="22" cy="6" r="7" fill="#ffffff"/>
        <!-- Chân thỏ xếp gọn gàng -->
        <ellipse cx="-8" cy="22" rx="10" ry="5" fill="#e2e8f0"/>
        <!-- Đầu thỏ ngọc -->
        <circle cx="-14" cy="-4" r="15" fill="url(#rabbitFur)"/>
        <!-- Mắt thỏ ngọc hạt lựu đỏ long lanh -->
        <circle cx="-19" cy="-6" r="3.2" fill="#e11d48"/>
        <circle cx="-20" cy="-7" r="1.2" fill="#ffffff"/>
        <!-- Mũi hồng chúm chím -->
        <circle cx="-27" cy="-2" r="1.5" fill="#fb7185"/>
        <!-- Tai thỏ ngọc dài vươn lên lắc lư -->
        <g transform="translate(-16, -18) rotate(${-12 + earWiggle})">
          <ellipse cx="0" cy="-12" rx="4.5" ry="16" fill="url(#rabbitFur)"/>
          <ellipse cx="0" cy="-12" rx="2.5" ry="12" fill="#fbcfe8"/>
        </g>
        <g transform="translate(-8, -18) rotate(${8 - earWiggle})">
          <ellipse cx="0" cy="-12" rx="4.5" ry="16" fill="url(#rabbitFur)"/>
          <ellipse cx="0" cy="-12" rx="2.5" ry="12" fill="#fbcfe8"/>
        </g>
      </g>

      ${renderSparkle(280, 50, 4.5, s1)}
      ${renderSparkle(370, 80, 3.8, s2)}
    </svg>
  `;
}

// =========================================================================
// 3. MẪU 3: MÁI NGÓI ÂM DƯƠNG PHỐ CỔ & DÀN 5 ĐÈN LỒNG HỘI AN NGŨ SẮC
// =========================================================================
function getModel3Svg(t, phase) {
  const lanterns = [
    { x: 55, colorGrad: 'rubySilk', delay: 0 },
    { x: 125, colorGrad: 'amberSilk', delay: 0.8 },
    { x: 195, colorGrad: 'rubySilk', delay: 1.6 },
    { x: 265, colorGrad: 'amberSilk', delay: 2.4 },
    { x: 335, colorGrad: 'rubySilk', delay: 3.2 },
  ];
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m3Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#080c18"/>
          <stop offset="50%" stop-color="#111827"/>
          <stop offset="100%" stop-color="#03060f"/>
        </linearGradient>
        <linearGradient id="roofWood" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#78350f"/>
          <stop offset="100%" stop-color="#451a03"/>
        </linearGradient>
        <linearGradient id="tileTerracotta" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ea580c"/>
          <stop offset="50%" stop-color="#c2410c"/>
          <stop offset="100%" stop-color="#7c2d12"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m3Sky)"/>
      <circle cx="465" cy="75" r="65" fill="url(#luxMoonCorona)"/>
      <circle cx="465" cy="75" r="40" fill="url(#luxMoonSurface)"/>

      <!-- MÁI NGÓI ÂM DƯƠNG CỔ KÍNH TRẢI DÀI PHÍA TRÊN -->
      <path d="M 0,0 L 390,0 Q 360,18 330,22 Q 180,30 0,32 Z" fill="url(#roofWood)"/>
      <!-- Hàng ngói ống uốn lượn cong vút -->
      <path d="M 0,26 Q 180,24 330,18 Q 365,14 395,2 Q 380,18 340,26 Q 180,34 0,36 Z" fill="url(#tileTerracotta)"/>
      <!-- Đầu đao cong vút Hội An -->
      <path d="M 375,6 Q 405,-4 415,-12 Q 405,10 380,16 Z" fill="#f59e0b"/>

      <!-- 5 ĐÈN LỒNG LỤA HỘI AN ĐUNG ĐƯA THEO GIÓ -->
      ${lanterns.map(l => {
        const sway = Math.sin(phase + l.delay) * 4.5;
        const roofY = 28 - Math.sin((l.x / 400) * Math.PI) * 6;
        return `
          <g transform="translate(${l.x}, ${roofY})">
            <line x1="0" y1="0" x2="0" y2="16" stroke="#94a3b8" stroke-width="1.2"/>
            <g transform="translate(0, 16) rotate(${sway.toFixed(1)})">
              <!-- Núm vàng -->
              <rect x="-6" y="-2" width="12" height="4" rx="1" fill="#f59e0b"/>
              <!-- Thân đèn tròn gấm -->
              <ellipse cx="0" cy="18" rx="15" ry="18" fill="url(#${l.colorGrad})"/>
              <!-- Nan đèn chỉ vàng -->
              <path d="M 0,0 C -10,6 -10,30 0,36" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.8"/>
              <path d="M 0,0 C 10,6 10,30 0,36" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.8"/>
              <!-- Chùm tua rua lụa buông dài -->
              <rect x="-6" y="34" width="12" height="4" rx="1" fill="#f59e0b"/>
              <line x1="0" y1="38" x2="0" y2="64" stroke="#f59e0b" stroke-width="1.8"/>
              <circle cx="0" cy="44" r="2.2" fill="#fef08a"/>
            </g>
          </g>
        `;
      }).join('')}
    </svg>
  `;
}

// =========================================================================
// 4. MẪU 4: ĐẦU LÂN SƯ RỒNG RƯỚC LỘC 3D & PHÁO HOA TRĂNG RẰM
// =========================================================================
function getModel4Svg(t, phase) {
  const lionBob = Math.sin(phase) * 3.5;
  const eyeBlink = Math.sin(phase * 3) > 0.8 ? 0.2 : 1.0;
  const fwRadius1 = 12 + ((t * 2) % 1) * 28;
  const fwAlpha1 = Math.sin(((t * 2) % 1) * Math.PI);
  const fwRadius2 = 10 + (((t * 2) + 0.5) % 1) * 24;
  const fwAlpha2 = Math.sin((((t * 2) + 0.5) % 1) * Math.PI);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m4Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1c0505"/>
          <stop offset="50%" stop-color="#2d0a0a"/>
          <stop offset="100%" stop-color="#080202"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m4Sky)"/>
      <circle cx="460" cy="65" r="40" fill="url(#luxMoonSurface)"/>

      <!-- Pháo hoa hoàng kim nổ chùm 1 -->
      <g transform="translate(280, 52)" opacity="${fwAlpha1.toFixed(2)}">
        <circle cx="0" cy="0" r="${fwRadius1}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,4"/>
        <line x1="-${fwRadius1}" y1="0" x2="${fwRadius1}" y2="0" stroke="#ef4444" stroke-width="1.4"/>
        <line x1="0" y1="-${fwRadius1}" x2="0" y2="${fwRadius1}" stroke="#ef4444" stroke-width="1.4"/>
        <line x1="-${fwRadius1*0.7}" y1="-${fwRadius1*0.7}" x2="${fwRadius1*0.7}" y2="${fwRadius1*0.7}" stroke="#fef08a" stroke-width="1.2"/>
        <line x1="-${fwRadius1*0.7}" y1="${fwRadius1*0.7}" x2="${fwRadius1*0.7}" y2="-${fwRadius1*0.7}" stroke="#fef08a" stroke-width="1.2"/>
      </g>
      <!-- Pháo hoa đỏ nổ chùm 2 -->
      <g transform="translate(370, 75)" opacity="${fwAlpha2.toFixed(2)}">
        <circle cx="0" cy="0" r="${fwRadius2}" fill="none" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="2,3"/>
        <line x1="-${fwRadius2}" y1="0" x2="${fwRadius2}" y2="0" stroke="#f59e0b" stroke-width="1.2"/>
        <line x1="0" y1="-${fwRadius2}" x2="0" y2="${fwRadius2}" stroke="#f59e0b" stroke-width="1.2"/>
      </g>

      <!-- ĐẦU LÂN SƯ RỒNG HOÀNG GIA 3D (Góc Trái cx=80, cy=115) -->
      <g transform="translate(80, ${115 + lionBob})">
        <!-- Hào quang lửa đỏ bờm lân -->
        <path d="M -32,-10 Q -44,-24 -24,-28 Q -8,-38 0,-26 Q 8,-38 24,-28 Q 44,-24 32,-10 Z" fill="#ef4444"/>
        <path d="M -24,-6 Q -32,-18 -16,-20 Q -4,-28 0,-18 Q 4,-28 16,-20 Q 32,-18 24,-6 Z" fill="#f59e0b"/>
        <!-- Khối sọ lân bọc gấm đỏ -->
        <ellipse cx="0" cy="4" rx="30" ry="24" fill="url(#rubySilk)"/>
        <!-- Sừng lân trung tâm nạm ngọc -->
        <polygon points="0,-24 -5,-8 5,-8" fill="#fef08a" stroke="#d97706" stroke-width="1"/>
        <circle cx="0" cy="-24" r="2.8" fill="#ef4444"/>
        <!-- Đôi mắt Lân phát sáng ngọc bích chớp nháy -->
        <ellipse cx="-12" cy="0" rx="7" ry="8" fill="#ffffff"/>
        <circle cx="-12" cy="0" r="4.5" fill="#10b981" opacity="${eyeBlink}"/>
        <circle cx="-13" cy="-1.5" r="1.5" fill="#ffffff"/>
        <ellipse cx="12" cy="0" rx="7" ry="8" fill="#ffffff"/>
        <circle cx="12" cy="0" r="4.5" fill="#10b981" opacity="${eyeBlink}"/>
        <circle cx="11" cy="-1.5" r="1.5" fill="#ffffff"/>
        <!-- Mũi sư tử & Miệng Lân há rộng ngậm châu -->
        <circle cx="0" cy="10" r="6" fill="#ea580c"/>
        <circle cx="0" cy="18" r="4.5" fill="#ef4444"/>
        <!-- Râu lân rực lửa uốn lượn hai bên -->
        <path d="M -18,12 Q -34,22 -28,34" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 18,12 Q 34,22 28,34" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 5. MẪU 5: ĐÈN CÁ CHÉP VƯỢT VŨ MÔN HÓA RỒNG & THÁC SÓNG HOÀNG KIM
// =========================================================================
function getModel5Svg(t, phase) {
  const fishY = Math.sin(phase) * 7;
  const fishRot = Math.cos(phase) * 6;
  const tailWag = Math.sin(phase * 3) * 12;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m5Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021324"/>
          <stop offset="50%" stop-color="#052e4d"/>
          <stop offset="100%" stop-color="#010a14"/>
        </linearGradient>
        <!-- Thân cá chép vàng óng ánh -->
        <radialGradient id="carpBody" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="50%" stop-color="#f97316"/>
          <stop offset="100%" stop-color="#c2410c"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m5Sky)"/>
      <circle cx="460" cy="65" r="42" fill="url(#luxMoonSurface)"/>

      <!-- SÓNG NƯỚC HOÀNG KIM NÂNG ĐỠ -->
      <path d="M 0,165 Q 135,152 270,165 T 540,165" fill="none" stroke="#38bdf8" stroke-width="1.8" opacity="0.45"/>
      <path d="M 0,180 Q 135,172 270,180 T 540,180" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.3"/>

      <!-- ĐÈN CÁ CHÉP HÓA RỒNG VƯƠN CAO (cx=95, cy=115) -->
      <g transform="translate(95, ${115 + fishY}) rotate(${fishRot.toFixed(1)})">
        <!-- Hào quang cá chép -->
        <ellipse cx="0" cy="0" rx="34" ry="18" fill="#fef08a" opacity="0.25"/>
        <!-- Thân cá chép uốn lượn -->
        <ellipse cx="0" cy="0" rx="28" ry="14" fill="url(#carpBody)"/>
        <!-- Lớp vảy cá chép xếp tầng ánh kim -->
        <path d="M -8,-8 Q 0,-3 -8,2 Q 0,7 -8,12" fill="none" stroke="#fde047" stroke-width="1.2"/>
        <path d="M 4,-8 Q 12,-3 4,2 Q 12,7 4,12" fill="none" stroke="#fde047" stroke-width="1.2"/>
        <!-- Mắt cá chép ngọc đen láy -->
        <circle cx="18" cy="-4" r="3.2" fill="#0f172a"/>
        <circle cx="19" cy="-5" r="1.0" fill="#ffffff"/>
        <!-- Vây lưng dựng đứng kiêu hãnh -->
        <path d="M -14,-14 Q 0,-24 14,-13" fill="none" stroke="#ea580c" stroke-width="2.5"/>
        <!-- Đuôi cá chép vẫy sóng mạnh mẽ -->
        <g transform="translate(-26, 0) rotate(${tailWag.toFixed(1)})">
          <path d="M 0,0 Q -18,-18 -26,-10 Q -14,0 -26,10 Q -18,18 0,0" fill="#f97316" opacity="0.9"/>
        </g>
        <!-- Râu rồng oai phong phát sáng -->
        <path d="M 24,-2 Q 38,-12 46,-5" fill="none" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
        <path d="M 24,2 Q 38,12 46,5" fill="none" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 6. MẪU 6: ĐÊM HỘI THẢ ĐÈN TRỜI THIÊN ĐĂNG KHỔNG MINH
// =========================================================================
function getModel6Svg(t, phase) {
  const lanterns = [
    { x: 50, speed: 0.9, scale: 0.75, delay: 0 },
    { x: 100, speed: 1.2, scale: 1.15, delay: 0.2 },
    { x: 160, speed: 0.8, scale: 0.65, delay: 0.5 },
    { x: 220, speed: 1.1, scale: 1.0, delay: 0.1 },
    { x: 280, speed: 1.3, scale: 0.85, delay: 0.7 },
    { x: 340, speed: 0.95, scale: 1.2, delay: 0.35 },
    { x: 400, speed: 1.05, scale: 0.7, delay: 0.6 },
  ];
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m6Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0518"/>
          <stop offset="50%" stop-color="#1b0c33"/>
          <stop offset="100%" stop-color="#06020c"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m6Sky)"/>
      <circle cx="455" cy="65" r="42" fill="url(#luxMoonSurface)"/>

      <!-- HÀNG CHỤC THIÊN ĐĂNG BAY LƠ LỬNG LÊN TRỜI CAO -->
      ${lanterns.map(l => {
        const y = 210 - (((t * l.speed + l.delay) % 1) * 230);
        const x = l.x + Math.sin(phase + l.delay * 4) * 8;
        const alpha = Math.sin((Math.max(0, Math.min(200, y)) / 200) * Math.PI);
        return `
          <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${l.scale})" opacity="${alpha.toFixed(2)}">
            <!-- Quầng sáng ấm áp quanh thiên đăng -->
            <ellipse cx="0" cy="12" rx="18" ry="20" fill="#f59e0b" opacity="0.35"/>
            <!-- Thân đèn giấy bọc lụa ấm áp -->
            <path d="M -10,0 L -14,24 L 14,24 L 10,0 Z" fill="#ea580c"/>
            <ellipse cx="0" cy="24" rx="14" ry="4" fill="#f59e0b"/>
            <!-- Lửa nến rực sáng từ đáy đèn -->
            <ellipse cx="0" cy="16" rx="6" ry="8" fill="#fef08a"/>
            <circle cx="0" cy="18" r="3" fill="#ffffff"/>
          </g>
        `;
      }).join('')}
    </svg>
  `;
}

// =========================================================================
// 7. MẪU 7: BÁNH NƯỚNG HOÀNG KIM 3D DÁT VÀNG & CHÉN TRÀ SEN THƯỞNG NGUYỆT
// =========================================================================
function getModel7Svg(t, phase) {
  const leafY = 120 + (t * 80);
  const leafX = 260 + Math.sin(phase) * 14;
  const steamY = Math.sin(phase) * 4;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m7Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#140a02"/>
          <stop offset="50%" stop-color="#291505"/>
          <stop offset="100%" stop-color="#0c0500"/>
        </linearGradient>
        <!-- Gradient vỏ bánh nướng thơm lừng -->
        <radialGradient id="cakeCrust" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="30%" stop-color="#f59e0b"/>
          <stop offset="70%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#78350f"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m7Sky)"/>
      <circle cx="455" cy="65" r="42" fill="url(#luxMoonSurface)"/>

      <!-- BÁNH TRUNG THU HOÀNG KIM 3D CHÂN THỰC (cx=90, cy=130) -->
      <g transform="translate(90, 130)">
        <!-- Đổ bóng đáy bánh -->
        <ellipse cx="0" cy="18" rx="36" ry="14" fill="#000000" opacity="0.4"/>
        <!-- Thành bánh nướng dày dặn -->
        <ellipse cx="0" cy="14" rx="34" ry="15" fill="#78350f"/>
        <ellipse cx="0" cy="6" rx="34" ry="15" fill="#b45309"/>
        <!-- Mặt bánh nướng vàng óng -->
        <ellipse cx="0" cy="0" rx="32" ry="14" fill="url(#cakeCrust)"/>
        <!-- Hoa văn chữ PHÚC / Hoa sen đúc nổi trên mặt bánh -->
        <ellipse cx="0" cy="0" rx="22" ry="9" fill="none" stroke="#fef08a" stroke-width="1.6"/>
        <circle cx="0" cy="0" r="6" fill="#fef08a"/>
      </g>

      <!-- CHÉN TRÀ SEN BỐC KHÓI NGHI NGÚT (cx=165, cy=142) -->
      <g transform="translate(165, 142)">
        <ellipse cx="0" cy="10" rx="18" ry="7" fill="#78350f"/>
        <!-- Miệng chén trà gốm men ngọc -->
        <ellipse cx="0" cy="3" rx="16" ry="6" fill="#065f46"/>
        <ellipse cx="0" cy="2" rx="14" ry="5" fill="#10b981"/>
        <!-- Làn khói trà sen thơm lượn sóng -->
        <path d="M -4,-2 Q 0,${-14 + steamY} 6,-26" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.6" stroke-linecap="round"/>
      </g>

      <!-- LÁ THU VÀNG RƠI CHAO NGHIÊNG -->
      <g transform="translate(${leafX.toFixed(1)}, ${leafY.toFixed(1)})" opacity="0.8">
        <path d="M 0,-8 Q 6,-5 7,0 Q 3,6 0,8 Q -3,6 -7,0 Q -6,-5 0,-8 Z" fill="#f59e0b"/>
        <line x1="0" y1="-8" x2="0" y2="9" stroke="#b45309" stroke-width="0.7"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 8. MẪU 8: ĐÈN KÉO QUÂN HOÀNG GIA CHIẾU BÓNG & DIỀM GẤM CUNG ĐÌNH
// =========================================================================
function getModel8Svg(t, phase) {
  const rotPhase = (t * Math.PI * 2);
  const cosRot = Math.cos(rotPhase);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m8Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14030a"/>
          <stop offset="50%" stop-color="#240613"/>
          <stop offset="100%" stop-color="#080104"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m8Sky)"/>
      <circle cx="455" cy="65" r="40" fill="url(#luxMoonSurface)"/>

      <!-- DIỀM GẤM CUNG ĐÌNH DÁT VÀNG TRẢI DÀI -->
      <path d="M 0,0 L 540,0 L 540,16 Q 472,24 405,16 Q 337,8 270,16 Q 202,24 135,16 Q 67,8 0,16 Z" fill="#991b1b"/>
      <line x1="0" y1="16" x2="540" y2="16" stroke="#f59e0b" stroke-width="1.8"/>

      <!-- ĐÈN KÉO QUÂN LỤC GIÁC KHỔNG LỒ (cx=95, cy=115) -->
      <g transform="translate(95, 115)">
        <!-- Mái che đèn kéo quân chạm rồng vàng -->
        <polygon points="0,-42 34,-26 -34,-26" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>
        <!-- Thân đèn lồng giấy kính chiếu bóng sáng rực -->
        <rect x="-28" y="-26" width="56" height="48" fill="#fef08a" opacity="0.9" rx="3"/>
        <rect x="-28" y="-26" width="56" height="48" fill="none" stroke="#b45309" stroke-width="1.5" rx="3"/>
        <!-- TRỤC CHIẾU BÓNG XOAY ĐOÀN RƯỚC ĐÈN (Bóng đen xoay 3D) -->
        <g transform="scale(${cosRot.toFixed(2)}, 1)">
          <!-- Hình bóng chú bé cầm đèn ông sao -->
          <circle cx="0" cy="-6" r="6" fill="#1e1b4b"/>
          <line x1="0" y1="0" x2="0" y2="14" stroke="#1e1b4b" stroke-width="3"/>
          <line x1="0" y1="4" x2="10" y2="-2" stroke="#1e1b4b" stroke-width="1.5"/>
          <polygon points="10,-6 14,-2 8,-2" fill="#1e1b4b"/>
        </g>
        <!-- Bệ đế đèn kéo quân -->
        <rect x="-32" y="22" width="64" height="8" rx="2" fill="#b45309"/>
      </g>
    </svg>
  `;
}

// =========================================================================
// 9. MẪU 9: CHÚ CUỘI NGỒI GỐC CÂY ĐA CỔ THỤ THỔI SÁO & DẢI NỐT NHẠC ÁNH SAO
// =========================================================================
function getModel9Svg(t, phase) {
  const cuoiBob = Math.sin(phase) * 2.5;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m9Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021711"/>
          <stop offset="50%" stop-color="#062b1f"/>
          <stop offset="100%" stop-color="#010d0a"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m9Sky)"/>
      <circle cx="455" cy="65" r="42" fill="url(#luxMoonSurface)"/>

      <!-- CÂY ĐA CỔ THỤ NGHÌN NĂM GÓC TRÁI (cx=70, cy=105) -->
      <g transform="translate(70, 105)">
        <!-- Tán lá đa xanh ngắt rợp trời -->
        <circle cx="-20" cy="-55" r="32" fill="#14532d" opacity="0.85"/>
        <circle cx="8" cy="-65" r="36" fill="#15803d" opacity="0.9"/>
        <circle cx="28" cy="-45" r="28" fill="#16a34a" opacity="0.8"/>
        <!-- Thân cây đa vững chãi gân guốc -->
        <path d="M -18,45 Q -6,0 4,-35 Q 12,0 20,45 Z" fill="#78350f"/>
        <!-- Rễ cây đa buông rủ -->
        <path d="M -12,5 Q -18,25 -14,45" fill="none" stroke="#92400e" stroke-width="1.8"/>
        <path d="M 12,5 Q 16,25 14,45" fill="none" stroke="#92400e" stroke-width="1.8"/>

        <!-- CHÚ CUỘI NGỒI GỐC CÂY THỔI SÁO TRÚC -->
        <g transform="translate(22, ${20 + cuoiBob})">
          <ellipse cx="0" cy="2" rx="9" ry="11" fill="#b45309"/>
          <circle cx="0" cy="-12" r="6" fill="#fef08a"/>
          <!-- Cây sáo trúc phát ra dải sáng -->
          <line x1="-12" y1="-8" x2="16" y2="-13" stroke="#16a34a" stroke-width="2.2" stroke-linecap="round"/>
        </g>
      </g>

      <!-- DẢI NỐT NHẠC ÁNH SAO NỐI TỪ SÁO CUỘI SANG MẶT TRĂNG -->
      <path d="M 115,92 Q 280,25 425,65" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-dasharray="4,4"/>
      <path d="M 115,92 Q 280,25 425,65" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.75"/>
      ${renderSparkle(260, 45, 4.5, s1)}
    </svg>
  `;
}

// =========================================================================
// 10. MẪU 10: CHỊ HẰNG NGA TUYỆT SẮC CUNG QUẢNG HÀN & DẢI LỤA TIÊN BAY LƯỢN
// =========================================================================
function getModel10Svg(t, phase) {
  const hangBob = Math.sin(phase) * 4;
  const ribbonWave = Math.sin(phase) * 10;
  const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${COMMON_DEFS}
        <linearGradient id="m10Sky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14071c"/>
          <stop offset="50%" stop-color="#260f33"/>
          <stop offset="100%" stop-color="#0a030d"/>
        </linearGradient>
        <!-- Gradient dải lụa tiên đào hồng -->
        <linearGradient id="fairySilkRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#fef08a" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#fb7185" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#m10Sky)"/>
      <circle cx="455" cy="65" r="55" fill="url(#luxMoonCorona)"/>
      <circle cx="455" cy="65" r="42" fill="url(#luxMoonSurface)"/>

      <!-- DẢI LỤA TIÊN NGHÊ THƯỜNG UỐN LƯỢN TRẢI RỘNG TOÀN BANNER -->
      <path d="M 40,110 Q 220,${35 + ribbonWave} 405,${65 + hangBob}" fill="none" stroke="url(#fairySilkRibbon)" stroke-width="3" stroke-linecap="round"/>
      <path d="M 40,110 Q 220,${35 + ribbonWave} 405,${65 + hangBob}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.85" stroke-linecap="round"/>

      <!-- HÌNH BÓNG CHỊ HẰNG NGA BAY LƯỢN THƯỚT THA (Góc Phải cx=415, cy=65) -->
      <g transform="translate(415, ${65 + hangBob})">
        <!-- Đám mây tiên bồng bềnh dưới chân Chị Hằng -->
        <ellipse cx="6" cy="18" rx="16" ry="6" fill="#ffffff" opacity="0.9"/>
        <circle cx="0" cy="15" r="6" fill="#ffffff"/>
        <!-- Tà váy lụa tiên tha thướt -->
        <path d="M -6,4 C -10,14 -14,24 -4,26 C 6,26 10,18 8,4 Z" fill="#f472b6" stroke="#fb7185" stroke-width="0.6"/>
        <!-- Áo tiên ngọc trắng -->
        <ellipse cx="1" cy="0" rx="4.5" ry="6" fill="#ffffff"/>
        <!-- Khuôn mặt thanh tú & Búi tóc cài hoa -->
        <circle cx="2" cy="-10" r="4.5" fill="#fef08a"/>
        <ellipse cx="0.5" cy="-15" rx="4.5" ry="3" fill="#1e293b"/>
        <circle cx="-2" cy="-16" r="1.5" fill="#fb7185"/>
      </g>
      ${renderSparkle(180, 65, 4.5, s1)}
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
  console.log(`Đang render kiệt tác Model ${modelNum}/10 cho VIN Hero Card...`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;
    const svgStr = MODEL_GENERATORS[modelIdx](t, phase);

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

  // Cập nhật vin_hero_card_bg_trung_thu.webp bằng Model 1 để đồng bộ
  if (modelNum === 1) {
    fs.writeFileSync(path.resolve(__dirname, '../pictures/vin_hero_card_bg_trung_thu.webp'), animWebp);
    fs.writeFileSync(path.resolve(__dirname, '../public/assets/vin_hero_card_bg_trung_thu.webp'), animWebp);
  }

  console.log(`Đã xuất sắc hoàn tất Model ${modelNum}: ${(animWebp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log('=== BẮT ĐẦU TẠO LẠI 10 MẪU VIN HERO CARD CẦU KỲ & CHÂN THỰC ===');
  for (let i = 0; i < 10; i++) {
    await generateModel(i);
  }
  console.log('=== HOÀN TẤT TRỌN VẸN 10 KIỆT TÁC VIN HERO CARD TRUNG THU! ===');
}

main().catch(console.error);
