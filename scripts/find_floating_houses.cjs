const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const regex = /<g\s+id="([^"]+)"[^>]*transform="([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
    console.log(`id: "${match[1]}", transform: "${match[2]}"`);
}
