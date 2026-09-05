const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Width 495x80
const WIDTH = 495;
const HEIGHT = 80;
const FRAMES = 48;
const DELAY = 100;

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

// ---------------------------------------------------------------------------------
// SLENDER, ELEGANT 3D CHROME 'VINFAST' (NÉT CHỮ THANH MẢNH, CHUẨN XÁC THEO ẢNH MẪU)
// ---------------------------------------------------------------------------------
function renderSlenderChromeVinFastLogo(frameIndex) {
  const progress = frameIndex / (FRAMES - 1);
  const phase = progress * Math.PI * 4;
  
  // 🦅 Kinematic Wing Flap
  const flapAngle = Math.sin(phase) * 8.5;
  const flapScaleY = 1 + Math.sin(phase) * 0.09;
  const flapScaleX = 1 - Math.sin(phase) * 0.04;
  const bodyLift = Math.sin(phase) * 1.8;

  // 💙 Pulsing Energy Glow
  const pulseIntensity = 0.75 + Math.sin(phase) * 0.25;
  const ledGlowOpacity = (0.5 + Math.sin(phase + Math.PI * 0.5) * 0.45).toFixed(2);
  
  // ✨ Sequential Diamond Twinkles
  const sparkLeft = Math.max(0, Math.sin(phase) * 1.3);
  const sparkRight = Math.max(0, Math.sin(phase - Math.PI * 0.5) * 1.3);
  const sparkShield = Math.max(0, Math.sin(phase - Math.PI) * 1.3);
  const sparkText = Math.max(0, Math.sin(phase - Math.PI * 1.5) * 1.3);

  // 🏃‍♂️ Marquee ticker for bottom row
  const marqueeCycle = 340;
  const marqueeX = - (progress * marqueeCycle);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 💎💎 EXACT SLENDER 3D CHROME METALLIC GRADIENT -->
        <linearGradient id="exactVinFastChrome" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="15%" stop-color="#f8fafc" />
          <stop offset="35%" stop-color="#cbd5e1" />
          <stop offset="48%" stop-color="#ffffff" />
          <stop offset="52%" stop-color="#475569" />
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

        <!-- 💙 VinFast Electric Blue for Wings & Accent -->
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

        <!-- 🖤 Ultra-Thin Razor Titanium Outline -->
        <linearGradient id="thinTitaniumOutline" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="50%" stop-color="#334155" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>

        <!-- 👑 24K Royal Gold 3D Gradient -->
        <linearGradient id="boldGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="20%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="80%" stop-color="#ca8a04" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>

        <!-- 🛡️ Vivid Supercar Shield Red Gradient -->
        <linearGradient id="shieldRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="40%" stop-color="#dc2626" />
          <stop offset="80%" stop-color="#b91c1c" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </linearGradient>

        <!-- 🏃‍♂️ Clip Path & Smooth Fade Mask For Running Marquee Text -->
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

        <!-- Clean Micro Drop Shadow -->
        <filter id="crispShadow" x="-10%" y="-10%" width="125%" height="130%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.2" flood-color="#0f172a" flood-opacity="0.22"/>
        </filter>
        <filter id="starBurst" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- 🦅 1. Biểu Tượng Chữ "V" VinFast VỖ CÁNH 3D (Tâm y=40) -->
      <g transform="translate(44, ${(40 + bodyLift).toFixed(2)})" filter="url(#crispShadow)">
        
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
          
          <!-- Cánh Lồng Trong Trái: Xanh VinFast Electric Blue -->
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
          
          <!-- Cánh Lồng Trong Phải: Xanh VinFast Electric Blue -->
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

        <!-- ⚔️ Sống Lưng 3D Trục Giữa Sắc Nét -->
        <line x1="0" y1="36" x2="0" y2="13" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="0" cy="9" r="2.2" fill="url(#vfElectricBlueGrad)" stroke="#ffffff" stroke-width="0.6"/>

        <!-- ✨ Sparkle 1: Đỉnh Cánh Trái Chữ V -->
        ${sparkLeft > 0.05 ? `
        <g transform="translate(-39, -25) scale(${sparkLeft.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-8 1.8,-1.8 8,0 1.8,1.8 0,8 -1.8,1.8 -8,0 -1.8,-1.8" fill="#ffffff"/>
          <circle cx="0" cy="0" r="2" fill="#38bdf8"/>
        </g>
        ` : ''}

        <!-- ✨ Sparkle 2: Đỉnh Cánh Phải Chữ V -->
        ${sparkRight > 0.05 ? `
        <g transform="translate(39, -25) scale(${sparkRight.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-8 1.8,-1.8 8,0 1.8,1.8 0,8 -1.8,1.8 -8,0 -1.8,-1.8" fill="#ffffff"/>
          <circle cx="0" cy="0" r="2" fill="#38bdf8"/>
        </g>
        ` : ''}
      </g>

      <!-- 🚗 2. Cụm Chữ VINFAST NÉT MẢNH MAI THANH LỊCH (CHUẨN 100% ẢNH MẪU) + KHIÊN 2/9 -->
      <g transform="translate(104, 40)" filter="url(#crispShadow)">
        
        <!-- Hàng 1: VINFAST (Nét chữ thanh thoát font-weight: 700, letter-spacing: 7px) -->
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
          
          <!-- Outer Thin Titanium Stroke (Nét Dao Cạo Mảnh 0.8px) -->
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
                opacity="${(0.6 + pulseIntensity*0.3).toFixed(2)}">
            VINFAST
          </text>

          <!-- ✨ Sparkle 4: Góc Chữ 'T' Của VINFAST -->
          ${sparkText > 0.05 ? `
          <g transform="translate(230, -28) scale(${sparkText.toFixed(2)})" filter="url(#starBurst)">
            <polygon points="0,-7 1.5,-1.5 7,0 1.5,1.5 0,7 -1.5,1.5 -7,0 -1.5,-1.5" fill="#ffffff"/>
            <circle cx="0" cy="0" r="1.5" fill="#f8fafc"/>
          </g>
          ` : ''}


        </g>

        <!-- Hàng 2: CHẠY CHỮ CHẬM RÃI 'SHOWROOM THUẬN AN' -->
        <g transform="translate(0, 0)">
          <!-- Underline Chỉ Xanh VinFast Phát Sáng Êm Dịu -->
          <line x1="0" y1="35" x2="244" y2="35" stroke="url(#vfElectricBlueGrad)" stroke-width="1.5" opacity="${(0.7 + pulseIntensity*0.3).toFixed(2)}"/>

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
  console.log('💎 Rendering Slender 3D Chrome VinFast Logo matching reference image...');

  const publicDir = path.join(__dirname, '../public/assets');
  const picturesDir = path.join(__dirname, '../pictures');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(picturesDir)) fs.mkdirSync(picturesDir, { recursive: true });

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderSlenderChromeVinFastLogo(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 100, alphaQuality: 100, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0);

  const files = [
    path.join(publicDir, 'logo_showroom_thuan_an.webp'),
    path.join(picturesDir, 'logo_showroom_thuan_an.webp')
  ];

  for (const f of files) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Slender Chrome Logo generated: ${files[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
