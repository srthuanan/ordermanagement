const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

console.log('Original backdrop size:', code.length, 'bytes');

// ==============================================================================
// 1. REUSABLE ARTISTIC VIETNAMESE CHARACTER GENERATORS
// ==============================================================================

function renderFace(cx, cy, r, options = {}) {
    const {
        skinColor = '#fed7aa',
        hasCheek = true,
        eyeDir = 1,
        hasSmile = true,
        hair = 'bun', // 'bun', 'khan_xep', 'elder', 'child', 'short', 'kerchief'
        hairColor = '#020617',
        khanColor = '#0f172a',
        khanBorder = '#ca8a04',
        mustache = false
    } = options;

    const eyeX = cx + 1.8 * eyeDir;
    const eyeY = cy - 0.4;
    const cheekX = cx + 2.2 * eyeDir;
    const cheekY = cy + 1.4;

    let hairSvg = '';
    if (hair === 'bun') {
        hairSvg = `
            <path d="M ${cx - 3},${cy - 5} Q ${cx - 7},${cy + 8} ${cx - 6},${cy + 16} Q ${cx - 2},${cy + 8} ${cx},${cy - 2}" fill="${hairColor}" />
            <ellipse cx="${cx}" cy="${cy - 3.8}" rx="${r * 1.15}" ry="${r * 0.75}" fill="${hairColor}" />
            <circle cx="${cx - 1.8 * eyeDir}" cy="${cy - 4}" r="1.3" fill="#fef08a" filter="url(#bloomSoft)" />
            <circle cx="${cx - 1.8 * eyeDir}" cy="${cy - 4}" r="0.6" fill="#f59e0b" />
        `;
    } else if (hair === 'khan_xep') {
        hairSvg = `
            <ellipse cx="${cx}" cy="${cy - 3.2}" rx="${r * 1.15}" ry="${r * 0.7}" fill="${khanColor}" stroke="${khanBorder}" strokeWidth="0.5" />
            <path d="M ${cx - r},${cy - 2} Q ${cx},${cy - 4.5} ${cx + r},${cy - 2}" stroke="${khanBorder}" strokeWidth="0.6" fill="none" />
            <path d="M ${cx - r * 0.8},${cy - 4} Q ${cx},${cy - 6.5} ${cx + r * 0.8},${cy - 4}" stroke="${khanBorder}" strokeWidth="0.5" fill="none" />
        `;
    } else if (hair === 'elder') {
        hairSvg = `
            <ellipse cx="${cx}" cy="${cy - 3.5}" rx="${r * 1.15}" ry="${r * 0.7}" fill="${khanColor}" stroke="#ca8a04" strokeWidth="0.5" />
            <ellipse cx="${cx}" cy="${cy - 1.5}" rx="${r * 1.05}" ry="${r * 0.4}" fill="#e2e8f0" opacity="0.85" />
            <path d="M ${cx},${cy + 3} Q ${cx + 1.5 * eyeDir},${cy + 9} ${cx + 1 * eyeDir},${cy + 14} Q ${cx - 1 * eyeDir},${cy + 8} ${cx},${cy + 3} Z" fill="#f8fafc" />
        `;
    } else if (hair === 'child') {
        hairSvg = `
            <circle cx="${cx - 2.5}" cy="${cy - 4.5}" r="1.6" fill="${hairColor}" />
            <circle cx="${cx + 2.5}" cy="${cy - 4.5}" r="1.6" fill="${hairColor}" />
            <circle cx="${cx - 2.5}" cy="${cy - 3.5}" r="0.8" fill="#ef4444" />
            <circle cx="${cx + 2.5}" cy="${cy - 3.5}" r="0.8" fill="#ef4444" />
        `;
    } else if (hair === 'short') {
        hairSvg = `
            <path d="M ${cx - r},${cy - 1} Q ${cx - r},${cy - 5.5} ${cx},${cy - 5.5} Q ${cx + r},${cy - 4.5} ${cx + r},${cy - 1} Z" fill="${hairColor}" />
        `;
    } else if (hair === 'kerchief') {
        hairSvg = `
            <path d="M ${cx - r * 1.1},${cy - 1} Q ${cx},${cy - 6} ${cx + r * 1.1},${cy - 1} L ${cx},${cy - 5} Z" fill="#f59e0b" stroke="#b45309" strokeWidth="0.5" />
        `;
    }

    return `
        <rect x="${cx - 1.4}" y="${cy + r * 0.7}" width="2.8" height="${r * 0.7}" fill="${skinColor}" rx="0.6" />
        <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.95}" ry="${r * 1.1}" fill="${skinColor}" />
        ${hasCheek ? `<circle cx="${cheekX}" cy="${cheekY}" r="1.2" fill="#fb7185" opacity="0.6" />` : ''}
        <ellipse cx="${eyeX}" cy="${eyeY}" rx="0.75" ry="1.05" fill="#0f172a" />
        <circle cx="${eyeX + 0.2 * eyeDir}" cy="${eyeY - 0.3}" r="0.32" fill="#ffffff" />
        ${mustache ? `<path d="M ${cx - 0.5},${cy + 2.2} Q ${cx + 1.5 * eyeDir},${cy + 2.9} ${cx + 3 * eyeDir},${cy + 2.2}" stroke="#334155" strokeWidth="0.6" fill="none" />` : ''}
        ${hasSmile ? `<path d="M ${cx + 0.8 * eyeDir},${cy + 2.8} Q ${cx + 1.8 * eyeDir},${cy + 3.8} ${cx + 2.8 * eyeDir},${cy + 2.6}" stroke="#e11d48" strokeWidth="0.55" fill="none" strokeLinecap="round" />` : ''}
        ${hairSvg}
    `;
}

