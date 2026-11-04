const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// ==============================================================================
// 1. ADD CSS KEYFRAMES FOR FLOWING WATER CURRENT AND DRIFTING HOA ĐĂNG
// ==============================================================================
const flowingWaterAndDriftingLanternsCss = `
                /* ============================================================================== */
                /* HIỆU ỨNG DÒNG NƯỚC SÔNG HOÀI CHẢY & HOA ĐĂNG TRÔI LƠ LỬNG THEO DÒNG NƯỚC       */
                /* ============================================================================== */

                /* 1. DÒNG CHẢY SÓNG NƯỚC SÔNG HOÀI (CUỒN CUỘN TRÔI MƯỢT MÀ TỪ TRÁI QUA PHẢI) */
                @keyframes hoian-water-current-1 {
                    0% { transform: translateX(-480px); }
                    100% { transform: translateX(0px); }
                }
                @keyframes hoian-water-current-2 {
                    0% { transform: translateX(-360px); }
                    100% { transform: translateX(0px); }
                }
                @keyframes hoian-water-current-3 {
                    0% { transform: translateX(-240px); }
                    100% { transform: translateX(0px); }
                }
                @keyframes hoian-water-swell {
                    0%, 100% { transform: translateY(0px) scaleY(1); }
                    50% { transform: translateY(-3.5px) scaleY(1.05); }
                }
                .animate-water-current-1 { animation: hoian-water-current-1 16s linear infinite; }
                .animate-water-current-2 { animation: hoian-water-current-2 22s linear infinite; }
                .animate-water-current-3 { animation: hoian-water-current-3 28s linear infinite; }
                .animate-water-swell { animation: hoian-water-swell 4.5s ease-in-out infinite; }

                /* 2. HOA ĐĂNG TRÔI DỌC THEO DÒNG NƯỚC (TRANSLATE X TỪ THƯỢNG LƯU RA HẠ LƯU) */
                /* Làn 1: Thượng lưu bờ kè (trôi êm đềm, xa) */
                @keyframes hoian-hoa-dang-drift-lane1 {
                    0% { transform: translate(-140px, 0px); }
                    25% { transform: translate(400px, 4px); }
                    50% { transform: translate(960px, -2px); }
                    75% { transform: translate(1500px, 3px); }
                    100% { transform: translate(2080px, 0px); }
                }
                /* Làn 2: Giữa dòng xa */
                @keyframes hoian-hoa-dang-drift-lane2 {
                    0% { transform: translate(-140px, 0px); }
                    30% { transform: translate(500px, -5px); }
                    55% { transform: translate(1050px, 4px); }
                    80% { transform: translate(1600px, -3px); }
                    100% { transform: translate(2080px, 0px); }
                }
                /* Làn 3: Giữa dòng gần */
                @keyframes hoian-hoa-dang-drift-lane3 {
                    0% { transform: translate(-150px, 0px); }
                    35% { transform: translate(620px, 5px); }
                    65% { transform: translate(1200px, -4px); }
                    100% { transform: translate(2090px, 0px); }
                }
                /* Làn 4: Tiền cảnh cận cảnh */
                @keyframes hoian-hoa-dang-drift-lane4 {
                    0% { transform: translate(-160px, 0px); }
                    40% { transform: translate(750px, -6px); }
                    70% { transform: translate(1350px, 5px); }
                    100% { transform: translate(2100px, 0px); }
                }

                /* 3. ĐỘNG TÁC LƠ LỬNG & DẬP DỀNH THEO NHỊP SÓNG (BOBBING & TILTING) */
                @keyframes hoian-hoa-dang-bob-1 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    30% { transform: translateY(-3.8px) rotate(2deg); }
                    70% { transform: translateY(2.2px) rotate(-1.8deg); }
                }
                @keyframes hoian-hoa-dang-bob-2 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    35% { transform: translateY(-4.2px) rotate(-2.2deg); }
                    65% { transform: translateY(2.8px) rotate(2.4deg); }
                }
                @keyframes hoian-hoa-dang-bob-3 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    40% { transform: translateY(-4.8px) rotate(2.6deg); }
                    75% { transform: translateY(3.2px) rotate(-2deg); }
                }
                @keyframes hoian-hoa-dang-bob-4 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    32% { transform: translateY(-5.5px) rotate(-3deg); }
                    68% { transform: translateY(3.8px) rotate(2.8deg); }
                }
                .animate-hoa-dang-bob-1 { animation: hoian-hoa-dang-bob-1 3.4s ease-in-out infinite; }
                .animate-hoa-dang-bob-2 { animation: hoian-hoa-dang-bob-2 4.0s ease-in-out infinite 0.7s; }
                .animate-hoa-dang-bob-3 { animation: hoian-hoa-dang-bob-3 3.6s ease-in-out infinite 1.3s; }
                .animate-hoa-dang-bob-4 { animation: hoian-hoa-dang-bob-4 4.4s ease-in-out infinite 1.8s; }
`;

