const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const shops = [
  'house1NewDoor', 'house2NewDoor', 'TRÀ CHỦ', 'VỊ KHÁCH TAO NHÃ',
  'LƯƠNG Y', 'TIỂU ĐỒNG', 'CHỦ QUÁN (BÀ BÉ', 'VỊ KHÁCH NGỒI GHẾ GỖ',
  'Quan Công', 'NGƯỜI HÀNH LỄ', 'TIỂU ĐỒNG GÕ CHUÔNG',
  'NGHỆ NHÂN CHUỐT GỐM', 'VỊ KHÁCH THƯỞNG LÃM',
  'THỢ XẺ BÁNH MÌ', 'KHÁCH HÀNG CHỜ',
  'NGHỆ NHÂN DỆT LỤA', 'KHÁCH THỬ KHĂN LỤA',
  'THỢ CHẾ TÁC LỒNG ĐÈN', 'EM BÉ RƯỚC ĐÈN',
  'BARISTA', 'VỊ KHÁCH NGỒI BAN CÔNG'
];

shops.forEach(s => {
  const idx = code.indexOf(s);
  if (idx !== -1) {
    const line = code.substring(0, idx).split('\n').length;
    console.log(`Found "${s}" at line ${line}`);
  } else {
    console.log(`NOT found: "${s}"`);
  }
});
