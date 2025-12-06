export const normalizeString = (str: string | undefined | null): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .trim();
};

export const includesNormalized = (source: string | undefined | null, keyword: string): boolean => {
    if (!keyword) return true;
    if (!source) return false;

    const normalizedKeyword = normalizeString(keyword);
    const lowerKeyword = keyword.toLowerCase();

    // Check if keyword has accents (or special chars like 'đ') by comparing lower vs normalized
    // If they differ, it means the user typed specific accents/chars
    const hasAccents = lowerKeyword !== normalizedKeyword;

    if (hasAccents) {
        // Strict match: Source must contain the exact accented keyword
        // Normalize both to NFC to ensure consistent unicode composition (e.g. composed vs decomposed characters)
        return source.normalize('NFC').toLowerCase().includes(lowerKeyword.normalize('NFC'));
    } else {
        // Fuzzy match: Source (normalized) must contain the keyword (normalized)
        return normalizeString(source).includes(normalizedKeyword);
    }
};
