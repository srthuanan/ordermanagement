const fs = require('fs');

const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

// Let's parse all opening and closing tags and track the translation stack
// Whenever we see a <circle> or <path> with fill, print its world position if world Y is between 150 and 360 and world X is between 300 and 800

const lines = code.split('\n');

let currentStack = [{ x: 0, y: 0 }];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check for transform="translate(x, y)"
  const translateMatch = line.match(/transform=["'][^"']*translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
  
  // Note: multiple tags can open/close on lines, but mostly each <g> is on its own line
  const opensG = (line.match(/<g\b/g) || []).length;
  const closesG = (line.match(/<\/g>/g) || []).length;

  // If this line has translate
  let newX = currentStack[currentStack.length - 1].x;
  let newY = currentStack[currentStack.length - 1].y;

  if (translateMatch) {
    newX += parseFloat(translateMatch[1]);
    newY += parseFloat(translateMatch[2]);
  }

  // If <g> opens, push
  for (let g = 0; g < opensG; g++) {
    currentStack.push({ x: newX, y: newY, line: i + 1, text: line.trim() });
  }

  const curPos = currentStack[currentStack.length - 1];

  // If there is a circle or path or rect
  if (line.includes('<circle') || line.includes('<path') || line.includes('<rect') || line.includes('<ellipse')) {
    // Check if cx or cy or x or y exists
    const cxMatch = line.match(/(?:cx|x)=["'](-?[\d.]+)["']/);
    const cyMatch = line.match(/(?:cy|y)=["'](-?[\d.]+)["']/);

    let localX = cxMatch ? parseFloat(cxMatch[1]) : 0;
    let localY = cyMatch ? parseFloat(cyMatch[1]) : 0;

    let worldX = curPos.x + localX;
    let worldY = curPos.y + localY;

    // We are looking for the two floating figures in the screenshot:
    // Left figure is near Trà Quán Hội An (world X ~ 360-460, world Y ~ 240-340)
    // Right figure is near the roof of Đồng Nhân Đường / Cao Lầu (world X ~ 600-750, world Y ~ 240-340)
    if (worldY >= 230 && worldY <= 360 && worldX >= 320 && worldX <= 750) {
      if (!line.includes('strokeWidth="1.2"') && !line.includes('stroke="#f59e0b"') && !line.includes('roof') && !line.includes('wall')) {
        console.log(`Line ${i + 1} [world pos ~ (${worldX.toFixed(1)}, ${worldY.toFixed(1)})]: ${line.trim()}`);
      }
    }
  }

  // If </g> closes, pop
  for (let g = 0; g < closesG; g++) {
    if (currentStack.length > 1) {
      currentStack.pop();
    }
  }
}
