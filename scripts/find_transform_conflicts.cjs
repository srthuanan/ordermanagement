const fs = require('fs');

const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

// Find all CSS keyframe animations that define `transform`
const keyframes = {};
const kfRegex = /@keyframes\s+([\w-]+)\s*\{([^}]+(?:\{[^}]+\}[^}]*)*)\}/g;
let m;
while ((m = kfRegex.exec(code)) !== null) {
  const name = m[1];
  const body = m[2];
  if (body.includes('transform')) {
    keyframes[name] = true;
  }
}
console.log('Keyframes that use transform:', Object.keys(keyframes));

// Find CSS rules that link class to animation
const classToKeyframe = {};
const classRegex = /\.([\w-]+)\s*\{[^}]*animation:\s*([\w-]+)/g;
while ((m = classRegex.exec(code)) !== null) {
  const className = m[1];
  const animName = m[2];
  if (keyframes[animName]) {
    classToKeyframe[className] = animName;
  }
}
console.log('\nClasses that animate transform:', classToKeyframe);

// Now find any SVG elements that have BOTH transform attribute AND one of these classes
const lines = code.split('\n');
console.log('\nSVG elements with conflict:');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('transform="') || l.includes("transform='")) {
    for (const cls of Object.keys(classToKeyframe)) {
      if (l.includes(cls)) {
        console.log(`Line ${i + 1}: class=${cls} (anim=${classToKeyframe[cls]}):\n  ${l.trim()}`);
      }
    }
  }
}
