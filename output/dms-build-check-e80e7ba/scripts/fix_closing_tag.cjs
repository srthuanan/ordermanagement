const fs = require('fs');
let code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const target = '        </g>\n    </g>\n\n\n<g id="song-hoai-fluid">';
const replacement = '        </g>\n    </g>\n    </g>\n\n\n<g id="song-hoai-fluid">';

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/login/MidAutumnSvgBackdrop.tsx', code, 'utf8');
    console.log('Replaced target with replacement');
} else {
    console.log('Target not found, checking with regex');
    code = code.replace(/<\/g>\s*<\/g>\s*<g id="song-hoai-fluid">/, '</g>\n    </g>\n    </g>\n\n<g id="song-hoai-fluid">');
    fs.writeFileSync('components/login/MidAutumnSvgBackdrop.tsx', code, 'utf8');
    console.log('Regex replaced');
}
