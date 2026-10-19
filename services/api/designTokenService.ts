export interface ChameleonThemeTokens {
    colorCode: string;
    colorName: string;
    primaryHex: string;
    primaryRgb: string;
    ambientStudioGradient: string;
    cardBorderGlow: string;
    shadowGlow: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    accentButtonClass: string;
}

export type OrderProgressStage = 'unmatched' | 'pending_invoice' | 'invoiced' | 'delivered';

export interface ContextualAction {
    id: string;
    label: string;
    subtext?: string;
    icon: string;
    variant: 'primary' | 'success' | 'warning' | 'info' | 'purple';
    pulse: boolean;
    stageIndex: number; // 1 to 4
}

export interface ContextualLayoutBlueprint {
    stage: OrderProgressStage;
    stageNumber: number;
    stageTitle: string;
    stageDescription: string;
    primaryHeroAction: ContextualAction;
    secondaryActions: ContextualAction[];
    activeSectionFocus: 'pairing' | 'invoice' | 'delivery' | 'summary';
    accentThemeClass: string;
}

/**
 * Trích xuất bộ Design Tokens Tắc Kè Hoa (Chameleon Theme) theo màu sơn ngoại thất xe
 */
export const getCarChameleonTheme = (exterior?: string, _model?: string): ChameleonThemeTokens => {
    const raw = (exterior || '').toLowerCase().trim();
    const codeMatch = raw.match(/\(([^)]+)\)/);
    const code = codeMatch ? codeMatch[1].trim().toLowerCase() : '';

    // Mặc định: VinFast Electric Blue
    let res: ChameleonThemeTokens = {
        colorCode: code || 'CE1N',
        colorName: exterior || 'VinFast Blue',
        primaryHex: '#0284C7',
        primaryRgb: '2, 132, 199',
        ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(2, 132, 199, 0.22) 0%, rgba(2, 132, 199, 0.05) 55%, transparent 100%)',
        cardBorderGlow: 'rgba(2, 132, 199, 0.45)',
        shadowGlow: '0 16px 38px -10px rgba(2, 132, 199, 0.35)',
        badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
        badgeText: 'text-sky-700 dark:text-sky-300',
        badgeBorder: 'border-sky-300 dark:border-sky-700/60',
        accentButtonClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-500/25'
    };

    // 1. VÀNG / AMBER (CE1U, 111U, 181U, Gold, Yellow, Champagne)
    if (code === 'ce1u' || code === '111u' || code === '181u' || code === 'ce23' || raw.includes('vàng') || raw.includes('yellow') || raw.includes('champagne') || raw.includes('creme')) {
        return {
            colorCode: code || 'CE1U',
            colorName: 'Vàng Amber VinFast',
            primaryHex: '#D97706',
            primaryRgb: '217, 119, 6',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(217, 119, 6, 0.25) 0%, rgba(217, 119, 6, 0.06) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(217, 119, 6, 0.55)',
            shadowGlow: '0 16px 38px -10px rgba(217, 119, 6, 0.38)',
            badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
            badgeText: 'text-amber-800 dark:text-amber-200',
            badgeBorder: 'border-amber-300 dark:border-amber-700/60',
            accentButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25'
        };
    }

    // 2. ĐỎ CRIMSON / SOLAR RUBY (CE1M, 111M, CE2Q, 112Q, Red, Đỏ)
    if (code === 'ce1m' || code === '111m' || code === 'ce2q' || code === '112q' || raw.includes('đỏ') || raw.includes('red') || raw.includes('ruby') || raw.includes('crimson')) {
        return {
            colorCode: code || 'CE1M',
            colorName: 'Đỏ Crimson VinFast',
            primaryHex: '#DC2626',
            primaryRgb: '220, 38, 38',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(220, 38, 38, 0.25) 0%, rgba(220, 38, 38, 0.06) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(220, 38, 38, 0.55)',
            shadowGlow: '0 16px 38px -10px rgba(220, 38, 38, 0.38)',
            badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
            badgeText: 'text-rose-700 dark:text-rose-300',
            badgeBorder: 'border-rose-300 dark:border-rose-700/60',
            accentButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25'
        };
    }

    // 3. XANH LỤC EMERALD / DEEP OCEAN / CRITERIO (CE1W, CE2B, CE1H, CE22, CE21, Green, Mint, Ocean)
    if (code === 'ce1w' || code === 'ce2b' || code === 'ce21' || raw.includes('xanh lá') || raw.includes('green') || raw.includes('mint') || raw.includes('ocean') || raw.includes('criterio') || raw.includes('ivy')) {
        return {
            colorCode: code || 'CE21',
            colorName: 'Xanh Emerald / Deep Ocean',
            primaryHex: '#059669',
            primaryRgb: '5, 150, 105',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(5, 150, 105, 0.25) 0%, rgba(5, 150, 105, 0.06) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(5, 150, 105, 0.55)',
            shadowGlow: '0 16px 38px -10px rgba(5, 150, 105, 0.38)',
            badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
            badgeText: 'text-emerald-700 dark:text-emerald-300',
            badgeBorder: 'border-emerald-300 dark:border-emerald-700/60',
            accentButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
        };
    }

    // 4. CAM VITALITY / SUNSET ORB (CE1A, CE32, Orange, Cam)
    if (code === 'ce1a' || code === 'ce32' || raw.includes('cam') || raw.includes('orange') || raw.includes('sunset') || raw.includes('vitality')) {
        return {
            colorCode: code || 'CE1A',
            colorName: 'Cam Sunset / Vitality',
            primaryHex: '#EA580C',
            primaryRgb: '234, 88, 12',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(234, 88, 12, 0.25) 0%, rgba(234, 88, 12, 0.06) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(234, 88, 12, 0.55)',
            shadowGlow: '0 16px 38px -10px rgba(234, 88, 12, 0.38)',
            badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
            badgeText: 'text-orange-700 dark:text-orange-300',
            badgeBorder: 'border-orange-300 dark:border-orange-700/60',
            accentButtonClass: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/25'
        };
    }

    // 5. HỒNG IRIS BERRY / ROSE GOLD (CE1X, CE2K, Pink, Hồng, Berry)
    if (code === 'ce1x' || code === 'ce2k' || raw.includes('hồng') || raw.includes('pink') || raw.includes('berry') || raw.includes('rose')) {
        return {
            colorCode: code || 'CE1X',
            colorName: 'Hồng Iris Berry VinFast',
            primaryHex: '#DB2777',
            primaryRgb: '219, 39, 119',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(219, 39, 119, 0.25) 0%, rgba(219, 39, 119, 0.06) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(219, 39, 119, 0.55)',
            shadowGlow: '0 16px 38px -10px rgba(219, 39, 119, 0.38)',
            badgeBg: 'bg-pink-50 dark:bg-pink-950/40',
            badgeText: 'text-pink-700 dark:text-pink-300',
            badgeBorder: 'border-pink-300 dark:border-pink-700/60',
            accentButtonClass: 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-500/25'
        };
    }

    // 6. XÁM NEPTUNE / ZENITH GREY / BẠC SILVER (CE14, CE1V, CE17, Grey, Gray, Bạc, Xám, Silver)
    if (code === 'ce14' || code === 'ce1v' || code === 'ce17' || raw.includes('xám') || raw.includes('bạc') || raw.includes('grey') || raw.includes('gray') || raw.includes('silver') || raw.includes('neptune')) {
        return {
            colorCode: code || 'CE14',
            colorName: 'Xám Neptune / Bạc Silver',
            primaryHex: '#64748B',
            primaryRgb: '100, 116, 139',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(100, 116, 139, 0.25) 0%, rgba(100, 116, 139, 0.06) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(100, 116, 139, 0.55)',
            shadowGlow: '0 16px 38px -10px rgba(100, 116, 139, 0.38)',
            badgeBg: 'bg-slate-100 dark:bg-slate-800/60',
            badgeText: 'text-slate-800 dark:text-slate-200',
            badgeBorder: 'border-slate-300 dark:border-slate-700',
            accentButtonClass: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-600/25'
        };
    }

    // 7. TRẮNG NGỌC TRAI / BLANC (CE18, White, Trắng)
    if (code === 'ce18' || raw.includes('trắng') || raw.includes('white') || raw.includes('blanc')) {
        return {
            colorCode: code || 'CE18',
            colorName: 'Trắng Ngọc Trai VinFast',
            primaryHex: '#38BDF8',
            primaryRgb: '56, 189, 248',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(248, 250, 252, 0.35) 0%, rgba(56, 189, 248, 0.08) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(56, 189, 248, 0.50)',
            shadowGlow: '0 16px 38px -10px rgba(56, 189, 248, 0.30)',
            badgeBg: 'bg-sky-50/80 dark:bg-slate-800',
            badgeText: 'text-sky-800 dark:text-sky-200',
            badgeBorder: 'border-sky-200 dark:border-sky-800',
            accentButtonClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-500/25'
        };
    }

    // 8. ĐEN PHANTOM JET BLACK (CE11, 3111, Black, Đen)
    if (code === 'ce11' || code === '3111' || raw.includes('đen') || raw.includes('black')) {
        return {
            colorCode: code || 'CE11',
            colorName: 'Đen Jet Black VinFast',
            primaryHex: '#334155',
            primaryRgb: '51, 65, 85',
            ambientStudioGradient: 'radial-gradient(ellipse 90% 60% at 50% -15%, rgba(51, 65, 85, 0.30) 0%, rgba(30, 41, 59, 0.10) 55%, transparent 100%)',
            cardBorderGlow: 'rgba(71, 85, 105, 0.60)',
            shadowGlow: '0 16px 38px -10px rgba(15, 23, 42, 0.50)',
            badgeBg: 'bg-slate-100 dark:bg-slate-800',
            badgeText: 'text-slate-900 dark:text-slate-100',
            badgeBorder: 'border-slate-300 dark:border-slate-700',
            accentButtonClass: 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/30'
        };
    }

    return res;
};

