const fs = require('fs');
const sharp = require('sharp');

async function run() {
  try {
    const backdrop = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
    const svgStart = backdrop.indexOf('<svg');
    const svgEnd = backdrop.lastIndexOf('</svg>') + 6;
    let svgContent = backdrop.substring(svgStart, svgEnd);

    // Replace thien dang translate positions to simulate mid-flight in sky (e.g. y: 60 - 240)
    // to verify they appear behind the roof eaves and lanterns in sharp!
    svgContent = svgContent
      .replace(/transform="translate\(220, 360\)"/g, 'transform="translate(230, 180) scale(0.88)"')
      .replace(/transform="translate\(380, 355\)"/g, 'transform="translate(395, 110) scale(0.72)"')
      .replace(/transform="translate\(300, 365\)"/g, 'transform="translate(325, 60) scale(0.55)"')
      .replace(/transform="translate\(860, 350\)"/g, 'transform="translate(875, 150) scale(0.85)"')
      .replace(/transform="translate\(990, 355\)"/g, 'transform="translate(980, 90) scale(0.7)"')
      .replace(/transform="translate\(760, 360\)"/g, 'transform="translate(745, 210) scale(0.92)"')
      .replace(/transform="translate\(920, 365\)"/g, 'transform="translate(945, 50) scale(0.48)"')
      .replace(/transform="translate\(1480, 355\)"/g, 'transform="translate(1495, 170) scale(0.86)"')
      .replace(/transform="translate\(1650, 350\)"/g, 'transform="translate(1635, 100) scale(0.7)"')
      .replace(/transform="translate\(1780, 360\)"/g, 'transform="translate(1800, 140) scale(0.8)"')
      .replace(/transform="translate\(1580, 365\)"/g, 'transform="translate(1610, 55) scale(0.5)"');

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

    const scratchDir = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch';
    const svgBuf = Buffer.from(svgContent);

    console.log('Rendering mid-flight sky lanterns...');
    await sharp(svgBuf)
      .extract({ left: 50, top: 20, width: 1820, height: 620 })
      .png()
      .toFile(`${scratchDir}/test_sky_lanterns_mid_flight.png`);

    console.log('DONE!');
  } catch (e) {
    console.error('Render error:', e);
  }
}

run();
