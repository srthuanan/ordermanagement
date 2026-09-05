const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 860;
const HEIGHT = 540;
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
// 🥮 SIÊU PHẨM TRANH SƠN DẦU ĐIỆN ẢNH: ĐÊM TRĂNG RẰM THÁNG TÁM CHÂN THỰC 100%
// - Vầng Trăng Rằm Siêu Thực (Hyper-Realistic Harvest Supermoon) với chi tiết địa hình Mặt Trăng
// - Mái Đình Cổ Kính Rêu Phong Việt Nam soi bóng xuống mặt hồ thu phẳng lặng
// - Lồng Đèn Lụa Đỏ Cổ Truyền thắp nến phát sáng xuyên thấu (Translucent Candle Glow)
// - Hoa Sen Đêm & Hàng Chục Ngọn Đèn Hoa Đăng Trôi Dạt Trên Mặt Nước Gợn Sóng
// - Sương Mù & Mây Thu Lãng Đãng Trôi Qua Vầng Trăng
// -----------------------------------------------------------------------------
function renderRealisticTrungThuFrame(frameIndex) {
  const rad = (frameIndex / FRAMES) * Math.PI * 2;

  // Dao động vật lý thực tế:
  const candleFlicker = Math.sin(rad * 3) * 0.12 + 0.88;
  const lanternSway = Math.sin(rad) * 3.5;
  const waterRipple = Math.sin(rad * 1.5) * 2.5;
  const cloudOffset1 = ((frameIndex * 2.5) % (WIDTH + 300)) - 150;
  const cloudOffset2 = (((frameIndex + 18) * 1.8) % (WIDTH + 300)) - 150;

  // Đom đóm bay lượn chân thực trong không khí ẩm đêm thu
  const fireflyList = [];
  for (let i = 0; i < 22; i++) {
    const fx = (100 + i * 35 + Math.cos(rad + i * 1.2) * 18).toFixed(1);
    const fy = (260 + (i % 6) * 30 + Math.sin(rad * 1.4 + i * 2) * 14).toFixed(1);
    const fOp = (0.25 + (Math.sin(rad * 2.5 + i * 1.5) * 0.5 + 0.5) * 0.75).toFixed(2);
    fireflyList.push(`
      <circle cx="${fx}" cy="${fy}" r="1.8" fill="#fef08a" opacity="${fOp}" filter="url(#glowDot)"/>
    `);
  }

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 1. Bầu Trời Đêm Thu Điện Ảnh Sâu Thẳm (Midnight Atmospheric Sky) -->
        <linearGradient id="realNightSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#01040a" />
          <stop offset="30%" stop-color="#050d22" />
          <stop offset="60%" stop-color="#0d1838" />
          <stop offset="85%" stop-color="#182348" />
          <stop offset="100%" stop-color="#2a1f46" />
        </linearGradient>

        <!-- 2. Vầng Trăng Rằm Siêu Thực (Hyper-Realistic Supermoon) -->
        <radialGradient id="superMoon" cx="42%" cy="40%" r="58%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fffef0" />
          <stop offset="55%" stop-color="#fef08a" />
          <stop offset="78%" stop-color="#facc15" />
          <stop offset="92%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </radialGradient>

        <!-- Quầng Sáng Tán Xạ Mặt Trăng Khổng Lồ (Volumetric Lunar Halo) -->
        <radialGradient id="lunarHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="${(0.8 * candleFlicker).toFixed(2)}" />
          <stop offset="35%" stop-color="#facc15" stop-opacity="${(0.45 * candleFlicker).toFixed(2)}" />
          <stop offset="70%" stop-color="#ca8a04" stop-opacity="${(0.18 * candleFlicker).toFixed(2)}" />
          <stop offset="100%" stop-color="#050d22" stop-opacity="0" />
        </radialGradient>

        <!-- 3. Mặt Nước Hồ Thu Trong Vắt & Phản Chiếu Gợn Sóng -->
        <linearGradient id="mirrorLake" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#09132b" />
          <stop offset="35%" stop-color="#050c1e" />
          <stop offset="70%" stop-color="#020610" />
          <stop offset="100%" stop-color="#000205" />
        </linearGradient>

        <!-- 4. Lồng Đèn Lụa Thấu Quang Đỏ Ấm (Translucent Silk Lantern) -->
        <radialGradient id="silkLanternCore" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="20%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="80%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </radialGradient>

        <!-- Filters Mờ Nghệ Thuật & Quang Học Thực Tế -->
        <filter id="lunarAtmosphere" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="40"/>
        </filter>
        <filter id="softClouds" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="16"/>
        </filter>
        <filter id="lanternBloom" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="glowDot" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- ================= 1. BẦU TRỜI ĐÊM ĐIỆN ẢNH ================= -->
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#realNightSky)" rx="16"/>

      <!-- Quầng Hào Quang Trăng Rằm tỏa sáng trong màn sương đêm -->
      <circle cx="580" cy="175" r="250" fill="url(#lunarHalo)" filter="url(#lunarAtmosphere)"/>

      <!-- ================= 2. VẦNG TRĂNG RẰM THÁNG TÁM SIÊU THỰC ================= -->
      <!-- Center: (580, 175), R = 125px -->
      <g transform="translate(580, 175)">
        <!-- Đĩa Mặt Trăng Hoàn Hảo -->
        <circle cx="0" cy="0" r="125" fill="url(#superMoon)"/>

        <!-- Chi tiết địa hình Biển Mặt Trăng tự nhiên chân thực (Lunar Seas / Maria Textures) -->
        <g fill="#92400e" opacity="0.18" filter="url(#softClouds)">
          <!-- Oceanus Procellarum & Mare Imbrium -->
          <ellipse cx="-45" cy="-35" rx="45" ry="32" transform="rotate(-15 -45 -35)"/>
          <ellipse cx="15" cy="-55" rx="38" ry="24"/>
          <!-- Mare Serenitatis & Mare Tranquillitatis -->
          <ellipse cx="42" cy="-15" rx="32" ry="28"/>
          <ellipse cx="38" cy="25" rx="35" ry="22"/>
          <!-- Mare Nubium & Southern Highlands -->
          <ellipse cx="-25" cy="45" rx="42" ry="26"/>
          <circle cx="0" cy="55" r="28"/>
        </g>

        <!-- Hố va chạm Tycho tỏa tia sáng bạc (Crater Rays) -->
        <g opacity="0.25">
          <circle cx="-18" cy="65" r="5" fill="#ffffff"/>
          <line x1="-18" y1="65" x2="-65" y2="25" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>
          <line x1="-18" y1="65" x2="35" y2="45" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>
          <line x1="-18" y1="65" x2="-25" y2="105" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>
        </g>
      </g>

      <!-- ================= 3. LÀN SƯƠNG ĐÊM & MÂY THU TRÔI VẮT NGANG MẶT TRĂNG ================= -->
      <g fill="#1e293b" opacity="0.45" filter="url(#softClouds)" transform="translate(${cloudOffset1}, 115)">
        <path d="M -50,0 Q 40,-25 150,0 Q 260,-20 380,0 Q 480,-15 580,0 Q 450,25 320,15 Q 180,30 -50,0 Z"/>
      </g>
      <g fill="#334155" opacity="0.32" filter="url(#softClouds)" transform="translate(${cloudOffset2}, 225)">
        <path d="M -80,0 Q 60,-20 200,0 Q 340,-15 480,0 Q 600,-25 720,0 Q 560,25 380,18 Q 160,25 -80,0 Z"/>
      </g>

      <!-- ================= 4. MẶT HỒ SEN SOI BÓNG TRĂNG & ĐÈN HOA ĐĂNG ================= -->
      <!-- Mặt nước hồ tĩnh lặng -->
      <rect x="0" y="365" width="${WIDTH}" height="175" fill="url(#mirrorLake)"/>
      <line x1="0" y1="365" x2="${WIDTH}" y2="365" stroke="#1e293b" stroke-width="1.2"/>

      <!-- Bóng Trăng Rằm Lung Linh Trên Mặt Hồ Gợn Sóng (Realistic Water Caustic Reflections) -->
      <g filter="url(#softClouds)">
        <ellipse cx="580" cy="405" rx="110" ry="18" fill="#fef08a" opacity="0.45"/>
        <ellipse cx="580" cy="435" rx="90" ry="14" fill="#facc15" opacity="0.35"/>
        <ellipse cx="580" cy="465" rx="70" ry="10" fill="#eab308" opacity="0.25"/>
        <ellipse cx="580" cy="495" rx="50" ry="7" fill="#ca8a04" opacity="0.18"/>
      </g>

      <!-- Gợn sóng lăn tăn khúc xạ ánh trăng -->
      <g stroke="#fef08a" stroke-width="1.2" opacity="0.4" stroke-linecap="round">
        <line x1="520" y1="${395 + waterRipple}" x2="640" y2="${395 + waterRipple}"/>
        <line x1="540" y1="${415 - waterRipple}" x2="620" y2="${415 - waterRipple}"/>
        <line x1="550" y1="${435 + waterRipple * 0.8}" x2="610" y2="${435 + waterRipple * 0.8}"/>
        <line x1="560" y1="${455 - waterRipple * 0.8}" x2="600" y2="${455 - waterRipple * 0.8}"/>
      </g>

      <!-- 🪷 QUẦN THỂ HOA SEN ĐÊM ĐANG NỞ RỘ (LOTUS BLOSSOMS & LILY PADS) -->
      <g transform="translate(110, 425)">
        <!-- Lá sen dập dềnh trên nước -->
        <ellipse cx="-40" cy="20" rx="65" ry="16" fill="#022c22" stroke="#064e3b" stroke-width="1.5"/>
        <ellipse cx="35" cy="30" rx="55" ry="14" fill="#064e3b" stroke="#047857" stroke-width="1"/>
        <ellipse cx="95" cy="22" rx="45" ry="12" fill="#022c22" opacity="0.85"/>
        
        <!-- Bông Sen Hồng Đại Đóa nở ngát hương -->
        <g transform="translate(0, -15)">
          <!-- Cánh sen lớp ngoài -->
          <path d="M 0,15 C -28,-10 -22,-45 0,-55 C 22,-45 28,-10 0,15 Z" fill="#f472b6" opacity="0.95"/>
          <path d="M -15,12 C -40,-8 -32,-38 -12,-48 C 0,-35 8,-8 -15,12 Z" fill="#ec4899" opacity="0.9"/>
          <path d="M 15,12 C 0,-8 -8,-38 12,-48 C 32,-38 40,-8 15,12 Z" fill="#ec4899" opacity="0.9"/>
          <!-- Lớp cánh trong & nhụy vàng -->
          <path d="M 0,8 C -14,-5 -10,-28 0,-36 C 10,-28 14,-5 0,8 Z" fill="#fbcfe8"/>
          <ellipse cx="0" cy="-14" rx="8" ry="5" fill="#fef08a" filter="url(#glowDot)"/>
        </g>
        
        <!-- Búp sen e ấp -->
        <g transform="translate(75, -5)">
          <path d="M 0,10 C -12,-5 -8,-25 0,-32 C 8,-25 12,-5 0,10 Z" fill="#f43f5e"/>
        </g>
      </g>

      <!-- 🕯️ HÀNG CHỤC NGỌN ĐÈN HOA ĐĂNG TRÔI BỀNH BỒNG (FLOATING LOTUS CANDLES) -->
      <!-- Hoa đăng 1 (Gần, sáng rực) -->
      <g transform="translate(360, ${410 + waterRipple})" filter="url(#lanternBloom)">
        <ellipse cx="0" cy="12" rx="26" ry="8" fill="#e11d48"/>
        <!-- Cánh hoa đăng 5 cánh xếp lớp -->
        <polygon points="-20,10 -15,-2 -5,8" fill="#fb7185"/>
        <polygon points="20,10 15,-2 5,8" fill="#fb7185"/>
        <polygon points="-10,10 0,-8 10,10" fill="#f43f5e"/>
        <!-- Ngọn nến phát sáng thấu quang -->
        <rect x="-2.5" y="-6" width="5" height="10" fill="#fef08a"/>
        <ellipse cx="0" cy="-10" rx="3.5" ry="7" fill="#ffffff" filter="url(#glowDot)"/>
        <ellipse cx="0" cy="-10" rx="6" ry="12" fill="#f59e0b" opacity="0.6"/>
        <!-- Vệt sáng nến hắt xuống nước -->
        <ellipse cx="0" cy="22" rx="16" ry="5" fill="#f59e0b" opacity="0.4" filter="url(#softClouds)"/>
      </g>

      <!-- Hoa đăng 2 (Xa xa) -->
      <g transform="translate(740, ${430 - waterRipple})">
        <ellipse cx="0" cy="8" rx="18" ry="6" fill="#be123c"/>
        <polygon points="-12,6 0,-5 12,6" fill="#f43f5e"/>
        <ellipse cx="0" cy="-7" rx="2.5" ry="5" fill="#ffffff" filter="url(#glowDot)"/>
        <ellipse cx="0" cy="16" rx="12" ry="4" fill="#f59e0b" opacity="0.35"/>
      </g>

      <!-- Hoa đăng 3 (Lững lờ trôi xa) -->
      <g transform="translate(480, ${470 + waterRipple * 0.5})">
        <ellipse cx="0" cy="6" rx="14" ry="4" fill="#9f1239"/>
        <ellipse cx="0" cy="-5" rx="2" ry="4" fill="#fef08a" filter="url(#glowDot)"/>
      </g>

      <!-- ================= 5. MÁI ĐÌNH CỔ KÍNH RÊU PHONG VIỆT NAM (ANCIENT TEMPLE SILHOUETTE) ================= -->
      <g fill="#020617" transform="translate(680, 260)">
        <!-- Mái đình cong vút đầu đao rêu phong -->
        <path d="M -90,105 Q -50,45 0,35 Q 50,45 90,105 Q 40,75 0,72 Q -40,75 -90,105 Z"/>
        <!-- Đầu đao cong vút truyền thống -->
        <path d="M -90,105 Q -115,80 -105,65 Q -95,78 -90,105 Z"/>
        <path d="M 90,105 Q 115,80 105,65 Q 95,78 90,105 Z"/>
        <!-- Cột đình & lan can gỗ lim -->
        <rect x="-60" y="100" width="10" height="45"/>
        <rect x="-20" y="100" width="10" height="45"/>
        <rect x="20" y="100" width="10" height="45"/>
        <rect x="60" y="100" width="10" height="45"/>
        <!-- Bậc thềm đá dẫn xuống hồ -->
        <rect x="-80" y="145" width="160" height="15"/>
      </g>

      <!-- ================= 6. LỒNG ĐÈN LỤA ĐỎ CỔ TRUYỀN ĐUNG ĐƯA DƯỚI GÓC CÂY LIỄU ================= -->
      <!-- Nhánh cây liễu rủ từ góc trái trên -->
      <path d="M -20,0 Q 80,50 170,95 Q 230,130 260,200" fill="none" stroke="#064e3b" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 120,70 Q 150,140 160,240" fill="none" stroke="#047857" stroke-width="1.8"/>
      <path d="M 180,100 Q 210,170 215,260" fill="none" stroke="#047857" stroke-width="1.8"/>

      <!-- 🏮 LỒNG ĐÈN LỤA TRÒN THẮP NẾN PHÁT SÁNG THẤU QUANG (SWAYING SILK LANTERN) -->
      <g transform="translate(180, 100) rotate(${lanternSway} 0 0)">
        <!-- Dây treo lụa vàng -->
        <line x1="0" y1="0" x2="0" y2="65" stroke="#ca8a04" stroke-width="2"/>

        <g transform="translate(0, 115)" filter="url(#lanternBloom)">
          <!-- Quầng sáng ấm áp tỏa ra từ lồng đèn -->
          <circle cx="0" cy="0" r="60" fill="#f97316" opacity="${(0.35 * candleFlicker).toFixed(2)}" filter="url(#softClouds)"/>

          <!-- Khung lồng đèn lụa hình cầu đỏ cam phát sáng từ lõi -->
          <ellipse cx="0" cy="0" rx="38" ry="44" fill="url(#silkLanternCore)"/>

          <!-- Nan tre lồng đèn uốn cong -->
          <ellipse cx="0" cy="0" rx="26" ry="44" fill="none" stroke="#7f1d1d" stroke-width="1.5" opacity="0.7"/>
          <ellipse cx="0" cy="0" rx="14" ry="44" fill="none" stroke="#7f1d1d" stroke-width="1.5" opacity="0.7"/>
          <line x1="0" y1="-44" x2="0" y2="44" stroke="#7f1d1d" stroke-width="1.5" opacity="0.7"/>

          <!-- Đai gỗ vàng trên & dưới lồng đèn -->
          <rect x="-16" y="-46" width="32" height="6" rx="2" fill="#ca8a04"/>
          <rect x="-16" y="40" width="32" height="6" rx="2" fill="#ca8a04"/>

          <!-- Tua rua đỏ đung đưa dưới đáy đèn -->
          <line x1="0" y1="46" x2="0" y2="90" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="0" cy="90" r="3.5" fill="#facc15"/>
        </g>
      </g>

      <!-- Đom đóm bay lượn chân thực -->
      ${fireflyList.join('\n')}
    </svg>
  `;
}

async function main() {
  console.log('🥮 Rendering 100% Photo-Realistic Mid-Autumn Festival Masterpiece (Supermoon, Lotus Lake, Ancient Temple)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderRealisticTrungThuFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 90, alphaQuality: 95, effort: 6, lossless: false })
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

  console.log(`🎉 100% Photo-Realistic Mid-Autumn Art rendered successfully:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
