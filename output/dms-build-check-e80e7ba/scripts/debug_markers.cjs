const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

function checkSection(name, startKey, endKey) {
    const s = content.indexOf(startKey);
    const e = s !== -1 ? content.indexOf(endKey, s) : -1;
    console.log(name, '-> start:', s, 'end:', e);
}

checkSection('Tra Quan 1', '{/* 1. TRÀ CHỦ: CỤ ÔNG RÂU BẠC ÁO GẤM LAM CÚI NGƯỜI RÓT TRÀ SEN ĐIỆU NGHỆ */}', '<g filter="url(#dropShadow)">\n            <path d="M -28,84');
checkSection('Tiem Thuoc', '{/* 1. LƯƠNG Y: CỤ ĐỒ RÂU DÀI CẦM CÂN TIỂU LY ĐỒNG NÂNG NGANG TẦM MẮT */}', '<g filter="url(#dropShadow)">\n            <path d="M -22,86');
checkSection('Cao Lau', '{/* 1. CHỦ QUÁN (BÀ BÉ - ÁO BÀ BA HỒNG THẮM, CẦM VÁ CHAN NƯỚC SỐT VÀO TÔ) */}', '<g filter="url(#dropShadow)">\n            <path d="M -26,90');
checkSection('Banh Mi', '{/* 1. CHỊ CHỦ BÁNH MÌ: ÁO HOA TẠP DỀ TRẮNG, CẦM DAO XẺ BÁNH & QUẾT PATE */}', '</g>\n\n        <g filter="url(#dropShadow)">\n            <path d="M 466,90');
checkSection('Long Den', '{/* 1. NGHỆ NHÂN HUỲNH VĂN: NGỒI GHẾ CHUỐT NAN TRE & DÁN LỤA LÊN KHUNG ĐÈN */}', '<g filter="url(#dropShadow)">\n            <path d="M 152,70');
checkSection('Patrons', '{/* 1. KHÁCH VÀO RA QUÁN CAO LẦU BÀ BÉ (Ăn mì rồi bước ra phe phẩy quạt nan) */}', '</g>\n\n    {/* BỜ KÈ ĐÁ BẠCH ĐẰNG: ĐÔNG ĐÚC DÒNG NGƯỜI');
