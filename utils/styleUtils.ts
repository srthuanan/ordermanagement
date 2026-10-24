import React from 'react';


// Centralized helper function to apply dynamic styles based on exterior color text.
export const getExteriorColorStyle = (exteriorValue: string | undefined): React.CSSProperties => {
    if (!exteriorValue) return {};
    const lower = exteriorValue.toLowerCase().trim();

    // 1. Extract color code from parentheses if available (e.g. "CE17", "CE21", "CE1U", "CE18")
    const codeMatch = lower.match(/\(([^)]+)\)/);
    const code = codeMatch ? codeMatch[1].trim().toLowerCase() : '';

    // 1. Kiểm tra chính xác theo MÃ MÀU (Color Code) trước tiên
    if (code) {
        if (code === 'ce1u' || code === '111u' || code === '181u' || code === 'ce23' || code === '2523' || code === '1823') return { color: '#CA8A04' }; // Vàng Summer / Canary Yellow
        if (code === 'ce1a' || code === 'ce32' || code === '1132' || code === '1832') return { color: '#EA580C' }; // Cam Sunset / Vitality
        if (code === 'ce1m' || code === '111m' || code === 'ce2q' || code === '112q' || code === '182q') return { color: '#DC2626' }; // Đỏ Crimson / Solar Ruby
        if (code === 'ce1w' || code === 'ce2b' || code === 'ce1h' || code === 'ce22' || code === 'ce21' || code === '171w' || code === '1722') return { color: '#059669' }; // Xanh Emerald / Mint / Criterio
        if (code === 'ce1n' || code === 'ce1j' || code === 'ce2j' || code === '1y26' || code === '182g' || code === '2a26' || code === 'ce33') return { color: '#2563EB' }; // Xanh VinFast Blue
        if (code === 'ce17') return { color: '#64748B' }; // Bạc Silver
        if (code === 'ce14' || code === 'ce1v' || code === '171v' || code === '1v18' || code === '2811') return { color: '#475569' }; // Xám Neptune / Zenith Grey
        if (code === 'ce11' || code === '3111') return { color: '#0F172A' }; // Đen Jet Black
        if (code === 'ce1x' || code === 'ce2k' || code === '1821' || code === '181x') return { color: '#DB2777' }; // Hồng Iris Berry
        if (code === 'ce2n' || code === '2927') return { color: '#92400E' }; // Nâu Đồng Bronze
        if (code === 'ce2o' || code === '312o') return { color: '#9333EA' }; // Tím Mysterioso
        if (code === 'ce18' || code === '1818') return { color: '#334155' }; // Trắng Đơn Sắc
    }

    // 2. Xử lý xe 2-tone nóc trắng (Brahminy White Roof) -> Lấy màu thân xe (Body)
    const isWhiteRoof = lower.includes('white roof') || lower.includes('nóc trắng');
    if (isWhiteRoof) {
        if (lower.includes('yellow') || lower.includes('vàng') || lower.includes('summer')) return { color: '#CA8A04' };
        if (lower.includes('red') || lower.includes('đỏ') || lower.includes('ruby') || lower.includes('crimson')) return { color: '#DC2626' };
        if (lower.includes('green') || lower.includes('mint') || lower.includes('criterio') || lower.includes('xanh lá')) return { color: '#059669' };
        if (lower.includes('blue') || lower.includes('xanh dương')) return { color: '#2563EB' };
        if (lower.includes('grey') || lower.includes('gray') || lower.includes('xám') || lower.includes('zenith')) return { color: '#475569' };
        if (lower.includes('pink') || lower.includes('rose') || lower.includes('hồng') || lower.includes('iris') || lower.includes('berry')) return { color: '#DB2777' };
        if (lower.includes('orange') || lower.includes('cam')) return { color: '#EA580C' };
    }

    // 3. Keyword fallback
    if (lower.includes('criterio') || lower.includes('green') || lower.includes('mint') || lower.includes('ivy') || lower.includes('xanh lá') || lower.includes('ocean')) return { color: '#059669' };
    if (lower.includes('silver') || lower.includes('bạc') || lower.includes('desat')) return { color: '#64748B' };
    if (lower.includes('yellow') || lower.includes('vàng') || lower.includes('creme') || lower.includes('champagne')) return { color: '#CA8A04' };
    if (lower.includes('pink') || lower.includes('rose') || lower.includes('berry') || lower.includes('hồng')) return { color: '#DB2777' };
    if (lower.includes('ruby') || lower.includes('crimson') || lower.includes('red') || lower.includes('đỏ')) return { color: '#DC2626' };
    if (lower.includes('blue') || lower.includes('azure') || lower.includes('xanh dương') || lower.includes('xanh lam')) return { color: '#2563EB' };
    if (lower.includes('black') || lower.includes('đen')) return { color: '#0F172A' };
    if (lower.includes('grey') || lower.includes('gray') || lower.includes('xám') || lower.includes('graphite') || lower.includes('neptune') || lower.includes('zenith') || lower.includes('stealth')) return { color: '#475569' };
    if (lower.includes('orange') || lower.includes('cam') || lower.includes('sunset') || lower.includes('orb') || lower.includes('vitality')) return { color: '#EA580C' };
    if (lower.includes('purple') || lower.includes('tím') || lower.includes('mysterioso')) return { color: '#9333EA' };
    if (lower.includes('brown') || lower.includes('bronze') || lower.includes('nâu')) return { color: '#92400E' };
    if (lower.includes('gold')) return { color: '#CA8A04' };
    if (lower.includes('white') || lower.includes('trắng') || lower.includes('blanc') || lower.includes('ce18')) return { color: '#334155' };

    return {};
};

/**
 * Lấy mã màu thực tế (Hex) của màu sơn ngoại thất xe để vẽ chấm tròn màu (swatch dot)
 */
export const getExteriorSwatchColor = (exteriorValue: string | undefined): string => {
    return (getBackgroundColorStyle(exteriorValue)?.backgroundColor as string) || '#CBD5E1';
};

