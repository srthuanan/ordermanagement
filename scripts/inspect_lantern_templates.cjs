const fs = require('fs');
const c = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const start = c.indexOf('<g id="hoian-super-dense-hoa-dang-stream">');
const end = c.indexOf('<rect x="360" y="320" width="1200" height="660"', start);
const sub = c.substring(start, end);

const types = [
  '1. HOA SEN 3 TẦNG BUNG NỞ TRÊN LÁ SEN XANH',
  '2. THUYỀN GIẤY HOA ĐĂNG MŨI NHỌN ORIGAMI',
  '3. ĐÈN HOA CÚC / HOA SÚNG TRÒN NỞ RỘ',
  '4. ĐÈN HOA ĐĂNG NGÔI SAO 5 CÁNH TRUNG THU',
  '5. ĐÈN BÚP SEN HỒNG E ẤP TRÊN MẶT NƯỚC',
  '6. ĐÈN BÁT GIÁC HOÀNG GIA DÁT VÀNG PHẢN CHIẾU ĐA SẮC'
];

types.forEach((t, i) => {
  const idx = sub.indexOf(t);
  console.log('Type', i + 1, 'found at:', idx);
});
