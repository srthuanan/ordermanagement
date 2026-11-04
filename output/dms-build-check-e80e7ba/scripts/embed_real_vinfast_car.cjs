const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const esbuild = require('esbuild');

async function run() {
  console.log('1. Converting official VinFast VF8 image to transparent PNG base64...');
  const pngBuf = await sharp('public/pictures/vf8-ce1m.webp').resize(600).png().toBuffer();
  const base64Png = 'data:image/png;base64,' + pngBuf.toString('base64');
  console.log('Base64 PNG generated, length:', base64Png.length);

  const targetFile = 'components/login/MidAutumnSvgBackdrop.tsx';
  let code = fs.readFileSync(targetFile, 'utf8');

  // Let's inspect where the car is inside vinfast-hoian-showroom
  const carSectionOldStart = '{/* CHIẾC XE SUV ĐIỆN VINFAST ĐẲNG CẤP';
  const carSectionOldEnd = '{/* ========================================================================== */}\n        {/* CON NGƯỜI TRONG SHOWROOM';

  const newCarSection = `{/* ========================================================================== */}
        {/* HÌNH ẢNH CHÂN THỰC XE ĐIỆN VINFAST VF8 TRÊN BỤC XOAY SHOWROOM CAO CẤP     */}
        {/* ========================================================================== */}
        <g id="vinfast-car-display">
            {/* Vầng sáng spotlight ấm áp rọi thẳng từ trần xuống mặt bục xoay */}
            <ellipse cx="172" cy="226" rx="72" ry="20" fill="#fef08a" opacity="0.35" filter="url(#bloomSoft)" />

            {/* Bóng đổ gầm xe ô tô thực tế trên mặt bục xoay */}
            <ellipse cx="172" cy="235" rx="66" ry="10" fill="#020617" opacity="0.9" />

            {/* HÌNH ẢNH XE ĐIỆN VINFAST VF8 CHÍNH HÃNG NGUYÊN BẢN SẮC NÉT */}
            <image 
                href="${base64Png}" 
                x="94" 
                y="148" 
                width="156" 
                height="88" 
                preserveAspectRatio="xMidYMid meet"
                className="animate-vinfast-car"
                filter="url(#dropShadow)"
            />

            {/* Hiệu ứng dải đèn LED cánh chim chữ V VinFast phát sáng ban đêm */}
            <g className="animate-vinfast-drl" transform="translate(94, 148)">
                {/* Dải LED mí mắt trước rực sáng */}
                <path d="M 11,54 Q 24,50 38,51" fill="none" stroke="#67e8f9" strokeWidth="2.2" filter="url(#bloomSoft)" />
                <path d="M 11,54 Q 24,50 38,51" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                <circle cx="34" cy="51" r="1.4" fill="#ffffff" filter="url(#bloomHigh)" />
            </g>

            {/* Bảng tên model mạ vàng trên bục xoay */}
            <g transform="translate(172, 246)">
                <rect x="-24" y="-5" width="48" height="9" rx="1.5" fill="#0f172a" stroke="#ca8a04" strokeWidth="0.8" />
                <text x="0" y="2" fill="#fef08a" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="'Cinzel', serif" letterSpacing="1.2">VINFAST VF 8</text>
            </g>
        </g>

        `;

  if (code.includes(carSectionOldStart)) {
    const startIdx = code.indexOf(carSectionOldStart);
    const endIdx = code.indexOf(carSectionOldEnd);
    if (endIdx !== -1) {
      code = code.substring(0, startIdx) + newCarSection + code.substring(endIdx);
      console.log('Successfully replaced vector car with REAL VinFast VF8 image!');
    }
  } else {
    console.log('Old car section marker not found, checking fallback...');
  }

  // Validate syntax
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild verification PASSED!');
  fs.writeFileSync(targetFile, code, 'utf8');
  console.log('Successfully written real VinFast car image into MidAutumnSvgBackdrop.tsx');

  // Also update scripts/replace_chua_cau_with_vinfast_showroom.cjs for reproducibility
  let scriptContent = fs.readFileSync('scripts/replace_chua_cau_with_vinfast_showroom.cjs', 'utf8');
  if (scriptContent.includes(carSectionOldStart)) {
    const sStart = scriptContent.indexOf(carSectionOldStart);
    const sEnd = scriptContent.indexOf(carSectionOldEnd);
    if (sEnd !== -1) {
      scriptContent = scriptContent.substring(0, sStart) + newCarSection + scriptContent.substring(sEnd);
      fs.writeFileSync('scripts/replace_chua_cau_with_vinfast_showroom.cjs', scriptContent, 'utf8');
      console.log('Updated replace_chua_cau_with_vinfast_showroom.cjs as well!');
    }
  }

  // Render a preview of the VinFast showroom
  console.log('Rendering close-up preview of VinFast showroom...');
  const svgStart = code.indexOf('<svg');
  const svgEnd = code.lastIndexOf('</svg>') + 6;
  let svgContent = code.substring(svgStart, svgEnd)
    .replace(/className="[^"]*"/g, '')
    .replace(/style=\{\{[^}]*\}\}/g, '')
    .replace(/strokeWidth/g, 'stroke-width')
    .replace(/strokeLinecap/g, 'stroke-linecap')
    .replace(/strokeLinejoin/g, 'stroke-linejoin')
    .replace(/strokeDasharray/g, 'stroke-dasharray')
    .replace(/fillRule/g, 'fill-rule')
    .replace(/clipRule/g, 'clip-rule')
    .replace(/stopColor/g, 'stop-color')
    .replace(/stopOpacity/g, 'stop-opacity')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  const scratchDir = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch';
  await sharp(Buffer.from(svgContent))
    .extract({ left: 30, top: 260, width: 380, height: 280 })
    .png()
    .toFile(scratchDir + '/crop_vinfast_showroom.png');
  console.log('DONE! Saved preview to scratch/crop_vinfast_showroom.png');
}

run().catch(e => console.error(e));
