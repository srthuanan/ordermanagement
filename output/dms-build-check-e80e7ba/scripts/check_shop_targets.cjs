const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const targets = [
    'TRÀ CHỦ: CỤ ÔNG',
    'THẦY THUỐC BẮC',
    'BÀ BÉ CHỦ QUÁN',
    'TRƯỞNG LÃO HỘI QUÁN',
    'CHỊ CHỦ BÁNH MÌ',
    'NGHỆ NHÂN HUỲNH VĂN',
    'KHÁCH VÀO RA QUÁN CAO LẦU'
];

targets.forEach(t => {
    const idx = content.indexOf(t);
    console.log(t, '-> idx:', idx);
    if (idx !== -1) {
        console.log('Snippet:', content.slice(idx - 10, idx + 80));
    }
});
