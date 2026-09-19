const fs = require('fs');
const sharp = require('sharp');

const backdrop = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
const svgStart = backdrop.indexOf('<svg');
const svgEnd = backdrop.lastIndexOf('</svg>') + 6;
let svgContent = backdrop.substring(svgStart, svgEnd);

// sanitize JSX to valid SVG for sharp
svgContent = svgContent
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

const outPath = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch/crop_fixed_sky.png';

// Extract the region from VinFast showroom through Cao Lầu Bà Bé:
// left: 200, top: 180, width: 850, height: 420
sharp(Buffer.from(svgContent))
  .extract({ left: 200, top: 180, width: 850, height: 420 })
  .png()
  .toFile(outPath)
  .then(() => {
    console.log('SUCCESS: Rendered', outPath);
  })
  .catch(err => {
    console.error('Sharp error:', err.message);
  });
