const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const queries = [
    {
        name: 'Tra Quan 1',
        startKey: '{/* 1. TRÀ CHỦ: CỤ ÔNG RÂU BẠC ÁO GẤM LAM CÚI NGƯỜI RÓT TRÀ SEN ĐIỆU NGHỆ */}',
        endAnchor: '<path d="M -28,84'
    },
    {
        name: 'Tiem Thuoc',
        startKey: '{/* 1. LƯƠNG Y: CỤ ĐỒ RÂU DÀI CẦM CÂN TIỂU LY ĐỒNG NÂNG NGANG TẦM MẮT */}',
        endAnchor: '<path d="M -22,86'
    },
    {
        name: 'Cao Lau',
        startKey: '{/* 1. CHỦ QUÁN (BÀ BÉ - ÁO BÀ BA HỒNG THẮM, CẦM VÁ CHAN NƯỚC SỐT VÀO TÔ) */}',
        endAnchor: '<path d="M -26,90'
    },
    {
        name: 'Banh Mi',
        startKey: '{/* 1. CHỊ CHỦ BÁNH MÌ: ÁO HOA TẠP DỀ TRẮNG, CẦM DAO XẺ BÁNH & QUẾT PATE */}',
        endAnchor: '<path d="M 466,90'
    },
    {
        name: 'Long Den',
        startKey: '{/* 1. NGHỆ NHÂN HUỲNH VĂN: NGỒI GHẾ CHUỐT NAN TRE & DÁN LỤA LÊN KHUNG ĐÈN */}',
        endAnchor: '<path d="M 152,70'
    },
    {
        name: 'Patrons',
        startKey: '{/* 1. KHÁCH VÀO RA QUÁN CAO LẦU BÀ BÉ (Ăn mì rồi bước ra phe phẩy quạt nan) */}',
        endAnchor: '{/* BỜ KÈ ĐÁ BẠCH ĐẰNG'
    }
];

queries.forEach(q => {
    const s = content.indexOf(q.startKey);
    const anchorIdx = content.indexOf(q.endAnchor, s);
    console.log(q.name, 'start:', s, 'anchor:', anchorIdx);
    if (anchorIdx !== -1) {
        // Look back from anchor to find </g>
        const lastCloseG = content.lastIndexOf('</g>', anchorIdx);
        console.log('   last </g> before anchor:', lastCloseG);
        console.log('   between close and anchor:', JSON.stringify(content.slice(lastCloseG, anchorIdx)));
    }
});
