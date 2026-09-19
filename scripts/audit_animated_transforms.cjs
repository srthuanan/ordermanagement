const fs = require('fs');

const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = code.split('\n');
const results = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('className="animate-') || line.includes("className='animate-")) {
    const classMatch = line.match(/className=["'](animate-[^"']+)["']/);
    const hasTransform = line.includes('transform="');
    results.push({
      line: i + 1,
      className: classMatch ? classMatch[1] : '',
      hasTransformAttr: hasTransform,
      content: line.trim()
    });
  }
}

console.log(`Found ${results.length} animated elements:`);
results.forEach(r => {
  console.log(`Line ${r.line} [hasTransform: ${r.hasTransformAttr}] [class: ${r.className}]`);
  if (r.hasTransformAttr) {
    console.log(`   -> WARNING: CSS class on element with transform attribute: ${r.content}`);
  }
});
