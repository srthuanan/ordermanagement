import React from 'react';


// Centralized helper function to apply dynamic styles based on exterior color text.
export const getExteriorColorStyle = (exteriorValue: string | undefined): React.CSSProperties => {
    const isDarkMode = false;
    const outlineStyle: React.CSSProperties = {
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
    };

    if (!exteriorValue) return {};
    const lowerExteriorValue = exteriorValue.toLowerCase().trim();

    if (lowerExteriorValue === "brahminy white (ce18)") return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("sunset orb (ce1a)")) return { color: 'var(--exterior-orange-text)' };
    if (lowerExteriorValue.includes("crimson red (ce1m)")) return { color: 'var(--exterior-red-text)' };
    if (lowerExteriorValue.includes("vinfast blue (ce1n)")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("neptune grey (ce14)")) return isDarkMode ? { color: '#aebcc5' } : { color: '#778899' };
    if (lowerExteriorValue.includes("jet black (ce11)")) return isDarkMode ? { color: 'white' } : { color: 'black' };
    if (lowerExteriorValue.includes("electric blue (ce1j)")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("moonlit ocean (ce2j)")) return { color: '#103975' };
    if (lowerExteriorValue.includes("zenith grey (ce1v)")) return isDarkMode ? { color: '#d4e0f2' } : { color: '#B0C4DE' };
    if (lowerExteriorValue.includes("jet black roof- summer yellow body (111u)")) return { color: 'var(--exterior-yellow-text)' };
    if (lowerExteriorValue.includes("brahminy white roof- aquatic azure body (181y)")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("brahminy white roof- rose pink body (1821)")) return { color: 'var(--exterior-pink-text)' };
    if (lowerExteriorValue.includes("brahminy white roof - iris berry body (181x)")) return { color: 'var(--exterior-pink-text)' };
    if (lowerExteriorValue.includes("urbant mint (ce1w)")) return isDarkMode ? { color: '#6ee6a0' } : { color: '#3CB371' };
    if (lowerExteriorValue.includes("vinbus green (ce2b)")) return { color: 'var(--exterior-green-text)' };
    if (lowerExteriorValue.includes("deep ocean (ce1h)")) return isDarkMode ? { color: '#2e8b57' } : { color: '#006400' };
    if (lowerExteriorValue.includes("iris berry (ce1x)")) return { color: 'var(--exterior-pink-text)' };
    if (lowerExteriorValue.includes("zenith grey-desat silver roof (171v)")) return { color: 'var(--exterior-grey-text)' };
    if (lowerExteriorValue.includes("urbant mint green - desat silv (171w)")) return { color: 'var(--exterior-green-text)' };
    if (lowerExteriorValue.includes("ivy green-desat silver roof (1722)")) return { color: 'var(--exterior-green-text)' };
    if (lowerExteriorValue.includes("atlantic blue-aquatic azure ro (1y26)")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("jet black-champagne creme roof (2311)")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("infinity blanc _ silky white r (2418)")) return { color: 'var(--exterior-white-text)' };
    if (lowerExteriorValue.includes("champagne creme - matte champa (2523)")) return { color: 'var(--exterior-yellow-text)' };
    if (lowerExteriorValue.includes("jet black - graphite roof (2811)")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("crimson velvet - mystery bronz (2927)")) return { color: 'var(--exterior-red-text)' };
    if (lowerExteriorValue.includes("ivy_green_gne (ce22)")) return { color: 'var(--exterior-green-text)' };
    if (lowerExteriorValue.includes("champagne_creme_ylg (ce23)")) return { color: 'var(--exterior-yellow-text)' };
    if (lowerExteriorValue.includes("crimson red - jet black roof (111m)")) return { color: 'var(--exterior-red-text)' };
    if (lowerExteriorValue.includes("infinity blanc_zenith grey roof (1v18)")) return { color: 'var(--exterior-white-text)' };
    if (lowerExteriorValue.includes("deep ocean_jet black roof (111h)")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("alantic blue_denim blue roof (2a26)")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("jet black_mystery bronze roof (2911)")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("champagne creme_infinity blanc roof (1823)")) return { color: 'var(--exterior-yellow-text)' };
    if (lowerExteriorValue.includes("infinity blanc roof-sky blue (182g)")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("de sat silver ind12007 (ce17)")) return { color: 'var(--exterior-grey-text)' };
    if (lowerExteriorValue.includes("crimson red") || lowerExteriorValue.includes("crimson velvet") || lowerExteriorValue.includes("ruby")) return { color: 'var(--exterior-red-text)' };
    if (lowerExteriorValue.includes("rose pink") || lowerExteriorValue.includes("iris berry")) return { color: 'var(--exterior-pink-text)' };
    if (lowerExteriorValue.includes("vinfast blue") || lowerExteriorValue.includes("electric blue") || lowerExteriorValue.includes("atlantic blue") || lowerExteriorValue.includes("aquatic azure") || lowerExteriorValue.includes("alantic blue") || lowerExteriorValue.includes("moonlit ocean") || lowerExteriorValue.includes("sky blue")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("deep ocean")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("sunset orb")) return { color: 'var(--exterior-orange-text)' };
    if (lowerExteriorValue.includes("summer yellow") || lowerExteriorValue.includes("champagne creme") || lowerExteriorValue.includes("champagne_creme_ylg")) return { color: 'var(--exterior-yellow-text)' };
    if (lowerExteriorValue.includes("urbant mint") || lowerExteriorValue.includes("vinbus green") || lowerExteriorValue.includes("ivy green") || lowerExteriorValue.includes("ivy_green_gne")) return { color: 'var(--exterior-green-text)' };
    if (lowerExteriorValue.includes("jet black")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("brahminy white") || lowerExteriorValue.includes("infinity blanc")) return { color: 'var(--exterior-white-text)' };
    if (lowerExteriorValue.includes("neptune grey") || lowerExteriorValue.includes("zenith grey") || lowerExteriorValue.includes("de sat silver") || lowerExteriorValue.includes("graphite")) return { color: 'var(--exterior-grey-text)' };
    if (lowerExteriorValue.includes("mystery bronz")) return { color: 'var(--exterior-bronze-text)' };
    if (lowerExteriorValue.includes("pink gold (ce2k)")) return { color: 'var(--exterior-pink-text)' };
    if (lowerExteriorValue.includes("solar ruby (ce2q)")) return { color: 'var(--exterior-red-text)' };

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

