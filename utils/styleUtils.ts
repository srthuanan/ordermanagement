import React from 'react';
import modal1 from '../pictures/modal1.png';
import modal2 from '../pictures/modal2.png';
import modal3 from '../pictures/modal3.png';
import modal4 from '../pictures/modal4.png';
import modal5 from '../pictures/modal5.png';

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
    if (lowerExteriorValue.includes("de sat silver ind12007 (ce17)")) return { color: 'var(--exterior-grey-text)' };
    if (lowerExteriorValue.includes("crimson red") || lowerExteriorValue.includes("crimson velvet")) return { color: 'var(--exterior-red-text)' };
    if (lowerExteriorValue.includes("rose pink") || lowerExteriorValue.includes("iris berry")) return { color: 'var(--exterior-pink-text)' };
    if (lowerExteriorValue.includes("vinfast blue") || lowerExteriorValue.includes("electric blue") || lowerExteriorValue.includes("atlantic blue") || lowerExteriorValue.includes("aquatic azure") || lowerExteriorValue.includes("alantic blue")) return { color: 'var(--exterior-blue-text)' };
    if (lowerExteriorValue.includes("deep ocean")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("sunset orb")) return { color: 'var(--exterior-orange-text)' };
    if (lowerExteriorValue.includes("summer yellow") || lowerExteriorValue.includes("champagne creme") || lowerExteriorValue.includes("champagne_creme_ylg")) return { color: 'var(--exterior-yellow-text)' };
    if (lowerExteriorValue.includes("urbant mint") || lowerExteriorValue.includes("vinbus green") || lowerExteriorValue.includes("ivy green") || lowerExteriorValue.includes("ivy_green_gne")) return { color: 'var(--exterior-green-text)' };
    if (lowerExteriorValue.includes("jet black")) return isDarkMode ? { color: 'white' } : { color: 'white', ...outlineStyle };
    if (lowerExteriorValue.includes("brahminy white") || lowerExteriorValue.includes("infinity blanc")) return { color: 'var(--exterior-white-text)' };
    if (lowerExteriorValue.includes("neptune grey") || lowerExteriorValue.includes("zenith grey") || lowerExteriorValue.includes("de sat silver") || lowerExteriorValue.includes("graphite")) return { color: 'var(--exterior-grey-text)' };
    if (lowerExteriorValue.includes("mystery bronz")) return { color: 'var(--exterior-bronze-text)' };

    return {};
};

export const getInteriorColorStyle = (interiorValue: string | undefined): React.CSSProperties => {
    if (!interiorValue) return {};
    const lowerInteriorValue = interiorValue.toLowerCase().trim();

    if (lowerInteriorValue.includes("black")) {
        return { color: '#1F2937' }; // Almost black from theme
    }
    if (lowerInteriorValue.includes("brown")) {
        return { color: '#78350F' }; // amber-800, a rich brown
    }
    if (lowerInteriorValue.includes("beige")) {
        return { color: '#B45309' }; // amber-700, a dark beige for readability
    }

    return {};
};

const colorMap: { [key: string]: string } = {
    // Exterior
    'white': '#F8F8F8', 'blanc': '#F5F5DC',
    'sunset orb': '#F97316', 'orange': '#F97316',
    'red': '#EF4444', 'crimson': '#DC143C',
    'blue': '#3B82F6', 'azure': '#007FFF',
    'grey': '#778899', 'gray': '#778899', 'silver': '#A9A9A9', 'graphite': '#36454F',
    'black': '#1E1E1E',
    'yellow': '#EAB308', 'creme': '#F5DEB3',
    'pink': '#EC4899', 'berry': '#EC4899',
    'mint': '#3CB371', 'green': '#22C55E', 'ocean': '#006400',
    'bronze': '#92400E',
    // Interior
    'beige': '#F5F5DC',
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
};

/**
 * Returns the ideal image path for a specific car model and color.
 * This function now prioritizes unique color codes found in parentheses.
 * @param model - The car's model name (e.g., "VF 6").
 * @param exteriorColor - The car's full exterior color string (e.g., "Crimson Red (CE1M)").
 * @returns The constructed image path (e.g., "pictures/vf6-ce1m.png").
 */
export const getCarImage = (model?: string, exteriorColor?: string): string => {
    const modelKey = model ? (modelNameToImageKeyMap[model] || model.toLowerCase().replace(/\s+/g, '')) : 'default';
    const lowerExterior = exteriorColor?.toLowerCase() || '';

    // 1. Prioritize finding a unique code in parentheses.
    const codeMatch = lowerExterior.match(/\(([^)]+)\)/);
    if (codeMatch && codeMatch[1]) {
        const colorCodeKey = codeMatch[1].trim().toLowerCase();
        if (colorCodeKey) {
            return `pictures/${modelKey}-${colorCodeKey}.png`;
        }
    }
    
    // 2. Fallback to keyword-based mapping if no code is found.
    let colorKey = '';
    const sortedColorKeys = Object.keys(colorNameToImageKeyMap).sort((a, b) => b.length - a.length);
    for (const key of sortedColorKeys) {
        if (lowerExterior.includes(key)) {
            colorKey = colorNameToImageKeyMap[key];
            break;
        }
    }
    
    if (colorKey) {
        return `pictures/${modelKey}-${colorKey}.png`;
    }

    // 3. If no specific color is found by either method, return the model's default image path.
    return getModelDefaultImage(model);
};


/**
 * Returns the path to the default image for a given car model.
 * @param model - The car's model name.
 * @returns The path to the model's default image (e.g., "pictures/vf6-default.png").
 */
export const getModelDefaultImage = (model?: string): string => {
    const modelKey = model ? (modelNameToImageKeyMap[model] || model.toLowerCase().replace(/\s+/g, '')) : 'default';
    return `pictures/${modelKey}-default.png`;
};

/**
 * Returns the path to the global fallback image.
 * @returns The path to the global default image.
 */
export const getGlobalDefaultImage = (): string => {
    return 'pictures/default.png'; // A generic placeholder image
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
    const bg = React.useMemo(() => {
        const images = [modal1, modal2, modal3, modal4, modal5];
        const randomImg = images[Math.floor(Math.random() * images.length)];
        return { '--modal-bg-image': `url(${randomImg})` } as React.CSSProperties;
    }, []);
    return bg;
};
