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

/**
 * Rút gọn tên màu ngoại thất xe để hiển thị đẹp trong ô Specs, đặc biệt là các xe 2-tone (như VF 3)
 * Ví dụ: "Brahminy White Roof- Summer Yellow Body (181U)" -> "Vàng / Nóc Trắng (181U)"
 */
export const formatShortExteriorColor = (rawColor: string | undefined): string => {
    if (!rawColor) return '—';
    const trimmed = rawColor.trim();
    const lower = trimmed.toLowerCase();
    const codeMatch = trimmed.match(/\(([^)]+)\)/);
    const code = codeMatch ? codeMatch[1].trim() : '';

    // Xử lý các dòng 2-tone phối nóc trắng Brahminy White Roof của VF 3
    if (lower.includes('white roof') || lower.includes('nóc trắng')) {
        let bodyColorName = '';
        if (lower.includes('summer yellow') || lower.includes('vàng') || code.toLowerCase() === '181u' || code.toLowerCase() === '111u') {
            bodyColorName = 'Vàng / Nóc Trắng';
        } else if (lower.includes('crimson red') || lower.includes('đỏ') || code.toLowerCase() === '111m' || code.toLowerCase() === '112q') {
            bodyColorName = 'Đỏ / Nóc Trắng';
        } else if (lower.includes('criterio green') || lower.includes('mint') || lower.includes('xanh lá') || code.toLowerCase() === '171w' || code.toLowerCase() === '1722') {
            bodyColorName = 'Xanh / Nóc Trắng';
        } else if (lower.includes('zenith grey') || lower.includes('xám') || code.toLowerCase() === '171v') {
            bodyColorName = 'Xám / Nóc Trắng';
        } else if (lower.includes('iris berry') || lower.includes('hồng') || code.toLowerCase() === '1821') {
            bodyColorName = 'Hồng / Nóc Trắng';
        } else if (lower.includes('champagne') || code.toLowerCase() === '1823') {
            bodyColorName = 'Champagne / Nóc Trắng';
        } else if (lower.includes('vitality orange') || lower.includes('cam') || code.toLowerCase() === '1832') {
            bodyColorName = 'Cam / Nóc Trắng';
        } else if (lower.includes('blue') || lower.includes('xanh dương') || code.toLowerCase() === '182g') {
            bodyColorName = 'Xanh / Nóc Trắng';
        }

        if (bodyColorName) {
            return code ? `${bodyColorName} (${code})` : bodyColorName;
        }
    }

    if (trimmed.length > 22 && code) {
        const namePart = trimmed.replace(/\([^)]+\)/, '').trim();
        if (namePart.includes('-')) {
            const parts = namePart.split('-').map(p => p.trim());
            const bodyPart = parts.find(p => p.toLowerCase().includes('body')) || parts[parts.length - 1];
            const cleanBody = bodyPart.replace(/body/i, '').trim();
            return `${cleanBody} (${code})`;
        }
    }

    return trimmed;
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
    'K85': 'K85',
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

/**
 * Tự động chuẩn hóa và làm sạch Mã HĐ Cyber:
 * - Loại bỏ khoảng trắng thừa, viết hoa toàn bộ (UPPERCASE)
 * - Cắt bỏ các hậu tố thanh toán do Sale tự gõ: -TG, -TM, -TN, -TRA GOP, -TRẢ GÓP, -TIEN MAT, -TIỀN MẶT, -NH, -NGAN HANG, -NGÂN HÀNG...
 * - Chuẩn hóa HDMB thành HĐMB
 */
export const cleanCyberContractCode = (code: string | undefined | null): string => {
    if (!code) return '';
    let cleaned = String(code).trim().toUpperCase();

    // 1. Cắt bỏ hậu tố hình thức thanh toán ở đuôi (ví dụ: -TG, -TM, -TRA GOP, _TG...)
    cleaned = cleaned.replace(/[\s\-_/]+(TG|TM|TN|TRA\s*GOP|TRẢ\s*GÓP|TIEN\s*MAT|TIỀN\s*MẶT|NH|NGAN\s*HANG|NGÂN\s*HÀNG)$/i, '');

    // 2. Chuẩn hóa HDMB -> HĐMB
    cleaned = cleaned.replace(/HDMB/g, 'HĐMB');

    return cleaned.trim();
};

/**
 * Chuẩn hóa tên khách hàng phục vụ đối soát giữa Đơn hàng, VinFast DMS và CyberSoft:
 * - Chuyển chữ thường, bỏ dấu tiếng Việt (NFD), xóa ký tự đặc biệt
 * - Lược bỏ các danh xưng cá nhân (Anh, Chị, Ông, Bà, Em, Cô, Chú, Bác...)
 * - Đồng bộ các từ viết tắt công ty (Cty/Công ty, TNHH/Trách nhiệm hữu hạn, CP/Cổ phần, TMDV...)
 */
