const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const start = code.indexOf('<g id="hoian-street-trees-and-willows"');
const end = code.indexOf('{/* DẢI NGÂN HÀ 50+ ĐÓA HOA ĐĂNG');

console.log('Start index:', start, 'End index:', end);
console.log('Start line:', code.substring(0, start).split('\n').length);
console.log('End line:', code.substring(0, end).split('\n').length);
