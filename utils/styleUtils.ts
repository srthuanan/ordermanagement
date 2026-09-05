import React from 'react';


// Centralized helper function to apply dynamic styles based on exterior color text.
export const getExteriorColorStyle = (exteriorValue: string | undefined): React.CSSProperties => {
    if (!exteriorValue) return {};
    const lower = exteriorValue.toLowerCase().trim();

    // 1. Extract color code from parentheses if available (e.g. "CE17", "CE21", "CE1U", "CE18")
    const codeMatch = lower.match(/\(([^)]+)\)/);
    const code = codeMatch ? codeMatch[1].trim().toLowerCase() : '';

    // Check by color code first
    if (code === 'ce18' || lower.includes('ce18') || lower.includes('white') || lower.includes('trắng') || lower.includes('blanc')) return { color: '#334155' }; // Dark Slate / Charcoal for crisp readability on light backgrounds
    if (code === 'ce1u' || code === '111u' || code === '181u' || lower.includes('ce1u') || lower.includes('111u') || lower.includes('181u')) return { color: '#D97706' }; // Rich Amber Yellow
    if (code === 'ce1a' || lower.includes('ce1a')) return { color: '#EA580C' }; // Sunset ORB Orange
    if (code === 'ce1m' || code === '111m' || lower.includes('ce1m') || lower.includes('111m')) return { color: '#DC2626' }; // Crimson Red
    if (code === 'ce1n' || code === 'ce1j' || code === 'ce2j' || code === '1y26' || code === '182g' || code === '2a26' || code === 'ce33' || lower.includes('ce1n') || lower.includes('ce1j') || lower.includes('ce2j') || lower.includes('ce33')) return { color: '#2563EB' }; // VinFast Blue
    if (code === 'ce17' || lower.includes('ce17')) return { color: '#64748B' }; // Silver / Slate
    if (code === 'ce14' || code === 'ce1v' || code === '171v' || code === '1v18' || code === '2811' || lower.includes('ce14') || lower.includes('ce1v') || lower.includes('171v')) return { color: '#475569' }; // Neptune Grey / Zenith Grey
    if (code === 'ce11' || code === '3111' || lower.includes('ce11')) return { color: '#0F172A' }; // Jet Black
    if (code === 'ce1w' || code === 'ce2b' || code === 'ce1h' || code === 'ce22' || code === 'ce21' || code === '171w' || code === '1722' || lower.includes('ce21') || lower.includes('ce1w') || lower.includes('ce2b') || lower.includes('ce1h') || lower.includes('ce22')) return { color: '#059669' }; // Emerald Green / Criterio Green
    if (code === 'ce1x' || code === 'ce2k' || code === '1821' || code === '181x' || lower.includes('ce2k') || lower.includes('ce1x')) return { color: '#DB2777' }; // Pink Gold / Iris Berry
    if (code === 'ce2q' || code === '112q' || code === '182q' || lower.includes('ce2q') || lower.includes('112q')) return { color: '#DC2626' }; // Solar Ruby
    if (code === 'ce23' || code === '2523' || code === '1823' || lower.includes('ce23')) return { color: '#D97706' }; // Champagne Creme
    if (code === 'ce2n' || code === '2927' || lower.includes('ce2n')) return { color: '#92400E' }; // Introspective Brown / Mystery Bronze
    if (code === 'ce32' || code === '1132' || code === '1832' || lower.includes('ce32')) return { color: '#EA580C' }; // Vitality Orange
    if (code === 'ce2o' || code === '312o' || lower.includes('ce2o')) return { color: '#9333EA' }; // Mysterioso Purple

    // 2. Keyword fallback
    if (lower.includes('criterio') || lower.includes('green') || lower.includes('mint') || lower.includes('ivy') || lower.includes('xanh lá') || lower.includes('ocean')) return { color: '#059669' };
    if (lower.includes('silver') || lower.includes('bạc') || lower.includes('desat')) return { color: '#64748B' };
    if (lower.includes('yellow') || lower.includes('vàng') || lower.includes('creme') || lower.includes('champagne')) return { color: '#D97706' };
    if (lower.includes('pink') || lower.includes('rose') || lower.includes('berry') || lower.includes('hồng')) return { color: '#DB2777' };
    if (lower.includes('ruby') || lower.includes('crimson') || lower.includes('red') || lower.includes('đỏ')) return { color: '#DC2626' };
    if (lower.includes('blue') || lower.includes('azure') || lower.includes('xanh dương') || lower.includes('xanh lam')) return { color: '#2563EB' };
    if (lower.includes('black') || lower.includes('đen')) return { color: '#0F172A' };
    if (lower.includes('grey') || lower.includes('gray') || lower.includes('xám') || lower.includes('graphite') || lower.includes('neptune') || lower.includes('zenith') || lower.includes('stealth')) return { color: '#475569' };
    if (lower.includes('orange') || lower.includes('cam') || lower.includes('sunset') || lower.includes('orb') || lower.includes('vitality')) return { color: '#EA580C' };
    if (lower.includes('purple') || lower.includes('tím') || lower.includes('mysterioso')) return { color: '#9333EA' };
    if (lower.includes('brown') || lower.includes('bronze') || lower.includes('nâu')) return { color: '#92400E' };
    if (lower.includes('gold')) return { color: '#D97706' };

    return {};
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

    if (code === 'ce18' || lower.includes('ce18') || lower.includes('white') || lower.includes('trắng') || lower.includes('blanc')) return { backgroundColor: '#FFFFFF' };
    if (code === 'ce1u' || code === '111u' || code === '181u' || lower.includes('ce1u') || lower.includes('111u') || lower.includes('181u') || lower.includes('yellow') || lower.includes('vàng')) return { backgroundColor: '#EAB308' };
    if (code === 'ce1a' || lower.includes('ce1a') || lower.includes('sunset') || lower.includes('orange') || lower.includes('cam')) return { backgroundColor: '#F97316' };
    if (code === 'ce1m' || code === '111m' || lower.includes('ce1m') || lower.includes('111m') || lower.includes('red') || lower.includes('crimson') || lower.includes('đỏ')) return { backgroundColor: '#EF4444' };
    if (code === 'ce1n' || code === 'ce1j' || code === 'ce2j' || code === '1y26' || code === '182g' || code === '2a26' || code === 'ce33' || lower.includes('blue') || lower.includes('xanh dương')) return { backgroundColor: '#2563EB' };
    if (code === 'ce17' || lower.includes('ce17') || lower.includes('silver') || lower.includes('bạc')) return { backgroundColor: '#CBD5E1' };
    if (code === 'ce14' || code === 'ce1v' || lower.includes('ce14') || lower.includes('ce1v') || lower.includes('grey') || lower.includes('gray') || lower.includes('xám')) return { backgroundColor: '#64748B' };
    if (code === 'ce11' || code === '3111' || lower.includes('ce11') || lower.includes('black') || lower.includes('đen')) return { backgroundColor: '#0F172A' };
    if (code === 'ce1w' || code === 'ce2b' || code === 'ce1h' || code === 'ce22' || code === 'ce21' || lower.includes('ce21') || lower.includes('green') || lower.includes('mint') || lower.includes('criterio') || lower.includes('xanh lá') || lower.includes('ocean')) return { backgroundColor: '#10B981' };
    if (code === 'ce1x' || code === 'ce2k' || lower.includes('ce2k') || lower.includes('pink') || lower.includes('rose') || lower.includes('berry') || lower.includes('hồng')) return { backgroundColor: '#EC4899' };
    if (code === 'ce2q' || code === '112q' || lower.includes('ce2q') || lower.includes('ruby')) return { backgroundColor: '#DC2626' };
    if (code === 'ce23' || lower.includes('ce23') || lower.includes('creme') || lower.includes('champagne')) return { backgroundColor: '#F59E0B' };
    if (code === 'ce2n' || lower.includes('ce2n') || lower.includes('brown') || lower.includes('nâu') || lower.includes('bronze')) return { backgroundColor: '#92400E' };

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
    "EC Van": "ecvan",
    "HERIO": "herio",
    "LIMO": "limo",
    "MINIO": "minio",
    "VF LIMO": "vflimo",
    "ECVAN": "ecvan",
};