const colorMap: { [key: string]: string } = {
    // Exterior
    'white': '#F8F8F8', 'blanc': '#F5F5DC',
    'sunset orb': '#F97316', 'orange': '#F97316',
    'red': '#EF4444', 'crimson': '#DC143C',
    'blue': '#3B82F6', 'azure': '#007FFF', 'sky blue': '#87CEEB',
    'grey': '#778899', 'gray': '#778899', 'silver': '#A9A9A9', 'graphite': '#36454F',
    'black': '#1E1E1E',
    'yellow': '#EAB308', 'creme': '#F5DEB3',
    'pink': '#EC4899', 'berry': '#EC4899',
    'mint': '#3CB371', 'green': '#22C55E', 'ocean': '#006400', 'moonlit ocean': '#103975',
    'bronze': '#92400E',
    // Interior
    'beige': '#F5F5DC',
    'introspective brown': '#634030',
    'brown': '#A52A2A',
};

export const getBackgroundColorStyle = (colorName: string | undefined): React.CSSProperties => {
    if (!colorName) return {};
    const lowerColor = colorName.toLowerCase();

    // Find a matching key in our map
    const matchedKey = Object.keys(colorMap).find(key => lowerColor.includes(key));

    if (matchedKey) {
        const hex = colorMap[matchedKey];
        const style: React.CSSProperties = { backgroundColor: hex };
        // Add a border for very light or dark colors to ensure visibility on similar backgrounds
        if (hex === '#F8F8F8' || hex === '#1E1E1E' || hex === '#F5F5DC') {
            // FIX: Cast style to 'any' to add the 'border' property, bypassing a strict or incomplete
            // CSSProperties type definition in the project's environment.
            (style as any).border = '1px solid #CBD5E1';
        }
        return style;
    }

    return { backgroundColor: '#E2E8F0' }; // fallback color
};

// --- NEW DATA-DRIVEN IMAGE LOGIC ---

// Maps the official model name from the sheet to a simplified key for filenames.
const modelNameToImageKeyMap: Record<string, string> = {
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
    // VF8 All New
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
        const knownCodes = ['ce18', 'ce1u', 'ce1w', 'ce2q', 'ce11', 'ce17', 'ce2k', 'ce2i', 'ce1v', '181y', '181u', '1821', '111u', 'ce1m', 'ce22', '171v', '1v18', 'ce2n', 'ce2j'];
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

    // 3. Supabase fallback
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