export const getInteriorColorStyle = (interiorValue: string | undefined): React.CSSProperties => {
    if (!interiorValue) return {};
    const lowerInteriorValue = interiorValue.toLowerCase().trim();

    if (lowerInteriorValue.includes("introspective brown (ce2n)")) {
        return { color: '#634030' }; // Specific deep earthy brown
    }
    if (lowerInteriorValue.includes("black")) {
        return { color: '#1F2937' }; // Almost black from theme
    }
    if (lowerInteriorValue.includes("brown")) {
        return { color: '#78350F' }; // amber-800, a rich brown
    }
    if (lowerInteriorValue.includes("beige")) {
        return { color: '#B45309' }; // amber-700, a dark beige for readability
    }
    if (lowerInteriorValue.includes("grey")) {
        return { color: '#4B5563' }; // gray-600
    }

    return {};
};

export const getBackgroundColorStyle = (colorName: string | undefined): React.CSSProperties => {
    if (!colorName) return { backgroundColor: '#CBD5E1' };
    const lower = colorName.toLowerCase().trim();
    const codeMatch = lower.match(/\(([^)]+)\)/);
    const code = codeMatch ? codeMatch[1].trim().toLowerCase() : '';

    // 1. Kiểm tra chính xác theo MÃ MÀU (Color Code) trước tiên
    if (code) {
        if (code === 'ce1u' || code === '111u' || code === '181u' || code === 'ce23' || code === '2523' || code === '1823') return { backgroundColor: '#FACC15' }; // Vàng tươi
        if (code === 'ce1a' || code === 'ce32' || code === '1132' || code === '1832') return { backgroundColor: '#F97316' }; // Cam
        if (code === 'ce1m' || code === '111m' || code === 'ce2q' || code === '112q' || code === '182q') return { backgroundColor: '#EF4444' }; // Đỏ
        if (code === 'ce1w' || code === 'ce2b' || code === 'ce1h' || code === 'ce22' || code === 'ce21' || code === '171w' || code === '1722') return { backgroundColor: '#10B981' }; // Xanh lá / Mint
        if (code === 'ce1n' || code === 'ce1j' || code === 'ce2j' || code === '1y26' || code === '182g' || code === '2a26' || code === 'ce33') return { backgroundColor: '#2563EB' }; // Xanh VinFast Blue
        if (code === 'ce17') return { backgroundColor: '#CBD5E1' }; // Bạc
        if (code === 'ce14' || code === 'ce1v' || code === '171v' || code === '1v18' || code === '2811') return { backgroundColor: '#64748B' }; // Xám
        if (code === 'ce11' || code === '3111') return { backgroundColor: '#0F172A' }; // Đen
        if (code === 'ce1x' || code === 'ce2k' || code === '1821' || code === '181x') return { backgroundColor: '#EC4899' }; // Hồng
        if (code === 'ce2n' || code === '2927') return { backgroundColor: '#92400E' }; // Nâu Đồng
        if (code === 'ce2o' || code === '312o') return { backgroundColor: '#9333EA' }; // Tím
        if (code === 'ce18' || code === '1818') return { backgroundColor: '#FFFFFF' }; // Trắng
    }

    // 2. Xử lý xe 2-tone nóc trắng (Brahminy White Roof) -> Lấy màu thân xe (Body)
    const isWhiteRoof = lower.includes('white roof') || lower.includes('nóc trắng');
    if (isWhiteRoof) {
        if (lower.includes('yellow') || lower.includes('vàng') || lower.includes('summer')) return { backgroundColor: '#FACC15' };
        if (lower.includes('red') || lower.includes('đỏ') || lower.includes('ruby') || lower.includes('crimson')) return { backgroundColor: '#EF4444' };
        if (lower.includes('green') || lower.includes('mint') || lower.includes('criterio') || lower.includes('xanh lá')) return { backgroundColor: '#10B981' };
        if (lower.includes('blue') || lower.includes('xanh dương')) return { backgroundColor: '#2563EB' };
        if (lower.includes('grey') || lower.includes('gray') || lower.includes('xám') || lower.includes('zenith')) return { backgroundColor: '#64748B' };
        if (lower.includes('pink') || lower.includes('rose') || lower.includes('hồng') || lower.includes('iris') || lower.includes('berry')) return { backgroundColor: '#EC4899' };
        if (lower.includes('orange') || lower.includes('cam')) return { backgroundColor: '#F97316' };
    }

    // 3. Keyword fallback
    if (lower.includes('criterio') || lower.includes('green') || lower.includes('mint') || lower.includes('ivy') || lower.includes('xanh lá') || lower.includes('ocean')) return { backgroundColor: '#10B981' };
    if (lower.includes('silver') || lower.includes('bạc') || lower.includes('desat')) return { backgroundColor: '#CBD5E1' };
    if (lower.includes('yellow') || lower.includes('vàng') || lower.includes('creme') || lower.includes('champagne')) return { backgroundColor: '#FACC15' };
    if (lower.includes('pink') || lower.includes('rose') || lower.includes('berry') || lower.includes('hồng')) return { backgroundColor: '#EC4899' };
    if (lower.includes('ruby') || lower.includes('crimson') || lower.includes('red') || lower.includes('đỏ')) return { backgroundColor: '#DC2626' };
    if (lower.includes('blue') || lower.includes('azure') || lower.includes('xanh dương') || lower.includes('xanh lam')) return { backgroundColor: '#2563EB' };
    if (lower.includes('black') || lower.includes('đen')) return { backgroundColor: '#0F172A' };
    if (lower.includes('grey') || lower.includes('gray') || lower.includes('xám') || lower.includes('graphite') || lower.includes('neptune') || lower.includes('zenith') || lower.includes('stealth')) return { backgroundColor: '#64748B' };
    if (lower.includes('orange') || lower.includes('cam') || lower.includes('sunset') || lower.includes('orb') || lower.includes('vitality')) return { backgroundColor: '#F97316' };
    if (lower.includes('purple') || lower.includes('tím') || lower.includes('mysterioso')) return { backgroundColor: '#9333EA' };
    if (lower.includes('brown') || lower.includes('bronze') || lower.includes('nâu')) return { backgroundColor: '#92400E' };
    if (lower.includes('white') || lower.includes('trắng') || lower.includes('blanc') || lower.includes('ce18')) return { backgroundColor: '#FFFFFF' };

    return { backgroundColor: '#CBD5E1' };
};

// --- NEW DATA-DRIVEN IMAGE LOGIC ---