function renderNonLa(cx, cy, w = 22, h = 13) {
    const hw = w / 2;
    return `
        <path d="M ${cx - hw},${cy} Q ${cx},${cy - 1.8} ${cx + hw},${cy} L ${cx},${cy - h} Z" fill="#fef08a" stroke="#b45309" strokeWidth="0.7" />
        <path d="M ${cx - hw * 0.8},${cy - h * 0.25} Q ${cx},${cy - h * 0.25 - 1.2} ${cx + hw * 0.8},${cy - h * 0.25}" stroke="#d97706" strokeWidth="0.5" fill="none" opacity="0.8" />
        <path d="M ${cx - hw * 0.55},${cy - h * 0.55} Q ${cx},${cy - h * 0.55 - 1.0} ${cx + hw * 0.55},${cy - h * 0.55}" stroke="#d97706" strokeWidth="0.45" fill="none" opacity="0.8" />
        <path d="M ${cx - hw * 0.3},${cy - h * 0.8} Q ${cx},${cy - h * 0.8 - 0.8} ${cx + hw * 0.3},${cy - h * 0.8}" stroke="#d97706" strokeWidth="0.4" fill="none" opacity="0.8" />
        <path d="M ${cx - hw * 0.6},${cy} Q ${cx},${cy + 5} ${cx + hw * 0.6},${cy}" stroke="#e11d48" strokeWidth="0.8" fill="none" />
    `;
}

// Bác lái đò Hội An hoàn chỉnh
function buildBoatman(options = {}) {
    const {
        cx = 14, cy = -4,
        aoColor = '#3b1d06',
        skinColor = '#fed7aa',
        facingRight = true,
        oarLength = 55
    } = options;

    const dir = facingRight ? 1 : -1;

    return `
    {/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU ĐIỀU KHIỂN SÀO & MÁI CHÈO - KIỂU NGƯỜI MỚI */}
    <g transform="translate(${cx}, ${cy})">
        <ellipse cx="0" cy="18" rx="6" ry="2" fill="#01040a" opacity="0.5" />
        {/* Nón lá có nan tre & quai lụa */}
        ${renderNonLa(0, -7, 24, 13)}
        {/* Khuôn mặt bác lái đò */}
        ${renderFace(0, -6, 3.5, { skinColor, eyeDir: dir, mustache: true, hair: 'none' })}
        {/* Thân áo bà ba sồng nâu */}
        <path d="M -4.5,-2 L 4.5,-2 L 5.5,17 L -5.5,17 Z" fill="${aoColor}" stroke="#1f0f03" strokeWidth="0.6" />
        {/* Hàng khuy áo bà ba trước ngực */}
        <circle cx="${dir * 1}" cy="2" r="0.6" fill="#ca8a04" />
        <circle cx="${dir * 1}" cy="6" r="0.6" fill="#ca8a04" />
        <circle cx="${dir * 1}" cy="10" r="0.6" fill="#ca8a04" />
        {/* Cánh tay lực lưỡng cầm mái chèo nan đẩy nước */}
        <g className="animate-oar-row">
            <path d="M ${-2 * dir},0 Q ${3 * dir},4 ${6 * dir},9" stroke="${skinColor}" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <circle cx="${6 * dir}" cy="9" r="1.5" fill="${skinColor}" />
            <line x1="${5 * dir}" y1="8" x2="${-26 * dir}" y2="${oarLength - 18}" stroke="#5c3818" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M ${-26 * dir},${oarLength - 18} L ${-36 * dir},${oarLength - 8}" stroke="#854d0e" strokeWidth="5.2" strokeLinecap="round" />
            {/* Vệt nước rẽ sóng mái chèo */}
            <ellipse cx="${-31 * dir}" cy="${oarLength - 13}" rx="6" ry="2.2" fill="#fef08a" opacity="0.6" />
        </g>
    </g>
    `;
}

