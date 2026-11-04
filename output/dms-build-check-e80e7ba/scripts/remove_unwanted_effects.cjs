const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// 1. Remove fireworks SVG group
const fwMarkerStart = '{/* ============================================================================== */}\n    {/* 3. HIỆU ỨNG PHÁO HOA HOA ĐĂNG TẦM XA BẦU TRỜI ĐÊM RẰM                           */}';
const fwMarkerEnd = '</g>\n';
if (code.includes(fwMarkerStart)) {
  const sIdx = code.indexOf(fwMarkerStart);
  // Find </g> closing hoian-distant-fireworks
  const gCloseIdx = code.indexOf('</g>', code.indexOf('id="hoian-distant-fireworks"')) + 4;
  code = code.substring(0, sIdx) + code.substring(gCloseIdx);
  console.log('Removed hoian-distant-fireworks SVG!');
}

// 2. Remove water reflections SVG group
const reflMarkerStart = '{/* ============================================================================== */}\n    {/* 1. VỆT BÓNG NƯỚC LUNG LINH CỦA DÃY PHỐ CỔ IN BÓNG DƯỚI CHÂN BỜ KÈ & BẬC ĐÁ      */}';
if (code.includes(reflMarkerStart)) {
  const sIdx = code.indexOf(reflMarkerStart);
  const gCloseIdx = code.indexOf('</g>', code.indexOf('id="hoian-water-quay-reflections"')) + 4;
  code = code.substring(0, sIdx) + code.substring(gCloseIdx);
  console.log('Removed hoian-water-quay-reflections SVG!');
}

// 3. Remove river mist SVG group
const mistMarkerStart = '{/* ============================================================================== */}\n    {/* 2. LÀN SƯƠNG KHÓI MỜ ẢO LƠ LỬNG TRÊN MẶT SÔNG HOÀI (ATMOSPHERIC RIVER MIST)     */}';
if (code.includes(mistMarkerStart)) {
  const sIdx = code.indexOf(mistMarkerStart);
  const gCloseIdx = code.indexOf('</g>', code.indexOf('id="hoian-atmospheric-river-mist"')) + 4;
  code = code.substring(0, sIdx) + code.substring(gCloseIdx);
  console.log('Removed hoian-atmospheric-river-mist SVG!');
}

// 4. Remove CSS keyframes from <style>
const cssMarkerStart = '/* ============================================================================== */\n                /* 1. VỆT BÓNG NƯỚC LUNG LINH DƯỚI CHÂN BỜ KÈ (WATER REFLECTIONS)                  */';
const cssMarkerEnd = '.animate-firework-3 {';
if (code.includes(cssMarkerStart) && code.includes(cssMarkerEnd)) {
  const sIdx = code.indexOf(cssMarkerStart);
  const eIdx = code.indexOf('}', code.indexOf(cssMarkerEnd)) + 1;
  code = code.substring(0, sIdx) + code.substring(eIdx);
  console.log('Removed 3 effects CSS keyframes!');
}

// 5. Remove gradients from <defs>
const gradMarkerStart = '{/* Gradients cho vệt bóng nước lung linh & sương mù mặt sông */}';
const gradMarkerEnd = '</linearGradient>\n';
if (code.includes(gradMarkerStart)) {
  const sIdx = code.indexOf(gradMarkerStart);
  const eIdx = code.indexOf('</linearGradient>', code.indexOf('id="riverMistGrad2"')) + 18;
  code = code.substring(0, sIdx) + code.substring(eIdx);
  console.log('Removed gradients from <defs>!');
}

// Save file
fs.writeFileSync(backdropPath, code, 'utf8');

// Verify compilation
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('SUCCESS: MidAutumnSvgBackdrop.tsx restored cleanly without the 3 unwanted effects!');
} catch (err) {
  console.error('Compilation error:', err);
  process.exit(1);
}
