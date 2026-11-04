const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Dimensions: 495 x 80 px (Chuẩn tỉ lệ Header VinFast)
const WIDTH = 495;
const HEIGHT = 80;
const TOTAL_FRAMES = 120;
const DELAY = 100; // 100ms/frame = 12.0s vòng lặp hoàn hảo gồm 5 phân cảnh tuyệt đẹp

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
  animChunk.writeUInt16LE(loopCount, 12);

  const bodyData = Buffer.concat([vp8xHeader, animChunk, ...anmfChunks]);
  const riffSize = 4 + bodyData.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(riffSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, bodyData]);
}

// ---------------------------------------------------------------------------------
// TÍNH TOÁN ĐỘ MỜ DẦN CHUYỂN CẢNH (SMOOTH CROSS-FADE OPACITY TRONG 1 ẢNH DUY NHẤT)
// 5 Phân Cảnh (Mỗi cảnh 24 frames, 4 frames chuyển tiếp chéo mượt mà):
//   0. Cung Trăng Khuyết & Hoa Quế (Frames 0 - 23)
//   1. Thỏ Ngọc Ngắm Trăng & Sao Băng (Frames 24 - 47)
//   2. Đèn Ông Sao Hoàng Kim 3D (Frames 48 - 71)
//   3. Đèn Lồng Gấm Đỏ Hội An (Frames 72 - 95)
//   4. Đèn Cung Đình Lục Giác (Frames 96 - 119)
// ---------------------------------------------------------------------------------
function getSceneOpacity(sceneIndex, f) {
  const SCENE_LEN = 24;
  const FADE_LEN = 4;
  const start = sceneIndex * SCENE_LEN;
  const end = start + SCENE_LEN;

  // Xử lý vòng lặp xoay vòng cho scene 0 và scene 4
  let distFromStart = f - start;
  if (sceneIndex === 0 && f >= TOTAL_FRAMES - FADE_LEN) {
    // Fade in từ cuối vòng lặp
    return (f - (TOTAL_FRAMES - FADE_LEN)) / FADE_LEN;
  }
  if (sceneIndex === 4 && f < FADE_LEN) {
    // Fade out qua đầu vòng lặp
    return (FADE_LEN - f) / FADE_LEN;
  }

  if (f < start - FADE_LEN || f > end) return 0;
  if (f < start) {
    return (f - (start - FADE_LEN)) / FADE_LEN;
  }
  if (f <= end - FADE_LEN) return 1.0;
  return (end - f) / FADE_LEN;
}