// Thiếu nữ trên thuyền thả hoa đăng
function buildBoatMaiden(options = {}) {
    const {
        cx = 56, cy = -3,
        aoColor = '#db2777',
        quanColor = '#fef08a',
        lanternColor = '#f43f5e',
        facingRight = true
    } = options;

    const dir = facingRight ? 1 : -1;

    return `
    {/* THIẾU NỮ ÁO DÀI TỰA MẠN THUYỀN THẢ HOA ĐĂNG - KIỂU NGƯỜI MỚI */}
    <g transform="translate(${cx}, ${cy})">
        <ellipse cx="0" cy="18" rx="6" ry="1.8" fill="#01040a" opacity="0.4" />
        {/* Thân áo dài ôm eo duyên dáng */}
        <path d="M -4,2 L 4,2 L 5.5,15 L -5.5,15 Z" fill="${aoColor}" />
        <path d="M -2,4 Q ${2 * dir},8 ${4 * dir},15" stroke="${quanColor}" strokeWidth="0.6" />
        {/* Cổ áo & khuy ngọc */}
        <path d="M -2.5,-2 L 2.5,-2 L 3,2 L -3,2 Z" fill="${aoColor}" stroke="#fef08a" strokeWidth="0.5" />
        <circle cx="${1.5 * dir}" cy="0" r="0.6" fill="#fef08a" />
        {/* Khuôn mặt thiếu nữ */}
        ${renderFace(0, -6, 3.6, { skinColor: '#fed7aa', eyeDir: dir, hair: 'bun' })}
        {/* Cánh tay thả hoa đăng */}
        <path d="M ${2 * dir},3 Q ${6 * dir},7 ${9 * dir},12" stroke="${aoColor}" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="${9 * dir}" cy="12" r="1.4" fill="#fed7aa" />
        {/* Hoa sen hoa đăng rực rỡ thả xuống mặt nước */}
        <g transform="translate(${12 * dir}, 15)" filter="url(#bloomHigh)">
            <ellipse cx="0" cy="1.5" rx="5" ry="2.5" fill="${lanternColor}" />
            <polygon points="-3,1 0,-2 3,1 0,3" fill="#fbcfe8" />
            <circle cx="0" cy="0" r="1.6" fill="#ffffff" />
            <ellipse cx="0" cy="4" rx="8" ry="2" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    </g>
    `;
}

// Chàng trai / Khách trên thuyền
function buildBoatGentleman(options = {}) {
    const {
        cx = 36, cy = -2,
        aoColor = '#0284c7',
        khanColor = '#0f172a',
        facingRight = true
    } = options;

    const dir = facingRight ? 1 : -1;

    return `
    {/* CHÀNG TRAI ÁO NGŨ THÂN TỰA MẠN THUYỀN - KIỂU NGƯỜI MỚI */}
    <g transform="translate(${cx}, ${cy})">
        <ellipse cx="0" cy="18" rx="6" ry="1.8" fill="#01040a" opacity="0.4" />
        <path d="M -4.5,2 L 4.5,2 L 5.2,15 L -5.2,15 Z" fill="${aoColor}" />
        <circle cx="${1.5 * dir}" cy="5" r="0.6" fill="#ca8a04" />
        <circle cx="${1.5 * dir}" cy="9" r="0.6" fill="#ca8a04" />
        ${renderFace(0, -6, 3.7, { skinColor: '#fed7aa', eyeDir: dir, hair: 'khan_xep', khanColor })}
        <path d="M ${2 * dir},3 Q ${5 * dir},6 ${7 * dir},10" stroke="${aoColor}" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="${7 * dir}" cy="10" r="1.4" fill="#fed7aa" />
    </g>
    `;
}

console.log('Artistic character generators compiled successfully.');
