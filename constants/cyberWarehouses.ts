// Danh sách toàn bộ 106 kho có trên CyberSoft (DmKho)
export interface CyberWarehouseItem {
    id: string;
    name: string;
    shortName: string;
    dvcs?: string;
    isPopular?: boolean;
}

// 1. Kho xe ô tô & showroom kinh doanh trọng điểm (Thường dùng)
export const CYBER_POPULAR_WAREHOUSES: CyberWarehouseItem[] = [
    {
        "id": "K83",
        "name": "K83 – Thuận An (Mặc định)",
        "shortName": "Kho xe ô tô Thuận An",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K87",
        "name": "K87 – QL13 (HCM)",
        "shortName": "Kho xe ô tô QL13 - HCM",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K86",
        "name": "K86 – Q12 (HCM)",
        "shortName": "Kho xe ô tô Vinfast Q12 - HCM",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K85",
        "name": "K85 – Dĩ An",
        "shortName": "Kho xe ô tô Dĩ An",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "KHCM.PVD",
        "name": "KHCM.PVD – Phạm Văn Đồng",
        "shortName": "Kho xe Phạm Văn Đồng - TPHCM",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K106",
        "name": "K106 – Hà Huy Giáp",
        "shortName": "Kho xe ô tô - Hà Huy Giáp",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K103",
        "name": "K103 – Lĩnh Nam",
        "shortName": "Kho xe ô tô Lĩnh Nam",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K58",
        "name": "K58 – Lê Văn Việt",
        "shortName": "Kho xe ô tô Vinfast Lê Văn Việt",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K65",
        "name": "K65 – Vũng Tàu",
        "shortName": "Kho xe ô tô Viinfast Vũng Tàu",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K17",
        "name": "K17 – Cam Giá",
        "shortName": "Kho xe SR Cam Giá",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "KTN.TT",
        "name": "KTN.TT – Tân Thịnh (TN)",
        "shortName": "Kho xe Tân Thịnh - Thái Nguyên",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "KTN.NM",
        "name": "KTN.NM – NM Thái Nguyên",
        "shortName": "Kho xe Nhà máy SXLR - Thái Nguyên",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K36",
        "name": "K36 – Kho xe ô tô Vinfast tại Hải Phòng",
        "shortName": "Kho xe ô tô Vinfast tại Hải Phòng",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K57",
        "name": "K57 – Kho xe ô tô Vinfast Bắc Ninh",
        "shortName": "Kho xe ô tô Vinfast Bắc Ninh",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K69",
        "name": "K69 – Kho xe ô tô Vinfast Hòa Bình",
        "shortName": "Kho xe ô tô Vinfast Hòa Bình",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K74",
        "name": "K74 – Kho xe ô tô Vinfast Mê Linh",
        "shortName": "Kho xe ô tô Vinfast Mê Linh",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K75",
        "name": "K75 – Kho xe ô tô vinfast GO Việt Trì",
        "shortName": "Kho xe ô tô vinfast GO Việt Trì",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K76",
        "name": "K76 – Kho xe ô tô vinfast GO Thái Bình",
        "shortName": "Kho xe ô tô vinfast GO Thái Bình",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K77",
        "name": "K77 – Kho xe ô tô vinfast GO Hạ Long",
        "shortName": "Kho xe ô tô vinfast GO Hạ Long",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K91",
        "name": "K91 – Kho xe ô tô OCP 2",
        "shortName": "Kho xe ô tô OCP 2",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K01",
        "name": "K01 – Kho xe DEMO",
        "shortName": "Kho xe DEMO",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K00",
        "name": "K00 – Kho xe ô tô Tổng công ty",
        "shortName": "Kho xe ô tô Tổng công ty",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K18",
        "name": "K18 – Kho xe ô tô Vinfast Cầu Gia Bảy",
        "shortName": "Kho xe ô tô Vinfast Cầu Gia Bảy",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K19",
        "name": "K19 – Kho xe ô tô Vinfast Phổ Yên",
        "shortName": "Kho xe ô tô Vinfast Phổ Yên",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K23",
        "name": "K23 – Kho xe ô tô Vinfast Điện Biên",
        "shortName": "Kho xe ô tô Vinfast Điện Biên",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "KBN.TS",
        "name": "KBN.TS – Kho xe Từ Sơn - Bắc Ninh",
        "shortName": "Kho xe Từ Sơn - Bắc Ninh",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "KHB.SH",
        "name": "KHB.SH – Kho xe Shop House - Hòa Bình",
        "shortName": "Kho xe Shop House - Hòa Bình",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "KTN.CK",
        "name": "KTN.CK – Kho xe Xưởng cơ khí - Thái Nguyên",
        "shortName": "Kho xe Xưởng cơ khí - Thái Nguyên",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "KTN.TL",
        "name": "KTN.TL – Kho xe Tân Long - Thái Nguyên",
        "shortName": "Kho xe Tân Long - Thái Nguyên",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K41",
        "name": "K41 – Kho xe đăng kiểm",
        "shortName": "Kho xe đăng kiểm",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K43",
        "name": "K43 – Kho xe Gia Lai",
        "shortName": "Kho xe Gia Lai",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K45",
        "name": "K45 – Kho xe Đà Nẵng",
        "shortName": "Kho xe Đà Nẵng",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K46",
        "name": "K46 – Kho xe Hồ Chí Minh",
        "shortName": "Kho xe Hồ Chí Minh",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K49",
        "name": "K49 – Kho xe Hưng Yên - Hiệp Hòa",
        "shortName": "Kho xe Hưng Yên - Hiệp Hòa",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K55",
        "name": "K55 – Kho ô tô Nguyễn Trãi",
        "shortName": "Kho ô tô Nguyễn Trãi",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K59",
        "name": "K59 – Kho xe ô tô Vinfast Times city",
        "shortName": "Kho xe ô tô Vinfast Times city",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K60",
        "name": "K60 – Kho xe ô tô Vinfast 3/2",
        "shortName": "Kho xe ô tô Vinfast 3/2",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K61",
        "name": "K61 – Kho xe Quang Trung",
        "shortName": "Kho xe Quang Trung",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K62",
        "name": "K62 – Kho xe ô tô Vinfast Vincom TN",
        "shortName": "Kho xe ô tô Vinfast Vincom TN",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K63",
        "name": "K63 – Kho xe VF Quý Hạnh - Sóc Sơn",
        "shortName": "Kho xe VF Quý Hạnh - Sóc Sơn",
        "dvcs": "01",
        "isPopular": true
    },
    {
        "id": "K66",
        "name": "K66 – Kho xe ô tô Đăng kiểm TN",
        "shortName": "Kho xe ô tô Đăng kiểm TN",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K82",
        "name": "K82 – Kho xe ô tô Hyundai BG",
        "shortName": "Kho xe ô tô Hyundai BG",
        "dvcs": "07",
        "isPopular": true
    },
    {
        "id": "K90",
        "name": "K90 – Kho xe ô tô cũ",
        "shortName": "Kho xe ô tô cũ",
        "dvcs": "02",
        "isPopular": true
    },
    {
        "id": "K14",
        "name": "K14 – Kho xe ô tô Suzuki Hoài Đức",
        "shortName": "Kho xe ô tô Suzuki Hoài Đức",
        "dvcs": "01",
        "isPopular": true
    }
];