export const cleanCustomerName = (name: string | undefined | null): string => {
    if (!name) return '';
    let s = String(name)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .trim();

    // Thay thế ký tự đặc biệt bằng khoảng trắng
    s = s.replace(/[\.,\-_/\\()&[\]{}:;+]/g, ' ');

    // Chuẩn hóa khoảng trắng
    s = s.replace(/\s+/g, ' ').trim();

    // Lược bỏ danh xưng cá nhân đầu chuỗi
    const personalPrefixes = ['anh ', 'chi ', 'ong ', 'ba ', 'co ', 'chu ', 'bac ', 'em '];
    for (const p of personalPrefixes) {
        if (s.startsWith(p)) {
            s = s.substring(p.length).trim();
            break;
        }
    }

    // Chuẩn hóa từ viết tắt doanh nghiệp thông dụng
    s = s
        .replace(/\bcong ty\b/g, 'cty')
        .replace(/\btrach nhiem huu han\b/g, 'tnhh')
        .replace(/\bco phan\b/g, 'cp')
        .replace(/\bthuong mai dich vu\b/g, 'tmdv')
        .replace(/\bmot thanh vien\b/g, 'mtv')
        .replace(/\bdoanh nghiep tu nhan\b/g, 'dntn')
        .replace(/\bhop tac xa\b/g, 'htx');

    // Chuẩn hóa lại khoảng trắng sau khi replace
    s = s.replace(/\s+/g, ' ').trim();

    return s;
};

/**
 * Đối soát thông minh Tên Khách Hàng giữa 2 nguồn (Đơn hàng ⇄ DMS ⇄ CyberSoft):
 * Trả về true nếu tên trùng khớp hoặc tương đồng cao (chấp nhận viết tắt công ty, danh xưng, không dấu, thiếu tên đệm).
 * Trả về false nếu khác biệt rõ rệt (khác Họ, khác Tên gọi chính, hoặc khác tên công ty).
 */
export const checkCustomerNameMatch = (name1: string | undefined | null, name2: string | undefined | null): boolean => {
    if (!name1 || !name2) return true; // Tránh chặn oan khi 1 bên chưa kịp nạp dữ liệu

    const c1 = cleanCustomerName(name1);
    const c2 = cleanCustomerName(name2);

    if (!c1 || !c2) return true;

    // 1. Trùng khớp 100% sau khi chuẩn hóa
    if (c1 === c2) return true;

    // 2. Một bên bao hàm bên kia hoàn toàn (ví dụ: "cty tnhh mai linh" vs "cty tnhh mai linh mtv")
    if (c1.includes(c2) || c2.includes(c1)) {
        const shorter = c1.length < c2.length ? c1 : c2;
        if (shorter.length >= 4) return true;
    }

    // 3. Tách từ
    const words1 = c1.split(' ').filter(w => w.length > 0);
    const words2 = c2.split(' ').filter(w => w.length > 0);

    if (words1.length === 0 || words2.length === 0) return true;

    // Đối với tên cá nhân (thường không có từ khóa cty, tnhh, cp):
    const isCompany = c1.includes('cty') || c2.includes('cty') || c1.includes('tnhh') || c2.includes('tnhh') || c1.includes('cp') || c2.includes('cp');
    
    if (!isCompany) {
        // Tên chính (từ cuối cùng) BẮT BUỘC phải giống nhau (ví dụ "An" !== "Bình")
        const lastName1 = words1[words1.length - 1];
        const lastName2 = words2[words2.length - 1];
        if (lastName1 !== lastName2) {
            return false;
        }

        // Họ (từ đầu tiên) BẮT BUỘC phải giống nhau (ví dụ "Nguyễn" !== "Trần")
        const firstName1 = words1[0];
        const firstName2 = words2[0];
        if (firstName1 !== firstName2) {
            return false;
        }

        // Cùng Họ và cùng Tên chính -> Hợp lệ (cho phép khác biệt tên đệm hoặc gõ tắt đệm)
        return true;
    } else {
        // Đối với doanh nghiệp: Lọc bỏ các từ tiền tố cty, tnhh, cp, tmdv, mtv để lấy tên riêng công ty
        const stopWords = new Set(['cty', 'tnhh', 'cp', 'tmdv', 'mtv', 'dntn', 'htx', 'dau', 'tu', 'va']);
        const coreWords1 = words1.filter(w => !stopWords.has(w));
        const coreWords2 = words2.filter(w => !stopWords.has(w));

        const core1 = coreWords1.join(' ');
        const core2 = coreWords2.join(' ');

        if (core1 && core2) {
            if (core1 === core2 || core1.includes(core2) || core2.includes(core1)) {
                return true;
            }
        }
        return false;
    }
};
