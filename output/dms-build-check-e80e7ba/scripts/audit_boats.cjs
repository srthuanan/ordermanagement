const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const boatKeys = [
    'animate-boat-lr-1a', 'animate-boat-lr-1b',
    'animate-boat-rl-1a', 'animate-boat-rl-1b',
    'animate-boat-lr-2a', 'animate-boat-lr-2b',
    'animate-boat-rl-2a', 'animate-boat-rl-2b',
    'animate-boat-lr-3a', 'animate-boat-lr-3b',
    'animate-boat-rl-3a', 'animate-boat-rl-3b'
];

for (let i = 0; i < boatKeys.length; i++) {
    const k = boatKeys[i];
    const startIdx = content.indexOf('className="' + k + '"');
    const nextStart = i < boatKeys.length - 1 ? content.indexOf('className="' + boatKeys[i+1] + '"') : content.indexOf('</svg>', startIdx);
    const boatBody = content.slice(startIdx, nextStart);
    
    console.log(`=== ${k} (len: ${boatBody.length}) ===`);
    const lines = boatBody.split('\n');
    lines.forEach(l => {
        if (l.includes('translate(') || l.includes('Chàng') || l.includes('Thiếu nữ') || l.includes('chèo đò') || l.includes('Khách') || l.includes('polygon points')) {
            console.log('   ' + l.trim());
        }
    });
}
