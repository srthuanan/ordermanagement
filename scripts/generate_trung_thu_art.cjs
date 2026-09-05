const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 800;
const HEIGHT = 520;
const FRAMES = 36;
const DELAY = 90;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 90, loopCount = 0, width = WIDTH, height = HEIGHT) {
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
    writeUInt24LE(anmfHeader, width - 1, 6);
    writeUInt24LE(anmfHeader, height - 1, 9);
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
  writeUInt24LE(vp8xHeader, width - 1, 12);
  writeUInt24LE(vp8xHeader, height - 1, 15);

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

// -----------------------------------------------------------------------------
// 🥮 BỨC TRANH NGHỆ THUẬT: ĐÊM TRĂNG RẰM THÁNG TÁM (TẾT TRUNG THU ĐOÀN VIÊN)
// - Vầng Trăng Rằm Khổng Lồ Vàng Óng Tỏa Hào Quang (Harvest Supermoon)
// - Bóng Chú Cuội Cây Đa & Thỏ Ngọc Cung Trăng (Mythical Banyan Tree & Jade Rabbit)
// - Lồng Đèn Ngôi Sao & Đèn Cá Chép Đung Đưa Dưới Gió Thu (Swaying Lanterns)
// - Hồ Sen Soi Bóng Trăng & Đèn Hoa Đăng Trôi Bồng Bềnh (Lotus Lake & Floating Candles)
// - Đom Đóm Lập Lòe & Mây Trôi Bồng Bềnh (Fireflies & Drifting Autumn Clouds)
// -----------------------------------------------------------------------------
function renderTrungThuArtFrame(frameIndex) {
  const progress = frameIndex / FRAMES;
  const rad = progress * Math.PI * 2;

  // Dao động đung đưa của đèn lồng & hoa đăng (Swaying pendulum physics)
  const lanternSway = Math.sin(rad) * 4.5;
  const candleBob = Math.sin(rad * 1.5) * 3;
  const moonGlow = (0.75 + Math.sin(rad) * 0.15).toFixed(2);
  const cloudX1 = ((frameIndex * 2.2) % (WIDTH + 200)) - 100;
  const cloudX2 = (((frameIndex + 18) * 1.6) % (WIDTH + 200)) - 100;

  // Đom đóm bay lượn (Floating fireflies)
  const fireflies = [];
  for (let i = 0; i < 18; i++) {
    const ffX = (150 + i * 35 + Math.cos(rad + i) * 20).toFixed(1);
    const ffY = (280 + (i % 5) * 25 + Math.sin(rad * 1.3 + i * 2) * 15).toFixed(1);
    const ffOp = (0.3 + (Math.sin(rad * 2 + i) * 0.5 + 0.5) * 0.7).toFixed(2);
    fireflies.push(`
      <circle cx="${ffX}" cy="${ffY}" r="2" fill="#fef08a" opacity="${ffOp}" filter="url(#glowFf)"/>
    `);
  }

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Bầu Trời Đêm Thu Xanh Thẳm Huyền Diệu -->
        <linearGradient id="autumnNightSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="35%" stop-color="#09132e" />
          <stop offset="70%" stop-color="#162044" />
          <stop offset="100%" stop-color="#241b44" />
        </linearGradient>

        <!-- Vầng Trăng Rằm Tháng Tám Vàng Hoàng Kim -->
        <radialGradient id="harvestMoonGrad" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#fffbeb" />
          <stop offset="65%" stop-color="#fef08a" />
          <stop offset="85%" stop-color="#fde047" />
          <stop offset="100%" stop-color="#eab308" />
        </radialGradient>

        <!-- Hào Quang Trăng Rằm -->
        <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="${moonGlow}" />
          <stop offset="40%" stop-color="#facc15" stop-opacity="${(moonGlow * 0.5).toFixed(2)}" />
          <stop offset="75%" stop-color="#ca8a04" stop-opacity="${(moonGlow * 0.2).toFixed(2)}" />
          <stop offset="100%" stop-color="#09132e" stop-opacity="0" />
        </radialGradient>

        <!-- Mặt Nước Hồ Thu Trong Vắt -->
        <linearGradient id="lakeWater" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0c1836" />
          <stop offset="40%" stop-color="#070f24" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>

        <!-- Lồng Đèn Đỏ Vàng Truyền Thống -->
        <linearGradient id="lanternRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff4d4f" />
          <stop offset="40%" stop-color="#dc2626" />
          <stop offset="80%" stop-color="#991b1b" />
          <stop offset="100%" stop-color="#450a0a" />
        </linearGradient>
        <linearGradient id="lanternGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ca8a04" />
          <stop offset="50%" stop-color="#fef08a" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>

        <!-- Khung Chữ Mạ Vàng Thư Pháp -->
        <linearGradient id="goldCalligraphy" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#b45309" />
          <stop offset="25%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="75%" stop-color="#fef08a" />
          <stop offset="100%" stop-color="#b45309" />
        </linearGradient>

        <!-- Filters Mờ Ảo & Ánh Sáng -->
        <filter id="haloBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="35"/>
        </filter>
        <filter id="cloudSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>
        <filter id="lanternGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#f59e0b" flood-opacity="0.85"/>
        </filter>
        <filter id="glowFf" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- ================= 1. BẦU TRỜI ĐÊM THU & HÀO QUANG ================= -->
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#autumnNightSky)" rx="16"/>

      <!-- Hào quang Trăng Rằm tháng 8 lan tỏa -->
      <circle cx="540" cy="180" r="220" fill="url(#moonHalo)" filter="url(#haloBlur)"/>

      <!-- ================= 2. VẦNG TRĂNG RẰM THÁNG TÁM KHỔNG LỒ ================= -->
      <g transform="translate(540, 180)">
        <!-- Đĩa Trăng Rằm Tròn Vành Vạnh -->
        <circle cx="0" cy="0" r="115" fill="url(#harvestMoonGrad)"/>
        
        <!-- Vết mờ bề mặt mặt trăng tự nhiên (Moon Sea / Maria) -->
        <ellipse cx="-30" cy="-20" rx="35" ry="25" fill="#ca8a04" opacity="0.12" filter="url(#cloudSoft)"/>
        <ellipse cx="25" cy="35" rx="40" ry="20" fill="#ca8a04" opacity="0.10" filter="url(#cloudSoft)"/>
        <circle cx="-10" cy="40" r="25" fill="#ca8a04" opacity="0.08" filter="url(#cloudSoft)"/>

        <!-- 🌳 BÓNG CHÚ CUỘI & CÂY ĐA CUNG TRĂNG (MYTHICAL SILHOUETTE) -->
        <g fill="#713f12" opacity="0.45" transform="translate(10, 10)">
          <!-- Thân Cây Đa cổ thụ -->
          <path d="M -15,75 Q -5,10 -25,-35 Q 5,-45 25,-25 Q 45,-5 25,75 Z"/>
          <!-- Tán lá Cây Đa bồng bềnh -->
          <circle cx="-35" cy="-45" r="28"/>
          <circle cx="5" cy="-55" r="32"/>
          <circle cx="45" cy="-35" r="26"/>
          <circle cx="15" cy="-25" r="22"/>
          <!-- Rễ cây đa buông rủ -->
          <line x1="-28" y1="-25" x2="-28" y2="60" stroke="#713f12" stroke-width="2"/>
          <line x1="32" y1="-15" x2="32" y2="65" stroke="#713f12" stroke-width="2"/>
          <!-- Bóng Chú Cuội ngồi thổi sáo dưới gốc đa -->
          <circle cx="-32" cy="45" r="7"/>
          <path d="M -32,52 L -32,70 L -22,70 L -22,60 Z"/>
          <line x1="-32" y1="52" x2="-44" y2="48" stroke="#713f12" stroke-width="2.5"/> <!-- Cây Sáo -->
          <!-- Thỏ Ngọc Cung Trăng (Jade Rabbit) -->
          <ellipse cx="28" cy="65" rx="8" ry="6"/>
          <circle cx="34" cy="58" r="5"/>
          <ellipse cx="36" cy="50" rx="2" ry="5" transform="rotate(15 36 50)"/>
        </g>
      </g>

      <!-- ================= 3. NHỮNG DẢI MÂY THU TRÔI BỒNG BỀNH ================= -->
      <!-- Dải mây 1 -->
      <g fill="#334155" opacity="0.35" filter="url(#cloudSoft)" transform="translate(${cloudX1}, 120)">
        <path d="M 0,0 Q 60,-30 140,0 Q 220,-20 300,0 Q 220,30 140,20 Q 60,30 0,0 Z"/>
      </g>
      <!-- Dải mây 2 -->
      <g fill="#475569" opacity="0.28" filter="url(#cloudSoft)" transform="translate(${cloudX2}, 230)">
        <path d="M 0,0 Q 80,-25 180,0 Q 280,-15 380,0 Q 280,25 180,15 Q 80,25 0,0 Z"/>
      </g>

      <!-- ================= 4. MẶT HỒ SEN SOI BÓNG TRĂNG & ĐÈN HOA ĐĂNG ================= -->
      <!-- Mặt nước hồ đêm -->
      <rect x="0" y="360" width="${WIDTH}" height="160" fill="url(#lakeWater)"/>
      <line x1="0" y1="360" x2="${WIDTH}" y2="360" stroke="#1e293b" stroke-width="1.5"/>

      <!-- Bóng Trăng Rằm lung linh trên mặt hồ gợn sóng -->
      <ellipse cx="540" cy="410" rx="95" ry="18" fill="#fef08a" opacity="0.35" filter="url(#cloudSoft)"/>
      <ellipse cx="540" cy="445" rx="75" ry="12" fill="#fde047" opacity="0.25" filter="url(#cloudSoft)"/>
      <ellipse cx="540" cy="475" rx="55" ry="8" fill="#eab308" opacity="0.18" filter="url(#cloudSoft)"/>

      <!-- 🪷 BỤI HOA SEN ĐÊM ĐANG NỞ (BLOOMING LOTUS FLOWERS) -->
      <!-- Bụi sen bên trái -->
      <g transform="translate(80, 420)">
        <!-- Lá sen xanh biếc -->
        <ellipse cx="0" cy="15" rx="45" ry="12" fill="#065f46" stroke="#047857" stroke-width="1"/>
        <ellipse cx="60" cy="20" rx="38" ry="10" fill="#047857" opacity="0.9"/>
        <!-- Hoa sen hồng nở ngát hương -->
        <g transform="translate(15, -10)">
          <!-- Cánh sen ngoài -->
          <path d="M 0,10 C -20,-10 -15,-30 0,-40 C 15,-30 20,-10 0,10 Z" fill="#f472b6" opacity="0.9"/>
          <path d="M -10,8 C -30,-5 -25,-25 -10,-35 C 0,-25 5,-5 -10,8 Z" fill="#ec4899" opacity="0.85"/>
          <path d="M 10,8 C 0,-5 -5,-25 10,-35 C 25,-25 30,-5 10,8 Z" fill="#ec4899" opacity="0.85"/>
          <!-- Nhụy sen vàng rực -->
          <ellipse cx="0" cy="-12" rx="6" ry="4" fill="#fef08a"/>
        </g>
      </g>

      <!-- 🕯️ ĐÈN HOA ĐĂNG TRÔI TRÊN MẶT NƯỚC (FLOATING CANDLES) -->
      <!-- Hoa đăng 1 -->
      <g transform="translate(320, ${395 + candleBob})">
        <ellipse cx="0" cy="10" rx="22" ry="6" fill="#f43f5e"/>
        <!-- Cánh hoa đăng ngũ sắc -->
        <polygon points="-16,8 -12,-2 -4,6" fill="#fb7185"/>
        <polygon points="16,8 12,-2 4,6" fill="#fb7185"/>
        <polygon points="-8,8 0,-6 8,8" fill="#f43f5e"/>
        <!-- Ngọn nến lung linh -->
        <rect x="-2" y="-4" width="4" height="8" fill="#fef08a"/>
        <ellipse cx="0" cy="-8" rx="3" ry="6" fill="#ffffff" filter="url(#glowFf)"/>
        <ellipse cx="0" cy="-8" rx="5" ry="9" fill="#f59e0b" opacity="0.6"/>
      </g>

      <!-- Hoa đăng 2 -->
      <g transform="translate(680, ${415 - candleBob})">
        <ellipse cx="0" cy="8" rx="18" ry="5" fill="#e11d48"/>
        <polygon points="-12,6 0,-4 12,6" fill="#f43f5e"/>
        <ellipse cx="0" cy="-6" rx="2.5" ry="5" fill="#ffffff" filter="url(#glowFf)"/>
      </g>

      <!-- ================= 5. LỒNG ĐÈN ÔNG SAO & ĐÈN KÉO QUÂN ĐUNG ĐƯA ================= -->
      <!-- Cành tre uốn cong từ góc trái trên xuống -->
      <path d="M -10,0 Q 80,40 180,90 Q 240,120 280,180" fill="none" stroke="#166534" stroke-width="4" stroke-linecap="round"/>
      <!-- Lá tre thanh mảnh -->
      <g fill="#15803d" opacity="0.9">
        <path d="M 90,45 Q 120,50 140,40 Q 115,60 90,45 Z"/>
        <path d="M 140,65 Q 170,75 190,65 Q 165,85 140,65 Z"/>
        <path d="M 200,95 Q 230,110 250,100 Q 225,120 200,95 Z"/>
      </g>

      <!-- ⭐ LỒNG ĐÈN NGÔI SAO TRUYỀN THỐNG 5 CÁNH ĐUNG ĐƯA (STAR LANTERN) -->
      <g transform="translate(180, 90) rotate(${lanternSway} 0 0)">
        <!-- Dây treo lồng đèn -->
        <line x1="0" y1="0" x2="0" y2="70" stroke="#ca8a04" stroke-width="1.5"/>

        <!-- Khung Ngôi Sao Đỏ Vàng 5 Cánh Phát Sáng -->
        <g transform="translate(0, 115)" filter="url(#lanternGlow)">
          <!-- Vòng tre tròn bao quanh ngôi sao -->
          <circle cx="0" cy="0" r="42" fill="none" stroke="url(#lanternGold)" stroke-width="3"/>
          <circle cx="0" cy="0" r="42" fill="#ef4444" opacity="0.25"/>

          <!-- 5 Cánh Sao Giấy Kiếng Đỏ Lấp Lánh -->
          <!-- Cánh 1 đỉnh -->
          <polygon points="0,0 0,-40 10,-12" fill="#ef4444"/>
          <polygon points="0,0 0,-40 -10,-12" fill="#dc2626"/>
          <!-- Cánh 2 phải trên -->
          <polygon points="0,0 38,-12 12,5" fill="#ef4444"/>
          <polygon points="0,0 38,-12 10,-12" fill="#dc2626"/>
          <!-- Cánh 3 phải dưới -->
          <polygon points="0,0 24,32 0,14" fill="#ef4444"/>
          <polygon points="0,0 24,32 12,5" fill="#dc2626"/>
          <!-- Cánh 4 trái dưới -->
          <polygon points="0,0 -24,32 -12,5" fill="#ef4444"/>
          <polygon points="0,0 -24,32 0,14" fill="#dc2626"/>
          <!-- Cánh 5 trái trên -->
          <polygon points="0,0 -38,-12 -10,-12" fill="#ef4444"/>
          <polygon points="0,0 -38,-12 -12,5" fill="#dc2626"/>

          <!-- Tâm nến lồng đèn phát sáng rực -->
          <circle cx="0" cy="0" r="10" fill="#fef08a" filter="url(#glowFf)"/>
          <circle cx="0" cy="0" r="5" fill="#ffffff"/>

          <!-- Dây tua rua đỏ đuôi đèn -->
          <line x1="0" y1="42" x2="0" y2="75" stroke="#ef4444" stroke-width="3"/>
          <circle cx="0" cy="75" r="3" fill="#facc15"/>
        </g>
      </g>

      <!-- 🐟 LỒNG ĐÈN CÁ CHÉP TRÔNG TRĂNG (CARP LANTERN) BÊN PHẢI TRÊN -->
      <g transform="translate(320, 40) rotate(${-lanternSway * 0.8} 0 0)">
        <line x1="0" y1="0" x2="0" y2="50" stroke="#ca8a04" stroke-width="1.2"/>
        <g transform="translate(0, 75)" filter="url(#lanternGlow)">
          <!-- Thân cá chép uốn lượn màu cam đỏ -->
          <ellipse cx="0" cy="0" rx="26" ry="14" fill="url(#lanternRed)"/>
          <!-- Đuôi cá chép xòe rộng -->
          <polygon points="22,0 38,-12 34,0 38,12" fill="#f97316"/>
          <!-- Vây cá chép -->
          <polygon points="-5,-12 8,-18 5,-8" fill="#facc15"/>
          <polygon points="-5,12 8,18 5,8" fill="#facc15"/>
          <!-- Mắt cá chép tròn phát sáng -->
          <circle cx="-16" cy="-3" r="4" fill="#ffffff"/>
          <circle cx="-16" cy="-3" r="2" fill="#000000"/>
          <!-- Vảy cá vàng kim -->
          <path d="M -8,-6 Q -2,-6 -2,0 Q -8,0 -8,-6" fill="none" stroke="#fde047" stroke-width="1.2"/>
          <path d="M 2,-6 Q 8,-6 8,0 Q 2,0 2,-6" fill="none" stroke="#fde047" stroke-width="1.2"/>
        </g>
      </g>

      <!-- Đom đóm lập lòe -->
      ${fireflies.join('\n')}

      <!-- ================= 6. KHUNG BANNER THƯ PHÁP VÀNG HOÀNG KIM ================= -->
      <g transform="translate(400, 480)" filter="url(#lanternGlow)">
        <!-- Nền dải lụa nhung đỏ viền vàng hoàng gia -->
        <rect x="-310" y="-24" width="620" height="46" rx="12" 
              fill="#450a0a" stroke="url(#goldCalligraphy)" stroke-width="2.2" opacity="0.95"/>
        <rect x="-304" y="-18" width="608" height="34" rx="8" 
              fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.4"/>

        <!-- Tiêu đề chính dập nổi thư pháp -->
        <text x="0" y="-3" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Plus Jakarta Sans', 'Segoe UI', 'Times New Roman', serif" 
              font-size="17" font-weight="900" 
              letter-spacing="4"
              fill="url(#goldCalligraphy)">
          🥮 TẾT TRUNG THU • RẰM THÁNG TÁM ĐOÀN VIÊN 🥮
        </text>

        <!-- Phụ đề thanh lịch -->
        <text x="0" y="13" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="9.5" font-weight="800" 
              letter-spacing="3"
              fill="#fef08a">
          ★ TRĂNG SÁNG TRỜI NAM • VẠN NHÀ AN KHANG THỊNH VƯỢNG ★
        </text>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🥮 Rendering Mid-Autumn Festival Masterpiece (Rằm Tháng Tám Đêm Trăng)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderTrungThuArtFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 88, alphaQuality: 92, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/trung_thu_harvest_moon_art.webp'),
    path.join(__dirname, '../pictures/trung_thu_harvest_moon_art.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Mid-Autumn Festival Art rendered successfully:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
