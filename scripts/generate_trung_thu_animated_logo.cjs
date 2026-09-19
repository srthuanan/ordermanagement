const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Dimensions matching standard showroom logo: 495 x 80
const WIDTH = 495;
const HEIGHT = 80;
const FRAMES = 48;
const DELAY = 100; // 100ms per frame = 4.8s loop

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
    anmfHeader[15] = 0x02; // dispose to background, blend enabled

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
  vp8xHeader[8] = 0x12; // Has animation + alpha
  writeUInt24LE(vp8xHeader, WIDTH - 1, 12);
  writeUInt24LE(vp8xHeader, HEIGHT - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8); // Transparent background color
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
// RENDER KHUNG HÌNH LOGO TRUNG THU HIỆN ĐẠI (TRONG SUỐT 100%, HIỆU ỨNG ĐỘNG ĐỈNH CAO)
// ---------------------------------------------------------------------------------
function renderMidAutumnLogoFrame(frameIndex) {
  const progress = frameIndex / (FRAMES - 1);
  const phase = progress * Math.PI * 4;
  
  // 1. Cánh chim chữ V VinFast chuyển động vỗ cánh
  const flapAngle = Math.sin(phase) * 7.5;
  const flapScaleY = 1 + Math.sin(phase) * 0.08;
  const flapScaleX = 1 - Math.sin(phase) * 0.03;
  const bodyLift = Math.sin(phase) * 1.5;

  // 2. Vầng trăng rằm phát sáng dạ quang (Moonlight Aura Pulse)
  const moonPulse = 0.85 + Math.sin(phase * 0.5) * 0.15;
  const moonGlowR = (34 + Math.sin(phase) * 2.5).toFixed(1);
  const moonGlowOpacity = (0.45 + Math.sin(phase) * 0.2).toFixed(2);

  // 3. Dải mây vàng Á Đông trôi nhẹ (Cloud Drift)
  const cloudDriftX1 = (Math.sin(phase) * 2.8).toFixed(2);
  const cloudDriftX2 = (-Math.cos(phase) * 2.2).toFixed(2);
  const cloudBobY = (Math.sin(phase * 1.5) * 1.2).toFixed(2);

  // 4. Đèn lồng ông sao 3D đung đưa (Star Lantern Swing)
  const starSwing = (Math.sin(phase) * 12.5).toFixed(2);
  const starGlow = (0.7 + Math.sin(phase * 2) * 0.3).toFixed(2);

  // 5. Tia sáng sao lấp lánh (Twinkling sparkles)
  const sparkWingL = Math.max(0, Math.sin(phase) * 1.2);
  const sparkWingR = Math.max(0, Math.sin(phase - Math.PI * 0.5) * 1.2);
  const sparkStar = Math.max(0, Math.sin(phase + Math.PI * 0.3) * 1.4);
  const sparkCloud = Math.max(0, Math.sin(phase - Math.PI) * 1.1);

  // 6. Dải LED Xanh VinFast & Vệt sáng kim loại
  const ledGlowOpacity = (0.55 + Math.sin(phase + Math.PI * 0.5) * 0.4).toFixed(2);

  // 7. Chạy chữ Marquee 'SHOWROOM THUẬN AN'
  const marqueeCycle = 340;
  const marqueeX = - (progress * marqueeCycle);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 🌕 1. VẦNG TRĂNG RẰM DẠ QUANG GRADIENTS -->
        <radialGradient id="luminousMoonGrad" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fffbeb" />
          <stop offset="60%" stop-color="#fef08a" />
          <stop offset="85%" stop-color="#fde047" />
          <stop offset="100%" stop-color="#ca8a04" />
        </radialGradient>

        <radialGradient id="moonAuraGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.65" />
          <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.30" />
          <stop offset="80%" stop-color="#ea580c" stop-opacity="0.10" />
          <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
        </radialGradient>

        <!-- ☁️ 2. MÂY VÀNG HOÀNG KIM Á ĐÔNG GRADIENTS -->
        <linearGradient id="cloudGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="20%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="78%" stop-color="#b45309" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>

        <linearGradient id="cloudStrokeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#fde047" />
          <stop offset="100%" stop-color="#92400e" />
        </linearGradient>

        <!-- 💎 3. CHROME METALLIC GRADIENT CHUẨN VINFAST -->
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

        <linearGradient id="exactVinFastFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#f1f5f9" />
          <stop offset="55%" stop-color="#cbd5e1" />
          <stop offset="80%" stop-color="#94a3b8" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>

        <!-- 💙 4. VINFAST ELECTRIC BLUE -->
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

        <!-- ⭐ 5. ĐÈN ÔNG SAO 3D FACETS -->
        <linearGradient id="starFacetGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fffbeb" />
          <stop offset="50%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#b45309" />
        </linearGradient>

        <linearGradient id="starFacetRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fca5a5" />
          <stop offset="50%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#991b1b" />
        </linearGradient>

        <!-- 🖤 Viền Dao Cạo Titanium Sắc Nét -->
        <linearGradient id="thinTitaniumOutline" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="50%" stop-color="#334155" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>

        <!-- Filters: Đổ bóng sắc nét không bị nhòe mờ đục -->
        <filter id="crispShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.4" flood-color="#0f172a" flood-opacity="0.25"/>
        </filter>

        <filter id="starBurst" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

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
      <!-- 🌕 PHẦN 1: VẦNG TRĂNG RẰM THÁNG TÁM DẠ QUANG (PHÍA SAU CÁNH CHỮ V) -->
      <!-- ============================================================= -->
      <g transform="translate(48, 38)">
        <!-- Vầng hào quang trăng rằm phát sáng lan tỏa -->
        <circle cx="0" cy="0" r="${moonGlowR}" fill="url(#moonAuraGrad)" opacity="${moonGlowOpacity}"/>
        
        <!-- Đĩa Trăng Tròn Đầy Ánh Kim -->
        <circle cx="0" cy="0" r="28" fill="url(#luminousMoonGrad)" filter="url(#crispShadow)"/>
        
        <!-- Vân Trăng Mờ Ảo Tinh Tế (Lunar Craters Silhouette) -->
        <path d="M -12,-10 A 8,8 0 0,1 -4,-18 A 14,14 0 0,0 -16,-6 Z" fill="#ca8a04" opacity="0.18"/>
        <path d="M 6,-14 A 10,10 0 0,1 18,-6 A 12,12 0 0,0 8,-16 Z" fill="#ca8a04" opacity="0.22"/>
        <path d="M -16,6 A 12,12 0 0,1 -8,18 A 16,16 0 0,0 -20,10 Z" fill="#ca8a04" opacity="0.15"/>
        <circle cx="10" cy="8" r="4.5" fill="#ca8a04" opacity="0.16"/>
        
        <!-- Vành viền ánh kim mảnh quanh đĩa trăng -->
        <circle cx="0" cy="0" r="28" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>
      </g>

      <!-- ============================================================= -->
      <!-- 🦅 PHẦN 2: BIỂU TƯỢNG CÁNH CHIM CHỮ "V" VINFAST 3D VỖ CÁNH -->
      <!-- ============================================================= -->
      <g transform="translate(48, ${(38 + bodyLift).toFixed(2)})" filter="url(#crispShadow)">
        
        <!-- 🪽 CÁNH TRÁI (LEFT FLAPPING WING) -->
        <g transform="translate(0, 36) rotate(${(-flapAngle).toFixed(2)}) scale(${flapScaleX.toFixed(3)}, ${flapScaleY.toFixed(3)}) translate(0, -36)">
          <path d="M 0,36 C -16,17 -32,1 -40,-26 C -28,-10 -14,4 0,16 Z" 
                fill="url(#exactVinFastChrome)" 
                stroke="#1e293b" 
                stroke-width="1.2" 
                stroke-linejoin="round"/>
          <path d="M 0,36 C -16,17 -32,1 -40,-26 C -30,-12 -16,0 0,13 Z" 
                fill="url(#exactVinFastFace)" 
                opacity="0.95"/>
          
          <!-- Cánh lồng trong trái: Xanh Electric Blue -->
          <path d="M 0,22 C -9,11 -18,0 -24,-14 C -17,-5 -8,3 0,9 Z" 
                fill="url(#vfElectricBlueGrad)" 
                stroke="#ffffff" 
                stroke-width="0.8"/>
          
          <!-- Dải LED Neon Phát Sáng Xanh -->
          <path d="M 0,20 C -7,10 -15,1 -20,-11" 
                fill="none" 
                stroke="#bae6fd" 
                stroke-width="1.4" 
                stroke-linecap="round" 
                opacity="${ledGlowOpacity}"/>
        </g>

        <!-- 🪽 CÁNH PHẢI (RIGHT FLAPPING WING) -->
        <g transform="translate(0, 36) rotate(${flapAngle.toFixed(2)}) scale(${flapScaleX.toFixed(3)}, ${flapScaleY.toFixed(3)}) translate(0, -36)">
          <path d="M 0,36 C 16,17 32,1 40,-26 C 28,-10 14,4 0,16 Z" 
                fill="url(#exactVinFastChrome)" 
                stroke="#1e293b" 
                stroke-width="1.2" 
                stroke-linejoin="round"/>
          <path d="M 0,36 C 16,17 32,1 40,-26 C 28,-10 14,4 0,16 Z" 
                fill="url(#exactVinFastChrome)" 
                opacity="0.85"/>
          
          <!-- Cánh lồng trong phải: Xanh Electric Blue -->
          <path d="M 0,22 C 9,11 18,0 24,-14 C 17,-5 8,3 0,9 Z" 
                fill="url(#vfElectricBlueGrad)" 
                stroke="#ffffff" 
                stroke-width="0.8"/>
          
          <!-- Dải LED Neon Phát Sáng Xanh -->
          <path d="M 0,20 C 7,10 15,1 20,-11" 
                fill="none" 
                stroke="#bae6fd" 
                stroke-width="1.4" 
                stroke-linecap="round" 
                opacity="${ledGlowOpacity}"/>
        </g>

        <!-- ⚔️ Sống lưng 3D Trục giữa sắc nét -->
        <line x1="0" y1="36" x2="0" y2="13" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="0" cy="9" r="2.2" fill="url(#vfElectricBlueGrad)" stroke="#ffffff" stroke-width="0.6"/>

        <!-- ✨ Sparkle đỉnh cánh trái -->
        ${sparkWingL > 0.05 ? `
        <g transform="translate(-39, -25) scale(${sparkWingL.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-7 1.6,-1.6 7,0 1.6,1.6 0,7 -1.6,1.6 -7,0 -1.6,-1.6" fill="#ffffff"/>
          <circle cx="0" cy="0" r="1.8" fill="#38bdf8"/>
        </g>
        ` : ''}

        <!-- ✨ Sparkle đỉnh cánh phải -->
        ${sparkWingR > 0.05 ? `
        <g transform="translate(39, -25) scale(${sparkWingR.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-7 1.6,-1.6 7,0 1.6,1.6 0,7 -1.6,1.6 -7,0 -1.6,-1.6" fill="#ffffff"/>
          <circle cx="0" cy="0" r="1.8" fill="#38bdf8"/>
        </g>
        ` : ''}
      </g>

      <!-- ============================================================= -->
      <!-- ☁️ PHẦN 3: CỤM MÂY VÀNG NGŨ SẮC Á ĐÔNG UỐN LƯỢN NÂNG CHÂN CHỮ V -->
      <!-- ============================================================= -->
      <g transform="translate(${cloudDriftX1}, ${cloudBobY})">
        <!-- Cụm mây trái uốn lượn -->
        <g transform="translate(10, 52)" filter="url(#crispShadow)">
          <path d="M 0,16 C 4,8 14,8 18,12 C 22,6 34,7 36,15 C 32,20 18,22 4,20 C 1,20 -1,18 0,16 Z" 
                fill="url(#cloudGoldGrad)" stroke="url(#cloudStrokeGrad)" stroke-width="0.8"/>
          <!-- Xoáy ốc mây Á Đông -->
          <path d="M 8,16 A 4,4 0 1,1 12,12 A 2,2 0 0,1 10,14" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round"/>
        </g>

        <!-- Cụm mây phải ôm chân chữ V -->
        <g transform="translate(${cloudDriftX2}, 0)">
          <g transform="translate(68, 54)" filter="url(#crispShadow)">
            <path d="M 0,12 C 4,5 16,5 20,10 C 26,4 38,7 38,15 C 32,19 16,20 2,18 Z" 
                  fill="url(#cloudGoldGrad)" stroke="url(#cloudStrokeGrad)" stroke-width="0.8"/>
            <path d="M 12,13 A 3.5,3.5 0 1,1 15,10 A 1.8,1.8 0 0,1 14,12" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round"/>
          </g>
        </g>
      </g>

      <!-- ============================================================= -->
      <!-- 🚗 PHẦN 4: DÒNG CHỮ VINFAST 3D CHROME KIM LOẠI SẮC NÉT -->
      <!-- ============================================================= -->
      <g transform="translate(108, 38)" filter="url(#crispShadow)">
        
        <!-- Hàng 1: VINFAST -->
        <g transform="translate(0, -3)">
          <!-- Base Shadow -->
          <text x="1.2" y="0" 
                font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" 
                font-weight="700" 
                letter-spacing="7" 
                fill="#0f172a" 
                opacity="0.25">
            VINFAST
          </text>
          
          <!-- Outer Thin Titanium Stroke -->
          <text x="0" y="0" 
                font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" 
                font-weight="700" 
                letter-spacing="7" 
                fill="none" 
                stroke="url(#thinTitaniumOutline)" 
                stroke-width="0.8" 
                stroke-linejoin="round">
            VINFAST
          </text>
          
          <!-- Front Exact Chrome Shading Face -->
          <text x="0" y="0" 
                font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" 
                font-weight="700" 
                letter-spacing="7" 
                fill="url(#exactVinFastChrome)">
            VINFAST
          </text>

          <!-- Top Specular Highlight Stroke -->
          <text x="0" y="-0.6" 
                font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" 
                font-weight="700" 
                letter-spacing="7" 
                fill="none" 
                stroke="#ffffff" 
                stroke-width="0.4" 
                opacity="${(0.6 + moonPulse * 0.3).toFixed(2)}">
            VINFAST
          </text>
        </g>

        <!-- ============================================================= -->
        <!-- ⭐ PHẦN 5: ĐÈN LỒNG ÔNG SAO 3D ĐUNG ĐƯA Ở ĐUÔI CHỮ VINFAST -->
        <!-- ============================================================= -->
        <g transform="translate(254, -20)">
          <!-- Dây treo đèn lồng đung đưa quanh điểm tựa (0,0) -->
          <g transform="rotate(${starSwing})">
            <!-- Sợi chỉ vàng treo -->
            <line x1="0" y1="0" x2="0" y2="14" stroke="#d97706" stroke-width="0.9" stroke-dasharray="1.5,1"/>
            
            <!-- Đèn Ông Sao 3D (Tâm tại x=0, y=26) -->
            <g transform="translate(0, 26)" filter="url(#crispShadow)">
              <!-- Vòng tròn phát sáng dịu quanh đèn -->
              <circle cx="0" cy="0" r="14" fill="url(#moonAuraGrad)" opacity="${starGlow}"/>

              <!-- Các mặt tam giác khối 3D tạo hiệu ứng đèn ông sao nổi bật -->
              <!-- Cánh đỉnh -->
              <polygon points="0,-12 0,0 -3.5,-3.5" fill="url(#starFacetGold)"/>
              <polygon points="0,-12 3.5,-3.5 0,0" fill="url(#starFacetRed)"/>

              <!-- Cánh phải trên -->
              <polygon points="12,-3.5 0,0 3.5,-3.5" fill="url(#starFacetGold)"/>
              <polygon points="12,-3.5 4,4 0,0" fill="url(#starFacetRed)"/>

              <!-- Cánh phải dưới -->
              <polygon points="7.5,11 0,0 4,4" fill="url(#starFacetGold)"/>
              <polygon points="7.5,11 -1,5 0,0" fill="url(#starFacetRed)"/>

              <!-- Cánh trái dưới -->
              <polygon points="-7.5,11 0,0 -1,5" fill="url(#starFacetRed)"/>
              <polygon points="-7.5,11 -4,4 0,0" fill="url(#starFacetGold)"/>

              <!-- Cánh trái trên -->
              <polygon points="-12,-3.5 0,0 -4,4" fill="url(#starFacetRed)"/>
              <polygon points="-12,-3.5 -3.5,-3.5 0,0" fill="url(#starFacetGold)"/>

              <!-- Nhụy trung tâm phát sáng tròn đỏ/vàng -->
              <circle cx="0" cy="0" r="2.8" fill="#fef08a" stroke="#b45309" stroke-width="0.6"/>

              <!-- Tia sao lấp lánh khi đung đưa -->
              ${sparkStar > 0.1 ? `
              <g transform="scale(${sparkStar.toFixed(2)})" filter="url(#starBurst)">
                <polygon points="0,-8 1.5,-1.5 8,0 1.5,1.5 0,8 -1.5,1.5 -8,0 -1.5,-1.5" fill="#ffffff"/>
                <circle cx="0" cy="0" r="2" fill="#fde047"/>
              </g>
              ` : ''}
            </g>
          </g>
        </g>

        <!-- ============================================================= -->
        <!-- 🏃‍♂️ PHẦN 6: CHẠY CHỮ 'SHOWROOM THUẬN AN' KÈM CHỈ XANH NEON -->
        <!-- ============================================================= -->
        <g transform="translate(0, 0)">
          <!-- Underline Chỉ Xanh VinFast Phát Sáng -->
          <line x1="0" y1="35" x2="248" y2="35" stroke="url(#vfElectricBlueGrad)" stroke-width="1.6" opacity="${(0.7 + moonPulse*0.3).toFixed(2)}"/>

          <!-- Khung Cửa Sổ Cắt Chữ (Marquee Viewport) -->
          <g clip-path="url(#marqueeClip)" mask="url(#marqueeFadeMask)">
            <!-- Dòng Chữ Chạy Chậm Rãi Với Khoảng Cách Rộng Rãi -->
            <g transform="translate(${marqueeX.toFixed(1)}, 30)">
              
              <!-- Bản 1 -->
              <text x="0" y="0" 
                    font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" 
                    font-weight="800" 
                    letter-spacing="3.5" 
                    fill="url(#vfDeepBlueGrad)">
                SHOWROOM THUẬN AN
              </text>
              
              <!-- Bản 2 (Cách xa 340px) -->
              <text x="${marqueeCycle}" y="0" 
                    font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" 
                    font-weight="800" 
                    letter-spacing="3.5" 
                    fill="url(#vfDeepBlueGrad)">
                SHOWROOM THUẬN AN
              </text>

              <!-- Bản 3 -->
              <text x="${marqueeCycle * 2}" y="0" 
                    font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" 
                    font-weight="800" 
                    letter-spacing="3.5" 
                    fill="url(#vfDeepBlueGrad)">
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
  console.log('🌕 Bắt đầu render Logo VinFast Trung Thu Động (Transparent 100%, Animated WebP)...');

  const publicDir = path.join(__dirname, '../public/assets');
  const picturesDir = path.join(__dirname, '../pictures');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(picturesDir)) fs.mkdirSync(picturesDir, { recursive: true });

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderMidAutumnLogoFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 100, alphaQuality: 100, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0);

  // Lưu file riêng biệt, TUYỆT ĐỐI KHÔNG ĐÈ LÊN logo_showroom_thuan_an.webp GỐC!
  const targetFiles = [
    path.join(publicDir, 'logo_showroom_thuan_an_trung_thu.webp'),
    path.join(picturesDir, 'logo_showroom_thuan_an_trung_thu.webp')
  ];

  for (const f of targetFiles) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Thành công! Logo Trung Thu động (WebP) đã tạo tại:`);
  console.log(`   - ${targetFiles[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
  console.log(`   - ${targetFiles[1]}`);
}

main().catch(err => {
  console.error('❌ Lỗi tạo logo động:', err);
  process.exit(1);
});
