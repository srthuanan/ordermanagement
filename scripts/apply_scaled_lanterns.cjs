const fs = require('fs');
const esbuild = require('esbuild');

const filePath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const lanternData = [
    { id: 1, x: 80, yWire: 35, yTop: 67, scale: 1.45, hookR: 4.8, hookInner: 2.2, lineWidth: 2.8, beadR: 2.4 },
    { id: 2, x: 185, yWire: 45.5, yTop: 71.5, scale: 1.35, hookR: 4.5, hookInner: 2.0, lineWidth: 2.5, beadR: 2.2 },
    { id: 3, x: 295, yWire: 54.9, yTop: 82.9, scale: 1.24, hookR: 4.2, hookInner: 1.9, lineWidth: 2.3, beadR: 2.1 },
    { id: 4, x: 410, yWire: 63, yTop: 89, scale: 1.13, hookR: 4.0, hookInner: 1.8, lineWidth: 2.2, beadR: 2.0 },
    { id: 5, x: 525, yWire: 69.4, yTop: 96.4, scale: 1.01, hookR: 3.8, hookInner: 1.7, lineWidth: 2.0, beadR: 1.9 },
    { id: 6, x: 640, yWire: 74, yTop: 99, scale: 0.88, hookR: 3.5, hookInner: 1.6, lineWidth: 1.8, beadR: 1.8 },
    { id: 7, x: 745, yWire: 76.7, yTop: 98.7, scale: 0.76, hookR: 3.2, hookInner: 1.5, lineWidth: 1.6, beadR: 1.6 },
    { id: 8, x: 835, yWire: 77.8, yTop: 97.8, scale: 0.62, hookR: 2.8, hookInner: 1.3, lineWidth: 1.4, beadR: 1.4 },
    { id: 9, x: 1085, yWire: 77.8, yTop: 97.8, scale: 0.62, hookR: 2.8, hookInner: 1.3, lineWidth: 1.4, beadR: 1.4 },
    { id: 10, x: 1175, yWire: 76.7, yTop: 98.7, scale: 0.76, hookR: 3.2, hookInner: 1.5, lineWidth: 1.6, beadR: 1.6 },
    { id: 11, x: 1280, yWire: 74, yTop: 100, scale: 0.88, hookR: 3.5, hookInner: 1.6, lineWidth: 1.8, beadR: 1.8 },
    { id: 12, x: 1395, yWire: 69.4, yTop: 96.4, scale: 1.01, hookR: 3.8, hookInner: 1.7, lineWidth: 2.0, beadR: 1.9 },
    { id: 13, x: 1510, yWire: 63, yTop: 88, scale: 1.13, hookR: 4.0, hookInner: 1.8, lineWidth: 2.2, beadR: 2.0 },
    { id: 14, x: 1625, yWire: 54.9, yTop: 82.9, scale: 1.24, hookR: 4.2, hookInner: 1.9, lineWidth: 2.3, beadR: 2.1 },
    { id: 15, x: 1735, yWire: 45.5, yTop: 71.5, scale: 1.35, hookR: 4.5, hookInner: 2.0, lineWidth: 2.5, beadR: 2.2 },
    { id: 16, x: 1840, yWire: 35, yTop: 65, scale: 1.45, hookR: 4.8, hookInner: 2.2, lineWidth: 2.8, beadR: 2.4 }
];

lanternData.forEach(item => {
    // 1. Update the body transform
    // Search for transform="translate(X, Y)"
    const transRegex = new RegExp(`(<g transform="translate\\(${item.x},\\s*${item.yTop})\\)(" filter="url\\(#maDropShadow\\)">)`);
    if (transRegex.test(code)) {
        code = code.replace(transRegex, `$1) scale(${item.scale})$2`);
        console.log(`Updated Lantern #${item.id} body translate & scale(${item.scale})`);
    } else {
        console.warn(`Could not match transform for Lantern #${item.id}`);
    }

    // 2. Update hook circles and line for this lantern
    // Hook circle cx="{x}" cy="{yWire}" r="4"
    const hookCircleRegex = new RegExp(`(<circle cx="${item.x}" cy="${item.yWire}" r=")[^"]+(" fill="#f59e0b"[^>]+>\\s*<circle cx="${item.x}" cy="${item.yWire}" r=")[^"]+(")`);
    if (hookCircleRegex.test(code)) {
        code = code.replace(hookCircleRegex, `$1${item.hookR}$2${item.hookInner}$3`);
    }

    // Line x1="{x}" y1="{yWire}" x2="{x}" y2="{yTop}" stroke="#f59e0b" strokeWidth="[^"]+"
    const lineRegex = new RegExp(`(<line x1="${item.x}" y1="${item.yWire}" x2="${item.x}" y2="${item.yTop}" stroke="#f59e0b" strokeWidth=")[^"]+(")`);
    if (lineRegex.test(code)) {
        code = code.replace(lineRegex, `$1${item.lineWidth}$2`);
    }

    // Bead circle
    const beadRegex = new RegExp(`(<circle cx="${item.x}" cy="[^"]+" r=")[^"]+(" fill="#ef4444")`);
    if (beadRegex.test(code)) {
        code = code.replace(beadRegex, `$1${item.beadR}$2`);
    }
});

// Validate with esbuild
try {
    esbuild.transformSync(code, { loader: 'tsx' });
    console.log('esbuild check PASSED!');
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Successfully written', filePath);
} catch (err) {
    console.error('esbuild check FAILED:', err.message);
    process.exit(1);
}
