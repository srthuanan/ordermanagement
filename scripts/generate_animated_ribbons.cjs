const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 460;
const HEIGHT = 100;
const FRAMES = 24;
const DELAY = 100; // ~10 fps, slower & gentle waving pace

const THEMES = [
  {
    name: 'ribbon_tet',
    title: '🧧 CHÚC MỪNG NĂM MỚI 🧧',
    subText: '★ TẾT NGUYÊN ĐÁN 2026 ★',
    primaryColor1: '#b91c1c', // Vibrant silk crimson
    primaryColor2: '#ef4444', // Bright ruby red
    primaryColor3: '#dc2626',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#fbbf24'
  },
  {
    name: 'ribbon_christmas',
    title: '🎄 MERRY CHRISTMAS 🎄',
    subText: '★ GIÁNG SINH AN LÀNH ★',
    primaryColor1: '#047857',
    primaryColor2: '#10b981',
    primaryColor3: '#059669',
    accentColor: '#ffffff',
    goldColor: '#fef08a',
    borderColor: '#6ee7b7'
  },
  {
    name: 'ribbon_30_4',
    title: '★ 30/4 & 1/5 CHIẾN THẮNG ★',
    subText: '★ THỐNG NHẤT ĐẤT NƯỚC ★',
    primaryColor1: '#b91c1c',
    primaryColor2: '#ef4444',
    primaryColor3: '#dc2626',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#fbbf24'
  },
  {
    name: 'ribbon_women_day',
    title: '🌸 CHÚC MỪNG 8/3 & 20/10 🌸',
    subText: '★ TÔN VINH PHỤ NỮ VIỆT NAM ★',
    primaryColor1: '#be185d',
    primaryColor2: '#ec4899',
    primaryColor3: '#db2777',
    accentColor: '#ffffff',
    goldColor: '#fdf2f8',
    borderColor: '#f472b6'
  },
  {
    name: 'ribbon_new_year',
    title: '✨ HAPPY NEW YEAR 2026 ✨',
    subText: '★ VẠN SỰ NHƯ Ý - PHÁT TÀI ★',
    primaryColor1: '#1d4ed8',
    primaryColor2: '#3b82f6',
    primaryColor3: '#2563eb',
    accentColor: '#fef08a',
    goldColor: '#93c5fd',
    borderColor: '#60a5fa'
  },
  {
    name: 'ribbon_trung_thu',
    title: '🥮 TẾT TRUNG THU 🥮',
    subText: '★ HỘI TRĂNG RẰM ĐOÀN VIÊN ★',
    primaryColor1: '#7c3aed',
    primaryColor2: '#f97316',
    primaryColor3: '#ea580c',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#facc15'
  },
  {
    name: 'ribbon_hot_deal',
    title: '⚡ SIÊU ƯU ĐÃI THÁNG ⚡',
    subText: '★ XE GIAO NGAY - GIÁ TỐT NHẤT ★',
    primaryColor1: '#c2410c',
    primaryColor2: '#f97316',
    primaryColor3: '#ea580c',
    accentColor: '#ffffff',
    goldColor: '#fef08a',
    borderColor: '#fde047'
  },
  // 🌟 PHIÊN BẢN ĐỘT PHÁ HOÀN TOÀN MỚI: ORIGAMI 3D DUAL-LAYER KNOTTED SASH
  {
    name: 'ribbon_2_9_origami_3d',
    title: '★ 2/9 ĐỘC LẬP & TỰ DO ★',
    subText: '★ NƯỚC CHXHCN VIỆT NAM MUÔN NĂM ★',
    primaryColor1: '#881337', // Deep Rose Velvet
    primaryColor2: '#e11d48', // Vibrant Rose Red
    primaryColor3: '#9f1239',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#facc15',
    isOrigami3D: true
  },
  // 🔥 PHIÊN BẢN SIÊU ĐẶC BIỆT (VIP Masterpiece Edition)
  {
    name: 'ribbon_2_9_vip_masterpiece',
    title: '👑 ★ 2/9 QUỐC KHÁNH ★ 👑',
    subText: '★ TỰ HÀO KHÁT VỌNG VIỆT NAM ★',
    primaryColor1: '#991b1b', // Imperial Crimson
    primaryColor2: '#ef4444', // Brilliant Ruby Light
    primaryColor3: '#b91c1c',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#facc15',
    isMasterpiece: true
  },
  // 5 Biến thể Quốc Khánh 2/9 sáng rực rỡ
  {
    name: 'ribbon_2_9',
    title: '★ 2/9 QUỐC KHÁNH ★',
    subText: '★ KỶ NIỆM NGÀY QUỐC KHÁNH ★',
    primaryColor1: '#b91c1c',
    primaryColor2: '#ef4444',
    primaryColor3: '#dc2626',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#fbbf24'
  },
  {
    name: 'ribbon_2_9_doc_lap',
    title: '★ 2/9 TẾT ĐỘC LẬP ★',
    subText: '★ TỰ HÀO DÂN TỘC VIỆT NAM ★',
    primaryColor1: '#b91c1c',
    primaryColor2: '#ef4444',
    primaryColor3: '#dc2626',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#fbbf24'
  },
  {
    name: 'ribbon_2_9_to_quoc',
    title: '★ QUỐC KHÁNH 2/9 ★',
    subText: '★ TỔ QUỐC VIỆT NAM MUÔN NĂM ★',
    primaryColor1: '#991b1b',
    primaryColor2: '#dc2626',
    primaryColor3: '#b91c1c',
    accentColor: '#fef08a',
    goldColor: '#fffbeb',
    borderColor: '#facc15'
  },
  {
    name: 'ribbon_2_9_tuyen_ngon',
    title: '★ KỶ NIỆM 2/9 ★',
    subText: '★ TUYÊN NGÔN ĐỘC LẬP 1945 ★',
    primaryColor1: '#9f1239',
    primaryColor2: '#e11d48',
    primaryColor3: '#be123c',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#fbbf24'
  },
  {
    name: 'ribbon_2_9_khat_vong',
    title: '★ VIỆT NAM HÙNG CƯỜNG ★',
    subText: '★ CHÀO MỪNG QUỐC KHÁNH 2/9 ★',
    primaryColor1: '#b91c1c',
    primaryColor2: '#f97316',
    primaryColor3: '#dc2626',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#facc15'
  },
  // 🇻🇳 10 MẪU RUY-BĂNG QUỐC KHÁNH 2/9 ĐẶC BIỆT MỚI BỔ SUNG:
  {
    name: 'ribbon_2_9_ba_dinh_lich_su',
    title: '🏛️ ★ BA ĐÌNH LỊCH SỬ 1945 ★',
    subText: '★ MÙA THU ĐỘC LẬP DÂN TỘC ★',
    primaryColor1: '#881337',
    primaryColor2: '#dc2626',
    primaryColor3: '#991b1b',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#eab308'
  },
  {
    name: 'ribbon_2_9_ngoi_sao_vang',
    title: '⭐ ★ NGÔI SAO VÀNG RỰC RỠ ★',
    subText: '★ HÀO KHÍ NON SÔNG ĐẤT NƯỚC ★',
    primaryColor1: '#991b1b',
    primaryColor2: '#ef4444',
    primaryColor3: '#b91c1c',
    accentColor: '#ffffff',
    goldColor: '#facc15',
    borderColor: '#fde047'
  },
  {
    name: 'ribbon_2_9_non_song_gam_voc',
    title: '🇻🇳 ★ NON SÔNG GẤM VÓC ★',
    subText: '★ ĐẤT NƯỚC VIỆT NAM TƯƠI ĐẸP ★',
    primaryColor1: '#7f1d1d',
    primaryColor2: '#e11d48',
    primaryColor3: '#9f1239',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#facc15'
  },
  {
    name: 'ribbon_2_9_y_chi_doc_lap',
    title: '⚔️ ★ Ý CHÍ ĐỘC LẬP ★',
    subText: '★ KHÔNG CÓ GÌ QUÝ HƠN ĐỘC LẬP TỰ DO ★',
    primaryColor1: '#4c0519',
    primaryColor2: '#be123c',
    primaryColor3: '#881337',
    accentColor: '#fef08a',
    goldColor: '#fffbeb',
    borderColor: '#fbbf24'
  },
  {
    name: 'ribbon_2_9_vinh_quang_to_quoc',
    title: '🎖️ ★ VINH QUANG TỔ QUỐC ★',
    subText: '★ RẠNG DANH DÂN TỘC VIỆT NAM ★',
    primaryColor1: '#831843',
    primaryColor2: '#e11d48',
    primaryColor3: '#9d174d',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#facc15'
  },
  {
    name: 'ribbon_2_9_hoa_binh_thinh_vuong',
    title: '🕊️ ★ HÒA BÌNH & THỊNH VƯỢNG ★',
    subText: '★ KHÁT VỌNG VIỆT NAM PHÁT TRIỂN ★',
    primaryColor1: '#991b1b',
    primaryColor2: '#ea580c',
    primaryColor3: '#c2410c',
    accentColor: '#ffffff',
    goldColor: '#fef08a',
    borderColor: '#fed7aa'
  },
  {
    name: 'ribbon_2_9_trong_dong_dong_son',
    title: '🥁 ★ HÀO KHÍ ĐÔNG SƠN ★',
    subText: '★ BẢN SẮC VĂN HÓA VIỆT NAM ★',
    primaryColor1: '#78350f',
    primaryColor2: '#b45309',
    primaryColor3: '#92400e',
    accentColor: '#fef08a',
    goldColor: '#fde047',
    borderColor: '#facc15'
  },
  {
    name: 'ribbon_2_9_tu_hao_viet_nam',
    title: '✨ ★ TỰ HÀO VIỆT NAM ★',
    subText: '★ TINH THẦN ĐOÀN KẾT TOÀN DÂN ★',
    primaryColor1: '#881337',
    primaryColor2: '#f43f5e',
    primaryColor3: '#be123c',
    accentColor: '#ffffff',
    goldColor: '#fde047',
    borderColor: '#fda4af'
  },
  {
    name: 'ribbon_2_9_ky_nguyen_vuon_minh',
    title: '🚀 ★ KỶ NGUYÊN VƯƠN MÌNH ★',
    subText: '★ BƯỚC VÀO KỶ NGUYÊN PHÁT TRIỂN MỚI ★',
    primaryColor1: '#0f172a',
    primaryColor2: '#991b1b',
    primaryColor3: '#dc2626',
    accentColor: '#38bdf8',
    goldColor: '#fef08a',
    borderColor: '#38bdf8'
  },
  {
    name: 'ribbon_2_9_dai_le_quoc_gia',
    title: '🎉 ★ ĐẠI LỄ QUỐC GIA 2/9 ★',
    subText: '★ CHÀO MỪNG 81 NĂM QUỐC KHÁNH ★',
    primaryColor1: '#b91c1c',
    primaryColor2: '#ef4444',
    primaryColor3: '#dc2626',
    accentColor: '#fef08a',
    goldColor: '#fffbeb',
    borderColor: '#fde047'
  }
];

