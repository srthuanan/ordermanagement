const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

console.log('Original backdrop length:', code.length);

// -----------------------------------------------------------------------------
// REUSABLE ARTISTIC HELPERS
// -----------------------------------------------------------------------------
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

function renderBoatman(options = {}) {
    const {
        cx = 14, cy = -4,
        aoColor = '#3b1d06',
        skinColor = '#fed7aa',
        facingRight = true,
        oarLength = 55
    } = options;
    const dir = facingRight ? 1 : -1;

    return `
        {/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU - KIỂU NGƯỜI MỚI */}
        <g transform="translate(${cx}, ${cy})">
            <ellipse cx="0" cy="18" rx="6" ry="2" fill="#01040a" opacity="0.5" />
            ${renderNonLa(0, -7, 24, 13)}
            ${renderFace(0, -6, 3.5, { skinColor, eyeDir: dir, mustache: true, hair: 'none' })}
            <path d="M -4.5,-2 L 4.5,-2 L 5.5,17 L -5.5,17 Z" fill="${aoColor}" stroke="#1f0f03" strokeWidth="0.6" />
            <circle cx="${dir * 1}" cy="2" r="0.6" fill="#ca8a04" />
            <circle cx="${dir * 1}" cy="6" r="0.6" fill="#ca8a04" />
            <circle cx="${dir * 1}" cy="10" r="0.6" fill="#ca8a04" />
            <g className="animate-oar-row">
                <path d="M ${-2 * dir},0 Q ${3 * dir},4 ${6 * dir},9" stroke="${skinColor}" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                <circle cx="${6 * dir}" cy="9" r="1.5" fill="${skinColor}" />
                <line x1="${5 * dir}" y1="8" x2="${-26 * dir}" y2="${oarLength - 18}" stroke="#5c3818" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M ${-26 * dir},${oarLength - 18} L ${-36 * dir},${oarLength - 8}" stroke="#854d0e" strokeWidth="5.2" strokeLinecap="round" />
                <ellipse cx="${-31 * dir}" cy="${oarLength - 13}" rx="6" ry="2.2" fill="#fef08a" opacity="0.6" />
            </g>
        </g>
    `;
}

function renderBoatMaiden(options = {}) {
    const {
        cx = 56, cy = -3,
        aoColor = '#db2777',
        quanColor = '#fef08a',
        lanternColor = '#f43f5e',
        facingRight = true
    } = options;
    const dir = facingRight ? 1 : -1;

    return `
        {/* THIẾU NỮ ÁO DÀI THẢ HOA ĐĂNG - KIỂU NGƯỜI MỚI */}
        <g transform="translate(${cx}, ${cy})">
            <ellipse cx="0" cy="18" rx="6" ry="1.8" fill="#01040a" opacity="0.4" />
            <path d="M -4,2 L 4,2 L 5.5,15 L -5.5,15 Z" fill="${aoColor}" />
            <path d="M -2,4 Q ${2 * dir},8 ${4 * dir},15" stroke="${quanColor}" strokeWidth="0.6" />
            <path d="M -2.5,-2 L 2.5,-2 L 3,2 L -3,2 Z" fill="${aoColor}" stroke="#fef08a" strokeWidth="0.5" />
            <circle cx="${1.5 * dir}" cy="0" r="0.6" fill="#fef08a" />
            ${renderFace(0, -6, 3.6, { skinColor: '#fed7aa', eyeDir: dir, hair: 'bun' })}
            <path d="M ${2 * dir},3 Q ${6 * dir},7 ${9 * dir},12" stroke="${aoColor}" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="${9 * dir}" cy="12" r="1.4" fill="#fed7aa" />
            <g transform="translate(${12 * dir}, 15)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="1.5" rx="5" ry="2.5" fill="${lanternColor}" />
                <polygon points="-3,1 0,-2 3,1 0,3" fill="#fbcfe8" />
                <circle cx="0" cy="0" r="1.6" fill="#ffffff" />
                <ellipse cx="0" cy="4" rx="8" ry="2" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
            </g>
        </g>
    `;
}

