const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lastBoatIdx = content.indexOf('className="animate-boat-rl-3b"');
const nextSectionIdx = content.indexOf('{/* ============================================================================== */}', lastBoatIdx);
console.log('Next section after boats at:', nextSectionIdx);
console.log(content.slice(nextSectionIdx, nextSectionIdx + 400));