// Replace old static hoa dang keyframes in style tag
const oldHoaDangAnimMarker = '@keyframes hoian-hoa-dang-float-1 {';
const oldHoaDangAnimEndMarker = '.animate-water-shimmer {';
const endShimmerClose = code.indexOf('}', code.indexOf(oldHoaDangAnimEndMarker)) + 1;

if (code.includes(oldHoaDangAnimMarker) && endShimmerClose > 0) {
  const sIdx = code.indexOf(oldHoaDangAnimMarker);
  code = code.substring(0, sIdx) + flowingWaterAndDriftingLanternsCss.trim() + '\n\n                ' + code.substring(endShimmerClose);
  console.log('Successfully updated CSS with flowing water & drifting hoa dang keyframes!');
} else {
  console.log('Warning: could not locate old hoa dang keyframes, appending to styles');
  code = code.replace('.animate-steam {', flowingWaterAndDriftingLanternsCss.trim() + '\n\n                .animate-steam {');
}

// ==============================================================================
// 2. GENERATE CONTINUOUS FLOWING RIVER CURRENT PATHS (SÔNG HOÀI SÓNG NƯỚC CHẢY)
// ==============================================================================
// To make waves seamless, wavelength W = 240px.
// Total range x: -480 to 2400 (12 cycles = 2880px).
function generateWavePath(yBase, amp, wavelength = 240) {
  let path = `M -480,${yBase}`;
  const halfW = wavelength / 2;
  for (let x = -480; x < 2400; x += wavelength) {
    path += ` Q ${x + halfW / 2},${(yBase + amp).toFixed(1)} ${x + halfW},${yBase} Q ${x + halfW * 1.5},${(yBase - amp).toFixed(1)} ${x + wavelength},${yBase}`;
  }
  return path;
}

const newSongHoaiFluid = `
<g id="song-hoai-fluid">
        {/* Nền nước phẳng sâu thẳm phản chiếu vòm trời & phố cổ */}
        <rect x="0" y="560" width="1920" height="520" fill="url(#riverGrad)" />
        
        {/* Vầng hào quang phản chiếu ánh trăng vàng & dãy đèn lồng phố cổ */}
        <ellipse cx="960" cy="660" rx="800" ry="180" fill="url(#riverAura)" />
        <ellipse cx="260" cy="640" rx="300" ry="100" fill="url(#riverAura)" opacity="0.6" />
        <ellipse cx="1640" cy="640" rx="320" ry="100" fill="url(#riverAura)" opacity="0.7" />

        {/* ====================================================================== */}
        {/* CÁC LỚP SÓNG DÒNG NƯỚC CHẢY CUỒN CUỘN VÔ TẬN TỪ TRÁI SANG PHẢI          */}
        {/* ====================================================================== */}
        
        {/* LỚP 1: DÒNG CHẢY BỜ BẮC (THƯỢNG LƯU Y: 575 - 635, VẬN TỐC 16S) */}
        <g className="animate-water-current-1" filter="url(#bloomSoft)">
            <path d="${generateWavePath(575, 4.0, 240)}" fill="none" stroke="#fef08a" strokeWidth="2.2" opacity="0.45" strokeLinecap="round" />
            <path d="${generateWavePath(598, 4.5, 240)}" fill="none" stroke="#fde047" strokeWidth="2.4" opacity="0.50" strokeLinecap="round" />
            <path d="${generateWavePath(625, 5.0, 240)}" fill="none" stroke="#f59e0b" strokeWidth="2.6" opacity="0.55" strokeLinecap="round" />
            {/* Vệt phản chiếu ánh lồng đèn đỏ hoa giấy trên bờ kè */}
            <path d="${generateWavePath(588, 3.5, 240)}" fill="none" stroke="#ef4444" strokeWidth="2.0" opacity="0.38" strokeLinecap="round" />
        </g>

        {/* LỚP 2: DÒNG CHẢY TRUNG LƯU (LÒNG SÔNG Y: 655 - 750, VẬN TỐC 22S) */}
        <g className="animate-water-current-2" filter="url(#bloomSoft)">
            <path d="${generateWavePath(658, 6.0, 240)}" fill="none" stroke="#d97706" strokeWidth="3.0" opacity="0.52" strokeLinecap="round" />
            <path d="${generateWavePath(698, 6.5, 240)}" fill="none" stroke="#f59e0b" strokeWidth="3.2" opacity="0.50" strokeLinecap="round" />
            <path d="${generateWavePath(745, 7.0, 240)}" fill="none" stroke="#fde047" strokeWidth="3.5" opacity="0.48" strokeLinecap="round" />
            {/* Ánh ngọc lam phản quang lòng sông sâu */}
            <path d="${generateWavePath(680, 5.5, 240)}" fill="none" stroke="#38bdf8" strokeWidth="2.2" opacity="0.32" strokeLinecap="round" />
        </g>

        {/* LỚP 3: DÒNG CHẢY HẠ LƯU & TIỀN CẢNH (Y: 800 - 1040, VẬN TỐC 28S) */}
        <g className="animate-water-current-3" filter="url(#bloomSoft)">
            <path d="${generateWavePath(802, 8.0, 240)}" fill="none" stroke="#fef08a" strokeWidth="3.8" opacity="0.45" strokeLinecap="round" />
            <path d="${generateWavePath(870, 9.0, 240)}" fill="none" stroke="#f59e0b" strokeWidth="4.2" opacity="0.42" strokeLinecap="round" />
            <path d="${generateWavePath(948, 10.0, 240)}" fill="none" stroke="#fde047" strokeWidth="4.5" opacity="0.38" strokeLinecap="round" />
            <path d="${generateWavePath(1035, 11.0, 240)}" fill="none" stroke="#fef08a" strokeWidth="4.8" opacity="0.35" strokeLinecap="round" />
            {/* Vệt phản chiếu ánh trăng vàng rực rỡ mặt sông gần */}
            <path d="${generateWavePath(890, 8.5, 240)}" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.35" strokeLinecap="round" />
        </g>
    </g>
`;

