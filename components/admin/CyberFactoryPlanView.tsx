import React, { useState, useEffect, useMemo } from 'react';
import * as xlsx from 'xlsx';
import AnimatedBackground from '../ui/AnimatedBackground';
import { 
    searchCyberFactoryPlan, 
    getCyberPlanFilterOptions, 
    CyberPlanSearchParams,
    getCyberTonKhoReport,
    CyberTonKhoParams,
    CyberTonKhoItem,
    getCyberXepXeContracts,
    getCyberXepXeCandidates,
    saveCyberXepXe,
    deleteCyberXepXe,
    createCyberDnxTicket,
    getCyberVoucherTickets,
    CyberVoucherTicketItem,
    CyberXepXeContract,
    CyberXepXeCandidate,
    CyberXepXeFilterParams
} from '../../services/api/stockService';

interface CyberPlanCarItem {
    vin: string;
    so_may: string;
    ma_kx: string;
    ten_kx: string;
    phien_ban: string;
    dong_xe: string;
    ma_mau: string;
    ten_mau: string;
    ma_mau_nt: string;
    ten_mau_nt: string;
    nam_sx: number;
    ma_dms: string;
    ma_ttcp: string;
    ten_ttcp: string;
    vi_tri_kho: string;
    ghi_chu: string;
    ngay_phan_bo: string;
    ngay_ct: string;
    ma_ct: string;
    current_physical_warehouse?: string;
    raw_physical_warehouse?: string;
}

interface CyberFactoryPlanViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    isActive?: boolean;
}

// Tiện ích chuẩn hóa chuỗi loại bỏ dấu tiếng Việt (hỗ trợ tìm kiếm không dấu lẫn có dấu)
const removeVietnameseTones = (str: string): string => {
    return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase();
};

// Hàm lọc dữ liệu xe kế hoạch ngay trên máy khách (Hỗ trợ gõ từ khóa không dấu hoặc dán danh sách nhiều VIN từ Excel)
const filterCarsLocally = (carList: CyberPlanCarItem[], query: string): CyberPlanCarItem[] => {
    const rawQ = (query || '').trim();
    if (!rawQ) return carList;

    const qNoTone = removeVietnameseTones(rawQ).trim();
    if (!qNoTone) return carList;

    const isMultiItemPaste = /[\n\r\t,;]/.test(rawQ);

    if (isMultiItemPaste) {
        const tokens = rawQ
            .split(/[\n\r\t,;]+/)
            .map(t => removeVietnameseTones(t).trim())
            .filter(Boolean);

        if (tokens.length === 0) return carList;

        return carList.filter(car => {
            const vin = removeVietnameseTones(car.vin || '');
            const soMay = removeVietnameseTones(car.so_may || '');
            const dms = removeVietnameseTones(car.ma_dms || '');
            const full = `${vin} ${soMay} ${dms}`;
            return tokens.some(t => vin.includes(t) || soMay.includes(t) || dms.includes(t) || full.includes(t));
        });
    }

    const words = qNoTone.split(/\s+/).filter(Boolean);

    return carList.filter(car => {
        const vin = removeVietnameseTones(car.vin || '');
        const soMay = removeVietnameseTones(car.so_may || '');
        const dms = removeVietnameseTones(car.ma_dms || '');
        const model = removeVietnameseTones(car.dong_xe || car.ten_kx || car.ma_kx || '');
        const version = removeVietnameseTones(car.phien_ban || '');
        const color = removeVietnameseTones(car.ten_mau || car.ma_mau || '');
        const ttcp = removeVietnameseTones(car.ten_ttcp || car.ma_ttcp || '');
        const note = removeVietnameseTones(car.ghi_chu || '');
        const wh = removeVietnameseTones(car.current_physical_warehouse || car.vi_tri_kho || '');

        const fullText = `${vin} ${soMay} ${dms} ${model} ${version} ${color} ${ttcp} ${wh} ${note}`;

        if (fullText.includes(qNoTone)) return true;
        return words.every(w => fullText.includes(w));
    });
};

// Hàm lọc dữ liệu tồn kho ngay trên máy khách (Hỗ trợ gõ từ khóa không dấu hoặc dán danh sách nhiều VIN từ Excel)
const filterTonKhoLocally = (carList: CyberTonKhoItem[], query: string): CyberTonKhoItem[] => {
    const rawQ = (query || '').trim();
    if (!rawQ) return carList;

    const qNoTone = removeVietnameseTones(rawQ).trim();
    if (!qNoTone) return carList;

    const isMultiItemPaste = /[\n\r\t,;]/.test(rawQ);

    if (isMultiItemPaste) {
        const tokens = rawQ
            .split(/[\n\r\t,;]+/)
            .map(t => removeVietnameseTones(t).trim())
            .filter(Boolean);

        if (tokens.length === 0) return carList;

        return carList.filter(car => {
            const vin = removeVietnameseTones(car.vin || '');
            const soMay = removeVietnameseTones(car.so_may || '');
            const soHd = removeVietnameseTones(car.so_hd || '');
            const full = `${vin} ${soMay} ${soHd}`;
            return tokens.some(t => vin.includes(t) || soMay.includes(t) || soHd.includes(t) || full.includes(t));
        });
    }

    const words = qNoTone.split(/\s+/).filter(Boolean);

    return carList.filter(car => {
        const vin = removeVietnameseTones(car.vin || '');
        const soMay = removeVietnameseTones(car.so_may || '');
        const soHd = removeVietnameseTones(car.so_hd || '');
        const model = removeVietnameseTones(car.ten_kx || car.ma_kx || '');
        const color = removeVietnameseTones(car.ten_mau || car.ma_mau || '');
        const kho = removeVietnameseTones(car.ten_kho || car.ma_kho || '');
        const ttcp = removeVietnameseTones(car.ten_ttcp || '');
        const tvbh = removeVietnameseTones(car.tvbh || '');
        const note = removeVietnameseTones(car.ghi_chu || '');
        const status = removeVietnameseTones(car.tinh_trang || '');

        const fullText = `${vin} ${soMay} ${soHd} ${model} ${color} ${kho} ${ttcp} ${tvbh} ${note} ${status}`;

        if (fullText.includes(qNoTone)) return true;
        return words.every(w => fullText.includes(w));
    });
};

// Hàm lọc dữ liệu hợp đồng xếp xe ngay trên máy khách (Hỗ trợ gõ từ khóa tiếng Việt không dấu hoặc dán nhiều số HĐ/VIN từ Excel)
const filterXepXeLocally = (contracts: CyberXepXeContract[], query: string): CyberXepXeContract[] => {
    const rawQ = (query || '').trim();
    if (!rawQ) return contracts;

    const qNoTone = removeVietnameseTones(rawQ).trim();
    if (!qNoTone) return contracts;

    // Kiểm tra xem người dùng có đang dán danh sách nhiều mục từ Excel hay không (phân cách bởi xuống dòng, tab, phẩy, chấm phẩy)
    const isMultiItemPaste = /[\n\r\t,;]/.test(rawQ);

    if (isMultiItemPaste) {
        const tokens = rawQ
            .split(/[\n\r\t,;]+/)
            .map(t => removeVietnameseTones(t).trim())
            .filter(Boolean);

        if (tokens.length === 0) return contracts;

        return contracts.filter(c => {
            const maHd = removeVietnameseTones(c.ma_hd || '');
            const soCt = removeVietnameseTones(c.so_ct || '');
            const vin = removeVietnameseTones(c.so_khung || '');
            const sdt = removeVietnameseTones(c.dien_thoai || '');
            const tenKh = removeVietnameseTones(c.ten_kh || '');
            const model = removeVietnameseTones(c.ten_kx || c.ma_kx || '');
            const full = `${maHd} ${soCt} ${vin} ${sdt} ${tenKh} ${model}`;

            return tokens.some(t => maHd.includes(t) || soCt.includes(t) || vin.includes(t) || sdt.includes(t) || full.includes(t));
        });
    }

    // Khi người dùng gõ từ khóa tìm kiếm thông thường (hỗ trợ gõ không dấu hoặc có dấu)
    const words = qNoTone.split(/\s+/).filter(Boolean);

    return contracts.filter(c => {
        const maHd = removeVietnameseTones(c.ma_hd || '');
        const soCt = removeVietnameseTones(c.so_ct || '');
        const tenKh = removeVietnameseTones(c.ten_kh || '');
        const sdt = removeVietnameseTones(c.dien_thoai || '');
        const vin = removeVietnameseTones(c.so_khung || '');
        const model = removeVietnameseTones(c.ten_kx || c.ma_kx || '');
        const color = removeVietnameseTones(c.ten_mau || c.ma_mau || '');
        const colorNt = removeVietnameseTones(c.ten_mau_nt || c.ma_mau_nt || '');
        const ttcp = removeVietnameseTones(c.ten_ttcp || '');
        const status = removeVietnameseTones(c.ten_color || '');
        const tvbh = removeVietnameseTones(c.ten_hs || '');

        const fullText = `${maHd} ${soCt} ${tenKh} ${sdt} ${vin} ${model} ${color} ${colorNt} ${ttcp} ${status} ${tvbh}`;

        // Khớp toàn bộ cụm từ
        if (fullText.includes(qNoTone)) return true;

        // Hoặc tất cả các từ trong cụm đều xuất hiện
        return words.every(w => fullText.includes(w));
    });
};

// Bảng màu trạng thái khớp 100% CyberSoft ERP
const getStatusBadgeStyle = (status: string, backColor: string) => {
    const s = (status || '').toLowerCase();
    const bc = (backColor || '').toLowerCase();

    if (bc === 'cyan' || s.includes('đã ghép')) {
        return {
            rowClass: 'bg-cyan-50/60 hover:bg-cyan-100/60 border-cyan-200/80',
            badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold',
            dotColor: 'bg-cyan-500',
            label: status || 'Đã ghép SK'
        };
    }
    if (bc === 'violet' || s.includes('đã xuất')) {
        return {
            rowClass: 'bg-purple-50/50 hover:bg-purple-100/50 border-purple-200/80',
            badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
            dotColor: 'bg-purple-500',
            label: status || 'Đã xuất HĐ'
        };
    }
    if (bc === 'greenyellow' || s.includes('chờ duyệt')) {
        return {
            rowClass: 'bg-lime-50/50 hover:bg-lime-100/50 border-lime-200/80',
            badgeClass: 'bg-lime-100 text-lime-900 border-lime-300 font-bold',
            dotColor: 'bg-lime-500',
            label: status || 'Chờ duyệt'
        };
    }
    if (bc === 'yellow' || s.includes('qh đặt cọc') || s.includes('quá hạn')) {
        return {
            rowClass: 'bg-amber-50/60 hover:bg-amber-100/60 border-amber-200/80',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
            dotColor: 'bg-amber-500',
            label: status || 'QH đặt cọc'
        };
    }
    if (bc === 'red' || s.includes('hủy')) {
        return {
            rowClass: 'bg-rose-50/60 hover:bg-rose-100/60 border-rose-200/80',
            badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
            dotColor: 'bg-rose-500',
            label: status || 'Hủy'
        };
    }
    return {
        rowClass: 'bg-white hover:bg-slate-50 border-slate-100',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 font-bold',
        dotColor: 'bg-slate-400',
        label: status || 'Chờ ghép SK'
    };
};

