import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { execSync } = require('child_process');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const imgDir = path.join(docsDir, 'images');
const templateHtmlPath = path.join(docsDir, 'sach_huong_dan_tvbh.html');
const compiledHtmlPath = path.join(docsDir, 'sach_huong_dan_tvbh_compiled.html');
const outputPdfPath = path.join(docsDir, 'CAM_NANG_HUONG_DAN_SU_DUNG_TVBH.pdf');

// Helper to convert file to base64
function getBase64Image(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn('File not found:', filePath);
        return '';
    }
    const ext = path.extname(filePath).replace('.', '');
    const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const data = fs.readFileSync(filePath).toString('base64');
    return `data:${mime};base64,${data}`;
}

console.log('Reading template and converting images to base64...');
let html = fs.readFileSync(templateHtmlPath, 'utf8');

// 1. Replace Showroom Logo
const logoPath = path.join(rootDir, 'pictures', 'logo_showroom_thuan_an.webp');
const logoBase64 = getBase64Image(logoPath);
if (logoBase64) {
    html = html.replace(/__LOGO_SHOWROOM__/g, `<img src="${logoBase64}" class="cover-logo" alt="VinFast Thuận An Logo">`);
} else {
    html = html.replace(/__LOGO_SHOWROOM__/g, '');
}

// 2. Automatically find and replace all src="./images/..." with base64 data
html = html.replace(/src=["']\.\/images\/([^"']+)["']/g, (match, filename) => {
    const fullPath = path.join(imgDir, filename);
    if (fs.existsSync(fullPath)) {
        const b64 = getBase64Image(fullPath);
        console.log(`Inlined image: ${filename}`);
        return `src="${b64}"`;
    }
    console.warn(`Image file not found: ${filename}`);
    return match;
});

// Also support legacy __IMG_XX__ placeholders if any exist
for (let i = 1; i <= 25; i++) {
    const numStr = i < 10 ? '0' + i : '' + i;
    const files = fs.readdirSync(imgDir);
    const matched = files.find(f => f.includes('_' + numStr));
    if (matched) {
        const fullPath = path.join(imgDir, matched);
        const b64 = getBase64Image(fullPath);
        html = html.replace(new RegExp('__IMG_' + numStr + '__', 'g'), b64);
    }
}

fs.writeFileSync(compiledHtmlPath, html, 'utf8');
console.log('Compiled HTML written to:', compiledHtmlPath);

const browserPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

let browserPath = browserPaths.find(p => fs.existsSync(p));
if (!browserPath) {
    console.error('No suitable browser found for PDF generation');
    process.exit(1);
}

console.log('Using browser:', browserPath);
const fileUrl = 'file:///' + compiledHtmlPath.replace(/\\/g, '/');
const cmd = `"${browserPath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "${fileUrl}"`;

console.log('Executing print-to-pdf...');
try {
    execSync(cmd, { stdio: 'inherit', timeout: 60000 });
    if (fs.existsSync(outputPdfPath)) {
        const stats = fs.statSync(outputPdfPath);
        console.log(`SUCCESS! Generated PDF: ${outputPdfPath} (${Math.round(stats.size / 1024)} KB)`);
        
        // Also copy to SO_TAY_TVBH_VINFAST_THUAN_AN.pdf
        const altPdfPath = path.join(docsDir, 'SO_TAY_TVBH_VINFAST_THUAN_AN.pdf');
        fs.copyFileSync(outputPdfPath, altPdfPath);
        console.log(`Copied to ${altPdfPath}`);
    } else {
        console.error('PDF file was not created');
    }
} catch (err) {
    console.error('Error generating PDF:', err);
    process.exit(1);
}
