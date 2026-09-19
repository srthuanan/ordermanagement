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

boatKeys.forEach(k => {
    const searchStr = 'className="' + k + '"';
    const idx = content.indexOf(searchStr);
    if (idx !== -1) {
        console.log('JSX found:', k, 'at char:', idx);
    } else {
        console.log('JSX NOT FOUND:', k);
    }
});
