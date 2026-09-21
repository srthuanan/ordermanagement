// Danh sách kho xe ô tô trên CyberSoft (Dmkho)
export interface CyberWarehouseItem {
    id: string;
    name: string;
    shortName: string;
    dvcs?: string;
    isPopular?: boolean;
}

// 1. Kho xe ô tô & showroom kinh doanh trọng điểm (Thường dùng tại Miền Nam & Hệ thống chính)
export const CYBER_POPULAR_WAREHOUSES: CyberWarehouseItem[] = [
    {
        id: "K83",
        name: "K83 – Kho xe ô tô Thuận An",
        shortName: "Kho xe ô tô Thuận An",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K87",
        name: "K87 – Kho xe ô tô QL13 - HCM",
        shortName: "Kho xe ô tô QL13 - HCM",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K86",
        name: "K86 – Kho xe ô tô Vinfast Q12 - HCM",
        shortName: "Kho xe ô tô Vinfast Q12 - HCM",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K85",
        name: "K85 – Kho xe ô tô Dĩ An",
        shortName: "Kho xe ô tô Dĩ An",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "KHCM.PVD",
        name: "KHCM.PVD – Kho xe Phạm Văn Đồng - TPHCM",
        shortName: "Kho xe Phạm Văn Đồng - TPHCM",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K106",
        name: "K106 – Kho xe ô tô - Hà Huy Giáp",
        shortName: "Kho xe ô tô - Hà Huy Giáp",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K91",
        name: "K91 – Kho xe ô tô OCP 2",
        shortName: "Kho xe ô tô OCP 2",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K65",
        name: "K65 – Kho xe ô tô Viinfast Vũng Tàu",
        shortName: "Kho xe ô tô Viinfast Vũng Tàu",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K58",
        name: "K58 – Kho xe ô tô Vinfast Lê Văn Việt",
        shortName: "Kho xe ô tô Vinfast Lê Văn Việt",
        dvcs: "02",
        isPopular: true
    },
    {
        id: "K60",
        name: "K60 – Kho xe ô tô Vinfast 3/2",
        shortName: "Kho xe ô tô Vinfast 3/2",
        dvcs: "01",
        isPopular: true
    },
    {
        id: "K01",
        name: "K01 – Kho xe DEMO",
        shortName: "Kho xe DEMO",
        dvcs: "02",
        isPopular: true
    }
];