function renderBoatGentleman(options = {}) {
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

function renderBoatVendorLady(options = {}) {
    const {
        cx = 94, cy = 6,
        aoColor = '#059669',
        facingRight = true
    } = options;
    const dir = facingRight ? 1 : -1;

    return `
        {/* PHỤ NỮ BÁN NÔNG SẢN HOA CÚC NÓN LÁ ÁO BÀ BA - KIỂU NGƯỜI MỚI */}
        <g transform="translate(${cx}, ${cy})">
            <ellipse cx="0" cy="16" rx="5.5" ry="1.8" fill="#01040a" opacity="0.4" />
            ${renderNonLa(0, -6, 22, 12)}
            ${renderFace(0, -5, 3.4, { skinColor: '#fed7aa', eyeDir: dir, hair: 'none' })}
            <path d="M -4,0 L 4,0 L 4.8,14 L -4.8,14 Z" fill="${aoColor}" />
            <circle cx="${1 * dir}" cy="4" r="0.5" fill="#ca8a04" />
            <circle cx="${1 * dir}" cy="8" r="0.5" fill="#ca8a04" />
            <path d="M ${2 * dir},1 Q ${5 * dir},4 ${7 * dir},7" stroke="${aoColor}" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <circle cx="${7 * dir}" cy="7" r="1.3" fill="#fed7aa" />
        </g>
    `;
}

// -----------------------------------------------------------------------------
// BUILD THE COMPLETE 12 BOATS
// -----------------------------------------------------------------------------
function buildSampanCanopy(options = {}) {
    const {
        lanternColor = '#ef4444',
        hasPassenger = true,
        passengerType = 'couple', // 'couple', 'flower_releaser', 'family'
        wakeColor = '#fde047',
        facingRight = true,
        maidenAo = '#db2777',
        gentlemanAo = '#0284c7'
    } = options;

    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="45" cy="22" rx="58" ry="9" fill="#01040a" opacity="0.75" />
            <path d="M -22,12 Q -45,18 -75,22 M -22,18 Q -40,24 -65,30" stroke="${wakeColor}" strokeWidth="1.2" opacity="0.5" className="animate-boat-wake" fill="none" />
            
            {/* Thân thuyền nan gỗ Hội An */}
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5 Q 85,32 45,34 Q 10,32 -22,5 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.8" />
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5" fill="none" stroke="#854d0e" strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="18" x2="10" y2="28" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="32" y1="21" x2="32" y2="31" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="58" y1="21" x2="58" y2="31" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="82" y1="18" x2="82" y2="28" stroke="#3b1d06" strokeWidth="1.5" />
            
            {/* Mui vòm chiếu tre truyền thống Hội An */}
            <path d="M 22,8 C 22,-14 74,-14 74,8 Z" fill="#451a03" stroke="#1c0e02" strokeWidth="1.5" />
            <path d="M 24,6 C 24,-11 72,-11 72,6 Z" fill="#78350f" opacity="0.9" />
            <path d="M 28,4 C 28,-8 68,-8 68,4" fill="none" stroke="#d97706" strokeWidth="1" opacity="0.7" />
            <line x1="36" y1="-7" x2="36" y2="8" stroke="#261001" strokeWidth="0.8" />
            <line x1="48" y1="-9" x2="48" y2="8" stroke="#261001" strokeWidth="0.8" />
            <line x1="60" y1="-7" x2="60" y2="8" stroke="#261001" strokeWidth="0.8" />
            <ellipse cx="48" cy="4" rx="15" ry="6" fill="#f59e0b" opacity="0.5" filter="url(#bloomSoft)" />

            ${hasPassenger && passengerType === 'couple' ? `
                ${renderBoatGentleman({ cx: 36, cy: -2, aoColor: gentlemanAo, facingRight })}
                ${renderBoatMaiden({ cx: 56, cy: -3, aoColor: maidenAo, lanternColor, facingRight })}
            ` : ''}

            ${hasPassenger && passengerType === 'flower_releaser' ? `
                ${renderBoatMaiden({ cx: 56, cy: -3, aoColor: maidenAo, lanternColor, facingRight })}
            ` : ''}

            ${hasPassenger && passengerType === 'family' ? `
                ${renderBoatGentleman({ cx: 34, cy: -1, aoColor: '#047857', facingRight })}
                ${renderBoatMaiden({ cx: 62, cy: -2, aoColor: '#db2777', lanternColor, facingRight })}
            ` : ''}
            
            {/* Bác lái đò chèo thuyền */}
            ${renderBoatman({ cx: 14, cy: -4, facingRight })}

            {/* Sào đèn lồng cong đầu mũi thuyền */}
            <path d="M 100,6 Q 112,-4 114,-14" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="114" cy="-10" rx="5.5" ry="8" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="114" cy="-10" r="2.2" fill="#ffffff" />
            <line x1="114" y1="-2" x2="114" y2="4" stroke="#eab308" strokeWidth="1.2" strokeLinecap="round" />
            <ellipse cx="114" cy="26" rx="14" ry="4.5" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

function buildLightCanoe(options = {}) {
    const {
        lanternColor = '#06b6d4',
        passengerColor = '#ec4899',
        hasPassenger = true,
        facingRight = true
    } = options;

    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="40" cy="20" rx="48" ry="8" fill="#01040a" opacity="0.7" />
            <path d="M -18,10 Q -38,15 -62,18" stroke="#38bdf8" strokeWidth="1" opacity="0.5" className="animate-boat-wake" fill="none" />
            
            <path d="M -18,4 Q 10,18 40,20 Q 72,18 100,4 Q 72,27 40,28 Q 10,27 -18,4 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.6" />
            <path d="M -18,4 Q 10,18 40,20 Q 72,18 100,4" fill="none" stroke="#ca8a04" strokeWidth="2.4" strokeLinecap="round" />

            ${hasPassenger ? `
                ${renderBoatMaiden({ cx: 50, cy: -2, aoColor: passengerColor, lanternColor, facingRight })}
            ` : ''}

            ${renderBoatman({ cx: 12, cy: -4, facingRight, oarLength: 50 })}

            <path d="M 85,5 Q 95,-3 96,-12" fill="none" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="96" cy="-8" rx="5" ry="7" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="96" cy="-8" r="1.8" fill="#ffffff" />
            <ellipse cx="96" cy="22" rx="11" ry="3.8" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

function buildMerchantBoat(options = {}) {
    const { lantern1 = '#ef4444', lantern2 = '#f59e0b', facingRight = true } = options;
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="50" cy="24" rx="65" ry="10" fill="#01040a" opacity="0.75" />
            <path d="M -25,14 Q -55,20 -85,25 M -25,20 -50,28 -75,34" stroke="#fde047" strokeWidth="1.4" opacity="0.5" className="animate-boat-wake" fill="none" />

            <path d="M -26,6 Q 15,25 55,27 Q 95,25 132,6 Q 95,36 55,38 Q 15,36 -26,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="2" />
            <path d="M -26,6 Q 15,25 55,27 Q 95,25 132,6" fill="none" stroke="#ca8a04" strokeWidth="2.8" strokeLinecap="round" />
            
            {/* Thúng hoa cúc mâm xôi & trái cây */}
            <ellipse cx="28" cy="14" rx="11" ry="6" fill="#713f12" />
            <circle cx="28" cy="11" r="9" fill="#eab308" filter="url(#bloomSoft)" />
            <ellipse cx="48" cy="13" rx="11" ry="6" fill="#713f12" />
            <circle cx="48" cy="10" r="9" fill="#f59e0b" filter="url(#bloomSoft)" />
            <ellipse cx="68" cy="14" rx="10" ry="5.5" fill="#713f12" />
            <circle cx="68" cy="11" r="8.5" fill="#eab308" filter="url(#bloomSoft)" />

            <path d="M 22,12 C 24,-6 72,-6 74,12 Z" fill="#291302" stroke="#120601" strokeWidth="1.2" opacity="0.6" />

            {/* Phụ nữ bán nông sản nón lá áo bà ba */}
            ${renderBoatVendorLady({ cx: 94, cy: 6, facingRight })}

            {/* Người chèo lái */}
            ${renderBoatman({ cx: 8, cy: -5, facingRight, oarLength: 58 })}

            {/* Cột sào 2 lồng đèn kéo quân */}
            <line x1="82" y1="12" x2="82" y2="-22" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="82" cy="-12" rx="6" ry="8.5" fill="${lantern1}" filter="url(#bloomHigh)" />
            <circle cx="82" cy="-12" r="2.2" fill="#ffffff" />
            <ellipse cx="100" cy="-12" rx="5.5" ry="7.5" fill="${lantern2}" filter="url(#bloomHigh)" />
            <circle cx="100" cy="-12" r="2" fill="#ffffff" />
        </g>
    `;
}

function buildDragonRoyalBoat() {
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="60" cy="26" rx="75" ry="12" fill="#01040a" opacity="0.8" />
            <path d="M -28,15 Q -60,22 -95,26 M -28,22 -58,30 -85,36" stroke="#fde047" strokeWidth="1.6" opacity="0.6" className="animate-boat-wake" fill="none" />

            <path d="M -28,8 Q 18,28 62,30 Q 110,28 152,8 Q 110,42 62,44 Q 18,42 -28,8 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="2.4" />
            <path d="M -28,8 Q 18,28 62,30 Q 110,28 152,8" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />

            {/* Đầu rồng chạm trổ hoàng gia */}
            <g transform="translate(142, 6)">
                <path d="M 0,0 Q 8,-8 14,-6 Q 18,-4 20,2 Q 16,6 10,4 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="1.2" />
                <circle cx="12" cy="-2" r="1.8" fill="#ef4444" />
                <circle cx="12" cy="-2" r="0.8" fill="#ffffff" />
                <polygon points="14,-6 18,-12 16,-5" fill="#f59e0b" />
            </g>

            {/* Cung điện thu nhỏ mái ngói hoàng kim */}
            <rect x="25" y="-12" width="65" height="24" rx="2" fill="#78350f" stroke="#ca8a04" strokeWidth="1.2" />
            <path d="M 20,-12 Q 57.5,-22 95,-12 L 90,-16 Q 57.5,-25 25,-16 Z" fill="#d97706" stroke="#78350f" strokeWidth="1" />

            {/* Cặp đôi hoàng gia trong cung điện */}
            ${renderBoatGentleman({ cx: 42, cy: -6, aoColor: '#b91c1c', khanColor: '#0f172a', facingRight: true })}
            ${renderBoatMaiden({ cx: 70, cy: -6, aoColor: '#f59e0b', lanternColor: '#ef4444', facingRight: true })}

            {/* Người chèo lái thuyền rồng */}
            ${renderBoatman({ cx: 6, cy: -4, aoColor: '#1e3a8a', facingRight: true, oarLength: 62 })}

            <g transform="translate(40, -22)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="0" rx="5.5" ry="8" fill="#ef4444" />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
            </g>
            <g transform="translate(80, -22)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="0" rx="5.5" ry="8" fill="#f59e0b" />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
            </g>
        </g>
    `;
}

// -----------------------------------------------------------------------------
// REBUILD ALL 12 BOATS BLOCK
// -----------------------------------------------------------------------------
const new12BoatsJsx = `
    {/* ============================================================================== */}
    {/* 12 CHIẾC THUYỀN GHE XUỒNG TẤP NẬP LIÊN TỤC CHÈO ĐAN XEN THEO CẢ 2 HƯỚNG        */}
    {/* TẤT CẢ ĐƯỢC NÂNG CẤP ĐẦY ĐỦ KIỂU NGƯỜI MỚI (BÁC LÁI ĐÒ & HÀNH KHÁCH THẢ HOA ĐĂNG) */}
    {/* ============================================================================== */}

    {/* LÀN 1: TẦNG XA (y=620, scale=0.85) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-lr-1a">
        ${buildSampanCanopy({ lanternColor: '#ef4444', hasPassenger: true, passengerType: 'couple', facingRight: true })}
    </g>
    <g className="animate-boat-lr-1b">
        ${buildLightCanoe({ lanternColor: '#06b6d4', passengerColor: '#ec4899', hasPassenger: true, facingRight: true })}
    </g>

    {/* LÀN 2: TẦNG XA NGƯỢC CHIỀU (y=585, scale=0.70) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-rl-1a">
        ${buildLightCanoe({ lanternColor: '#f59e0b', hasPassenger: false, facingRight: false })}
    </g>
    <g className="animate-boat-rl-1b">
        ${buildSampanCanopy({ lanternColor: '#ec4899', hasPassenger: true, passengerType: 'family', wakeColor: '#fde047', facingRight: false })}
    </g>

    {/* LÀN 3: TẦNG TRUNG XUÔI DÒNG (y=730, scale=1.15) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-lr-2a">
        ${buildMerchantBoat({ lantern1: '#ef4444', lantern2: '#f59e0b', facingRight: true })}
    </g>
    <g className="animate-boat-lr-2b">
        ${buildSampanCanopy({ lanternColor: '#f59e0b', hasPassenger: true, passengerType: 'flower_releaser', wakeColor: '#fef08a', facingRight: true })}
    </g>

    {/* LÀN 4: TẦNG TRUNG NGƯỢC CHIỀU (y=675, scale=1.02) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-rl-2a">
        ${buildSampanCanopy({ lanternColor: '#10b981', hasPassenger: true, passengerType: 'couple', wakeColor: '#38bdf8', facingRight: false })}
    </g>
    <g className="animate-boat-rl-2b">
        ${buildLightCanoe({ lanternColor: '#ef4444', passengerColor: '#3b82f6', hasPassenger: true, facingRight: false })}
    </g>

    {/* LÀN 5: TẦNG GẦN XUÔI DÒNG (y=860, scale=1.42 - CẬN CẢNH) - 2 thuyền bề thế */}
    <g className="animate-boat-lr-3a">
        ${buildDragonRoyalBoat()}
    </g>
    <g className="animate-boat-lr-3b">
        ${buildMerchantBoat({ lantern1: '#f59e0b', lantern2: '#10b981', facingRight: true })}
    </g>

    {/* LÀN 6: TẦNG GẦN NGƯỢC CHIỀU (y=795, scale=1.28 - GIAO THOA CẬN CẢNH) */}
    <g className="animate-boat-rl-3a">
        ${buildLightCanoe({ lanternColor: '#ec4899', passengerColor: '#eab308', hasPassenger: true, facingRight: false })}
    </g>
    <g className="animate-boat-rl-3b">
        ${buildSampanCanopy({ lanternColor: '#ef4444', hasPassenger: true, passengerType: 'flower_releaser', wakeColor: '#fef08a', facingRight: false })}
    </g>
`;

const boatStartMarker = '{/* 12 CHIẾC THUYỀN GHE XUỒNG TẤP NẬP LIÊN TỤC CHÈO ĐAN XEN THEO CẢ 2 HƯỚNG';
const boatStartIdx = code.indexOf(boatStartMarker);
const treeSectionMarker = '{/* HỆ THỐNG CÂY XANH & CẢNH QUAN PHỐ CỔ HỘI AN';
const treeSectionIdx = code.indexOf(treeSectionMarker);
// The boat section ends before the tree section's preceding header
const boatEndIdx = code.lastIndexOf('{/* ============================================================================== */}', treeSectionIdx);

console.log('Replacing boats from', boatStartIdx, 'to', boatEndIdx);
if (boatStartIdx !== -1 && boatEndIdx !== -1) {
    code = code.slice(0, boatStartIdx) + new12BoatsJsx.trim() + '\n\n    ' + code.slice(boatEndIdx);
    console.log('Successfully replaced all 12 boats with high-detail new character figures!');
}

fs.writeFileSync(backdropPath, code, 'utf8');
console.log('Backdrop updated with new boats!');
