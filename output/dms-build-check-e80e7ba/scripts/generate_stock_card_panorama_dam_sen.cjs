const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn Panorama Full HD: 1920 x 1080 px (16:9)
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

// Vẽ một chú cá chép vàng bơi lội uốn lượn
function renderKoi(cx, cy, rotation, tailSway, scale = 1.0, opacity = 0.85) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <!-- Vây cá hai bên xòe nhẹ -->
      <path d="M -8,-6 C -18,-16 -24,-10 -20,-3 C -16,1 -10,0 -8,-2 Z" fill="#F59E0B" opacity="0.75"/>
      <path d="M -8,6 C -18,16 -24,10 -20,3 C -16,-1 -10,0 -8,2 Z" fill="#F59E0B" opacity="0.75"/>
      <!-- Thân cá chép vàng hoàng kim mềm mại -->
      <path d="M -22,0 C -12,-11 15,-9 28,0 C 15,9 -12,11 -22,0 Z" fill="url(#koiGrad)"/>
      <!-- Lưng cá ánh cam đỏ nổi bật -->
      <path d="M -15,0 C -5,-5 12,-4 20,0 C 12,4 -5,5 -15,0 Z" fill="#DC2626" opacity="0.45"/>
      <!-- Đuôi cá chép uốn lượn mượt mà theo sóng nước -->
      <g transform="translate(26, 0)">
        <path d="M 0,0 C 12,${(tailSway * 0.7).toFixed(1)} 22,${(tailSway * 1.5).toFixed(1)} 35,${(tailSway * 1.8).toFixed(1)} C 22,${(tailSway * 0.5 + 4).toFixed(1)} 10,2 0,0 Z" fill="url(#koiTailGrad)"/>
        <path d="M 0,0 C 12,${(tailSway * 0.7).toFixed(1)} 22,${(tailSway * 1.5).toFixed(1)} 35,${(tailSway * 1.8 - 4).toFixed(1)} C 22,${(tailSway * 0.5 - 4).toFixed(1)} 10,-2 0,0 Z" fill="url(#koiTailGrad)" opacity="0.8"/>
      </g>
      <!-- Mắt cá đen láy tinh anh -->
      <circle cx="-16" cy="-4" r="1.5" fill="#0F172A"/>
      <circle cx="-16.4" cy="-4.4" r="0.5" fill="#FFFFFF"/>
      <circle cx="-16" cy="4" r="1.5" fill="#0F172A"/>
      <circle cx="-16.4" cy="3.6" r="0.5" fill="#FFFFFF"/>
    </g>
  `;
}

// Vẽ đóa hoa sen hồng ngọc nở rộ
function renderBloomingLotus(cx, cy, bobbingY, scale = 1.0, opacity = 0.92) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${(cy + bobbingY).toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <!-- Quầng sáng phản chiếu dưới nước -->
      <ellipse cx="0" cy="18" rx="42" ry="12" fill="url(#lotusGlow)" opacity="0.6"/>
      <!-- Lá đài xanh ngọc nâng đóa sen -->
      <path d="M -30,10 C -22,18 -8,22 0,22 C 8,22 22,18 30,10 C 18,12 0,14 -30,10 Z" fill="#059669" opacity="0.75"/>
      <!-- Cánh sen lớp ngoài xòe rộng -->
      <path d="M -38,6 C -28,-10 -12,-18 -2,-22 C -6,-4 -22,2 -38,6 Z" fill="url(#petalGrad)"/>
      <path d="M 38,6 C 28,-10 12,-18 2,-22 C 6,-4 22,2 38,6 Z" fill="url(#petalGrad)"/>
      <path d="M -26,12 C -20,-4 -8,-16 0,-24 C -2,-6 -14,4 -26,12 Z" fill="url(#petalGrad)"/>
      <path d="M 26,12 C 20,-4 8,-16 0,-24 C 2,-6 14,4 26,12 Z" fill="url(#petalGrad)"/>
      <!-- Cánh sen lớp trong vươn cao -->
      <path d="M -16,14 C -12,0 -4,-18 0,-28 C 4,-18 12,0 16,14 C 8,16 -8,16 -16,14 Z" fill="url(#petalGrad)"/>
      <path d="M -10,12 C -8,-2 0,-18 0,-26 C 0,-18 8,-2 10,12 Z" fill="url(#petalInnerGrad)"/>
      <!-- Nhụy sen vàng hoàng kim tỏa ngát hương -->
      <ellipse cx="0" cy="2" rx="7" ry="5" fill="#FBBF24"/>
      <circle cx="0" cy="-2" r="3" fill="#FDE047"/>
    </g>
  `;
}

