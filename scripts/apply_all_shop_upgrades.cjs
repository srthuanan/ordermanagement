const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

function renderFace(cx, cy, r, options = {}) {
    const {
        skinColor = '#fed7aa',
        hasCheek = true,
        eyeDir = 1,
        hasSmile = true,
        hair = 'bun',
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

function renderNonLa(cx, cy, w = 24, h = 13) {
    const hw = w / 2;
    return `
        <path d="M ${cx - hw},${cy} Q ${cx},${cy - 1.8} ${cx + hw},${cy} L ${cx},${cy - h} Z" fill="#fef08a" stroke="#b45309" strokeWidth="0.7" />
        <path d="M ${cx - hw * 0.8},${cy - h * 0.25} Q ${cx},${cy - h * 0.25 - 1.2} ${cx + hw * 0.8},${cy - h * 0.25}" stroke="#d97706" strokeWidth="0.5" fill="none" opacity="0.8" />
        <path d="M ${cx - hw * 0.55},${cy - h * 0.55} Q ${cx},${cy - h * 0.55 - 1.0} ${cx + hw * 0.55},${cy - h * 0.55}" stroke="#d97706" strokeWidth="0.45" fill="none" opacity="0.8" />
        <path d="M ${cx - hw * 0.3},${cy - h * 0.8} Q ${cx},${cy - h * 0.8 - 0.8} ${cx + hw * 0.3},${cy - h * 0.8}" stroke="#d97706" strokeWidth="0.4" fill="none" opacity="0.8" />
        <path d="M ${cx - hw * 0.6},${cy} Q ${cx},${cy + 5} ${cx + hw * 0.6},${cy}" stroke="#e11d48" strokeWidth="0.8" fill="none" />
    `;
}

// -----------------------------------------------------------------------------
// 1. TRÀ QUÁN TẦNG 1 (TRÀ SƯ & KHÁCH THƯỞNG TRÀ)
// -----------------------------------------------------------------------------
const traQuanStart = code.indexOf('{/* 1. TRÀ CHỦ: CỤ ÔNG RÂU BẠC ÁO GẤM LAM CÚI NGƯỜI RÓT TRÀ SEN ĐIỆU NGHỆ */}');
const traQuanAnchor = code.indexOf('<path d="M -28,84', traQuanStart);

if (traQuanStart !== -1 && traQuanAnchor !== -1) {
    const traQuanEnd = code.lastIndexOf('</g>', traQuanAnchor) + 4;
    const newTraQuan = `{/* 1. TRÀ CHỦ: CỤ ÔNG RÂU BẠC ÁO GẤM LAM CÚI NGƯỜI RÓT TRÀ SEN ĐIỆU NGHỆ - KIỂU NGƯỜI MỚI */}
        <g transform="translate(68, 222)">
            <ellipse cx="0" cy="22" rx="7" ry="2" fill="#020617" opacity="0.4" />
            <path d="M -5,-8 Q 3,-10 5,22 L -6.5,22 Z" fill="#1e3a8a" />
            <circle cx="1" cy="-2" r="0.6" fill="#ca8a04" />
            <circle cx="1" cy="4" r="0.6" fill="#ca8a04" />
            ${renderFace(0.5, -15, 4.2, { skinColor: '#fed7aa', eyeDir: 1, hair: 'elder', khanColor: '#0f172a' })}
            <g className="animate-tea-pour">
                <path d="M 3,-2 Q 7,2 9,12" fill="none" stroke="#1e3a8a" strokeWidth="2.8" strokeLinecap="round" />
                <circle cx="9" cy="12" r="1.6" fill="#fed7aa" />
            </g>
        </g>

        {/* 2. VỊ KHÁCH TAO NHÃ: THIẾU NỮ ÁO DÀI NGỌC BÍCH NÂNG CHÉN TRÀ THƯỞNG HƯƠNG - KIỂU NGƯỜI MỚI */}
        <g transform="translate(104, 224)">
            <ellipse cx="0" cy="20" rx="6" ry="1.8" fill="#020617" opacity="0.4" />
            <path d="M -4.5,-6 L 4.5,-6 L 5.5,20 L -5.5,20 Z" fill="#0d9488" />
            <circle cx="-1" cy="0" r="0.6" fill="#fef08a" />
            <circle cx="-1" cy="5" r="0.6" fill="#fef08a" />
            ${renderFace(0.5, -12, 3.8, { skinColor: '#fed7aa', eyeDir: -1, hair: 'bun' })}
            <path d="M -2,0 Q -6,-2 -7,-6" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="-7" cy="-6" r="1.4" fill="#fed7aa" />
            <ellipse cx="-7" cy="-7" rx="2" ry="1.4" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
            <path d="M -7,-9 Q -9,-13 -7,-17" fill="none" stroke="#fef08a" strokeWidth="0.8" className="animate-steam" opacity="0.6" />
        </g>`;

    code = code.slice(0, traQuanStart) + newTraQuan + code.slice(traQuanEnd);
    console.log('1. Upgraded Tra Quan Floor 1!');
}

// -----------------------------------------------------------------------------
// 2. TIỆM THUỐC BẮC (LƯƠNG Y & MÔN ĐỆ)
// -----------------------------------------------------------------------------
const thuocStart = code.indexOf('{/* 1. LƯƠNG Y: CỤ ĐỒ RÂU DÀI CẦM CÂN TIỂU LY ĐỒNG NÂNG NGANG TẦM MẮT */}');
const thuocAnchor = code.indexOf('<path d="M 153,72', thuocStart);

if (thuocStart !== -1 && thuocAnchor !== -1) {
    const thuocEnd = code.lastIndexOf('</g>', thuocAnchor) + 4;
    const newThuoc = `{/* 1. LƯƠNG Y: CỤ ĐỒ RÂU DÀI CẦM CÂN TIỂU LY ĐỒNG NÂNG NGANG TẦM MẮT - KIỂU NGƯỜI MỚI */}
            <g transform="translate(247, 222)">
                <ellipse cx="0" cy="22" rx="6.5" ry="2" fill="#020617" opacity="0.4" />
                <path d="M -5,-7 L 5,-7 L 6.5,20 L -6.5,20 Z" fill="#1d4ed8" stroke="#ca8a04" strokeWidth="0.6" />
                <circle cx="1" cy="0" r="0.6" fill="#ca8a04" />
                <circle cx="1" cy="5" r="0.6" fill="#ca8a04" />
                ${renderFace(0, -11, 4.2, { skinColor: '#fed7aa', eyeDir: 1, hair: 'elder', khanColor: '#1e3a8a' })}
                <path d="M 2,-2 Q 6,2 8,6" stroke="#1d4ed8" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                <circle cx="8" cy="6" r="1.4" fill="#fed7aa" />
                <line x1="8" y1="6" x2="16" y2="3" stroke="#ca8a04" strokeWidth="1" />
                <line x1="16" y1="3" x2="16" y2="9" stroke="#ca8a04" strokeWidth="0.6" />
                <ellipse cx="16" cy="9" rx="2.5" ry="1" fill="#f59e0b" />
            </g>

            {/* 2. MÔN ĐỆ: CHÚ TIỂU ĐỒNG ÁO NÂU CẦM CHÀY GIÃ THUỐC TRONG CỐI ĐỒNG - KIỂU NGƯỜI MỚI */}
            <g transform="translate(232, 226)">
                <ellipse cx="0" cy="18" rx="5.5" ry="1.6" fill="#020617" opacity="0.4" />
                <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#78350f" />
                <circle cx="1" cy="0" r="0.5" fill="#ca8a04" />
                <circle cx="1" cy="5" r="0.5" fill="#ca8a04" />
                ${renderFace(0, -10, 3.6, { skinColor: '#fed7aa', eyeDir: 1, hair: 'child' })}
                <path d="M -2,12 L 4,12 L 3,18 L -1,18 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
                <line x1="1" y1="2" x2="1" y2="13" stroke="#ca8a04" strokeWidth="1.6" strokeLinecap="round" />
            </g>`;

    code = code.slice(0, thuocStart) + newThuoc + code.slice(thuocEnd);
    console.log('2. Upgraded Tiem Thuoc Bac!');
}

// -----------------------------------------------------------------------------
// 3. CAO LẦU BÀ BÉ (BÀ BÉ, PHỤ BẾP, THỰC KHÁCH)
// -----------------------------------------------------------------------------
const caoLauStart = code.indexOf('{/* 1. CHỦ QUÁN (BÀ BÉ - ÁO BÀ BA HỒNG THẮM, CẦM VÁ CHAN NƯỚC SỐT VÀO TÔ) */}');
const caoLauAnchor = code.indexOf('<path d="M 116,78', caoLauStart);

if (caoLauStart !== -1 && caoLauAnchor !== -1) {
    const caoLauEnd = code.lastIndexOf('</g>', caoLauAnchor) + 4;
    const newCaoLau = `{/* 1. CHỦ QUÁN (BÀ BÉ - ÁO BÀ BA HỒNG THẮM, CẦM VÁ CHAN NƯỚC SỐT VÀO TÔ) - KIỂU NGƯỜI MỚI */}
        <g transform="translate(58, 222)">
            <ellipse cx="0" cy="20" rx="6" ry="1.8" fill="#020617" opacity="0.4" />
            <path d="M -5,-7 L 5,-7 L 6.5,20 L -6.5,20 Z" fill="#db2777" />
            <rect x="-3" y="0" width="6" height="15" fill="#f8fafc" opacity="0.92" />
            <circle cx="-1" cy="3" r="0.6" fill="#ca8a04" />
            <circle cx="-1" cy="8" r="0.6" fill="#ca8a04" />
            ${renderFace(0.5, -13, 4.2, { skinColor: '#fed7aa', eyeDir: 1, hair: 'kerchief' })}
            <path d="M -3,0 Q -8,6 -9,12" fill="none" stroke="#db2777" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="-9" cy="12" r="1.4" fill="#fed7aa" />
            <ellipse cx="-10" cy="13" rx="3.2" ry="2" fill="#ca8a04" stroke="#78350f" strokeWidth="0.6" />
            <ellipse cx="7" cy="4" rx="5" ry="3.5" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.8" />
        </g>

        {/* 2. PHỤ BẾP: CHÀNG TRAI ÁO NÂU CẦM VỢT TRE TRỤNG MÌ - KIỂU NGƯỜI MỚI */}
        <g transform="translate(42, 225)">
            <ellipse cx="0" cy="18" rx="5.5" ry="1.6" fill="#020617" opacity="0.4" />
            <path d="M -4.5,-6 L 4.5,-6 L 5,18 L -5,18 Z" fill="#78350f" />
            <circle cx="1" cy="0" r="0.5" fill="#ca8a04" />
            <circle cx="1" cy="5" r="0.5" fill="#ca8a04" />
            ${renderFace(0.5, -12, 3.8, { skinColor: '#fed7aa', eyeDir: 1, hair: 'short', hairColor: '#1c1917' })}
            <path d="M 2,0 Q 5,6 6,11" stroke="#78350f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx="6" cy="11" r="1.4" fill="#fed7aa" />
            <circle cx="6" cy="12" r="2.2" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
        </g>

        {/* 3. VỊ KHÁCH NGỒI GHẾ GỖ: CẦM ĐŨA GẮP SỢI MÌ CAO LẦU ĂN NGON LÀNH - KIỂU NGƯỜI MỚI */}
        <g transform="translate(104, 226)">
            <ellipse cx="0" cy="18" rx="5.5" ry="1.6" fill="#020617" opacity="0.4" />
            <path d="M -4.5,-6 L 4.5,-6 L 5,18 L -5,18 Z" fill="#0284c7" />
            <circle cx="-1" cy="2" r="0.5" fill="#fef08a" />
            <circle cx="-1" cy="7" r="0.5" fill="#fef08a" />
            ${renderFace(0.5, -12, 3.8, { skinColor: '#fed7aa', eyeDir: -1, hair: 'khan_xep', khanColor: '#0f172a' })}
            <path d="M -1,-2 Q -5,-3 -6,-5" stroke="#0284c7" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx="-6" cy="-5" r="1.4" fill="#fed7aa" />
            <line x1="-2" y1="0" x2="-6" y2="-5" stroke="#ca8a04" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="-1" y1="1" x2="-5" y2="-4" stroke="#ca8a04" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M -6,-5 Q -5,-8 -6,-10" fill="none" stroke="#fef08a" strokeWidth="1.2" />
        </g>`;

    code = code.slice(0, caoLauStart) + newCaoLau + code.slice(caoLauEnd);
    console.log('3. Upgraded Cao Lau Ba Be!');
}

// -----------------------------------------------------------------------------
// 4. TIỆM BÁNH MÌ (CHỊ CHỦ & KHÁCH)
// -----------------------------------------------------------------------------
const banhMiStart = code.indexOf('{/* 1. CHỊ CHỦ BÁNH MÌ: ÁO HOA TẠP DỀ TRẮNG, CẦM DAO XẺ BÁNH & QUẾT PATE */}');
const banhMiAnchor = code.indexOf('<path d="M 466,90', banhMiStart);

if (banhMiStart !== -1 && banhMiAnchor !== -1) {
    const banhMiEnd = code.lastIndexOf('</g>', banhMiAnchor) + 4;
    const newBanhMi = `{/* 1. CHỊ CHỦ BÁNH MÌ: ÁO HOA TẠP DỀ TRẮNG, CẦM DAO XẺ BÁNH & QUẾT PATE - KIỂU NGƯỜI MỚI */}
            <g transform="translate(565, 226)">
                <ellipse cx="0" cy="19" rx="6" ry="1.8" fill="#020617" opacity="0.4" />
                <path d="M -4.5,-7 L 4.5,-7 L 6,19 L -6,19 Z" fill="#e11d48" />
                <rect x="-3" y="-3" width="6" height="14" fill="#f8fafc" opacity="0.9" />
                <circle cx="-1" cy="0" r="0.5" fill="#ca8a04" />
                <circle cx="-1" cy="5" r="0.5" fill="#ca8a04" />
                ${renderFace(0.5, -13, 4, { skinColor: '#fed7aa', eyeDir: -1, hair: 'kerchief' })}
                <ellipse cx="-8" cy="5" rx="4.8" ry="2.4" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.6" />
                <path d="M -2,0 Q -5,3 -7,4" stroke="#e11d48" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <line x1="-3" y1="2" x2="-8" y2="4" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
            </g>

            {/* 2. VỊ KHÁCH ĐỨNG CHỜ: CẦM TIỀN HÁO HỨC NHẬN BÁNH NÓNG GÓI GIẤY BÁO - KIỂU NGƯỜI MỚI */}
            <g transform="translate(542, 228)">
                <ellipse cx="0" cy="18" rx="5.5" ry="1.6" fill="#020617" opacity="0.4" />
                <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#0284c7" />
                <circle cx="1" cy="-1" r="0.5" fill="#fef08a" />
                <circle cx="1" cy="4" r="0.5" fill="#fef08a" />
                ${renderFace(0.5, -12, 3.6, { skinColor: '#fed7aa', eyeDir: 1, hair: 'khan_xep', khanColor: '#0f172a' })}
                <path d="M 1,0 Q 4,2 7,3" stroke="#0284c7" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <circle cx="7" cy="3" r="1.3" fill="#fed7aa" />
                <rect x="7" y="1" width="6.5" height="4.5" rx="0.8" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
            </g>`;

    code = code.slice(0, banhMiStart) + newBanhMi + code.slice(banhMiEnd);
    console.log('4. Upgraded Tiem Banh Mi!');
}

// -----------------------------------------------------------------------------
// 5. TIỆM LỒNG ĐÈN HUỲNH VĂN (NGHỆ NHÂN & EM BÉ)
// -----------------------------------------------------------------------------
const longDenStart = code.indexOf('{/* 1. NGHỆ NHÂN HUỲNH VĂN: NGỒI GHẾ CHUỐT NAN TRE & DÁN LỤA LÊN KHUNG ĐÈN */}');
const longDenAnchor = code.indexOf('<path d="M 152,70', longDenStart);

if (longDenStart !== -1 && longDenAnchor !== -1) {
    const longDenEnd = code.lastIndexOf('</g>', longDenAnchor) + 4;
    const newLongDen = `{/* 1. NGHỆ NHÂN HUỲNH VĂN: NGỒI GHẾ CHUỐT NAN TRE & DÁN LỤA LÊN KHUNG ĐÈN - KIỂU NGƯỜI MỚI */}
        <g transform="translate(268, 226)">
            <ellipse cx="0" cy="19" rx="6" ry="1.8" fill="#020617" opacity="0.4" />
            <path d="M -4.5,-5 L 4.5,-5 L 5,20 L -5,20 Z" fill="#451a03" />
            <circle cx="1" cy="0" r="0.5" fill="#ca8a04" />
            <circle cx="1" cy="5" r="0.5" fill="#ca8a04" />
            ${renderFace(0, -11, 4, { skinColor: '#fed7aa', eyeDir: 1, hair: 'short', hairColor: '#1c1917' })}
            <ellipse cx="8" cy="5" rx="5" ry="6.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
            <line x1="2" y1="2" x2="7" y2="5" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* 2. EM BÉ NHỎ: HÁO HỨC GIƠ TAY CẦM ĐÈN ÔNG SAO 5 CÁNH LẤP LÁNH - KIỂU NGƯỜI MỚI */}
        <g transform="translate(308, 230)">
            <ellipse cx="0" cy="14" rx="4.5" ry="1.4" fill="#020617" opacity="0.4" />
            <path d="M -3.5,-4 L 3.5,-4 L 4,14 L -4,14 Z" fill="#e11d48" />
            <circle cx="-1" cy="1" r="0.4" fill="#fef08a" />
            <circle cx="-1" cy="5" r="0.4" fill="#fef08a" />
            ${renderFace(0, -9, 3.4, { skinColor: '#fed7aa', eyeDir: -1, hair: 'child' })}
            <line x1="-1" y1="0" x2="-8" y2="-6" stroke="#ca8a04" strokeWidth="1.2" strokeLinecap="round" />
            <polygon points="-8,-12 -6,-8 -2,-8 -5,-5 -3,-1 -8,-4 -13,-1 -11,-5 -14,-8 -10,-8" 
                     fill="#fef08a" stroke="#dc2626" strokeWidth="0.6" filter="url(#bloomSoft)" />
        </g>`;

    code = code.slice(0, longDenStart) + newLongDen + code.slice(longDenEnd);
    console.log('5. Upgraded Tiem Long Den Huynh Van!');
}

// -----------------------------------------------------------------------------
// 6. PATRONS ENTERING/EXITING SHOPS (4910-5012)
// -----------------------------------------------------------------------------
const patronsStart = code.indexOf('{/* 1. KHÁCH VÀO RA QUÁN CAO LẦU BÀ BÉ (Ăn mì rồi bước ra phe phẩy quạt nan) */}');
const patronsAnchor = code.indexOf('{/* BỜ KÈ ĐÁ BẠCH ĐẰNG', patronsStart);

if (patronsStart !== -1 && patronsAnchor !== -1) {
    const patronsEnd = code.lastIndexOf('</g>', patronsAnchor) + 4;
    const newPatrons = `{/* 1. KHÁCH VÀO RA QUÁN CAO LẦU BÀ BÉ (Cầm quạt nan phe phẩy) - KIỂU NGƯỜI MỚI */}
            <g className="animate-patron-caolau">
                <g filter="url(#dropShadow)">
                    <ellipse cx="0" cy="19" rx="6" ry="1.8" fill="#020617" opacity="0.5" />
                    <line x1="-2" y1="8" x2="-2" y2="18" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="2" y1="8" x2="2" y2="18" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <ellipse cx="-2" cy="18.5" rx="2.5" ry="1.2" fill="#059669" />
                    <ellipse cx="2" cy="18.5" rx="2.5" ry="1.2" fill="#059669" />
                    <path d="M -4.5,-11 L 4.5,-11 L 5.5,8 L -5.5,8 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="0.5" />
                    <circle cx="1" cy="-4" r="0.6" fill="#ca8a04" />
                    <circle cx="1" cy="1" r="0.6" fill="#ca8a04" />
                    ${renderFace(0, -16, 3.8, { skinColor: '#fed7aa', eyeDir: 1, hair: 'bun' })}
                    <path d="M 4,-7 Q 8,-3 9,2" fill="none" stroke="#eab308" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="9" cy="2" r="1.3" fill="#fed7aa" />
                    <path d="M 8,0 Q 13,-4 14,-9 Q 9,-7 8,0 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.6" />
                </g>
            </g>

            {/* 2. KHÁCH VÀO RA TIỆM BÁNH MÌ PHƯỢNG (Cầm túi bánh mì nóng bọc giấy) - KIỂU NGƯỜI MỚI */}
            <g className="animate-patron-banhmi">
                <g filter="url(#dropShadow)">
                    <ellipse cx="0" cy="19" rx="6" ry="1.8" fill="#020617" opacity="0.5" />
                    <line x1="-2" y1="10" x2="-2" y2="19" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="2" y1="10" x2="2" y2="19" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                    <ellipse cx="-2" cy="19" rx="2.4" ry="1.2" fill="#059669" />
                    <ellipse cx="2" cy="19" rx="2.4" ry="1.2" fill="#059669" />
                    <path d="M -4.5,-12 L 4.5,-12 L 6,10 L -6,10 Z" fill="#06b6d4" stroke="#0891b2" strokeWidth="0.5" />
                    <circle cx="1" cy="-4" r="0.6" fill="#fef08a" />
                    <circle cx="1" cy="2" r="0.6" fill="#fef08a" />
                    ${renderFace(0, -17, 3.8, { skinColor: '#fed7aa', eyeDir: 1, hair: 'bun' })}
                    <path d="M 3,-6 Q 6,-1 7,2" stroke="#06b6d4" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                    <circle cx="7" cy="2" r="1.3" fill="#fed7aa" />
                    <rect x="5" y="-5" width="6" height="9" rx="1" fill="#d97706" stroke="#92400e" strokeWidth="0.5" />
                    <line x1="7" y1="-8" x2="7" y2="-5" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="9" y1="-7" x2="9" y2="-5" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
                </g>
            </g>

            {/* 3. PHẬT TỬ / DU KHÁCH VÀO LỄ BÁI QUẢNG ĐÔNG HỘI QUÁN (Áo gấm cung đình) - KIỂU NGƯỜI MỚI */}
            <g className="animate-patron-hoiquan">
                <g filter="url(#dropShadow)">
                    <ellipse cx="0" cy="20" rx="6" ry="1.8" fill="#020617" opacity="0.5" />
                    <line x1="-2.5" y1="12" x2="-2.5" y2="20" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="2.5" y1="12" x2="2.5" y2="20" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                    <ellipse cx="-2.5" cy="20" rx="2.6" ry="1.3" fill="#1e293b" />
                    <ellipse cx="2.5" cy="20" rx="2.6" ry="1.3" fill="#1e293b" />
                    <path d="M -4.8,-13 L 4.8,-13 L 6,12 L -6,12 Z" fill="#991b1b" stroke="#ca8a04" strokeWidth="0.6" />
                    <circle cx="1.5" cy="-5" r="0.6" fill="#ca8a04" />
                    <circle cx="1.5" cy="2" r="0.6" fill="#ca8a04" />
                    ${renderFace(0, -18, 4, { skinColor: '#fed7aa', eyeDir: 1, hair: 'khan_xep', khanColor: '#1e3a8a' })}
                    <circle cx="-5" cy="-2" r="2.4" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1,1" />
                </g>
            </g>

            {/* 4. MẸ VÀ BÉ VÀO RA TIỆM LỒNG ĐÈN HUỲNH VĂN - KIỂU NGƯỜI MỚI */}
            <g className="animate-patron-longden">
                <g filter="url(#dropShadow)">
                    <g transform="translate(-5, 0)">
                        <ellipse cx="0" cy="18" rx="5.5" ry="1.6" fill="#020617" opacity="0.5" />
                        <line x1="-2" y1="9" x2="-2" y2="18" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="2" y1="9" x2="2" y2="18" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                        ${renderNonLa(0, -17, 22, 11)}
                        ${renderFace(0, -15, 3.6, { skinColor: '#fed7aa', eyeDir: 1, hair: 'none' })}
                        <path d="M -4.2,-11 L 4.2,-11 L 5,9 L -5,9 Z" fill="#a855f7" stroke="#7e22ce" strokeWidth="0.5" />
                        <circle cx="1" cy="-3" r="0.5" fill="#fef08a" />
                        <circle cx="1" cy="2" r="0.5" fill="#fef08a" />
                    </g>
                    <g transform="translate(6, 6) scale(0.78)">
                        <ellipse cx="0" cy="16" rx="4.5" ry="1.4" fill="#020617" opacity="0.4" />
                        <line x1="-2" y1="10" x2="-2" y2="16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="2" y1="10" x2="2" y2="16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                        <path d="M -4,-10 L 4,-10 L 5,10 L -5,10 Z" fill="#ef4444" />
                        <circle cx="1" cy="-2" r="0.5" fill="#fef08a" />
                        ${renderFace(0, -15, 3.6, { skinColor: '#fed7aa', eyeDir: 1, hair: 'child' })}
                        <line x1="4" y1="-5" x2="9" y2="-8" stroke="#ca8a04" strokeWidth="1" />
                        <line x1="9" y1="-8" x2="9" y2="-2" stroke="#dc2626" strokeWidth="0.6" />
                        <ellipse cx="9" cy="2" rx="4.5" ry="2.8" fill="#f97316" filter="url(#bloomSoft)" />
                        <circle cx="9" cy="2" r="1.6" fill="#fef08a" />
                    </g>
                </g>
            </g>

            {/* 5. KHÁCH TAO NHÃ VÀO RA TRÀ QUÁN HỘI AN - KIỂU NGƯỜI MỚI */}
            <g className="animate-patron-traquan">
                <g filter="url(#dropShadow)">
                    <ellipse cx="0" cy="19" rx="6" ry="1.8" fill="#020617" opacity="0.5" />
                    <line x1="-2.5" y1="9" x2="-2.5" y2="19" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="2.5" y1="9" x2="2.5" y2="19" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <ellipse cx="-2.5" cy="19" rx="2.5" ry="1.2" fill="#1e293b" />
                    <ellipse cx="2.5" cy="19" rx="2.5" ry="1.2" fill="#1e293b" />
                    <path d="M -4.5,-12 L 4.5,-12 L 5.5,9 L -5.5,9 Z" fill="#64748b" stroke="#334155" strokeWidth="0.5" />
                    <circle cx="1" cy="-4" r="0.5" fill="#fef08a" />
                    <circle cx="1" cy="2" r="0.5" fill="#fef08a" />
                    ${renderFace(0, -17, 3.8, { skinColor: '#fed7aa', eyeDir: 1, hair: 'khan_xep', khanColor: '#1e293b' })}
                    <rect x="4" y="-3" width="5" height="7" rx="1" fill="#78350f" stroke="#ca8a04" strokeWidth="0.5" />
                </g>
            </g>

            {/* 6. QUÝ CÔ GHÉ HIỆU TƠ LỤA Á ĐÔNG - KIỂU NGƯỜI MỚI */}
            <g className="animate-patron-tolua">
                <g filter="url(#dropShadow)">
                    <ellipse cx="0" cy="19" rx="6" ry="1.8" fill="#020617" opacity="0.5" />
                    <line x1="-2" y1="10" x2="-2" y2="19" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                    <line x1="2" y1="10" x2="2" y2="19" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                    <ellipse cx="-2" cy="19" rx="2.5" ry="1.2" fill="#f43f5e" />
                    <ellipse cx="2" cy="19" rx="2.5" ry="1.2" fill="#f43f5e" />
                    <path d="M -4.5,-12 L 4.5,-12 L 6,10 L -6,10 Z" fill="#ec4899" stroke="#be185d" strokeWidth="0.5" />
                    <circle cx="1" cy="-4" r="0.6" fill="#fef08a" />
                    <circle cx="1" cy="2" r="0.6" fill="#fef08a" />
                    ${renderFace(0, -17, 3.8, { skinColor: '#fed7aa', eyeDir: 1, hair: 'bun' })}
                    <ellipse cx="6" cy="2" rx="3.8" ry="3" fill="#f43f5e" stroke="#ca8a04" strokeWidth="0.5" />
                    <line x1="4" y1="-4" x2="6" y2="0" stroke="#ca8a04" strokeWidth="0.8" />
                </g>
            </g>`;

    code = code.slice(0, patronsStart) + newPatrons + code.slice(patronsEnd);
    console.log('6. Upgraded all 6 Patrons!');
}

fs.writeFileSync(backdropPath, code, 'utf8');
console.log('ALL SHOP FIGURES UPGRADED SUCCESSFULLY!');