/**
 * Tính toán blueprint bố cục thích ứng thông minh (Contextual Layout Engine)
 * Phân tích tiến độ đơn hàng để làm nổi bật tác vụ cốt lõi ngay trên Hero Header
 */
export const getContextualLayoutBlueprint = (order: any): ContextualLayoutBlueprint => {
    const rawStatus = String(
        order?.['Trạng thái xử lý'] || 
        order?.['Kết quả'] || 
        order?.ket_qua || 
        order?.trang_thai || 
        ''
    ).toLowerCase().trim().normalize('NFC');

    const vin = (order?.VIN || order?.vin || '').trim();
    const hasInvoice = Boolean(
        order?.['Link hóa đơn đã xuất'] || 
        order?.link_hoa_don_da_xuat || 
        order?.url_hoa_don_da_xuat
    );

    // Giai đoạn 4: Đã giao xe / TD4 hoàn tất
    if (rawStatus.includes('đã giao') || rawStatus.includes('giao xe') || order?.has_td4 || order?.hasTd4) {
        return {
            stage: 'delivered',
            stageNumber: 4,
            stageTitle: 'Bàn Giao Xe Hoàn Tất',
            stageDescription: 'Xe đã bàn giao cho khách hàng và hoàn tất phiếu ra cổng (TD4).',
            primaryHeroAction: {
                id: 'view_td4',
                label: 'Xem Phiếu Hẹn Giao (TD4)',
                subtext: 'Đã sẵn sàng bàn giao',
                icon: 'fa-check-circle',
                variant: 'success',
                pulse: false,
                stageIndex: 4
            },
            secondaryActions: [
                { id: 'view_invoice', label: 'Xem Hóa Đơn', icon: 'fa-file-pdf', variant: 'info', pulse: false, stageIndex: 3 }
            ],
            activeSectionFocus: 'delivery',
            accentThemeClass: 'border-emerald-500/50 shadow-emerald-500/20'
        };
    }

    // Giai đoạn 3: Đã xuất hóa đơn (chờ bàn giao / PDI)
    if (hasInvoice || rawStatus.includes('đã xuất hóa đơn') || rawStatus.includes('invoiced') || rawStatus.includes('da xuat')) {
        return {
            stage: 'invoiced',
            stageNumber: 3,
            stageTitle: 'Hóa Đơn Đã Phát Hành',
            stageDescription: 'Hóa đơn điện tử M-Invoice đã cấp, sẵn sàng chuẩn bị hồ sơ xe PDI.',
            primaryHeroAction: {
                id: 'download_invoice',
                label: 'Tải Hóa Đơn M-Invoice PDF',
                subtext: 'Đã gửi mail cho TVBH',
                icon: 'fa-file-invoice-dollar',
                variant: 'primary',
                pulse: false,
                stageIndex: 3
            },
            secondaryActions: [
                { id: 'print_delivery_notice', label: 'In Thông Báo Giao Xe', icon: 'fa-print', variant: 'warning', pulse: false, stageIndex: 3 }
            ],
            activeSectionFocus: 'delivery',
            accentThemeClass: 'border-sky-500/50 shadow-sky-500/20'
        };
    }

    // Giai đoạn 2: Đã ghép VIN, đang chờ xuất hóa đơn / Chờ ký
    if (vin || rawStatus.includes('chờ ký') || rawStatus.includes('yêu cầu')) {
        return {
            stage: 'pending_invoice',
            stageNumber: 2,
            stageTitle: 'Đã Ghép VIN — Chờ Ký Hóa Đơn',
            stageDescription: 'Xe đã có số khung, đang chờ duyệt xuất hóa đơn điện tử.',
            primaryHeroAction: {
                id: 'auto_fetch_invoice',
                label: 'Lấy HĐ M-Invoice',
                subtext: 'Tra cứu & Gửi email TVBH',
                icon: 'fa-bolt',
                variant: 'warning',
                pulse: true,
                stageIndex: 2
            },
            secondaryActions: [
                { id: 'request_invoice', label: 'Duyệt Hồ Sơ XHĐ', icon: 'fa-clipboard-check', variant: 'primary', pulse: false, stageIndex: 2 }
            ],
            activeSectionFocus: 'invoice',
            accentThemeClass: 'border-amber-500/50 shadow-amber-500/20'
        };
    }

    // Giai đoạn 1: Mới nhận cọc, chưa ghép VIN
    return {
        stage: 'unmatched',
        stageNumber: 1,
        stageTitle: 'Đơn Hàng Mới — Chờ Ghép VIN',
        stageDescription: 'Đang rà soát tồn kho để gán số khung tối ưu cho đơn hàng.',
        primaryHeroAction: {
            id: 'pair_vin',
            label: 'Ghép Xe Ngay',
            subtext: 'Chọn xe từ kho K10/K15',
            icon: 'fa-link',
            variant: 'purple',
            pulse: true,
            stageIndex: 1
        },
        secondaryActions: [
            { id: 'check_stock', label: 'Kiểm Tra Tồn Kho', icon: 'fa-warehouse', variant: 'info', pulse: false, stageIndex: 1 }
        ],
        activeSectionFocus: 'pairing',
        accentThemeClass: 'border-indigo-500/50 shadow-indigo-500/20'
    };
};