// Vẽ lá sen tròn bồng bềnh
function renderLotusLeaf(cx, cy, bobbingY, scale = 1.0, opacity = 0.8) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${(cy + bobbingY).toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <!-- Bóng mờ lá sen dưới mặt nước -->
      <ellipse cx="2" cy="6" rx="46" ry="24" fill="#047857" opacity="0.2"/>
      <!-- Tấm lá sen ngọc bích xòe tròn có rãnh khuyết -->
      <path d="M 0,0 L -12,22 C -35,20 -48,2 -45,-12 C -42,-26 -22,-30 0,-30 C 22,-30 44,-24 46,-10 C 48,6 34,22 12,22 Z" fill="url(#leafGrad)"/>
      <!-- Gân lá sen tỏa tròn tinh tế -->
      <path d="M 0,-4 L -28,-18 M 0,-4 L -34,-4 M 0,-4 L -25,12 M 0,-4 L 28,-18 M 0,-4 L 34,-4 M 0,-4 L 25,12 M 0,-4 L 0,-26" stroke="#A7F3D0" stroke-width="0.8" opacity="0.6"/>
      <!-- Giọt sương mai đọng trên lá sen -->
      <circle cx="-8" cy="-10" r="2.2" fill="#FFFFFF" opacity="0.85"/>
      <circle cx="-7.5" cy="-10.5" r="0.8" fill="#FFFFFF"/>
    </g>
  `;
}

function renderFrameSvg(f) {
  const t = f / TOTAL_FRAMES;
  const phase = t * Math.PI * 2;

  // 1. Quầng sáng vầng trăng rằm nhịp thở dịu dàng
  const moonGlowR = 320 + 25 * Math.sin(phase);
  const moonGlowOpacity = 0.45 + 0.12 * Math.sin(phase);

  // 2. Mây ngũ sắc trôi lững lờ
  const cloudShiftX = Math.sin(phase) * 16;
  const cloudShiftY = Math.cos(phase) * 4;

  // 3. Đàn cá chép uốn lượn bơi lội
  const koiTail1 = Math.sin(phase) * 9;
  const koiTail2 = Math.sin(phase + 1.8) * 8.5;
  const koiTail3 = Math.sin(phase + 3.4) * 9.2;
  const koiTail4 = Math.sin(phase + 4.8) * 7.8;

  const koiX1 = 380 + Math.sin(phase) * 12;
  const koiY1 = 860 + Math.cos(phase) * 6;
  const koiRot1 = -22 + Math.cos(phase) * 5;

  const koiX2 = 720 + Math.sin(phase + 1.5) * 10;
  const koiY2 = 910 + Math.cos(phase + 1.5) * 5;
  const koiRot2 = 18 + Math.cos(phase + 1.5) * 6;

  const koiX3 = 1180 + Math.sin(phase + 3.0) * 14;
  const koiY3 = 875 + Math.cos(phase + 3.0) * 7;
  const koiRot3 = -15 + Math.cos(phase + 3.0) * 5;

  const koiX4 = 1520 + Math.sin(phase + 4.2) * 12;
  const koiY4 = 920 + Math.cos(phase + 4.2) * 6;
  const koiRot4 = 25 + Math.cos(phase + 4.2) * 6;

  // 4. Hoa sen & lá sen bập bềnh nhấp nhô theo sóng
  const bob1 = Math.sin(phase) * 4.5;
  const bob2 = Math.sin(phase + 1.4) * 4.0;
  const bob3 = Math.sin(phase + 2.8) * 5.0;
  const bob4 = Math.sin(phase + 4.2) * 4.2;
  const bob5 = Math.sin(phase + 5.2) * 4.6;

  // 5. Cánh sen rơi bay lơ lửng trong gió
  const petalDriftX1 = Math.sin(phase) * 20;
  const petalDriftY1 = (t * 80) % 80;
  const petalRot1 = phase * (180 / Math.PI) * 0.5;

  // 6. Đom đóm vàng chớp sáng lung linh
  const firefly1 = 0.2 + 0.6 * Math.abs(Math.sin(phase));
  const firefly2 = 0.2 + 0.6 * Math.abs(Math.sin(phase + 1.6));
  const firefly3 = 0.2 + 0.6 * Math.abs(Math.sin(phase + 3.2));
  const firefly4 = 0.2 + 0.6 * Math.abs(Math.sin(phase + 4.8));

  return `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient: Trắng sứ ngọc trai sương mai -->
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FCFDFF"/>
      <stop offset="40%" stop-color="#F8FAFD"/>
      <stop offset="75%" stop-color="#FFFDF7"/>
      <stop offset="100%" stop-color="#F3F7FA"/>
    </linearGradient>

    <!-- Quầng sáng Vầng Trăng đại nguyệt hoàng kim -->
    <radialGradient id="moonAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="${moonGlowOpacity.toFixed(2)}"/>
      <stop offset="45%" stop-color="#FEF9C3" stop-opacity="${(moonGlowOpacity * 0.55).toFixed(2)}"/>
      <stop offset="80%" stop-color="#FEF08A" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FEF08A" stop-opacity="0"/>
    </radialGradient>

    <!-- Thân Vầng Trăng -->
    <linearGradient id="moonBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#FEFCE8"/>
      <stop offset="70%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#FDE047"/>
    </linearGradient>

    <linearGradient id="moonCrater" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EAB308" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#CA8A04" stop-opacity="0.06"/>
    </linearGradient>

    <!-- Dãy núi non thủy mặc ở phương xa -->
    <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#CBD5E1" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#94A3B8" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Mây tơ thủy mặc ngũ sắc -->
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F1F5F9" stop-opacity="0"/>
      <stop offset="25%" stop-color="#FEF9C3" stop-opacity="0.45"/>
      <stop offset="75%" stop-color="#FCE7F3" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#F1F5F9" stop-opacity="0"/>
    </linearGradient>

    <!-- Mặt hồ đầm sen trong vắt -->
    <linearGradient id="pondGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC" stop-opacity="0"/>
      <stop offset="30%" stop-color="#E2E8F0" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="#CBD5E1" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#94A3B8" stop-opacity="0.75"/>
    </linearGradient>

    <!-- Thân cá chép vàng hoàng kim -->
    <linearGradient id="koiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#EA580C"/>
      <stop offset="40%" stop-color="#F59E0B"/>
      <stop offset="80%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#FEF08A"/>
    </linearGradient>

    <!-- Đuôi cá chép vàng tơ lụa mềm mại -->
    <linearGradient id="koiTailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#FDE047" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.3"/>
    </linearGradient>

    <!-- Cánh sen hồng ngọc -->
    <linearGradient id="petalGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#EC4899" stop-opacity="0.9"/>
      <stop offset="45%" stop-color="#F472B6" stop-opacity="0.85"/>
      <stop offset="85%" stop-color="#FCE7F3" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.98"/>
    </linearGradient>

    <linearGradient id="petalInnerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="#FB7185" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#FFF1F2" stop-opacity="0.95"/>
    </linearGradient>

    <radialGradient id="lotusGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#F472B6" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#F472B6" stop-opacity="0"/>
    </radialGradient>

    <!-- Lá sen xanh ngọc bích -->
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="50%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>

  <!-- 1. BẦU TRỜI TRẮNG SỨ SƯƠNG MAI -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#skyGrad)"/>

  <!-- 2. DÃY NÚI NON THỦY MẶC XA XĂM (SƠN THỦY HỮU TÌNH) -->
  <g fill="url(#mountainGrad)">
    <path d="M 0,380 C 180,320 320,350 480,290 C 620,240 760,330 920,270 C 1080,220 1200,310 1380,250 C 1540,200 1700,280 1920,230 L 1920,480 L 0,480 Z"/>
    <path d="M 0,420 C 150,380 280,410 440,360 C 580,320 720,390 860,340 C 1020,290 1180,370 1340,320 C 1500,280 1660,350 1920,310 L 1920,520 L 0,520 Z" opacity="0.6"/>
  </g>

  <!-- 3. VẦNG TRĂNG RẰM ĐẠI NGUYỆT TRÒN VÀNH VẠNH (GÓC TRÊN PHẢI cx=1640, cy=360) -->
  <!-- Quầng sáng trăng rằm nhịp thở -->
  <circle cx="1640" cy="360" r="${moonGlowR.toFixed(1)}" fill="url(#moonAura)"/>
  <circle cx="1640" cy="360" r="180" fill="url(#moonAura)" opacity="0.85"/>
  <!-- Thân trăng sáng vằng vặc -->
  <circle cx="1640" cy="360" r="110" fill="url(#moonBody)" filter="drop-shadow(0 0 35px rgba(254, 240, 138, 0.7))"/>
  <!-- Họa tiết bóng trăng dịu mát -->
  <path d="M 1610,320 Q 1630,305 1650,325 T 1670,355 Q 1660,390 1625,395 T 1595,370 Z" fill="url(#moonCrater)"/>
  <circle cx="1680" cy="335" r="15" fill="url(#moonCrater)"/>
  <circle cx="1605" cy="385" r="13" fill="url(#moonCrater)"/>

  <!-- 4. DẢI MÂY TƠ THỦY MẶC VẮT NGANG BẦU TRỜI -->
  <g transform="translate(${cloudShiftX.toFixed(1)}, ${cloudShiftY.toFixed(1)})" opacity="0.85">
    <path d="M 1200,410 C 1320,375 1440,425 1560,400 C 1680,375 1800,420 1920,395 C 1820,435 1710,415 1600,430 C 1480,445 1370,420 1200,410 Z" fill="url(#cloudGrad)"/>
    <path d="M 620,340 C 760,305 890,355 1030,325 C 1170,300 1290,345 1440,320 C 1310,360 1180,340 1060,355 C 920,370 800,350 620,340 Z" fill="url(#cloudGrad)" opacity="0.65"/>
    <path d="M 40,310 C 180,275 310,325 440,295 C 570,270 690,315 830,290 C 710,330 590,310 470,325 C 340,340 230,320 40,310 Z" fill="url(#cloudGrad)" opacity="0.55"/>
  </g>

  <!-- 5. ĐÔI CHIM HẠC SẢI CÁNH BAY VỀ HƯỚNG TRĂNG -->
  <g fill="#D97706" opacity="0.4">
    <!-- Hạc 1 -->
    <g transform="translate(1120, ${(330 + Math.sin(phase) * 6).toFixed(1)}) scale(0.95)">
      <path d="M 0,0 C 22,-14 44,-8 66,-17 C 53,-5 42,1 35,10 C 48,15 61,13 77,10 C 57,20 40,20 28,13 C 18,21 9,24 -4,20 C 2,13 2,6 0,0 Z"/>
    </g>
    <!-- Hạc 2 -->
    <g transform="translate(930, ${(290 + Math.sin(phase + 1.6) * 5).toFixed(1)}) scale(0.78)">
      <path d="M 0,0 C 22,-14 44,-8 66,-17 C 53,-5 42,1 35,10 C 48,15 61,13 77,10 C 57,20 40,20 28,13 C 18,21 9,24 -4,20 C 2,13 2,6 0,0 Z"/>
    </g>
  </g>

  <!-- 6. MẶT HỒ ĐẦM SEN TRONG VẮT & LÀN SÓNG LĂN TĂN -->
  <rect x="0" y="700" width="${WIDTH}" height="380" fill="url(#pondGrad)"/>

  <!-- Gợn sóng nước nhấp nhô -->
  <g fill="none" stroke="#E2E8F0" stroke-width="1.2" opacity="0.75" transform="translate(0, ${(Math.sin(phase) * 3).toFixed(1)})">
    <path d="M 0,780 C 180,765 360,795 540,780 C 720,765 900,795 1080,780 C 1260,765 1440,795 1620,780 T 1920,785"/>
    <path d="M 60,840 C 260,825 460,855 660,840 C 860,825 1060,855 1260,840 C 1460,825 1660,855 1860,845" stroke="#CBD5E1" opacity="0.7"/>
    <path d="M 0,910 C 220,895 440,925 660,910 C 880,895 1100,925 1320,910 C 1540,895 1740,925 1920,915" opacity="0.5"/>
    <path d="M 40,970 C 250,955 460,985 670,970 C 880,955 1090,985 1300,970 C 1510,955 1720,985 1920,975" opacity="0.4"/>
  </g>

  <!-- 7. ĐÀN CÁ CHÉP VÀNG HOÀNG KIM BƠI LỘI UỐN LƯỢN DƯỚI NƯỚC -->
  ${renderKoi(koiX1, koiY1, koiRot1, koiTail1, 1.15, 0.92)}
  ${renderKoi(koiX2, koiY2, koiRot2, koiTail2, 0.95, 0.88)}
  ${renderKoi(koiX3, koiY3, koiRot3, koiTail3, 1.25, 0.95)}
  ${renderKoi(koiX4, koiY4, koiRot4, koiTail4, 1.05, 0.9)}

  <!-- Cá chép nhỏ bơi theo mẹ -->
  ${renderKoi(koiX3 - 60, koiY3 + 30, koiRot3 - 8, koiTail3 * 1.2, 0.7, 0.82)}
  ${renderKoi(koiX1 + 65, koiY1 - 25, koiRot1 + 10, koiTail1 * 1.2, 0.65, 0.78)}

  <!-- 8. CỤM LÁ SEN NGỌC BÍCH TRẢI ĐỀU BỒNG BỀNH -->
  ${renderLotusLeaf(110, 830, bob1, 1.1, 0.85)}
  ${renderLotusLeaf(280, 860, bob2, 0.9, 0.8)}
  ${renderLotusLeaf(580, 820, bob3, 1.15, 0.88)}
  ${renderLotusLeaf(940, 840, bob4, 1.0, 0.82)}
  ${renderLotusLeaf(1320, 830, bob5, 1.2, 0.9)}
  ${renderLotusLeaf(1700, 850, bob1, 1.1, 0.85)}
  ${renderLotusLeaf(1860, 820, bob2, 0.95, 0.8)}

  <!-- 9. NHỮNG ĐÓA HOA SEN HỒNG NGỌC NỞ RỘ NGÁT HƯƠNG (BẬP BỀNH NHẸ) -->
  ${renderBloomingLotus(190, 820, bob1, 1.1, 0.95)}
  ${renderBloomingLotus(540, 805, bob3, 1.15, 0.96)}
  ${renderBloomingLotus(980, 815, bob4, 1.2, 0.98)}
  ${renderBloomingLotus(1410, 810, bob5, 1.25, 0.98)}
  ${renderBloomingLotus(1780, 825, bob2, 1.15, 0.96)}

  <!-- Búp sen e ấp bên hoa nở -->
  <g transform="translate(235, ${(805 + bob1).toFixed(1)}) scale(0.85)" opacity="0.9">
    <path d="M 0,0 C -6,-8 -6,-18 0,-24 C 6,-18 6,-8 0,0 Z" fill="url(#petalGrad)"/>
    <path d="M -4,-2 C -8,-10 -6,-18 0,-22" stroke="#EC4899" stroke-width="0.8" fill="none"/>
  </g>
  <g transform="translate(1030, ${(800 + bob4).toFixed(1)}) scale(0.9)" opacity="0.92">
    <path d="M 0,0 C -7,-9 -7,-20 0,-26 C 7,-20 7,-9 0,0 Z" fill="url(#petalGrad)"/>
    <path d="M 4,-2 C 8,-10 6,-18 0,-24" stroke="#EC4899" stroke-width="0.8" fill="none"/>
  </g>

  <!-- 10. CÁNH HOA SEN RƠI BAY LƠ LỬNG TRONG GIÓ -->
  <g transform="translate(${(600 + petalDriftX1).toFixed(1)}, ${(450 + petalDriftY1).toFixed(1)}) rotate(${petalRot1.toFixed(1)}) scale(0.8)" opacity="0.75">
    <path d="M 0,0 C -4,-6 -4,-14 0,-18 C 4,-14 4,-6 0,0 Z" fill="url(#petalGrad)"/>
  </g>
  <g transform="translate(${(1250 - petalDriftX1).toFixed(1)}, ${(490 + petalDriftY1 * 0.8).toFixed(1)}) rotate(${(-petalRot1).toFixed(1)}) scale(0.7)" opacity="0.7">
    <path d="M 0,0 C -4,-6 -4,-14 0,-18 C 4,-14 4,-6 0,0 Z" fill="url(#petalGrad)"/>
  </g>

  <!-- 11. ĐOM ĐÓM VÀNG CHỚP SÁNG LUNG LINH QUANH ĐẦM SEN -->
  <g opacity="${firefly1.toFixed(2)}">
    <circle cx="340" cy="790" r="2.5" fill="#FEF08A" filter="drop-shadow(0 0 6px rgba(250, 204, 21, 0.9))"/>
    <circle cx="340" cy="790" r="1" fill="#FFFFFF"/>
  </g>
  <g opacity="${firefly2.toFixed(2)}">
    <circle cx="780" cy="760" r="2.8" fill="#FEF08A" filter="drop-shadow(0 0 7px rgba(250, 204, 21, 0.9))"/>
    <circle cx="780" cy="760" r="1.2" fill="#FFFFFF"/>
  </g>
  <g opacity="${firefly3.toFixed(2)}">
    <circle cx="1260" cy="780" r="2.6" fill="#FEF08A" filter="drop-shadow(0 0 6px rgba(250, 204, 21, 0.9))"/>
    <circle cx="1260" cy="780" r="1" fill="#FFFFFF"/>
  </g>
  <g opacity="${firefly4.toFixed(2)}">
    <circle cx="1660" cy="760" r="3.0" fill="#FEF08A" filter="drop-shadow(0 0 8px rgba(250, 204, 21, 0.9))"/>
    <circle cx="1660" cy="760" r="1.3" fill="#FFFFFF"/>
  </g>
</svg>
  `;
}

async function main() {
  console.log(`--- ĐANG TẠO TRANH ĐỘNG ĐẦM SEN TRĂNG RẰM (1920x1080 - ${TOTAL_FRAMES} FRAMES) ---`);
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const svg = renderFrameSvg(f);
    const frameBuffer = await sharp(Buffer.from(svg))
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    frames.push(frameBuffer);
    process.stdout.write(`\rRendered frame ${f + 1}/${TOTAL_FRAMES}...`);
  }
  console.log('\nĐang đóng gói thành Animated WebP vòng lặp vô tận (loopCount=0)...');

  const animatedBuffer = muxAnimatedWebP(frames, DELAY, 0);
  const outputPath = path.resolve(__dirname, '../pictures/stock_card_panorama_trung_thu.webp');
  fs.writeFileSync(outputPath, animatedBuffer);

  console.log(`ĐÃ XUẤT THÀNH CÔNG TRANH ĐỘNG TẠI: ${outputPath}`);
  console.log(`Dung lượng file Animated WebP: ${(animatedBuffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Lỗi khi tạo tranh động đầm sen:', err);
  process.exit(1);
});
