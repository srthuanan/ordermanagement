const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

function inspectClose(searchStr) {
    const idx = content.indexOf(searchStr);
    console.log('=== CLOSE OF ' + searchStr + ' ===');
    if (idx !== -1) {
        console.log(content.slice(idx + 600, idx + 1100));
    }
}

inspectClose('CHÚ TIỂU ĐỒNG ÁO NÂU CẦM CHÀY GIÃ THUỐC TRONG CỐI ĐỒNG - KIỂU NGƯỜI MỚI');
inspectClose('VỊ KHÁCH NGỒI GHẾ GỖ: CẦM ĐŨA GẮP SỢI MÌ CAO LẦU ĂN NGON LÀNH - KIỂU NGƯỜI MỚI');
inspectClose('QUÝ CÔ GHÉ HIỆU TƠ LỤA Á ĐÔNG - KIỂU NGƯỜI MỚI');
