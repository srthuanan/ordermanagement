const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

function calcY(x) {
  if (x <= 885) {
    const u = 1 - x / 885;
    return +(78 - 52 * u * u).toFixed(1);
  } else {
    const u = 1 - (1920 - x) / 885;
    return +(78 - 52 * u * u).toFixed(1);
  }
}

// Read test_16_unique_lanterns.cjs to extract LANTERNS array
const testFile = fs.readFileSync('scripts/test_16_unique_lanterns.cjs', 'utf8');
const arrayStart = testFile.indexOf('const LANTERNS = [');
const arrayEnd = testFile.indexOf('];', arrayStart) + 2;
const arrayStr = testFile.substring(arrayStart, arrayEnd);

const LANTERNS = eval(`(() => { ${arrayStr}; return LANTERNS; })()`);

const lanternScales = [
  { id: 1, scale: 1.45, hookR: 4.8, hookInner: 2.2, lineWidth: 2.8, beadR: 2.4 },
  { id: 2, scale: 1.35, hookR: 4.5, hookInner: 2.0, lineWidth: 2.5, beadR: 2.2 },
  { id: 3, scale: 1.24, hookR: 4.2, hookInner: 1.9, lineWidth: 2.3, beadR: 2.1 },
  { id: 4, scale: 1.13, hookR: 4.0, hookInner: 1.8, lineWidth: 2.2, beadR: 2.0 },
  { id: 5, scale: 1.01, hookR: 3.8, hookInner: 1.7, lineWidth: 2.0, beadR: 1.9 },
  { id: 6, scale: 0.88, hookR: 3.5, hookInner: 1.6, lineWidth: 1.8, beadR: 1.8 },
  { id: 7, scale: 0.76, hookR: 3.2, hookInner: 1.5, lineWidth: 1.6, beadR: 1.6 },
  { id: 8, scale: 0.62, hookR: 2.8, hookInner: 1.3, lineWidth: 1.4, beadR: 1.4 },
  { id: 9, scale: 0.62, hookR: 2.8, hookInner: 1.3, lineWidth: 1.4, beadR: 1.4 },
  { id: 10, scale: 0.76, hookR: 3.2, hookInner: 1.5, lineWidth: 1.6, beadR: 1.6 },
  { id: 11, scale: 0.88, hookR: 3.5, hookInner: 1.6, lineWidth: 1.8, beadR: 1.8 },
  { id: 12, scale: 1.01, hookR: 3.8, hookInner: 1.7, lineWidth: 2.0, beadR: 1.9 },
  { id: 13, scale: 1.13, hookR: 4.0, hookInner: 1.8, lineWidth: 2.2, beadR: 2.0 },
  { id: 14, scale: 1.24, hookR: 4.2, hookInner: 1.9, lineWidth: 2.3, beadR: 2.1 },
  { id: 15, scale: 1.35, hookR: 4.5, hookInner: 2.0, lineWidth: 2.5, beadR: 2.2 },
  { id: 16, scale: 1.45, hookR: 4.8, hookInner: 2.2, lineWidth: 2.8, beadR: 2.4 }
];

// Generate Fairy Lights JSX
const fairyXs = [];
for (let x = 30; x <= 870; x += 38) fairyXs.push(x);
for (let x = 1050; x <= 1890; x += 38) fairyXs.push(x);

const fairyLightsJsx = fairyXs.map(x => {
  const y = calcY(x);
  return `                        <circle cx="${x}" cy="${(y - 1).toFixed(1)}" r="2.2" fill="#fef08a" opacity="0.95" filter="url(#maBloom)" />
                        <circle cx="${x}" cy="${(y - 1).toFixed(1)}" r="1" fill="#ffffff" />`;
}).join('\n');

