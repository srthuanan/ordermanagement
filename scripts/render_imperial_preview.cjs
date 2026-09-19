const fs = require('fs');
const sharp = require('sharp');

async function renderImperial() {
  const content = fs.readFileSync('components/login/MidAutumnImperialBackdrop.tsx', 'utf8');
  const svgStart = content.indexOf('<svg');
  const svgEnd = content.lastIndexOf('</svg>') + 6;
  let svgContent = content.substring(svgStart, svgEnd);

  svgContent = svgContent
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
    .replace(/transformOrigin="[^"]*"/g, '')
    .replace(/letterSpacing="[^"]*"/g, 'letter-spacing="2"')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  const scratchDir = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch';
  const svgBuf = Buffer.from(svgContent);

  console.log('Rendering Imperial Palace full view...');
  await sharp(svgBuf)
    .resize(1920, 1080)
    .png()
    .toFile(scratchDir + '/imperial_palace_full_view.png');

  console.log('Rendering VinFast Imperial Grand Palace close-up...');
  await sharp(svgBuf)
    .extract({ left: 650, top: 100, width: 620, height: 480 })
    .png()
    .toFile(scratchDir + '/imperial_vinfast_palace_crop.png');

  console.log('Rendering Imperial Dragon Boat & Lotus Lake close-up...');
  await sharp(svgBuf)
    .extract({ left: 0, top: 520, width: 1200, height: 500 })
    .png()
    .toFile(scratchDir + '/imperial_dragon_boat_lake_crop.png');

  console.log('All Imperial previews rendered successfully!');
}

renderImperial().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
