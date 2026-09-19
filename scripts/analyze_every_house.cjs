const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

// Let's find all rectangles that act as walls (<rect ... fill="url(#wall..." or fill="#..." that represent building facades)
const wallRegex = /<rect[^>]*?(?:fill="url\(#wall[^"]*\)"|fill="#(?:854d0e|9a3412|78350f|b45309|d97706|ca8a04|c2410c|991b1b|7f1d1d|a16207)")[^>]*?>/g;

// Let's find all occurrences in the backdrop
let match;
while ((match = wallRegex.exec(code)) !== null) {
  // get context
  const start = Math.max(0, match.index - 150);
  const snippet = code.substring(start, match.index + match[0].length + 150);
  console.log('--- WALL FOUND at index', match.index, '---');
  console.log(match[0]);
  // Find surrounding comment if any
  const prevComment = code.lastIndexOf('{/*', match.index);
  if (prevComment !== -1 && match.index - prevComment < 300) {
    console.log('Surrounding comment:', code.substring(prevComment, code.indexOf('*/}', prevComment) + 3));
  }
}
