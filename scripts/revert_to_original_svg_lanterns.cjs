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

// 1. Ensure defs have maRuby3D and maAmber3D
if (!code.includes('id="maRuby3D"')) {
  const ruby3DDefs = `
                    {/* GẤM ĐỎ RUBY 3D ĐA TẦNG ĐỘ SÂU */}
                    <radialGradient id="maRuby3D" cx="30%" cy="28%" r="72%">
                        <stop offset="0%" stopColor="#fee2e2" />
                        <stop offset="20%" stopColor="#f87171" />
                        <stop offset="50%" stopColor="#dc2626" />
                        <stop offset="80%" stopColor="#991b1b" />
                        <stop offset="100%" stopColor="#450a0a" />
                    </radialGradient>

                    {/* GẤM VÀNG HOÀNG CÚC 3D ĐA TẦNG ĐỘ SÂU */}
                    <radialGradient id="maAmber3D" cx="30%" cy="28%" r="72%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="25%" stopColor="#fef08a" />
                        <stop offset="55%" stopColor="#f59e0b" />
                        <stop offset="85%" stopColor="#b45309" />
                        <stop offset="100%" stopColor="#78350f" />
                    </radialGradient>
`;
  code = code.replace('{/* GẤM ĐỎ RUBY HOÀNG CUNG */}', ruby3DDefs.trim() + '\n\n                    {/* GẤM ĐỎ RUBY HOÀNG CUNG */}');
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

const section8Block = `{/* ============================================================================== */}
                {/* 8. BỘ SƯU TẬP 16 LỒNG ĐÈN ĐẶC SẮC HOÀN TOÀN KHÁC BIỆT TREO TRỰC TIẾP LÊN DÂY 3D  */}
                {/* ============================================================================== */}
                <g>
${lanternsJsx}
                </g>`;

const targetStart = code.indexOf('{/* 8. BỘ SƯU TẬP 16 LỒNG ĐÈN ĐẶC SẮC HOÀN TOÀN KHÁC BIỆT TREO TRỰC TIẾP LÊN DÂY 3D');
if (targetStart === -1) {
  console.error('Target start not found!');
  process.exit(1);
}
const dividerBeforeSection8 = code.lastIndexOf('{/* ============================================================================== */}', targetStart);
const replaceFrom = dividerBeforeSection8 !== -1 ? dividerBeforeSection8 : targetStart;

const targetEnd = code.indexOf('{/* 10. KHÓM HOA MỘC QUẾ & TRÚC QUÂN TỬ DÁT VÀNG VEN VIỀN DƯỚI */}');
if (targetEnd === -1) {
  console.error('Target end not found!');
  process.exit(1);
}

const newCode = code.substring(0, replaceFrom) + section8Block + '\n\n                ' + code.substring(targetEnd);

try {
  esbuild.transformSync(newCode, { loader: 'tsx' });
  console.log('esbuild check passed!');
  fs.writeFileSync(backdropPath, newCode, 'utf8');
  console.log('Successfully reverted MidAutumnSvgBackdrop.tsx to original 16 colorful lanterns!');
} catch (e) {
  console.error('esbuild error:', e.message);
  process.exit(1);
}
