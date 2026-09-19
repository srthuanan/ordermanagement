const fs = require('fs');
let content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

// 1. In Tiem Thuoc: after newThuoc, add </g>
const thuocMarker = 'stroke="#ca8a04" strokeWidth="1.6" strokeLinecap="round" />\r\n            </g>';
if (content.includes(thuocMarker)) {
    content = content.replace(thuocMarker, thuocMarker + '\r\n        </g>');
    console.log('Fixed Tiem Thuoc closing g');
} else {
    // try with \n
    const thuocMarkerN = 'stroke="#ca8a04" strokeWidth="1.6" strokeLinecap="round" />\n            </g>';
    if (content.includes(thuocMarkerN)) {
        content = content.replace(thuocMarkerN, thuocMarkerN + '\n        </g>');
        console.log('Fixed Tiem Thuoc closing g (with \n)');
    }
}

// 2. In Cao Lau: after newCaoLau, add </g>
const caoLauMarker = 'fill="none" stroke="#fef08a" strokeWidth="1.2" />\r\n        </g>';
if (content.includes(caoLauMarker)) {
    content = content.replace(caoLauMarker, caoLauMarker + '\r\n        </g>');
    console.log('Fixed Cao Lau closing g');
} else {
    const caoLauMarkerN = 'fill="none" stroke="#fef08a" strokeWidth="1.2" />\n        </g>';
    if (content.includes(caoLauMarkerN)) {
        content = content.replace(caoLauMarkerN, caoLauMarkerN + '\n        </g>');
        console.log('Fixed Cao Lau closing g (with \n)');
    }
}

// 3. In Patrons: after newPatrons, add </g>
const patronsMarker = 'stroke="#ca8a04" strokeWidth="0.8" />\r\n                </g>\r\n            </g>';
if (content.includes(patronsMarker)) {
    content = content.replace(patronsMarker, patronsMarker + '\r\n        </g>');
    console.log('Fixed Patrons closing g');
} else {
    const patronsMarkerN = 'stroke="#ca8a04" strokeWidth="0.8" />\n                </g>\n            </g>';
    if (content.includes(patronsMarkerN)) {
        content = content.replace(patronsMarkerN, patronsMarkerN + '\n        </g>');
        console.log('Fixed Patrons closing g (with \n)');
    }
}

const openG = (content.match(/<g[\s>]/g) || []).length;
const closeG = (content.match(/<\/g>/g) || []).length;
console.log('Open <g>:', openG, 'Close </g>:', closeG, 'Difference:', openG - closeG);

fs.writeFileSync('components/login/MidAutumnSvgBackdrop.tsx', content, 'utf8');
