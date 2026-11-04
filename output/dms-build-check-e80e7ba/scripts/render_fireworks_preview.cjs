const fs = require('fs');
const sharp = require('sharp');

async function run() {
  try {
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

    const scratchDir = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch';
    const svgBuf = Buffer.from(svgContent);

    console.log('Rendering sky & houses with fireworks...');
    await sharp(svgBuf)
      .extract({ left: 50, top: 20, width: 1820, height: 620 })
      .png()
      .toFile(`${scratchDir}/preview_fireworks_behind_houses.png`);

    console.log('Rendering VinFast showroom fireworks close-up...');
    await sharp(svgBuf)
      .extract({ left: 60, top: 40, width: 680, height: 480 })
      .png()
      .toFile(`${scratchDir}/preview_fw_vinfast.png`);

    console.log('Rendering Hoi Quan pagoda fireworks close-up...');
    await sharp(svgBuf)
      .extract({ left: 620, top: 30, width: 680, height: 480 })
      .png()
      .toFile(`${scratchDir}/preview_fw_hoiquan.png`);

    console.log('DONE ALL FIREWORKS PREVIEWS!');
  } catch (e) {
    console.error('Render error:', e);
  }
}

run();
