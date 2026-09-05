const fs = require('fs');
const html = fs.readFileSync('c:\\Users\\USER\\Documents\\ordermanagement\\GiaoDienBoCuc.html', 'utf8');

// Try to extract tab titles
const tabMatches = html.matchAll(/<li[^>]*role="tab"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/gi);
const tabs = Array.from(tabMatches).map(m => m[1]);

// Try to extract section titles
const sectionMatches = html.matchAll(/<h2[^>]*title="([^"]+)"[^>]*>/gi);
let sections = Array.from(sectionMatches).map(m => m[1]);
if (sections.length === 0) {
    const h2Matches = html.matchAll(/<h[23][^>]*>([^<]+)<\/h[23]>/gi);
    sections = Array.from(h2Matches).map(m => m[1]);
}

// Try to extract field labels
const labelMatches = html.matchAll(/<label[^>]*>([^<]+)<\/label>/gi);
const labels = Array.from(labelMatches).map(m => m[1]);

console.log("--- TABS ---");
console.log(tabs.join('\n') || 'Không tìm thấy cấu trúc tab');
console.log("\n--- SECTIONS (Vùng) ---");
console.log(sections.slice(0, 15).join('\n') || 'Không tìm thấy cấu trúc section');
console.log("\n--- LABELS (Một số nhãn trường dữ liệu) ---");
console.log(labels.slice(0, 20).join('\n') || 'Không tìm thấy label nào');
