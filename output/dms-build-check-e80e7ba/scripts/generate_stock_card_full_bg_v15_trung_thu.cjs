const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 320;
const HEIGHT = 480;
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

function renderSparkle(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#eab308" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

// Pháo hoa bung tỏa tia sáng
function renderFireworkBurst(cx, cy, radius, opacity, color = '#f59e0b') {
  if (opacity <= 0.05) return '';
  const rays = 8;
  let paths = '';
  for (let i = 0; i < rays; i++) {
    const angle = (i * 2 * Math.PI) / rays;
    const x2 = (Math.cos(angle) * radius).toFixed(1);
    const y2 = (Math.sin(angle) * radius).toFixed(1);
    const x1 = (Math.cos(angle) * (radius * 0.4)).toFixed(1);
    const y1 = (Math.sin(angle) * (radius * 0.4)).toFixed(1);
    paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.2" stroke-linecap="round" />`;
    paths += `<circle cx="${x2}" cy="${y2}" r="1" fill="#ffffff" />`;
  }
  return `<g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">${paths}</g>`;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO V15: VŨ KHÚC NGHÊ VÀNG & PHÁO HOA TRĂNG RẰM ---');
  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Kỳ Lân lắc đầu múa lượn
    const qilinBob = Math.sin(phase) * 3;
    const qilinTilt = Math.sin(phase) * 3.5;
    const whiskerWiggle = Math.sin(phase * 2) * 2;

    // Pháo hoa bung nở chu kỳ
    const fw1Progress = (t * 2) % 1;
    const fw1Radius = 10 + fw1Progress * 22;
    const fw1Alpha = Math.sin(fw1Progress * Math.PI);

    const fw2Progress = ((t * 2) + 0.5) % 1;
    const fw2Radius = 8 + fw2Progress * 20;
    const fw2Alpha = Math.sin(fw2Progress * Math.PI);

    // Mắt ngọc lục bảo nhấp nháy phát sáng
    const eyeGlow = 0.7 + 0.3 * Math.sin(phase * 3);

    // Sao lấp lánh
    const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="v15MoonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#fef3c7"/>
            <stop offset="70%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </radialGradient>
          <linearGradient id="v15QilinGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
          <radialGradient id="v15Stage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.4"/>
            <stop offset="60%" stop-color="#fde68a" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>
        <ellipse cx="160" cy="110" rx="135" ry="24" fill="url(#v15Stage)"/>

        <!-- PHÁO HOA BÙNG TỎA RỰC RỠ -->
        ${renderFireworkBurst(240, 36, fw1Radius, fw1Alpha, '#f59e0b')}
        ${renderFireworkBurst(160, 25, fw2Radius, fw2Alpha, '#ef4444')}

        <!-- ================= ĐẦU KỲ LÂN / CON NGHÊ VÀNG CUNG ĐÌNH (Góc Trên Trái cx=48, cy=46) ================= -->
        <g transform="translate(48, ${46 + qilinBob}) rotate(${qilinTilt.toFixed(1)})">
          <!-- Hào quang kim sắc -->
          <circle cx="0" cy="0" r="26" fill="#fef08a" opacity="0.4"/>

          <!-- Bờm lửa rực cháy quanh đầu -->
          <path d="M -16,-6 Q -22,-14 -12,-16 Q -4,-22 0,-15 Q 4,-22 12,-16 Q 22,-14 16,-6 Z" fill="#ef4444"/>
          <path d="M -12,-4 Q -16,-10 -8,-12 Q -2,-16 0,-11 Q 2,-16 8,-12 Q 16,-10 12,-4 Z" fill="#f59e0b"/>

          <!-- Hộp sọ đầu Nghê hoàng kim dát ngọc -->
          <ellipse cx="0" cy="2" rx="13" ry="11" fill="url(#v15QilinGold)"/>

          <!-- Sừng lân độc giác trung tâm vươn cao -->
          <polygon points="0,-16 -3,-5 3,-5" fill="#fef08a" stroke="#d97706" stroke-width="0.8"/>
          <circle cx="0" cy="-16" r="1.5" fill="#ef4444"/>

          <!-- Đôi mắt ngọc bích sáng ngời linh thiêng -->
          <ellipse cx="-5" cy="0" rx="3" ry="3.5" fill="#ffffff"/>
          <circle cx="-5" cy="0" r="2" fill="#10b981" opacity="${eyeGlow.toFixed(2)}"/>
          <circle cx="-5.5" cy="-0.5" r="0.7" fill="#ffffff"/>

          <ellipse cx="5" cy="0" rx="3" ry="3.5" fill="#ffffff"/>
          <circle cx="5" cy="0" r="2" fill="#10b981" opacity="${eyeGlow.toFixed(2)}"/>
          <circle cx="4.5" cy="-0.5" r="0.7" fill="#ffffff"/>

          <!-- Mũi sư tử oai vệ & Miệng ngậm châu -->
          <circle cx="0" cy="4" r="3" fill="#ea580c"/>
          <circle cx="0" cy="8" r="2.5" fill="#ef4444"/>
          <!-- Râu nghê uốn lượn hai bên -->
          <path d="M -8,5 Q -14,${8 + whiskerWiggle} -18,14" fill="none" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M 8,5 Q 14,${8 + whiskerWiggle} 18,14" fill="none" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round"/>
        </g>

        <!-- ================= VẦNG TRĂNG RẰM HOÀNG KIM (Góc Trên Phải cx=255, cy=44) ================= -->
        <g transform="translate(255, 44)">
          <circle cx="0" cy="0" r="26" fill="#fef08a" opacity="0.35"/>
          <circle cx="0" cy="0" r="20" fill="url(#v15MoonGrad)"/>
          <!-- Vết rằm cung trăng -->
          <path d="M -6,-4 Q 0,-10 6,-6 Q 8,2 2,6 Q -4,4 -6,-4 Z" fill="#d97706" opacity="0.18"/>
        </g>

        <!-- MÂY NGŨ SẮC CÁT TƯỜNG (Dưới góc phải cx=270, cy=425) -->
        <g transform="translate(270, 425)" opacity="0.75">
          <path d="M -15,0 C -15,-6 -8,-6 -6,0 C -4,-6 4,-6 5,0 C 10,-4 16,0 14,6 C 12,10 -12,10 -15,0 Z" fill="#fef08a" stroke="#f59e0b" stroke-width="0.8"/>
        </g>

        ${renderSparkle(160, 24, 3.6, s1)}
        ${renderSparkle(35, 195, 3.0, s2)}
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);
  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v15_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v15_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);
  console.log(`HOÀN TẤT V15! ${(animatedWebp.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
