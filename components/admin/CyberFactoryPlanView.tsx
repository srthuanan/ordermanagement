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
    lookupCyberVinWarehouse,
    getCyberVoucherTickets,
    CyberVoucherTicketItem,
    CyberXepXeContract,
    CyberXepXeCandidate,
    CyberXepXeFilterParams,
    prewarmTd4Pdfs
} from '../../services/api/stockService';
import { CyberDnxPrintModal, CyberDnxPrintData } from './CyberDnxPrintModal';
import { CyberTd4PrintModal } from './CyberTd4PrintModal';
import { getTransferRequests, updateTransferRequestStatus, TransferRequestItem } from '../../services/api/transferService';
import { supabase } from '../../services/supabaseClient';

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
    const dnxMaTtcp = '02.01.08';
    const [dnxUserName, setDnxUserName] = useState('02.NHANPT');
    const [isSubmittingDnx, setIsSubmittingDnx] = useState(false);
    const [dnxResult, setDnxResult] = useState<any>(null);
    const [dnxError, setDnxError] = useState('');
    const [recentDnxTickets, setRecentDnxTickets] = useState<any[]>([]);
    const [voucherTickets, setVoucherTickets] = useState<CyberVoucherTicketItem[]>([]);
    const [isLoadingRecentTickets, setIsLoadingRecentTickets] = useState(false);
    const [printTicketData, setPrintTicketData] = useState<CyberDnxPrintData | null>(null);
    const [printTd4Data, setPrintTd4Data] = useState<CyberVoucherTicketItem | null>(null);

    // Tự động tải danh sách phiếu DNX gần nhất từ CyberSoft ERP
    const loadRecentDnxTickets = async () => {
        setIsLoadingRecentTickets(true);
        try {
            const res = await getCyberVoucherTickets({
                ma_ct: 'DNX',
                limit: 30,
                ma_ttcp: '02.01.08'
            });
            if (res && res.success && Array.isArray(res.data)) {
                setRecentDnxTickets(res.data);
            }
        } catch (err) {
            console.error("Lỗi tải danh sách phiếu DNX gần nhất:", err);
        } finally {
            setIsLoadingRecentTickets(false);
        }
    };

    // Tự động tải danh sách phiếu DNX gần nhất từ CyberSoft ERP
    useEffect(() => {
        loadRecentDnxTickets();
    }, []);

    // Yêu cầu chuyển xe từ TVBH
    const [pendingTransferRequests, setPendingTransferRequests] = useState<TransferRequestItem[]>([]);
    const [isLoadingTransferRequests, setIsLoadingTransferRequests] = useState(false);
    const [activeTransferRequestId, setActiveTransferRequestId] = useState<string | null>(null);

    const loadPendingTransferRequests = async () => {
        setIsLoadingTransferRequests(true);
        try {
            const list = await getTransferRequests('pending');
            setPendingTransferRequests(list);
        } catch (e) {
            console.error("Lỗi tải yêu cầu chuyển xe từ TVBH:", e);
        } finally {
            setIsLoadingTransferRequests(false);
        }
    };

    const handleApplyTransferRequest = (req: TransferRequestItem) => {
        setDnxVinInput(req.vin);
        setDnxKhachHang(req.customerName || '');
        setDnxMaKhoXuat(req.fromWarehouse || 'K87');
        setDnxMaKhoNhan(req.toWarehouse || 'K83');
        setDnxLyDo(req.reason || 'Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH');
        setActiveTransferRequestId(req.id);
        showToast('Đã nạp yêu cầu', `Đã nạp thông tin chuyển xe VIN ${req.vin} của TVBH ${req.consultantName} vào form DNX`, 'info');
    };

    const handleRejectTransferRequest = async (req: TransferRequestItem) => {
        const reason = window.prompt(
            `Hủy/Từ chối yêu cầu chuyển xe VIN ${req.vin} của TVBH ${req.consultantName}?\nNhập lý do từ chối (hoặc để trống):`,
            'Admin từ chối điều chuyển'
        );
        if (reason === null) return; // Người dùng bấm Hủy

        try {
            const res = await updateTransferRequestStatus(
                req.id, 
                'rejected', 
                undefined, 
                reason.trim() || 'Admin từ chối điều chuyển'
            );
            if (res.success) {
                if (activeTransferRequestId === req.id) {
                    setActiveTransferRequestId(null);
                }
                await loadPendingTransferRequests();
                showToast('Đã hủy yêu cầu', `Đã từ chối yêu cầu chuyển xe VIN ${req.vin} của TVBH ${req.consultantName}`, 'info');
            } else {
                throw new Error(res.error || 'Lỗi khi từ chối yêu cầu');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Không thể từ chối yêu cầu', 'error');
        }
    };

    // Tự động tải danh sách yêu cầu chuyển xe từ TVBH và theo dõi realtime khi mở Kế Hoạch Cyber
    useEffect(() => {
        if (!isActive) return;
        loadPendingTransferRequests();

        // Lắng nghe realtime các yêu cầu chuyển xe mới được TVBH gửi
        const channel = supabase
            .channel('admin-transfer-requests-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'interactions', filter: 'category=eq.TRANSFER_REQUEST' },
                () => {
                    loadPendingTransferRequests();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isActive]);

    // Tự động tải lại danh sách phiếu DNX gần nhất và yêu cầu chuyển xe khi vào sub-tab Lập Phiếu DNX
    useEffect(() => {
        if (isActive && activeSubTab === 'de_nghi_xuat') {
            loadRecentDnxTickets();
            loadPendingTransferRequests();
        }
    }, [isActive, activeSubTab]);

    const handlePrintFromRecentList = (t: any) => {
        if (t.cars && Array.isArray(t.cars) && t.cars.length > 0) {
            setPrintTicketData(t);
            return;
        }

        const printData: CyberDnxPrintData = {
            so_ct: t.so_ct,
            stt_rec: t.stt_rec,
            ngay_ct: t.ngay_ct,
            user_name: t.nvkd || t.user_name || '02.NHANPT',
            ma_kho_xuat: t.ma_kho_xuat || 'K87',
            ma_kho_nhan: t.ma_kho_nhan || 'K83',
            khach_hang: t.ten_kh || t.ong_ba || '',
            don_vi: 'Thuận An',
            ly_do: t.dien_giai || 'Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH',
            total_cars: 1,
            cars: [{
                stt_rec0: '0001',
                vin: t.vin,
                so_may: t.so_may || '',
                ma_kx: t.loai_xe || t.ma_kx || '',
                ten_kx: t.ten_kx || t.loai_xe || '',
                dong_xe: t.ten_kx || t.loai_xe || '',
                ma_mau: t.ma_mau || '',
                ten_mau: t.ten_mau || t.ma_mau || '',
                ma_kho_xuat: t.ma_kho_xuat || 'K87',
                ma_kho_nhan: t.ma_kho_nhan || 'K83'
            }]
        };
        setPrintTicketData(printData);
    };

    // Tự động tra cứu kho tồn thực tế trên CyberSoft khi nhập số VIN
    const [isLookingUpVin, setIsLookingUpVin] = useState(false);
    const [detectedWarehouseName, setDetectedWarehouseName] = useState('');
    const [cachedCarDetails, setCachedCarDetails] = useState<Record<string, any>>({});
    const [lookupResultInfo, setLookupResultInfo] = useState<{
        found: boolean;
        ma_kho?: string;
        ten_kho?: string;
        carInfo?: string;
        cars?: any[];
        error?: string;
    } | null>(null);

    const extractedVins = useMemo(() => {
        return dnxVinInput
            .split(/[\n,;\s]+/)
            .map(v => v.trim().toUpperCase())
            .filter(v => v.length >= 8);
    }, [dnxVinInput]);

    useEffect(() => {
        if (extractedVins.length === 0) {
            setLookupResultInfo(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLookingUpVin(true);
            try {
                const res = await lookupCyberVinWarehouse(extractedVins);
                if (res.success && res.found && res.ma_kho) {
                    setDnxMaKhoXuat(res.ma_kho);
                    setDetectedWarehouseName(res.ten_kho || res.ma_kho);

                    if (res.cars && res.cars.length > 0) {
                        const map: Record<string, any> = {};
                        res.cars.forEach((c: any) => {
                            if (c.vin) map[c.vin] = c;
                        });
                        setCachedCarDetails(prev => ({ ...prev, ...map }));
                    }

                    const firstCar = res.cars && res.cars[0];
                    const carDesc = firstCar 
                        ? [firstCar.ten_kx, firstCar.ten_mau, firstCar.so_may ? `Số máy: ${firstCar.so_may}` : '']
                            .filter(Boolean).join(' • ')
                        : '';

                    setLookupResultInfo({
                        found: true,
                        ma_kho: res.ma_kho,
                        ten_kho: res.ten_kho,
                        carInfo: carDesc,
                        cars: res.cars
                    });
                } else {
                    setLookupResultInfo({
                        found: false,
                        error: res.error || 'Chưa tìm thấy vị trí kho tồn của xe này trên Cyber'
                    });
                }
            } catch (err: any) {
                setLookupResultInfo({
                    found: false,
                    error: err.message || 'Lỗi tra cứu vị trí kho trên Cyber'
                });
            } finally {
                setIsLookingUpVin(false);
            }
        }, 450);

        return () => clearTimeout(timer);
    }, [extractedVins.join(',')]);

    // Phát hiện phiếu đã tồn tại (DNX hoặc TD4) để ngăn chặn tạo trùng lặp
    const detectedExistingTicket = useMemo(() => {
        if (!extractedVins || extractedVins.length === 0) return null;

        // 1. Kiểm tra từ kết quả tra cứu trực tiếp từ CSDL Cyber
        if (lookupResultInfo?.cars && lookupResultInfo.cars.length > 0) {
            for (const c of lookupResultInfo.cars) {
                if (c.has_td4 && c.td4) {
                    return {
                        type: 'TD4',
                        title: 'Phiếu Hẹn Giao Xe / Giấy Ra Cổng (TD4)',
                        so_ct: c.td4.so_ct || 'TD4',
                        stt_rec: c.td4.stt_rec || '',
                        ngay_ct: c.td4.ngay_ct || '',
                        vin: c.vin,
                        ten_kh: c.td4.ten_kh || '',
                        dien_giai: c.td4.dien_giai || '',
                        so_hd: c.td4.so_hd || '',
                        so_may: c.td4.so_may || c.so_may || '',
                        raw: c.td4
                    };
                }
                if (c.has_dnx && c.dnx) {
                    return {
                        type: 'DNX',
                        title: 'Phiếu Đề Nghị Xuất Xe (DNX)',
                        so_ct: c.dnx.so_ct || 'DNX',
                        stt_rec: c.dnx.stt_rec || '',
                        ngay_ct: c.dnx.ngay_ct || '',
                        vin: c.vin,
                        ten_kh: c.dnx.ten_kh || '',
                        dien_giai: c.dnx.dien_giai || '',
                        ma_kho_xuat: c.dnx.ma_kho_xuat || '',
                        ten_kho_xuat: c.dnx.ten_kho_xuat || '',
                        ma_kho_nhan: c.dnx.ma_kho_nhan || '',
                        ten_kho_nhan: c.dnx.ten_kho_nhan || '',
                        so_may: c.dnx.so_may || c.so_may || '',
                        ten_kx: c.dnx.ten_kx || c.ten_kx || '',
                        ten_mau: c.dnx.ten_mau || c.ten_mau || '',
                        raw: c.dnx
                    };
                }
            }
        }

        // 2. Kiểm tra từ danh sách recentDnxTickets
        for (const t of recentDnxTickets) {
            if (t.cars && Array.isArray(t.cars)) {
                const matchCar = t.cars.find((c: any) => extractedVins.includes((c.vin || '').toUpperCase()));
                if (matchCar) {
                    return {
                        type: 'DNX',
                        title: 'Phiếu Đề Nghị Xuất Xe (DNX)',
                        so_ct: t.so_ct || 'DNX',
                        stt_rec: t.stt_rec || '',
                        ngay_ct: t.ngay_ct || '',
                        vin: matchCar.vin,
                        ten_kh: t.khach_hang || '',
                        dien_giai: t.ly_do || '',
                        ma_kho_xuat: t.ma_kho_xuat || '',
                        ten_kho_xuat: t.ten_kho_xuat || '',
                        ma_kho_nhan: t.ma_kho_nhan || '',
                        ten_kho_nhan: t.ten_kho_nhan || '',
                        raw: t
                    };
                }
            }
        }

        // 3. Kiểm tra từ danh sách voucherTickets
        for (const t of voucherTickets) {
            const ticketVin = (t.vin || t.so_khung || '').toUpperCase();
            if (ticketVin && extractedVins.includes(ticketVin)) {
                const isTd4 = (t.voucher_type || t.ma_ct || '').toUpperCase() === 'TD4' || (t.so_ct || '').includes('PXR') || (t.so_ct || '').includes('TD');
                return {
                    type: isTd4 ? 'TD4' : 'DNX',
                    title: isTd4 ? 'Phiếu Hẹn Giao Xe / Giấy Ra Cổng (TD4)' : 'Phiếu Đề Nghị Xuất Xe (DNX)',
                    so_ct: t.so_ct || (isTd4 ? 'TD4' : 'DNX'),
                    stt_rec: t.stt_rec || '',
                    ngay_ct: t.ngay_ct || '',
                    vin: ticketVin,
                    ten_kh: t.ten_kh || '',
                    dien_giai: t.dien_giai || '',
                    raw: t
                };
            }
        }

        return null;
    }, [extractedVins, lookupResultInfo, recentDnxTickets, voucherTickets]);

    // Mở modal in ấn / xem chi tiết cho phiếu đã tồn tại
    const handleOpenExistingTicketPrint = (ticket: any) => {
        if (!ticket) return;
        if (ticket.type === 'TD4') {
            const td4Data: CyberVoucherTicketItem = {
                voucher_type: 'TD4',
                voucher_name: 'Phiếu Hẹn Giao Xe / Giấy Ra Cổng (TD4)',
                stt_rec: ticket.stt_rec || '',
                so_ct: ticket.so_ct || '',
                ngay_ct: ticket.ngay_ct || '',
                ma_ct: 'TD4',
                ma_post: ticket.raw?.ma_post || '3',
                dien_giai: ticket.dien_giai || '',
                ten_kh: ticket.ten_kh || '',
                so_hd: ticket.so_hd || ticket.raw?.so_hd || '',
                tong_tien: Number(ticket.raw?.tong_tien || 0),
                da_thanh_toan: Number(ticket.raw?.da_thanh_toan || 0),
                con_lai: Number(ticket.raw?.con_lai || 0),
                so_may: ticket.so_may || ticket.raw?.so_may || '',
                loai_xe: ticket.raw?.loai_xe || '',
                vin: ticket.vin || '',
                so_khung: ticket.vin || ''
            };
            setPrintTd4Data(td4Data);
        } else {
            const dnxData: CyberDnxPrintData = {
                so_ct: ticket.so_ct || 'DNX',
                stt_rec: ticket.stt_rec || '',
                user_name: 'Phạm Thành Nhân',
                ma_kho_xuat: ticket.ma_kho_xuat || ticket.raw?.ma_kho_xuat || 'K87',
                ten_kho_xuat: ticket.ten_kho_xuat || ticket.raw?.ten_kho_xuat || '',
                ma_kho_nhan: ticket.ma_kho_nhan || ticket.raw?.ma_kho_nhan || 'K83',
                ten_kho_nhan: ticket.ten_kho_nhan || ticket.raw?.ten_kho_nhan || 'Kho xe ô tô Thuận An',
                khach_hang: ticket.ten_kh || ticket.raw?.khach_hang || '',
                don_vi: 'Thuận An',
                ly_do: ticket.dien_giai || ticket.raw?.ly_do || 'Điều chuyển xe nội bộ',
                total_cars: 1,
                ngay_ct: ticket.ngay_ct || new Date().toISOString().slice(0, 10),
                cars: [{
                    stt_rec0: '0001',
                    vin: ticket.vin || '',
                    so_may: ticket.so_may || ticket.raw?.so_may || '',
                    ma_kx: ticket.raw?.ma_kx || '',
                    ten_kx: ticket.ten_kx || ticket.raw?.ten_kx || '',
                    dong_xe: ticket.ten_kx || ticket.raw?.ten_kx || '',
                    ma_mau: ticket.raw?.ma_mau || '',
                    ten_mau: ticket.ten_mau || ticket.raw?.ten_mau || '',
                    ma_kho_xuat: ticket.ma_kho_xuat || ticket.raw?.ma_kho_xuat || 'K87',
                    ma_kho_nhan: ticket.ma_kho_nhan || ticket.raw?.ma_kho_nhan || 'K83'
                }]
            };
            setPrintTicketData(dnxData);
        }
    };

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

        // CHẶN TẠO TRÙNG LẶP NẾU PHIẾU ĐÃ TỒN TẠI
        if (detectedExistingTicket) {
            setDnxError(`Xe có số VIN ${detectedExistingTicket.vin} đã tồn tại ${detectedExistingTicket.title} số ${detectedExistingTicket.so_ct}. Hệ thống chặn tạo phiếu trùng lặp!`);
            handleOpenExistingTicketPrint(detectedExistingTicket);
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
                ma_ttcp: dnxMaTtcp || '02.01.08'
            });

            // Nếu Backend trả về cảnh báo đã tồn tại chứng từ
            if (!res.success && res.already_exists && res.existing_ticket) {
                const ex = res.existing_ticket;
                setDnxError(res.error || `Xe đã có phiếu số ${ex.so_ct}. Hệ thống chặn tạo trùng lặp.`);
                handleOpenExistingTicketPrint({
                    type: ex.ticket_type || 'DNX',
                    title: ex.ticket_type === 'TD4' ? 'Phiếu Hẹn Giao Xe / Giấy Ra Cổng (TD4)' : 'Phiếu Đề Nghị Xuất Xe (DNX)',
                    ...ex
                });
                return;
            }

            if (res.success) {
                const enrichedTicket: CyberDnxPrintData = {
                    so_ct: res.so_ct || 'DNX',
                    stt_rec: res.stt_rec || '',
                    user_name: dnxUserName || res.user_name || '02.NHANPT',
                    ma_kho_xuat: dnxMaKhoXuat,
                    ma_kho_nhan: dnxMaKhoNhan,
                    khach_hang: dnxKhachHang,
                    don_vi: 'Thuận An',
                    ly_do: dnxLyDo,
                    total_cars: res.total_cars || rawVins.length,
                    ngay_ct: new Date().toISOString().slice(0, 10),
                    cars: (res.cars && res.cars.length > 0) ? res.cars : rawVins.map((vin, idx) => {
                        const cached = cachedCarDetails[vin];
                        return {
                            stt_rec0: String(idx + 1).padStart(4, '0'),
                            vin: vin,
                            so_may: cached?.so_may || '',
                            ma_kx: cached?.ma_kx || '',
                            ten_kx: cached?.ten_kx || '',
                            dong_xe: cached?.ten_kx || '',
                            ma_mau: cached?.ma_mau || '',
                            ten_mau: cached?.ten_mau || '',
                            ma_kho_xuat: cached?.ma_kho || dnxMaKhoXuat,
                            ma_kho_nhan: dnxMaKhoNhan
                        };
                    })
                };
                setDnxResult(enrichedTicket);
                showToast('Tạo giấy chuyển Cyber', `Đã tạo thành công phiếu ${res.so_ct} cho ${res.total_cars} xe`, 'success');
                setRecentDnxTickets(prev => [enrichedTicket, ...prev]);
                setDnxVinInput('');
                // Mở cửa sổ xem trước & in phiếu chuẩn CyberSoft ngay lập tức
                setPrintTicketData(enrichedTicket);

                // Nếu đang xử lý yêu cầu chuyển xe từ TVBH, hoặc có yêu cầu khớp VIN, cập nhật trạng thái completed kèm dữ liệu in phiếu
                const matchingReqs = pendingTransferRequests.filter(r => 
                    r.id === activeTransferRequestId || rawVins.some(v => v.toUpperCase() === (r.vin || '').toUpperCase())
                );

                if (matchingReqs.length > 0) {
                    for (const req of matchingReqs) {
                        updateTransferRequestStatus(req.id, 'completed', res.so_ct || 'DNX', undefined, enrichedTicket);
                    }
                    if (activeTransferRequestId) {
                        setActiveTransferRequestId(null);
                    }
                    setTimeout(() => {
                        loadPendingTransferRequests();
                    }, 1000);
                } else if (activeTransferRequestId) {
                    updateTransferRequestStatus(activeTransferRequestId, 'completed', res.so_ct || 'DNX', undefined, enrichedTicket);
                    setActiveTransferRequestId(null);
                    setTimeout(() => {
                        loadPendingTransferRequests();
                    }, 1000);
                }

                // Đồng bộ lại danh sách từ CyberSoft sau khi database commit
                setTimeout(() => {
                    loadRecentDnxTickets();
                }, 1500);
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
                limit: 250,
                ma_ttcp: '02.01.08'
            });
            if (res && res.success) {
                const tickets = res.data || [];
                setVoucherTickets(tickets);
                // Pre-generate PDF nền cho tất cả phiếu TD4 → bấm In là mở ngay!
                prewarmTd4Pdfs(tickets);
            } else {
                throw new Error(res?.error || 'Lỗi tra cứu chứng từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi tra cứu', err.message || 'Không thể lấy dữ liệu chứng từ CyberSoft', 'error');
        } finally {
            setIsLoadingTickets(false);
        }
    };

    // Lọc tức thì dữ liệu chứng từ trên máy khách khi nhập từ khóa tìm kiếm (sắp xếp theo thời gian tạo mới nhất)
    const displayedVoucherTickets = useMemo(() => {
        let list = [...voucherTickets];
        // Sắp xếp giảm dần theo thời gian tạo: ngày lập -> giờ lập -> số chứng từ
        list.sort((a, b) => {
            const dateA = a.ngay_ct || '';
            const dateB = b.ngay_ct || '';
            if (dateA !== dateB) {
                return dateB.localeCompare(dateA);
            }
            const timeA = (a.gio_ct || '').trim() || '12:00';
            const timeB = (b.gio_ct || '').trim() || '12:00';
            if (timeA !== timeB) {
                return timeB.localeCompare(timeA);
            }
            const soA = a.so_ct || '';
            const soB = b.so_ct || '';
            return soB.localeCompare(soA);
        });

        const rawQ = (ticketSearch || '').trim();
        if (!rawQ) return list;
        const qNoTone = removeVietnameseTones(rawQ);
        return list.filter(t => {
            const fullText = removeVietnameseTones(`${t.so_ct} ${t.vin} ${t.so_may} ${t.ten_kh} ${t.ten_tvbh} ${t.nguoi_nhan} ${t.so_hd} ${t.dien_giai} ${t.voucher_name} ${t.loai_xe}`);
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
    const [xepXeShowroomInvoicedFilter, setXepXeShowroomInvoicedFilter] = useState<string>('ALL');

    const [isLoadingXepXe, setIsLoadingXepXe] = useState<boolean>(false);
    const [hasLoadedXepXe, setHasLoadedXepXe] = useState<boolean>(false);
    const [xepXeContracts, setXepXeContracts] = useState<CyberXepXeContract[]>([]);
    const [xepXeStatusCounts, setXepXeStatusCounts] = useState<Record<string, number>>({});
    const [xepXeShowrooms, setXepXeShowrooms] = useState<string[]>([
        'Ô tô Vinfast Thuận An',
        'Ô tô Vinfast Minh Đạo - Nguyễn Trãi',
        'Ô tô Vinfast Dĩ An',
        'Ô tô Vinfast Cam Giá',
        'Ô tô Vinfast Bắc Ninh',
        'Ô tô Vinfast Times City',
        'Ô tô Vinfast 03/2',
        'Ô tô Vinfast Minh Đạo - Tân Thịnh'
    ]);
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
    const [xepXePage, setXepXePage] = useState<number>(1);
    const XEP_XE_PAGE_SIZE = 50;

    // Thống kê số lượng xe Đã xuất HĐ theo từng Showroom
    const invoicedShowroomsBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const c of xepXeContracts) {
            const isInvoiced = c.ten_color === 'Đã xuất HĐ' || (c.back_color || '').toLowerCase() === 'violet';
            if (isInvoiced) {
                const sr = (c.ten_ttcp || '').trim() || 'Chưa rõ Showroom';
                counts[sr] = (counts[sr] || 0) + 1;
            }
        }
        return counts;
    }, [xepXeContracts]);

    // Danh sách hợp đồng hiển thị sau khi lọc trên client
    const displayedXepXeContracts = useMemo(() => {
        let list = xepXeContracts;

        // 1. Nếu có từ khóa tìm kiếm (gõ từ khóa hoặc dán nhiều VIN/HĐ từ Excel)
        if (xepXeKeyword.trim()) {
            // Tìm kiếm ngay trên TOÀN BỘ dữ liệu hợp đồng đã tải về (bao gồm mọi Showroom)
            list = filterXepXeLocally(list, xepXeKeyword);

            // Khi đang tìm kiếm, nếu người dùng bấm chọn 1 trạng thái cụ thể (khác approved_and_pending mặc định và khác all)
            if (xepXeStatusFilter && xepXeStatusFilter !== 'all' && xepXeStatusFilter !== 'approved_and_pending') {
                list = list.filter(c => (c.ten_color || '').trim().toLowerCase() === xepXeStatusFilter.trim().toLowerCase());
            }

            // Lưu ý: Khi tìm theo VIN/Số HĐ, KHÔNG lọc showroom để tránh ẩn kết quả từ showroom khác!
        } else {
            // Khi không tìm kiếm: áp dụng lọc Showroom thông thường
            if (xepXeShowroom && xepXeShowroom !== 'ALL') {
                const srLower = xepXeShowroom.toLowerCase();
                list = list.filter(c => (c.ten_ttcp || '').toLowerCase().includes(srLower) || srLower.includes((c.ten_ttcp || '').toLowerCase()));
            }

            // Áp dụng lọc trạng thái mặc định (approved_and_pending) hoặc trạng thái được chọn
            if (xepXeStatusFilter === 'approved_and_pending') {
                list = list.filter(c => {
                    const s = (c.ten_color || '').trim().toLowerCase();
                    return s === 'chờ duyệt' || s === 'đã ghép sk' || s === 'chờ ghép sk';
                });
            } else if (xepXeStatusFilter && xepXeStatusFilter !== 'all') {
                list = list.filter(c => (c.ten_color || '').trim().toLowerCase() === xepXeStatusFilter.trim().toLowerCase());
            }
        }

        // Lọc phụ theo Showroom xuất hóa đơn (nếu đang ở bộ lọc Đã xuất HĐ)
        if (xepXeStatusFilter === 'Đã xuất HĐ' && xepXeShowroomInvoicedFilter && xepXeShowroomInvoicedFilter !== 'ALL') {
            const filterSrLower = xepXeShowroomInvoicedFilter.toLowerCase();
            list = list.filter(c => (c.ten_ttcp || '').toLowerCase().includes(filterSrLower) || filterSrLower.includes((c.ten_ttcp || '').toLowerCase()));
        }

        if (xepXeModel) {
            list = list.filter(c => (c.ten_kx || c.ma_kx || '').toLowerCase() === xepXeModel.toLowerCase());
        }

        return list;
    }, [xepXeContracts, xepXeStatusFilter, xepXeShowroom, xepXeShowroomInvoicedFilter, xepXeModel, xepXeKeyword]);

    const totalXepXePages = useMemo(() => {
        return Math.max(1, Math.ceil(displayedXepXeContracts.length / XEP_XE_PAGE_SIZE));
    }, [displayedXepXeContracts.length]);

    const paginatedXepXeContracts = useMemo(() => {
        const start = (xepXePage - 1) * XEP_XE_PAGE_SIZE;
        return displayedXepXeContracts.slice(start, start + XEP_XE_PAGE_SIZE);
    }, [displayedXepXeContracts, xepXePage]);

    useEffect(() => {
        if (xepXePage > totalXepXePages) {
            setXepXePage(1);
        }
    }, [totalXepXePages, xepXePage]);

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
            const currentKeyword = overrides?.keyword !== undefined ? overrides.keyword : xepXeKeyword;
            const params: CyberXepXeFilterParams = {
                thang1: xepXeThang1,
                nam1: xepXeNam1,
                thang2: xepXeThang2,
                nam2: xepXeNam2,
                ma_dvcs: '02',
                showroom: currentShowroom || 'ALL',
                keyword: currentKeyword ? currentKeyword.trim() : undefined,
                force: overrides?.force ?? false,
                ...overrides
            };
            const res = await getCyberXepXeContracts(params);
            if (res && res.success) {
                setXepXeContracts(res.contracts || []);
                setXepXePage(1);
                setXepXeStatusCounts(res.status_counts || {});
                if (res.showrooms && res.showrooms.length > 0) {
                    setXepXeShowrooms(prev => Array.from(new Set([...prev, ...res.showrooms])));
                }
                if (res.models && res.models.length > 0) setXepXeModels(res.models);

                // Nếu người dùng đang tra cứu số khung/HĐ và tìm thấy xe đã xuất HĐ
                if (currentKeyword && res.contracts && res.contracts.length > 0) {
                    const invoicedMatch = res.contracts.find(c => c.ten_color === 'Đã xuất HĐ' || (c.back_color || '').toLowerCase() === 'violet');
                    if (invoicedMatch) {
                        showToast(
                            'Đã tìm thấy xe xuất HĐ',
                            `Showroom xuất HĐ: ${invoicedMatch.ten_ttcp || 'Không xác định'} • Số HĐ: ${invoicedMatch.ma_hd || invoicedMatch.so_ct}`,
                            'success'
                        );
                    }
                }
            } else {
                throw new Error(res?.error || 'Lỗi tải danh sách hợp đồng xếp xe từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi tra cứu', err.message || 'Không thể tải danh sách hợp đồng', 'error');
        } finally {
            setIsLoadingXepXe(false);
        }
    };

    const handleXepXeReset = () => {
        setXepXeShowroom(DEFAULT_SHOWROOM);
        setXepXeModel('');
        setXepXeStatusFilter('approved_and_pending');
        setXepXeKeyword('');
        setXepXeShowroomInvoicedFilter('ALL');
        executeXepXeSearch({
            showroom: DEFAULT_SHOWROOM,
            keyword: '',
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
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-slate-200 overflow-hidden animate-fade-in relative z-0 font-sans">
            <AnimatedBackground />

            {/* COLUMN 1: LEFT SUB-TAB FOLDER SIDEBAR */}
            <div className="w-full md:w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col relative z-10">
                {/* Sub-tab Folder List */}
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {/* Tab 1: Kế Hoạch */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('factory_plan')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                            activeSubTab === 'factory_plan'
                                ? 'bg-blue-600 text-white shadow-xs font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <i className="fas fa-truck-ramp-box w-4 text-center text-xs opacity-90"></i>
                            <span>Kế Hoạch Nhà Máy</span>
                        </div>
                        {totalCount > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                activeSubTab === 'factory_plan' ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700 border border-slate-200'
                            }`}>
                                {totalCount.toLocaleString()}
                            </span>
                        )}
                    </button>

                    {/* Tab 2: Tồn Kho */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('ton_kho')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                            activeSubTab === 'ton_kho'
                                ? 'bg-blue-600 text-white shadow-xs font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <i className="fas fa-warehouse w-4 text-center text-xs opacity-90"></i>
                            <span>Báo Cáo Tồn Kho</span>
                        </div>
                        {(tonKhoNotInvoiced > 0 || tonKhoCars.length > 0) && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                activeSubTab === 'ton_kho' ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700 border border-slate-200'
                            }`}>
                                {(tonKhoNotInvoiced || tonKhoCars.length).toLocaleString()}
                            </span>
                        )}
                    </button>

                    {/* Tab 3: Xếp Xe */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('xep_xe')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                            activeSubTab === 'xep_xe'
                                ? 'bg-blue-600 text-white shadow-xs font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <i className="fas fa-car-side w-4 text-center text-xs opacity-90"></i>
                            <span>Xếp Xe Hợp Đồng</span>
                        </div>
                        {xepXeContracts.length > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                activeSubTab === 'xep_xe' ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700 border border-slate-200'
                            }`}>
                                {xepXeContracts.length.toLocaleString()}
                            </span>
                        )}
                    </button>

                    <div className="my-1.5 border-t border-slate-200/70"></div>

                    {/* Tab 4: Lập Phiếu DNX */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('de_nghi_xuat')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                            activeSubTab === 'de_nghi_xuat'
                                ? 'bg-blue-600 text-white shadow-xs font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <i className="fas fa-truck w-4 text-center text-xs opacity-90"></i>
                            <span>Lập Phiếu DNX</span>
                        </div>
                        {pendingTransferRequests.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                                {pendingTransferRequests.length} YC
                            </span>
                        )}
                    </button>

                    {/* Tab 5: Tiến Trình Phiếu */}
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('tra_cuu_phieu')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                            activeSubTab === 'tra_cuu_phieu'
                                ? 'bg-blue-600 text-white shadow-xs font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <i className="fas fa-file-invoice w-4 text-center text-xs opacity-90"></i>
                            <span>Tiến Trình Phiếu</span>
                        </div>
                        {voucherTickets.length > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                activeSubTab === 'tra_cuu_phieu' ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700 border border-slate-200'
                            }`}>
                                {voucherTickets.length.toLocaleString()}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* COLUMN 2: MAIN WORKSPACE AREA */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative z-10 overflow-hidden">

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
                                    className="h-9 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
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
                            <span className="font-extrabold text-slate-900 text-sm">
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
                                <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-slate-700">Đang truy vấn kế hoạch nhà máy giao từ CyberSoft ERP...</p>
                                <p className="text-xs text-slate-400">Đang quét sổ cái phân bổ K10/K15 và loại bỏ triệt để xe đã xuất HĐ</p>
                            </div>
                        ) : !hasSearched && cars.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-10 flex flex-col items-center justify-center my-6 text-center max-w-xl mx-auto">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xl shadow-xs mb-4">
                                    <i className="fas fa-car-side"></i>
                                </div>
                                <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
                                    Tra Cứu Xe Kế Hoạch Chưa Xuất Hóa Đơn Bán (XHĐ)
                                </h4>
                                <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                                    Chọn <strong>Dòng xe</strong> ở trên hoặc dán danh sách số VIN vào ô tìm kiếm rồi nhấn <strong className="text-slate-900">Tải từ Cyber</strong>.
                                </p>
                                <div className="mt-3 px-3 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-[11px] text-amber-800 font-medium">
                                    <i className="fas fa-filter mr-1.5 text-amber-600"></i>
                                    Né 100% xe đã xuất hóa đơn bán hoặc đã ghép hợp đồng
                                </div>
                                <button
                                    type="button"
                                    onClick={() => executeSearch()}
                                    className="mt-5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95 transition-all flex items-center gap-2"
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
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    >
                                        Xóa từ khóa tìm kiếm
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => executeSearch()}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
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
                                                <tr key={`${item.vin}-${idx}`} className="hover:bg-slate-50 transition-colors group">
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
                </>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 2 CONTENT: BÁO CÁO TỒN KHO XE (CP_BETONXE) */}
            {/* ============================================================= */}
            {activeSubTab === 'ton_kho' && (
                <>
                    {/* Unified Premium Filter Bar */}
                    <div className="relative z-10 p-3 bg-white border-b border-slate-200 shadow-2xs shrink-0">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                            
                            {/* Left Filters Group */}
                            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                {/* 1. Date Range Picker */}
                                <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-2.5 h-9 transition-all text-xs">
                                    <i className="far fa-calendar-alt text-[11px] text-slate-400"></i>
                                    <span className="text-[10.5px] text-slate-400 font-medium">Từ</span>
                                    <input
                                        type="date"
                                        value={tonKhoFromDate}
                                        onChange={e => setTonKhoFromDate(e.target.value)}
                                        className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer w-[110px]"
                                        title="Từ ngày"
                                    />
                                    <span className="text-[10.5px] text-slate-400 font-medium">đến</span>
                                    <input
                                        type="date"
                                        value={tonKhoToDate}
                                        onChange={e => setTonKhoToDate(e.target.value)}
                                        className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer w-[110px]"
                                        title="Đến ngày"
                                    />
                                </div>

                                {/* 2. Warehouse Filter */}
                                <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:bg-white text-xs">
                                    <i className="fas fa-warehouse text-[11px] text-slate-400 flex-shrink-0"></i>
                                    <select
                                        value={tonKhoWarehouse}
                                        onChange={e => {
                                            setTonKhoWarehouse(e.target.value);
                                            executeTonKhoSearch({ warehouse: e.target.value });
                                        }}
                                        className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer max-w-[140px] truncate"
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
                                <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:bg-white text-xs">
                                    <i className="fas fa-car text-[11px] text-slate-400 flex-shrink-0"></i>
                                    <select
                                        value={tonKhoModel}
                                        onChange={e => {
                                            setTonKhoModel(e.target.value);
                                            executeTonKhoSearch({ model: e.target.value });
                                        }}
                                        className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer max-w-[140px] truncate"
                                        title="Chọn kiểu xe"
                                    >
                                        <option value="">Tất cả kiểu xe</option>
                                        {tonKhoModels.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. Status Filter */}
                                <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:bg-white text-xs">
                                    <i className="fas fa-file-invoice text-[11px] text-slate-400 flex-shrink-0"></i>
                                    <select
                                        value={tonKhoStatus}
                                        onChange={e => {
                                            const newStatus = e.target.value as any;
                                            setTonKhoStatus(newStatus);
                                            executeTonKhoSearch({ status: newStatus });
                                        }}
                                        className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer max-w-[165px] truncate"
                                        title="Trạng thái hóa đơn"
                                    >
                                        <option value="not_invoiced">Chưa viết HĐ ({tonKhoNotInvoiced})</option>
                                        <option value="all">Tất cả xe ({tonKhoTotal})</option>
                                        <option value="invoiced">Đã viết HĐ ({tonKhoInvoiced})</option>
                                    </select>
                                </div>

                                {/* 5. Search Bar */}
                                <div className="flex-1 min-w-[200px] max-w-xs relative">
                                    <div className={`flex items-center bg-slate-50 hover:bg-white border rounded-xl px-2.5 h-9 transition-all focus-within:border-blue-500 focus-within:bg-white ${
                                        tonKhoKeyword ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'
                                    }`}>
                                        <i className="fas fa-search text-[11px] text-slate-400 mr-2 flex-shrink-0"></i>
                                        <input
                                            type="text"
                                            placeholder="Tìm VIN, số máy, số HĐ (dán từ Excel)..."
                                            value={tonKhoKeyword}
                                            onChange={e => setTonKhoKeyword(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && tonKhoCars.length === 0) {
                                                    executeTonKhoSearch();
                                                }
                                            }}
                                            className="w-full bg-transparent text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none"
                                            title="Nhập từ khóa hoặc dán danh sách số VIN từ Excel"
                                        />
                                        {tonKhoKeyword && tonKhoCars.length > 0 && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 whitespace-nowrap mr-1 shrink-0">
                                                {displayedTonKhoCars.length}/{tonKhoCars.length}
                                            </span>
                                        )}
                                        {tonKhoKeyword && (
                                            <button
                                                type="button"
                                                onClick={() => setTonKhoKeyword('')}
                                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                            >
                                                <i className="fas fa-times-circle text-xs"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                {displayedTonKhoCars.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleExportTonKhoExcel}
                                        disabled={isLoadingTonKho}
                                        className="h-9 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
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
                                        className="h-9 px-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1 whitespace-nowrap"
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
                                    className="h-9 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                                >
                                    {isLoadingTonKho ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang nạp...</span>
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

                    {/* Stats Summary & Highlight Legend Bar */}
                    <div className="relative z-10 px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Stat Badge 1: Chưa HĐ */}
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                <span className="text-slate-500 font-medium">Chưa viết HĐ:</span>
                                <span className="font-extrabold text-slate-900">
                                    {tonKhoKeyword ? `${displayedTonKhoCars.length} / ${tonKhoNotInvoiced}` : tonKhoNotInvoiced.toLocaleString()} xe
                                </span>
                            </div>

                            {/* Stat Badge 2: Tổng tồn kho */}
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <span className="text-slate-500 font-medium">Tổng tồn kho:</span>
                                <span className="font-bold text-slate-800">{tonKhoTotal.toLocaleString()} xe</span>
                            </div>

                            {/* Stat Badge 3: Đã viết HĐ */}
                            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span className="text-amber-800 font-medium">Đã xuất HĐ:</span>
                                <span className="font-bold text-amber-950">{tonKhoInvoiced.toLocaleString()} xe</span>
                            </div>
                        </div>

                        {/* Yellow Row Highlight Note */}
                        <div className="flex items-center gap-1.5 text-[11px] bg-yellow-100/80 text-yellow-900 px-2.5 py-0.5 rounded-lg border border-yellow-300 font-semibold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                            <span>Xe tô màu vàng = Đã viết hóa đơn bán trên CyberSoft</span>
                        </div>
                    </div>

                    {/* Table Container for Ton Kho */}
                    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
                        {isLoadingTonKho ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                                <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-slate-700">Đang nạp dữ liệu tồn kho từ Stored Procedure [CP_BETONXE]...</p>
                                <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
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
                                            <tr className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10.5px]">
                                                <th className="py-3 px-3 border-r border-slate-200 text-center w-11">STT</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Số HĐ nhập</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Ngày / Tháng nhập</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Kiểu xe / Phiên bản</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Số khung (VIN)</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Số máy</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Ngoại thất / Nội thất</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Tên kho</th>
                                                <th className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">Tuổi tồn</th>
                                                <th className="py-3 px-3 border-r border-slate-200 text-center whitespace-nowrap">Năm SX</th>
                                                <th className="py-3 px-3 border-r border-slate-200 whitespace-nowrap">Trạng thái HĐ</th>
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
                                                                : 'hover:bg-slate-50 text-slate-800'
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

                                                        {/* Ngày & Tháng nhập HĐ */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100 text-slate-600'}`}>
                                                            <div className="font-semibold">{item.ngay_hd || '-'}</div>
                                                            {item.thang_hd && (
                                                                <div className={`text-[10px] ${isInvoiced ? 'text-yellow-800' : 'text-slate-400'}`}>T{item.thang_hd}</div>
                                                            )}
                                                        </td>

                                                        {/* Kiểu xe */}
                                                        <td className={`py-2.5 px-3 border-r ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <div className="font-bold text-slate-900">{item.ten_kx || item.ma_kx}</div>
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

                                                        {/* Màu ngoại thất / Nội thất */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <div className="font-semibold">{item.ten_mau || item.ma_mau || '-'}</div>
                                                            {item.ten_mau_nt && (
                                                                <div className={`text-[10px] ${isInvoiced ? 'text-yellow-800' : 'text-slate-400'}`}>NT: {item.ten_mau_nt}</div>
                                                            )}
                                                        </td>

                                                        {/* Tên Kho */}
                                                        <td className={`py-2.5 px-3 border-r ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                                                                isInvoiced
                                                                    ? 'bg-yellow-300/60 text-yellow-950 border border-yellow-400'
                                                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                            }`}>
                                                                {item.ten_kho || item.ma_kho}
                                                            </span>
                                                        </td>

                                                        {/* Tuổi tồn (ngày) */}
                                                        <td className={`py-2.5 px-3 border-r text-center font-bold ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] ${
                                                                item.ngay_ton > 180 
                                                                    ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold' 
                                                                    : item.ngay_ton > 90 
                                                                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                                                                        : isInvoiced
                                                                            ? 'bg-yellow-300/70 text-yellow-950 border border-yellow-400 font-semibold'
                                                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                            }`}>
                                                                {item.ngay_ton} ngày
                                                            </span>
                                                        </td>

                                                        {/* Năm SX */}
                                                        <td className={`py-2.5 px-3 border-r text-center ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100 text-slate-600'}`}>
                                                            {item.nam_sx || '-'}
                                                        </td>

                                                        {/* Trạng thái HĐ */}
                                                        <td className={`py-2.5 px-3 border-r whitespace-nowrap ${isInvoiced ? 'border-yellow-300/80' : 'border-slate-100'}`}>
                                                            {isInvoiced ? (
                                                                <span className="inline-flex items-center gap-1 font-bold text-yellow-950 text-[11px]">
                                                                    <i className="fas fa-check-circle text-amber-700 text-xs"></i>
                                                                    {item.tinh_trang || 'Xe đã được viết hóa đơn'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 font-medium">Chưa HĐ</span>
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
                                        setXepXePage(1);
                                        if (xepXeContracts.length === 0) {
                                            executeXepXeSearch({ showroom: val || 'ALL' });
                                        }
                                    }}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[170px] truncate"
                                    title="Chọn đơn vị / Showroom"
                                >
                                    <option value="ALL">🌐 Tất cả Showroom (Toàn hệ thống)</option>
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
                                    onChange={e => {
                                        setXepXeModel(e.target.value);
                                        setXepXePage(1);
                                    }}
                                    className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
                                    title="Chọn dòng xe"
                                >
                                    <option value="">Tất cả dòng xe</option>
                                    {xepXeModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. Instant Search & Cross-Showroom Lookup */}
                            <div className="flex-1 min-w-[240px] max-w-md relative">
                                <div className={`flex items-center bg-slate-50/90 hover:bg-white border rounded-xl px-2.5 h-9 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-white shadow-xs ${
                                    xepXeKeyword ? 'border-purple-300 ring-1 ring-purple-200 bg-purple-50/20' : 'border-slate-200'
                                }`}>
                                    <i className="fas fa-search text-[11px] text-slate-400 mr-2 flex-shrink-0"></i>
                                    <input
                                        type="text"
                                        placeholder="Tìm số khung (VIN), số HĐ, tên KH xem SR xuất HĐ..."
                                        value={xepXeKeyword}
                                        onChange={e => {
                                            setXepXeKeyword(e.target.value);
                                            setXepXePage(1);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && xepXeKeyword.trim()) {
                                                executeXepXeSearch({ keyword: xepXeKeyword.trim(), showroom: 'ALL' });
                                            }
                                        }}
                                        className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                                        title="Nhập số khung (VIN), số HĐ hoặc tên KH rồi bấm Enter để tra cứu xem Showroom nào xuất hóa đơn"
                                    />

                                    {/* Instant Match Badge on Downloaded Data */}
                                    {xepXeKeyword && xepXeContracts.length > 0 && (
                                        <span 
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 whitespace-nowrap mr-1 shrink-0 animate-fade-in" 
                                            title={`Khớp ${displayedXepXeContracts.length} / ${xepXeContracts.length} hợp đồng`}
                                        >
                                            {displayedXepXeContracts.length}/{xepXeContracts.length}
                                        </span>
                                    )}

                                    {xepXeKeyword && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setXepXeKeyword('');
                                                setXepXePage(1);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 ml-1 p-0.5"
                                            title="Xóa tìm kiếm"
                                        >
                                            <i className="fas fa-times-circle text-xs"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Nút Tra Cứu Toàn Hệ Thống (Xem Showroom Nào Xuất Hóa Đơn) */}
                            {xepXeKeyword.trim() && (
                                <button
                                    type="button"
                                    onClick={() => executeXepXeSearch({ keyword: xepXeKeyword.trim(), showroom: 'ALL' })}
                                    disabled={isLoadingXepXe}
                                    className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 animate-fade-in"
                                    title="Tra cứu số khung/HĐ trên toàn bộ hệ thống các Showroom"
                                >
                                    <i className={`fas ${isLoadingXepXe ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'} text-xs`}></i>
                                    <span>Tra cứu SR xuất HĐ</span>
                                </button>
                            )}

                            {/* 5. Fetch Data Button */}
                            <button
                                type="button"
                                onClick={() => executeXepXeSearch({ force: true })}
                                disabled={isLoadingXepXe}
                                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                                title="Tải lại dữ liệu mới nhất từ CyberSoft"
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
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                }`}
                                title="Các hợp đồng đã duyệt và chờ duyệt sẵn sàng ghép xe (Chờ duyệt, Đã ghép SK, Chờ ghép SK)"
                            >
                                <i className="fas fa-check-double text-[10px]"></i>
                                <span>Đã duyệt & Chờ duyệt</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                    xepXeStatusFilter === 'approved_and_pending' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-800 font-bold'
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
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
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

                        {/* Thanh lọc theo Showroom xuất hóa đơn khi đang lọc Đã xuất HĐ */}
                        {xepXeStatusFilter === 'Đã xuất HĐ' && Object.keys(invoicedShowroomsBreakdown).length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-purple-100 bg-purple-50/70 -mx-3 -mb-1 px-3 py-2 rounded-xl flex flex-wrap items-center gap-1.5 text-xs animate-fade-in">
                                <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1 mr-1">
                                    <i className="fas fa-file-invoice text-purple-600 text-xs"></i> Showroom xuất HĐ:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setXepXeShowroomInvoicedFilter('ALL')}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition-all border font-bold ${
                                        xepXeShowroomInvoicedFilter === 'ALL'
                                            ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                                            : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-100'
                                    }`}
                                >
                                    Tất cả ({xepXeStatusCounts['Đã xuất HĐ'] || 0})
                                </button>
                                {Object.entries(invoicedShowroomsBreakdown).map(([sr, count]) => (
                                    <button
                                        key={sr}
                                        type="button"
                                        onClick={() => setXepXeShowroomInvoicedFilter(xepXeShowroomInvoicedFilter === sr ? 'ALL' : sr)}
                                        className={`px-2.5 py-1 rounded-lg text-xs transition-all border flex items-center gap-1.5 ${
                                            xepXeShowroomInvoicedFilter === sr
                                                ? 'bg-purple-700 text-white border-purple-700 shadow-xs font-bold'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:text-purple-700'
                                        }`}
                                        title={`Xem ${count} xe đã xuất hóa đơn tại ${sr}`}
                                    >
                                        <i className="fas fa-building text-[10px] text-purple-500"></i>
                                        <span>{sr}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            xepXeShowroomInvoicedFilter === sr ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Table Area for Xếp Xe */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 p-3 sm:p-4 min-h-[300px] relative">
                        {/* Banner thông báo kết quả tra cứu Showroom xuất HĐ */}
                        {xepXeKeyword && displayedXepXeContracts.length > 0 && (
                            <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                        <i className="fas fa-file-invoice text-sm"></i>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                            <span>Kết quả tra cứu Showroom xuất HĐ: "{xepXeKeyword}"</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                                                {displayedXepXeContracts.length} kết quả
                                            </span>
                                        </div>
                                        <div className="text-slate-600 text-[11px] mt-0.5">
                                            {displayedXepXeContracts.some(c => c.ten_color === 'Đã xuất HĐ') ? (
                                                <span className="text-purple-800 font-semibold flex items-center gap-1">
                                                    <i className="fas fa-check-circle text-emerald-600"></i>
                                                    Đã tìm thấy thông tin Showroom xuất hóa đơn bên dưới!
                                                </span>
                                            ) : (
                                                <span>Danh sách hợp đồng khớp thông tin trên toàn hệ thống.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setXepXeKeyword('')}
                                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shrink-0 shadow-2xs hover:bg-slate-50"
                                >
                                    <i className="fas fa-times mr-1 text-[10px]"></i> Đóng tra cứu
                                </button>
                            </div>
                        )}

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
                                <span className="font-semibold text-slate-600 text-sm">Không tìm thấy hợp đồng nào phù hợp với bộ lọc hiện tại</span>
                                {xepXeKeyword ? (
                                    <div className="flex flex-col items-center gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={() => executeXepXeSearch({ keyword: xepXeKeyword.trim(), showroom: 'ALL' })}
                                            disabled={isLoadingXepXe}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2"
                                        >
                                            <i className={`fas ${isLoadingXepXe ? 'fa-spinner fa-spin' : 'fa-globe'}`}></i>
                                            <span>Tra cứu "{xepXeKeyword}" trên TOÀN BỘ SHOWROOM & cơ sở dữ liệu</span>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setXepXeKeyword('')}
                                            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline mt-1"
                                        >
                                            Xóa từ khóa tìm kiếm "{xepXeKeyword}"
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                                                <th className="px-3 py-2.5 text-center w-10">#</th>
                                                <th className="px-3 py-2.5 w-28">Trạng thái</th>
                                                <th className="px-3 py-2.5 min-w-[210px]">Showroom / Đơn vị xuất HĐ</th>
                                                <th className="px-3 py-2.5 min-w-[190px]">Số khung (VIN)</th>
                                                <th className="px-3 py-2.5 min-w-[170px]">Số HĐ / Chứng từ</th>
                                                <th className="px-3 py-2.5 min-w-[190px]">Khách hàng & TVBH</th>
                                                <th className="px-3 py-2.5 min-w-[150px]">Dòng xe / Màu</th>
                                                <th className="px-3 py-2.5 w-28">Ngày HĐ / Giao</th>
                                                <th className="px-3 py-2.5 text-center w-32 sticky right-0 bg-slate-50">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedXepXeContracts.map((c, idx) => {
                                                const globalIdx = (xepXePage - 1) * XEP_XE_PAGE_SIZE + idx;
                                                const badgeInfo = getStatusBadgeStyle(c.ten_color, c.back_color);
                                                const hasVin = Boolean(c.so_khung && c.so_khung.trim());
                                                const isInvoiced = c.ten_color === 'Đã xuất HĐ' || (c.back_color || '').toLowerCase() === 'violet';

                                                return (
                                                    <tr
                                                        key={`${c.stt_rec}_${c.stt_rec0}_${idx}`}
                                                        className={`transition-colors text-slate-800 hover:bg-blue-50/40 ${badgeInfo.rowClass}`}
                                                    >
                                                        {/* STT */}
                                                        <td className="px-3 py-2.5 text-center text-slate-400 text-[11px] font-mono">{globalIdx + 1}</td>

                                                        {/* Trạng thái */}
                                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.badgeClass}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeInfo.dotColor}`}></span>
                                                                {badgeInfo.label}
                                                            </span>
                                                        </td>

                                                        {/* Showroom / Đơn vị xuất HĐ */}
                                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                                            {isInvoiced ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-950 border border-purple-300 font-bold text-[11.5px] shadow-2xs">
                                                                        <i className="fas fa-file-invoice text-purple-600 text-xs shrink-0"></i>
                                                                        <span className="truncate max-w-[210px]" title={c.ten_ttcp}>{c.ten_ttcp || 'Không rõ Showroom'}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-purple-700 font-bold pl-1 flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 animate-pulse"></span>
                                                                        Đơn vị đã xuất hóa đơn
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                                                                    <i className="fas fa-store text-slate-400 text-[10px] shrink-0"></i>
                                                                    <span className="truncate max-w-[200px]" title={c.ten_ttcp}>{c.ten_ttcp || '-'}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Số khung (VIN) */}
                                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                                            {hasVin ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11.5px] border ${
                                                                        isInvoiced
                                                                            ? 'text-purple-800 bg-purple-50 border-purple-200'
                                                                            : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                                                                    }`}>
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
                                                                <div className="text-[10px] text-slate-400 mt-0.5">Ghép: {c.ngay_xep}</div>
                                                            )}
                                                        </td>

                                                        {/* Số HĐ / Số chứng từ */}
                                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                                            <div className="font-bold text-slate-900 text-[12px]">{c.ma_hd || c.so_ct}</div>
                                                            {c.so_ct && c.so_ct !== c.ma_hd && (
                                                                <div className="text-[10px] text-slate-400 font-mono">{c.so_ct}</div>
                                                            )}
                                                        </td>

                                                        {/* Khách hàng + TVBH */}
                                                        <td className="px-3 py-2.5 max-w-[200px]">
                                                            <div className="font-semibold text-slate-900 truncate text-[11.5px]" title={c.ten_kh}>{c.ten_kh || '-'}</div>
                                                            {c.dien_thoai && (
                                                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                                    <i className="fas fa-phone text-[9px]"></i>
                                                                    <span>{c.dien_thoai}</span>
                                                                </div>
                                                            )}
                                                            {c.ten_hs && (
                                                                <div className="text-[10px] text-slate-500 truncate" title={c.ten_hs}>
                                                                    <span className="text-slate-400">TVBH: </span>{c.ten_hs}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Dòng xe / Màu */}
                                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                                            <div className="font-bold text-slate-900 text-[11.5px]">{c.ten_kx || c.ma_kx}</div>
                                                            <div className="text-[10px] text-slate-500">{c.ten_mau || c.ma_mau || '-'}{c.ten_mau_nt ? <span className="text-slate-400"> · NT: {c.ten_mau_nt}</span> : null}</div>
                                                        </td>

                                                        {/* Ngày HĐ / Ngày giao xe */}
                                                        <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-mono">
                                                            <div className="text-slate-700 font-semibold">{c.ngay_gx || '-'}</div>
                                                            <div className="text-[10px] text-slate-400">HĐ: {c.ngay_ct || '-'}</div>
                                                        </td>

                                                        {/* Thao tác */}
                                                        <td className="px-3 py-2.5 text-center whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs shadow-xs">
                                                            {hasVin ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {!isInvoiced && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenAssignModal(c)}
                                                                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                                                                            title="Đổi sang số khung khác"
                                                                        >
                                                                            <i className="fas fa-arrows-rotate text-[10px]"></i>
                                                                            <span>Đổi xe</span>
                                                                        </button>
                                                                    )}
                                                                    {!isInvoiced ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setContractToUnassign(c)}
                                                                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                                                                            title="Hủy ghép xe khỏi hợp đồng"
                                                                        >
                                                                            <i className="fas fa-unlink text-[10px]"></i>
                                                                            <span>Hủy</span>
                                                                        </button>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[10.5px] text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 shadow-2xs">
                                                                            <i className="fas fa-check-circle text-purple-600 text-[10px]"></i>
                                                                            <span>Đã xuất HĐ</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenAssignModal(c)}
                                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 mx-auto"
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

                                {/* Pagination Footer Controls */}
                                <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <span>Hiển thị</span>
                                        <span className="font-bold text-slate-800 font-mono">
                                            {displayedXepXeContracts.length === 0 ? 0 : (xepXePage - 1) * XEP_XE_PAGE_SIZE + 1} - {Math.min(xepXePage * XEP_XE_PAGE_SIZE, displayedXepXeContracts.length)}
                                        </span>
                                        <span>trên</span>
                                        <span className="font-bold text-slate-900 font-mono">{displayedXepXeContracts.length}</span>
                                        <span>hợp đồng</span>
                                        {displayedXepXeContracts.length < xepXeContracts.length && (
                                            <span className="text-[11px] text-slate-400">
                                                (lọc từ {xepXeContracts.length} HĐ tải về)
                                            </span>
                                        )}
                                    </div>

                                    {totalXepXePages > 1 && (
                                        <div className="flex items-center gap-1.5 ml-auto">
                                            <button
                                                type="button"
                                                onClick={() => setXepXePage(1)}
                                                disabled={xepXePage === 1}
                                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 font-bold transition-all shadow-2xs"
                                                title="Trang đầu"
                                            >
                                                <i className="fas fa-angles-left text-[10px]"></i>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setXepXePage(p => Math.max(1, p - 1))}
                                                disabled={xepXePage === 1}
                                                className="px-2.5 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-slate-600 font-bold transition-all shadow-2xs"
                                            >
                                                <i className="fas fa-chevron-left text-[10px]"></i>
                                                <span>Trước</span>
                                            </button>

                                            <div className="flex items-center gap-1 px-2.5 text-xs font-semibold">
                                                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-mono">{xepXePage}</span>
                                                <span className="text-slate-400">/</span>
                                                <span className="text-slate-600 font-mono">{totalXepXePages}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setXepXePage(p => Math.min(totalXepXePages, p + 1))}
                                                disabled={xepXePage === totalXepXePages}
                                                className="px-2.5 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-slate-600 font-bold transition-all shadow-2xs"
                                            >
                                                <span>Sau</span>
                                                <i className="fas fa-chevron-right text-[10px]"></i>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setXepXePage(totalXepXePages)}
                                                disabled={xepXePage === totalXepXePages}
                                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 font-bold transition-all shadow-2xs"
                                                title="Trang cuối"
                                            >
                                                <i className="fas fa-angles-right text-[10px]"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
                        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                    <i className="fas fa-car-side text-white text-sm"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Xếp Xe Hợp Đồng CyberSoft</h3>
                                    <p className="text-[11px] text-slate-300">Chọn số khung phù hợp từ kế hoạch phân bổ / kho để ghép vào HĐ</p>
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
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
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
                <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2.5 bg-slate-50 overflow-hidden">
                    
                    {/* Main Form & Presets Grid (Single Screen No Scroll) */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
                        
                        {/* Left Form Column */}
                        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col justify-between min-h-0 overflow-hidden">
                            
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                                <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                    <i className="fas fa-edit text-blue-600"></i>
                                    <span>Thông tin Đề nghị xuất xe (DNX)</span>
                                </h3>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    Form chứng từ
                                </span>
                            </div>

                            {/* Yêu cầu chuyển xe từ TVBH (Pending Requests Banner) */}
                            <div className={`p-2.5 rounded-xl border space-y-1.5 shrink-0 my-1 transition-all ${
                                pendingTransferRequests.length > 0
                                    ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border-indigo-200 shadow-2xs'
                                    : 'bg-slate-50/80 border-slate-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {pendingTransferRequests.length > 0 ? (
                                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                                        ) : (
                                            <i className="fas fa-inbox text-slate-400 text-xs"></i>
                                        )}
                                        <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                                            <i className="fas fa-truck-moving text-indigo-600"></i>
                                            <span>Yêu cầu chuyển xe từ TVBH</span>
                                        </h4>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            pendingTransferRequests.length > 0
                                                ? 'bg-indigo-600 text-white animate-pulse'
                                                : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {pendingTransferRequests.length} yêu cầu
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={loadPendingTransferRequests}
                                        disabled={isLoadingTransferRequests}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                    >
                                        <i className={`fas fa-sync-alt ${isLoadingTransferRequests ? 'fa-spin' : ''}`}></i>
                                        <span>Làm mới</span>
                                    </button>
                                </div>

                                {pendingTransferRequests.length > 0 ? (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                                        {pendingTransferRequests.map((req) => {
                                            const isSelected = activeTransferRequestId === req.id;
                                            return (
                                                <div
                                                    key={req.id}
                                                    className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                                        isSelected
                                                            ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
                                                            : 'bg-white border-indigo-100 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-mono font-bold text-slate-900 text-[11.5px] select-all">{req.vin}</span>
                                                            <span className="text-[10px] text-slate-500 font-semibold truncate">
                                                                {req.carModel} • KH: <strong className="text-slate-800">{req.customerName}</strong>
                                                            </span>
                                                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                                                TVBH: {req.consultantName}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10.5px] text-slate-600 truncate mt-0.5 flex items-center gap-1.5">
                                                            <span className="text-slate-400 font-medium">Tuyến:</span>
                                                            <strong className="text-indigo-700">{req.fromWarehouseName || req.fromWarehouse} ➔ {req.toWarehouseName || req.toWarehouse}</strong>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="italic text-slate-500 truncate" title={req.reason}>{req.reason}</span>
                                                            {req.note && <span className="text-rose-600 font-medium" title={req.note}>({req.note})</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRejectTransferRequest(req)}
                                                            className="px-2 py-1 rounded-lg text-[10.5px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                                            title="Từ chối / Hủy yêu cầu chuyển xe này"
                                                        >
                                                            <i className="fas fa-times text-[10px]"></i>
                                                            <span>Từ chối</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyTransferRequest(req)}
                                                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95'
                                                            }`}
                                                        >
                                                            <i className={`fas ${isSelected ? 'fa-check' : 'fa-arrow-down'}`}></i>
                                                            <span>{isSelected ? 'Đang nạp vào form' : 'Nạp vào phiếu (1-Chạm)'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-2 text-center text-[11px] text-slate-400 font-medium italic">
                                        Hiện chưa có yêu cầu chuyển xe mới. Khi TVBH gửi yêu cầu, danh sách sẽ tự động xuất hiện tại đây kèm nút 1-chạm nạp thẳng vào form lập phiếu.
                                    </div>
                                )}
                            </div>

                            {dnxError && (
                                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2 shrink-0 my-1">
                                    <i className="fas fa-exclamation-circle text-rose-500 text-xs shrink-0"></i>
                                    <span className="font-medium">{dnxError}</span>
                                </div>
                            )}

                            {dnxResult && (
                                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 space-y-1.5 text-xs shrink-0 my-1">
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                                            <i className="fas fa-check-circle text-emerald-600 text-sm"></i>
                                            <span>Đã ghi nhận thành công phiếu {dnxResult.so_ct}!</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPrintTicketData(dnxResult)}
                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-md text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                        >
                                            <i className="fas fa-print text-[10px]"></i>
                                            <span>In Phiếu DNX</span>
                                        </button>
                                    </div>
                                    <div className="font-mono text-slate-700 flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] pl-5">
                                        <span>• Số CT: <strong className="text-emerald-900">{dnxResult.so_ct}</strong></span>
                                        <span>• Mã: <strong>{dnxResult.stt_rec}</strong></span>
                                        <span>• Tổng số xe: <strong>{dnxResult.total_cars} VIN</strong></span>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleCreateDnxSubmitInAdmin} className="flex-1 flex flex-col justify-between space-y-2.5 min-h-0 pt-1.5">
                                
                                {/* 1. VIN Input & Counters */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1">
                                            <i className="fas fa-barcode text-slate-400"></i>
                                            <span>Danh sách số VIN:</span>
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {isLookingUpVin && (
                                                <span className="text-[10.5px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                                                    <i className="fas fa-circle-notch fa-spin text-blue-500"></i>
                                                    <span>Đang tra kho Cyber...</span>
                                                </span>
                                            )}
                                            {dnxVinInput && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDnxVinInput('')}
                                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded cursor-pointer"
                                                >
                                                    <i className="fas fa-times mr-1"></i>Xóa VIN
                                                </button>
                                            )}
                                            <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                Đã nhận diện: {extractedVins.length} VIN
                                            </span>
                                        </div>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={dnxVinInput}
                                        onChange={(e) => setDnxVinInput(e.target.value)}
                                        placeholder="Nhập/dán danh sách số VIN từ Excel (VD: RLLVFPNT1TH829896)..."
                                        className="w-full font-mono text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/70 uppercase text-slate-900 font-semibold h-20 resize-none"
                                    />

                                    {/* Auto-detected warehouse banner from Cyber */}
                                    {isLookingUpVin && (
                                        <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-[11.5px] flex items-center gap-2 animate-pulse">
                                            <i className="fas fa-circle-notch fa-spin text-blue-600"></i>
                                            <span>Đang kết nối ẩn danh CyberSoft để tra cứu vị trí kho tồn của xe...</span>
                                        </div>
                                    )}

                                    {lookupResultInfo?.found && !isLookingUpVin && (
                                        <div className="mt-1.5 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-center justify-between shadow-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0">
                                                    <i className="fas fa-check"></i>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                                                        <span>Vị trí kho trên Cyber:</span>
                                                        <span className="font-extrabold text-emerald-800 underline">
                                                            {lookupResultInfo.ma_kho} - {lookupResultInfo.ten_kho}
                                                        </span>
                                                    </div>
                                                    {lookupResultInfo.carInfo && (
                                                        <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                                            {lookupResultInfo.carInfo}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-200/80 text-emerald-800 rounded-full border border-emerald-300 shrink-0">
                                                ✓ Đã tự chọn kho xuất
                                            </span>
                                        </div>
                                    )}

                                    {lookupResultInfo && !lookupResultInfo.found && !isLookingUpVin && extractedVins.length > 0 && (
                                        <div className="mt-1.5 p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-[11px] flex items-center gap-1.5">
                                            <i className="fas fa-info-circle text-slate-400 shrink-0"></i>
                                            <span>Không tìm thấy lịch sử nhập kho của xe này trên Cyber, bạn có thể tự chọn kho xuất bên dưới.</span>
                                        </div>
                                    )}

                                    {/* ⚠️ CẢNH BÁO XE ĐÃ CÓ PHIẾU: Chặn tạo trùng lặp và cung cấp nút xem/in ngay */}
                                    {detectedExistingTicket && (
                                        <div className="mt-2 p-3 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500/80 rounded-xl shadow-md">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-sm">
                                                    <i className="fas fa-shield-alt"></i>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                                                            CHẶN TẠO TRÙNG LẶP
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-950">
                                                            Xe đã tồn tại {detectedExistingTicket.title}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-amber-200 shadow-xs">
                                                        <div><strong>Số chứng từ:</strong> <span className="font-mono font-bold text-blue-700">{detectedExistingTicket.so_ct}</span></div>
                                                        <div><strong>Ngày lập:</strong> <span className="font-semibold text-slate-800">{detectedExistingTicket.ngay_ct || 'N/A'}</span></div>
                                                        <div className="sm:col-span-2"><strong>Số VIN:</strong> <span className="font-mono font-bold text-slate-900">{detectedExistingTicket.vin}</span></div>
                                                        {detectedExistingTicket.ten_kh && (
                                                            <div className="sm:col-span-2"><strong>Khách hàng:</strong> <span className="font-medium">{detectedExistingTicket.ten_kh}</span></div>
                                                        )}
                                                        {detectedExistingTicket.dien_giai && (
                                                            <div className="sm:col-span-2"><strong>Diễn giải:</strong> <span className="italic text-slate-600">{detectedExistingTicket.dien_giai}</span></div>
                                                        )}
                                                        {detectedExistingTicket.type === 'DNX' && detectedExistingTicket.ma_kho_xuat && (
                                                            <div className="sm:col-span-2 text-[11px] text-slate-600">
                                                                <strong>Tuyến kho:</strong> {detectedExistingTicket.ten_kho_xuat || detectedExistingTicket.ma_kho_xuat} ➔ {detectedExistingTicket.ten_kho_nhan || detectedExistingTicket.ma_kho_nhan}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenExistingTicketPrint(detectedExistingTicket)}
                                                            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                                        >
                                                            <i className="fas fa-print"></i>
                                                            <span>Xem & In Phiếu Đã Tạo ({detectedExistingTicket.so_ct})</span>
                                                        </button>
                                                        <span className="text-[11px] font-bold text-rose-700">
                                                            <i className="fas fa-ban mr-1"></i>Hệ thống đã khóa nút tạo mới để tránh trùng chứng từ
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Quick Reason Chips */}
                                <div className="space-y-1">
                                    <span className="text-[10.5px] font-bold text-slate-400 block">
                                        Gợi ý lý do xuất nhanh:
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setDnxLyDo('Lấy xe từ Kho QL13 về Kho Thuận An làm PDI giao KH')}
                                            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-md text-[10.5px] font-medium transition-all"
                                        >
                                            + Lấy xe PDI giao KH
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDnxLyDo('Điều chuyển xe nội bộ giữa các kho showroom')}
                                            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-md text-[10.5px] font-medium transition-all"
                                        >
                                            + Điều chuyển nội bộ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDnxLyDo('Lấy xe từ bãi Q12 về Thuận An làm thủ tục giao xe')}
                                            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-md text-[10.5px] font-medium transition-all"
                                        >
                                            + Lấy xe bãi Q12 về PDI
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Kho Xuất & Kho Nhận */}
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200/60 pb-1">
                                        <span className="flex items-center gap-1">
                                            <i className="fas fa-route text-blue-600 text-[10px]"></i>
                                            <span>Tuyến kho xe xuất - nhận:</span>
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="flex items-center justify-between text-[10.5px] font-bold text-slate-600 mb-0.5">
                                                <span>Kho xuất xe:</span>
                                                {lookupResultInfo?.found && (
                                                    <span className="text-[9.5px] text-emerald-600 font-bold flex items-center gap-1">
                                                        <i className="fas fa-check-circle text-[9px]"></i> Tự nhận từ Cyber
                                                    </span>
                                                )}
                                            </label>
                                            <select
                                                value={dnxMaKhoXuat}
                                                onChange={(e) => setDnxMaKhoXuat(e.target.value)}
                                                className={`w-full border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-blue-500 bg-white text-slate-800 cursor-pointer h-8 transition-colors ${
                                                    lookupResultInfo?.found ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-300'
                                                }`}
                                            >
                                                {dnxMaKhoXuat && !['K87', 'K86', 'K83', 'K85', 'KHCM.PVD', 'K106', 'K103', 'K58', 'K65', 'K36', 'K17', 'KTN.NM', 'KTN.TT'].includes(dnxMaKhoXuat) && (
                                                    <option value={dnxMaKhoXuat}>{dnxMaKhoXuat} - {detectedWarehouseName || dnxMaKhoXuat}</option>
                                                )}
                                                <option value="K87">K87 - QL13 (HCM)</option>
                                                <option value="K86">K86 - Q12 (HCM)</option>
                                                <option value="K83">K83 - Thuận An</option>
                                                <option value="K85">K85 - Dĩ An</option>
                                                <option value="KHCM.PVD">KHCM.PVD - Phạm Văn Đồng</option>
                                                <option value="K106">K106 - Hà Huy Giáp</option>
                                                <option value="K103">K103 - Lĩnh Nam</option>
                                                <option value="K58">K58 - Lê Văn Việt</option>
                                                <option value="K65">K65 - Vũng Tàu</option>
                                                <option value="K36">K36 - Hải Phòng</option>
                                                <option value="K17">K17 - Cam Giá</option>
                                                <option value="KTN.NM">KTN.NM - NM Thái Nguyên</option>
                                                <option value="KTN.TT">KTN.TT - Tân Thịnh (TN)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                                                Kho nhận (Đích đến):
                                            </label>
                                            <select
                                                value={dnxMaKhoNhan}
                                                onChange={(e) => setDnxMaKhoNhan(e.target.value)}
                                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-blue-500 bg-white text-slate-800 cursor-pointer h-8"
                                            >
                                                <option value="K83">K83 - Thuận An (Mặc định)</option>
                                                <option value="K87">K87 - QL13 (HCM)</option>
                                                <option value="K86">K86 - Q12 (HCM)</option>
                                                <option value="K85">K85 - Dĩ An</option>
                                                <option value="KHCM.PVD">KHCM.PVD - Phạm Văn Đồng</option>
                                                <option value="K106">K106 - Hà Huy Giáp</option>
                                                <option value="K103">K103 - Lĩnh Nam</option>
                                                <option value="K58">K58 - Lê Văn Việt</option>
                                                <option value="K65">K65 - Vũng Tàu</option>
                                                <option value="K17">K17 - Cam Giá</option>
                                                <option value="KTN.TT">KTN.TT - Tân Thịnh (TN)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Tài khoản & Khách hàng */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                                            Tài khoản (`User_Name`):
                                        </label>
                                        <input
                                            type="text"
                                            value={dnxUserName}
                                            onChange={(e) => setDnxUserName(e.target.value)}
                                            placeholder="02.NHANPT"
                                            className="w-full font-mono text-xs border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 bg-white text-slate-900 font-bold h-8"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                                            Khách hàng / Đối tượng giao:
                                        </label>
                                        <input
                                            type="text"
                                            value={dnxKhachHang}
                                            onChange={(e) => setDnxKhachHang(e.target.value)}
                                            placeholder="VD: Ngô Trí Dũng"
                                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 bg-white text-slate-800 font-medium h-8"
                                        />
                                    </div>
                                </div>

                                {/* 5. Lý do */}
                                <div>
                                    <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                                        Lý do xuất / điều chuyển:
                                    </label>
                                    <input
                                        type="text"
                                        value={dnxLyDo}
                                        onChange={(e) => setDnxLyDo(e.target.value)}
                                        placeholder="VD: Lấy xe về PDI giao KH Ngô Trí Dũng"
                                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 bg-white text-slate-800 font-medium h-8"
                                    />
                                </div>

                                {/* 6. Submit Button */}
                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        disabled={isSubmittingDnx || Boolean(detectedExistingTicket)}
                                        className={`w-full h-9 font-bold rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 ${
                                            detectedExistingTicket
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                                                : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 text-white cursor-pointer'
                                        }`}
                                    >
                                        {isSubmittingDnx ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin text-xs"></i>
                                                <span>Đang ghi nhận chứng từ lên CyberSoft ERP...</span>
                                            </>
                                        ) : detectedExistingTicket ? (
                                            <>
                                                <i className="fas fa-ban text-rose-600 text-xs"></i>
                                                <span>Không Thể Tạo: Xe Đã Có Phiếu {detectedExistingTicket.so_ct}</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-bolt text-amber-400 text-xs"></i>
                                                <span>Ghi Nhận Giấy Đề Nghị Xuất Xe Trực Tiếp Lên Cyber</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Right Recent Tickets Column (Full Height) */}
                        <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
                            
                            {/* Recent Created Tickets History Card */}
                            <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col overflow-hidden">
                                <h4 className="font-extrabold text-xs text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                                    <span className="flex items-center gap-1.5">
                                        <i className="fas fa-history text-blue-600 text-xs"></i>
                                        <span>Phiếu Đề Nghị Xuất (DNX) gần nhất</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={loadRecentDnxTickets}
                                            disabled={isLoadingRecentTickets}
                                            className="text-[10.5px] text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 p-1 rounded hover:bg-slate-100 transition-all cursor-pointer"
                                            title="Tải lại danh sách từ Cyber"
                                        >
                                            <i className={`fas fa-sync-alt ${isLoadingRecentTickets ? 'fa-spin text-blue-600' : ''}`}></i>
                                            <span>Làm mới</span>
                                        </button>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            {recentDnxTickets.length} phiếu
                                        </span>
                                    </div>
                                </h4>

                                {isLoadingRecentTickets ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-slate-500 p-6 space-y-2">
                                        <i className="fas fa-circle-notch fa-spin text-2xl text-blue-600"></i>
                                        <span>Đang tải danh sách phiếu DNX gần nhất từ CyberSoft ERP...</span>
                                    </div>
                                ) : recentDnxTickets.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-slate-400 p-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1.5">
                                            <i className="fas fa-inbox text-sm"></i>
                                        </div>
                                        <span>Chưa có phiếu DNX nào được tìm thấy.</span>
                                    </div>
                                ) : (
                                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 mt-2 custom-scrollbar">
                                        {recentDnxTickets.map((t, idx) => {
                                            const isPost9 = String(t.ma_post) === '9';
                                            const isPost3 = String(t.ma_post) === '3';
                                            return (
                                                <div key={idx} className="p-2.5 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl text-xs space-y-1.5 transition-all">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-bold text-slate-900 text-[12px]">{t.so_ct}</span>
                                                            <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold border ${
                                                                isPost9
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                    : isPost3
                                                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                                            }`}>
                                                                {isPost9 ? '✓ Đã duyệt' : isPost3 ? '⏳ Chờ duyệt' : 'Đã ghi nhận'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePrintFromRecentList(t)}
                                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10.5px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                                            title="Xem và in phiếu này theo mẫu Cyber"
                                                        >
                                                            <i className="fas fa-print text-[9px]"></i>
                                                            <span>In Phiếu</span>
                                                        </button>
                                                    </div>

                                                    {/* Thông tin Khách hàng & TVBH */}
                                                    <div className="text-[11px] bg-blue-50/60 border border-blue-100 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-slate-700">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-blue-600 font-semibold text-[10px]">KH:</span>
                                                            <strong className="text-blue-950 font-bold truncate max-w-[210px]" title={t.ten_kh || 'Chưa gắn HĐ'}>
                                                                {t.ten_kh || <span className="text-slate-400 font-normal italic">Chưa gắn HĐ</span>}
                                                            </strong>
                                                        </div>
                                                        <div className="flex items-center gap-1 min-w-0 text-[10.5px]">
                                                            <span className="text-slate-500 font-medium text-[10px]">TVBH:</span>
                                                            <strong className="text-slate-800 font-bold truncate max-w-[140px]" title={t.ten_tvbh || '-'}>
                                                                {t.ten_tvbh || '-'}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <div className="text-[11px] text-slate-600 flex items-center justify-between px-0.5">
                                                        <span>Người nhận: <strong className="text-slate-800">{t.nguoi_nhan || t.ong_ba || 'NGÔ TRÍ DŨNG'}</strong></span>
                                                        <span className="text-slate-500 text-[10.5px]">{t.ngay_ct}</span>
                                                    </div>

                                                    {t.vin && (
                                                        <div className="text-[11px] text-slate-700 font-mono font-bold bg-white px-2 py-1 rounded border border-slate-200/80 flex items-center justify-between">
                                                            <span>VIN: {t.vin}</span>
                                                            {t.loai_xe && <span className="font-sans text-[10px] text-slate-500 font-medium">{t.loai_xe}</span>}
                                                        </div>
                                                    )}

                                                    {t.dien_giai && (
                                                        <div className="text-[10px] text-slate-500 italic truncate" title={t.dien_giai}>
                                                            {t.dien_giai}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 h-9 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-400/20 focus-within:bg-white transition-all">
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
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                                >
                                    <option value="">Tất cả loại phiếu (DNX & TD4)</option>
                                    <option value="DNX">Đề Nghị Xuất Xe (DNX)</option>
                                    <option value="TD4">Phiếu Xe Ra Giao KH (TD4)</option>
                                </select>

                                {/* Filter: Trạng thái duyệt */}
                                <select
                                    value={ticketMaPost}
                                    onChange={e => setTicketMaPost(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                                >
                                    <option value="">Tất cả trạng thái duyệt</option>
                                    <option value="3">🟡 Post = 3 (Lập phiếu / Chờ duyệt)</option>
                                    <option value="9">🟢 Post = 9 (Đã duyệt / Xe đã ra)</option>
                                    <option value="1">🔴 Post = 1 (Đã hủy phiếu)</option>
                                </select>

                                {/* Badge: Showroom Thuận An */}
                                <div className="hidden sm:flex items-center gap-1.5 px-3 h-9 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shrink-0 shadow-2xs">
                                    <i className="fas fa-location-dot text-slate-500"></i>
                                    <span>Thuận An (02.01.08)</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => executeVoucherTicketsSearch()}
                                disabled={isLoadingTickets}
                                className="px-3.5 h-9 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 shrink-0"
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
                                <i className="fas fa-circle-notch fa-spin text-3xl text-slate-900"></i>
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
                                            <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                                                <th className="px-3 py-2.5 text-center w-10">#</th>
                                                <th className="px-3 py-2.5 w-20">Loại</th>
                                                <th className="px-3 py-2.5">Số Phiếu</th>
                                                <th className="px-3 py-2.5 w-28">Ngày Lập</th>
                                                <th className="px-3 py-2.5 text-center w-36">Trạng Thái</th>
                                                <th className="px-3 py-2.5">Số Khung (VIN)</th>
                                                <th className="px-3 py-2.5">Khách Hàng / TVBH</th>
                                                <th className="px-3 py-2.5 text-center w-36">Thao Tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayedVoucherTickets.map((t, idx) => {
                                                const isPost3 = String(t.ma_post) === '3';
                                                const isPost9 = String(t.ma_post) === '9';
                                                const isPost1 = String(t.ma_post) === '1';

                                                return (
                                                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                                                        {/* STT */}
                                                        <td className="px-3 py-2.5 text-center text-slate-400 text-[11px] font-mono">{idx + 1}</td>

                                                        {/* Loại phiếu */}
                                                        <td className="px-3 py-2.5">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                                                t.voucher_type === 'DNX'
                                                                    ? 'bg-slate-100 text-slate-700'
                                                                    : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                <i className={`fas ${t.voucher_type === 'DNX' ? 'fa-file-export' : 'fa-car-side'} text-[9px]`}></i>
                                                                {t.voucher_type}
                                                            </span>
                                                        </td>

                                                        {/* Số phiếu + số hợp đồng */}
                                                        <td className="px-3 py-2.5">
                                                            <div className="font-bold text-slate-900 font-mono text-[12px]">{t.so_ct}</div>
                                                            {t.so_hd && (
                                                                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]" title={t.so_hd}>{t.so_hd}</div>
                                                            )}
                                                        </td>

                                                        {/* Ngày lập */}
                                                        <td className="px-3 py-2.5">
                                                            <div className="font-semibold text-slate-700 font-mono text-[11px]">{t.ngay_ct}</div>
                                                            {t.gio_ct && (
                                                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                    <i className="far fa-clock text-[9px]"></i>
                                                                    <span>{t.gio_ct}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Trạng thái */}
                                                        <td className="px-3 py-2.5 text-center">
                                                            {isPost3 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0"></span>
                                                                    Chờ duyệt
                                                                </span>
                                                            )}
                                                            {isPost9 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                                    Đã duyệt
                                                                </span>
                                                            )}
                                                            {isPost1 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                                                    Đã hủy
                                                                </span>
                                                            )}
                                                            {!isPost3 && !isPost9 && !isPost1 && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                                                    Post={t.ma_post}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* VIN + Số máy */}
                                                        <td className="px-3 py-2.5">
                                                            <div className="font-mono font-bold text-slate-900 text-[11px]">{t.vin || <span className="text-slate-300 italic font-normal">Chưa có VIN</span>}</div>
                                                            {t.so_may && (
                                                                <div className="font-mono text-[10px] text-slate-400">{t.so_may}</div>
                                                            )}
                                                        </td>

                                                        {/* Khách hàng / TVBH / diễn giải */}
                                                        <td className="px-3 py-2.5 max-w-[220px]">
                                                            {t.ten_kh ? (
                                                                <div className="font-semibold text-slate-900 truncate text-[11.5px]" title={t.ten_kh}>{t.ten_kh}</div>
                                                            ) : (
                                                                <div className="text-slate-400 italic text-[11px]">Chuyển kho nội bộ</div>
                                                            )}
                                                            {t.ten_tvbh && (
                                                                <div className="text-[10px] text-slate-500 truncate" title={t.ten_tvbh}>
                                                                    <span className="text-slate-400">TVBH: </span>{t.ten_tvbh}
                                                                </div>
                                                            )}
                                                            {t.dien_giai && (
                                                                <div className="text-[10px] text-slate-400 italic truncate" title={t.dien_giai}>{t.dien_giai}</div>
                                                            )}
                                                        </td>

                                                        {/* Thao tác */}
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                {t.voucher_type === 'TD4' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPrintTd4Data(t)}
                                                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                                                        title="In Giấy Ra Cổng (TD4)"
                                                                    >
                                                                        <i className="fas fa-print text-[10px]"></i>
                                                                        <span>In GRC</span>
                                                                    </button>
                                                                )}

                                                                {t.voucher_type === 'DNX' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setPrintTicketData({
                                                                                so_ct: t.so_ct,
                                                                                stt_rec: t.stt_rec,
                                                                                ngay_ct: t.ngay_ct,
                                                                                user_name: t.nvkd || '02.NHANPT',
                                                                                ma_kho_xuat: t.ma_kho_xuat || 'K87',
                                                                                ma_kho_nhan: t.ma_kho_nhan || 'K83',
                                                                                khach_hang: t.ten_kh || '',
                                                                                don_vi: 'Thuận An',
                                                                                ly_do: t.dien_giai || 'Điều chuyển xe nội bộ làm PDI chuẩn bị giao KH',
                                                                                total_cars: 1,
                                                                                cars: [{
                                                                                    vin: t.vin,
                                                                                    so_may: t.so_may,
                                                                                    ma_kx: t.loai_xe,
                                                                                    ten_kx: t.ten_kx || t.loai_xe,
                                                                                    dong_xe: t.ten_kx || t.loai_xe,
                                                                                    ma_mau: t.ma_mau || '',
                                                                                    ten_mau: t.ten_mau || t.ma_mau || ''
                                                                                }]
                                                                            });
                                                                        }}
                                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                                                        title="In Phiếu Đề Nghị Xuất (DNX)"
                                                                    >
                                                                        <i className="fas fa-print text-[10px]"></i>
                                                                        <span>In DNX</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedTicketModal(t)}
                                                                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                                                    title="Xem chi tiết phiếu"
                                                                >
                                                                    <i className="fas fa-eye text-[10px]"></i>
                                                                </button>
                                                            </div>
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
                                <div><span className="text-slate-400">Dòng xe:</span> <strong>{selectedTicketModal.ten_kx || selectedTicketModal.loai_xe || '-'}</strong></div>
                                <div><span className="text-slate-400">Showroom (TTCP):</span> <strong>{selectedTicketModal.ma_ttcp || '-'}</strong></div>
                                <div><span className="text-slate-400">Khách hàng:</span> <strong>{selectedTicketModal.ten_kh || '-'}</strong></div>
                                <div><span className="text-slate-400">Tư vấn bán hàng:</span> <strong>{selectedTicketModal.ten_tvbh || selectedTicketModal.nvkd || '-'}</strong></div>
                                <div><span className="text-slate-400">Người nhận / Giao:</span> <strong>{selectedTicketModal.nguoi_nhan || selectedTicketModal.ong_ba || '-'}</strong></div>
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

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <i className="fas fa-file-invoice text-blue-500"></i>
                                <span>Mẫu in chuẩn CyberSoft ERP</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedTicketModal.voucher_type === 'TD4' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPrintTd4Data(selectedTicketModal);
                                        }}
                                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <i className="fas fa-print"></i>
                                        <span>In Giấy Ra Cổng (TD4)</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPrintTicketData({
                                                so_ct: selectedTicketModal.so_ct,
                                                stt_rec: selectedTicketModal.stt_rec,
                                                ngay_ct: selectedTicketModal.ngay_ct,
                                                user_name: selectedTicketModal.nvkd || '02.NHANPT',
                                                ma_kho_xuat: 'K87',
                                                ma_kho_nhan: 'K83',
                                                khach_hang: selectedTicketModal.ten_kh || '',
                                                don_vi: 'Thuận An',
                                                ly_do: selectedTicketModal.dien_giai || 'Đề nghị xuất xe điều chuyển',
                                                total_cars: 1,
                                                cars: [{
                                                    vin: selectedTicketModal.vin,
                                                    so_may: selectedTicketModal.so_may,
                                                    ma_kx: selectedTicketModal.loai_xe,
                                                    ten_kx: selectedTicketModal.ten_kx || selectedTicketModal.loai_xe,
                                                    dong_xe: selectedTicketModal.ten_kx || selectedTicketModal.loai_xe,
                                                    ma_mau: selectedTicketModal.ma_mau || '',
                                                    ten_mau: selectedTicketModal.ten_mau || selectedTicketModal.ma_mau || ''
                                                }]
                                            });
                                        }}
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <i className="fas fa-print"></i>
                                        <span>In Phiếu DNX</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedTicketModal(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
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

            {/* MODAL IN CHỨNG TỪ CYBERSOFT ERP (PHDNX / CTDNX) */}
            <CyberDnxPrintModal 
                isOpen={!!printTicketData}
                onClose={() => setPrintTicketData(null)}
                data={printTicketData}
            />

            {/* MODAL IN GIẤY RA CỔNG CYBERSOFT ERP (PHTD / TD4) */}
            <CyberTd4PrintModal 
                isOpen={!!printTd4Data}
                onClose={() => setPrintTd4Data(null)}
                data={printTd4Data}
            />

            </div>
        </div>
    );
};
