import React from 'react';

// Centralized helper function to apply dynamic styles based on exterior color text.
export const getExteriorColorStyle = (exteriorValue: string | undefined): React.CSSProperties => {
    const isDarkMode = false;
    const specificFontWeight = 500;
    const outlineStyle: React.CSSProperties = {
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
    };

    if (!exteriorValue) return {};
    const lowerExteriorValue = exteriorValue.toLowerCase().trim();

    if (lowerExteriorValue === "brahminy white (ce18)") return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("sunset orb (ce1a)")) return { color: 'var(--exterior-orange-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red (ce1m)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinfast blue (ce1n)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("neptune grey (ce14)")) return isDarkMode ? { color: '#aebcc5', fontWeight: specificFontWeight } : { color: '#778899', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black (ce11)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'black', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("electric blue (ce1j)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("zenith grey (ce1v)")) return isDarkMode ? { color: '#d4e0f2', fontWeight: specificFontWeight } : { color: '#B0C4DE', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black roof- summer yellow body (111u)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof- aquatic azure body (181y)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof- rose pink body (1821)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof - iris berry body (181x)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint (ce1w)")) return isDarkMode ? { color: '#6ee6a0', fontWeight: specificFontWeight } : { color: '#3CB371', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinbus green (ce2b)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean (ce1h)")) return isDarkMode ? { color: '#2e8b57', fontWeight: specificFontWeight } : { color: '#006400', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("iris berry (ce1x)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("zenith grey-desat silver roof (171v)")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint green - desat silv (171w)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("ivy green-desat silver roof (1722)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("atlantic blue-aquatic azure ro (1y26)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black-champagne creme roof (2311)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("infinity blanc _ silky white r (2418)")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne creme - matte champa (2523)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black - graphite roof (2811)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson velvet - mystery bronz (2927)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("ivy_green_gne (ce22)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne_creme_ylg (ce23)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red - jet black roof (111m)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("infinity blanc_zenith grey roof (1v18)")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean_jet black roof (111h)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("alantic blue_denim blue roof (2a26)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black_mystery bronze roof (2911)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne creme_infinity blanc roof (1823)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("de sat silver ind12007 (ce17)")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red") || lowerExteriorValue.includes("crimson velvet")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("rose pink") || lowerExteriorValue.includes("iris berry")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinfast blue") || lowerExteriorValue.includes("electric blue") || lowerExteriorValue.includes("atlantic blue") || lowerExteriorValue.includes("aquatic azure") || lowerExteriorValue.includes("alantic blue")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("sunset orb")) return { color: 'var(--exterior-orange-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("summer yellow") || lowerExteriorValue.includes("champagne creme") || lowerExteriorValue.includes("champagne_creme_ylg")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint") || lowerExteriorValue.includes("vinbus green") || lowerExteriorValue.includes("ivy green") || lowerExteriorValue.includes("ivy_green_gne")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white") || lowerExteriorValue.includes("infinity blanc")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("neptune grey") || lowerExteriorValue.includes("zenith grey") || lowerExteriorValue.includes("de sat silver") || lowerExteriorValue.includes("graphite")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("mystery bronz")) return { color: 'var(--exterior-bronze-text)', fontWeight: specificFontWeight };

    return {};
};
