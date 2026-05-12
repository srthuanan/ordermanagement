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
    // EC Van
    "ecvan-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwddcf5d86/images/ECVAN/TG12V/CE18.png",
    "ecvan-ce1u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw269064cd/images/ECVAN/TG12V/CE1U.png",
    "ecvan-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwaf408f05/images/ECVAN/TG12V/CE1W.png",
    "ecvan-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwa4f41267/images/ECVAN/TG12V/CE2Q.png",
    // Herio
    "herio-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw7e0d8431/images/HerioGreen/GA1QV/CE18.webp",
    "herio-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw315a6865/images/HerioGreen/GA1QV/CE11.png",
    "herio-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwe6b7b6fe/images/HerioGreen/GA1QV/CE17.png",
    "herio-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw0efc30f8/images/HerioGreen/GA1QV/CE2Q.png",
    // Limo
    "limo-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw03f37450/images/LimoGreen/SL1VV/CE18.webp",
    "limo-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwd414e9c8/images/LimoGreen/SL1VV/CE17.png",
    "limo-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwac981cbc/images/LimoGreen/SL1VV/CE11.png",
    "limo-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwdccfd85f/images/LimoGreen/SL1VV/CE2Q.png",
    // Minio
    "minio-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwf5c66334/images/MinioGreen/TH12V/CE18.webp",
    "minio-ce2k": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw4c4df6a3/images/MinioGreen/TH12V/CE2K.png",
    "minio-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwd04ff62a/images/MinioGreen/TH12V/CE17.png",
    "minio-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw378f8fa3/images/MinioGreen/TH12V/CE11.png",
    "minio-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwe6d79257/images/MinioGreen/TH12V/CE2Q.png",
    "minio-ce2i": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw1e0e3a97/images/MinioGreen/TH12V/CE2I.png",
    // VF 3
    "vf3-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw3a19c1c4/images/VF3/TI1CV/CE18.png",
    "vf3-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw4d9f9a2f/images/VF3/TI1CV/CE1V.png",
    "vf3-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw303e0698/images/VF3/TI1CV/CE2Q.png",
    "vf3-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw8f3fc29c/images/VF3/TI1CV/CE1W.png",
    "vf3-181y": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw3ead61ed/images/VF3/TI1CV/181Y.png",
    "vf3-181u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwa42e2716/images/VF3/TI1CV/181U.png",
    "vf3-1821": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwf1a2d6d0/images/VF3/TI1CV/1821.png",
    // VF 5
    "vf5-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwa56f6ef3/images/VF5/GA12V/CE18.png",
    "vf5-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw99cec5c0/images/VF5/GA12V/CE1V.png",
    "vf5-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwe1fd1d5e/images/VF5/GA12V/CE2Q.png",
    "vf5-111u": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwe77f7665/images/VF5/GA12V/111U.png",
    "vf5-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwc759397a/images/VF5/GA12V/CE1W.png",
    "vf5-181y": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw699981ee/images/VF5/GA12V/181Y.png",
    // VF 6
    "vf6-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwed426ed5/images/VF6/JB12V/CE18.png",
    "vf6-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwb0021530/images/VF6/JB12V/CE2Q.png",
    "vf6-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw08623347/images/VF6/JB12V/CE1V.png",
    "vf6-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw759ca288/images/VF6/JB12V/CE11.png",
    "vf6-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw26f526a3/images/VF6/JB12V/CE1W.png",
    // VF 7
    "vf7-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwdafc2bb7/images/VF7/GC15V/CE18.png",
    "vf7-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw38b16d7a/images/VF7/GC15V/CE1V.png",
    "vf7-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwd5e75327/images/VF7/GC15V/CE2Q.png",
    "vf7-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw7fd70968/images/VF7/GC15V/CE11.webp",
    "vf7-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwe7e3a128/images/VF7/GC15V/CE1W.png",
    // VF 8
    "vf8-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwafc3ac80/images/VF8/ND31V/CE18.webp",
    "vf8-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw19321e63/images/VF8/ND31V/CE11.webp",
    "vf8-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw65f5fd6d/images/VF8/ND31V/CE1M.webp",
    "vf8-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dw5aa8e062/images/VF8/ND31V/CE22.webp",
    "vf8-171v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwa349f493/images/VF8/ND31V/171V.webp",
    "vf8-1v18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-app_vinfast_vn-Library/default/dwf71b68ce/images/VF8/ND31V/1V18.webp",
    // VF 9
    "vf9-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw359f3d29/images/VF9/NE3LV/CE18.png",
    "vf9-ce1m": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw13165e38/images/VF9/NE3LV/CE1M.png",
    "vf9-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwf7b9f784/images/VF9/NE3LV/CE11.png",
    "vf9-ce22": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwa8631ed5/images/VF9/NE3LV/CE22.png",
    "vf9-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw0c7ae75d/images/VF9/NE3LV/CE1V.png",
    "vf9-ce17": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw08e2a618/images/VF9/NE3LV/CE17.png",
    "vf9-ce1w": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwed816812/images/VF9/NE3LV/CE1W.png",
    // VFMPV7 / VFLIMO
    "vfmpv7-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwc07e37d2/images/VFMPV7/SL1WV/CE18.png",
    "vflimo-ce18": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwc07e37d2/images/VFMPV7/SL1WV/CE18.png",
    "vfmpv7-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwaa49bf74/images/VFMPV7/SL1WV/CE1V.png",
    "vflimo-ce1v": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dwaa49bf74/images/VFMPV7/SL1WV/CE1V.png",
    "vfmpv7-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw4455dc5c/images/VFMPV7/SL1WV/CE11.png",
    "vflimo-ce11": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw4455dc5c/images/VFMPV7/SL1WV/CE11.png",
    "vfmpv7-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw0e4bf426/images/VFMPV7/SL1WV/CE2Q.png",
    "vflimo-ce2q": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw0e4bf426/images/VFMPV7/SL1WV/CE2Q.png",
    "vfmpv7-ce2n": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw30cd00e9/images/VFMPV7/SL1WV/CE2N.png",
    "vflimo-ce2n": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw30cd00e9/images/VFMPV7/SL1WV/CE2N.png",
    "vfmpv7-ce2j": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw387ee762/images/VFMPV7/SL1WV/CE2J.png",
    "vflimo-ce2j": "https://shop.vinfastauto.com/on/demandware.static/-/Sites-vinfast_vn_master/default/dw387ee762/images/VFMPV7/SL1WV/CE2J.png",
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
export const getCarImage = (model?: string, exteriorColor?: string): string => {
    if (!model) return getGlobalDefaultImage();

    const cleanedModel = model.trim().toUpperCase();
    const modelKey = modelNameToImageKeyMap[cleanedModel] || 
                     Object.entries(modelNameToImageKeyMap).find(([k]) => k.toUpperCase() === cleanedModel)?.[1] ||
                     model.toLowerCase().replace(/\s+/g, '');
    const lowerExterior = exteriorColor?.toLowerCase().trim() || '';

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
        const cdnLink = vinfastCdnImages[`${modelKey}-${colorCodeKey}`];
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