export const CyberFactoryPlanView: React.FC<CyberFactoryPlanViewProps> = ({
    showToast,
    isActive = true
}) => {
    // Sub-tab switcher: 'factory_plan' | 'ton_kho' | 'xep_xe' | 'de_nghi_xuat' | 'tra_cuu_phieu'
    const [activeSubTab, setActiveSubTab] = useState<'factory_plan' | 'ton_kho' | 'xep_xe' | 'de_nghi_xuat' | 'tra_cuu_phieu'>('factory_plan');

    // -------------------------------------------------------------
    // SUB-TAB 4: LẬP ĐỀ NGHỊ XUẤT XE / ĐIỀU CHUYỂN XE (PHDNX & CTDNX)
    // -------------------------------------------------------------
    const [dnxVinInput, setDnxVinInput] = useState('');
    const [dnxMaKhoXuat, setDnxMaKhoXuat] = useState('K87');
    const [dnxMaKhoNhan, setDnxMaKhoNhan] = useState('K83');
    const [dnxKhachHang, setDnxKhachHang] = useState('');
    const [dnxLyDo, setDnxLyDo] = useState('Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH');
    const [dnxUserName, setDnxUserName] = useState('02.NHANPT');
    const [isSubmittingDnx, setIsSubmittingDnx] = useState(false);
    const [dnxResult, setDnxResult] = useState<any>(null);
    const [dnxError, setDnxError] = useState('');
    const [recentDnxTickets, setRecentDnxTickets] = useState<any[]>([]);

    const handleCreateDnxSubmitInAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawVins = dnxVinInput
            .split(/[\n,;\s]+/)
            .map(v => v.trim().toUpperCase())
            .filter(v => v.length >= 8);

        if (rawVins.length === 0) {
            setDnxError('Vui lòng nhập hoặc dán ít nhất 1 số VIN hợp lệ');
            return;
        }

        setIsSubmittingDnx(true);
        setDnxError('');
        setDnxResult(null);

        try {
            const res = await createCyberDnxTicket({
                vins: rawVins,
                ma_kho_xuat: dnxMaKhoXuat,
                ma_kho_nhan: dnxMaKhoNhan,
                khach_hang: dnxKhachHang,
                ly_do: dnxLyDo,
                user_name: dnxUserName,
                ma_dvcs: '02',
                ma_ttcp: '02.01.20'
            });

            if (res.success) {
                setDnxResult(res);
                showToast('Tạo giấy chuyển Cyber', `Đã tạo thành công phiếu ${res.so_ct} cho ${res.total_cars} xe`, 'success');
                setRecentDnxTickets(prev => [res, ...prev]);
                setDnxVinInput('');
            } else {
                setDnxError(res.error || 'Lỗi không thể tạo giấy chuyển trên Cyber');
            }
        } catch (err: any) {
            setDnxError(err.message || 'Lỗi hệ thống kết nối Cyber');
        } finally {
            setIsSubmittingDnx(false);
        }
    };

    // -------------------------------------------------------------
    // SUB-TAB 5: TRA CỨU & TIẾN TRÌNH DUYỆT PHIẾU (DNX & TD4)
    // -------------------------------------------------------------
    const [voucherTickets, setVoucherTickets] = useState<CyberVoucherTicketItem[]>([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(false);
    const [ticketMaCt, setTicketMaCt] = useState('');
    const [ticketMaPost, setTicketMaPost] = useState('');
    const [ticketSearch, setTicketSearch] = useState('');
    const [selectedTicketModal, setSelectedTicketModal] = useState<CyberVoucherTicketItem | null>(null);

    const executeVoucherTicketsSearch = async () => {
        setIsLoadingTickets(true);
        try {
            const res = await getCyberVoucherTickets({
                ma_ct: ticketMaCt,
                ma_post: ticketMaPost,
                search: ticketSearch,
                limit: 250
            });
            if (res && res.success) {
                setVoucherTickets(res.data || []);
            } else {
                throw new Error(res?.error || 'Lỗi tra cứu chứng từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi tra cứu', err.message || 'Không thể lấy dữ liệu chứng từ CyberSoft', 'error');
        } finally {
            setIsLoadingTickets(false);
        }
    };

    // Lọc tức thì dữ liệu chứng từ trên máy khách khi nhập từ khóa tìm kiếm
    const displayedVoucherTickets = useMemo(() => {
        const rawQ = (ticketSearch || '').trim();
        if (!rawQ) return voucherTickets;
        const qNoTone = removeVietnameseTones(rawQ);
        return voucherTickets.filter(t => {
            const fullText = removeVietnameseTones(`${t.so_ct} ${t.vin} ${t.so_may} ${t.ten_kh} ${t.so_hd} ${t.dien_giai} ${t.voucher_name} ${t.loai_xe}`);
            return fullText.includes(qNoTone);
        });
    }, [voucherTickets, ticketSearch]);

    // -------------------------------------------------------------
    // SUB-TAB 1: KẾ HOẠCH GIAO XE (K10/K15 CHƯA XHĐ)
    // -------------------------------------------------------------
    const [keyword, setKeyword] = useState('');
    const [selectedModel, setSelectedModel] = useState('Tất cả');
    const [selectedVersion, setSelectedVersion] = useState('Tất cả');
    const [selectedColor, setSelectedColor] = useState('Tất cả');
    const [selectedTtcp, setSelectedTtcp] = useState('');

    const [filterOptions, setFilterOptions] = useState<{ ttcp_list: any[]; models: string[]; versions: string[]; colors: string[] }>({
        ttcp_list: [],
        models: [],
        versions: [],
        colors: []
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    const [isLoadingColors, setIsLoadingColors] = useState(false);
    const [cars, setCars] = useState<CyberPlanCarItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);
    const [copiedVin, setCopiedVin] = useState<string | null>(null);

    // Dữ liệu hiển thị tức thì sau khi lọc trên máy khách (hỗ trợ dán nhiều VIN)
    const displayedCars = useMemo(() => {
        return filterCarsLocally(cars, keyword);
    }, [cars, keyword]);

    // -------------------------------------------------------------
    // SUB-TAB 2: BÁO CÁO TỒN KHO XE (CP_BETONXE TỪ CYBERSOFT)
    // -------------------------------------------------------------
    const [tonKhoFromDate, setTonKhoFromDate] = useState('2025-07-01');
    const [tonKhoToDate, setTonKhoToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [tonKhoWarehouse, setTonKhoWarehouse] = useState('');
    const [tonKhoModel, setTonKhoModel] = useState('');
    // Mặc định né toàn bộ xe đã viết HĐ, chỉ hiển thị xe chưa viết hóa đơn
    const [tonKhoStatus, setTonKhoStatus] = useState<'all' | 'invoiced' | 'not_invoiced'>('not_invoiced');
    const [tonKhoKeyword, setTonKhoKeyword] = useState('');

    const [isLoadingTonKho, setIsLoadingTonKho] = useState(false);
    const [hasLoadedTonKho, setHasLoadedTonKho] = useState(false);
    const [tonKhoCars, setTonKhoCars] = useState<CyberTonKhoItem[]>([]);
    const [tonKhoTotal, setTonKhoTotal] = useState(0);
    const [tonKhoInvoiced, setTonKhoInvoiced] = useState(0);
    const [tonKhoNotInvoiced, setTonKhoNotInvoiced] = useState(0);
    const [tonKhoWarehouses, setTonKhoWarehouses] = useState<{ code: string; name: string }[]>([]);
    const [tonKhoModels, setTonKhoModels] = useState<string[]>([]);
    const [tonKhoCopiedVin, setTonKhoCopiedVin] = useState<string | null>(null);

    // Dữ liệu tồn kho hiển thị tức thì sau khi lọc trên máy khách (hỗ trợ dán nhiều VIN)
    const displayedTonKhoCars = useMemo(() => {
        return filterTonKhoLocally(tonKhoCars, tonKhoKeyword);
    }, [tonKhoCars, tonKhoKeyword]);

    // -------------------------------------------------------------
    // SUB-TAB 3: XẾP XE HỢP ĐỒNG (CP_BEXEPXE TỪ CYBERSOFT)
    // -------------------------------------------------------------
    const currentNow = new Date();
    const currM = currentNow.getMonth() + 1;
    const currY = currentNow.getFullYear();

    const [xepXeThang1, setXepXeThang1] = useState<number>(currM);
    const [xepXeNam1, setXepXeNam1] = useState<number>(currY);
    const [xepXeThang2, setXepXeThang2] = useState<number>(currM);
    const [xepXeNam2, setXepXeNam2] = useState<number>(currY);

    const DEFAULT_SHOWROOM = 'Ô tô Vinfast Thuận An';
    const [xepXeShowroom, setXepXeShowroom] = useState<string>(DEFAULT_SHOWROOM);
    const [xepXeModel, setXepXeModel] = useState<string>('');
    const [xepXeStatusFilter, setXepXeStatusFilter] = useState<string>('approved_and_pending');
    const [xepXeKeyword, setXepXeKeyword] = useState<string>('');

    const [isLoadingXepXe, setIsLoadingXepXe] = useState<boolean>(false);
    const [hasLoadedXepXe, setHasLoadedXepXe] = useState<boolean>(false);
    const [xepXeContracts, setXepXeContracts] = useState<CyberXepXeContract[]>([]);
    const [xepXeStatusCounts, setXepXeStatusCounts] = useState<Record<string, number>>({});
    const [xepXeShowrooms, setXepXeShowrooms] = useState<string[]>([]);
    const [xepXeModels, setXepXeModels] = useState<string[]>([]);
    const [xepXeCopiedVin, setXepXeCopiedVin] = useState<string | null>(null);

    // Modal Xếp xe / Tra cứu xe khả dụng
    const [selectedContractForAssign, setSelectedContractForAssign] = useState<CyberXepXeContract | null>(null);
    const [candidateCars, setCandidateCars] = useState<CyberXepXeCandidate[]>([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(false);
    const [selectedCandidateVin, setSelectedCandidateVin] = useState<string>('');
    const [candidateSearchQuery, setCandidateSearchQuery] = useState<string>('');
    const [isSavingAssign, setIsSavingAssign] = useState<boolean>(false);

    // Modal xác nhận Hủy ghép xe
    const [contractToUnassign, setContractToUnassign] = useState<CyberXepXeContract | null>(null);
    const [isDeletingAssign, setIsDeletingAssign] = useState<boolean>(false);

    // Danh sách hợp đồng hiển thị sau khi lọc trên client
    const displayedXepXeContracts = useMemo(() => {
        let list = xepXeContracts;

        // 1. Nếu có từ khóa tìm kiếm (gõ từ khóa hoặc dán nhiều VIN/HĐ từ Excel)
        if (xepXeKeyword.trim()) {
            // Tìm kiếm ngay trên TOÀN BỘ dữ liệu hợp đồng đã tải về
            list = filterXepXeLocally(list, xepXeKeyword);

            // Khi đang tìm kiếm, nếu người dùng bấm chọn 1 trạng thái cụ thể (khác approved_and_pending mặc định và khác all)
            if (xepXeStatusFilter && xepXeStatusFilter !== 'all' && xepXeStatusFilter !== 'approved_and_pending') {
                list = list.filter(c => (c.ten_color || '').trim().toLowerCase() === xepXeStatusFilter.trim().toLowerCase());
            }
        } else {
            // Khi không tìm kiếm: áp dụng lọc trạng thái mặc định (approved_and_pending) hoặc trạng thái được chọn
            if (xepXeStatusFilter === 'approved_and_pending') {
                list = list.filter(c => {
                    const s = (c.ten_color || '').trim().toLowerCase();
                    return s === 'chờ duyệt' || s === 'đã ghép sk' || s === 'chờ ghép sk';
                });
            } else if (xepXeStatusFilter && xepXeStatusFilter !== 'all') {
                list = list.filter(c => (c.ten_color || '').trim().toLowerCase() === xepXeStatusFilter.trim().toLowerCase());
            }
        }

        if (xepXeShowroom) {
            const srLower = xepXeShowroom.toLowerCase();
            list = list.filter(c => (c.ten_ttcp || '').toLowerCase().includes(srLower) || srLower.includes((c.ten_ttcp || '').toLowerCase()));
        }

        if (xepXeModel) {
            list = list.filter(c => (c.ten_kx || c.ma_kx || '').toLowerCase() === xepXeModel.toLowerCase());
        }

        return list;
    }, [xepXeContracts, xepXeStatusFilter, xepXeShowroom, xepXeModel, xepXeKeyword]);

    // Lọc danh sách candidate cars trong modal
    const displayedCandidateCars = useMemo(() => {
        const q = candidateSearchQuery.trim().toLowerCase();
        if (!q) return candidateCars;
        return candidateCars.filter(c => 
            (c.so_khung || '').toLowerCase().includes(q) ||
            (c.so_may || '').toLowerCase().includes(q) ||
            (c.dien_giai || '').toLowerCase().includes(q)
        );
    }, [candidateCars, candidateSearchQuery]);

    // Load filter options for Sub-tab 1
    const loadFilterOptions = async (modelName?: string, isInitial = false) => {
        if (isInitial) setIsLoadingFilters(true);
        setIsLoadingColors(true);
        try {
            const res = await getCyberPlanFilterOptions(modelName === 'Tất cả' ? '' : modelName);
            if (res && res.success) {
                setFilterOptions(prev => ({
                    ttcp_list: res.ttcp_list && res.ttcp_list.length > 0 ? res.ttcp_list : prev.ttcp_list,
                    models: res.models && res.models.length > 0 ? res.models : prev.models,
                    versions: res.versions || [],
                    colors: res.colors || []
                }));
            }
        } finally {
            setIsLoadingColors(false);
            setIsLoadingFilters(false);
        }
    };

    // Khi tab active: tải danh mục tùy chọn (Dòng xe, Showroom) nếu chưa tải
    useEffect(() => {
        if (isActive && filterOptions.models.length === 0) {
            loadFilterOptions(selectedModel, true);
        }
    }, [isActive]);

    // Tự động tải dữ liệu tồn kho lần đầu khi chuyển sang Sub-tab Tồn kho
    useEffect(() => {
        if (isActive && activeSubTab === 'ton_kho' && !hasLoadedTonKho) {
            executeTonKhoSearch();
        }
    }, [isActive, activeSubTab]);

    // Tự động tải danh sách phiếu & tiến trình duyệt khi chuyển sang Sub-tab Tra cứu phiếu
    useEffect(() => {
        if (isActive && activeSubTab === 'tra_cuu_phieu') {
            executeVoucherTicketsSearch();
        }
    }, [isActive, activeSubTab, ticketMaCt, ticketMaPost]);

    const handleModelChange = (newModel: string) => {
        setSelectedModel(newModel);
        setSelectedVersion('Tất cả');
        setSelectedColor('Tất cả');
        loadFilterOptions(newModel);
        // Tự động tìm kiếm luôn cho dòng xe được chọn
        executeSearch({ model: newModel === 'Tất cả' ? '' : newModel, version: '', color: '' });
    };

    const executeSearch = async (overrideParams?: Partial<CyberPlanSearchParams>) => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const params: CyberPlanSearchParams = {
                // Nếu dán danh sách nhiều VIN, không gửi chuỗi dài vào LIKE backend, để client-side lọc
                keyword: keyword.includes('\n') || keyword.includes(',') ? '' : keyword.trim(),
                model: selectedModel === 'Tất cả' ? '' : selectedModel,
                version: selectedVersion === 'Tất cả' ? '' : selectedVersion,
                color: selectedColor === 'Tất cả' ? '' : selectedColor,
                ttcp: selectedTtcp,
                limit: 250,
                offset: 0,
                ...overrideParams
            };

            const res = await searchCyberFactoryPlan(params);
            if (res && res.success) {
                setCars(res.cars || []);
                setTotalCount(res.total || 0);
            } else {
                throw new Error(res?.error || 'Lỗi tra cứu kế hoạch.');
            }
        } catch (err: any) {
            showToast('Lỗi tra cứu', err.message || 'Không thể tra cứu dữ liệu từ CyberSoft', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setKeyword('');
        setSelectedModel('Tất cả');
        setSelectedVersion('Tất cả');
        setSelectedColor('Tất cả');
        setSelectedTtcp('');
        setHasSearched(false);
        setCars([]);
        setTotalCount(0);
        loadFilterOptions('Tất cả');
    };

    const handleCopyVin = (vin: string) => {
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        setTimeout(() => setCopiedVin(null), 2000);
    };

    const handleExportExcel = () => {
        const targetList = displayedCars.length > 0 ? displayedCars : cars;
        if (targetList.length === 0) {
            showToast('Không có dữ liệu', 'Chưa có xe nào trong kết quả để xuất file.', 'warning');
            return;
        }

        const exportRows = targetList.map((c, idx) => ({
            'STT': idx + 1,
            'Số VIN': c.vin,
            'Số máy': c.so_may,
            'Dòng xe': c.dong_xe || c.ten_kx,
            'Phiên bản': c.phien_ban,
            'Ngoại thất': c.ten_mau,
            'Nội thất': c.ten_mau_nt,
            'Năm SX': c.nam_sx,
            'Đơn vị nhận (TTCP)': c.ten_ttcp,
            'Mã TTCP': c.ma_ttcp,
            'Vị trí kho thực tế': c.current_physical_warehouse || '',
            'Kho trên phiếu': c.vi_tri_kho || '',
            'Mã DMS (XHĐ)': c.ma_dms,
            'Ngày chứng từ': c.ngay_ct,
            'Ngày phân bổ': c.ngay_phan_bo,
            'Loại chứng từ': c.ma_ct,
            'Ghi chú': c.ghi_chu
        }));

        const ws = xlsx.utils.json_to_sheet(exportRows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'KeHoachGiaoXeCyber');
        const fileName = `Ke_Hoach_Giao_Xe_CyberSoft_${new Date().toISOString().slice(0, 10)}.xlsx`;
        xlsx.writeFile(wb, fileName);
        showToast('Xuất Excel thành công', `Đã tải về file ${fileName} (${targetList.length} xe)`, 'success');
    };

    // -------------------------------------------------------------
    // HANDLERS FOR SUB-TAB 2: BÁO CÁO TỒN KHO XE
    // -------------------------------------------------------------
    const executeTonKhoSearch = async (overrideParams?: Partial<CyberTonKhoParams>) => {
        setIsLoadingTonKho(true);
        setHasLoadedTonKho(true);
        try {
            const params: CyberTonKhoParams = {
                fromDate: tonKhoFromDate,
                toDate: tonKhoToDate,
                warehouse: tonKhoWarehouse,
                model: tonKhoModel,
                status: tonKhoStatus,
                // Nếu dán nhiều dòng/nhiều VIN, không gửi vào backend LIKE mà để client lọc
                keyword: tonKhoKeyword.includes('\n') || tonKhoKeyword.includes(',') ? '' : tonKhoKeyword.trim(),
                ...overrideParams
            };

            const res = await getCyberTonKhoReport(params);
            if (res && res.success) {
                setTonKhoCars(res.cars || []);
                setTonKhoTotal(res.total || 0);
                setTonKhoInvoiced(res.invoiced_count || 0);
                setTonKhoNotInvoiced(res.not_invoiced_count || 0);
                if (res.warehouses && res.warehouses.length > 0) {
                    setTonKhoWarehouses(res.warehouses);
                }
                if (res.models && res.models.length > 0) {
                    setTonKhoModels(res.models);
                }
            } else {
                throw new Error(res?.error || 'Lỗi truy vấn báo cáo tồn kho từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi tồn kho Cyber', err.message || 'Không thể tải báo cáo tồn kho CyberSoft', 'error');
        } finally {
            setIsLoadingTonKho(false);
        }
    };

    const handleTonKhoReset = () => {
        setTonKhoKeyword('');
        setTonKhoWarehouse('');
        setTonKhoModel('');
        setTonKhoStatus('not_invoiced');
        executeTonKhoSearch({
            keyword: '',
            warehouse: '',
            model: '',
            status: 'not_invoiced'
        });
    };

    const handleTonKhoCopyVin = (vin: string) => {
        navigator.clipboard.writeText(vin);
        setTonKhoCopiedVin(vin);
        setTimeout(() => setTonKhoCopiedVin(null), 2000);
    };

    const handleExportTonKhoExcel = () => {
        const targetList = displayedTonKhoCars.length > 0 ? displayedTonKhoCars : tonKhoCars;
        if (targetList.length === 0) {
            showToast('Không có dữ liệu', 'Không có dữ liệu tồn kho để xuất file.', 'warning');
            return;
        }

        const exportRows = targetList.map((c, idx) => ({
            'STT': idx + 1,
            'Số hóa đơn': c.so_hd,
            'Ngày HĐ nhập': c.ngay_hd,
            'Tháng nhập HĐ': c.thang_hd,
            'Mã kiểu xe': c.ma_kx,
            'Kiểu xe': c.ten_kx,
            'Số khung': c.vin,
            'Số máy': c.so_may,
            'Mã màu': c.ma_mau,
            'Tên màu': c.ten_mau,
            'Mã màu NT': c.ma_mau_nt,
            'Tên màu NT': c.ten_mau_nt,
            'Mã kho': c.ma_kho,
            'Tên kho': c.ten_kho,
            'Tuổi tồn (ngày)': c.ngay_ton,
            'Năm SX': c.nam_sx,
            'Tình trạng': c.tinh_trang || (c.is_invoiced ? 'Xe đã được viết hóa đơn' : ''),
            'Đơn vị bán / Showroom': c.ten_ttcp,
            'Tư vấn bán hàng (TVBH)': c.tvbh,
            'Ghi chú': c.ghi_chu
        }));

        const ws = xlsx.utils.json_to_sheet(exportRows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'BaoCaoTonKhoXeCyber');
        const fileName = `Bao_Cao_Ton_Kho_Xe_CyberSoft_${tonKhoFromDate}_den_${tonKhoToDate}.xlsx`;
        xlsx.writeFile(wb, fileName);
        showToast('Xuất Excel thành công', `Đã tải về file ${fileName} (${targetList.length} xe)`, 'success');
    };

    // -------------------------------------------------------------
    // HANDLERS FOR SUB-TAB 3: XẾP XE HỢP ĐỒNG (CP_BEXEPXE)
    // -------------------------------------------------------------
    const executeXepXeSearch = async (overrides?: Partial<CyberXepXeFilterParams>) => {
        setIsLoadingXepXe(true);
        setHasLoadedXepXe(true);
        try {
            const currentShowroom = overrides?.showroom !== undefined ? overrides.showroom : xepXeShowroom;
            const params: CyberXepXeFilterParams = {
                thang1: xepXeThang1,
                nam1: xepXeNam1,
                thang2: xepXeThang2,
                nam2: xepXeNam2,
                ma_dvcs: '02',
                showroom: currentShowroom,
                ...overrides
            };
            const res = await getCyberXepXeContracts(params);
            if (res && res.success) {
                setXepXeContracts(res.contracts || []);
                setXepXeStatusCounts(res.status_counts || {});
                if (res.showrooms && res.showrooms.length > 0) setXepXeShowrooms(res.showrooms);
                if (res.models && res.models.length > 0) setXepXeModels(res.models);
            } else {
                throw new Error(res?.error || 'Lỗi tải danh sách hợp đồng xếp xe từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi xếp xe Cyber', err.message || 'Không thể tải danh sách hợp đồng', 'error');
        } finally {
            setIsLoadingXepXe(false);
        }
    };

    const handleXepXeReset = () => {
        setXepXeShowroom(DEFAULT_SHOWROOM);
        setXepXeModel('');
        setXepXeStatusFilter('approved_and_pending');
        setXepXeKeyword('');
        executeXepXeSearch({
            showroom: DEFAULT_SHOWROOM,
            ma_kx: '',
            ma_hd: ''
        });
    };

    const handleOpenAssignModal = async (contract: CyberXepXeContract) => {
        setSelectedContractForAssign(contract);
        setSelectedCandidateVin('');
        setCandidateSearchQuery('');
        setIsLoadingCandidates(true);
        try {
            const res = await getCyberXepXeCandidates({
                stt_rec: contract.stt_rec,
                stt_rec0: contract.stt_rec0,
                ma_dvcs: contract.ma_dvcs || '02'
            });
            if (res && res.success) {
                setCandidateCars(res.candidates || []);
            } else {
                showToast('Không có xe phù hợp', res?.error || 'Không tìm thấy xe phù hợp trong kế hoạch/kho', 'warning');
                setCandidateCars([]);
            }
        } catch (err: any) {
            showToast('Lỗi tìm xe', err.message || 'Lỗi khi tra cứu danh sách xe khả dụng', 'error');
            setCandidateCars([]);
        } finally {
            setIsLoadingCandidates(false);
        }
    };

    const handleConfirmAssign = async () => {
        if (!selectedContractForAssign || !selectedCandidateVin) {
            showToast('Chưa chọn xe', 'Vui lòng chọn một số khung xe từ danh sách để ghép', 'warning');
            return;
        }

        setIsSavingAssign(true);
        try {
            const res = await saveCyberXepXe({
                ma_hd: selectedContractForAssign.ma_hd,
                stt_rec: selectedContractForAssign.stt_rec,
                stt_rec0: selectedContractForAssign.stt_rec0,
                so_khung: selectedCandidateVin,
                ma_dvcs: selectedContractForAssign.ma_dvcs || '02',
                user_name: 'SYSTEM'
            });

            if (res && res.success) {
                showToast('Ghép xe thành công', `Đã xếp xe ${selectedCandidateVin} vào hợp đồng ${selectedContractForAssign.ma_hd}`, 'success');
                setSelectedContractForAssign(null);
                await executeXepXeSearch();
            } else {
                throw new Error(res?.error || res?.note || 'Không thể lưu xếp xe vào CyberSoft');
            }
        } catch (err: any) {
            showToast('Lỗi xếp xe', err.message || 'Lỗi khi thực hiện xếp xe', 'error');
        } finally {
            setIsSavingAssign(false);
        }
    };

    const handleConfirmUnassign = async () => {
        if (!contractToUnassign || !contractToUnassign.so_khung) return;

        setIsDeletingAssign(true);
        try {
            const res = await deleteCyberXepXe({
                ma_hd: contractToUnassign.ma_hd,
                stt_rec: contractToUnassign.stt_rec,
                stt_rec0: contractToUnassign.stt_rec0,
                so_khung: contractToUnassign.so_khung,
                ma_dvcs: contractToUnassign.ma_dvcs || '02',
                user_name: 'SYSTEM'
            });

            if (res && res.success) {
                showToast('Hủy ghép thành công', `Đã hủy ghép xe ${contractToUnassign.so_khung} khỏi HĐ ${contractToUnassign.ma_hd}`, 'success');
                setContractToUnassign(null);
                await executeXepXeSearch();
            } else {
                throw new Error(res?.error || res?.note || 'Không thể hủy ghép xe');
            }
        } catch (err: any) {
            showToast('Lỗi hủy ghép', err.message || 'Lỗi khi hủy ghép xe', 'error');
        } finally {
            setIsDeletingAssign(false);
        }
    };

    const handleXepXeCopyVin = (vin: string) => {
        if (!vin) return;
        navigator.clipboard.writeText(vin);
        setXepXeCopiedVin(vin);
        setTimeout(() => setXepXeCopiedVin(null), 2000);
    };

    const handleExportXepXeExcel = () => {
        const targetList = displayedXepXeContracts.length > 0 ? displayedXepXeContracts : xepXeContracts;
        if (targetList.length === 0) {
            showToast('Không có dữ liệu', 'Không có hợp đồng để xuất Excel.', 'warning');
            return;
        }

        const exportRows = targetList.map((c, idx) => ({
            'STT': idx + 1,
            'Trạng thái': c.ten_color,
            'Số HĐ': c.ma_hd,
            'Số chứng từ': c.so_ct,
            'Ngày lập HĐ': c.ngay_ct,
            'Ngày giao xe': c.ngay_gx,
            'Tên khách hàng': c.ten_kh,
            'Số điện thoại': c.dien_thoai,
            'Dòng xe': c.ten_kx,
            'Mã kiểu xe': c.ma_kx,
            'Màu ngoại thất': c.ten_mau,
            'Màu nội thất': c.ten_mau_nt,
            'Số khung đã ghép': c.so_khung,
            'Ngày ghép': c.ngay_xep,
            'Tổng giá trị': c.tien_nt,
            'Đã thanh toán': c.da_tt,
            'Còn nợ': c.con_no,
            'Showroom / Đơn vị': c.ten_ttcp,
            'Tư vấn bán hàng': c.ten_hs,
            'Bộ phận': c.ten_bp
        }));

        const ws = xlsx.utils.json_to_sheet(exportRows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'XepXeHopDongCyber');
        const fileName = `Xep_Xe_Hop_Dong_CyberSoft_Thang_${xepXeThang1}_${xepXeNam1}.xlsx`;
        xlsx.writeFile(wb, fileName);
        showToast('Xuất Excel thành công', `Đã tải về file ${fileName} (${targetList.length} hợp đồng)`, 'success');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-slate-200 overflow-hidden animate-fade-in relative z-0 font-sans">
            <AnimatedBackground />

            {/* TOP SUB-TAB NAVIGATION BAR */}
            <div className="relative z-10 px-4 pt-2.5 pb-0 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-1 sm:gap-2">
                    {/* Tab 1: Kế Hoạch Nhà Máy Giao */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('factory_plan')}
                        className={`relative pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                            activeSubTab === 'factory_plan'
                                ? 'text-blue-600 border-blue-600 bg-blue-50/40 rounded-t-lg'
                                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <i className="fas fa-truck-ramp-box text-sm"></i>
                        <span>Kế Hoạch Nhà Máy Giao (K10/K15)</span>
                        {totalCount > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                                {totalCount.toLocaleString()}
                            </span>
                        )}
                    </button>

                    {/* Tab 2: Báo Cáo Tồn Kho Xe */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('ton_kho')}
                        className={`relative pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                            activeSubTab === 'ton_kho'
                                ? 'text-blue-600 border-blue-600 bg-blue-50/40 rounded-t-lg'
                                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <i className="fas fa-warehouse text-sm"></i>
                        <span>Báo Cáo Tồn Kho Xe (Admin)</span>
                        {tonKhoNotInvoiced > 0 ? (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700" title={`Chưa xuất HĐ: ${tonKhoNotInvoiced} / Tổng tồn: ${tonKhoTotal}`}>
                                {tonKhoNotInvoiced.toLocaleString()}
                            </span>
                        ) : tonKhoCars.length > 0 ? (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                                {tonKhoCars.length.toLocaleString()}
                            </span>
                        ) : null}
                    </button>

                    {/* Tab 3: Xếp Xe Hợp Đồng */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('xep_xe')}
                        className={`relative pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                            activeSubTab === 'xep_xe'
                                ? 'text-indigo-600 border-indigo-600 bg-indigo-50/40 rounded-t-lg'
                                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <i className="fas fa-car-side text-sm"></i>
                        <span>Xếp Xe Hợp Đồng (Cyber)</span>
                        {xepXeContracts.length > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
                                {xepXeContracts.length.toLocaleString()}
                            </span>
                        )}
                    </button>

                    {/* Tab 4: Đề Nghị Xuất Xe / Điều Chuyển Xe (Admin Only) */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('de_nghi_xuat')}
                        className={`relative pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                            activeSubTab === 'de_nghi_xuat'
                                ? 'text-emerald-600 border-emerald-600 bg-emerald-50/40 rounded-t-lg'
                                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <i className="fas fa-truck text-sm text-emerald-600"></i>
                        <span>Đề Nghị Xuất Xe (Cyber)</span>
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase border border-emerald-300">
                            Admin
                        </span>
                    </button>

                    {/* Tab 5: Tiến Trình Duyệt Phiếu (DNX & Xe Ra) */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('tra_cuu_phieu')}
                        className={`relative pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
                            activeSubTab === 'tra_cuu_phieu'
                                ? 'text-purple-600 border-purple-600 bg-purple-50/40 rounded-t-lg'
                                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <i className="fas fa-file-invoice text-sm text-purple-600"></i>
                        <span>Tiến Trình Duyệt Phiếu (DNX & Xe Ra)</span>
                        {voucherTickets.length > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700">
                                {voucherTickets.length.toLocaleString()}
                            </span>
                        )}
                    </button>
                </div>

                {/* Cyber ERP Status Badge */}
                <div className="hidden md:flex items-center gap-2 pb-2 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <i className="fas fa-server text-blue-500"></i>
                    <span>Cyber Enterprise 9.0 DB</span>
                </div>
            </div>

            {/* ============================================================= */}
            {/* SUB-TAB 1 CONTENT: KẾ HOẠCH NHÀ MÁY GIAO (K10/K15) */}
            {/* ============================================================= */}
            {activeSubTab === 'factory_plan' && (
                <>
                    {/* Compact Filter Toolbar */}
                    <div className="relative z-10 px-3.5 py-2.5 bg-white border-b border-slate-200 shadow-xs shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                            
                            {/* 1. Keyword search / Instant Paste Filter */}
                            <div className="flex-1 min-w-[200px] max-w-sm relative">
                                <div className={`flex items-center bg-slate-50/90 hover:bg-white border rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs ${
                                    keyword ? 'border-blue-300 ring-1 ring-blue-200 bg-blue-50/20' : 'border-slate-200'
                                }`}>
                                    <i className="fas fa-search text-[11px] text-slate-400 mr-2 flex-shrink-0"></i>
                                    <input
                                        type="text"
                                        placeholder="Tìm hoặc dán danh sách VIN, số máy, DMS..."
                                        value={keyword}
                                        onChange={e => setKeyword(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                // Nếu chưa có dữ liệu tải về, gọi API backend
                                                if (cars.length === 0) {
                                                    executeSearch();
                                                }
                                            }
                                        }}
                                        className="w-full bg-transparent text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none"
                                        title="Nhập từ khóa hoặc dán danh sách nhiều số VIN (phân cách bằng dấu phẩy, khoảng trắng hoặc dán từ Excel)"
                                    />
                                    
                                    {/* Instant Match Badge on Downloaded Data */}
                                    {keyword && cars.length > 0 && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 whitespace-nowrap mr-1 shrink-0 animate-fade-in" title={`Khớp ${displayedCars.length} / ${cars.length} xe đã tải`}>
                                            {displayedCars.length}/{cars.length}
                                        </span>
                                    )}

                                    {keyword && (
                                        <button
                                            type="button"
                                            onClick={() => setKeyword('')}
                                            className="text-slate-400 hover:text-slate-600 p-0.5 ml-0.5"
                                            title="Xóa tìm kiếm"
                                        >
                                            <i className="fas fa-times-circle text-xs"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 2. Model Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-car text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={selectedModel}
                                    onChange={e => handleModelChange(e.target.value)}
                                    disabled={isLoadingFilters}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[130px] truncate"
                                    title="Chọn dòng xe"
                                >
                                    <option value="Tất cả">Tất cả dòng xe</option>
                                    {filterOptions.models.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                {isLoadingFilters && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                                )}
                            </div>

                            {/* 3. Version Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-cogs text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={selectedVersion}
                                    onChange={e => setSelectedVersion(e.target.value)}
                                    disabled={isLoadingColors}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
                                    title="Chọn phiên bản"
                                >
                                    <option value="Tất cả">Tất cả phiên bản</option>
                                    {filterOptions.versions.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                                {isLoadingColors && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                                )}
                            </div>

                            {/* 4. Color Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-palette text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={selectedColor}
                                    onChange={e => setSelectedColor(e.target.value)}
                                    disabled={isLoadingColors}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[125px] truncate"
                                    title="Chọn màu ngoại thất"
                                >
                                    <option value="Tất cả">{isLoadingColors ? 'Đang tải màu...' : 'Tất cả màu'}</option>
                                    {filterOptions.colors.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 5. Showroom Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-store text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={selectedTtcp}
                                    onChange={e => setSelectedTtcp(e.target.value)}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[155px] truncate"
                                    title="Chọn đơn vị nhận (Showroom)"
                                >
                                    <option value="">Tất cả showroom</option>
                                    {filterOptions.ttcp_list.map(t => (
                                        <option key={t.code} value={t.code}>
                                            {t.name} ({t.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 ml-auto">
                                {displayedCars.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleExportExcel}
                                        disabled={isLoading}
                                        className="h-9 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                                        title="Xuất file Excel cho các xe đang hiển thị"
                                    >
                                        <i className="fas fa-file-excel text-emerald-600"></i>
                                        <span>Xuất Excel ({displayedCars.length})</span>
                                    </button>
                                )}
                                
                                {(keyword || selectedModel !== 'Tất cả' || selectedVersion !== 'Tất cả' || selectedColor !== 'Tất cả' || selectedTtcp) && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        disabled={isLoading}
                                        className="h-9 px-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1 whitespace-nowrap"
                                        title="Xóa bộ lọc"
                                    >
                                        <i className="fas fa-undo text-[10px]"></i>
                                        <span>Đặt lại</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => executeSearch()}
                                    disabled={isLoading}
                                    className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/25 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
                                    title="Tải lại dữ liệu mới từ máy chủ CyberSoft"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang tìm...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-rotate text-xs"></i>
                                            <span>Tải từ Cyber</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* Results Summary Sub-header */}
                    <div className="relative z-10 px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span>Tìm thấy:</span>
                            <span className="font-extrabold text-blue-600 text-sm">
                                {keyword ? displayedCars.length.toLocaleString() : totalCount.toLocaleString()}
                            </span>
                            <span>xe kế hoạch</span>

                            {keyword && cars.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    Đang lọc {displayedCars.length} / {cars.length} xe đã tải về
                                </span>
                            )}

                            {!keyword && totalCount > cars.length && (
                                <span className="text-[11px] text-slate-400 italic">
                                    (Đã tải {cars.length} xe mới nhất)
                                </span>
                            )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <i className="fas fa-database text-slate-400"></i>
                            <span>Dữ liệu phân bổ K10/K15 chưa XHĐ</span>
                        </div>
                    </div>

                    {/* Body Table Container */}
                    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-slate-700">Đang truy vấn kế hoạch nhà máy giao từ CyberSoft ERP...</p>
                                <p className="text-xs text-slate-400">Đang quét sổ cái phân bổ K10/K15 và loại bỏ triệt để xe đã xuất HĐ</p>
                            </div>
                        ) : !hasSearched && cars.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-10 flex flex-col items-center justify-center my-6 text-center max-w-xl mx-auto">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xl shadow-xs mb-4">
                                    <i className="fas fa-car-side"></i>
                                </div>
                                <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
                                    Tra Cứu Xe Kế Hoạch Chưa Xuất Hóa Đơn Bán (XHĐ)
                                </h4>
                                <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                                    Chọn <strong>Dòng xe</strong> ở trên hoặc dán danh sách số VIN vào ô tìm kiếm rồi nhấn <strong className="text-blue-600">Tải từ Cyber</strong>.
                                </p>
                                <div className="mt-3 px-3 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-[11px] text-amber-800 font-medium">
                                    <i className="fas fa-filter mr-1.5 text-amber-600"></i>
                                    Né 100% xe đã xuất hóa đơn bán hoặc đã ghép hợp đồng
                                </div>
                                <button
                                    type="button"
                                    onClick={() => executeSearch()}
                                    className="mt-5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <i className="fas fa-search text-xs"></i>
                                    <span>Tải tất cả xe kế hoạch chưa XHĐ</span>
                                </button>
                            </div>
                        ) : cars.length > 0 && displayedCars.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-10 flex flex-col items-center justify-center my-6 text-center max-w-lg mx-auto">
                                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
                                    <i className="fas fa-search text-lg"></i>
                                </div>
                                <p className="text-sm font-bold text-slate-800">
                                    Không có xe nào khớp trong {cars.length} xe đã tải về!
                                </p>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                                    Từ khóa hoặc danh sách số VIN dán vào không trùng khớp với xe nào hiện tại.
                                </p>
                                <div className="mt-4 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setKeyword('')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    >
                                        Xóa từ khóa tìm kiếm
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => executeSearch()}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                    >
                                        Tìm rộng hơn trên CyberSoft
                                    </button>
                                </div>
                            </div>
                        ) : cars.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 flex flex-col items-center justify-center my-6 text-center max-w-lg mx-auto">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                    <i className="fas fa-box-open text-xl"></i>
                                </div>
                                <p className="text-sm font-bold text-slate-700">
                                    Không tìm thấy xe kế hoạch nào chưa XHĐ phù hợp!
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Hãy thử đổi điều kiện lọc dòng xe, phiên bản hoặc chọn "Tất cả showroom"
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10.5px]">
                                                <th className="py-3 px-3.5 border-r border-slate-100 text-center w-12">STT</th>
                                                <th className="py-3 px-3.5 border-r border-slate-100">Số VIN</th>
                                                <th className="py-3 px-3.5 border-r border-slate-100">Dòng xe / Phiên bản</th>
                                                <th className="py-3 px-3.5 border-r border-slate-100">Ngoại thất / Nội thất</th>
                                                <th className="py-3 px-3.5 border-r border-slate-100">Đơn vị nhận (TTCP)</th>
                                                <th className="py-3 px-3.5 border-r border-slate-100">Vị trí kho thực tế</th>
                                                <th className="py-3 px-3.5 border-r border-slate-100">Ngày CT / Phân bổ</th>
                                                <th className="py-3 px-3.5 border-r border-slate-100">Số máy / DMS</th>
                                                <th className="py-3 px-3.5">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px]">
                                            {displayedCars.map((item, idx) => (
                                                <tr key={`${item.vin}-${idx}`} className="hover:bg-blue-50/40 transition-colors group">
                                                    <td className="py-3 px-3.5 text-slate-400 font-sans text-center border-r border-slate-50">
                                                        {idx + 1}
                                                    </td>
                                                    
                                                    {/* VIN with copy button */}
                                                    <td className="py-3 px-3.5 border-r border-slate-50">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-bold text-slate-900 tracking-wide group-hover:text-blue-600 transition-colors">
                                                                {item.vin}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyVin(item.vin)}
                                                                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                                                                title="Sao chép số VIN"
                                                            >
                                                                {copiedVin === item.vin ? (
                                                                    <span className="text-[10px] text-emerald-600 font-bold">✓</span>
                                                                ) : (
                                                                    <i className="far fa-copy text-[10px]"></i>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>

                                                    {/* Model & Version */}
                                                    <td className="py-3 px-3.5 font-sans border-r border-slate-50">
                                                        <div className="font-bold text-slate-900">
                                                            {item.dong_xe || item.ten_kx}
                                                        </div>
                                                        {item.phien_ban && (
                                                            <div className="text-slate-500 text-[10.5px]">
                                                                {item.phien_ban}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Color */}
                                                    <td className="py-3 px-3.5 font-sans border-r border-slate-50">
                                                        <div className="font-semibold text-slate-800">
                                                            {item.ten_mau || item.ma_mau || '-'}
                                                        </div>
                                                        {item.ten_mau_nt && (
                                                            <div className="text-slate-500 text-[10.5px]">
                                                                NT: {item.ten_mau_nt}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Showroom TTCP */}
                                                    <td className="py-3 px-3.5 font-sans border-r border-slate-50">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                                                            item.ma_ttcp === '02.01.08' || (item.ten_ttcp || '').includes('Thuận An')
                                                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                        }`}>
                                                            {item.ten_ttcp || item.ma_ttcp || '-'}
                                                        </span>
                                                    </td>

                                                    {/* Physical warehouse */}
                                                    <td className="py-3 px-3.5 font-sans border-r border-slate-50">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                                            item.current_physical_warehouse && item.current_physical_warehouse !== 'Đang vận tải'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {item.current_physical_warehouse || 'Đang vận tải'}
                                                        </span>
                                                    </td>

                                                    {/* Dates */}
                                                    <td className="py-3 px-3.5 font-sans text-slate-600 text-[11px] border-r border-slate-50">
                                                        <div className="font-medium">{item.ngay_ct || '-'}</div>
                                                        {item.ngay_phan_bo && (
                                                            <div className="text-[10px] text-slate-400">
                                                                PB: {item.ngay_phan_bo}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Engine / DMS */}
                                                    <td className="py-3 px-3.5 font-mono text-[10.5px] text-slate-600 border-r border-slate-50">
                                                        <div>{item.so_may || '-'}</div>
                                                        {item.ma_dms && (
                                                            <div className="text-blue-600 font-bold">{item.ma_dms}</div>
                                                        )}
                                                    </td>

                                                    {/* Notes */}
                                                    <td className="py-3 px-3.5 font-sans text-slate-500 text-[11px] max-w-[150px] truncate" title={item.ghi_chu}>
                                                        {item.ghi_chu || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Bar */}
                    <div className="relative z-10 px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs text-slate-500">
                        <div>
                            {cars.length > 0 ? (
                                <span>
                                    Đang hiển thị <strong className="text-slate-800 font-bold">{displayedCars.length}</strong> / <strong className="text-slate-800 font-bold">{cars.length}</strong> xe kế hoạch đã tải về
                                    {keyword && <span className="ml-1 text-blue-600 font-medium">(Đang lọc theo từ khóa/VIN)</span>}
                                </span>
                            ) : (
                                <span>Sổ cái phân bổ K10 / K15 CyberSoft ERP</span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-500">K10:</span> Nhà máy phân bổ | <span className="font-semibold text-slate-500">K15:</span> Điều chuyển nội bộ
                        </div>
                    </div>
                </>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 2 CONTENT: BÁO CÁO TỒN KHO XE (CP_BETONXE) */}
            {/* ============================================================= */}
            {activeSubTab === 'ton_kho' && (
                <>
                    {/* Filter Toolbar for Ton Kho */}
                    <div className="relative z-10 px-3.5 py-2.5 bg-white border-b border-slate-200 shadow-xs shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                            
                            {/* 1. Date Range Filter */}
                            <div className="flex items-center gap-1 bg-slate-50/90 border border-slate-200 rounded-xl px-2 h-9 shadow-xs">
                                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Từ</span>
                                <input
                                    type="date"
                                    value={tonKhoFromDate}
                                    onChange={e => setTonKhoFromDate(e.target.value)}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none w-[115px]"
                                    title="Từ ngày"
                                />
                                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">đến</span>
                                <input
                                    type="date"
                                    value={tonKhoToDate}
                                    onChange={e => setTonKhoToDate(e.target.value)}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none w-[115px]"
                                    title="Đến ngày"
                                />
                            </div>

                            {/* 2. Warehouse Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-warehouse text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={tonKhoWarehouse}
                                    onChange={e => {
                                        setTonKhoWarehouse(e.target.value);
                                        executeTonKhoSearch({ warehouse: e.target.value });
                                    }}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
                                    title="Chọn kho xe"
                                >
                                    <option value="">Tất cả kho</option>
                                    {tonKhoWarehouses.map(w => (
                                        <option key={w.code} value={w.code}>
                                            {w.name} ({w.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Model Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-car text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={tonKhoModel}
                                    onChange={e => {
                                        setTonKhoModel(e.target.value);
                                        executeTonKhoSearch({ model: e.target.value });
                                    }}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
                                    title="Chọn kiểu xe"
                                >
                                    <option value="">Tất cả kiểu xe</option>
                                    {tonKhoModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. Status Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-file-invoice text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={tonKhoStatus}
                                    onChange={e => {
                                        const newStatus = e.target.value as any;
                                        setTonKhoStatus(newStatus);
                                        executeTonKhoSearch({ status: newStatus });
                                    }}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[160px] truncate"
                                    title="Trạng thái hóa đơn"
                                >
                                    <option value="not_invoiced">Chưa viết hóa đơn ({tonKhoNotInvoiced})</option>
                                    <option value="all">Tất cả trạng thái ({tonKhoTotal})</option>
                                    <option value="invoiced">Đã viết hóa đơn ({tonKhoInvoiced})</option>
                                </select>
                            </div>

                            {/* 5. Keyword search / Instant Paste Filter for Ton Kho */}
                            <div className="flex-1 min-w-[200px] max-w-sm relative">
                                <div className={`flex items-center bg-slate-50/90 hover:bg-white border rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs ${
                                    tonKhoKeyword ? 'border-blue-300 ring-1 ring-blue-200 bg-blue-50/20' : 'border-slate-200'
                                }`}>
                                    <i className="fas fa-search text-[11px] text-slate-400 mr-2 flex-shrink-0"></i>
                                    <input
                                        type="text"
                                        placeholder="Tìm hoặc dán danh sách VIN, số máy, HĐ..."
                                        value={tonKhoKeyword}
                                        onChange={e => setTonKhoKeyword(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                if (tonKhoCars.length === 0) {
                                                    executeTonKhoSearch();
                                                }
                                            }
                                        }}
                                        className="w-full bg-transparent text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none"
                                        title="Nhập từ khóa hoặc dán danh sách nhiều số VIN (phân cách bằng dấu phẩy, khoảng trắng hoặc dán từ Excel)"
                                    />

                                    {/* Instant Match Badge on Downloaded Data */}
                                    {tonKhoKeyword && tonKhoCars.length > 0 && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 whitespace-nowrap mr-1 shrink-0 animate-fade-in" title={`Khớp ${displayedTonKhoCars.length} / ${tonKhoCars.length} xe tồn kho đã tải`}>
                                            {displayedTonKhoCars.length}/{tonKhoCars.length}
                                        </span>
                                    )}

                                    {tonKhoKeyword && (
                                        <button
                                            type="button"
                                            onClick={() => setTonKhoKeyword('')}
                                            className="text-slate-400 hover:text-slate-600 p-0.5 ml-0.5"
                                            title="Xóa tìm kiếm"
                                        >
                                            <i className="fas fa-times-circle text-xs"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 ml-auto">
                                {displayedTonKhoCars.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleExportTonKhoExcel}
                                        disabled={isLoadingTonKho}
                                        className="h-9 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                                        title="Xuất file Excel cho các xe tồn đang hiển thị"
                                    >
                                        <i className="fas fa-file-excel text-emerald-600"></i>
                                        <span>Xuất Excel ({displayedTonKhoCars.length})</span>
                                    </button>
                                )}

                                {(tonKhoKeyword || tonKhoWarehouse || tonKhoModel || tonKhoStatus !== 'not_invoiced') && (
                                    <button
                                        type="button"
                                        onClick={handleTonKhoReset}
                                        disabled={isLoadingTonKho}
                                        className="h-9 px-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1 whitespace-nowrap"
                                        title="Đặt lại bộ lọc"
                                    >
                                        <i className="fas fa-undo text-[10px]"></i>
                                        <span>Đặt lại</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => executeTonKhoSearch()}
                                    disabled={isLoadingTonKho}
                                    className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/25 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
                                    title="Chạy lại báo cáo CP_BETONXE trên máy chủ CyberSoft"
                                >
                                    {isLoadingTonKho ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang tải...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-rotate text-xs"></i>
                                            <span>Tải từ Cyber</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* Stats & Legend Sub-header */}
                    <div className="relative z-10 px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Chưa viết hóa đơn:</span>
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-xs">
                                    {tonKhoKeyword ? `${displayedTonKhoCars.length} / ${tonKhoNotInvoiced}` : tonKhoNotInvoiced.toLocaleString()}
                                </span>
                            </div>

                            <div className="w-px h-3.5 bg-slate-300"></div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Tổng tồn kho:</span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold text-xs">
                                    {tonKhoTotal.toLocaleString()}
                                </span>
                            </div>

                            <div className="w-px h-3.5 bg-slate-300"></div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Đã viết hóa đơn:</span>
                                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300">
                                    {tonKhoInvoiced.toLocaleString()}
                                </span>
                            </div>

                            {tonKhoKeyword && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-fade-in">
                                    Đang lọc {displayedTonKhoCars.length} / {tonKhoCars.length} xe đã tải
                                </span>
                            )}
                        </div>

                        {/* Legend matching CyberSoft */}
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-200/90 text-yellow-900 border border-yellow-300 font-semibold shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                Dòng màu vàng = Xe đã được viết hóa đơn (CyberSoft)
                            </span>
                        </div>
                    </div>

                    {/* Table Container for Ton Kho */}
                    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
                        {isLoadingTonKho ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-slate-700">Đang thực thi Stored Procedure [CP_BETONXE] từ CyberSoft...</p>
                                <p className="text-xs text-slate-400">Đang tổng hợp số liệu tồn kho, tuổi tồn và tình trạng xuất hóa đơn</p>
                            </div>
                        ) : tonKhoCars.length > 0 && displayedTonKhoCars.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-10 flex flex-col items-center justify-center my-6 text-center max-w-lg mx-auto">
                                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
                                    <i className="fas fa-search text-lg"></i>
                                </div>
                                <p className="text-sm font-bold text-slate-800">
                                    Không có xe tồn nào khớp trong {tonKhoCars.length} xe đã tải về!
                                </p>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                                    Từ khóa hoặc danh sách số VIN dán vào không trùng khớp với xe nào hiện tại.
                                </p>
                                <div className="mt-4 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTonKhoKeyword('')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    >
                                        Xóa từ khóa tìm kiếm
                                    </button>
                                </div>
                            </div>
                        ) : tonKhoCars.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 flex flex-col items-center justify-center my-6 text-center max-w-lg mx-auto">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                                    <i className="fas fa-warehouse text-xl"></i>
                                </div>
                                <p className="text-sm font-bold text-slate-700">
                                    Không tìm thấy dữ liệu xe tồn kho phù hợp!
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Vui lòng kiểm tra khoảng thời gian hoặc nhấn "Tải từ Cyber" để nạp dữ liệu
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse font-sans">
                                        <thead>
                                            <tr className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10.5px]">
                                                <th className="py-3 px-3 border-r border-slate-200 text-center w-12">STT</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Số hóa đơn</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Ngày HĐ nhập</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Tháng nhập</th>
                                                <th className="py-3 px-3 border-r border-slate-200">Kiểu xe</th>
                                                <th className="py-3 px-3 border-r border-slate-200">Số khung (VIN)</th>
                                                <th className="py-3 px-3 border-r border-slate-200">Số máy</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Ngoại thất</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Nội thất</th>
                                                <th className="py-3 px-3 border-r border-slate-200">Tên kho</th>
                                                <th className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">Tuổi tồn</th>
                                                <th className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">Năm SX</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Tình trạng</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Đơn vị bán / Showroom</th>
                                                <th className="py-3 px-3 whitespace-nowrap">TVBH</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px]">
                                            {displayedTonKhoCars.map((item, idx) => {
                                                const isInvoiced = item.is_invoiced;
                                                return (
                                                    <tr 
                                                        key={`${item.vin}-${idx}`} 
                                                        className={`transition-colors group ${
                                                            isInvoiced 
                                                                ? 'bg-yellow-200/80 hover:bg-yellow-200 text-yellow-950 font-medium' 
                                                                : 'hover:bg-blue-50/40 text-slate-800'
                                                        }`}
                                                    >
                                                        {/* STT */}
                                                        <td className={`py-2.5 px-3 text-center border-r ${isInvoiced ? 'border-yellow-300/80 text-yellow-800 font-bold' : 'border-slate-100 text-slate-400'}`}>
                                                            {idx + 1}
                                                        </td>

                                                        {/* Số hóa đơn */}
                                                        <td className={`py-2.5 px-3 border-r font-mono font-bold whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80 text-yellow-900' : 'border-slate-100 text-slate-700'}`}>
                                                            {item.so_hd || '-'}
                                                        </td>

                                                        {/* Ngày HĐ nhập */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100 text-slate-600'}`}>
                                                            {item.ngay_hd || '-'}
                                                        </td>

                                                        {/* Tháng nhập HĐ */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100 text-slate-600'}`}>
                                                            {item.thang_hd || '-'}
                                                        </td>

                                                        {/* Kiểu xe */}
                                                        <td className={`py-2.5 px-3 border-r ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <div className="font-bold">{item.ten_kx || item.ma_kx}</div>
                                                            {item.ma_kx && item.ma_kx !== item.ten_kx && (
                                                                <div className={`text-[10px] ${isInvoiced ? 'text-yellow-800' : 'text-slate-400'}`}>{item.ma_kx}</div>
                                                            )}
                                                        </td>

                                                        {/* Số khung (VIN) */}
                                                        <td className={`py-2.5 px-3 border-r ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`font-mono font-bold tracking-wide ${isInvoiced ? 'text-yellow-950' : 'text-slate-900 group-hover:text-blue-600'}`}>
                                                                    {item.vin}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleTonKhoCopyVin(item.vin)}
                                                                    className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                                                                        isInvoiced 
                                                                            ? 'text-yellow-800 hover:text-yellow-950 hover:bg-yellow-300/60' 
                                                                            : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                                                                    }`}
                                                                    title="Sao chép số VIN"
                                                                >
                                                                    {tonKhoCopiedVin === item.vin ? (
                                                                        <span className="text-[10px] text-emerald-700 font-bold">✓</span>
                                                                    ) : (
                                                                        <i className="far fa-copy text-[10px]"></i>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Số máy */}
                                                        <td className={`py-2.5 px-3 border-r font-mono text-[10.5px] ${isInvoiced ? 'border-yellow-300/80 text-yellow-900' : 'border-slate-100 text-slate-600'}`}>
                                                            {item.so_may || '-'}
                                                        </td>

                                                        {/* Màu ngoại thất */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <span className="font-semibold">{item.ten_mau || item.ma_mau || '-'}</span>
                                                            {item.ma_mau && (
                                                                <span className={`ml-1 text-[10px] ${isInvoiced ? 'text-yellow-800' : 'text-slate-400'}`}>({item.ma_mau})</span>
                                                            )}
                                                        </td>

                                                        {/* Màu nội thất */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <span>{item.ten_mau_nt || item.ma_mau_nt || '-'}</span>
                                                        </td>

                                                        {/* Kho */}
                                                        <td className={`py-2.5 px-3 border-r ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <div className="font-semibold">{item.ten_kho || item.ma_kho}</div>
                                                            {item.ma_kho && (
                                                                <div className={`text-[10px] ${isInvoiced ? 'text-yellow-800' : 'text-slate-400'}`}>{item.ma_kho}</div>
                                                            )}
                                                        </td>

                                                        {/* Tuổi tồn (ngày) */}
                                                        <td className={`py-2.5 px-3 border-r text-center font-bold ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] ${
                                                                item.ngay_ton > 90 
                                                                    ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                                                                    : item.ngay_ton > 30 
                                                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                                        : isInvoiced
                                                                            ? 'bg-yellow-300/70 text-yellow-950 border border-yellow-400'
                                                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                            }`}>
                                                                {item.ngay_ton} ngày
                                                            </span>
                                                        </td>

                                                        {/* Năm SX */}
                                                        <td className={`py-2.5 px-3 border-r text-center ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100 text-slate-600'}`}>
                                                            {item.nam_sx || '-'}
                                                        </td>

                                                        {/* Tình trạng */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            {isInvoiced ? (
                                                                <span className="inline-flex items-center gap-1 font-bold text-yellow-950 text-[11px]">
                                                                    <i className="fas fa-check-circle text-amber-700 text-xs"></i>
                                                                    {item.tinh_trang || 'Xe đã được viết hóa đơn'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </td>

                                                        {/* Đơn vị bán / Showroom */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80 font-semibold' : 'border-slate-100 text-slate-600'}`}>
                                                            {item.ten_ttcp || '-'}
                                                        </td>

                                                        {/* TVBH */}
                                                        <td className={`py-2.5 px-3 whitespace-nowrap ${isInvoiced ? 'font-semibold text-yellow-950' : 'text-slate-700'}`}>
                                                            {item.tvbh || '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Bar for Ton Kho */}
                    <div className="relative z-10 px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs text-slate-500">
                        <div>
                            <span>
                                Báo cáo tồn kho xe CyberSoft ERP | Đang hiển thị: <strong className="text-slate-800 font-bold">{displayedTonKhoCars.length}</strong> / <strong className="text-slate-800 font-bold">{tonKhoCars.length}</strong> xe (Tổng hệ thống: <strong className="text-slate-800 font-bold">{tonKhoTotal.toLocaleString()}</strong> xe)
                                {tonKhoKeyword && <span className="ml-1 text-blue-600 font-medium">(Đang lọc theo từ khóa/VIN)</span>}
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                            Stored Procedure: <span className="font-mono font-semibold text-slate-600">[dbo].[CP_BETONXE]</span>
                        </div>
                    </div>
                </>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 3 CONTENT: XẾP XE HỢP ĐỒNG (CP_BEXEPXE) */}
            {/* ============================================================= */}
            {activeSubTab === 'xep_xe' && (
                <>
                    {/* Filter Toolbar for Xếp Xe */}
                    <div className="relative z-10 px-3.5 py-2.5 bg-white border-b border-slate-200 shadow-xs shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                            
                            {/* 1. Month / Year Range Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 border border-slate-200 rounded-xl px-2.5 h-9 shadow-xs text-xs font-semibold text-slate-700">
                                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Từ</span>
                                <select 
                                    value={xepXeThang1} 
                                    onChange={e => setXepXeThang1(Number(e.target.value))}
                                    className="bg-transparent focus:outline-none cursor-pointer"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>Tháng {m}</option>
                                    ))}
                                </select>
                                <select 
                                    value={xepXeNam1} 
                                    onChange={e => setXepXeNam1(Number(e.target.value))}
                                    className="bg-transparent focus:outline-none cursor-pointer border-r border-slate-200 pr-1.5"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>

                                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap pl-1">đến</span>
                                <select 
                                    value={xepXeThang2} 
                                    onChange={e => setXepXeThang2(Number(e.target.value))}
                                    className="bg-transparent focus:outline-none cursor-pointer"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>Tháng {m}</option>
                                    ))}
                                </select>
                                <select 
                                    value={xepXeNam2} 
                                    onChange={e => setXepXeNam2(Number(e.target.value))}
                                    className="bg-transparent focus:outline-none cursor-pointer"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Showroom Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-building text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={xepXeShowroom}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setXepXeShowroom(val);
                                        executeXepXeSearch({ showroom: val });
                                    }}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[170px] truncate"
                                    title="Chọn đơn vị / Showroom"
                                >
                                    <option value="">Tất cả Showroom (Toàn hệ thống)</option>
                                    {xepXeShowrooms.map(s => (
                                        <option key={s} value={s}>
                                            {s}{s.toLowerCase().includes('thuận an') ? ' (Mặc định)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Model Filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-white border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white shadow-xs">
                                <i className="fas fa-car text-[11px] text-slate-400 flex-shrink-0"></i>
                                <select
                                    value={xepXeModel}
                                    onChange={e => setXepXeModel(e.target.value)}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
                                    title="Chọn dòng xe"
                                >
                                    <option value="">Tất cả dòng xe</option>
                                    {xepXeModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. Instant Search / Multi-paste on Downloaded Data */}
                            <div className="flex-1 min-w-[220px] max-w-sm relative">
                                <div className={`flex items-center bg-slate-50/90 hover:bg-white border rounded-xl px-2.5 h-9 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white shadow-xs ${
                                    xepXeKeyword ? 'border-indigo-300 ring-1 ring-indigo-200 bg-indigo-50/20' : 'border-slate-200'
                                }`}>
                                    <i className="fas fa-search text-[11px] text-slate-400 mr-2 flex-shrink-0"></i>
                                    <input
                                        type="text"
                                        placeholder="Tìm số HĐ, VIN, tên KH, SĐT (dán nhiều từ Excel)..."
                                        value={xepXeKeyword}
                                        onChange={e => setXepXeKeyword(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                if (xepXeContracts.length === 0) {
                                                    executeXepXeSearch();
                                                }
                                            }
                                        }}
                                        className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                                        title="Tìm kiếm tức thì trên dữ liệu đã tải: số HĐ, VIN, tên KH (có dấu hoặc không dấu), SĐT hoặc dán nhiều dòng từ Excel"
                                    />

                                    {/* Instant Match Badge on Downloaded Data */}
                                    {xepXeKeyword && xepXeContracts.length > 0 && (
                                        <span 
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 whitespace-nowrap mr-1 shrink-0 animate-fade-in" 
                                            title={`Khớp ${displayedXepXeContracts.length} / ${xepXeContracts.length} hợp đồng đã tải`}
                                        >
                                            {displayedXepXeContracts.length}/{xepXeContracts.length}
                                        </span>
                                    )}

                                    {xepXeKeyword && (
                                        <button
                                            type="button"
                                            onClick={() => setXepXeKeyword('')}
                                            className="text-slate-400 hover:text-slate-600 ml-1 p-0.5"
                                            title="Xóa tìm kiếm"
                                        >
                                            <i className="fas fa-times-circle text-xs"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 5. Fetch Data Button */}
                            <button
                                type="button"
                                onClick={() => executeXepXeSearch()}
                                disabled={isLoadingXepXe}
                                className="h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                            >
                                <i className={`fas ${isLoadingXepXe ? 'fa-spinner fa-spin' : 'fa-rotate'} text-xs`}></i>
                                <span>{isLoadingXepXe ? 'Đang tải...' : 'Lấy dữ liệu'}</span>
                            </button>

                            {/* 6. Reset Filters */}
                            <button
                                type="button"
                                onClick={handleXepXeReset}
                                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all flex items-center justify-center shadow-xs shrink-0"
                                title="Đặt lại bộ lọc"
                            >
                                <i className="fas fa-undo text-xs"></i>
                            </button>

                            {/* 7. Export Excel Button */}
                            <button
                                type="button"
                                onClick={handleExportXepXeExcel}
                                disabled={xepXeContracts.length === 0}
                                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 ml-auto"
                                title="Xuất danh sách ra Excel"
                            >
                                <i className="fas fa-file-excel text-xs"></i>
                                <span className="hidden sm:inline">Xuất Excel</span>
                            </button>
                        </div>

                        {/* Status Legend & Quick Filter Bar (Matching CyberSoft screenshot 100%) */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                                <i className="fas fa-filter text-[10px]"></i> Trạng thái:
                            </span>

                            {/* Đã duyệt & Chờ duyệt (Mặc định) */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter('approved_and_pending')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 font-bold ${
                                    xepXeStatusFilter === 'approved_and_pending'
                                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-300'
                                        : 'bg-indigo-50/90 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                }`}
                                title="Các hợp đồng đã duyệt và chờ duyệt sẵn sàng ghép xe (Chờ duyệt, Đã ghép SK, Chờ ghép SK)"
                            >
                                <i className="fas fa-check-double text-[10px]"></i>
                                <span>Đã duyệt & Chờ duyệt</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                    xepXeStatusFilter === 'approved_and_pending' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800 font-bold'
                                }`}>
                                    {(xepXeStatusCounts['Chờ duyệt'] || 0) + (xepXeStatusCounts['Đã ghép SK'] || 0) + (xepXeStatusCounts['Chờ ghép SK'] || 0)}
                                </span>
                            </button>

                            {/* All */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                    xepXeStatusFilter === 'all'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>Tất cả</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                    xepXeStatusFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                    {xepXeContracts.length}
                                </span>
                            </button>

                            {/* Chờ ghép SK (Trắng) */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter(xepXeStatusFilter === 'Chờ ghép SK' ? 'all' : 'Chờ ghép SK')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                    xepXeStatusFilter === 'Chờ ghép SK'
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-xs ring-2 ring-slate-400'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-white"></span>
                                <span>Chờ ghép SK</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                                    {xepXeStatusCounts['Chờ ghép SK'] || 0}
                                </span>
                            </button>

                            {/* Đã ghép SK (Xanh lơ / Cyan) */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter(xepXeStatusFilter === 'Đã ghép SK' ? 'all' : 'Đã ghép SK')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                    xepXeStatusFilter === 'Đã ghép SK'
                                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs ring-2 ring-cyan-300'
                                        : 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-cyan-500"></span>
                                <span>Đã ghép SK</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-bold">
                                    {xepXeStatusCounts['Đã ghép SK'] || 0}
                                </span>
                            </button>

                            {/* Chờ duyệt (Xanh chuối / GreenYellow) */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter(xepXeStatusFilter === 'Chờ duyệt' ? 'all' : 'Chờ duyệt')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                    xepXeStatusFilter === 'Chờ duyệt'
                                        ? 'bg-lime-600 text-white border-lime-600 shadow-xs ring-2 ring-lime-300'
                                        : 'bg-lime-50 text-lime-900 border-lime-200 hover:bg-lime-100'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-lime-400 border border-lime-500"></span>
                                <span>Chờ duyệt</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-lime-100 text-lime-900 font-bold">
                                    {xepXeStatusCounts['Chờ duyệt'] || 0}
                                </span>
                            </button>

                            {/* QH đặt cọc (Vàng / Yellow) */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter(xepXeStatusFilter === 'QH đặt cọc' ? 'all' : 'QH đặt cọc')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                    xepXeStatusFilter === 'QH đặt cọc'
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-300'
                                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-500"></span>
                                <span>QH đặt cọc</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
                                    {xepXeStatusCounts['QH đặt cọc'] || 0}
                                </span>
                            </button>

                            {/* Đã xuất HĐ (Tím / Violet) */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter(xepXeStatusFilter === 'Đã xuất HĐ' ? 'all' : 'Đã xuất HĐ')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                    xepXeStatusFilter === 'Đã xuất HĐ'
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-300'
                                        : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 border border-purple-500"></span>
                                <span>Đã xuất HĐ</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
                                    {xepXeStatusCounts['Đã xuất HĐ'] || 0}
                                </span>
                            </button>

                            {/* Hủy (Đỏ / Red) */}
                            <button
                                type="button"
                                onClick={() => setXepXeStatusFilter(xepXeStatusFilter === 'Hủy' ? 'all' : 'Hủy')}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                    xepXeStatusFilter === 'Hủy'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300'
                                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600"></span>
                                <span>Hủy</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                                    {xepXeStatusCounts['Hủy'] || 0}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Table Area for Xếp Xe */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 p-3 sm:p-4 min-h-[300px] relative">
                        {isLoadingXepXe ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                <span className="font-semibold text-sm text-slate-700">Đang truy vấn dữ liệu xếp xe từ CyberSoft ERP...</span>
                                <span className="text-xs text-slate-400 mt-1">Stored Procedure [dbo].[CP_BeXepXe]</span>
                            </div>
                        ) : !hasLoadedXepXe ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <i className="fas fa-car-side text-5xl text-slate-300 mb-3"></i>
                                <span className="font-semibold text-slate-600">Bấm "Lấy dữ liệu" để tải danh sách hợp đồng xếp xe từ CyberSoft ERP</span>
                            </div>
                        ) : displayedXepXeContracts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <i className="fas fa-search text-4xl text-slate-300 mb-2"></i>
                                <span className="font-semibold text-slate-600">Không tìm thấy hợp đồng nào phù hợp với bộ lọc hiện tại</span>
                                {xepXeKeyword && (
                                    <button 
                                        type="button" 
                                        onClick={() => setXepXeKeyword('')}
                                        className="mt-2 text-xs text-indigo-600 hover:underline font-medium"
                                    >
                                        Xóa từ khóa tìm kiếm "{xepXeKeyword}"
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                                <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200">STT</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Trạng thái</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Số HĐ / Chứng từ</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Ngày HĐ</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Ngày giao xe</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap min-w-[150px]">Khách hàng</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Dòng xe / Phiên bản</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Màu xe</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap min-w-[170px]">Số khung (VIN)</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap text-right">Tổng tiền</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap text-right">Đã thanh toán</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Showroom</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">Tư vấn bán hàng</th>
                                                <th className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-100 z-10">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayedXepXeContracts.map((c, idx) => {
                                                const badgeInfo = getStatusBadgeStyle(c.ten_color, c.back_color);
                                                const hasVin = Boolean(c.so_khung && c.so_khung.trim());
                                                const isInvoiced = c.ten_color === 'Đã xuất HĐ' || (c.back_color || '').toLowerCase() === 'violet';

                                                return (
                                                    <tr 
                                                        key={`${c.stt_rec}_${c.stt_rec0}_${idx}`}
                                                        className={`transition-colors text-slate-800 ${badgeInfo.rowClass}`}
                                                    >
                                                        {/* STT */}
                                                        <td className="py-2 px-2 text-center text-slate-500 font-medium border-r border-slate-100/80">
                                                            {idx + 1}
                                                        </td>

                                                        {/* Trạng thái */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap">
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] border ${badgeInfo.badgeClass}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dotColor}`}></span>
                                                                {badgeInfo.label}
                                                            </span>
                                                        </td>

                                                        {/* Số HĐ / Số chứng từ */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap">
                                                            <div className="font-bold text-slate-900">{c.ma_hd || c.so_ct}</div>
                                                            {c.so_ct && c.so_ct !== c.ma_hd && (
                                                                <div className="text-[10px] text-slate-500 font-mono">{c.so_ct}</div>
                                                            )}
                                                        </td>

                                                        {/* Ngày HĐ */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap text-slate-600">
                                                            {c.ngay_ct || '-'}
                                                        </td>

                                                        {/* Ngày giao xe */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap text-slate-600 font-medium">
                                                            {c.ngay_gx || '-'}
                                                        </td>

                                                        {/* Khách hàng */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80">
                                                            <div className="font-bold text-slate-900 truncate max-w-[200px]" title={c.ten_kh}>
                                                                {c.ten_kh || '-'}
                                                            </div>
                                                            {c.dien_thoai && (
                                                                <div className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                                    <i className="fas fa-phone text-[9px] text-slate-400"></i>
                                                                    <span>{c.dien_thoai}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Dòng xe / Kiểu xe */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap">
                                                            <div className="font-bold text-slate-900">{c.ten_kx || c.ma_kx}</div>
                                                            {c.ma_kx && c.ten_kx && c.ma_kx !== c.ten_kx && (
                                                                <div className="text-[10px] text-slate-500 font-mono">{c.ma_kx}</div>
                                                            )}
                                                        </td>

                                                        {/* Màu sắc */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap">
                                                            <div className="font-medium text-slate-800">{c.ten_mau || c.ma_mau || '-'}</div>
                                                            {c.ten_mau_nt && (
                                                                <div className="text-[10px] text-slate-500">NT: {c.ten_mau_nt}</div>
                                                            )}
                                                        </td>

                                                        {/* Số khung (VIN) */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap">
                                                            {hasVin ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                                                                        {c.so_khung}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleXepXeCopyVin(c.so_khung)}
                                                                        className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-white"
                                                                        title="Sao chép số VIN"
                                                                    >
                                                                        <i className={`fas ${xepXeCopiedVin === c.so_khung ? 'fa-check text-emerald-600' : 'fa-copy'} text-[11px]`}></i>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 italic text-[11px]">Chưa ghép xe</span>
                                                            )}
                                                            {c.ngay_xep && c.ngay_xep !== '1900-01-01' && (
                                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                                    Ghép: {c.ngay_xep}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Tổng tiền */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap text-right font-semibold text-slate-800">
                                                            {c.tien_nt ? c.tien_nt.toLocaleString() : '-'}
                                                        </td>

                                                        {/* Đã thanh toán */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap text-right font-semibold text-emerald-700">
                                                            {c.da_tt ? c.da_tt.toLocaleString() : '0'}
                                                        </td>

                                                        {/* Showroom */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap text-slate-700">
                                                            {c.ten_ttcp || '-'}
                                                        </td>

                                                        {/* TVBH */}
                                                        <td className="py-2 px-3 border-r border-slate-100/80 whitespace-nowrap text-slate-700 font-medium">
                                                            {c.ten_hs || '-'}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="py-2 px-3 text-center whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs shadow-xs">
                                                            {hasVin ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {/* Nút Đổi xe */}
                                                                    {!isInvoiced && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenAssignModal(c)}
                                                                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                                                                            title="Đổi sang số khung khác"
                                                                        >
                                                                            <i className="fas fa-arrows-rotate text-[10px]"></i>
                                                                            <span>Đổi xe</span>
                                                                        </button>
                                                                    )}
                                                                    {/* Nút Hủy ghép */}
                                                                    {!isInvoiced ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setContractToUnassign(c)}
                                                                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                                                                            title="Hủy ghép xe khỏi hợp đồng"
                                                                        >
                                                                            <i className="fas fa-unlink text-[10px]"></i>
                                                                            <span>Hủy</span>
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[10px] text-purple-700 font-semibold italic bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                                                            Đã viết HĐ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                /* Nút Ghép xe */
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenAssignModal(c)}
                                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 mx-auto"
                                                                >
                                                                    <i className="fas fa-car-side text-[10px]"></i>
                                                                    <span>Ghép xe</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Bar for Xếp Xe */}
                    <div className="relative z-10 px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs text-slate-500">
                        <div>
                            <span>
                                Xếp xe hợp đồng CyberSoft ERP | Đang hiển thị: <strong className="text-slate-800 font-bold">{displayedXepXeContracts.length}</strong> / <strong className="text-slate-800 font-bold">{xepXeContracts.length}</strong> hợp đồng
                                {xepXeKeyword && <span className="ml-1 text-indigo-600 font-medium">(Đang lọc theo từ khóa/VIN)</span>}
                                {xepXeStatusFilter !== 'all' && <span className="ml-1 text-slate-700 font-medium">| Trạng thái: <strong>{xepXeStatusFilter}</strong></span>}
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>SP: <strong className="font-mono text-slate-600">[dbo].[CP_BeXepXe]</strong></span>
                            <span>|</span>
                            <span>Action: <strong className="font-mono text-slate-600">[CP_BeXepXe_SAVE]</strong> / <strong className="font-mono text-slate-600">[CP_BeXepXe_DELETE]</strong></span>
                        </div>
                    </div>
                </>
            )}

            {/* ============================================================= */}
            {/* MODAL: GHÉP XE / CHỌN SỐ KHUNG CHO HỢP ĐỒNG (CP_BeXepXe_SK) */}
            {/* ============================================================= */}
            {selectedContractForAssign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                        {/* Modal Header */}
                        <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 to-blue-700 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                                    <i className="fas fa-car-side text-white text-sm"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Xếp Xe Hợp Đồng CyberSoft</h3>
                                    <p className="text-[11px] text-white/80">Chọn số khung phù hợp từ kế hoạch phân bổ / kho để ghép vào HĐ</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedContractForAssign(null)}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        {/* Contract Details Card */}
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-slate-700">
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Số hợp đồng:</span>
                                    <span className="font-bold text-slate-900 font-mono">{selectedContractForAssign.ma_hd}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Khách hàng:</span>
                                    <span className="font-bold text-slate-900 truncate block" title={selectedContractForAssign.ten_kh}>
                                        {selectedContractForAssign.ten_kh}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Dòng xe / Màu:</span>
                                    <span className="font-bold text-indigo-700 block truncate">
                                        {selectedContractForAssign.ten_kx} ({selectedContractForAssign.ten_mau || selectedContractForAssign.ma_mau})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Showroom:</span>
                                    <span className="font-medium text-slate-800 block truncate" title={selectedContractForAssign.ten_ttcp}>
                                        {selectedContractForAssign.ten_ttcp}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Search in Candidate Cars */}
                        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex-1 relative">
                                <i className="fas fa-search text-[11px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                                <input
                                    type="text"
                                    placeholder="Lọc số khung (VIN), số máy, ghi chú..."
                                    value={candidateSearchQuery}
                                    onChange={e => setCandidateSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                Tìm thấy: <strong className="text-indigo-700">{displayedCandidateCars.length}</strong> xe khả dụng
                            </div>
                        </div>

                        {/* Candidates List / Table */}
                        <div className="flex-1 overflow-auto p-4 min-h-[220px]">
                            {isLoadingCandidates ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                                    <span className="text-xs font-semibold">Đang tra cứu xe khớp cấu hình từ CyberSoft ([dbo].[CP_BeXepXe_SK])...</span>
                                </div>
                            ) : candidateCars.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                    <i className="fas fa-car-tunnel text-4xl text-slate-300 mb-2"></i>
                                    <span className="font-semibold text-slate-600 text-sm">Không có xe phù hợp sẵn sàng ghép!</span>
                                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                                        Hiện không có xe tồn kho hoặc kế hoạch phân bổ nào khớp với mã dòng xe <strong className="text-slate-600">{selectedContractForAssign.ma_kx}</strong> và nội ngoại thất của hợp đồng này.
                                    </p>
                                </div>
                            ) : displayedCandidateCars.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs">
                                    Không khớp với từ khóa tìm kiếm "{candidateSearchQuery}"
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
                                                <th className="py-2.5 px-3 text-center w-10 border-r border-slate-200">Chọn</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200">Số khung (VIN)</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200">Số máy</th>
                                                <th className="py-2.5 px-3 text-center border-r border-slate-200">Năm SX</th>
                                                <th className="py-2.5 px-3 border-r border-slate-200">Ngày nhập / PB</th>
                                                <th className="py-2.5 px-3">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayedCandidateCars.map((car, cIdx) => {
                                                const isSelected = selectedCandidateVin === car.so_khung;
                                                return (
                                                    <tr
                                                        key={`${car.so_khung}_${cIdx}`}
                                                        onClick={() => setSelectedCandidateVin(car.so_khung)}
                                                        className={`cursor-pointer transition-colors ${
                                                            isSelected ? 'bg-indigo-50/80 font-medium' : 'hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <td className="py-2.5 px-3 text-center border-r border-slate-100">
                                                            <input
                                                                type="radio"
                                                                name="candidate_vin"
                                                                checked={isSelected}
                                                                onChange={() => setSelectedCandidateVin(car.so_khung)}
                                                                className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 font-mono font-bold text-indigo-700">
                                                            {car.so_khung}
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-slate-700">
                                                            {car.so_may || '-'}
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 text-center text-slate-600">
                                                            {car.nam_sx || '-'}
                                                        </td>
                                                        <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600">
                                                            {car.ngay_ct || '-'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={car.dien_giai}>
                                                            {car.dien_giai || '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                            <div>
                                {selectedCandidateVin ? (
                                    <span className="text-xs text-slate-700">
                                        Đang chọn VIN: <strong className="font-mono text-indigo-700 font-bold">{selectedCandidateVin}</strong>
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Vui lòng click vào 1 xe ở trên để chọn</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedContractForAssign(null)}
                                    disabled={isSavingAssign}
                                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmAssign}
                                    disabled={!selectedCandidateVin || isSavingAssign}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5"
                                >
                                    {isSavingAssign ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin text-xs"></i>
                                            <span>Đang lưu Cyber...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check text-xs"></i>
                                            <span>Xác nhận ghép xe</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 4 CONTENT: LẬP ĐỀ NGHỊ XUẤT XE / ĐIỀU CHUYỂN XE (PHDNX & CTDNX) */}
            {/* ============================================================= */}
            {activeSubTab === 'de_nghi_xuat' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-2xl border border-emerald-500/40 shadow-inner">
                                🚚
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white">Lập Giấy Đề Nghị Xuất Xe / Điều Chuyển Xe (Cyber)</h2>
                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-extrabold uppercase">
                                        Admin Only
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Ghi nhận trực tiếp phiếu chứng từ Đề Nghị Xuất Xe (`PHDNX` & `CTDNX`) vào cơ sở dữ liệu CyberSoft ERP
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                            <i className="fas fa-database text-emerald-400"></i>
                            <span>SQL Server: <strong className="text-white">CyberAppGolden_VanDao</strong></span>
                        </div>
                    </div>

                    {/* Main Form & Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Form Column */}
                        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <i className="fas fa-file-invoice text-emerald-600"></i>
                                <span>Nhập thông tin Đề nghị xuất xe (DNX)</span>
                            </h3>

                            {dnxError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                                    <i className="fas fa-exclamation-circle text-rose-500 text-sm"></i>
                                    <span>{dnxError}</span>
                                </div>
                            )}

                            {dnxResult && (
                                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-2 text-xs">
                                    <div className="font-bold text-sm text-emerald-800 flex items-center gap-2">
                                        <i className="fas fa-check-circle text-emerald-600 text-base"></i>
                                        <span>Đã tạo thành công phiếu {dnxResult.so_ct}!</span>
                                    </div>
                                    <div className="font-mono text-slate-700 space-y-0.5 pl-6 text-[11px]">
                                        <div>• Mã phiếu (`stt_rec`): <strong>{dnxResult.stt_rec}</strong></div>
                                        <div>• Người lập: <strong>{dnxResult.user_name} (ID {dnxResult.user_id})</strong></div>
                                        <div>• Tổng số xe: <strong>{dnxResult.total_cars} xe</strong></div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleCreateDnxSubmitInAdmin} className="space-y-4">
                                {/* Danh sách số VIN */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Danh sách số VIN (Mỗi dòng 1 VIN hoặc dán danh sách từ Excel): <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400">Đã nhận diện: {dnxVinInput.split(/[\n,;\s]+/).filter(v => v.trim().length >= 8).length} VIN</span>
                                    </div>
                                    <textarea
                                        rows={4}
                                        value={dnxVinInput}
                                        onChange={(e) => setDnxVinInput(e.target.value)}
                                        placeholder="Ví dụ:&#10;RLLVFPNT1TH829896&#10;RLLVFPNT0TH804858"
                                        className="w-full font-mono text-xs border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-slate-50 uppercase text-slate-900"
                                    />
                                </div>

                                {/* Kho Xuất & Kho Nhận */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Kho xuất xe:
                                        </label>
                                        <select
                                            value={dnxMaKhoXuat}
                                            onChange={(e) => setDnxMaKhoXuat(e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 bg-white text-slate-800"
                                        >
                                            <option value="K87">K87 - Kho xe ô tô QL13 - HCM</option>
                                            <option value="K86">K86 - Kho xe ô tô VinFast Q12 - HCM</option>
                                            <option value="K83">K83 - Kho xe ô tô Thuận An (Bình Dương)</option>
                                            <option value="K106">K106 - Kho xe ô tô Hà Huy Giáp</option>
                                            <option value="K103">K103 - Kho xe ô tô Lĩnh Nam</option>
                                            <option value="K17">K17 - Kho xe SR Cam Giá</option>
                                            <option value="KTN.NM">KTN.NM - Kho xe Nhà máy SXLR - Thái Nguyên</option>
                                            <option value="KTN.TT">KTN.TT - Kho xe Tân Thịnh - Thái Nguyên</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Kho nhận (Đích đến):
                                        </label>
                                        <select
                                            value={dnxMaKhoNhan}
                                            onChange={(e) => setDnxMaKhoNhan(e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 bg-white text-slate-800"
                                        >
                                            <option value="K83">K83 - Kho xe ô tô Thuận An (Bình Dương)</option>
                                            <option value="K87">K87 - Kho xe ô tô QL13 - HCM</option>
                                            <option value="K86">K86 - Kho xe ô tô VinFast Q12 - HCM</option>
                                            <option value="K106">K106 - Kho xe ô tô Hà Huy Giáp</option>
                                            <option value="K103">K103 - Kho xe ô tô Lĩnh Nam</option>
                                            <option value="K17">K17 - Kho xe SR Cam Giá</option>
                                            <option value="KTN.TT">KTN.TT - Kho xe Tân Thịnh - Thái Nguyên</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Tài khoản người lập & Tên Khách hàng */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Tài khoản người lập (`User_Name`):
                                        </label>
                                        <input
                                            type="text"
                                            value={dnxUserName}
                                            onChange={(e) => setDnxUserName(e.target.value)}
                                            placeholder="02.NHANPT"
                                            className="w-full font-mono text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 bg-white text-slate-800 font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Tên Khách hàng / Đối tượng giao:
                                        </label>
                                        <input
                                            type="text"
                                            value={dnxKhachHang}
                                            onChange={(e) => setDnxKhachHang(e.target.value)}
                                            placeholder="VD: Ngô Trí Dũng"
                                            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 bg-white text-slate-800"
                                        />
                                    </div>
                                </div>

                                {/* Lý do điều chuyển */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Lý do xuất / điều chuyển xe:
                                    </label>
                                    <input
                                        type="text"
                                        value={dnxLyDo}
                                        onChange={(e) => setDnxLyDo(e.target.value)}
                                        placeholder="VD: Lấy xe về PDI giao KH Ngô Trí Dũng"
                                        className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 bg-white text-slate-800"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmittingDnx}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingDnx ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin text-sm"></i>
                                                <span>Đang ghi nhận chứng từ lên CyberSoft ERP...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-bolt text-sm"></i>
                                                <span>⚡ Ghi Nhận Giấy Đề Nghị Xuất Xe Trực Tiếp Lên Cyber</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Presets & Recent Tickets Column */}
                        <div className="lg:col-span-5 space-y-4">
                            {/* Quick Presets Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <i className="fas fa-magic text-amber-500"></i>
                                    <span>Lựa chọn nhanh luồng điều chuyển xe:</span>
                                </h4>

                                <div className="space-y-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => { setDnxMaKhoXuat('K87'); setDnxMaKhoNhan('K83'); setDnxLyDo('Lấy xe từ Kho QL13 về Kho Thuận An làm PDI giao KH'); }}
                                        className="w-full p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900">Kho QL13 (`K87`) ➔ Kho Thuận An (`K83`)</div>
                                            <div className="text-[10px] text-slate-500">Luồng xe từ bãi QL13 về Showroom Thuận An PDI</div>
                                        </div>
                                        <i className="fas fa-arrow-right text-emerald-600 text-xs"></i>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setDnxMaKhoXuat('K86'); setDnxMaKhoNhan('K83'); setDnxLyDo('Lấy xe từ Kho Q12 về Kho Thuận An làm PDI giao KH'); }}
                                        className="w-full p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900">Kho Q12 (`K86`) ➔ Kho Thuận An (`K83`)</div>
                                            <div className="text-[10px] text-slate-500">Luồng xe từ bãi Quận 12 về Showroom Thuận An</div>
                                        </div>
                                        <i className="fas fa-arrow-right text-emerald-600 text-xs"></i>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setDnxMaKhoXuat('K106'); setDnxMaKhoNhan('K83'); setDnxLyDo('Lấy xe từ Kho Hà Huy Giáp về Kho Thuận An giao KH'); }}
                                        className="w-full p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900">Kho Hà Huy Giáp (`K106`) ➔ Kho Thuận An (`K83`)</div>
                                            <div className="text-[10px] text-slate-500">Điều xe từ bãi Hà Huy Giáp về Thuận An</div>
                                        </div>
                                        <i className="fas fa-arrow-right text-emerald-600 text-xs"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Recent Created Tickets History Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                                <h4 className="font-bold text-xs text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="flex items-center gap-1.5">
                                        <i className="fas fa-history text-blue-500"></i>
                                        <span>Phiếu DNX đã tạo mới trong phiên</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                        {recentDnxTickets.length} phiếu
                                    </span>
                                </h4>

                                {recentDnxTickets.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-400">
                                        <i className="fas fa-inbox text-2xl text-slate-300 block mb-1"></i>
                                        <span>Chưa có phiếu nào được tạo trong phiên này.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {recentDnxTickets.map((t, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                                                <div className="flex items-center justify-between font-mono font-bold text-emerald-700">
                                                    <span>{t.so_ct}</span>
                                                    <span className="text-[10px] font-sans px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Đã tạo trên Cyber</span>
                                                </div>
                                                <div className="text-[11px] text-slate-600">
                                                    Người lập: <strong>{t.user_name}</strong> | Mã: <span className="font-mono">{t.stt_rec}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    Tổng số xe xuất: <strong className="text-slate-900">{t.total_cars} VIN</strong>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 5 CONTENT: TRA CỨU & TIẾN TRÌNH DUYỆT PHIẾU (DNX & TD4) */}
            {/* ============================================================= */}
            {activeSubTab === 'tra_cuu_phieu' && (
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative z-10 overflow-hidden">
                    {/* Toolbar Filters */}
                    <div className="p-3.5 bg-white border-b border-slate-200 shadow-2xs space-y-3 shrink-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                                {/* Search input */}
                                <div className="flex-1 min-w-[220px] max-w-md relative">
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-white transition-all">
                                        <i className="fas fa-search text-xs text-slate-400 mr-2"></i>
                                        <input
                                            type="text"
                                            placeholder="Tìm theo số VIN, số phiếu, khách hàng, hợp đồng..."
                                            value={ticketSearch}
                                            onChange={e => setTicketSearch(e.target.value)}
                                            className="w-full bg-transparent text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none"
                                        />
                                        {ticketSearch && (
                                            <button type="button" onClick={() => setTicketSearch('')} className="text-slate-400 hover:text-slate-600 text-xs">
                                                <i className="fas fa-times-circle"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Filter: Loại chứng từ */}
                                <select
                                    value={ticketMaCt}
                                    onChange={e => setTicketMaCt(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 cursor-pointer"
                                >
                                    <option value="">Tất cả loại phiếu (DNX & TD4)</option>
                                    <option value="DNX">Đề Nghị Xuất Xe (DNX)</option>
                                    <option value="TD4">Phiếu Xe Ra Giao KH (TD4)</option>
                                </select>

                                {/* Filter: Trạng thái duyệt */}
                                <select
                                    value={ticketMaPost}
                                    onChange={e => setTicketMaPost(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 cursor-pointer"
                                >
                                    <option value="">Tất cả trạng thái duyệt</option>
                                    <option value="3">🟡 Post = 3 (Lập phiếu / Chờ duyệt)</option>
                                    <option value="9">🟢 Post = 9 (Đã duyệt / Xe đã ra)</option>
                                    <option value="1">🔴 Post = 1 (Đã hủy phiếu)</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => executeVoucherTicketsSearch()}
                                disabled={isLoadingTickets}
                                className="px-3.5 h-9 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                            >
                                <i className={`fas fa-sync-alt ${isLoadingTickets ? 'fa-spin' : ''}`}></i>
                                <span>Tải lại phiếu</span>
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="flex-1 min-h-0 overflow-auto p-3">
                        {isLoadingTickets ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
                                <i className="fas fa-circle-notch fa-spin text-3xl text-purple-600"></i>
                                <span className="text-xs font-semibold">Đang tải danh sách phiếu từ CyberSoft Enterprise...</span>
                            </div>
                        ) : displayedVoucherTickets.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                                <i className="fas fa-folder-open text-4xl text-slate-300"></i>
                                <span className="text-xs font-bold text-slate-600">Không tìm thấy phiếu nào phù hợp.</span>
                                <span className="text-[11px] text-slate-400">Thử thay đổi bộ lọc hoặc nhập từ khóa tìm kiếm khác.</span>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                                                <th className="p-3 text-center w-12">STT</th>
                                                <th className="p-3">Loại Phiếu</th>
                                                <th className="p-3">Số Phiếu</th>
                                                <th className="p-3">Ngày Lập</th>
                                                <th className="p-3 text-center">Trạng Thái Duyệt (Ma_Post)</th>
                                                <th className="p-3">Số Khung (VIN)</th>
                                                <th className="p-3">Số Máy</th>
                                                <th className="p-3">Khách Hàng / Diễn Giải</th>
                                                <th className="p-3">Số Hợp Đồng</th>
                                                <th className="p-3 text-right">Tổng Thanh Toán</th>
                                                <th className="p-3 text-center">Thao Tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {displayedVoucherTickets.map((t, idx) => {
                                                const isPost3 = String(t.ma_post) === '3';
                                                const isPost9 = String(t.ma_post) === '9';
                                                const isPost1 = String(t.ma_post) === '1';

                                                return (
                                                    <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                                                        <td className="p-3 text-center text-slate-400 text-[11px] font-mono">{idx + 1}</td>

                                                        {/* Loại phiếu */}
                                                        <td className="p-3">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${
                                                                t.voucher_type === 'DNX' 
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                                            }`}>
                                                                <i className={`fas ${t.voucher_type === 'DNX' ? 'fa-file-export' : 'fa-car-side'}`}></i>
                                                                <span>{t.voucher_type}</span>
                                                            </span>
                                                        </td>

                                                        {/* Số phiếu */}
                                                        <td className="p-3 font-mono font-bold text-slate-900">
                                                            {t.so_ct}
                                                        </td>

                                                        {/* Ngày lập */}
                                                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                                                            {t.ngay_ct}
                                                        </td>

                                                        {/* Trạng thái duyệt (Ma_Post) */}
                                                        <td className="p-3 text-center">
                                                            {isPost3 && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                                                    <span>Lập phiếu (Sale Admin) / Chờ duyệt</span>
                                                                </span>
                                                            )}
                                                            {isPost9 && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                    <span>Đã duyệt (QL Kho / Đã xuất xe)</span>
                                                                </span>
                                                            )}
                                                            {isPost1 && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                    <span>Đã hủy phiếu</span>
                                                                </span>
                                                            )}
                                                            {!isPost3 && !isPost9 && !isPost1 && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                                                    <span>Post = {t.ma_post}</span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* VIN */}
                                                        <td className="p-3 font-mono font-bold text-purple-700">
                                                            {t.vin || <span className="text-slate-300 italic">Chưa có VIN</span>}
                                                        </td>

                                                        {/* Số máy */}
                                                        <td className="p-3 font-mono text-slate-600 text-[11px]">
                                                            {t.so_may || '-'}
                                                        </td>

                                                        {/* Khách hàng / Diễn giải */}
                                                        <td className="p-3 max-w-[200px] truncate">
                                                            <div className="font-bold text-slate-800 truncate" title={t.ten_kh}>{t.ten_kh || 'Chuyển kho nội bộ'}</div>
                                                            <div className="text-[10px] text-slate-500 truncate" title={t.dien_giai}>{t.dien_giai}</div>
                                                        </td>

                                                        {/* Số HĐ */}
                                                        <td className="p-3 font-mono text-[11px] text-slate-600 max-w-[150px] truncate" title={t.so_hd}>
                                                            {t.so_hd || '-'}
                                                        </td>

                                                        {/* Tổng thanh toán */}
                                                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                                                            {t.tong_tien > 0 ? t.tong_tien.toLocaleString() + ' đ' : '-'}
                                                        </td>

                                                        {/* Thao tác */}
                                                        <td className="p-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedTicketModal(t)}
                                                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 mx-auto"
                                                            >
                                                                <i className="fas fa-eye text-[10px]"></i>
                                                                <span>Xem chi tiết</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* MODAL: XEM CHI TIẾT PHIẾU (DNX / TD4) */}
            {/* ============================================================= */}
            {selectedTicketModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scale-in">
                        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                    <i className="fas fa-file-invoice text-white text-sm"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm flex items-center gap-2">
                                        <span>Chi tiết {selectedTicketModal.voucher_name}</span>
                                        <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-xs">{selectedTicketModal.so_ct}</span>
                                    </h3>
                                    <p className="text-[10px] text-white/80">Stt_Rec: {selectedTicketModal.stt_rec}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTicketModal(null)}
                                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>

                        <div className="p-5 text-xs text-slate-700 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Trạng thái duyệt Badge Banner */}
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <span className="font-bold text-slate-600">Trạng thái xử lý (`Ma_Post`):</span>
                                {String(selectedTicketModal.ma_post) === '3' && (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-xs flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                        <span>Lập phiếu (Sale Admin) / Chờ duyệt</span>
                                    </span>
                                )}
                                {String(selectedTicketModal.ma_post) === '9' && (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold text-xs flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span>Đã duyệt (QL Kho / Đã xuất xe)</span>
                                    </span>
                                )}
                                {String(selectedTicketModal.ma_post) === '1' && (
                                    <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-bold text-xs flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        <span>Đã hủy phiếu</span>
                                    </span>
                                )}
                            </div>

                            {/* Thông tin chứng từ */}
                            <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                                <div><span className="text-slate-400">Số phiếu:</span> <strong className="font-mono text-purple-700">{selectedTicketModal.so_ct}</strong></div>
                                <div><span className="text-slate-400">Ngày chứng từ:</span> <strong className="font-mono">{selectedTicketModal.ngay_ct}</strong></div>
                                <div><span className="text-slate-400">Số khung (VIN):</span> <strong className="font-mono text-purple-700">{selectedTicketModal.vin || '-'}</strong></div>
                                <div><span className="text-slate-400">Số máy:</span> <strong className="font-mono">{selectedTicketModal.so_may || '-'}</strong></div>
                                <div><span className="text-slate-400">Dòng xe:</span> <strong>{selectedTicketModal.loai_xe || '-'}</strong></div>
                                <div><span className="text-slate-400">Showroom (TTCP):</span> <strong>{selectedTicketModal.ma_ttcp || '-'}</strong></div>
                                <div><span className="text-slate-400">Khách hàng:</span> <strong>{selectedTicketModal.ten_kh || '-'}</strong></div>
                                <div><span className="text-slate-400">Số hợp đồng:</span> <strong className="font-mono">{selectedTicketModal.so_hd || '-'}</strong></div>
                            </div>

                            {/* Diễn giải */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <div className="font-bold text-slate-500 text-[11px]">Nội dung / Diễn giải:</div>
                                <div className="text-slate-800 font-semibold">{selectedTicketModal.dien_giai || 'Không có diễn giải'}</div>
                            </div>

                            {/* Tiền hàng */}
                            {selectedTicketModal.tong_tien > 0 && (
                                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="text-[10px] text-purple-600 font-bold uppercase">Tổng phải thanh toán</div>
                                        <div className="font-mono font-extrabold text-sm text-purple-900">{selectedTicketModal.tong_tien.toLocaleString()} đ</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-emerald-600 font-bold uppercase">Đã thanh toán</div>
                                        <div className="font-mono font-extrabold text-sm text-emerald-800">{selectedTicketModal.da_thanh_toan.toLocaleString()} đ</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-rose-600 font-bold uppercase">Còn lại</div>
                                        <div className="font-mono font-extrabold text-sm text-rose-800">{selectedTicketModal.con_lai.toLocaleString()} đ</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedTicketModal(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* MODAL: XÁC NHẬN HỦY GHÉP XE (CP_BeXepXe_DELETE) */}
            {/* ============================================================= */}
            {contractToUnassign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="px-5 py-4 bg-rose-600 text-white flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                <i className="fas fa-triangle-exclamation text-white text-lg"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Xác nhận hủy ghép xe</h3>
                                <p className="text-[11px] text-white/80">Thao tác sẽ xóa số khung đã gán khỏi hợp đồng này trên CyberSoft ERP</p>
                            </div>
                        </div>

                        <div className="p-5 text-xs text-slate-700 space-y-2.5">
                            <p>Bạn có chắc chắn muốn hủy ghép xe cho hợp đồng này không?</p>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                                <div>Số HĐ: <strong className="font-mono text-slate-900 font-bold">{contractToUnassign.ma_hd}</strong></div>
                                <div>Khách hàng: <strong className="text-slate-900">{contractToUnassign.ten_kh}</strong></div>
                                <div>Dòng xe: <strong>{contractToUnassign.ten_kx}</strong></div>
                                <div>Số khung đang ghép: <strong className="font-mono text-rose-600 font-bold">{contractToUnassign.so_khung}</strong></div>
                            </div>
                            <p className="text-[11px] text-slate-500 italic">
                                Lưu ý: Chỉ các hợp đồng chưa xuất hóa đơn mới có thể hủy ghép.
                            </p>
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setContractToUnassign(null)}
                                disabled={isDeletingAssign}
                                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnassign}
                                disabled={isDeletingAssign}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5"
                            >
                                {isDeletingAssign ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin text-xs"></i>
                                        <span>Đang hủy...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-trash-alt text-xs"></i>
                                        <span>Xác nhận hủy ghép</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