// Gentle & Elegant 3D Cloth Wave Function
// Creates a soft, delicate flutter in a light gentle breeze
function getClothWave(x, frameIndex) {
  const phase = (frameIndex / FRAMES) * Math.PI * 2;
  const waveLength = 320; // Long, gentle wavelength
  const amplitude = 3.8;  // Soft, subtle wave amplitude (gentle motion)

  const angle = (x / waveLength) * Math.PI * 2 - phase;
  const waveVal = Math.sin(angle);
  const slope = Math.cos(angle) * ((Math.PI * 2) / waveLength) * amplitude;

  const dy = waveVal * amplitude;
  
  // Subtle perspective breathing (gentle depth)
  const heightDelta = waveVal * 1.2; 

  return { dy, slope, waveVal, heightDelta };
}

function generateWavySilkSVG(theme, frameIndex) {
  const segments = 80; // Super high resolution curve
  const dx = WIDTH / segments;

  const topPoints = [];
  const botPoints = [];
  const foldShades = [];

  const baseTopY = 16;
  const baseRibbonHeight = 66;

  for (let i = 0; i <= segments; i++) {
    const x = i * dx;
    const { dy, slope, waveVal, heightDelta } = getClothWave(x, frameIndex);
    const yTop = baseTopY + dy;
    const currentHeight = baseRibbonHeight + heightDelta;
    const yBot = yTop + currentHeight;

    topPoints.push({ x, y: yTop });
    botPoints.push({ x, y: yBot });

    // Soft, gentle specular highlight and velvet shading
    const lightVal = slope * 1.4;
    foldShades.push({ x, yTop, yBot, lightVal, waveVal });
  }

  // Smooth SVG Path with Bezier Spline
  let topPathD = `M ${topPoints[0].x.toFixed(1)} ${topPoints[0].y.toFixed(2)}`;
  for (let i = 1; i < topPoints.length; i++) {
    const prev = topPoints[i - 1];
    const curr = topPoints[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    topPathD += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(2)}, ${midX.toFixed(1)} ${midY.toFixed(2)}`;
  }
  topPathD += ` L ${topPoints[topPoints.length - 1].x.toFixed(1)} ${topPoints[topPoints.length - 1].y.toFixed(2)}`;

  let botPathD = `L ${botPoints[botPoints.length - 1].x.toFixed(1)} ${botPoints[botPoints.length - 1].y.toFixed(2)}`;
  for (let i = botPoints.length - 2; i >= 0; i--) {
    const prev = botPoints[i + 1];
    const curr = botPoints[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    botPathD += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(2)}, ${midX.toFixed(1)} ${midY.toFixed(2)}`;
  }
  botPathD += ` L ${botPoints[0].x.toFixed(1)} ${botPoints[0].y.toFixed(2)}`;

  const mainSilkPath = `${topPathD} ${botPathD} Z`;

  // Gold Trim Paths (Offset smooth curves)
  let topTrimOuter = `M ${topPoints[0].x} ${(topPoints[0].y + 2.5).toFixed(2)}`;
  let topTrimInner = `M ${topPoints[0].x} ${(topPoints[0].y + 6).toFixed(2)}`;
  let botTrimOuter = `M ${botPoints[0].x} ${(botPoints[0].y - 2.5).toFixed(2)}`;
  let botTrimInner = `M ${botPoints[0].x} ${(botPoints[0].y - 6).toFixed(2)}`;

  for (let i = 1; i < topPoints.length; i++) {
    topTrimOuter += ` L ${topPoints[i].x.toFixed(2)} ${(topPoints[i].y + 2.5).toFixed(2)}`;
    topTrimInner += ` L ${topPoints[i].x.toFixed(2)} ${(topPoints[i].y + 6).toFixed(2)}`;
    botTrimOuter += ` L ${botPoints[i].x.toFixed(2)} ${(botPoints[i].y - 2.5).toFixed(2)}`;
    botTrimInner += ` L ${botPoints[i].x.toFixed(2)} ${(botPoints[i].y - 6).toFixed(2)}`;
  }

  // Smooth Fabric Lighting Folds (Silk Satin Lustre)
  const foldPolygons = [];
  for (let i = 0; i < foldShades.length - 1; i++) {
    const p1 = foldShades[i];
    const p2 = foldShades[i + 1];
    const avgLight = (p1.lightVal + p2.lightVal) / 2;

    if (avgLight > 0.05) {
      const opacity = (Math.min(0.65, avgLight * 0.75)).toFixed(3);
      foldPolygons.push(`
        <polygon points="${p1.x.toFixed(1)},${p1.yTop.toFixed(1)} ${p2.x.toFixed(1)},${p2.yTop.toFixed(1)} ${p2.x.toFixed(1)},${p2.yBot.toFixed(1)} ${p1.x.toFixed(1)},${p1.yBot.toFixed(1)}" fill="#ffffff" opacity="${opacity}" style="mix-blend-mode: overlay;"/>
      `);
    } else if (avgLight < -0.05) {
      const opacity = (Math.min(0.35, Math.abs(avgLight) * 0.40)).toFixed(3);
      foldPolygons.push(`
        <polygon points="${p1.x.toFixed(1)},${p1.yTop.toFixed(1)} ${p2.x.toFixed(1)},${p2.yTop.toFixed(1)} ${p2.x.toFixed(1)},${p2.yBot.toFixed(1)} ${p1.x.toFixed(1)},${p1.yBot.toFixed(1)}" fill="#000000" opacity="${opacity}"/>
      `);
    }
  }

  // Left & Right Swallowtail Tails (V-cut luxury 3D tails)
  const leftWave = getClothWave(24, frameIndex).dy;
  const rightWave = getClothWave(WIDTH - 24, frameIndex).dy;

  // Left Swallowtail Path
  const leftTailPath = `
    M 24,${(baseTopY + leftWave).toFixed(1)}
    L -4,${(baseTopY + leftWave + 10).toFixed(1)}
    L 12,${(baseTopY + leftWave + baseRibbonHeight / 2).toFixed(1)}
    L -4,${(baseTopY + leftWave + baseRibbonHeight - 10).toFixed(1)}
    L 24,${(baseTopY + leftWave + baseRibbonHeight).toFixed(1)}
    Z
  `;

  // Right Swallowtail Path
  const rightTailPath = `
    M ${WIDTH - 24},${(baseTopY + rightWave).toFixed(1)}
    L ${WIDTH + 4},${(baseTopY + rightWave + 10).toFixed(1)}
    L ${WIDTH - 12},${(baseTopY + rightWave + baseRibbonHeight / 2).toFixed(1)}
    L ${WIDTH + 4},${(baseTopY + rightWave + baseRibbonHeight - 10).toFixed(1)}
    L ${WIDTH - 24},${(baseTopY + rightWave + baseRibbonHeight).toFixed(1)}
    Z
  `;

  // Accurate character width weighting for natural kerning
  function getCharWidthFactor(c) {
    if (c === ' ' || c === 'I' || c === 'Í' || c === 'Ì' || c === 'Ỉ' || c === 'Ĩ' || c === 'Ị' || c === '|' || c === '1' || c === '.' || c === '!') return 0.35;
    if (c === 'M' || c === 'W' || c === 'Q' || c === '★' || c === '🧧' || c === '🎄' || c === '🌸' || c === '🥮' || c === '⚡' || c === '✨') return 0.95;
    if (c === 'Ư' || c === 'Ứ' || c === 'Ừ' || c === 'Ử' || c === 'Ữ' || c === 'Ự' || c === 'Ơ' || c === 'Ớ' || c === 'Ờ' || c === 'Ở' || c === 'Ỡ' || c === 'Ợ' || c === 'Ô' || c === 'Ố' || c === 'Ồ' || c === 'Ổ' || c === 'Ỗ' || c === 'Ộ' || c === 'Đ') return 0.72;
    return 0.62;
  }

  // Render Title and SubText letter-by-letter with natural proportional kerning along the wave
  function renderWavyText(text, baseY, fontSize, fontColor, letterSpacing, fontWeight = 'bold') {
    const chars = Array.from(text);
    const totalChars = chars.length;
    
    // Calculate total text width proportionally
    const widths = chars.map(c => fontSize * getCharWidthFactor(c) + letterSpacing);
    const totalWidth = widths.reduce((acc, w) => acc + w, 0) - letterSpacing;
    let currentX = (WIDTH - totalWidth) / 2;

    return chars.map((char, index) => {
      const charW = widths[index];
      const charCenterX = currentX + charW / 2;
      currentX += charW;

      const { dy, slope } = getClothWave(charCenterX, frameIndex);
      const charCenterY = baseY + dy;
      const angleDeg = (Math.atan(slope) * 180 / Math.PI).toFixed(2);

      return `
        <text x="${charCenterX.toFixed(1)}" y="${charCenterY.toFixed(1)}" 
              text-anchor="middle" 
              dominant-baseline="central"
              font-family="Arial, 'Segoe UI', Tahoma, sans-serif" 
              font-size="${fontSize}" 
              font-weight="${fontWeight}" 
              fill="${fontColor}" 
              filter="url(#textGlow)"
              transform="rotate(${angleDeg}, ${charCenterX.toFixed(1)}, ${charCenterY.toFixed(1)})">
          ${char === '&' ? '&amp;' : (char === '<' ? '&lt;' : (char === '>' ? '&gt;' : char))}
        </text>
      `;
    }).join('\n');
  }

  // Clean & Elegant Wavy Typography (Centered vertically within ribbon)
  const titleSVGElements = renderWavyText(theme.title, baseTopY + 27, 20.5, theme.accentColor, 1.4, '900');
  const subTitleSVGElements = renderWavyText(theme.subText, baseTopY + 49, 11.5, '#ffffff', 1.8, 'bold');

  // Traveling glint sparkles & golden dust particles
  const progress = frameIndex / (FRAMES - 1);
  const sparkle1X = 70 + progress * (WIDTH - 140);
  const sparkle1Wave = getClothWave(sparkle1X, frameIndex).dy;
  const sparkle1Y = baseTopY + sparkle1Wave + 22;

  const sparkle2X = 120 + ((progress + 0.5) % 1) * (WIDTH - 240);
  const sparkle2Wave = getClothWave(sparkle2X, frameIndex).dy;
  const sparkle2Y = baseTopY + sparkle2Wave + 47;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Luxury Satin Gradient -->
        <linearGradient id="satinBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${theme.primaryColor1}" />
          <stop offset="25%" stop-color="${theme.primaryColor2}" />
          <stop offset="50%" stop-color="${theme.primaryColor3}" />
          <stop offset="75%" stop-color="${theme.primaryColor2}" />
          <stop offset="100%" stop-color="${theme.primaryColor1}" />
        </linearGradient>

        <!-- Gold Trim Gradient -->
        <linearGradient id="goldTrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#b45309" />
          <stop offset="15%" stop-color="#fef08a" />
          <stop offset="35%" stop-color="#eab308" />
          <stop offset="50%" stop-color="#fffbeb" />
          <stop offset="65%" stop-color="#eab308" />
          <stop offset="85%" stop-color="#fef08a" />
          <stop offset="100%" stop-color="#b45309" />
        </linearGradient>

        <!-- Drop Shadows -->
        <filter id="silkShadow" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.65"/>
        </filter>
        <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.85"/>
        </filter>
      </defs>

      <!-- 3D Swallowtail Tails with Gold Trim & Shadow -->
      <path d="${leftTailPath}" fill="#3f0708" filter="url(#silkShadow)"/>
      <path d="${leftTailPath}" fill="none" stroke="url(#goldTrimGrad)" stroke-width="1.8"/>

      <path d="${rightTailPath}" fill="#3f0708" filter="url(#silkShadow)"/>
      <path d="${rightTailPath}" fill="none" stroke="url(#goldTrimGrad)" stroke-width="1.8"/>

      <!-- Main Flowing Silk Ribbon Body with Shadow -->
      <path d="${mainSilkPath}" fill="url(#satinBg)" filter="url(#silkShadow)"/>

      <!-- 3D Fabric Lighting Folds & Ripples -->
      ${foldPolygons.join('\n')}

      <!-- Double Gold Embroidered Edge Trims (Outer + Inner Filigree) -->
      <path d="${topTrimOuter}" fill="none" stroke="url(#goldTrimGrad)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="${topTrimInner}" fill="none" stroke="#fef08a" stroke-width="0.75" stroke-dasharray="3,2.5" opacity="0.85"/>

      <path d="${botTrimOuter}" fill="none" stroke="url(#goldTrimGrad)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="${botTrimInner}" fill="none" stroke="#fef08a" stroke-width="0.75" stroke-dasharray="3,2.5" opacity="0.85"/>

      <!-- Clean Typography Waving & Tilting Letter-by-Letter Along with Silk Cloth -->
      ${titleSVGElements}
      ${subTitleSVGElements}

      <!-- Sparkling Stars & Floating Golden Dust -->
      <g transform="translate(${sparkle1X.toFixed(1)}, ${sparkle1Y.toFixed(1)}) scale(${Math.sin(progress * Math.PI) * 0.8 + 0.35})">
        <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#ffffff" opacity="0.95"/>
        <circle cx="0" cy="0" r="3" fill="${theme.goldColor}" opacity="0.95"/>
      </g>

      <g transform="translate(${sparkle2X.toFixed(1)}, ${sparkle2Y.toFixed(1)}) scale(${Math.cos(progress * Math.PI) * 0.6 + 0.3})">
        <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#fffbeb" opacity="0.85"/>
        <circle cx="0" cy="0" r="2" fill="${theme.goldColor}" opacity="0.85"/>
      </g>

      <!-- 👑 BESPOKE ULTRA-LUXURY ARCHITECTURAL EMBELLISHMENTS -->
      ${theme.name.includes('ba_dinh') || theme.name.includes('trong_dong') || theme.isMasterpiece ? `
      <!-- 👑 ARCHETYPE 1: 3D Royal Sovereign Dong Son Medal Crest -->
      <g transform="translate(36, ${(baseTopY + 33 + getClothWave(36, frameIndex).dy).toFixed(1)})">
        <circle cx="0" cy="0" r="19" fill="#78350f" stroke="url(#goldTrimGrad)" stroke-width="2.5" filter="url(#textGlow)"/>
        <circle cx="0" cy="0" r="16" fill="url(#goldTrimGrad)"/>
        <circle cx="0" cy="0" r="13" fill="#991b1b" stroke="#fef08a" stroke-width="1"/>
        <polygon points="0,-9 2.5,-3 8.5,-3 4,1 5.8,7 0,3.5 -5.8,7 -4,1 -8.5,-3 -2.5,-3" fill="#fffbeb" stroke="#ca8a04" stroke-width="0.8"/>
      </g>
      <g transform="translate(${WIDTH - 36}, ${(baseTopY + 33 + getClothWave(WIDTH - 36, frameIndex).dy).toFixed(1)})">
        <circle cx="0" cy="0" r="19" fill="#78350f" stroke="url(#goldTrimGrad)" stroke-width="2.5" filter="url(#textGlow)"/>
        <circle cx="0" cy="0" r="16" fill="url(#goldTrimGrad)"/>
        <circle cx="0" cy="0" r="13" fill="#991b1b" stroke="#fef08a" stroke-width="1"/>
        <polygon points="0,-9 2.5,-3 8.5,-3 4,1 5.8,7 0,3.5 -5.8,7 -4,1 -8.5,-3 -2.5,-3" fill="#fffbeb" stroke="#ca8a04" stroke-width="0.8"/>
      </g>
      ` : ''}

      ${theme.name.includes('vinh_quang') || theme.name.includes('tu_hao') || theme.name.includes('non_song') ? `
      <!-- 💎 ARCHETYPE 2: High Jewelry Diamond Pavé & Ruby Brooch -->
      <g transform="translate(38, ${(baseTopY + 33 + getClothWave(38, frameIndex).dy).toFixed(1)})">
        <polygon points="0,-16 15,0 0,16 -15,0" fill="#e11d48" stroke="url(#goldTrimGrad)" stroke-width="2" filter="url(#textGlow)"/>
        <polygon points="0,-10 9,0 0,10 -9,0" fill="#fffbeb" opacity="0.9"/>
        <circle cx="0" cy="0" r="3.5" fill="#991b1b"/>
      </g>
      <g transform="translate(${WIDTH - 38}, ${(baseTopY + 33 + getClothWave(WIDTH - 38, frameIndex).dy).toFixed(1)})">
        <polygon points="0,-16 15,0 0,16 -15,0" fill="#e11d48" stroke="url(#goldTrimGrad)" stroke-width="2" filter="url(#textGlow)"/>
        <polygon points="0,-10 9,0 0,10 -9,0" fill="#fffbeb" opacity="0.9"/>
        <circle cx="0" cy="0" r="3.5" fill="#991b1b"/>
      </g>
      ` : ''}

      ${theme.name.includes('ngoi_sao') || theme.name.includes('dai_le') || theme.name.includes('hoa_binh') ? `
      <!-- 🌿 ARCHETYPE 3: Golden Laurel Wreath of Victory & 24K Star -->
      <g transform="translate(36, ${(baseTopY + 33 + getClothWave(36, frameIndex).dy).toFixed(1)})">
        <circle cx="0" cy="0" r="17" fill="none" stroke="url(#goldTrimGrad)" stroke-width="2.2" stroke-dasharray="4,2"/>
        <polygon points="0,-11 3,-3.5 11,-3.5 5,1.5 7,9 0,4.5 -7,9 -5,1.5 -11,-3.5 -3,-3.5" fill="#fde047" stroke="#b45309" stroke-width="0.8"/>
      </g>
      <g transform="translate(${WIDTH - 36}, ${(baseTopY + 33 + getClothWave(WIDTH - 36, frameIndex).dy).toFixed(1)})">
        <circle cx="0" cy="0" r="17" fill="none" stroke="url(#goldTrimGrad)" stroke-width="2.2" stroke-dasharray="4,2"/>
        <polygon points="0,-11 3,-3.5 11,-3.5 5,1.5 7,9 0,4.5 -7,9 -5,1.5 -11,-3.5 -3,-3.5" fill="#fde047" stroke="#b45309" stroke-width="0.8"/>
      </g>
      ` : ''}

      ${theme.name.includes('ky_nguyen') || theme.name.includes('y_chi') ? `
      <!-- 🚀 ARCHETYPE 4: Futuristic Hypercar Carbon Bevel & Holographic Laser Trim -->
      <g transform="translate(34, ${(baseTopY + 33 + getClothWave(34, frameIndex).dy).toFixed(1)})">
        <polygon points="-12,-16 16,-16 12,16 -16,16" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8"/>
        <line x1="-8" y1="-12" x2="8" y2="12" stroke="#38bdf8" stroke-width="1" opacity="0.6"/>
        <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#38bdf8"/>
      </g>
      <g transform="translate(${WIDTH - 34}, ${(baseTopY + 33 + getClothWave(WIDTH - 34, frameIndex).dy).toFixed(1)})">
        <polygon points="-16,-16 12,-16 16,16 -12,16" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8"/>
        <line x1="-8" y1="-12" x2="8" y2="12" stroke="#38bdf8" stroke-width="1" opacity="0.6"/>
        <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#38bdf8"/>
      </g>
      ` : ''}
    </svg>
  `;
}

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 85, loopCount = 0) {
  const anmfChunks = [];

  for (const frameBuf of frameWebpBuffers) {
    let pos = 12; // Skip 'RIFF' + size + 'WEBP'
    const payloads = [];

    while (pos < frameBuf.length) {
      const fourcc = frameBuf.toString('latin1', pos, pos + 4);
      const size = frameBuf.readUInt32LE(pos + 4);
      const chunkSize = 8 + size + (size % 2);

      if (fourcc === 'VP8L' || fourcc === 'VP8 ' || fourcc === 'ALPH') {
        payloads.push(frameBuf.subarray(pos, pos + chunkSize));
      }
      pos += chunkSize;
    }

    const payloadBuffer = Buffer.concat(payloads);

    const anmfHeader = Buffer.alloc(16);
    writeUInt24LE(anmfHeader, 0, 0); // frameX = 0
    writeUInt24LE(anmfHeader, 0, 3); // frameY = 0
    writeUInt24LE(anmfHeader, WIDTH - 1, 6); // width - 1
    writeUInt24LE(anmfHeader, HEIGHT - 1, 9); // height - 1
    writeUInt24LE(anmfHeader, delayMs, 12); // duration
    anmfHeader[15] = 0x02; // Flags: dispose to background

    const anmfData = Buffer.concat([anmfHeader, payloadBuffer]);
    const anmfChunkHeader = Buffer.alloc(8);
    anmfChunkHeader.write('ANMF', 0, 4, 'latin1');
    anmfChunkHeader.writeUInt32LE(anmfData.length, 4);

    const padByte = (anmfData.length % 2 !== 0) ? Buffer.alloc(1) : Buffer.alloc(0);
    anmfChunks.push(Buffer.concat([anmfChunkHeader, anmfData, padByte]));
  }

  // VP8X Chunk
  const vp8xData = Buffer.alloc(10);
  vp8xData[0] = 0x12; // Animation | Alpha
  writeUInt24LE(vp8xData, WIDTH - 1, 4);
  writeUInt24LE(vp8xData, HEIGHT - 1, 7);

  const vp8xChunk = Buffer.alloc(18);
  vp8xChunk.write('VP8X', 0, 4, 'latin1');
  vp8xChunk.writeUInt32LE(10, 4);
  vp8xData.copy(vp8xChunk, 8);

  // ANIM Chunk
  const animData = Buffer.alloc(6);
  animData.writeUInt32LE(0x00000000, 0);
  animData.writeUInt16LE(loopCount, 4);

  const animChunk = Buffer.alloc(14);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animData.copy(animChunk, 8);

  const allBodyChunks = Buffer.concat([vp8xChunk, animChunk, ...anmfChunks]);
  const fileSize = 4 + allBodyChunks.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(fileSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, allBodyChunks]);
}

async function buildAnimatedWebP(theme) {
  const singleWebpBuffers = [];

  for (let i = 0; i < FRAMES; i++) {
    const svg = generateWavySilkSVG(theme, i);
    const webpBuf = await sharp(Buffer.from(svg))
      .webp({ quality: 92, alphaQuality: 95, lossless: false })
      .toBuffer();
    singleWebpBuffers.push(webpBuf);
  }

  const animWebpBuffer = muxAnimatedWebP(singleWebpBuffers, DELAY, 0);

  const targetPath = path.join(__dirname, '..', 'pictures', `${theme.name}.webp`);
  const publicPath = path.join(__dirname, '..', 'public', 'assets', `${theme.name}.webp`);

  fs.writeFileSync(targetPath, animWebpBuffer);

  if (!fs.existsSync(path.dirname(publicPath))) {
    fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  }
  fs.writeFileSync(publicPath, animWebpBuffer);

  const stats = fs.statSync(targetPath);
  console.log(`🌊 Generated WAVING SILK ${theme.name}.webp (${(stats.size / 1024).toFixed(1)} KB, 24 frames, fluid wave)`);
}

async function run() {
  console.log('🚀 Rendering 3D Waving Silk Ribbons (Cloth Wave Simulation)...');
  for (const theme of THEMES) {
    await buildAnimatedWebP(theme);
  }
  console.log('🎉 All 3D waving silk ribbons created successfully!');
}

run().catch(console.error);