function renderMasterFrame(f) {
  const globalProgress = f / (TOTAL_FRAMES - 1);
  const globalPhase = globalProgress * Math.PI * 12; // 6 chu kỳ vỗ cánh mượt mà

  // 1. Cánh chim VinFast 3D chuyển động liên tục xuyên suốt
  const flapAngle = Math.sin(globalPhase) * 6.0;
  const flapScaleY = 1 + Math.sin(globalPhase) * 0.065;
  const flapScaleX = 1 - Math.sin(globalPhase) * 0.025;
  const bodyLift = Math.sin(globalPhase) * 1.2;

  // 2. Marquee chạy chữ liên tục êm ái
  const marqueeCycle = 340;
  const marqueeX = - ((globalProgress * 3) % 1) * marqueeCycle;

  // 3. Vầng trăng tròn hoàng kim nền (chung cho cảnh 1, 2, 3, 4)
  const moonPulse = 0.85 + Math.sin(globalPhase * 0.5) * 0.15;
  const moonAuraR = (33 + Math.sin(globalPhase * 0.5) * 2.2).toFixed(1);
  const moonAuraOp = (0.42 + Math.sin(globalPhase * 0.5) * 0.18).toFixed(2);

  // Độ mờ của 5 cảnh trong frame hiện tại:
  const op0 = getSceneOpacity(0, f); // Cung Trăng Khuyết
  const op1 = getSceneOpacity(1, f); // Thỏ Ngọc & Sao Băng
  const op2 = getSceneOpacity(2, f); // Đèn Ông Sao
  const op3 = getSceneOpacity(3, f); // Đèn Lồng Hội An
  const op4 = getSceneOpacity(4, f); // Đèn Cung Đình

  // --- CẢNH 0: Cung Trăng Khuyết & Hoa Quế ---
  const crescentPulse = (0.85 + Math.sin(globalPhase * 0.5) * 0.15).toFixed(2);
  const flowerBreathe = (1 + Math.sin(globalPhase * 1.5) * 0.08).toFixed(3);
  const swingMini1 = (Math.sin(globalPhase) * 8.0).toFixed(2);
  const swingMini2 = (Math.sin(globalPhase - 0.7) * 7.0).toFixed(2);
  const swingMini3 = (Math.sin(globalPhase - 1.4) * 8.5).toFixed(2);

  // --- CẢNH 1: Thỏ Ngọc & Sao Băng ---
  const rabbitHeadBob = (Math.sin(globalPhase * 1.2) * 1.0).toFixed(2);
  const rabbitEarWiggleL = (Math.sin(globalPhase * 1.5) * 6).toFixed(2);
  const rabbitEarWiggleR = (-Math.cos(globalPhase * 1.5) * 5).toFixed(2);
  const rabbitTailWiggle = (Math.sin(globalPhase * 2) * 2).toFixed(2);
  const isEyeBlink = (f >= 32 && f <= 34) || (f >= 42 && f <= 44);
  const shootingProgress = ((f - 24) % 24) / 23;
  const shootingActive = op1 > 0.3 && shootingProgress > 0.15 && shootingProgress < 0.85;
  const shootX = 140 + shootingProgress * 230;
  const shootY = 8 + shootingProgress * 30;
  const shootOpacity = Math.sin((shootingProgress - 0.15) / 0.7 * Math.PI) * 0.85 * op1;

  // --- CẢNH 2: Đèn Ông Sao 5 Cánh ---
  const starTilt = (Math.sin(globalPhase) * 8.0).toFixed(2);
  const starFloatY = (Math.cos(globalPhase) * 1.6).toFixed(2);
  const candlePulse = (0.75 + Math.sin(globalPhase * 2.5) * 0.25).toFixed(2);
  const tasselStar1 = (Math.sin(globalPhase - 0.4) * 12).toFixed(1);
  const tasselStar2 = (Math.cos(globalPhase - 0.6) * 10).toFixed(1);

  // --- CẢNH 3: Đèn Lồng Hội An ---
  const lanternSwing = (Math.sin(globalPhase) * 7.5).toFixed(2);
  const lanternTasselLag = (Math.sin(globalPhase - Math.PI * 0.25) * 11.0).toFixed(2);
  const lanternCandleGlow = (0.8 + Math.sin(globalPhase * 2.5) * 0.2).toFixed(2);

  // --- CẢNH 4: Đèn Cung Đình Lục Giác ---
  const palaceTilt = (Math.sin(globalPhase) * 6.5).toFixed(2);
  const palaceFloatY = (Math.cos(globalPhase * 1.2) * 1.6).toFixed(2);
  const palaceCandleGlow = (0.75 + Math.sin(globalPhase * 2.2) * 0.25).toFixed(2);
  const palaceTasselSwing = (Math.sin(globalPhase - 0.5) * 11.0).toFixed(1);

  // Sparkles
  const sparkWingL = Math.max(0, Math.sin(globalPhase) * 1.25);
  const sparkWingR = Math.max(0, Math.sin(globalPhase - Math.PI * 0.5) * 1.25);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 🌕 VẦNG TRĂNG VÀNG HOÀNG GIA -->
        <radialGradient id="moonFaceGold" cx="38%" cy="38%" r="62%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#fef08a" />
          <stop offset="70%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </radialGradient>

        <radialGradient id="moonAuraGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#f59e0b" stop-opacity="0.45" />
          <stop offset="80%" stop-color="#b45309" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#b45309" stop-opacity="0" />
        </radialGradient>

        <!-- 🌙 VẦNG TRĂNG KHUYẾT HOÀNG KIM 24K -->
        <linearGradient id="crescentGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fef08a" />
          <stop offset="55%" stop-color="#f59e0b" />
          <stop offset="85%" stop-color="#d97706" />
          <stop offset="100%" stop-color="#92400e" />
        </linearGradient>

        <!-- 🐰 THỎ NGỌC GRADIENTS -->
        <linearGradient id="rabbitFurGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="65%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
        <linearGradient id="rabbitEarPink" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f472b6" />
          <stop offset="100%" stop-color="#fda4af" />
        </linearGradient>

        <!-- 🏮 ĐÈN LỒNG HỘI AN GRADIENTS -->
        <radialGradient id="lanternRedGlow" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="25%" stop-color="#f87171" />
          <stop offset="65%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#991b1b" />
        </radialGradient>

        <!-- ⭐ ĐÈN ÔNG SAO GRADIENTS -->
        <linearGradient id="starRubyLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fca5a5" />
          <stop offset="50%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#b91c1c" />
        </linearGradient>
        <linearGradient id="starRubyDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#dc2626" />
          <stop offset="60%" stop-color="#991b1b" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </linearGradient>
        <linearGradient id="starGoldLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#fef08a" />
          <stop offset="70%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
        <linearGradient id="starGoldDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#facc15" />
          <stop offset="60%" stop-color="#ca8a04" />
          <stop offset="100%" stop-color="#854d0e" />
        </linearGradient>

        <!-- 🏮 ĐÈN CUNG ĐÌNH GRADIENTS -->
        <linearGradient id="imperialGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#fef08a" />
          <stop offset="60%" stop-color="#eab308" />
          <stop offset="85%" stop-color="#ca8a04" />
          <stop offset="100%" stop-color="#854d0e" />
        </linearGradient>
        <radialGradient id="amberSilkScreen" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#fef08a" />
          <stop offset="65%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#b45309" />
        </radialGradient>

        <!-- ☁️ MÂY HOÀNG TRIỀU GRADIENT -->
        <linearGradient id="royalCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="40%" stop-color="#fefce8" />
          <stop offset="75%" stop-color="#fde68a" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>

        <!-- 💫 SAO BĂNG GRADIENT -->
        <linearGradient id="meteorTailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
          <stop offset="40%" stop-color="#fef08a" stop-opacity="0.7" />
          <stop offset="80%" stop-color="#f59e0b" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
        </linearGradient>

        <!-- 💎 CHROME VINFAST GRADIENT -->
        <linearGradient id="exactVinFastChrome" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="16%" stop-color="#f8fafc" />
          <stop offset="36%" stop-color="#cbd5e1" />
          <stop offset="48%" stop-color="#ffffff" />
          <stop offset="53%" stop-color="#475569" />
          <stop offset="72%" stop-color="#94a3b8" />
          <stop offset="88%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>

        <!-- 💙 ELECTRIC BLUE VINFAST -->
        <linearGradient id="vfElectricBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#bae6fd" />
          <stop offset="30%" stop-color="#38bdf8" />
          <stop offset="65%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#005baa" />
        </linearGradient>

        <linearGradient id="vfDeepBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="25%" stop-color="#0284c7" />
          <stop offset="65%" stop-color="#005baa" />
          <stop offset="100%" stop-color="#082f49" />
        </linearGradient>

        <!-- Titanium Razor Stroke -->
        <linearGradient id="thinTitaniumOutline" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="50%" stop-color="#334155" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>

        <!-- Filters -->
        <filter id="crispShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="1" dy="1.6" stdDeviation="1.3" flood-color="#0f172a" flood-opacity="0.25"/>
        </filter>
        <filter id="starBurst" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="candleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Marquee Mask -->
        <clipPath id="marqueeClip">
          <rect x="0" y="14" width="240" height="24" rx="2"/>
        </clipPath>
        <mask id="marqueeFadeMask">
          <rect x="0" y="14" width="240" height="24" fill="url(#maskFadeGrad)"/>
        </mask>
        <linearGradient id="maskFadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#000000" />
          <stop offset="8%" stop-color="#ffffff" />
          <stop offset="92%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#000000" />
        </linearGradient>
      </defs>

      <!-- ============================================================= -->
      <!-- 💫 SAO BĂNG LƯỚT QUA BẦU TRỜI (CHỈ KHI Ở CẢNH THỎ NGỌC) -->
      <!-- ============================================================= -->
      ${shootingActive ? `
      <g opacity="${shootOpacity.toFixed(2)}">
        <line x1="${(shootX - 45).toFixed(1)}" y1="${(shootY - 14).toFixed(1)}" x2="${shootX.toFixed(1)}" y2="${shootY.toFixed(1)}" 
              stroke="url(#meteorTailGrad)" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="${shootX.toFixed(1)}" cy="${shootY.toFixed(1)}" r="2.4" fill="#ffffff" filter="url(#starBurst)"/>
      </g>
      ` : ''}

      <!-- ============================================================= -->
      <!-- 🌕 VẦNG TRĂNG RẰM DẠ QUANG (CÁC CẢNH 1, 2, 3, 4) -->
      <!-- ============================================================= -->
      ${(1 - op0) > 0.05 ? `
      <g transform="translate(46, 38)" opacity="${(1 - op0).toFixed(2)}">
        <circle cx="0" cy="0" r="${moonAuraR}" fill="url(#moonAuraGold)" opacity="${moonAuraOp}"/>
        <circle cx="0" cy="0" r="27.5" fill="url(#moonFaceGold)" filter="url(#crispShadow)"/>
        <path d="M -10,-8 A 7,7 0 0,1 -3,-15 A 12,12 0 0,0 -14,-4 Z" fill="#b45309" opacity="0.18"/>
        <path d="M 5,-12 A 9,9 0 0,1 15,-5 A 11,11 0 0,0 7,-14 Z" fill="#b45309" opacity="0.20"/>
        <circle cx="9" cy="7" r="4.2" fill="#b45309" opacity="0.16"/>
        <circle cx="0" cy="0" r="27.5" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>
      </g>
      ` : ''}

      <!-- ============================================================= -->
      <!-- 🌙 PHÂN CẢNH 0: CUNG TRĂNG KHUYẾT HOÀNG GIA & HOA QUẾ (V8) -->
      <!-- ============================================================= -->
      ${op0 > 0.05 ? `
      <g opacity="${op0.toFixed(2)}">
        <g transform="translate(46, 38)">
          <path d="M 0,-33 A 33,33 0 1,0 28,18 A 26,26 0 1,1 -6,-28 Q -3,-31 0,-33 Z" 
                fill="url(#crescentGoldGrad)" filter="url(#crispShadow)"/>
          <path d="M 0,-33 A 33,33 0 1,0 28,18" 
                fill="none" stroke="#ffffff" stroke-width="0.85" opacity="${crescentPulse}"/>

          <!-- Cành hoa quế -->
          <g transform="translate(-24, -12)">
            <path d="M 0,22 Q -4,10 2,0 Q 8,-8 14,-14" fill="none" stroke="#ca8a04" stroke-width="0.9" stroke-linecap="round"/>
            <g transform="translate(0, 20) scale(${flowerBreathe})">
              <circle cx="-2" cy="0" r="1.6" fill="#fef08a"/>
              <circle cx="2" cy="0" r="1.6" fill="#fef08a"/>
              <circle cx="0" cy="-2" r="1.6" fill="#fef08a"/>
              <circle cx="0" cy="2" r="1.6" fill="#fef08a"/>
              <circle cx="0" cy="0" r="1.0" fill="#ffffff"/>
            </g>
          </g>
        </g>
        <!-- Dàn 3 đèn lồng mini treo phía trên -->
        <g transform="translate(16, 4)">
          <g transform="translate(0, 8) rotate(${swingMini1})">
            <ellipse cx="0" cy="7" rx="4.8" ry="6.8" fill="url(#lanternRedGlow)"/>
            <line x1="0" y1="14" x2="0" y2="20" stroke="#dc2626" stroke-width="1.2"/>
          </g>
        </g>
        <g transform="translate(86, 6)">
          <g transform="translate(0, 10) rotate(${swingMini2})">
            <circle cx="0" cy="6" r="5.2" fill="#fbbf24"/>
            <line x1="0" y1="11.5" x2="0" y2="17" stroke="#f59e0b" stroke-width="1.2"/>
          </g>
        </g>
      </g>
      ` : ''}

      <!-- ============================================================= -->
      <!-- 🐰 PHÂN CẢNH 1: THỎ NGỌC NGẮM TRĂNG (V2) -->
      <!-- ============================================================= -->
      ${op1 > 0.05 ? `
      <g opacity="${op1.toFixed(2)}">
        <g transform="translate(86, ${(42 + parseFloat(rabbitHeadBob)).toFixed(2)})" filter="url(#crispShadow)">
          <path d="M -14,19 C -10,13 0,13 4,16 C 8,10 18,12 20,18 C 16,23 2,24 -10,22 Z" 
                fill="url(#royalCloudGrad)" stroke="#d97706" stroke-width="0.65"/>
          <circle cx="${(-9 + parseFloat(rabbitTailWiggle)).toFixed(1)}" cy="14" r="3.2" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.5"/>
          <ellipse cx="0" cy="13" rx="8.5" ry="7" fill="url(#rabbitFurGrad)" stroke="#cbd5e1" stroke-width="0.5"/>
          <circle cx="3" cy="5" r="6.2" fill="url(#rabbitFurGrad)" stroke="#cbd5e1" stroke-width="0.5"/>
          <circle cx="4" cy="7" r="1.8" fill="#f472b6" opacity="0.6"/>
          ${isEyeBlink ? `
          <path d="M 5,4.5 Q 6.5,5.5 8,4.5" fill="none" stroke="#1e293b" stroke-width="0.9" stroke-linecap="round"/>
          ` : `
          <circle cx="6.8" cy="4.2" r="1.1" fill="#1e293b"/>
          <circle cx="7.1" cy="3.9" r="0.4" fill="#ffffff"/>
          `}
          <g transform="translate(0, 0) rotate(${rabbitEarWiggleL})">
            <path d="M 0,0 C -2,-6 -1,-13 2,-14 C 4,-13 4,-6 1,0 Z" fill="url(#rabbitFurGrad)" stroke="#cbd5e1" stroke-width="0.4"/>
            <path d="M 0.5,-1 C -0.5,-5 0,-10 2,-11 C 3,-10 3,-5 1.5,-1 Z" fill="url(#rabbitEarPink)" opacity="0.8"/>
          </g>
          <g transform="translate(4, -1) rotate(${rabbitEarWiggleR})">
            <path d="M 0,0 C 0,-7 3,-14 5,-13 C 6,-11 4,-5 1,0 Z" fill="url(#rabbitFurGrad)" stroke="#cbd5e1" stroke-width="0.4"/>
            <path d="M 1,-1 C 1,-6 3,-11 4.5,-10 C 5,-9 3.5,-4 1.8,-1 Z" fill="url(#rabbitEarPink)" opacity="0.8"/>
          </g>
        </g>
      </g>
      ` : ''}

      <!-- ============================================================= -->
      <!-- ⭐ PHÂN CẢNH 2: ĐÈN ÔNG SAO HOÀNG KIM 5 CÁNH (V5) -->
      <!-- ============================================================= -->
      ${op2 > 0.05 ? `
      <g opacity="${op2.toFixed(2)}">
        <g transform="translate(86, ${(38 + parseFloat(starFloatY)).toFixed(2)})" filter="url(#crispShadow)">
          <g transform="rotate(${starTilt})">
            <circle cx="0" cy="0" r="16" fill="#fef08a" opacity="${candlePulse}" filter="url(#candleGlow)"/>
            <circle cx="0" cy="0" r="13.5" fill="none" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="6, 1.5"/>
            <!-- 5 Cánh Sao Origami -->
            <polygon points="0,0 0,-18 4.2,-5.8" fill="url(#starRubyLight)"/>
            <polygon points="0,0 0,-18 -4.2,-5.8" fill="url(#starRubyDark)"/>
            <polygon points="0,0 17.1,-5.6 6.8,2.2" fill="url(#starGoldLight)"/>
            <polygon points="0,0 17.1,-5.6 4.2,-5.8" fill="url(#starGoldDark)"/>
            <polygon points="0,0 10.6,14.6 0,7.2" fill="url(#starRubyLight)"/>
            <polygon points="0,0 10.6,14.6 6.8,2.2" fill="url(#starRubyDark)"/>
            <polygon points="0,0 -10.6,14.6 -6.8,2.2" fill="url(#starGoldLight)"/>
            <polygon points="0,0 -10.6,14.6 0,7.2" fill="url(#starGoldDark)"/>
            <polygon points="0,0 -17.1,-5.6 -4.2,-5.8" fill="url(#starRubyLight)"/>
            <polygon points="0,0 -17.1,-5.6 -6.8,2.2" fill="url(#starRubyDark)"/>
            <circle cx="0" cy="0" r="3.0" fill="#fef08a" stroke="#ca8a04" stroke-width="0.5"/>
            <!-- Tua rua -->
            <g transform="translate(0, 16)">
              <path d="M 0,0 Q ${tasselStar1},8 0,16" fill="none" stroke="#ef4444" stroke-width="1.2" stroke-linecap="round"/>
              <path d="M -3,0 Q ${tasselStar2},6 -2,14" fill="none" stroke="#f59e0b" stroke-width="0.9" stroke-linecap="round"/>
            </g>
          </g>
        </g>
      </g>
      ` : ''}

      <!-- ============================================================= -->
      <!-- 🏮 PHÂN CẢNH 3: ĐÈN LỒNG GẤM ĐỎ HỘI AN (V4) -->
      <!-- ============================================================= -->
      ${op3 > 0.05 ? `
      <g opacity="${op3.toFixed(2)}">
        <g transform="translate(14, 10)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#d97706" stroke-width="1.1" stroke-linecap="round"/>
          <g transform="translate(0, 8) rotate(${lanternSwing})">
            <circle cx="0" cy="12" r="10" fill="#fef08a" opacity="${(parseFloat(lanternCandleGlow) * 0.45).toFixed(2)}" filter="url(#candleGlow)"/>
            <ellipse cx="0" cy="12" rx="7.5" ry="11.5" fill="url(#lanternRedGlow)" filter="url(#crispShadow)"/>
            <ellipse cx="0" cy="12" rx="4.5" ry="11.5" fill="none" stroke="#fef08a" stroke-width="0.7"/>
            <line x1="0" y1="0.5" x2="0" y2="23.5" stroke="#fef08a" stroke-width="0.7"/>
            <rect x="-4.2" y="-1.2" width="8.4" height="2.4" rx="0.8" fill="#ca8a04"/>
            <rect x="-4.2" y="22.8" width="8.4" height="2.4" rx="0.8" fill="#ca8a04"/>
            <!-- Tua rua tơ vàng -->
            <g transform="translate(0, 25) rotate(${lanternTasselLag})">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/>
              <circle cx="0" cy="1.2" r="1.1" fill="#dc2626"/>
            </g>
          </g>
        </g>
        <!-- Mây bồng bềnh ôm chữ V -->
        <g transform="translate(46, 68)" filter="url(#crispShadow)">
          <path d="M -32,1 C -36,-5 -26,-11 -20,-6 C -16,-13 -4,-12 0,-5 C 4,-12 16,-13 20,-6 C 26,-11 36,-5 32,1 C 24,6 -24,6 -32,1 Z" 
                fill="url(#royalCloudGrad)" stroke="#d97706" stroke-width="0.6"/>
        </g>
      </g>
      ` : ''}

      <!-- ============================================================= -->
      <!-- 🏮 PHÂN CẢNH 4: ĐÈN CUNG ĐÌNH LỤC GIÁC (V9) -->
      <!-- ============================================================= -->
      ${op4 > 0.05 ? `
      <g opacity="${op4.toFixed(2)}">
        <g transform="translate(86, ${(38 + parseFloat(palaceFloatY)).toFixed(2)})" filter="url(#crispShadow)">
          <g transform="rotate(${palaceTilt})">
            <line x1="0" y1="-28" x2="0" y2="-17" stroke="#ca8a04" stroke-width="0.8"/>
            <circle cx="0" cy="0" r="14" fill="#fef08a" opacity="${(parseFloat(palaceCandleGlow) * 0.45).toFixed(2)}" filter="url(#candleGlow)"/>
            <!-- Mái đình cong dát vàng -->
            <circle cx="0" cy="-17.5" r="1.8" fill="url(#imperialGoldGrad)"/>
            <path d="M -12,-12 Q -7,-17 0,-16 Q 7,-17 12,-12 Q 9,-13 0,-13.5 Q -9,-13 -12,-12 Z" 
                  fill="url(#imperialGoldGrad)" stroke="#854d0e" stroke-width="0.5"/>
            <!-- Thân lụa hổ phách -->
            <polygon points="-8,-12 8,-12 10,6 -10,6" fill="url(#amberSilkScreen)" stroke="#ca8a04" stroke-width="0.75"/>
            <path d="M -11,6 Q 0,10 11,6 L 8,11 Q 0,13 -8,11 Z" fill="url(#imperialGoldGrad)"/>
            <!-- Tua rua -->
            <g transform="translate(0, 12) rotate(${palaceTasselSwing})">
              <circle cx="0" cy="1" r="1.2" fill="#ef4444"/>
              <line x1="0" y1="2" x2="0" y2="12" stroke="#dc2626" stroke-width="1.3" stroke-linecap="round"/>
            </g>
          </g>
        </g>
      </g>
      ` : ''}

      <!-- ============================================================= -->
      <!-- 🦅 BIỂU TƯỢNG CÁNH CHIM CHỮ "V" VINFAST 3D (XUYÊN SUỐT TOÀN BỘ) -->
      <!-- ============================================================= -->
      <g transform="translate(46, ${(38 + bodyLift).toFixed(2)})" filter="url(#crispShadow)">
        <!-- Cánh trái -->
        <g transform="translate(0, 36) rotate(${(-flapAngle).toFixed(2)}) scale(${flapScaleX.toFixed(3)}, ${flapScaleY.toFixed(3)}) translate(0, -36)">
          <path d="M 0,36 C -16,17 -32,1 -40,-26 C -28,-10 -14,4 0,16 Z" 
                fill="url(#exactVinFastChrome)" stroke="#1e293b" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M 0,36 C -16,17 -32,1 -40,-26 C -30,-12 -16,0 0,13 Z" 
                fill="#ffffff" opacity="0.9"/>
          <path d="M 0,22 C -9,11 -18,0 -24,-14 C -17,-5 -8,3 0,9 Z" 
                fill="url(#vfElectricBlueGrad)" stroke="#ffffff" stroke-width="0.8"/>
          <path d="M 0,20 C -7,10 -15,1 -20,-11" 
                fill="none" stroke="#bae6fd" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>
        </g>

        <!-- Cánh phải -->
        <g transform="translate(0, 36) rotate(${flapAngle.toFixed(2)}) scale(${flapScaleX.toFixed(3)}, ${flapScaleY.toFixed(3)}) translate(0, -36)">
          <path d="M 0,36 C 16,17 32,1 40,-26 C 28,-10 14,4 0,16 Z" 
                fill="url(#exactVinFastChrome)" stroke="#1e293b" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M 0,36 C 16,17 32,1 40,-26 C 28,-10 14,4 0,16 Z" 
                fill="url(#exactVinFastChrome)" opacity="0.85"/>
          <path d="M 0,22 C 9,11 18,0 24,-14 C 17,-5 8,3 0,9 Z" 
                fill="url(#vfElectricBlueGrad)" stroke="#ffffff" stroke-width="0.8"/>
          <path d="M 0,20 C 7,10 15,1 20,-11" 
                fill="none" stroke="#bae6fd" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>
        </g>

        <!-- Sống lưng 3D -->
        <line x1="0" y1="36" x2="0" y2="13" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="0" cy="9" r="2" fill="url(#vfElectricBlueGrad)" stroke="#ffffff" stroke-width="0.6"/>

        <!-- Sparkles cánh chữ V -->
        ${sparkWingL > 0.05 ? `
        <g transform="translate(-39, -25) scale(${sparkWingL.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-7 1.6,-1.6 7,0 1.6,1.6 0,7 -1.6,1.6 -7,0 -1.6,-1.6" fill="#ffffff"/>
          <circle cx="0" cy="0" r="1.8" fill="#38bdf8"/>
        </g>
        ` : ''}
        ${sparkWingR > 0.05 ? `
        <g transform="translate(39, -25) scale(${sparkWingR.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-7 1.6,-1.6 7,0 1.6,1.6 0,7 -1.6,1.6 -7,0 -1.6,-1.6" fill="#ffffff"/>
          <circle cx="0" cy="0" r="1.8" fill="#38bdf8"/>
        </g>
        ` : ''}
      </g>

      <!-- ============================================================= -->
      <!-- 🚗 DÒNG CHỮ VINFAST 3D CHROME (XUYÊN SUỐT TOÀN BỘ) -->
      <!-- ============================================================= -->
      <g transform="translate(108, 38)" filter="url(#crispShadow)">
        <g transform="translate(0, -3)">
          <text x="1.2" y="0" font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" font-weight="700" letter-spacing="7" fill="#0f172a" opacity="0.25">
            VINFAST
          </text>
          <text x="0" y="0" font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" font-weight="700" letter-spacing="7" fill="none" 
                stroke="url(#thinTitaniumOutline)" stroke-width="0.8" stroke-linejoin="round">
            VINFAST
          </text>
          <text x="0" y="0" font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" font-weight="700" letter-spacing="7" fill="url(#exactVinFastChrome)">
            VINFAST
          </text>
          <text x="0" y="-0.6" font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" font-weight="700" letter-spacing="7" fill="none" 
                stroke="#ffffff" stroke-width="0.4" opacity="0.8">
            VINFAST
          </text>
        </g>

        <!-- 🏃‍♂️ DÒNG CHỮ 'SHOWROOM THUẬN AN' CHẠY MƯỢT MÀ KÈM CHỈ XANH -->
        <g transform="translate(0, 0)">
          <line x1="0" y1="35" x2="250" y2="35" stroke="url(#vfElectricBlueGrad)" stroke-width="1.6" opacity="0.85"/>
          <g clip-path="url(#marqueeClip)" mask="url(#marqueeFadeMask)">
            <g transform="translate(${marqueeX.toFixed(1)}, 30)">
              <text x="0" y="0" font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" font-weight="800" letter-spacing="3.5" fill="url(#vfDeepBlueGrad)">
                SHOWROOM THUẬN AN
              </text>
              <text x="${marqueeCycle}" y="0" font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" font-weight="800" letter-spacing="3.5" fill="url(#vfDeepBlueGrad)">
                SHOWROOM THUẬN AN
              </text>
              <text x="${marqueeCycle * 2}" y="0" font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" font-weight="800" letter-spacing="3.5" fill="url(#vfDeepBlueGrad)">
                SHOWROOM THUẬN AN
              </text>
            </g>
          </g>
        </g>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🎬 Bắt đầu render Siêu Logo Trung Thu Đa Cảnh (1 ảnh duy nhất, tự chuyển cảnh mượt mà)...');

  const publicDir = path.join(__dirname, '../public/assets');
  const picturesDir = path.join(__dirname, '../pictures');
  const brainDir = path.join('C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\20283d69-1a33-4b02-a664-4c400b1f10f4');

  const frameBuffers = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const svg = renderMasterFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 92, alphaQuality: 100, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  console.log('📦 Đang đóng gói file WebP động Master...');
  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0);

  const targetFiles = [
    path.join(publicDir, 'logo_showroom_thuan_an_trung_thu_master.webp'),
    path.join(picturesDir, 'logo_showroom_thuan_an_trung_thu_master.webp'),
    path.join(brainDir, 'logo_showroom_thuan_an_trung_thu_master.webp')
  ];

  for (const f of targetFiles) {
    try {
      fs.writeFileSync(f, animatedWebp);
    } catch (e) {
      console.warn('Warning writing to:', f, e.message);
    }
  }

  console.log(`🎉 HOÀN THÀNH XUẤT SẮC! Siêu Logo Trung Thu Đa Cảnh (1 file WebP duy nhất) đã tạo tại:`);
  console.log(`   - ${targetFiles[1]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('❌ Lỗi render logo master:', err);
  process.exit(1);
});