// Maps the official model name from the sheet to a simplified key for filenames.
const modelNameToImageKeyMap: Record<string, string> = {
    "VF 2": "vf2",
    "VF2": "vf2",
    "VF 3": "vf3",
    "VF 5": "vf5",
    "VF 6": "vf6",
    "VF 7": "vf7",
    "VF 8": "vf8",
    "VF 9": "vf9",
    "VF Wild": "vfwild",
    "VF WILD": "vfwild",
    "VFWILD": "vfwild",
    "Wild": "vfwild",
    "EC Van": "ecvan",
    "HERIO": "herio",
    "HERIO GREEN": "herio",
    "Herio Green": "herio",
    "LIMO": "limo",
    "LIMO GREEN": "limo",
    "Limo Green": "limo",
    "MINIO": "minio",
    "MINIO GREEN": "minio",
    "Minio Green": "minio",
    "NERIO": "limo",
    "Nerio": "limo",
    "VF LIMO": "vflimo",
    "VF MPV 7": "vfmpv7",
    "VF MPV7": "vfmpv7",
    "MPV 7": "vfmpv7",
    "MPV7": "vfmpv7",
    "VFMPV7": "vfmpv7",
    "ECVAN": "ecvan",
    "VF 8 NEW": "vf8",
    "VF 8 New": "vf8",
    "VF 8 ALL NEW": "vf8",
    "VF 8 All New": "vf8",
    "VF 8 THE ALL NEW": "vf8",
};