// Replace <g id="song-hoai-fluid">...</g>
const fluidStart = code.indexOf('<g id="song-hoai-fluid">');
const fluidEnd = code.indexOf('{/* ============================================================================== */}\n    {/* 12 CHIẾC THUYỀN');
if (fluidStart !== -1 && fluidEnd !== -1) {
  code = code.substring(0, fluidStart) + newSongHoaiFluid.trim() + '\n\n    ' + code.substring(fluidEnd);
  console.log('Successfully updated Sông Hoài fluid with flowing water currents!');
} else {
  console.error('Could not find song-hoai-fluid section boundaries!');
  process.exit(1);
}

// ==============================================================================
// 3. GENERATE 4 LANES OF DRIFTING & BOBBING HOA ĐĂNG (TRÔI LƠ LỬNG THEO DÒNG NƯỚC)
// ==============================================================================
// 6 Distinct Lantern Artworks (from authentic Hội An designs):
function getLanternSvg(type) {
  switch (type) {
    case 0: // Hoa Sen 3 Tầng
      return `
                <ellipse cx="0" cy="11" rx="24" ry="5.5" fill="#f43f5e" opacity="0.5" />
                <ellipse cx="0" cy="11" rx="12" ry="3" fill="#fef08a" opacity="0.65" />
                <ellipse cx="0" cy="7" rx="18" ry="5.5" fill="#047857" opacity="0.85" />
                <path d="M -18,3 Q -9,-12 0,-18 Q 9,-12 18,3 Z" fill="#f43f5e" opacity="0.9" />
                <path d="M -17,3 Q -22,-3 -12,-2 Z" fill="#e11d48" />
                <path d="M 17,3 Q 22,-3 12,-2 Z" fill="#e11d48" />
                <path d="M -11,4 Q -4,-8 0,-13 Q 4,-8 11,4 Z" fill="#fda4af" />
                <ellipse cx="0" cy="4" rx="5" ry="2" fill="#fef08a" />
                <ellipse cx="0" cy="-7" rx="3.6" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-6" r="1.6" fill="#ffffff" />`;
    case 1: // Thuyền Giấy Origami
      return `
                <ellipse cx="0" cy="11" rx="26" ry="5" fill="#f59e0b" opacity="0.45" />
                <ellipse cx="0" cy="11" rx="14" ry="2.8" fill="#fef08a" opacity="0.65" />
                <polygon points="-24,-2 -14,8 14,8 24,-2 18,1 -18,1" fill="#ea580c" />
                <polygon points="-24,-2 0,7 24,-2 15,7 -15,7" fill="#f59e0b" />
                <polygon points="-24,-2 0,-11 0,7 -24,-2" fill="#fbbf24" opacity="0.92" />
                <polygon points="24,-2 0,-11 0,7 24,-2" fill="#fef08a" opacity="0.82" />
                <rect x="-2" y="-5" width="4" height="8" rx="1" fill="#dc2626" />
                <ellipse cx="0" cy="-10" rx="3.5" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-9" r="1.6" fill="#ffffff" />`;
    case 2: // Hoa Cúc / Hoa Súng Tròn
      return `
                <ellipse cx="0" cy="10" rx="22" ry="5" fill="#06b6d4" opacity="0.45" />
                <ellipse cx="0" cy="10" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                <circle cx="0" cy="4" r="15" fill="#0284c7" opacity="0.85" />
                <path d="M 0,-14 L 4,-5 L 13,-6 L 6,0 L 11,8 L 3,5 L 0,13 L -3,5 L -11,8 L -6,0 L -13,-6 L -4,-5 Z" fill="#38bdf8" />
                <circle cx="0" cy="1" r="5.5" fill="#fef08a" />
                <ellipse cx="0" cy="-6" rx="3.5" ry="7" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-5" r="1.5" fill="#ffffff" />`;
    case 3: // Ngôi Sao 5 Cánh Trung Thu
      return `
                <ellipse cx="0" cy="11" rx="22" ry="5" fill="#ec4899" opacity="0.5" />
                <ellipse cx="0" cy="11" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                <polygon points="0,-16 4.5,-5 16,-5 7,2 10.5,13 0,6 -10.5,13 -7,2 -16,-5 -4.5,-5" fill="#dc2626" stroke="#f59e0b" strokeWidth="0.8" />
                <polygon points="0,-16 0,6 10.5,13" fill="#ef4444" />
                <polygon points="0,-16 0,6 7,2" fill="#f43f5e" />
                <polygon points="0,-16 0,6 -7,2" fill="#fb7185" />
                <circle cx="0" cy="0" r="4.5" fill="#fef08a" />
                <ellipse cx="0" cy="-5" rx="3.5" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-4" r="1.6" fill="#ffffff" />`;
    case 4: // Bát Giác Giấy Dán Cổ Truyền
      return `
                <ellipse cx="0" cy="11" rx="23" ry="5.2" fill="#c026d3" opacity="0.45" />
                <ellipse cx="0" cy="11" rx="12" ry="2.8" fill="#fef08a" opacity="0.65" />
                <polygon points="-16,0 -11,-9 11,-9 16,0 11,9 -11,9" fill="#701a75" stroke="#4a044e" strokeWidth="1" />
                <polygon points="-12,0 -8,-7 8,-7 12,0 8,7 -8,7" fill="#c026d3" opacity="0.9" />
                <polygon points="-8,0 -5,-5 5,-5 8,0 5,5 -5,5" fill="#f0abfc" opacity="0.85" />
                <ellipse cx="0" cy="-4" rx="3.5" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-3" r="1.6" fill="#ffffff" />`;
    case 5: // Búp Sen Hồng E Ấp
      return `
                <ellipse cx="0" cy="11" rx="22" ry="5" fill="#f59e0b" opacity="0.5" />
                <ellipse cx="0" cy="11" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                <path d="M 0,-18 C 12,-10 16,3 10,8 C 4,12 -4,12 -10,8 C -16,3 -12,-10 0,-18 Z" fill="#d97706" stroke="#92400e" strokeWidth="0.8" />
                <path d="M 0,-14 C 8,-8 11,2 7,6 C 3,9 -3,9 -7,6 C -11,2 -8,-8 0,-14 Z" fill="#fbbf24" />
                <path d="M 0,-10 Q 4,-3 0,4 Q -4,-3 0,-10 Z" fill="#fef08a" />
                <ellipse cx="0" cy="-7" rx="3.4" ry="7.2" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-6" r="1.5" fill="#ffffff" />`;
  }
}

