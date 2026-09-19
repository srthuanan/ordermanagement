const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// ==============================================================================
// 1. UPDATE CSS KEYFRAMES TO SCALE 1.32 FOR WALKING PROMENADE GROUPS
// ==============================================================================
const oldPromenadeCssRegex = /\/\* DÒNG NGƯỜI ĐI TỚI DỌC BỜ PHỐ[\s\S]*?\.animate-promenade-rl-4 \{ animation: hoian-promenade-rl 70s linear infinite -64s; \}/;

const newPromenadeCss = `/* DÒNG NGƯỜI ĐI TỚI DỌC BỜ PHỐ (TRÁI -> PHẢI: L -> R) - TỶ LỆ CHUẨN 1.32x */
                @keyframes hoian-promenade-lr {
                    0% { transform: translate(-380px, 502px) scale(1.32); }
                    100% { transform: translate(2280px, 502px) scale(1.32); }
                }
                .animate-promenade-lr-1 { animation: hoian-promenade-lr 64s linear infinite -10s; }
                .animate-promenade-lr-2 { animation: hoian-promenade-lr 72s linear infinite -28s; }
                .animate-promenade-lr-3 { animation: hoian-promenade-lr 60s linear infinite -46s; }
                .animate-promenade-lr-4 { animation: hoian-promenade-lr 76s linear infinite -62s; }

                /* DÒNG NGƯỜI ĐI LUI DỌC BỜ PHỐ (PHẢI -> TRÁI: R -> L) - LẬT MẶT scale(-1.32, 1.32) */
                @keyframes hoian-promenade-rl {
                    0% { transform: translate(2280px, 502px) scale(-1.32, 1.32); }
                    100% { transform: translate(-380px, 502px) scale(-1.32, 1.32); }
                }
                .animate-promenade-rl-1 { animation: hoian-promenade-rl 58s linear infinite -14s; }
                .animate-promenade-rl-2 { animation: hoian-promenade-rl 68s linear infinite -32s; }
                .animate-promenade-rl-3 { animation: hoian-promenade-rl 62s linear infinite -48s; }
                .animate-promenade-rl-4 { animation: hoian-promenade-rl 70s linear infinite -64s; }`;

if (oldPromenadeCssRegex.test(content)) {
    content = content.replace(oldPromenadeCssRegex, newPromenadeCss);
    console.log('Successfully updated promenade walking scale to 1.32x!');
} else {
    console.log('Warning: Promenade CSS regex not matched!');
}

// ==============================================================================
// 2. ENHANCE PROMENADE STONE ROAD WITH WARM LIGHT WASH & COBBLESTONE DETAILS
// ==============================================================================
const oldPromenadeRoad = `<polygon points="0,538 1920,538 1920,565 0,565" fill="#0f172a" />\n        <line x1="0" y1="538" x2="1920" y2="538" stroke="#94a3b8" strokeWidth="1.8" opacity="0.9" />`;

const newPromenadeRoad = `{/* LÒNG ĐƯỜNG ĐÁ PHỐ BẠCH ĐẰNG CỔ KÍNH ĐƯỢC ĐÈN LỒNG CHIẾU SÁNG HOÀNG KIM */}
        <polygon points="0,536 1920,536 1920,565 0,565" fill="#111827" />
        {/* Ánh sáng vàng ấm từ các dãy đèn lồng hắt loang xuống mặt đường đá cổ */}
        <ellipse cx="960" cy="542" rx="960" ry="18" fill="#f59e0b" opacity="0.22" filter="url(#bloomSoft)" />
        <ellipse cx="360" cy="544" rx="280" ry="14" fill="#fef08a" opacity="0.25" filter="url(#bloomSoft)" />
        <ellipse cx="1450" cy="544" rx="340" ry="14" fill="#f59e0b" opacity="0.25" filter="url(#bloomSoft)" />

        {/* Các rãnh đá lát phiến cổ truyền Hội An */}
        <line x1="0" y1="536" x2="1920" y2="536" stroke="#ca8a04" strokeWidth="2.2" opacity="0.95" />
        <line x1="0" y1="544" x2="1920" y2="544" stroke="#475569" strokeWidth="1" strokeDasharray="35,12" opacity="0.6" />
        <line x1="0" y1="552" x2="1920" y2="552" stroke="#334155" strokeWidth="1" strokeDasharray="25,15" opacity="0.5" />
        <line x1="0" y1="565" x2="1920" y2="565" stroke="#1e293b" strokeWidth="2" opacity="0.9" />`;

if (content.includes(oldPromenadeRoad)) {
    content = content.replace(oldPromenadeRoad, newPromenadeRoad);
    console.log('Successfully upgraded promenade road with cobblestone seams & lantern glow!');
} else {
    console.log('Warning: old promenade road not matched!');
}

// ==============================================================================
// 3. SCALE UP PEOPLE AT THE 4 STONE STAIRS RELEASING HOA ĐĂNG (TO SCALE 1.28)
// ==============================================================================
// Bậc thềm 1
content = content.replace(
    '<g transform="translate(235, 522)" className="animate-release-person">',
    '<g transform="translate(235, 520) scale(1.28)" className="animate-release-person">'
);
content = content.replace(
    '<g transform="translate(258, 516)">',
    '<g transform="translate(262, 512) scale(1.28)">'
);

// Bậc thềm 2
content = content.replace(
    '<g transform="translate(535, 524)" className="animate-release-person">',
    '<g transform="translate(535, 522) scale(1.28)" className="animate-release-person">'
);
content = content.replace(
    '<g transform="translate(555, 532)" className="animate-release-person">',
    '<g transform="translate(558, 530) scale(1.28)" className="animate-release-person">'
);

// Bậc thềm 3
content = content.replace(
    '<g transform="translate(1145, 522)" className="animate-release-person">',
    '<g transform="translate(1145, 520) scale(1.28)" className="animate-release-person">'
);
content = content.replace(
    '<g transform="translate(1168, 518)">',
    '<g transform="translate(1170, 514) scale(1.28)">'
);

// Bậc thềm 4
content = content.replace(
    '<g transform="translate(1585, 522)" className="animate-release-person">',
    '<g transform="translate(1585, 520) scale(1.28)" className="animate-release-person">'
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated MidAutumnSvgBackdrop.tsx with polished promenade and scaled figures!');