// VinFast CDN Images Lookup Map (Chính hãng từ Shop VinFast CDN)
const vinfastCdnImages: Record<string, string> = {
    // --- VF 2 ---
    "vf2-1821": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-rose-pink-car.webp",
    "vf2-182g": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-sky-blue-car.webp",
    "vf2-bac": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dweb504538/images/VF2/TH14V/CE17.webp",
    "vf2-beige": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-pebble-beige-car.webp",
    "vf2-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF2/TH14V/CE18.webp",
    "vf2-blue": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-sky-blue-car.webp",
    "vf2-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dweb504538/images/VF2/TH14V/CE17.webp",
    "vf2-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF2/TH14V/CE18.webp",
    "vf2-ce1u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe756594c/images/VF2/TH14V/CE1U.webp",
    "vf2-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw022a5c2f/images/VF2/TH14V/CE1W.webp",
    "vf2-ce21": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6712c383/images/VF2/TH14V/CE21.webp",
    "vf2-ce2g": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwdbdc5599/images/VF2/TH14V/CE2G.webp",
    "vf2-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe8c59c81/images/VF2/TH14V/CE2Q.webp",
    "vf2-ce2t": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw59ac38f2/images/VF2/TH14V/CE2T.webp",
    "vf2-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe8c59c81/images/VF2/TH14V/CE2Q.webp",
    "vf2-green": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw022a5c2f/images/VF2/TH14V/CE1W.webp",
    "vf2-mint": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw022a5c2f/images/VF2/TH14V/CE1W.webp",
    "vf2-pink": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-rose-pink-car.webp",
    "vf2-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe8c59c81/images/VF2/TH14V/CE2Q.webp",
    "vf2-rose": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-rose-pink-car.webp",
    "vf2-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe8c59c81/images/VF2/TH14V/CE2Q.webp",
    "vf2-silver": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dweb504538/images/VF2/TH14V/CE17.webp",
    "vf2-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF2/TH14V/CE18.webp",
    "vf2-vang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe756594c/images/VF2/TH14V/CE1U.webp",
    "vf2-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05aa09f9/images/VF2/TH14V/CE18.webp",
    "vf2-xanhla": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw022a5c2f/images/VF2/TH14V/CE1W.webp",
    "vf2-yellow": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe756594c/images/VF2/TH14V/CE1U.webp",
    // --- VF 3 ---
    "vf3-181u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6f9e51df/images/VF3/TI1BV/181U.webp",
    "vf3-181y": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw351a2879/images/VF3/TI1BV/181Y.webp",
    "vf3-182g": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw351a2879/images/VF3/TI1BV/181Y.webp",
    "vf3-1821": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb8b9cf2c/images/VF3/TI1BV/1821.webp",
    "vf3-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6d3a366b/images/VF3/TI1BV/CE18.webp",
    "vf3-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6d3a366b/images/VF3/TI1BV/CE18.webp",
    "vf3-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c0756e9/images/VF3/TI1BV/CE1V.webp",
    "vf3-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4344702c/images/VF3/TI1BV/CE1W.webp",
    "vf3-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw21828d23/images/VF3/TI1BV/CE2Q.webp",
    "vf3-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw21828d23/images/VF3/TI1BV/CE2Q.webp",
    "vf3-gray": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c0756e9/images/VF3/TI1BV/CE1V.webp",
    "vf3-green": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4344702c/images/VF3/TI1BV/CE1W.webp",
    "vf3-grey": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c0756e9/images/VF3/TI1BV/CE1V.webp",
    "vf3-mint": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4344702c/images/VF3/TI1BV/CE1W.webp",
    "vf3-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw21828d23/images/VF3/TI1BV/CE2Q.webp",
    "vf3-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw21828d23/images/VF3/TI1BV/CE2Q.webp",
    "vf3-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6d3a366b/images/VF3/TI1BV/CE18.webp",
    "vf3-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6d3a366b/images/VF3/TI1BV/CE18.webp",
    "vf3-xam": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c0756e9/images/VF3/TI1BV/CE1V.webp",
    "vf3-xanhla": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4344702c/images/VF3/TI1BV/CE1W.webp",
    // --- VF 5 ---
    "vf5-111u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwf62f0986/images/VF5/GA12V/111U.webp",
    "vf5-181y": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6a8286c7/images/VF5/GA12V/181Y.webp",
    "vf5-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15a07f69/images/VF5/GA12V/CE18.webp",
    "vf5-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15a07f69/images/VF5/GA12V/CE18.webp",
    "vf5-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw571c8451/images/VF5/GA12V/CE1V.webp",
    "vf5-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfa8dfe57/images/VF5/GA12V/CE1W.webp",
    "vf5-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwc781c6b0/images/VF5/GA12V/CE2Q.webp",
    "vf5-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwc781c6b0/images/VF5/GA12V/CE2Q.webp",
    "vf5-gray": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw571c8451/images/VF5/GA12V/CE1V.webp",
    "vf5-green": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfa8dfe57/images/VF5/GA12V/CE1W.webp",
    "vf5-grey": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw571c8451/images/VF5/GA12V/CE1V.webp",
    "vf5-mint": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfa8dfe57/images/VF5/GA12V/CE1W.webp",
    "vf5-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwc781c6b0/images/VF5/GA12V/CE2Q.webp",
    "vf5-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwc781c6b0/images/VF5/GA12V/CE2Q.webp",
    "vf5-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15a07f69/images/VF5/GA12V/CE18.webp",
    "vf5-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw15a07f69/images/VF5/GA12V/CE18.webp",
    "vf5-xam": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw571c8451/images/VF5/GA12V/CE1V.webp",
    "vf5-xanhla": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfa8dfe57/images/VF5/GA12V/CE1W.webp",
    // --- VF 6 ---
    "vf6-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw67f6e7c7/images/VF6/JB12V/CE11.webp",
    "vf6-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw60c73694/images/VF6/JB12V/CE18.webp",
    "vf6-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw67f6e7c7/images/VF6/JB12V/CE11.webp",
    "vf6-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw60c73694/images/VF6/JB12V/CE18.webp",
    "vf6-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5a8fb221/images/VF6/JB12V/CE1V.webp",
    "vf6-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw33366b7b/images/VF6/JB12V/CE1W.webp",
    "vf6-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb0a26fd7/images/VF6/JB12V/CE2Q.webp",
    "vf6-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw67f6e7c7/images/VF6/JB12V/CE11.webp",
    "vf6-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb0a26fd7/images/VF6/JB12V/CE2Q.webp",
    "vf6-eco-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwda2b25f0/images/VF6/JB10V/CE11.webp",
    "vf6-eco-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw445cc03b/images/VF6/JB10V/CE18.webp",
    "vf6-eco-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7e7f4a29/images/VF6/JB10V/CE1V.webp",
    "vf6-eco-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwdcc781de/images/VF6/JB10V/CE1W.webp",
    "vf6-eco-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw878c933f/images/VF6/JB10V/CE2Q.webp",
    "vf6-gray": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5a8fb221/images/VF6/JB12V/CE1V.webp",
    "vf6-green": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw33366b7b/images/VF6/JB12V/CE1W.webp",
    "vf6-grey": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5a8fb221/images/VF6/JB12V/CE1V.webp",
    "vf6-mint": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw33366b7b/images/VF6/JB12V/CE1W.webp",
    "vf6-plus-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw67f6e7c7/images/VF6/JB12V/CE11.webp",
    "vf6-plus-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw60c73694/images/VF6/JB12V/CE18.webp",
    "vf6-plus-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5a8fb221/images/VF6/JB12V/CE1V.webp",
    "vf6-plus-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw33366b7b/images/VF6/JB12V/CE1W.webp",
    "vf6-plus-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb0a26fd7/images/VF6/JB12V/CE2Q.webp",
    "vf6-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb0a26fd7/images/VF6/JB12V/CE2Q.webp",
    "vf6-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb0a26fd7/images/VF6/JB12V/CE2Q.webp",
    "vf6-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw60c73694/images/VF6/JB12V/CE18.webp",
    "vf6-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw60c73694/images/VF6/JB12V/CE18.webp",
    "vf6-xam": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5a8fb221/images/VF6/JB12V/CE1V.webp",
    "vf6-xanhla": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw33366b7b/images/VF6/JB12V/CE1W.webp",
    // --- VF 7 ---
    "vf7-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06ef2b07/images/VF7/GC12V/CE11.webp",
    "vf7-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4880850d/images/VF7/GC12V/CE18.webp",
    "vf7-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06ef2b07/images/VF7/GC12V/CE11.webp",
    "vf7-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4880850d/images/VF7/GC12V/CE18.webp",
    "vf7-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4486ff28/images/VF7/GC12V/CE1V.webp",
    "vf7-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwebf3fab6/images/VF7/GC12V/CE1W.webp",
    "vf7-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw2e362be9/images/VF7/GC12V/CE2Q.webp",
    "vf7-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06ef2b07/images/VF7/GC12V/CE11.webp",
    "vf7-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw2e362be9/images/VF7/GC12V/CE2Q.webp",
    "vf7-eco-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7fd70968/images/VF7/GC15V/CE11.webp",
    "vf7-eco-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5e18d16a/images/VF7/GC15V/CE18.webp",
    "vf7-eco-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw6071a992/images/VF7/GC15V/CE1V.webp",
    "vf7-eco-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4b5e4bae/images/VF7/GC15V/CE1W.webp",
    "vf7-eco-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw19c75f50/images/VF7/GC15V/CE2Q.webp",
    "vf7-gray": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4486ff28/images/VF7/GC12V/CE1V.webp",
    "vf7-green": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwebf3fab6/images/VF7/GC12V/CE1W.webp",
    "vf7-grey": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4486ff28/images/VF7/GC12V/CE1V.webp",
    "vf7-mint": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwebf3fab6/images/VF7/GC12V/CE1W.webp",
    "vf7-plus-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw06ef2b07/images/VF7/GC12V/CE11.webp",
    "vf7-plus-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4880850d/images/VF7/GC12V/CE18.webp",
    "vf7-plus-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4486ff28/images/VF7/GC12V/CE1V.webp",
    "vf7-plus-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwebf3fab6/images/VF7/GC12V/CE1W.webp",
    "vf7-plus-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw2e362be9/images/VF7/GC12V/CE2Q.webp",
    "vf7-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw2e362be9/images/VF7/GC12V/CE2Q.webp",
    "vf7-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw2e362be9/images/VF7/GC12V/CE2Q.webp",
    "vf7-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4880850d/images/VF7/GC12V/CE18.webp",
    "vf7-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4880850d/images/VF7/GC12V/CE18.webp",
    "vf7-xam": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4486ff28/images/VF7/GC12V/CE1V.webp",
    "vf7-xanhla": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwebf3fab6/images/VF7/GC12V/CE1W.webp",
    // --- VF 8 (Bản Tiêu Chuẩn & Eco/Plus) ---
    "vf8-171v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw2ab390ed/images/VF8/ND32V/171V.webp",
    "vf8-1v18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb82fddcc/images/VF8/ND32V/1V18.webp",
    "vf8-2911": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfb700bee/images/VF8/ND32V/2911.webp",
    "vf8-2927": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw428731ae/images/VF8/ND32V/2927.webp",
    "vf8-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe99399ba/images/VF8/ND32V/CE11.webp",
    "vf8-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3aa598fc/images/VF8/ND32V/CE18.webp",
    "vf8-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe99399ba/images/VF8/ND32V/CE11.webp",
    "vf8-ce14": "https://vinfasto2o.com/wp-content/uploads/2026/05/171V.png",
    "vf8-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3aa598fc/images/VF8/ND32V/CE18.webp",
    "vf8-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7ee45c93/images/VF8/ND32V/CE1M.webp",
    "vf8-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/171V.png",
    "vf8-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw90acd258/images/VF8/ND32V/CE22.webp",
    "vf8-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1M-1.png",
    "vf8-crimson": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7ee45c93/images/VF8/ND32V/CE1M.webp",
    "vf8-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe99399ba/images/VF8/ND32V/CE11.webp",
    "vf8-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7ee45c93/images/VF8/ND32V/CE1M.webp",
    "vf8-eco-171v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwa349f493/images/VF8/ND31V/171V.webp",
    "vf8-eco-1v18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwf71b68ce/images/VF8/ND31V/1V18.webp",
    "vf8-eco-2911": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5ab1cf86/images/VF8/ND31V/2911.webp",
    "vf8-eco-2927": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw19366c63/images/VF8/ND31V/2927.webp",
    "vf8-eco-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw19321e63/images/VF8/ND31V/CE11.webp",
    "vf8-eco-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwafc3ac80/images/VF8/ND31V/CE18.webp",
    "vf8-eco-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw65f5fd6d/images/VF8/ND31V/CE1M.webp",
    "vf8-eco-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5aa8e062/images/VF8/ND31V/CE22.webp",
    "vf8-plus-171v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw2ab390ed/images/VF8/ND32V/171V.webp",
    "vf8-plus-1v18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb82fddcc/images/VF8/ND32V/1V18.webp",
    "vf8-plus-2911": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfb700bee/images/VF8/ND32V/2911.webp",
    "vf8-plus-2927": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw428731ae/images/VF8/ND32V/2927.webp",
    "vf8-plus-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwe99399ba/images/VF8/ND32V/CE11.webp",
    "vf8-plus-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3aa598fc/images/VF8/ND32V/CE18.webp",
    "vf8-plus-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7ee45c93/images/VF8/ND32V/CE1M.webp",
    "vf8-plus-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw90acd258/images/VF8/ND32V/CE22.webp",
    "vf8-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7ee45c93/images/VF8/ND32V/CE1M.webp",
    "vf8-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3aa598fc/images/VF8/ND32V/CE18.webp",
    "vf8-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3aa598fc/images/VF8/ND32V/CE18.webp",
    // --- VF 8 All New (The All New) ---
    "vf8-allnew-112q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwed3bf97b/images/VF8-THE-ALL-NEW/HC11V/112Q.webp",
    "vf8-allnew-1132": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwcfdf63c1/images/VF8-THE-ALL-NEW/HC11V/1132.webp",
    "vf8-allnew-1832": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw024461bf/images/VF8-THE-ALL-NEW/HC11V/1832.webp",
    "vf8-allnew-1833": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd84f7689/images/VF8-THE-ALL-NEW/HC11V/1833.webp",
    "vf8-allnew-3111": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw14d5c233/images/VF8-THE-ALL-NEW/HC11V/3111.webp",
    "vf8-allnew-312o": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd0f6cced/images/VF8-THE-ALL-NEW/HC11V/312O.webp",
    "vf8-allnew-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb2337694/images/VF8-THE-ALL-NEW/HC11V/CE11.webp",
    "vf8-allnew-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw61dd02a5/images/VF8-THE-ALL-NEW/HC11V/CE18.webp",
    "vf8-allnew-ce2o": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9ed73f08/images/VF8-THE-ALL-NEW/HC11V/CE2O.webp",
    "vf8-allnew-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd511da03/images/VF8-THE-ALL-NEW/HC11V/CE2Q.webp",
    "vf8-allnew-ce32": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw58844690/images/VF8-THE-ALL-NEW/HC11V/CE32.webp",
    "vf8-allnew-ce33": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9497945d/images/VF8-THE-ALL-NEW/HC11V/CE33.webp",
    // --- VF 9 ---
    "vf9-bac": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9386fa1c/images/VF9/NE3NV/CE17.webp",
    "vf9-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9f28c7cd/images/VF9/NE3NV/CE11.webp",
    "vf9-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd1845889/images/VF9/NE3NV/CE18.webp",
    "vf9-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9f28c7cd/images/VF9/NE3NV/CE11.webp",
    "vf9-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9386fa1c/images/VF9/NE3NV/CE17.webp",
    "vf9-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd1845889/images/VF9/NE3NV/CE18.webp",
    "vf9-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1cc6342e/images/VF9/NE3NV/CE1M.webp",
    "vf9-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw24a20061/images/VF9/NE3NV/CE1V.webp",
    "vf9-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw609cbf4b/images/VF9/NE3NV/CE1W.webp",
    "vf9-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dweca0851a/images/VF9/NE3NV/CE22.webp",
    "vf9-crimson": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1cc6342e/images/VF9/NE3NV/CE1M.webp",
    "vf9-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9f28c7cd/images/VF9/NE3NV/CE11.webp",
    "vf9-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1cc6342e/images/VF9/NE3NV/CE1M.webp",
    "vf9-eco-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw12ed4303/images/VF9/NE3LV/CE11.webp",
    "vf9-eco-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd6d61ae2/images/VF9/NE3LV/CE17.webp",
    "vf9-eco-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwec05bc92/images/VF9/NE3LV/CE18.webp",
    "vf9-eco-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw231e8658/images/VF9/NE3LV/CE1M.webp",
    "vf9-eco-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw8287a700/images/VF9/NE3LV/CE1V.webp",
    "vf9-eco-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9858ec38/images/VF9/NE3LV/CE1W.webp",
    "vf9-eco-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw621d859a/images/VF9/NE3LV/CE22.webp",
    "vf9-gray": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw24a20061/images/VF9/NE3NV/CE1V.webp",
    "vf9-green": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw609cbf4b/images/VF9/NE3NV/CE1W.webp",
    "vf9-grey": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw24a20061/images/VF9/NE3NV/CE1V.webp",
    "vf9-mint": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw609cbf4b/images/VF9/NE3NV/CE1W.webp",
    "vf9-plus-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9f28c7cd/images/VF9/NE3NV/CE11.webp",
    "vf9-plus-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9386fa1c/images/VF9/NE3NV/CE17.webp",
    "vf9-plus-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd1845889/images/VF9/NE3NV/CE18.webp",
    "vf9-plus-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1cc6342e/images/VF9/NE3NV/CE1M.webp",
    "vf9-plus-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw24a20061/images/VF9/NE3NV/CE1V.webp",
    "vf9-plus-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw609cbf4b/images/VF9/NE3NV/CE1W.webp",
    "vf9-plus-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dweca0851a/images/VF9/NE3NV/CE22.webp",
    "vf9-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1cc6342e/images/VF9/NE3NV/CE1M.webp",
    "vf9-silver": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9386fa1c/images/VF9/NE3NV/CE17.webp",
    "vf9-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd1845889/images/VF9/NE3NV/CE18.webp",
    "vf9-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd1845889/images/VF9/NE3NV/CE18.webp",
    "vf9-xam": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw24a20061/images/VF9/NE3NV/CE1V.webp",
    "vf9-xanhla": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw609cbf4b/images/VF9/NE3NV/CE1W.webp",
    // --- VF Wild (Bán tải điện) ---
    "vfwild-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd6f8db6c/images/VFWILD/HJ01V/CE11.webp",
    "vfwild-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw282f10c9/images/VFWILD/HJ01V/CE18.webp",
    "vfwild-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd6f8db6c/images/VFWILD/HJ01V/CE11.webp",
    "vfwild-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw282f10c9/images/VFWILD/HJ01V/CE18.webp",
    "vfwild-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd81241d9/images/VFWILD/HJ01V/CE2Q.webp",
    "vfwild-ce31": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1fadad37/images/VFWILD/HJ01V/CE31.webp",
    "vfwild-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd6f8db6c/images/VFWILD/HJ01V/CE11.webp",
    "vfwild-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd81241d9/images/VFWILD/HJ01V/CE2Q.webp",
    "vfwild-gray": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1fadad37/images/VFWILD/HJ01V/CE31.webp",
    "vfwild-grey": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1fadad37/images/VFWILD/HJ01V/CE31.webp",
    "vfwild-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd81241d9/images/VFWILD/HJ01V/CE2Q.webp",
    "vfwild-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd81241d9/images/VFWILD/HJ01V/CE2Q.webp",
    "vfwild-stealth": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1fadad37/images/VFWILD/HJ01V/CE31.webp",
    "vfwild-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw282f10c9/images/VFWILD/HJ01V/CE18.webp",
    "vfwild-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw282f10c9/images/VFWILD/HJ01V/CE18.webp",
    // --- EC Van ---
    "ecvan-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7a4cc037/images/ECVAN/TG11V/CE18.webp",
    "ecvan-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7a4cc037/images/ECVAN/TG11V/CE18.webp",
    "ecvan-ce1u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd10ed434/images/ECVAN/TG11V/CE1U.webp",
    "ecvan-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0b6da443/images/ECVAN/TG11V/CE1W.webp",
    "ecvan-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwa80373d1/images/ECVAN/TG11V/CE2Q.webp",
    "ecvan-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwa80373d1/images/ECVAN/TG11V/CE2Q.webp",
    "ecvan-green": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0b6da443/images/ECVAN/TG11V/CE1W.webp",
    "ecvan-mint": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0b6da443/images/ECVAN/TG11V/CE1W.webp",
    "ecvan-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwa80373d1/images/ECVAN/TG11V/CE2Q.webp",
    "ecvan-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwa80373d1/images/ECVAN/TG11V/CE2Q.webp",
    "ecvan-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7a4cc037/images/ECVAN/TG11V/CE18.webp",
    "ecvan-vang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd10ed434/images/ECVAN/TG11V/CE1U.webp",
    "ecvan-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7a4cc037/images/ECVAN/TG11V/CE18.webp",
    "ecvan-xanhla": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0b6da443/images/ECVAN/TG11V/CE1W.webp",
    "ecvan-yellow": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd10ed434/images/ECVAN/TG11V/CE1U.webp",
    // --- Limo / VF Limo / MPV 7 ---
    "limo-bac": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "limo-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "limo-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "limo-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "limo-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "limo-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "limo-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "limo-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "limo-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "limo-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "limo-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "limo-silver": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "limo-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "limo-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vflimo-bac": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "vflimo-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "vflimo-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vflimo-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "vflimo-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "vflimo-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vflimo-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V.webp",
    "vflimo-ce2j": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2J-1.webp",
    "vflimo-ce2n": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2N-1.webp",
    "vflimo-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vflimo-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "vflimo-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vflimo-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vflimo-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vflimo-silver": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "vflimo-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vflimo-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vfmpv7-bac": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "vfmpv7-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "vfmpv7-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vfmpv7-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "vfmpv7-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "vfmpv7-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vfmpv7-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V.webp",
    "vfmpv7-ce2j": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2J-1.webp",
    "vfmpv7-ce2n": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2N-1.webp",
    "vfmpv7-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vfmpv7-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfe7b0e19/images/LimoGreen/SL1VV/CE11.webp",
    "vfmpv7-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vfmpv7-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vfmpv7-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbd78ae73/images/LimoGreen/SL1VV/CE2Q.webp",
    "vfmpv7-silver": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw08f52164/images/LimoGreen/SL1VV/CE17.webp",
    "vfmpv7-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    "vfmpv7-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb047ecf8/images/LimoGreen/SL1VV/CE18.webp",
    // --- Herio Green ---
    "herio-bac": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwc15aa60b/images/HerioGreen/GA1QV/CE17.webp",
    "herio-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd28cfcb0/images/HerioGreen/GA1QV/CE11.webp",
    "herio-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3633f28d/images/HerioGreen/GA1QV/CE18.webp",
    "herio-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd28cfcb0/images/HerioGreen/GA1QV/CE11.webp",
    "herio-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwc15aa60b/images/HerioGreen/GA1QV/CE17.webp",
    "herio-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3633f28d/images/HerioGreen/GA1QV/CE18.webp",
    "herio-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw68ecf571/images/HerioGreen/GA1QV/CE2Q.webp",
    "herio-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwd28cfcb0/images/HerioGreen/GA1QV/CE11.webp",
    "herio-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw68ecf571/images/HerioGreen/GA1QV/CE2Q.webp",
    "herio-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw68ecf571/images/HerioGreen/GA1QV/CE2Q.webp",
    "herio-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw68ecf571/images/HerioGreen/GA1QV/CE2Q.webp",
    "herio-silver": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwc15aa60b/images/HerioGreen/GA1QV/CE17.webp",
    "herio-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3633f28d/images/HerioGreen/GA1QV/CE18.webp",
    "herio-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw3633f28d/images/HerioGreen/GA1QV/CE18.webp",
    // --- Minio Green ---
    "minio-1117": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1cab044d/images/MinioGreen/TH12V/1117.webp",
    "minio-181u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwface439b/images/MinioGreen/TH12V/181U.webp",
    "minio-182i": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwfa026c2d/images/MinioGreen/TH12V/182I.webp",
    "minio-182k": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw52de775a/images/MinioGreen/TH12V/182K.webp",
    "minio-182q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw4143e4c6/images/MinioGreen/TH12V/182Q.webp",
    "minio-1p2k": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw9110f961/images/MinioGreen/TH12V/1P2K.webp",
    "minio-1u11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwb5738a7b/images/MinioGreen/TH12V/1U11.webp",
    "minio-1u2i": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1a7337ed/images/MinioGreen/TH12V/1U2I.webp",
    "minio-bac": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwf401d9d6/images/MinioGreen/TH12V/CE17.webp",
    "minio-black": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw75de8c5b/images/MinioGreen/TH12V/CE11.webp",
    "minio-blanc": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c6f2d5b/images/MinioGreen/TH12V/CE18.webp",
    "minio-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw75de8c5b/images/MinioGreen/TH12V/CE11.webp",
    "minio-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwf401d9d6/images/MinioGreen/TH12V/CE17.webp",
    "minio-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c6f2d5b/images/MinioGreen/TH12V/CE18.webp",
    "minio-ce2i": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwbdba7ad8/images/MinioGreen/TH12V/CE2I.webp",
    "minio-ce2k": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw05bccef0/images/MinioGreen/TH12V/CE2K.webp",
    "minio-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw699157df/images/MinioGreen/TH12V/CE2Q.webp",
    "minio-den": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw75de8c5b/images/MinioGreen/TH12V/CE11.webp",
    "minio-do": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw699157df/images/MinioGreen/TH12V/CE2Q.webp",
    "minio-red": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw699157df/images/MinioGreen/TH12V/CE2Q.webp",
    "minio-ruby": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw699157df/images/MinioGreen/TH12V/CE2Q.webp",
    "minio-silver": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwf401d9d6/images/MinioGreen/TH12V/CE17.webp",
    "minio-trang": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c6f2d5b/images/MinioGreen/TH12V/CE18.webp",
    "minio-white": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw0c6f2d5b/images/MinioGreen/TH12V/CE18.webp",
};

