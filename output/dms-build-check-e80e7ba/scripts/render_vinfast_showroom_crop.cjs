const fs = require('fs');
const sharp = require('sharp');

async function run() {
  const backdrop = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
  const svgStart = backdrop.indexOf('<svg');
  const svgEnd = backdrop.lastIndexOf('</svg>') + 6;
  let svgContent = backdrop.substring(svgStart, svgEnd)
    .replace(/className="[^"]*"/g, '')
    .replace(/style=\{\{[^}]*\}\}/g, '')
    .replace(/strokeWidth/g, 'stroke-width')
    .replace(/strokeLinecap/g, 'stroke-linecap')
    .replace(/strokeLinejoin/g, 'stroke-linejoin')
    .replace(/strokeDasharray/g, 'stroke-dasharray')
    .replace(/transform=\{\`translate\(\$\{cloudOffsetX\}, 0\)\`\}/g, '')
    .replace(/transform=\{\`translate\(\$\{moonOffsetX\}, \$\{moonOffsetY\}\)\`\}/g, '')
    .replace(/fillRule/g, 'fill-rule')
    .replace(/clipRule/g, 'clip-rule')
    .replace(/stopColor/g, 'stop-color')
    .replace(/stopOpacity/g, 'stop-opacity')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  const scratchDir = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch';
  await sharp(Buffer.from(svgContent))
    .extract({ left: 30, top: 270, width: 380, height: 280 })
    .png()
    .toFile(`${scratchDir}/crop_vinfast_showroom.png`);
  console.log('Successfully saved crop_vinfast_showroom.png!');
}

run().catch(err => console.error(err));