// VinFast CDN Images Lookup Map
const vinfastCdnImages: Record<string, string> = {
    // VF2 Official Images
    "vf2-ce18": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-infinity-blanc-car.webp",
    "vf2-ce17": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-desat-silver-car.webp",
    "vf2-ce2q": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-solar-ruby-car.webp",
    "vf2-ce1w": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-urbant-mint-car.webp",
    "vf2-ce1u": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-summer-yellow-car.webp",
    "vf2-ce21": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-rose-pink-car.webp",
    "vf2-ce2g": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-sky-blue-car.webp",
    "vf2-ce2t": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-pebble-beige-car.webp",
    "vf2-182g": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-sky-blue-car.webp",
    "vf2-1821": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-rose-pink-car.webp",
    "vf2-white": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-infinity-blanc-car.webp",
    "vf2-silver": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-desat-silver-car.webp",
    "vf2-red": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-solar-ruby-car.webp",
    "vf2-ruby": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-solar-ruby-car.webp",
    "vf2-mint": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-urbant-mint-car.webp",
    "vf2-green": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-urbant-mint-car.webp",
    "vf2-yellow": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-summer-yellow-car.webp",
    "vf2-pink": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-rose-pink-car.webp",
    "vf2-rose": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-rose-pink-car.webp",
    "vf2-blue": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-sky-blue-car.webp",
    "vf2-beige": "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-pebble-beige-car.webp",
    // VF8
    "vf8-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18.png",
    "vf8-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-2.png",
    "vf8-ce1m": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1M-1.png",
    "vf8-ce22": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE22-2.png",
    "vf8-171v": "https://vinfasto2o.com/wp-content/uploads/2026/05/171V.png",
    "vf8-1v18": "https://vinfasto2o.com/wp-content/uploads/2026/05/1V18.png",
    "vf8-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1M-1.png",
    "vf8-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/171V.png",
    "vf8-ce14": "https://vinfasto2o.com/wp-content/uploads/2026/05/171V.png",

    // VF8 All New (Đồng bộ chuẩn bộ ảnh All New từ phần Yêu cầu đơn hàng / tinh-gia-xe)
    "vf8-allnew-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-2.webp",
    "vf8-allnew-ce33": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE33.webp",
    "vf8-allnew-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q.webp",
    "vf8-allnew-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11.webp",
    "vf8-allnew-112q": "https://vinfasto2o.com/wp-content/uploads/2026/05/112Q.webp",
    "vf8-allnew-1132": "https://vinfasto2o.com/wp-content/uploads/2026/05/1132.webp",
    "vf8-allnew-1833": "https://vinfasto2o.com/wp-content/uploads/2026/05/1833.webp",
    "vf8-allnew-312o": "https://vinfasto2o.com/wp-content/uploads/2026/05/312O.webp",
    "vf8-allnew-3111": "https://vinfasto2o.com/wp-content/uploads/2026/05/3111.webp",
    "vf8-allnew-1832": "https://vinfasto2o.com/wp-content/uploads/2026/05/1832.webp",
    "vf8-allnew-ce32": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE32.webp",
    "vf8-allnew-ce2o": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2O.webp",

    // VF8 Plus
    "vf8-plus-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18.png",
    "vf8-plus-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-2.png",
    "vf8-plus-ce1m": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1M-1.png",
    "vf8-plus-ce22": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE22-2.png",
    "vf8-plus-171v": "https://vinfasto2o.com/wp-content/uploads/2026/05/171V.png",
    "vf8-plus-1v18": "https://vinfasto2o.com/wp-content/uploads/2026/05/1V18.png",

    // VF8 Eco
    "vf8-eco-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-5.png",
    "vf8-eco-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-11.png",
    "vf8-eco-ce1m": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1M-3.png",
    "vf8-eco-ce22": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE22-1.png",
    "vf8-eco-171v": "https://vinfasto2o.com/wp-content/uploads/2026/05/171V-1.png",
    "vf8-eco-1v18": "https://vinfasto2o.com/wp-content/uploads/2026/05/1V18-1.png",


    // LIMO
    "limo-ce17": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE17-5.png",
    "limo-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-7.png",
    "limo-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-8.png",
    "limo-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-8.png",

    // HERIO
    "herio-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-4.png",
    "herio-ce17": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE17-2-1.png",
    "herio-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-9.png",
    "herio-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-4.png",

    // MINIO
    "minio-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-12.png",
    "minio-ce17": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE17-6.png",
    "minio-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-15.png",
    "minio-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-10.png",
    "minio-1u11": "https://vinfasto2o.com/wp-content/uploads/2026/05/1U11.png",
    "minio-1117": "https://vinfasto2o.com/wp-content/uploads/2026/05/1117.png",
    "minio-181u": "https://vinfasto2o.com/wp-content/uploads/2026/05/181U.png",
    "minio-ce2i": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2I.png",
    "minio-ce2k": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2K.png",
    "minio-182k": "https://vinfasto2o.com/wp-content/uploads/2026/05/182K.png",
    "minio-1p2k": "https://vinfasto2o.com/wp-content/uploads/2026/05/1P2K.png",
    "minio-182i": "https://vinfasto2o.com/wp-content/uploads/2026/05/182I.png",
    "minio-1u2i": "https://vinfasto2o.com/wp-content/uploads/2026/05/1U2I.png",
    "minio-182q": "https://vinfasto2o.com/wp-content/uploads/2026/05/182Q.png",

    // EC VAN
    "ecvan-ce1w": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1W-9.png",
    "ecvan-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-9.png",
    "ecvan-ce1u": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1U-1.png",
    "ecvan-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-14.png",

    // MPV7 / VFLIMO
    "vfmpv7-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18.webp",
    "vflimo-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18.webp",
    "vfmpv7-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-1-1.webp",
    "vflimo-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-1-1.webp",
    "vfmpv7-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V.webp",
    "vflimo-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V.webp",
    "vfmpv7-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-1.webp",
    "vflimo-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-1.webp",
    "vfmpv7-ce2j": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2J-1.webp",
    "vflimo-ce2j": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2J-1.webp",
    "vfmpv7-ce2n": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2N-1.webp",
    "vflimo-ce2n": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2N-1.webp",

    // VF9
    "vf9-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-2.png",
    "vf9-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-6.png",
    "vf9-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V-2.png",
    "vf9-ce1m": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1M-5.png",
    "vf9-ce1w": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1W-3.png",
    "vf9-ce22": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE22-1-1.png",
    "vf9-ce17": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE17-2.png",

    // VF7
    "vf7-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-3.png",
    "vf7-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-1.png",
    "vf7-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V-1.png",
    "vf7-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-2.png",
    "vf7-ce1w": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1W-1.png",

    // VF6
    "vf6-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-12-scaled.png",
    "vf6-ce11": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE11-8-scaled.png",
    "vf6-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V-7-scaled.png",
    "vf6-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-7-scaled.png",
    "vf6-ce1w": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1W-8-scaled.png",

    // VF5
    "vf5-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-11.png",
    "vf5-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V-6.png",
    "vf5-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-6.png",
    "vf5-111u": "https://vinfasto2o.com/wp-content/uploads/2026/05/111U.png",
    "vf5-181y": "https://vinfasto2o.com/wp-content/uploads/2026/05/181Y-1.png",
    "vf5-ce1w": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1W-7.png",

    // VF3
    "vf3-ce18": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE18-10.png",
    "vf3-ce1v": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1V-5.png",
    "vf3-ce2q": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE2Q-5.png",
    "vf3-181u": "https://vinfasto2o.com/wp-content/uploads/2026/05/181U-1.png",
    "vf3-181y": "https://vinfasto2o.com/wp-content/uploads/2026/05/181Y.png",
    "vf3-1821": "https://vinfasto2o.com/wp-content/uploads/2026/05/1821.png",
    "vf3-ce1w": "https://vinfasto2o.com/wp-content/uploads/2026/05/CE1W-6.png",
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

    // 1. Extract color code inside parentheses, e.g., "Infinity Blanc (CE18)"
    const codeMatch = lowerExterior.match(/\(([^)]+)\)/);
    let colorCodeKey = '';
    if (codeMatch && codeMatch[1]) {
        colorCodeKey = codeMatch[1].trim().toLowerCase();
    } else {
        const knownCodes = ['ce18', 'ce1u', 'ce1w', 'ce2q', 'ce11', 'ce17', 'ce2k', 'ce2i', 'ce1v', '181y', '181u', '1821', '111u', 'ce1m', 'ce22', '171v', '1v18', 'ce2n', 'ce2j', 'ce33', '112q', '1132', '1833', '312o', '3111', '1832', 'ce32', 'ce2o'];
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
    const supabaseStorageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/car-images/`;
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
    const supabaseStorageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/car-images/`;
    const cleanedModel = model ? model.trim().toUpperCase() : 'DEFAULT';
    const modelKey = modelNameToImageKeyMap[cleanedModel] || 
                     Object.entries(modelNameToImageKeyMap).find(([k]) => k.toUpperCase() === cleanedModel)?.[1] ||
                     cleanedModel.toLowerCase().replace(/\s+/g, '');

    if (modelKey === 'vf2') {
        return "https://vinfastauto.com/themes/porto/img/pdp-page/vf2/vf2-car/vf2-infinity-blanc-car.webp";
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
    const supabaseStorageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/car-images/`;
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
