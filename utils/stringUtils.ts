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

export const WAREHOUSE_SHORT_NAMES: Record<string, string> = {
    // Miền Nam & Trọng điểm
    'K83': 'Thuận An',
    'K87': 'QL13 (HCM)',
    'K86': 'Q12 (HCM)',
    'K85': 'Dĩ An',
    'KHCM.PVD': 'Phạm Văn Đồng',
    'K106': 'Hà Huy Giáp',
    'K58': 'Lê Văn Việt',
    'K60': '3/2 (HCM)',
    'K65': 'Vũng Tàu',
    'K46': 'Hồ Chí Minh',

    // Miền Bắc & Nhà máy
    'KTN.NM': 'Nhà máy SXLR',
    'KTN.TL': 'Tân Long (Thái Nguyên)',
    'KTN.TT': 'Tân Thịnh (Thái Nguyên)',
    'KTN.CK': 'Xưởng cơ khí',
    'K36': 'Thái Nguyên',
    'K17': 'Cam Giá',
    'K18': 'Cầu Gia Bảy',
    'K19': 'Phổ Yên',
    'K91': 'OCP 2',
    'K103': 'Lĩnh Nam',
    'K101': 'Nguyễn Trãi',
    'K55': 'Nguyễn Trãi',
    'K00': 'Tổng công ty',
    'K01': 'Kho DEMO',
    'K111': 'Hải Phòng',
    'K14': 'Hoài Đức',
    'K23': 'Điện Biên',
    'K41': 'Kho đăng kiểm',
    'K43': 'Gia Lai',
    'K45': 'Đà Nẵng',
    'K49': 'Hưng Yên',
    'K57': 'Bắc Ninh',
    'K59': 'Times City',
    'K61': 'Quang Trung',
    'K62': 'Vincom TN',
    'K63': 'Sóc Sơn',
    'K66': 'Đăng kiểm TN',
    'K69': 'Hòa Bình',
    'K74': 'Mê Linh',
    'K75': 'Việt Trì',
    'K76': 'Thái Bình',
    'K77': 'Hạ Long',
    'K82': 'Bắc Giang',
    'K90': 'Xe cũ',
    'KBN.TS': 'Từ Sơn',
    'KHB.SH': 'Shop House Hòa Bình',
    'QL13': 'QL13 (HCM)',
    'Q12': 'Q12 (HCM)',
    'QL13 - HCM': 'QL13 (HCM)',
    'Q12 - HCM': 'Q12 (HCM)',
};

export const formatShortWarehouseName = (name: string | undefined | null): string => {
    if (!name) return '';
    const raw = String(name).trim();
    if (!raw) return '';

    const upper = raw.toUpperCase();
    if (WAREHOUSE_SHORT_NAMES[upper]) {
        return WAREHOUSE_SHORT_NAMES[upper];
    }

    // Nếu chuỗi bắt đầu bằng mã kho (ví dụ: "K83 - ...", "K86 – ...", "K87: ...")
    const codeMatch = raw.match(/^([A-Za-z0-9._-]+)\s*[-:–—]\s*(.*)$/);
    if (codeMatch) {
        const code = codeMatch[1].toUpperCase();
        if (WAREHOUSE_SHORT_NAMES[code]) {
            return WAREHOUSE_SHORT_NAMES[code];
        }
    }

    // Đối chiếu theo từ khóa tên kho TRÊN CHUỖI GỐC TRƯỚC TIÊN (tránh regex xóa mất tiền tố như QL13, Q12)
    const lowerRaw = raw.toLowerCase();
    if (lowerRaw.includes('thuận an') || lowerRaw.includes('thuan an')) return 'Thuận An';
    if (lowerRaw.includes('ql13') || lowerRaw.includes('quốc lộ 13')) return 'QL13 (HCM)';
    if (lowerRaw.includes('q12') || lowerRaw.includes('quận 12')) return 'Q12 (HCM)';
    if (lowerRaw.includes('dĩ an') || lowerRaw.includes('di an')) return 'Dĩ An';
    if (lowerRaw.includes('phạm văn đồng') || lowerRaw.includes('pham van dong') || lowerRaw.includes('pvd')) return 'Phạm Văn Đồng';
    if (lowerRaw.includes('hà huy giáp') || lowerRaw.includes('ha huy giap')) return 'Hà Huy Giáp';
    if (lowerRaw.includes('lê văn việt') || lowerRaw.includes('le van viet')) return 'Lê Văn Việt';
    if (lowerRaw.includes('vũng tàu') || lowerRaw.includes('vung tau')) return 'Vũng Tàu';
    if (lowerRaw.includes('ocp') || lowerRaw.includes('ocean park')) return 'OCP 2';
    if (lowerRaw.includes('lĩnh nam') || lowerRaw.includes('linh nam')) return 'Lĩnh Nam';
    if (lowerRaw.includes('nguyễn trãi') || lowerRaw.includes('nguyen trai')) return 'Nguyễn Trãi';
    if (lowerRaw.includes('tiếp nhận nhà máy') || lowerRaw.includes('nhà máy sxlr') || lowerRaw.includes('nha may')) return 'Nhà máy SXLR';

    // Xóa các tiền tố rườm rà
    let cleaned = raw
        .replace(/^([A-Za-z0-9._-]+)\s*[-:–—]\s*/, '')
        .replace(/^(Kho xe ô tô Vinfast|Kho xe ô tô Viinfast|Kho xe ô tô|Kho xe SR|Kho xe|Ô tô Vinfast|Ô tô VinFast|Vinfast|VinFast|Showroom|SR|Kho)\s*[-:–—]?\s*/i, '')
        .replace(/^Minh Đạo\s*[-–—:]\s*/i, '')
        .replace(/\s*-\s*TPHCM/gi, ' (HCM)')
        .replace(/\s*-\s*HCM/gi, ' (HCM)')
        .trim();

    return cleaned || raw;
};