// Lane specifications:
const LANES = [
  {
    name: 'LÀN 1: THƯỢNG LƯU BỜ KÈ (TRÔI ÊM ĐỀM XA XĂM, Y: 590 - 635)',
    animClass: 'hoian-hoa-dang-drift-lane1',
    bobClass: 'animate-hoa-dang-bob-1',
    duration: 72,
    count: 10,
    yBase: 610,
    yVar: [-18, 14, -8, 22, -14, 18, -6, 12, -16, 10],
    scaleBase: 0.60,
    scaleVar: [0.55, 0.65, 0.58, 0.68, 0.54, 0.66, 0.62, 0.58, 0.64, 0.56]
  },
  {
    name: 'LÀN 2: TRUNG LƯU LÒNG SÔNG 1 (GIỮA DÒNG XA, Y: 660 - 730)',
    animClass: 'hoian-hoa-dang-drift-lane2',
    bobClass: 'animate-hoa-dang-bob-2',
    duration: 56,
    count: 12,
    yBase: 690,
    yVar: [-25, 20, -15, 30, -20, 25, -10, 18, -22, 15, -12, 28],
    scaleBase: 0.90,
    scaleVar: [0.82, 0.98, 0.88, 1.04, 0.85, 0.95, 1.02, 0.86, 0.92, 1.00, 0.84, 0.96]
  },
  {
    name: 'LÀN 3: TRUNG LƯU LÒNG SÔNG 2 (GIỮA DÒNG GẦN, Y: 755 - 845)',
    animClass: 'hoian-hoa-dang-drift-lane3',
    bobClass: 'animate-hoa-dang-bob-3',
    duration: 44,
    count: 10,
    yBase: 800,
    yVar: [-30, 28, -20, 35, -25, 30, -15, 22, -28, 18],
    scaleBase: 1.30,
    scaleVar: [1.22, 1.38, 1.25, 1.45, 1.20, 1.35, 1.42, 1.26, 1.32, 1.40]
  },
  {
    name: 'LÀN 4: TIỀN CẢNH CẬN CẢNH (RỰC RỠ TRƯỚC MẮT, Y: 885 - 990)',
    animClass: 'hoian-hoa-dang-drift-lane4',
    bobClass: 'animate-hoa-dang-bob-4',
    duration: 36,
    count: 8,
    yBase: 935,
    yVar: [-40, 35, -25, 45, -35, 40, -20, 30],
    scaleBase: 1.65,
    scaleVar: [1.55, 1.78, 1.60, 1.85, 1.52, 1.75, 1.68, 1.82]
  }
];

