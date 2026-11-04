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
// LOGO VINFAST "BLOOD MOON PHANTOM" — SANG TRỌNG, HIỆN ĐẠI & ĐẬM CHẤT MA MỊ HALLOWEEN
// ---------------------------------------------------------------------------------
function renderSpookyHauteHalloweenLogo(frameIndex) {
  const progress = frameIndex / (FRAMES - 1);
  const phase = progress * Math.PI * 4;
  
  // 🦅 1. Cánh chim vỗ nhịp kinematic dũng mãnh
  const flapAngle = Math.sin(phase) * 8.0;
  const flapScaleY = 1 + Math.sin(phase) * 0.08;
  const flapScaleX = 1 - Math.sin(phase) * 0.03;
  const bodyLift = Math.sin(phase) * 1.5;

  // 🌕 2. Huyết nguyệt / Trăng ma quái bập bùng (Blood Crescent Moon Pulse)
  const moonPulse = (0.75 + Math.sin(phase) * 0.25).toFixed(2);
  const moonGlowR = (30 + Math.sin(phase * 1.5) * 4).toFixed(1);

  // 🔥 3. Ngọn lửa ma thuật bốc lên trong lòng cánh (Ghostly Soulfire Flicker)
  const soulFireY = (Math.sin(phase * 3) * 1.8).toFixed(1);
  const soulFireGlow = (0.65 + Math.sin(phase * 2.5) * 0.35).toFixed(2);

  // 🦇 4. Đàn dơi bóng ma lượn quanh vầng trăng và góc chữ
  const bat1_X = 52 + Math.sin(phase) * 16;
  const bat1_Y = 12 + Math.cos(phase * 1.5) * 6;
  const bat1_Flap = Math.sin(phase * 4);

  const bat2_X = 265 + Math.sin(phase + 1) * 22;
  const bat2_Y = 15 + Math.cos(phase * 2) * 5;
  const bat2_Flap = Math.sin(phase * 5);

  const bat3_X = 350 + Math.sin(phase + 2) * 18;
  const bat3_Y = 10 + Math.sin(phase * 2) * 6;
  const bat3_Flap = Math.sin(phase * 4.5);

  // ✨ 5. Ánh lửa & Ánh sao ma mị (Spooky Diamond Sparkles)
  const sparkLeft = Math.max(0, Math.sin(phase) * 1.3);
  const sparkRight = Math.max(0, Math.sin(phase - Math.PI * 0.5) * 1.3);
  const sparkText = Math.max(0, Math.sin(phase - Math.PI * 1.3) * 1.3);

  // 🏃‍♂️ 6. Dải chữ Marquee chạy chậm rãi
  const marqueeCycle = 340;
  const marqueeX = - (progress * marqueeCycle);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 💎 1. CHROME BẠCH KIM PHẢN CHIẾU ÁNH TRĂNG MA (Moonlit Silver Chrome) -->
        <linearGradient id="moonlitChrome" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="14%" stop-color="#f8fafc" />
          <stop offset="32%" stop-color="#cbd5e1" />
          <stop offset="47%" stop-color="#ffffff" />
          <stop offset="52%" stop-color="#334155" />
          <stop offset="70%" stop-color="#64748b" />
          <stop offset="88%" stop-color="#475569" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>

        <!-- 🌕 2. HUYẾT NGUYỆT HALLOWEEN (Blood Crescent Moon Gradient) -->
        <linearGradient id="bloodMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="30%" stop-color="#f59e0b" />
          <stop offset="65%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#991b1b" />
        </linearGradient>

        <radialGradient id="bloodMoonAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.6" />
          <stop offset="40%" stop-color="#dc2626" stop-opacity="0.3" />
          <stop offset="75%" stop-color="#7c2d12" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>

        <!-- 🔥 3. GHOSTLY SOULFIRE (Lửa Ma Thuật: Cam Hỏa Ngục & Tím Dạ Xoa) -->
        <linearGradient id="soulFireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#581c87" />
          <stop offset="35%" stop-color="#9333ea" />
          <stop offset="70%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#fef08a" />
        </linearGradient>

        <linearGradient id="ghostlyNeonLine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="40%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#a855f7" />
        </linearGradient>

        <!-- 🌲 4. BÓNG CÀNH CÂY MA QUÁI (Spooky Tree Silhouette) -->
        <linearGradient id="spookyBranchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>

        <!-- 🖤 GÂN KIM LOẠI TITAN ĐEN BẢO VỆ -->
        <linearGradient id="blackTitanStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#64748b" />
          <stop offset="50%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>

        <!-- 🏃‍♂️ Clip Path & Smooth Fade Mask -->
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

        <!-- Filters -->
        <filter id="crispShadow" x="-15%" y="-15%" width="130%" height="135%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="#450a0a" flood-opacity="0.38"/>
        </filter>
        <filter id="moonGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="starBurst" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- 🌕 0. VẦNG TRĂNG HUYẾT NGUYỆT MA QUÁI ÔM PHÍA SAU CÁNH CHỮ V (Tâm x=44, y=40) -->
      <g transform="translate(44, ${(40 + bodyLift * 0.5).toFixed(2)})">
        <!-- Vầng hào quang Huyết Nguyệt rực rỡ bập bùng -->
        <circle cx="-6" cy="-8" r="${moonGlowR}" fill="url(#bloodMoonAura)" opacity="${moonPulse}"/>
        
        <!-- Vầng Trăng Lưỡi Liềm Huyết Nguyệt (Blood Crescent Moon) sắc nét nghệ thuật -->
        <path d="M 14,-28 A 26 26 0 1 0 14,14 A 20 20 0 1 1 14,-28 Z" 
              fill="url(#bloodMoonGrad)" 
              filter="url(#moonGlowFilter)"
              opacity="0.92"/>
        
        <!-- Nhánh cây khô ma quái mảnh mai vươn qua vầng trăng (Gothic Silhouette Branches) -->
        <g stroke="url(#spookyBranchGrad)" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.6">
          <path d="M -30,12 Q -22,-2 -15,-12 Q -10,-19 -4,-22 M -15,-12 Q -18,-20 -22,-26 M -10,-19 Q -5,-26 -2,-30"/>
        </g>
      </g>

      <!-- 🦅 1. BIỂU TƯỢNG CÁNH CHIM CHỮ "V" VINFAST MẠ CROM BẠCH KIM & LỬA MA THUẬT (Tâm y=40) -->
      <g transform="translate(44, ${(40 + bodyLift).toFixed(2)})" filter="url(#crispShadow)">
        
        <!-- 🪽 CÁNH TRÁI (LEFT FLAPPING CHROME WING) -->
        <g transform="translate(0, 36) rotate(${(-flapAngle).toFixed(2)}) scale(${flapScaleX.toFixed(3)}, ${flapScaleY.toFixed(3)}) translate(0, -36)">
          <!-- Khung cánh ngoài: Crom Bạch Kim Sang Trọng (Moonlit Silver Chrome) -->
          <path d="M 0,36 C -16,17 -32,1 -40,-26 C -28,-10 -14,4 0,16 Z" 
                fill="url(#moonlitChrome)" 
                stroke="url(#blackTitanStroke)" 
                stroke-width="1.2" 
                stroke-linejoin="round"/>
          
          <!-- Mặt vát cạnh ánh kim gương -->
          <path d="M 0,36 C -16,17 -32,1 -40,-26 C -30,-12 -16,0 0,13 Z" 
                fill="url(#moonlitChrome)" 
                opacity="0.95"/>
          
          <!-- Lõi cánh bên trong: Ngọn Lửa Ma Thuật Soulfire (Tím Huyền Bí -> Cam Hỏa Ngục) -->
          <path d="M 0,22 C -9,11 -18,0 -24,-14 C -17,-5 -8,3 0,9 Z" 
                fill="url(#soulFireGrad)" 
                stroke="#fef08a" 
                stroke-width="0.7"/>
          
          <!-- Dải LED Neon ánh lửa ma quái bập bùng -->
          <path d="M 0,${(20 + parseFloat(soulFireY)).toFixed(1)} C -7,10 -15,1 -20,-11" 
                fill="none" 
                stroke="url(#ghostlyNeonLine)" 
                stroke-width="1.5" 
                stroke-linecap="round" 
                opacity="${soulFireGlow}"/>
        </g>

        <!-- 🪽 CÁNH PHẢI (RIGHT FLAPPING CHROME WING) -->
        <g transform="translate(0, 36) rotate(${flapAngle.toFixed(2)}) scale(${flapScaleX.toFixed(3)}, ${flapScaleY.toFixed(3)}) translate(0, -36)">
          <!-- Khung cánh ngoài: Crom Bạch Kim Sang Trọng (Moonlit Silver Chrome) -->
          <path d="M 0,36 C 16,17 32,1 40,-26 C 28,-10 14,4 0,16 Z" 
                fill="url(#moonlitChrome)" 
                stroke="url(#blackTitanStroke)" 
                stroke-width="1.2" 
                stroke-linejoin="round"/>
          
          <!-- Mặt vát cạnh ánh kim gương -->
          <path d="M 0,36 C 16,17 32,1 40,-26 C 28,-10 14,4 0,16 Z" 
                fill="url(#moonlitChrome)" 
                opacity="0.88"/>
          
          <!-- Lõi cánh bên trong: Ngọn Lửa Ma Thuật Soulfire -->
          <path d="M 0,22 C 9,11 18,0 24,-14 C 17,-5 8,3 0,9 Z" 
                fill="url(#soulFireGrad)" 
                stroke="#fef08a" 
                stroke-width="0.7"/>
          
          <!-- Dải LED Neon ánh lửa ma quái bập bùng -->
          <path d="M 0,${(20 + parseFloat(soulFireY)).toFixed(1)} C 7,10 15,1 20,-11" 
                fill="none" 
                stroke="url(#ghostlyNeonLine)" 
                stroke-width="1.5" 
                stroke-linecap="round" 
                opacity="${soulFireGlow}"/>
        </g>

        <!-- ⚔️ Trục Sống Lưng Trung Tâm & Điểm Lửa Huyết Nguyệt -->
        <line x1="0" y1="36" x2="0" y2="13" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="0" cy="9" r="2.4" fill="url(#bloodMoonGrad)" stroke="#ffffff" stroke-width="0.7"/>

        <!-- ✨ Sparkle 1: Đỉnh Cánh Trái (Ánh Kim Cương Ánh Cam) -->
        ${sparkLeft > 0.05 ? `
        <g transform="translate(-39, -25) scale(${sparkLeft.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-8 1.8,-1.8 8,0 1.8,1.8 0,8 -1.8,1.8 -8,0 -1.8,-1.8" fill="#ffffff"/>
          <circle cx="0" cy="0" r="2" fill="#f59e0b"/>
        </g>
        ` : ''}

        <!-- ✨ Sparkle 2: Đỉnh Cánh Phải (Ánh Kim Cương Ánh Cam) -->
        ${sparkRight > 0.05 ? `
        <g transform="translate(39, -25) scale(${sparkRight.toFixed(2)})" filter="url(#starBurst)">
          <polygon points="0,-8 1.8,-1.8 8,0 1.8,1.8 0,8 -1.8,1.8 -8,0 -1.8,-1.8" fill="#ffffff"/>
          <circle cx="0" cy="0" r="2" fill="#f59e0b"/>
        </g>
        ` : ''}
      </g>

      <!-- 🦇 2. ĐÀN DƠI BÓNG ĐÊM GOTHIC (Shadow Bats Chao Liệng Nghệ Thuật) -->
      <!-- Chú dơi 1: Bay vút qua vầng trăng -->
      <g transform="translate(${bat1_X.toFixed(1)}, ${bat1_Y.toFixed(1)}) scale(0.65)" opacity="0.85">
        <path d="M 0,0 C -5,-7 -11,${(-7 + bat1_Flap*3).toFixed(1)} -15,${(2 + bat1_Flap*3).toFixed(1)} C -12,0 -9,4 -5,1 C -3,3 -1,2 0,0 C 1,2 3,3 5,1 C 9,4 12,0 15,${(2 + bat1_Flap*3).toFixed(1)} C 11,${(-7 + bat1_Flap*3).toFixed(1)} 5,-7 0,0 Z" 
              fill="#18181b" stroke="#71717a" stroke-width="0.4"/>
      </g>

      <!-- Chú dơi 2: Chao lượn trên chữ N của VINFAST -->
      <g transform="translate(${bat2_X.toFixed(1)}, ${bat2_Y.toFixed(1)}) scale(0.55)" opacity="0.75">
        <path d="M 0,0 C -5,-7 -11,${(-7 + bat2_Flap*3).toFixed(1)} -15,${(2 + bat2_Flap*3).toFixed(1)} C -12,0 -9,4 -5,1 C -3,3 -1,2 0,0 C 1,2 3,3 5,1 C 9,4 12,0 15,${(2 + bat2_Flap*3).toFixed(1)} C 11,${(-7 + bat2_Flap*3).toFixed(1)} 5,-7 0,0 Z" 
              fill="#18181b" stroke="#f97316" stroke-width="0.4"/>
      </g>

      <!-- Chú dơi 3: Bay xa mờ ở góc chữ T -->
      <g transform="translate(${bat3_X.toFixed(1)}, ${bat3_Y.toFixed(1)}) scale(0.42)" opacity="0.6">
        <path d="M 0,0 C -5,-7 -11,${(-7 + bat3_Flap*3).toFixed(1)} -15,${(2 + bat3_Flap*3).toFixed(1)} C -12,0 -9,4 -5,1 C -3,3 -1,2 0,0 C 1,2 3,3 5,1 C 9,4 12,0 15,${(2 + bat3_Flap*3).toFixed(1)} C 11,${(-7 + bat3_Flap*3).toFixed(1)} 5,-7 0,0 Z" 
              fill="#27272a"/>
      </g>

      <!-- 🚗 3. CỤM CHỮ VINFAST BẠCH KIM ÁNH HỎA NGỤC (THANH LỊCH, SANG TRỌNG) -->
      <g transform="translate(104, 40)" filter="url(#crispShadow)">
        
        <!-- Hàng 1: VINFAST (Nét chữ thanh thoát font-weight: 700, letter-spacing: 7px) -->
        <g transform="translate(0, -3)">
          <!-- Base Shadow Đậm Nét -->
          <text x="1.5" y="0.8" 
                font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" 
                font-weight="700" 
                letter-spacing="7" 
                fill="#450a0a" 
                opacity="0.32">
            VINFAST
          </text>
          
          <!-- Outer Titanium Dark Stroke -->
          <text x="0" y="0" 
                font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" 
                font-weight="700" 
                letter-spacing="7" 
                fill="none" 
                stroke="#1e293b" 
                stroke-width="0.9" 
                stroke-linejoin="round">
            VINFAST
          </text>
          
          <!-- Front Face: Crom Bạch Kim Sang Trọng (Moonlit Silver Chrome) -->
          <text x="0" y="0" 
                font-family="'Segoe UI', 'Montserrat', 'Outfit', sans-serif" 
                font-size="41" 
                font-weight="700" 
                letter-spacing="7" 
                fill="url(#moonlitChrome)">
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
                stroke-width="0.5" 
                opacity="0.85">
            VINFAST
          </text>

          <!-- ✨ Sparkle: Góc chữ T lấp lánh ánh vàng hổ phách -->
          ${sparkText > 0.05 ? `
          <g transform="translate(230, -28) scale(${sparkText.toFixed(2)})" filter="url(#starBurst)">
            <polygon points="0,-8 1.8,-1.8 8,0 1.8,1.8 0,8 -1.8,1.8 -8,0 -1.8,-1.8" fill="#ffffff"/>
            <circle cx="0" cy="0" r="1.8" fill="#f59e0b"/>
          </g>
          ` : ''}
        </g>

        <!-- Hàng 2: DÒNG CHỮ 'SHOWROOM THUẬN AN' CHẠY MARQUEE -->
        <g transform="translate(0, 0)">
          <!-- Underline: Dải Laser Nham Thạch Huyết Nguyệt & Lửa Ma Thuật -->
          <linearGradient id="spookyLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ea580c" />
            <stop offset="35%" stop-color="#f59e0b" />
            <stop offset="65%" stop-color="#9333ea" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
          <line x1="0" y1="35" x2="244" y2="35" stroke="url(#spookyLineGrad)" stroke-width="1.6" opacity="0.9"/>

          <!-- Khung Cửa Sổ Cắt Chữ (Marquee Viewport) -->
          <g clip-path="url(#marqueeClip)" mask="url(#marqueeFadeMask)">
            <!-- Dòng chữ chạy chậm rãi với màu Xanh Lửa Ma Thuật (Phantom Cyan) -->
            <g transform="translate(${marqueeX.toFixed(1)}, 30)">
              <!-- Bản 1 -->
              <text x="0" y="0" 
                    font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" 
                    font-weight="800" 
                    letter-spacing="3.5" 
                    fill="#0284c7">
                SHOWROOM THUẬN AN
              </text>
              
              <!-- Bản 2 (Cách xa 340px) -->
              <text x="${marqueeCycle}" y="0" 
                    font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" 
                    font-weight="800" 
                    letter-spacing="3.5" 
                    fill="#0284c7">
                SHOWROOM THUẬN AN
              </text>

              <!-- Bản 3 -->
              <text x="${marqueeCycle * 2}" y="0" 
                    font-family="'Segoe UI', 'Arial', 'Tahoma', sans-serif" 
                    font-size="16" 
                    font-weight="800" 
                    letter-spacing="3.5" 
                    fill="#0284c7">
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
  console.log('🩸 Rendering Spooky Blood Moon Phantom VinFast Logo (48 frames)...');

  const publicDir = path.join(__dirname, '../public/assets');
  const picturesDir = path.join(__dirname, '../pictures');
  const brainDir = 'C:\\Users\\Pham Thanh Nhan\\.gemini\\antigravity-ide\\brain\\16655a90-975e-4707-8c71-4a06f54cb986';

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(picturesDir)) fs.mkdirSync(picturesDir, { recursive: true });

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderSpookyHauteHalloweenLogo(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 86, alphaQuality: 90, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0);

  const files = [
    path.join(publicDir, 'logo_showroom_thuan_an_halloween.webp'),
    path.join(picturesDir, 'logo_showroom_thuan_an_halloween.webp'),
    path.join(brainDir, 'logo_showroom_thuan_an_halloween.webp')
  ];

  for (const f of files) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Spooky Blood Moon Phantom Logo generated: ${files[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
