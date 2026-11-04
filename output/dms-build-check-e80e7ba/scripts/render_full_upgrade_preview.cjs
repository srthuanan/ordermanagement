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

    console.log('Rendering full street...');
    await sharp(svgBuf)
      .extract({ left: 100, top: 220, width: 1720, height: 450 })
      .png()
      .toFile(`${scratchDir}/upgrade_street_willows_and_houses.png`);

    console.log('Rendering west houses...');
    await sharp(svgBuf)
      .extract({ left: 240, top: 380, width: 520, height: 260 })
      .png()
      .toFile(`${scratchDir}/crop_houses_west.png`);

    console.log('Rendering central houses...');
    await sharp(svgBuf)
      .extract({ left: 740, top: 380, width: 560, height: 260 })
      .png()
      .toFile(`${scratchDir}/crop_houses_central.png`);

    console.log('Rendering east houses...');
    await sharp(svgBuf)
      .extract({ left: 1280, top: 380, width: 560, height: 260 })
      .png()
      .toFile(`${scratchDir}/crop_houses_east.png`);

    console.log('Rendering flowing river & hoa dang...');
    await sharp(svgBuf)
      .extract({ left: 100, top: 550, width: 1720, height: 480 })
      .png()
      .toFile(`${scratchDir}/crop_river_flowing.png`);

    console.log('Rendering Cao Lầu and Hội Quán close-up...');
    await sharp(svgBuf)
      .extract({ left: 550, top: 220, width: 680, height: 380 })
      .png()
      .toFile(`${scratchDir}/crop_cao_lau_and_hoi_quan.png`);

    console.log('Rendering street railings & shop entrances...');
    await sharp(svgBuf)
      .extract({ left: 200, top: 460, width: 1520, height: 160 })
      .png()
      .toFile(`${scratchDir}/crop_street_railings_and_shops.png`);

    console.log('DONE ALL!');
  } catch (e) {
    console.error('Render error:', e);
  }
}

run();
