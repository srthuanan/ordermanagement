const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// 1. Update <style> to add the new boat rowing keyframes
const boatKeyframes = `
                /* THUYỀN NAN CHÈO THEO DÒNG NƯỚC SÔNG HOÀI */
                @keyframes hoian-boat-travel-1 {
                    0% { transform: translateX(-220px); }
                    100% { transform: translateX(2120px); }
                }
                .animate-boat-row-lane1 {
                    animation: hoian-boat-travel-1 52s linear infinite;
                }

                @keyframes hoian-boat-travel-2 {
                    0% { transform: translateX(-240px); }
                    100% { transform: translateX(2120px); }
                }
                .animate-boat-row-lane2 {
                    animation: hoian-boat-travel-2 62s linear infinite -28s;
                }

                @keyframes hoian-boat-travel-3 {
                    0% { transform: translateX(-260px); }
                    100% { transform: translateX(2120px); }
                }
                .animate-boat-row-lane3 {
                    animation: hoian-boat-travel-3 46s linear infinite -15s;
                }

                @keyframes hoian-boat-travel-4 {
                    0% { transform: translateX(-200px); }
                    100% { transform: translateX(2120px); }
                }
                .animate-boat-row-lane4 {
                    animation: hoian-boat-travel-4 75s linear infinite -45s;
                }

                /* Nhịp chèo đò và sóng nhấp nhô theo từng nhịp đẩy mái chèo */
                @keyframes hoian-boat-stroke-bob {
                    0%, 100% { transform: translateY(0px) rotate(0.8deg); }
                    35% { transform: translateY(-4px) rotate(-1.2deg); }
                    65% { transform: translateY(2px) rotate(0.5deg); }
                }
                .animate-boat-stroke {
                    animation: hoian-boat-stroke-bob 3.2s ease-in-out infinite;
                }

                /* Động tác vung mái chèo chèo nước */
                @keyframes hoian-oar-rowing {
                    0%, 100% { transform: rotate(-14deg); }
                    40% { transform: rotate(18deg); }
                    55% { transform: rotate(8deg); }
                    80% { transform: rotate(-8deg); }
                }
                .animate-oar-row {
                    animation: hoian-oar-rowing 3.2s ease-in-out infinite;
                    transform-origin: 5px 5px;
                }

                /* Vệt sóng rẽ nước sau đuôi thuyền */
                @keyframes hoian-boat-wake {
                    0%, 100% { opacity: 0.3; transform: scaleX(0.9); }
                    50% { opacity: 0.65; transform: scaleX(1.2); }
                }
                .animate-boat-wake {
                    animation: hoian-boat-wake 3.2s ease-in-out infinite;
                }
`;

// Replace old boat styles
const oldBoatStyleRegex = /\/\* HỘI AN ANCIENT TOWN ANIMATIONS \*\/[\s\S]*?@keyframes hoian-hoa-dang-float-1/;
if (oldBoatStyleRegex.test(code)) {
    code = code.replace(oldBoatStyleRegex, `/* HỘI AN ANCIENT TOWN ANIMATIONS */\n${boatKeyframes}\n@keyframes hoian-hoa-dang-float-1`);
    console.log('Updated boat keyframes in style');
}

// 2. Build the 4 dynamic rowing boats
function buildBoatJsx(laneClass, y, scale, hasOarsman, lanternColor) {
    return `
    {/* THUYỀN CHÈO THEO DÒNG NƯỚC: ${laneClass} (y=${y}, scale=${scale}) */}
    <g className="${laneClass}">
        <g transform="translate(0, ${y}) scale(${scale})" className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="45" cy="22" rx="55" ry="9" fill="#01040a" opacity="0.75" />
            {/* Gợn sóng rẽ nước đuôi thuyền */}
            <path d="M -22,12 Q -45,18 -75,22 M -22,18 Q -40,24 -65,30" stroke="#fde047" strokeWidth="1.2" opacity="0.5" className="animate-boat-wake" fill="none" />
            
            {/* Thân thuyền nan uốn lượn mũi cong */}
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
    {/* 4 CHIẾC THUYỀN NAN GỖ HỘI AN CHÈO THEO DÒNG NƯỚC SÔNG HOÀI ĐỘNG LIÊN TỤC       */}
    {/* ============================================================================== */}
    ${buildBoatJsx('animate-boat-row-lane1', 625, 1.0, true, '#ef4444')}
    ${buildBoatJsx('animate-boat-row-lane2', 670, 1.1, true, '#f59e0b')}
    ${buildBoatJsx('animate-boat-row-lane3', 785, 1.3, true, '#ef4444')}
    ${buildBoatJsx('animate-boat-row-lane4', 585, 0.72, false, '#f59e0b')}
`;

// Replace the old static boats section:
// Find lines between the wave paths and the floating lotus lanterns
const boatSectionRegex = /<path d="M 1410,708 Q 1670,722 1920,708"[\s\S]*?(?=<g transform="translate\(515, 635\))/;

if (boatSectionRegex.test(code)) {
    code = code.replace(boatSectionRegex, `<path d="M 1410,708 Q 1670,722 1920,708" stroke="#fde047" strokeWidth="3.2" fill="none" />\n        </g>\n    </g>\n${dynamicBoatsJsx}\n`);
    console.log('Replaced static boats with flowing rowing boats!');
} else {
    console.warn('Could not find boat section by regex, inspecting alternatives...');
}

// Clean up any stray comments or tags
code = code.replace(/<!--[\s\S]*?-->/g, '');

// Test with esbuild
try {
    esbuild.transformSync(code, { loader: 'tsx' });
    console.log('esbuild check PASSED for rowing boats!');
    fs.writeFileSync(backdropPath, code, 'utf8');
    console.log('Successfully written', backdropPath);
} catch (err) {
    console.error('esbuild check FAILED:', err.message);
    process.exit(1);
}