// Maps significant parts of the exterior color string to a simplified key for filenames.
// This is now the single source of truth for color-to-image mapping.
const colorNameToImageKeyMap: Record<string, string> = {
    "red": "red",
    "white": "white",
    "blanc": "white",
    "grey": "grey",
    "gray": "grey",
    "black": "black",
    "blue": "blue",
    "orange": "orange",
    "orb": "orange",
    "green": "green",
    "mint": "green",
    "pink": "pink",
    "berry": "pink",
    "yellow": "yellow",
    "zenith": "zenith",
    "deep ocean": "deepocean",
    "sky blue": "182g",
    "182g": "182g",
};

/**
 * Returns the ideal image path for a specific car model and color.
 * This function now prioritizes unique color codes found in parentheses.
 * @param model - The car's model name (e.g., "VF 6").
 * @param exteriorColor - The car's full exterior color string (e.g., "Crimson Red (CE1M)").
 * @returns The constructed image path.
 */
export const getCarImage = (model?: string, exteriorColor?: string, version?: string): string => {
    if (!model) return getGlobalDefaultImage();

    const cleanedModel = model.trim().toUpperCase();
    const modelKey = modelNameToImageKeyMap[cleanedModel] || 
                     Object.entries(modelNameToImageKeyMap).find(([k]) => k.toUpperCase() === cleanedModel)?.[1] ||
                     model.toLowerCase().replace(/\s+/g, '');
    const lowerExterior = exteriorColor?.toLowerCase().trim() || '';
    const lowerVersion = version?.toLowerCase().trim() || '';
    const isAllNew = lowerVersion.includes('all new');
    const isEco = lowerVersion.includes('eco');
    const isPlus = lowerVersion.includes('plus');

    // 1. Extract color code inside parentheses, e.g., "White (CE18)"
    const codeMatch = lowerExterior.match(/\(([^)]+)\)/);
    let colorCodeKey = '';
    if (codeMatch && codeMatch[1]) {
        colorCodeKey = codeMatch[1].trim().toLowerCase();
    } else {
        const knownCodes = [
            'ce18', 'ce1u', 'ce1w', 'ce2q', 'ce11', 'ce17', 'ce2k', 'ce2i', 'ce1v', 'ce31', 'ce2t', 'ce2g', 'ce21',
            '181y', '181u', '1821', '111u', 'ce1m', 'ce22', '171v', '1v18', 'ce2n', 'ce2j', 'ce33', '112q', '1132',
            '1833', '312o', '3111', '1832', 'ce32', 'ce2o', '1u11', '1117', '182k', '1p2k', '182i', '1u2i', '182q', '2927', '2911'
        ];
        for (const code of knownCodes) {
            if (lowerExterior.includes(code)) {
                colorCodeKey = code;
                break;
            }
        }
    }

    if (colorCodeKey) {
        let cdnLink = null;
        if (isAllNew) {
            cdnLink = vinfastCdnImages[`${modelKey}-allnew-${colorCodeKey}`];
        } else if (isEco) {
            cdnLink = vinfastCdnImages[`${modelKey}-eco-${colorCodeKey}`];
        } else if (isPlus) {
            cdnLink = vinfastCdnImages[`${modelKey}-plus-${colorCodeKey}`];
        }
        
        if (!cdnLink) {
            cdnLink = vinfastCdnImages[`${modelKey}-${colorCodeKey}`];
        }
        // Quy tắc: Mã màu 182G lấy ảnh xe của mã màu 181Y
        if (!cdnLink && colorCodeKey === '182g') {
            cdnLink = vinfastCdnImages[`${modelKey}-181y`];
        }
        if (cdnLink) {
            return cdnLink;
        }
    }

    // 2. Keyword-based lookup fallback
    let colorKey = '';
    const sortedColorKeys = Object.keys(colorNameToImageKeyMap).sort((a, b) => b.length - a.length);
    for (const key of sortedColorKeys) {
        if (lowerExterior.includes(key)) {
            colorKey = colorNameToImageKeyMap[key];
            break;
        }
    }

    if (colorKey && vinfastCdnImages[`${modelKey}-${colorKey}`]) {
        return vinfastCdnImages[`${modelKey}-${colorKey}`];
    }

    // 3. Local pictures fallback / VF2 fallback
    if (modelKey === 'vf2') {
        return "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-infinity-blanc-car.webp";
    }

    // 4. Supabase fallback
    const supabaseStorageUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://jwvgxqrkjlbewvpkvucj.supabase.co'}/storage/v1/object/public/car-images/`;
    if (colorCodeKey) {
        return `${supabaseStorageUrl}${modelKey}-${colorCodeKey}.webp`;
    }
    if (colorKey) {
        return `${supabaseStorageUrl}${modelKey}-${colorKey}.webp`;
    }

    return getModelDefaultImage(model);
};