let driftingHoaDangJsx = `
                {/* ============================================================================== */}
                {/* DẢI NGÂN HÀ HOA ĐĂNG TRÔI LƠ LỬNG BẬP BÙNG THEO DÒNG NƯỚC SÔNG HOÀI 4 LÀN LIÊN TỤC */}
                {/* ============================================================================== */}
                <g id="hoian-super-dense-hoa-dang-stream">
`;

LANES.forEach((lane, laneIdx) => {
  driftingHoaDangJsx += `
                    {/* -------------------------------------------------------------------------- */}
                    {/* ${lane.name} */}
                    {/* -------------------------------------------------------------------------- */}
                    <g id="hoa-dang-lane-${laneIdx + 1}">
`;
  for (let i = 0; i < lane.count; i++) {
    const delay = -(i * (lane.duration / lane.count)).toFixed(2);
    const baseX = Math.round(40 + (i / lane.count) * 1840);
    const y = lane.yBase + lane.yVar[i % lane.yVar.length];
    const scale = lane.scaleVar[i % lane.scaleVar.length];
    const type = (i * 2 + laneIdx) % 6; // rich diversity of lantern shapes

    driftingHoaDangJsx += `                        {/* Đóa hoa đăng #${i + 1} (${LANES[laneIdx].animClass}) delay=${delay}s, X=${baseX}, Y=${y} */}
                        <g style={{ animation: '${lane.animClass} ${lane.duration}s linear infinite ${delay}s' }} transform="translate(${baseX}, 0)">
                            <g transform="translate(0, ${y})">
                                <g className="${lane.bobClass}">
                                    <g transform="scale(${scale})" filter="url(#bloomHigh)">
                                        ${getLanternSvg(type).trim()}
                                    </g>
                                </g>
                            </g>
                        </g>
`;
  }
  driftingHoaDangJsx += `                    </g>\n`;
});

driftingHoaDangJsx += `                </g>`;

// Replace old <g id="hoian-super-dense-hoa-dang-stream">...</g>
const streamStart = code.indexOf('<g id="hoian-super-dense-hoa-dang-stream">');
const streamEnd = code.indexOf('<rect x="360" y="320" width="1200" height="660"', streamStart);

if (streamStart !== -1 && streamEnd !== -1) {
  // Find closing </g> before <rect x="360"
  const lastCloseG = code.lastIndexOf('</g>', streamEnd);
  code = code.substring(0, streamStart) + driftingHoaDangJsx.trim() + '\n\n    ' + code.substring(streamEnd);
  console.log('Successfully replaced static hoa dang stream with 4 dynamic drifting lanes!');
} else {
  console.error('Could not find hoian-super-dense-hoa-dang-stream boundaries!');
  process.exit(1);
}

// Clean any accidental invalid comments or artifacts
code = code.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild verification PASSED!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('SUCCESS: Written flowing water & drifting hoa dang to MidAutumnSvgBackdrop.tsx!');
} catch (err) {
  console.error('esbuild verification FAILED:', err.message);
  process.exit(1);
}
