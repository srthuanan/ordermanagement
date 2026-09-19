const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const backdropPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let code = fs.readFileSync(backdropPath, 'utf8');

console.log('1. Adding GPU hardware acceleration to CSS...');
const gpuCss = `
                /* --- GPU HARDWARE ACCELERATION (CHỐNG GIẬT LAG TỐI ĐA) --- */
                .animate-moon-breathe,
                .animate-vinfast-car,
                .animate-vinfast-drl,
                .animate-boat-flow-1,
                .animate-boat-flow-2,
                .animate-boat-flow-3,
                .animate-thien-dang-sway,
                .animate-candle-flicker,
                [class*="animate-fw-"],
                [class*="thien-dang-float-"],
                [class*="animate-promenade-"] {
                    will-change: transform, opacity;
                    transform: translateZ(0);
                    backface-visibility: hidden;
                }
`;

const styleClosingTag = '`}</style>';
if (code.includes(styleClosingTag) && !code.includes('GPU HARDWARE ACCELERATION')) {
  code = code.replace(styleClosingTag, gpuCss + '\n            ' + styleClosingTag);
  console.log('Added GPU hardware acceleration CSS!');
}

console.log('2. Removing runtime mouse offsets...');
code = code.replace('const moonOffsetX = mouseX * 0.02;\n    const moonOffsetY = mouseY * 0.02;\n    const cloudOffsetX = mouseX * 0.04;', '// Optimized: Pure GPU CSS, zero runtime CPU mouse recalculations\n    const moonOffsetX = 0;\n    const moonOffsetY = 0;\n    const cloudOffsetX = 0;');

console.log('3. Adding CSS contain: strict and isolation: isolate to root container...');
code = code.replace(
  'className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0"',
  'className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0" style={{ contain: \'strict\', isolation: \'isolate\' }}'
);

console.log('4. Wrapping with React.memo with immutable comparator...');
code = code.replace(
  'export const MidAutumnSvgBackdrop: React.FC<MidAutumnSvgBackdropProps> = ({ mouseX = 0, mouseY = 0 }) => {',
  'const MidAutumnSvgBackdropComponent: React.FC<MidAutumnSvgBackdropProps> = () => {'
);

const componentClosing = '};\n';
if (!code.includes('React.memo(MidAutumnSvgBackdropComponent')) {
  const lastBraceIdx = code.lastIndexOf('};\n');
  if (lastBraceIdx !== -1) {
    code = code.substring(0, lastBraceIdx + 3) + '\nexport const MidAutumnSvgBackdrop = React.memo(MidAutumnSvgBackdropComponent, () => true);\n';
    console.log('Wrapped MidAutumnSvgBackdrop with React.memo!');
  }
}

try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for optimized backdrop!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('SUCCESS: Written optimized backdrop to MidAutumnSvgBackdrop.tsx');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}

console.log('5. Optimizing MidAutumnLoginView.tsx...');
const loginViewPath = path.join(__dirname, '../components/login/MidAutumnLoginView.tsx');
let loginView = fs.readFileSync(loginViewPath, 'utf8');
if (loginView.includes('<MidAutumnSvgBackdrop mouseX={mousePos.x} mouseY={mousePos.y} />')) {
  loginView = loginView.replace(
    '<MidAutumnSvgBackdrop mouseX={mousePos.x} mouseY={mousePos.y} />',
    '<MidAutumnSvgBackdrop />'
  );
  try {
    esbuild.transformSync(loginView, { loader: 'tsx' });
    fs.writeFileSync(loginViewPath, loginView, 'utf8');
    console.log('SUCCESS: Optimized MidAutumnLoginView.tsx to not pass mouse props!');
  } catch (e) {
    console.error('LoginView esbuild failed:', e.message);
  }
}
