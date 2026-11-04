const fs = require('fs');

// Patch replace_with_flowing_boats.cjs
let b1 = fs.readFileSync('scripts/replace_with_flowing_boats.cjs', 'utf8');
const targetEnd = `const targetEnd = '</g>\\n\\n    \\n    \\n    \\n    \\n        \\n<g className="animate-hoa-dang-1">';`;
if (b1.includes('targetEnd')) {
  b1 = b1.replace(
    /const targetEnd = [^;]+;/,
    'const hoaDangMarker = \'<g className="animate-hoa-dang-1">\';'
  ).replace(
    'const endIndex = code.indexOf(targetEnd);',
    'const endIndex = code.indexOf(hoaDangMarker);'
  ).replace(
    'const after = code.substring(endIndex + 4);',
    'const after = code.substring(endIndex);'
  );
  fs.writeFileSync('scripts/replace_with_flowing_boats.cjs', b1, 'utf8');
  console.log('Patched replace_with_flowing_boats.cjs');
}

// Patch build_bustling_hoian_scene.cjs
let b2 = fs.readFileSync('scripts/build_bustling_hoian_scene.cjs', 'utf8');
const targetBoat = `const boatsSectionIndex = oldMiddle.indexOf('{/* THUYỀN CHÈO THEO DÒNG NƯỚC SÔNG HOÀI');`;
if (b2.includes(targetBoat)) {
  b2 = b2.replace(targetBoat, `const boatsSectionIndex = oldMiddle.indexOf('THUYỀN');`);
  fs.writeFileSync('scripts/build_bustling_hoian_scene.cjs', b2, 'utf8');
  console.log('Patched build_bustling_hoian_scene.cjs');
}
