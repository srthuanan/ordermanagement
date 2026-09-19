const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// Function to build a rowing boat JSX
function buildBoatJsx(laneClass, y, scale, hasOarsman, lanternColor) {
    return `
    {/* THUYỀN CHÈO THEO DÒNG NƯỚC SÔNG HOÀI: ${laneClass} (y=${y}, scale=${scale}) */}
    <g className="${laneClass}">
        <g transform="translate(0, ${y}) scale(${scale})" className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="45" cy="22" rx="55" ry="9" fill="#01040a" opacity="0.75" />
            {/* Gợn sóng rẽ nước sau đuôi thuyền */}
            <path d="M -22,12 Q -45,18 -75,22 M -22,18 Q -40,24 -65,30" stroke="#fde047" strokeWidth="1.2" opacity="0.5" className="animate-boat-wake" fill="none" />
            
            {/* Thân thuyền nan gỗ Hội An mũi cong */}
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5 Q 85,32 45,34 Q 10,32 -22,5 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.8" />
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5" fill="none" stroke="#854d0e" strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="18" x2="10" y2="28" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="32" y1="21" x2="32" y2="31" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="58" y1="21" x2="58" y2="31" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="82" y1="18" x2="82" y2="28" stroke="#3b1d06" strokeWidth="1.5" />
            <path d="M 22,8 C 22,-10 72,-10 72,8 Z" fill="#381e05" stroke="#1c0e02" strokeWidth="1.5" />
            <path d="M 32,5 C 32,-7 62,-7 62,5" fill="none" stroke="#a16207" strokeWidth="1.2" opacity="0.7" />

            ${hasOarsman ? `
            {/* Người chèo đò nón lá áo bà ba với động tác vung mái chèo chèo nước chân thực */}
            <g transform="translate(18, -4)">
                <path d="M -10,-6 L 10,-6 L 0,-17 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-4 L 4,16" stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" />
                <ellipse cx="2" cy="1" rx="4.5" ry="6" fill="#334155" />
                <g className="animate-oar-row">
                    <line x1="5" y1="5" x2="-26" y2="36" stroke="#5c3818" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M -26,36 L -35,45" stroke="#854d0e" strokeWidth="4.5" strokeLinecap="round" />
                </g>
            </g>
            ` : ''}

            {/* Đèn lồng mũi thuyền soi sáng mặt nước */}
            <line x1="110" y1="5" x2="110" y2="-12" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="110" cy="-4" rx="6" ry="8.5" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="110" cy="-4" r="2.6" fill="#ffffff" />
            <ellipse cx="110" cy="28" rx="14" ry="5" fill="${lanternColor}" opacity="0.55" filter="url(#bloomSoft)" />
        </g>
    </g>
    `;
}

const dynamicBoatsJsx = `
    {/* ============================================================================== */}
    {/* CÁC CHIẾC THUYỀN NAN GỖ HỘI AN CHÈO THEO DÒNG NƯỚC SÔNG HOÀI                   */}
    {/* ============================================================================== */}
    ${buildBoatJsx('animate-boat-row-lane1', 625, 1.0, true, '#ef4444')}
    ${buildBoatJsx('animate-boat-row-lane2', 670, 1.1, true, '#f59e0b')}
    ${buildBoatJsx('animate-boat-row-lane3', 785, 1.3, true, '#ef4444')}
    ${buildBoatJsx('animate-boat-row-lane4', 585, 0.72, false, '#f59e0b')}
`;

// Locate start and end of static boats
const targetStart = '<g transform="translate(235, 620) scale(1)" filter="url(#dropShadow)">';
const hoaDangMarker = '<g className="animate-hoa-dang-1">';

const startIndex = code.indexOf(targetStart);
const endIndex = code.indexOf(hoaDangMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = code.substring(0, startIndex);
    const after = code.substring(endIndex); // retain </g>\n\n...
    code = before + dynamicBoatsJsx.trim() + '\n\n    ' + after;
    console.log('Successfully replaced static boats with dynamic rowing boats!');
} else {
    console.error('Could not find static boats block indices!', { startIndex, endIndex });
    process.exit(1);
}

// Validate with esbuild
try {
    esbuild.transformSync(code, { loader: 'tsx' });
    console.log('esbuild check PASSED for flowing rowing boats!');
    fs.writeFileSync(backdropPath, code, 'utf8');
    console.log('Successfully updated', backdropPath);
} catch (err) {
    console.error('esbuild check FAILED:', err.message);
    process.exit(1);
}
