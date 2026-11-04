const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

function printAround(query, len = 600) {
    const idx = content.indexOf(query);
    console.log(`=== QUERY: ${query} (idx: ${idx}) ===`);
    if (idx !== -1) {
        console.log(content.slice(idx, idx + len));
    }
}

printAround('TRÀ CHỦ: CỤ ÔNG', 800);
printAround('TRƯỞNG LÃO HỘI QUÁN', 800);
printAround('CHỊ CHỦ BÁNH MÌ', 800);
printAround('KHÁCH VÀO RA QUÁN CAO LẦU', 800);
printAround('cao lầu', 600);
printAround('Cao Lầu', 600);
printAround('gốm', 600);
printAround('bốc thuốc', 600);
printAround('lồng đèn', 600);