/**
 * Returns the path to the default image for a given car model.
 * @param model - The car's model name.
 * @returns The path to the model's default image (e.g., "pictures/vf6-default.webp").
 */
export const getModelDefaultImage = (model?: string): string => {
    const supabaseStorageUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://jwvgxqrkjlbewvpkvucj.supabase.co'}/storage/v1/object/public/car-images/`;
    const cleanedModel = model ? model.trim().toUpperCase() : 'DEFAULT';
    const modelKey = modelNameToImageKeyMap[cleanedModel] || 
                     Object.entries(modelNameToImageKeyMap).find(([k]) => k.toUpperCase() === cleanedModel)?.[1] ||
                     cleanedModel.toLowerCase().replace(/\s+/g, '');

    if (modelKey === 'vf2') {
        return "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-infinity-blanc-car.webp";
    }

    if (modelKey === 'vfwild') {
        return "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw1fadad37/images/VFWILD/HJ01V/CE31.png";
    }

    // Fallback to one of the CDN links if we have any for this model
    const anyModelCdnLink = Object.entries(vinfastCdnImages).find(([k]) => k.startsWith(`${modelKey}-`))?.[1];
    if (anyModelCdnLink) {
        return anyModelCdnLink;
    }

    return `${supabaseStorageUrl}${modelKey}-default.webp`;
};

