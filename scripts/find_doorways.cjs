const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

function findTag(str, startFrom = 0) {
  const idx = content.indexOf(str, startFrom);
  return { idx, line: content.substring(0, idx).split('\n').length };
}

console.log('House 1 (Trà Quán Cửa):', findTag('{/* CỬA RA VÀO GỖ & QUẦY TRÀ THẢO MỘC HỘI AN */}'));
console.log('House 2 (Đồng Nhân Đường Cửa):', findTag('{/* CỬA HIỆU THUỐC BẮC MỞ RỘNG & TỦ THUỐC TRĂM NGĂN GỖ CỔ */}'));
console.log('House 3 (Cao Lầu Cửa):', findTag('{/* CỬA RA VÀO BẾP MỞ & NỒI NƯỚC DÙNG CAO LẦU NGHI NGÚT KHÓI */}'));
console.log('House 4 (Quảng Đông Cổng):', findTag('{/* Cổng vòm son đỏ di sản */}'));
console.log('House 5 (Gốm Cửa):', findTag('{/* CỬA HIỆU GỐM MỞ SÁNG & BÀN XOAY NẮN GỐM TRUYỀN THỐNG */}'));
console.log('House 6 (Bánh Mì Cửa):', findTag('{/* CỬA HÀNG BÁNH MÌ MỞ & QUẦY TỦ BÁNH VÀNG ÓNG BỐC KHÓI THƠM LỪNG */}'));
console.log('House 7 (Tơ Lụa Cửa):', findTag('CHỦ HIỆU TƠ LỤA: CÔ CHỦ ÁO DÀI'));
console.log('House 8 (Lồng Đèn Cửa):', findTag('{/* CỬA TIỆM LỒNG ĐÈN RỰC RỠ SẮC MÀU */}'));
console.log('House 9 (Faifo Cửa):', findTag('{/* CỬA QUÁN CÀ PHÊ & QUẦY BAR GỖ CỔ ĐIỂN */}'));