// Generate 16 Lanterns JSX with perspective scales
const lanternsJsx = LANTERNS.map((c, idx) => {
  const sc = lanternScales[idx];
  const yWire = calcY(c.x);
  const yTop = +(yWire + c.cordLen).toFixed(1);
  let body = c.render().trim()
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
    .replace(/stroke-width/g, 'strokeWidth')
    .replace(/stroke-linecap/g, 'strokeLinecap')
    .replace(/stroke-linejoin/g, 'strokeLinejoin')
    .replace(/stroke-dasharray/g, 'strokeDasharray')
    .replace(/fill-rule/g, 'fillRule')
    .replace(/clip-rule/g, 'clipRule')
    .replace(/stop-color/g, 'stopColor')
    .replace(/stop-opacity/g, 'stopOpacity');

  return `                    {/* Lồng Đèn #${idx + 1}: ${c.name} tại x=${c.x}, yWire=${yWire} -> yTop=${yTop} (scale=${sc.scale}) */}
                    <g className="${c.anim}" style={{ transformOrigin: '${c.x}px ${yWire}px' }}>
                        {/* Khoen móc kẹp trực tiếp vào dây giăng đèn */}
                        <circle cx="${c.x}" cy="${yWire}" r="${sc.hookR}" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.3" />
                        <circle cx="${c.x}" cy="${yWire}" r="${sc.hookInner}" fill="#451a03" />

                        {/* Dây lụa đỏ/vàng thả từ móc trên dây xuống tai đèn */}
                        <line x1="${c.x}" y1="${yWire}" x2="${c.x}" y2="${yTop}" stroke="#f59e0b" strokeWidth="${sc.lineWidth}" strokeLinecap="round" />
                        <circle cx="${c.x}" cy="${(yWire + c.cordLen * 0.45).toFixed(1)}" r="${sc.beadR}" fill="#ef4444" stroke="#fef08a" strokeWidth="0.8" />

                        {/* Khung thân lồng đèn 3D treo bên dưới thu phóng theo phối cảnh */}
                        <g transform="translate(${c.x}, ${yTop}) scale(${sc.scale})" filter="url(#maDropShadow)">
                            <circle cx="0" cy="0" r="3.2" fill="none" stroke="#fef08a" strokeWidth="1.3" />
${body}
                        </g>
                    </g>`;
}).join('\n\n');

const newGarlandAndLanternsBlock = `
                {/* ============================================================================== */}
                {/* 7. DÂY GIĂNG LỒNG ĐÈN CUNG ĐÌNH CHUẨN XÁC 100% QUA 16 TỌA ĐỘ MÓC TREO         */}
                {/* ============================================================================== */}
                <g filter="url(#maBloom)" className="animate-garland-glow">
                    {/* Dây lụa vàng cánh cung bên trái: (0, 26) -> Q(440, 78) -> (885, 78) */}
                    <path
                        d="M 0,26 Q 440,78 885,78"
                        fill="none"
                        stroke="#451a03"
                        strokeWidth="4.2"
                        opacity="0.85"
                    />
                    <path
                        d="M 0,26 Q 440,78 885,78"
                        fill="none"
                        stroke="url(#maGarlandWire)"
                        strokeWidth="2.6"
                    />
                    <path
                        d="M 0,26 Q 440,78 885,78"
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="1"
                        strokeDasharray="4,6"
                    />

                    {/* Dây lụa vàng cánh cung bên phải: (1920, 26) -> Q(1480, 78) -> (1035, 78) */}
                    <path
                        d="M 1920,26 Q 1480,78 1035,78"
                        fill="none"
                        stroke="#451a03"
                        strokeWidth="4.2"
                        opacity="0.85"
                    />
                    <path
                        d="M 1920,26 Q 1480,78 1035,78"
                        fill="none"
                        stroke="url(#maGarlandWire)"
                        strokeWidth="2.6"
                    />
                    <path
                        d="M 1920,26 Q 1480,78 1035,78"
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="1"
                        strokeDasharray="4,6"
                    />

                    {/* Chốt Móc Khuyên Mây Hoàng Kim nối vào Đài Mây dưới Trăng */}
                    <circle cx="885" cy="78" r="6.5" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="885" cy="78" r="3" fill="#78350f" />
                    <circle cx="1035" cy="78" r="6.5" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="1035" cy="78" r="3" fill="#78350f" />

                    {/* Chuỗi bóng đèn led ngọc dạ quang phát sáng dọc theo dây */}
${fairyLightsJsx}
                </g>

                {/* ============================================================================== */}
                {/* 8. BỘ SƯU TẬP 16 LỒNG ĐÈN ĐẶC SẮC HOÀN TOÀN KHÁC BIỆT TREO TRỰC TIẾP LÊN DÂY 3D  */}
                {/* ============================================================================== */}
                <g>
${lanternsJsx}
                </g>
`;

// Locate start and end of garland section in code
const startMarker = '{/* ============================================================================== */}';
const targetStart = code.indexOf(startMarker, code.indexOf('<circle cx="960" cy="118" r="140" fill="url(#maMoonAura)"'));
const targetEnd = code.indexOf('{/* 9. ĐÀN THIÊN ĐĂNG', targetStart);

if (targetStart === -1 || targetEnd === -1) {
  console.error('Could not find garland start or end marker!', { targetStart, targetEnd });
  process.exit(1);
}

code = code.substring(0, targetStart) + newGarlandAndLanternsBlock.trim() + '\n\n                ' + code.substring(targetEnd);

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for 16 unique lanterns!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully restored 16 UNIQUE LANTERNS to', backdropPath);
  console.log('Total lines:', code.split('\n').length);
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