// 2. Các kho xe ô tô khác thuộc hệ thống toàn quốc trên CyberSoft
export const CYBER_OTHER_WAREHOUSES: CyberWarehouseItem[] = [
    {
        id: "K00",
        name: "K00 – Kho xe ô tô Tổng công ty",
        shortName: "Kho xe ô tô Tổng công ty",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K103",
        name: "K103 – Kho xe ô tô Lĩnh Nam",
        shortName: "Kho xe ô tô Lĩnh Nam",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K14",
        name: "K14 – Kho xe ô tô Suzuki Hoài Đức",
        shortName: "Kho xe ô tô Suzuki Hoài Đức",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K17",
        name: "K17 – Kho xe SR Cam Giá",
        shortName: "Kho xe SR Cam Giá",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K18",
        name: "K18 – Kho xe ô tô Vinfast Cầu Gia Bảy",
        shortName: "Kho xe ô tô Vinfast Cầu Gia Bảy",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K19",
        name: "K19 – Kho xe ô tô Vinfast Phổ Yên",
        shortName: "Kho xe ô tô Vinfast Phổ Yên",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K23",
        name: "K23 – Kho xe ô tô Vinfast Điện Biên",
        shortName: "Kho xe ô tô Vinfast Điện Biên",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K36",
        name: "K36 – Kho xe ô tô Vinfast tại Hải Phòng",
        shortName: "Kho xe ô tô Vinfast tại Hải Phòng",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K41",
        name: "K41 – Kho xe đăng kiểm",
        shortName: "Kho xe đăng kiểm",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K43",
        name: "K43 – Kho xe Gia Lai",
        shortName: "Kho xe Gia Lai",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K45",
        name: "K45 – Kho xe Đà Nẵng",
        shortName: "Kho xe Đà Nẵng",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K46",
        name: "K46 – Kho xe Hồ Chí Minh",
        shortName: "Kho xe Hồ Chí Minh",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K49",
        name: "K49 – Kho xe Hưng Yên - Hiệp Hòa",
        shortName: "Kho xe Hưng Yên - Hiệp Hòa",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K55",
        name: "K55 – Kho ô tô Nguyễn Trãi",
        shortName: "Kho ô tô Nguyễn Trãi",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K57",
        name: "K57 – Kho xe ô tô Vinfast Bắc Ninh",
        shortName: "Kho xe ô tô Vinfast Bắc Ninh",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K59",
        name: "K59 – Kho xe ô tô Vinfast Times city",
        shortName: "Kho xe ô tô Vinfast Times city",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K61",
        name: "K61 – Kho xe Quang Trung",
        shortName: "Kho xe Quang Trung",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K62",
        name: "K62 – Kho xe ô tô Vinfast Vincom TN",
        shortName: "Kho xe ô tô Vinfast Vincom TN",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K63",
        name: "K63 – Kho xe VF Quý Hạnh - Sóc Sơn",
        shortName: "Kho xe VF Quý Hạnh - Sóc Sơn",
        dvcs: "01",
        isPopular: false
    },
    {
        id: "K66",
        name: "K66 – Kho xe ô tô Đăng kiểm TN",
        shortName: "Kho xe ô tô Đăng kiểm TN",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K69",
        name: "K69 – Kho xe ô tô Vinfast Hòa Bình",
        shortName: "Kho xe ô tô Vinfast Hòa Bình",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K74",
        name: "K74 – Kho xe ô tô Vinfast Mê Linh",
        shortName: "Kho xe ô tô Vinfast Mê Linh",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K75",
        name: "K75 – Kho xe ô tô vinfast GO Việt Trì",
        shortName: "Kho xe ô tô vinfast GO Việt Trì",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K76",
        name: "K76 – Kho xe ô tô vinfast GO Thái Bình",
        shortName: "Kho xe ô tô vinfast GO Thái Bình",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K77",
        name: "K77 – Kho xe ô tô vinfast GO Hạ Long",
        shortName: "Kho xe ô tô vinfast GO Hạ Long",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "K82",
        name: "K82 – Kho xe ô tô Hyundai BG",
        shortName: "Kho xe ô tô Hyundai BG",
        dvcs: "07",
        isPopular: false
    },
    {
        id: "K90",
        name: "K90 – Kho xe ô tô cũ",
        shortName: "Kho xe ô tô cũ",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "KBN.TS",
        name: "KBN.TS – Kho xe Từ Sơn - Bắc Ninh",
        shortName: "Kho xe Từ Sơn - Bắc Ninh",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "KHB.SH",
        name: "KHB.SH – Kho xe Shop House - Hòa Bình",
        shortName: "Kho xe Shop House - Hòa Bình",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "KTN.CK",
        name: "KTN.CK – Kho xe Xưởng cơ khí - Thái Nguyên",
        shortName: "Kho xe Xưởng cơ khí - Thái Nguyên",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "KTN.NM",
        name: "KTN.NM – Kho xe Nhà máy SXLR - Thái Nguyên",
        shortName: "Kho xe Nhà máy SXLR - Thái Nguyên",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "KTN.TL",
        name: "KTN.TL – Kho xe Tân Long - Thái Nguyên",
        shortName: "Kho xe Tân Long - Thái Nguyên",
        dvcs: "02",
        isPopular: false
    },
    {
        id: "KTN.TT",
        name: "KTN.TT – Kho xe Tân Thịnh - Thái Nguyên",
        shortName: "Kho xe Tân Thịnh - Thái Nguyên",
        dvcs: "02",
        isPopular: false
    }
];

// 3. TOÀN BỘ DANH SÁCH KHO XE Ô TÔ TRÊN CYBERSOFT (Đầy đủ 44 kho xe thực tế)
export const CYBER_ALL_WAREHOUSES: CyberWarehouseItem[] = [
    ...CYBER_POPULAR_WAREHOUSES,
    ...CYBER_OTHER_WAREHOUSES
];

export const CYBER_WAREHOUSES = CYBER_ALL_WAREHOUSES;
