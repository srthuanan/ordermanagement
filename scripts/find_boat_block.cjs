const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lastBoatIdx = content.indexOf('className="animate-boat-rl-3b"');
console.log('Snippet from last boat:');
console.log(content.slice(lastBoatIdx, lastBoatIdx + 3000));
