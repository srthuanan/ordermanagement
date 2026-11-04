const fs = require('fs');

let code = fs.readFileSync('bookmarklets/dms_batch_release_purchasereceipt_bookmarklet.txt', 'utf8');

// Replace template literals `...` by converting newlines inside backticks to spaces
code = code.replace(/`([\s\S]*?)`/g, (match, content) => {
    return '`' + content.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ') + '`';
});

// Remove single line comments
let lines = code.split(/\r?\n/);
let noComments = lines.map(line => {
    let t = line.trim();
    if (t.startsWith('//')) return '';
    // Strip trailing comment if not inside quotes
    let idx = line.indexOf('//');
    if (idx !== -1 && !line.includes('http://') && !line.includes('https://') && !line.includes('Display.V1')) {
        let before = line.substring(0, idx);
        // check if quotes are balanced before //
        let singleQuotes = (before.match(/'/g) || []).length;
        let doubleQuotes = (before.match(/"/g) || []).length;
        let backticks = (before.match(/`/g) || []).length;
        if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backticks % 2 === 0) {
            return before;
        }
    }
    return line;
}).join(' ');

// Collapse multi spaces
let singleLine = noComments.replace(/\s+/g, ' ').trim();

// Verify syntax
try {
    const rawJs = singleLine.replace(/^javascript:/, '');
    new Function(rawJs);
    console.log('✅ Syntax valid! Length:', singleLine.length);
    fs.writeFileSync('bookmarklets/dms_batch_release_purchasereceipt_bookmarklet_min.txt', singleLine, 'utf8');
} catch (e) {
    console.error('❌ Syntax error:', e.message);
}