/**
 * Returns the path to the global fallback image.
 * @returns The path to the global default image.
 */
export const getGlobalDefaultImage = (): string => {
    const supabaseStorageUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://jwvgxqrkjlbewvpkvucj.supabase.co'}/storage/v1/object/public/car-images/`;
    return `${supabaseStorageUrl}default.webp`;
};


const avatarColors = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
];

export const generateColorFromName = (name: string): string => {
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash % avatarColors.length);
    return avatarColors[index];
};

// Hook for random modal background
export const useModalBackground = () => {
    return {} as React.CSSProperties;
};

// Maps significant parts of the car model string to official brochure download URLs.
const brochureUrls: Record<string, string> = {
    "VF2": "https://static-cms-prod.vinfastauto.com/brochure_vf_2.pdf",
    "VF3": "https://storage.googleapis.com/vinfast-data-01/brochure/VF%203_Brochure_Final_280126%20(18PM).pdf",
    "VF5": "https://storage.googleapis.com/vinfast-data-01/brochure/VF%205_Brochure_Final_290126%20(13PM).pdf",
    "VF6": "https://storage.googleapis.com/vinfast-data-01/brochure/VF%206_Brochure_Final_090226%20(10AM).pdf",
    "VF7": "https://storage.googleapis.com/vinfast-data-01/brochure/14012026/VF7_BROCHURE%20100125.pdf",
    "VF8": "https://storage.googleapis.com/vinfast-data-01/brochure/VF8_Brochure_03022026.pdf",
    "VF9": "https://storage.googleapis.com/vinfast-data-01/brochure/VF%209_%20Brochure.pdf",
    "ECVAN": "https://storage.googleapis.com/vinfast-data-01/brochure/10012026/Brochure%20EC%20Van%20090126.pdf",
    "VFMPV7": "https://storage.googleapis.com/vinfast-data-01/brochure/VF_MPV%207_Brochure_2026.02.03.pdf",
    "VFLIMO": "https://storage.googleapis.com/vinfast-data-01/brochure/VF_MPV%207_Brochure_2026.02.03.pdf",
    "MINIOGREEN": "https://storage.googleapis.com/vinfast-data-01/brochure/10012026/Brochure%20Minio%20Green%20090126.pdf",
    "MINIO": "https://storage.googleapis.com/vinfast-data-01/brochure/10012026/Brochure%20Minio%20Green%20090126.pdf",
    "HERIOGREEN": "https://storage.googleapis.com/vinfast-data-01/brochure/10012026/Brochure%20Minio%20Green%20090126.pdf",
    "HERIO": "https://storage.googleapis.com/vinfast-data-01/brochure/10012026/Brochure%20Minio%20Green%20090126.pdf",
    "LIMOGREEN": "https://storage.googleapis.com/vinfast-data-01/brochure/Brochure%20Limo%20050126.pdf",
    "LIMO": "https://storage.googleapis.com/vinfast-data-01/brochure/Brochure%20Limo%20050126.pdf",
};

export const getBrochureUrl = (model?: string): string | null => {
    if (!model) return null;
    const cleanModel = model.toUpperCase().replace(/\s+/g, '');
    return brochureUrls[cleanModel] || 
           Object.entries(brochureUrls).find(([k]) => cleanModel.includes(k))?.[1] || null;
};
