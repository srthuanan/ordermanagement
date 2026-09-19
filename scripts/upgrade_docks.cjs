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
        hair = 'bun', // 'bun', 'khan_xep', 'elder', 'child', 'short', 'kerchief', 'none'
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
// BẬC TAM CẤP 2 (BẾN TÂY - thuyen-tam-cap-tay)
// -----------------------------------------------------------------------------
const tamCapTayOldRegex = /\{# BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU[\s\S]*?<\/g>\s*<\/g>\s*<\/g>\s*<\/g>/;
// Let's inspect exact boundaries for Tam Cap Tay
const oldDock1Start = code.indexOf('{/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU ĐIỀU KHIỂN SÀO & MÁI CHÈO */}');
const oldDock1End = code.indexOf('{/* GỢN SÓNG VỖ MẠN BẬC ĐÁ', oldDock1Start);

console.log('Dock 1 indices:', oldDock1Start, oldDock1End);
if (oldDock1Start !== -1 && oldDock1End !== -1) {
    const newDock1People = `{/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU ĐIỀU KHIỂN SÀO & MÁI CHÈO - KIỂU NGƯỜI MỚI */}
            <g transform="translate(14, -2)">
                <g className="animate-boatman-1">
                    <ellipse cx="0" cy="18" rx="6" ry="2" fill="#01040a" opacity="0.5" />
                    ${renderNonLa(0, -8, 24, 13)}
                    ${renderFace(0, -7, 3.6, { skinColor: '#fed7aa', eyeDir: 1, mustache: true, hair: 'none' })}
                    <path d="M -4.5,-3 L 4.5,-3 L 5.5,17 L -5.5,17 Z" fill="#3b1d06" stroke="#1c0e02" strokeWidth="0.6" />
                    <circle cx="1" cy="2" r="0.6" fill="#ca8a04" />
                    <circle cx="1" cy="6" r="0.6" fill="#ca8a04" />
                    <circle cx="1" cy="10" r="0.6" fill="#ca8a04" />
                    {/* Cánh tay cầm sào tre chống đò cập bến */}
                    <path d="M -2,0 Q 4,3 7,8" stroke="#fed7aa" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                    <circle cx="7" cy="8" r="1.5" fill="#fed7aa" />
                    <line x1="6" y1="7" x2="-28" y2="42" stroke="#ca8a04" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M -28,42 L -38,52" stroke="#854d0e" strokeWidth="4.8" strokeLinecap="round" />
                </g>
            </g>

            {/* KHÁCH 1: THIẾU NỮ ÁO DÀI GẤM HỒNG BƯỚC LÊN BẬC ĐÁ (CO GỐI, NÂNG HOA ĐĂNG) - KIỂU NGƯỜI MỚI */}
            <g className="animate-disembark-1">
                <g transform="scale(0.85)">
                    <ellipse cx="0" cy="19" rx="8" ry="2.2" fill="#020617" opacity="0.6" />
                    {/* Chân bước lên bậc đá tam cấp */}
                    <path d="M -2,4 L 2,4 L 4,18 L -1,18 Z" fill="#fef08a" />
                    <ellipse cx="2" cy="18.5" rx="3.5" ry="1.6" fill="#059669" />
                    <path d="M -2,4 L 1,4 L -2,15 L -6,14 Z" fill="#f59e0b" opacity="0.85" />
                    {/* Tà áo dài gấm hồng thướt tha */}
                    <path d="M -3.8,-12 L 3.8,-12 L 5.2,16 L -5.2,16 Z" fill="#db2777" />
                    <path d="M -2,-2 Q 2,6 4,16" stroke="#fef08a" strokeWidth="0.7" />
                    <path d="M -3.5,-23 L 3.5,-23 L 4,-12 L -4,-12 Z" fill="#db2777" />
                    {/* Cổ áo & khuy ngọc */}
                    <path d="M -2,-26 L 2,-26 L 2.5,-23 L -2.5,-23 Z" fill="#be185d" stroke="#fef08a" strokeWidth="0.5" />
                    <circle cx="1.5" cy="-24.5" r="0.6" fill="#fef08a" />
                    {/* Khuôn mặt thiếu nữ */}
                    ${renderFace(0.5, -30, 3.8, { skinColor: '#fed7aa', eyeDir: 1, hair: 'bun' })}
                    {/* Tay áo & bàn tay búp măng nâng hoa đăng sen */}
                    <path d="M 2,-22 Q 6,-16 9,-12" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <line x1="8" y1="-13" x2="10" y2="-11" stroke="#fef08a" strokeWidth="0.7" />
                    <circle cx="9.5" cy="-11.5" r="1.4" fill="#fed7aa" />
                    <g transform="translate(13, -10)" filter="url(#bloomHigh)">
                        <ellipse cx="0" cy="2" rx="5" ry="2.6" fill="#f43f5e" />
                        <polygon points="-3,1 0,-2 3,1 0,3" fill="#fbcfe8" />
                        <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
                        <ellipse cx="0" cy="4" rx="8" ry="2" fill="#f43f5e" opacity="0.5" filter="url(#bloomSoft)" />
                    </g>
                </g>
            </g>

            {/* KHÁCH 2: CHÀNG TRAI ÁO NGŨ THÂN BƯỚC XUỐNG BẬC ĐÁ VÀO THUYỀN - KIỂU NGƯỜI MỚI */}
            <g className="animate-embark-1">
                <g transform="scale(0.85)">
                    <ellipse cx="0" cy="19" rx="8.5" ry="2.2" fill="#020617" opacity="0.6" />
                    {/* Chân sải bước xuống */}
                    <path d="M -2,4 L 2,4 L 3,19 L -2,19 Z" fill="#f8fafc" />
                    <ellipse cx="1" cy="19" rx="4" ry="1.8" fill="#1e293b" />
                    {/* Vạt áo ngũ thân nam xanh lam thêu viền */}
                    <path d="M -4.5,-12 L 4.5,-12 L 5.5,16 L -5.5,16 Z" fill="#1e40af" />
                    <path d="M -4,-23 L 4,-23 L 4.5,-12 L -4.5,-12 Z" fill="#1e40af" />
                    <circle cx="1.5" cy="-18" r="0.6" fill="#ca8a04" />
                    <circle cx="1.5" cy="-14" r="0.6" fill="#ca8a04" />
                    {/* Khuôn mặt chàng trai */}
                    ${renderFace(0.5, -30.5, 4, { skinColor: '#fed7aa', eyeDir: 1, hair: 'khan_xep', khanColor: '#0f172a' })}
                    {/* Tay cầm đèn lồng nhỏ soi đường */}
                    <path d="M 2,-23 Q 7,-16 8,-10" stroke="#1e40af" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                    <circle cx="8" cy="-9" r="1.5" fill="#fed7aa" />
                    <g transform="translate(8, -2)" filter="url(#bloomHigh)">
                        <line x1="0" y1="-7" x2="0" y2="0" stroke="#78350f" strokeWidth="0.8" />
                        <ellipse cx="0" cy="4" rx="4" ry="5.2" fill="#f59e0b" />
                        <circle cx="0" cy="4" r="1.8" fill="#ffffff" />
                        <ellipse cx="0" cy="14" rx="9" ry="2.5" fill="#f59e0b" opacity="0.4" filter="url(#bloomSoft)" />
                    </g>
                </g>
            </g>

            `;

    code = code.slice(0, oldDock1Start) + newDock1People + code.slice(oldDock1End);
    console.log('Updated Tam Cap Tay successfully!');
}

// -----------------------------------------------------------------------------
// BẬC TAM CẤP 4 (BẾN ĐÔNG - thuyen-tam-cap-dong)
// -----------------------------------------------------------------------------
const oldDock2Start = code.indexOf('{/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU ĐIỀU KHIỂN SÀO & MÁI CHÈO */}', oldDock1Start + 100);
const oldDock2End = code.indexOf('{/* GỢN SÓNG VỖ MẠN BẬC ĐÁ', oldDock2Start);

console.log('Dock 2 indices:', oldDock2Start, oldDock2End);
if (oldDock2Start !== -1 && oldDock2End !== -1) {
    const newDock2People = `{/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU ĐIỀU KHIỂN SÀO & MÁI CHÈO - KIỂU NGƯỜI MỚI */}
            <g transform="translate(14, -2)">
                <g className="animate-boatman-2">
                    <ellipse cx="0" cy="18" rx="6" ry="2" fill="#01040a" opacity="0.5" />
                    ${renderNonLa(0, -8, 24, 13)}
                    ${renderFace(0, -7, 3.6, { skinColor: '#fed7aa', eyeDir: -1, mustache: true, hair: 'none' })}
                    <path d="M -4.5,-3 L 4.5,-3 L 5.5,17 L -5.5,17 Z" fill="#3b1d06" stroke="#1c0e02" strokeWidth="0.6" />
                    <circle cx="-1" cy="2" r="0.6" fill="#ca8a04" />
                    <circle cx="-1" cy="6" r="0.6" fill="#ca8a04" />
                    <circle cx="-1" cy="10" r="0.6" fill="#ca8a04" />
                    <path d="M 2,0 Q -4,3 -7,8" stroke="#fed7aa" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                    <circle cx="-7" cy="8" r="1.5" fill="#fed7aa" />
                    <line x1="-6" y1="7" x2="28" y2="42" stroke="#ca8a04" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M 28,42 L 38,52" stroke="#854d0e" strokeWidth="4.8" strokeLinecap="round" />
                </g>
            </g>

            {/* KHÁCH 1: THIẾU NỮ ÁO DÀI TÍM HOA CÀ BƯỚC LÊN BẬC TAM CẤP 4 - KIỂU NGƯỜI MỚI */}
            <g className="animate-disembark-2">
                <g transform="scale(0.85)">
                    <ellipse cx="0" cy="19" rx="8" ry="2.2" fill="#020617" opacity="0.6" />
                    <path d="M -2,4 L 2,4 L 4,18 L -1,18 Z" fill="#fef08a" />
                    <ellipse cx="2" cy="18.5" rx="3.5" ry="1.6" fill="#059669" />
                    <path d="M -3.8,-12 L 3.8,-12 L 5.2,16 L -5.2,16 Z" fill="#c026d3" />
                    <path d="M -2,-2 Q 2,6 4,16" stroke="#fef08a" strokeWidth="0.7" />
                    <path d="M -3.5,-23 L 3.5,-23 L 4,-12 L -4,-12 Z" fill="#c026d3" />
                    <circle cx="1.5" cy="-24.5" r="0.6" fill="#fef08a" />
                    ${renderFace(0.5, -30, 3.8, { skinColor: '#fed7aa', eyeDir: 1, hair: 'bun' })}
                    <path d="M 2,-22 Q 6,-16 9,-12" stroke="#c026d3" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <circle cx="9.5" cy="-11.5" r="1.4" fill="#fed7aa" />
                    <g transform="translate(13, -10)" filter="url(#bloomHigh)">
                        <ellipse cx="0" cy="2" rx="5" ry="2.6" fill="#f59e0b" />
                        <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
                        <ellipse cx="0" cy="4" rx="8" ry="2" fill="#f59e0b" opacity="0.5" filter="url(#bloomSoft)" />
                    </g>
                </g>
            </g>

            {/* KHÁCH 2: CHÀNG TRAI ÁO NGŨ THÂN HOÀNG KIM BƯỚC XUỐNG THUYỀN - KIỂU NGƯỜI MỚI */}
            <g className="animate-embark-2">
                <g transform="scale(0.85)">
                    <ellipse cx="0" cy="19" rx="8.5" ry="2.2" fill="#020617" opacity="0.6" />
                    <path d="M -2,4 L 2,4 L 3,19 L -2,19 Z" fill="#f8fafc" />
                    <ellipse cx="1" cy="19" rx="4" ry="1.8" fill="#0f172a" />
                    <path d="M -4.5,-12 L 4.5,-12 L 5.5,16 L -5.5,16 Z" fill="#d97706" />
                    <path d="M -4,-23 L 4,-23 L 4.5,-12 L -4.5,-12 Z" fill="#d97706" />
                    <circle cx="-1.5" cy="-18" r="0.6" fill="#fef08a" />
                    <circle cx="-1.5" cy="-14" r="0.6" fill="#fef08a" />
                    ${renderFace(0.5, -30.5, 4, { skinColor: '#fed7aa', eyeDir: -1, hair: 'khan_xep', khanColor: '#0f172a' })}
                    <path d="M -2,-23 Q -7,-16 -8,-10" stroke="#d97706" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                    <circle cx="-8" cy="-9" r="1.5" fill="#fed7aa" />
                    <g transform="translate(-8, -2)" filter="url(#bloomHigh)">
                        <line x1="0" y1="-7" x2="0" y2="0" stroke="#78350f" strokeWidth="0.8" />
                        <ellipse cx="0" cy="4" rx="4" ry="5.2" fill="#f43f5e" />
                        <circle cx="0" cy="4" r="1.8" fill="#ffffff" />
                        <ellipse cx="0" cy="14" rx="9" ry="2.5" fill="#f43f5e" opacity="0.4" filter="url(#bloomSoft)" />
                    </g>
                </g>
            </g>

            `;

    code = code.slice(0, oldDock2Start) + newDock2People + code.slice(oldDock2End);
    console.log('Updated Tam Cap Dong successfully!');
}

fs.writeFileSync(backdropPath, code, 'utf8');
console.log('Successfully saved backdrop updates for Docks!');