// 2. Các kho còn lại trên CyberSoft (Phụ tùng, vật tư, trạm sạc, v.v.)
export const CYBER_OTHER_WAREHOUSES: CyberWarehouseItem[] = [
    {
        "id": "K-29",
        "name": "K-29 – KHO PHỤ TÙNG MĐ SÓC SƠN",
        "shortName": "KHO PHỤ TÙNG MĐ SÓC SƠN",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K02",
        "name": "K02 – Kho phụ tùng",
        "shortName": "Kho phụ tùng",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K03",
        "name": "K03 – Kho phụ kiện",
        "shortName": "Kho phụ kiện",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K04",
        "name": "K04 – Kho vật tư Thái Nguyên",
        "shortName": "Kho vật tư Thái Nguyên",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K05",
        "name": "K05 – Kho vật tư phụ",
        "shortName": "Kho vật tư phụ",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K06",
        "name": "K06 – Kho công cụ dụng cụ",
        "shortName": "Kho công cụ dụng cụ",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K07",
        "name": "K07 – Kho nguyên vật liệu, vật tư đóng thùng",
        "shortName": "Kho nguyên vật liệu, vật tư đóng thùng",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K08",
        "name": "K08 – Kho thùng xe",
        "shortName": "Kho thùng xe",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K09",
        "name": "K09 – Kho hàng ký gửi",
        "shortName": "Kho hàng ký gửi",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K10",
        "name": "K10 – Kho vật tư khách sạn hữu nghị",
        "shortName": "Kho vật tư khách sạn hữu nghị",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K100",
        "name": "K100 – Kho thiết bị sạc V-GREEN",
        "shortName": "Kho thiết bị sạc V-GREEN",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K101",
        "name": "K101 – Kho trụ sạc VINFAST- Trả góp",
        "shortName": "Kho trụ sạc VINFAST- Trả góp",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K102",
        "name": "K102 – Kho Trụ sạc HO",
        "shortName": "Kho Trụ sạc HO",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K104",
        "name": "K104 – Kho Vật tư Sơn - Hà Huy Giáp",
        "shortName": "Kho Vật tư Sơn - Hà Huy Giáp",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K105",
        "name": "K105 – Kho Phụ tùng - Hà Huy Giáp",
        "shortName": "Kho Phụ tùng - Hà Huy Giáp",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K107",
        "name": "K107 – Kho CCDC Hà Huy Giáp",
        "shortName": "Kho CCDC Hà Huy Giáp",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K108",
        "name": "K108 – Kho Phụ Kiện Hà Huy Giáp",
        "shortName": "Kho Phụ Kiện Hà Huy Giáp",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K109",
        "name": "K109 – Kho VT Sơn Bắc Ninh",
        "shortName": "Kho VT Sơn Bắc Ninh",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K11",
        "name": "K11 – Kho sơn, vật tư sơn - VF Sóc Sơn",
        "shortName": "Kho sơn, vật tư sơn - VF Sóc Sơn",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K12",
        "name": "K12 – Kho công cụ dụng cụ - VF Sóc Sơn",
        "shortName": "Kho công cụ dụng cụ - VF Sóc Sơn",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K20",
        "name": "K20 – Kho xe máy Vinfast Cầu Gia Bảy",
        "shortName": "Kho xe máy Vinfast Cầu Gia Bảy",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K21",
        "name": "K21 – Kho xe máy Vinfast Phổ Yên",
        "shortName": "Kho xe máy Vinfast Phổ Yên",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K24",
        "name": "K24 – Kho phụ tùng xe máy điện Vinfast",
        "shortName": "Kho phụ tùng xe máy điện Vinfast",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K25",
        "name": "K25 – Kho CCDC xe máy điện Vinfast",
        "shortName": "Kho CCDC xe máy điện Vinfast",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K28",
        "name": "K28 – kho phụ tùng Hòa Bình",
        "shortName": "kho phụ tùng Hòa Bình",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K28_01",
        "name": "K28_01 – Kho vật tư tiêu hao - Hoà Bình",
        "shortName": "Kho vật tư tiêu hao - Hoà Bình",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K29",
        "name": "K29 – KHO PHỤ TÙNG MĐ SÓC SƠN",
        "shortName": "KHO PHỤ TÙNG MĐ SÓC SƠN",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K30",
        "name": "K30 – Kho voucher ô tô",
        "shortName": "Kho voucher ô tô",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K30_01",
        "name": "K30_01 – Kho phụ tùng suzuki Quý Hạnh",
        "shortName": "Kho phụ tùng suzuki Quý Hạnh",
        "dvcs": "03",
        "isPopular": false
    },
    {
        "id": "K30_02",
        "name": "K30_02 – Kho phụ tùng suzuki Quý Hạnh",
        "shortName": "Kho phụ tùng suzuki Quý Hạnh",
        "dvcs": "03",
        "isPopular": false
    },
    {
        "id": "K31",
        "name": "K31 – Kho lazang phay",
        "shortName": "Kho lazang phay",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K33",
        "name": "K33 – Xuất trả đơn vị đóng thùng",
        "shortName": "Xuất trả đơn vị đóng thùng",
        "dvcs": "05",
        "isPopular": false
    },
    {
        "id": "K35",
        "name": "K35 – Kho hàng ký gửi TITACO",
        "shortName": "Kho hàng ký gửi TITACO",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K37",
        "name": "K37 – Kho phụ tùng VINFAST cũ",
        "shortName": "Kho phụ tùng VINFAST cũ",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K38",
        "name": "K38 – Kho voucher XMĐ",
        "shortName": "Kho voucher XMĐ",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K39",
        "name": "K39 – Kho Phụ kiên theo xe",
        "shortName": "Kho Phụ kiên theo xe",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K40",
        "name": "K40 – Kho vật tư hành chính Vân Đạo",
        "shortName": "Kho vật tư hành chính Vân Đạo",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K42",
        "name": "K42 – Kho xe khách sạn",
        "shortName": "Kho xe khách sạn",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K44",
        "name": "K44 – Kho pin ô tô VinFasst",
        "shortName": "Kho pin ô tô VinFasst",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K44.1",
        "name": "K44.1 – Kho pin ô tô VinFasst",
        "shortName": "Kho pin ô tô VinFasst",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K47",
        "name": "K47 – Kho vật tư hành chính Hyundai",
        "shortName": "Kho vật tư hành chính Hyundai",
        "dvcs": "07",
        "isPopular": false
    },
    {
        "id": "K48",
        "name": "K48 – Kho phụ tùng lô xe BCA",
        "shortName": "Kho phụ tùng lô xe BCA",
        "dvcs": "01",
        "isPopular": false
    },
    {
        "id": "K50",
        "name": "K50 – Kho cơ khí",
        "shortName": "Kho cơ khí",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K56",
        "name": "K56 – Kho phụ tùng Vinfast Thuận An",
        "shortName": "Kho phụ tùng Vinfast Thuận An",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K56_01",
        "name": "K56_01 – Kho phụ tùng ngoài - Thuận An",
        "shortName": "Kho phụ tùng ngoài - Thuận An",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K56_02",
        "name": "K56_02 – Kho vật tư Sơn - Thuận An",
        "shortName": "Kho vật tư Sơn - Thuận An",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K64",
        "name": "K64 – Kho phụ tùng Quang Trung",
        "shortName": "Kho phụ tùng Quang Trung",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K70",
        "name": "K70 – Kho phụ kiện Royal city",
        "shortName": "Kho phụ kiện Royal city",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K72",
        "name": "K72 – Kho phụ tùng Vũng Tàu",
        "shortName": "Kho phụ tùng Vũng Tàu",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K72_01",
        "name": "K72_01 – Kho vật tư tiêu hao/ Phụ tùng ngoài - Vũng Tàu",
        "shortName": "Kho vật tư tiêu hao/ Phụ tùng ngoài - Vũng Tàu",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K72_02",
        "name": "K72_02 – Kho phụ kiên - Vũng Tàu",
        "shortName": "Kho phụ kiên - Vũng Tàu",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K80",
        "name": "K80 – Kho sạc ô tô VinFasst",
        "shortName": "Kho sạc ô tô VinFasst",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K81",
        "name": "K81 – Kho sạc ô tô VinFasst",
        "shortName": "Kho sạc ô tô VinFasst",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K84",
        "name": "K84 – Kho trụ sạc VINFAST",
        "shortName": "Kho trụ sạc VINFAST",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K88",
        "name": "K88 – Kho Phụ Tùng VF MĐ Mê Linh",
        "shortName": "Kho Phụ Tùng VF MĐ Mê Linh",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K89",
        "name": "K89 – Kho VT Sơn - VF MĐ Mê Linh",
        "shortName": "Kho VT Sơn - VF MĐ Mê Linh",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K9",
        "name": "K9 – Kho vật tư tiêu hao (Bắc Ninh)",
        "shortName": "Kho vật tư tiêu hao (Bắc Ninh)",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K97",
        "name": "K97 – Kho thiết bị sạc V-GREEN",
        "shortName": "Kho thiết bị sạc V-GREEN",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K98",
        "name": "K98 – Kho hàng ký gửi ( Bắc Ninh )",
        "shortName": "Kho hàng ký gửi ( Bắc Ninh )",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "K99",
        "name": "K99 – Kho phụ tùng Bắc Ninh",
        "shortName": "Kho phụ tùng Bắc Ninh",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "KHC",
        "name": "KHC – Kho Hành chính",
        "shortName": "Kho Hành chính",
        "dvcs": "02",
        "isPopular": false
    },
    {
        "id": "KN",
        "name": "KN – Kho phụ tùng ô tô hàng ngoài",
        "shortName": "Kho phụ tùng ô tô hàng ngoài",
        "dvcs": "07",
        "isPopular": false
    }
];

// 3. TOÀN BỘ 106 KHO CÓ TRÊN CYBERSOFT (Đầy đủ không thiếu kho nào)
export const CYBER_ALL_WAREHOUSES: CyberWarehouseItem[] = [
    ...CYBER_POPULAR_WAREHOUSES,
    ...CYBER_OTHER_WAREHOUSES
];

export const CYBER_WAREHOUSES = CYBER_ALL_WAREHOUSES;
