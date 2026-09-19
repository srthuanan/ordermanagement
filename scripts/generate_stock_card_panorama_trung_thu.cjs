const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn Panorama: 2560 x 1440 px
const WIDTH = 2560;
const HEIGHT = 1440;

function createPanoramaSvg() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Linear Gradient: Tone trắng sứ sang trọng, ánh vàng trăng rằm ấm áp -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCFDFF"/>
      <stop offset="35%" stop-color="#F8FAFD"/>
      <stop offset="70%" stop-color="#FFFDF7"/>
      <stop offset="100%" stop-color="#FDFBF2"/>
    </linearGradient>

    <!-- Quầng sáng Vầng Trăng đại nguyệt siêu thực -->
    <radialGradient id="moonAuraHuge" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.5"/>
      <stop offset="40%" stop-color="#FEF9C3" stop-opacity="0.28"/>
      <stop offset="75%" stop-color="#FEF08A" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#FEF08A" stop-opacity="0"/>
    </radialGradient>

    <!-- Thân Vầng Trăng Hoàng Kim dịu mát -->
    <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="25%" stop-color="#FEFCE8"/>
      <stop offset="70%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#FDE047"/>
    </linearGradient>

    <!-- Vệt bóng trăng sương mờ cổ tích -->
    <linearGradient id="moonCraterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EAB308" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#CA8A04" stop-opacity="0.08"/>
    </linearGradient>

    <!-- Đèn lồng Quả trám đỏ san hô pastel -->
    <linearGradient id="lanternRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCA5A5"/>
      <stop offset="50%" stop-color="#F87171"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>

    <!-- Đèn lồng vàng hoàng kim ấm -->
    <linearGradient id="lanternGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>

    <!-- Đèn lồng tím hồng hoa sen pastel -->
    <linearGradient id="lanternLotusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBCFE8"/>
      <stop offset="50%" stop-color="#F472B6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>

    <!-- Đèn lồng ngọc bích pastel -->
    <linearGradient id="lanternJadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A7F3D0"/>
      <stop offset="50%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>

    <!-- Quầng sáng đèn lồng tỏa nhẹ -->
    <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>

    <!-- Mây tơ thủy mặc uyển chuyển -->
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F1F5F9" stop-opacity="0"/>
      <stop offset="25%" stop-color="#FEF9C3" stop-opacity="0.4"/>
      <stop offset="75%" stop-color="#FEE2E2" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#F1F5F9" stop-opacity="0"/>
    </linearGradient>

    <!-- Mặt nước hồ sông Hoài êm đềm -->
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC" stop-opacity="0"/>
      <stop offset="35%" stop-color="#F1F5F9" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#E2E8F0" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Cánh hoa sen thả đăng -->
    <linearGradient id="petalGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#F472B6" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#FBCFE8" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.95"/>
    </linearGradient>
  </defs>

  <!-- 1. NỀN CHỦ ĐẠO -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>

  <!-- 2. VẦNG TRĂNG RẰM ĐẠI NGUYỆT Ở GÓC TRÊN BÊN PHẢI (Hạ thấp xuống cy=400 để luôn nằm gọn trong hàng card trên cùng) -->
  <circle cx="2180" cy="400" r="440" fill="url(#moonAuraHuge)"/>
  <circle cx="2180" cy="400" r="260" fill="url(#moonAuraHuge)" opacity="0.85"/>
  <circle cx="2180" cy="400" r="145" fill="url(#moonGrad)" filter="drop-shadow(0 0 45px rgba(254, 240, 138, 0.65))"/>

  <!-- Họa tiết đốm trăng dịu nhẹ -->
  <path d="M 2140,345 Q 2165,325 2195,350 T 2225,390 Q 2210,435 2165,440 T 2120,410 Z" fill="url(#moonCraterGrad)"/>
  <circle cx="2235" cy="360" r="22" fill="url(#moonCraterGrad)"/>
  <circle cx="2135" cy="425" r="18" fill="url(#moonCraterGrad)"/>

  <!-- 3. CÁC DẢI MÂY TƠ THỦY MẶC VẮT QUA (TRẢI ĐỀU TỪ TRÁI SANG PHẢI Ở TẦNG TRUNG KHÔNG) -->
  <g opacity="0.85">
    <path d="M 1700,440 C 1850,400 1980,460 2120,430 C 2260,400 2380,450 2560,420 C 2430,470 2280,450 2150,470 C 2000,490 1880,460 1700,440 Z" fill="url(#cloudGrad)"/>
    <path d="M 1820,500 C 1950,470 2060,520 2200,490 C 2340,460 2480,510 2560,490 C 2450,530 2320,500 2180,520 C 2050,540 1940,510 1820,500 Z" fill="url(#cloudGrad)" opacity="0.7"/>
    <path d="M 850,340 C 1020,300 1180,360 1340,325 C 1500,295 1650,350 1820,315 C 1670,365 1520,340 1380,360 C 1220,380 1080,355 850,340 Z" fill="url(#cloudGrad)" opacity="0.6"/>
    <path d="M 50,300 C 220,260 380,320 540,285 C 700,255 850,310 1020,275 C 870,325 720,300 580,320 C 420,340 280,315 50,300 Z" fill="url(#cloudGrad)" opacity="0.55"/>
  </g>

  <!-- 4. CHIM HẠC / ÉN VÀNG BAY VỀ PHÍA TRĂNG -->
  <g fill="#D97706" opacity="0.4">
    <path d="M 1520,420 C 1545,405 1570,412 1595,402 C 1580,415 1568,422 1560,432 C 1575,438 1590,436 1608,432 C 1585,444 1565,444 1552,436 C 1540,445 1530,448 1515,444 C 1522,436 1522,428 1520,420 Z"/>
    <path d="M 1250,360 C 1272,347 1295,353 1317,344 C 1303,355 1293,361 1286,370 C 1299,375 1312,373 1328,370 C 1307,380 1290,380 1278,373 C 1267,381 1258,383 1245,380 C 1251,373 1251,366 1250,360 Z" transform="scale(0.85) translate(220, 20)"/>
    <path d="M 980,410 C 1000,398 1020,403 1040,395 C 1028,405 1018,411 1012,419 C 1024,424 1036,422 1050,419 C 1032,429 1016,429 1005,422 C 995,429 987,431 975,428 C 981,422 981,416 980,410 Z" transform="scale(0.7) translate(420, 70)"/>
  </g>

  <!-- 5. DÂY LỒNG ĐÈN HỘI AN (HẠ THẤP XUỐNG y=170 ĐỂ HIỆN RÕ Ở ĐẦU THẺ XE HÀNG 1) -->
  <!-- Dây tơ uốn lượn liên tục buông từ trên cao -->
  <path d="M -30,140 Q 150,200 320,155 T 640,165 T 960,150 T 1280,170 T 1600,153 T 1920,167 T 2240,150 T 2580,160" fill="none" stroke="#D97706" stroke-width="1.2" opacity="0.35"/>

  <!-- Đèn 1 (x=120, y=170): Quả trám đỏ san hô -->
  <g transform="translate(120, 170)" opacity="0.92">
    <line x1="0" y1="-35" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="35" r="45" fill="url(#lanternGlow)"/>
    <rect x="-12" y="-3" width="24" height="6" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-10" y="62" width="20" height="6" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 22,16 22,46 0,65 C -22,46 -22,16 0,0 Z" fill="url(#lanternRedGrad)"/>
    <path d="M 0,0 C 10,16 10,46 0,65 C -10,46 -10,16 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,68 L 0,105 M -3,68 L -2,100 M 3,68 L 2,100" stroke="#F59E0B" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- Đèn 2 (x=380, y=165): Đèn tròn vàng hoàng kim -->
  <g transform="translate(380, 165)" opacity="0.92">
    <line x1="0" y1="-30" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="28" r="45" fill="url(#lanternGlow)"/>
    <rect x="-12" y="-2" width="24" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-10" y="54" width="20" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <ellipse cx="0" cy="28" rx="26" ry="28" fill="url(#lanternGoldGrad)"/>
    <ellipse cx="0" cy="28" rx="13" ry="28" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <line x1="0" y1="0" x2="0" y2="56" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <path d="M 0,58 L 0,95 M -3,58 L -2,90 M 3,58 L 2,90" stroke="#D97706" stroke-width="1.2" opacity="0.7"/>
  </g>

  <!-- Đèn 3 (x=650, y=175): Đèn hoa sen tím hồng pastel -->
  <g transform="translate(650, 175)" opacity="0.9">
    <line x1="0" y1="-35" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="30" r="42" fill="url(#lanternGlow)"/>
    <rect x="-11" y="-2" width="22" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-9" y="58" width="18" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 22,15 22,44 0,60 C -22,44 -22,15 0,0 Z" fill="url(#lanternLotusGrad)"/>
    <path d="M 0,0 C 10,15 10,44 0,60 C -10,44 -10,15 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,63 L 0,98 M -3,63 L -2,93 M 3,63 L 2,93" stroke="#F472B6" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- Đèn 4 (x=920, y=160): Đèn quả trám vàng cam Hội An -->
  <g transform="translate(920, 160)" opacity="0.92">
    <line x1="0" y1="-30" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="30" r="42" fill="url(#lanternGlow)"/>
    <rect x="-11" y="-2" width="22" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-9" y="58" width="18" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 22,15 22,44 0,60 C -22,44 -22,15 0,0 Z" fill="url(#lanternGoldGrad)"/>
    <path d="M 0,0 C 10,15 10,44 0,60 C -10,44 -10,15 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,63 L 0,98 M -3,63 L -2,93 M 3,63 L 2,93" stroke="#F59E0B" stroke-width="1.2" opacity="0.7"/>
  </g>

  <!-- Đèn 5 (x=1180, y=172): Đèn tròn ngọc bích pastel -->
  <g transform="translate(1180, 172)" opacity="0.9">
    <line x1="0" y1="-32" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="28" r="42" fill="url(#lanternGlow)"/>
    <rect x="-11" y="-2" width="22" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-9" y="54" width="18" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <ellipse cx="0" cy="28" rx="25" ry="27" fill="url(#lanternJadeGrad)"/>
    <ellipse cx="0" cy="28" rx="12" ry="27" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <line x1="0" y1="0" x2="0" y2="55" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <path d="M 0,58 L 0,94 M -3,58 L -2,90 M 3,58 L 2,90" stroke="#059669" stroke-width="1.2" opacity="0.7"/>
  </g>

  <!-- Đèn 6 (x=1440, y=165): Đèn quả trám đỏ san hô -->
  <g transform="translate(1440, 165)" opacity="0.92">
    <line x1="0" y1="-30" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="30" r="42" fill="url(#lanternGlow)"/>
    <rect x="-11" y="-2" width="22" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-9" y="58" width="18" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 22,15 22,44 0,60 C -22,44 -22,15 0,0 Z" fill="url(#lanternRedGrad)"/>
    <path d="M 0,0 C 10,15 10,44 0,60 C -10,44 -10,15 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,63 L 0,98 M -3,63 L -2,93 M 3,63 L 2,93" stroke="#F59E0B" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- Đèn 7 (x=1720, y=168): Đèn tròn vàng ấm -->
  <g transform="translate(1720, 168)" opacity="0.92">
    <line x1="0" y1="-32" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="28" r="42" fill="url(#lanternGlow)"/>
    <rect x="-11" y="-2" width="22" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-9" y="54" width="18" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <ellipse cx="0" cy="28" rx="25" ry="27" fill="url(#lanternGoldGrad)"/>
    <ellipse cx="0" cy="28" rx="12" ry="27" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <line x1="0" y1="0" x2="0" y2="55" stroke="#FFFFFF" stroke-width="0.8" opacity="0.4"/>
    <path d="M 0,58 L 0,94 M -3,58 L -2,90 M 3,58 L 2,90" stroke="#D97706" stroke-width="1.2" opacity="0.7"/>
  </g>

  <!-- Đèn 8 (x=1980, y=158): Đèn hoa sen tím hồng pastel -->
  <g transform="translate(1980, 158)" opacity="0.9">
    <line x1="0" y1="-28" x2="0" y2="0" stroke="#B45309" stroke-width="1" opacity="0.6"/>
    <circle cx="0" cy="28" r="40" fill="url(#lanternGlow)"/>
    <rect x="-10" y="-2" width="20" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <rect x="-8" y="54" width="16" height="5" rx="2" fill="#78350F" opacity="0.75"/>
    <path d="M 0,0 C 20,14 20,40 0,56 C -20,40 -20,14 0,0 Z" fill="url(#lanternLotusGrad)"/>
    <path d="M 0,0 C 9,14 9,40 0,56 C -9,40 -9,14 0,0 Z" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.45"/>
    <path d="M 0,58 L 0,92 M -3,58 L -2,88 M 3,58 L 2,88" stroke="#F472B6" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- 6. PHẦN DƯỚI: MẶT NƯỚC SÔNG HOÀI & HOA ĐĂNG THẢ TRÔI (TRẢI ĐỀU KHẮP ĐÁY TRANH) -->
  <rect x="0" y="1120" width="${WIDTH}" height="320" fill="url(#waterGrad)"/>

  <!-- Sóng nước uốn lượn -->
  <g fill="none" stroke="#CBD5E1" stroke-width="1.2" opacity="0.6">
    <path d="M 0,1230 C 250,1215 500,1245 750,1230 C 1000,1215 1250,1245 1500,1230 C 1750,1215 2000,1245 2250,1230 T 2560,1235"/>
    <path d="M 80,1290 C 350,1275 620,1305 900,1290 C 1180,1275 1450,1305 1720,1290 C 2000,1275 2280,1305 2560,1295" stroke="#E2E8F0" opacity="0.75"/>
    <path d="M 0,1350 C 300,1335 600,1365 900,1350 C 1200,1335 1500,1365 1800,1350 C 2100,1335 2400,1365 2560,1355" opacity="0.45"/>
  </g>

  <!-- Hoa đăng 1 (x=200) -->
  <g transform="translate(200, 1250)" opacity="0.88">
    <ellipse cx="0" cy="14" rx="38" ry="11" fill="url(#lanternGlow)" opacity="0.65"/>
    <path d="M -20,7 C -16,-5 -5,-15 0,-18 C 5,-15 16,-5 20,7 Z" fill="url(#petalGrad)"/>
    <path d="M -26,9 C -20,0 -10,-7 -2,-11 C -5,2 -14,7 -26,9 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <path d="M 26,9 C 20,0 10,-7 2,-11 C 5,2 14,7 26,9 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <ellipse cx="0" cy="9" rx="15" ry="5" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="0" cy="0" rx="3.5" ry="6" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2.2" fill="#FFFFFF"/>
  </g>

  <!-- Hoa đăng 2 (x=600) -->
  <g transform="translate(600, 1310)" opacity="0.85">
    <ellipse cx="0" cy="14" rx="35" ry="10" fill="url(#lanternGlow)" opacity="0.6"/>
    <path d="M -18,6 C -14,-5 -5,-14 0,-17 C 5,-14 14,-5 18,6 Z" fill="url(#petalGrad)"/>
    <path d="M -24,8 C -18,0 -10,-6 -2,-10 C -5,2 -14,6 -24,8 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <path d="M 24,8 C 18,0 10,-6 2,-10 C 5,2 14,6 24,8 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <ellipse cx="0" cy="8" rx="13" ry="5" fill="#F472B6" opacity="0.5"/>
    <ellipse cx="0" cy="0" rx="3.5" ry="6" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2" fill="#FFFFFF"/>
  </g>

  <!-- Hoa đăng 3 (x=1050) -->
  <g transform="translate(1050, 1260)" opacity="0.88">
    <ellipse cx="0" cy="14" rx="38" ry="11" fill="url(#lanternGlow)" opacity="0.65"/>
    <path d="M -20,7 C -16,-5 -5,-15 0,-18 C 5,-15 16,-5 20,7 Z" fill="url(#petalGrad)"/>
    <path d="M -26,9 C -20,0 -10,-7 -2,-11 C -5,2 -14,7 -26,9 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <path d="M 26,9 C 20,0 10,-7 2,-11 C 5,2 14,7 26,9 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <ellipse cx="0" cy="9" rx="15" ry="5" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="0" cy="0" rx="3.5" ry="6" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2.2" fill="#FFFFFF"/>
  </g>

  <!-- Hoa đăng 4 (x=1500) -->
  <g transform="translate(1500, 1315)" opacity="0.85">
    <ellipse cx="0" cy="14" rx="36" ry="10" fill="url(#lanternGlow)" opacity="0.6"/>
    <path d="M -18,6 C -14,-5 -5,-14 0,-17 C 5,-14 14,-5 18,6 Z" fill="url(#petalGrad)"/>
    <path d="M -24,8 C -18,0 -10,-6 -2,-10 C -5,2 -14,6 -24,8 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <path d="M 24,8 C 18,0 10,-6 2,-10 C 5,2 14,6 24,8 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <ellipse cx="0" cy="8" rx="13" ry="5" fill="#F472B6" opacity="0.5"/>
    <ellipse cx="0" cy="0" rx="3.5" ry="6" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2" fill="#FFFFFF"/>
  </g>

  <!-- Hoa đăng 5 (x=1950) -->
  <g transform="translate(1950, 1270)" opacity="0.9">
    <ellipse cx="0" cy="16" rx="44" ry="13" fill="url(#lanternGlow)" opacity="0.7"/>
    <path d="M -22,8 C -18,-6 -6,-16 0,-20 C 6,-16 18,-6 22,8 Z" fill="url(#petalGrad)"/>
    <path d="M -28,10 C -22,0 -12,-8 -2,-12 C -6,2 -16,8 -28,10 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <path d="M 28,10 C 22,0 12,-8 2,-12 C 6,2 16,8 28,10 Z" fill="url(#petalGrad)" opacity="0.9"/>
    <ellipse cx="0" cy="10" rx="16" ry="6" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="0" cy="0" rx="4" ry="7" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2.5" fill="#FFFFFF"/>
  </g>

  <!-- Hoa đăng 6 (x=2350) -->
  <g transform="translate(2350, 1310)" opacity="0.86">
    <ellipse cx="0" cy="14" rx="36" ry="10" fill="url(#lanternGlow)" opacity="0.6"/>
    <path d="M -18,6 C -14,-5 -5,-14 0,-17 C 5,-14 14,-5 18,6 Z" fill="url(#petalGrad)"/>
    <path d="M -24,8 C -18,0 -10,-6 -2,-10 C -5,2 -14,6 -24,8 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <path d="M 24,8 C 18,0 10,-6 2,-10 C 5,2 14,6 24,8 Z" fill="url(#petalGrad)" opacity="0.85"/>
    <ellipse cx="0" cy="8" rx="13" ry="5" fill="#F472B6" opacity="0.5"/>
    <ellipse cx="0" cy="0" rx="3.5" ry="6" fill="#FEF08A"/>
    <circle cx="0" cy="-2" r="2" fill="#FFFFFF"/>
  </g>

  <!-- 7. VÀI NGÔI SAO HOÀNG KIM NHẸ TRÊN BẦU TRỜI -->
  <g fill="#EAB308" opacity="0.38">
    <path d="M 350,380 Q 350,388 358,388 Q 350,388 350,396 Q 350,388 342,388 Q 350,388 350,380 Z"/>
    <path d="M 750,320 Q 750,327 757,327 Q 750,327 750,334 Q 750,327 743,327 Q 750,327 750,320 Z"/>
    <path d="M 1150,280 Q 1150,287 1157,287 Q 1150,287 1150,294 Q 1150,287 1143,287 Q 1150,287 1150,280 Z"/>
    <path d="M 1620,340 Q 1620,347 1627,347 Q 1620,347 1620,354 Q 1620,347 1613,347 Q 1620,347 1620,340 Z"/>
    <path d="M 1980,280 Q 1980,288 1988,288 Q 1980,288 1980,296 Q 1980,288 1972,288 Q 1980,288 1980,280 Z"/>
    <path d="M 2420,310 Q 2420,317 2427,317 Q 2420,317 2420,324 Q 2420,317 2413,317 Q 2420,317 2420,310 Z"/>
  </g>
</svg>
  `;
}

async function main() {
  console.log('--- ĐANG TẠO BỨC TRANH PANORAMA CÂN ĐỐI VỚI VIEWPORT (2560x1440) ---');
  const svg = createPanoramaSvg();
  const outputPath = path.resolve(__dirname, '../pictures/stock_card_panorama_trung_thu.webp');

  const buffer = await sharp(Buffer.from(svg))
    .webp({ quality: 92, lossless: false, effort: 6 })
    .toBuffer();

  fs.writeFileSync(outputPath, buffer);
  console.log(`Đã xuất thành công bức tranh Panorama tại: ${outputPath}`);
  console.log(`Dung lượng file WebP: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Lỗi khi tạo ảnh Panorama:', err);
  process.exit(1);
});
