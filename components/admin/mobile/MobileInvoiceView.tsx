import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { Order, ActionType } from '../../../types';
import {
    ChevronLeft,
    Search,
    SlidersHorizontal,
    X,
    Car,
    FileText,
    CheckCircle2,
    FileCheck,
    AlertCircle,
    Zap,
    Download
} from 'lucide-react';

interface MobileInvoiceViewProps {
    orders: Order[];
    onAction: (type: ActionType, order: Order, data?: any) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    onUpdateInvoiceDetails?: (orderNumber: string, data: { engineNumber: string; policy: string; commission: string; vpoint: string }) => Promise<boolean>;
    selectedFolder: string;
    selectedOrderId: string | null;
    onFolderChange: (folder: string) => void;
    onOrderSelect: (orderId: string | null) => void;
    processingId?: string | null;
    processingActionType?: ActionType | null;
    isLoading?: boolean;
    onBackToAdminHome?: () => void;
    onOpenActionMenu?: () => void;
    onBatchFetchInvoices?: () => void;
    onBatchCheckDms?: () => void;
    isBatchFetching?: boolean;
    isCheckingDms?: boolean;
}

// Chuẩn hóa chuỗi tìm kiếm bỏ dấu tiếng Việt
const normalizeStr = (str: any): string => {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
};

// Chuẩn hóa tên dòng xe
const formatCarModel = (model?: string): string => {
    if (!model) return 'VF';
    const m = model.trim();
    if (m.toUpperCase().startsWith('VF') && !m.toUpperCase().startsWith('VF ')) {
        return `VF ${m.slice(2).trim()}`;
    }
    return m;
};

// Viết hoa chữ cái đầu (Title Case) cho tên Khách hàng / TVBH
const formatCustomerName = (name?: string): string => {
    if (!name) return '—';
    const raw = String(name).trim();
    if (!raw) return '—';

    const words = raw.split(/\s+/);
    const keepUpperSet = new Set(['TNHH', 'CP', 'MTV', 'TM', 'DV', 'XD', 'ĐT', 'KT', 'CN', 'XNK', 'SX', 'BĐS', 'VINFAST', 'VF', 'VSO', 'ARI']);

    return words.map(w => {
        const clean = w.replace(/[^\w\u00C0-\u1EF9]/gi, '');
        if (keepUpperSet.has(clean.toUpperCase())) {
            return w.toUpperCase();
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
};

// Bảng màu xe VinFast sắc nét
const getExteriorSwatchColor = (colorName?: string): string => {
    if (!colorName) return '#94a3b8';
    const c = colorName.toLowerCase();
    if (c.includes('white') || c.includes('trắng') || c.includes('blanc') || c.includes('ce18')) return '#f8fafc';
    if (c.includes('black') || c.includes('đen') || c.includes('noir') || c.includes('ce11')) return '#0f172a';
    if (c.includes('red') || c.includes('đỏ') || c.includes('crimson') || c.includes('rouge') || c.includes('ce1m')) return '#dc2626';
    if (c.includes('blue') || c.includes('xanh dương') || c.includes('aquatic') || c.includes('bleu') || c.includes('ce14') || c.includes('sky')) return '#2563eb';
    if (c.includes('green') || c.includes('xanh lá') || c.includes('vert') || c.includes('ce13') || c.includes('emerald')) return '#059669';
    if (c.includes('grey') || c.includes('gray') || c.includes('xám') || c.includes('gris') || c.includes('ce12') || c.includes('zenith')) return '#64748b';
    if (c.includes('silver') || c.includes('bạc') || c.includes('argent') || c.includes('desat')) return '#cbd5e1';
    if (c.includes('pink') || c.includes('hồng') || c.includes('rose') || c.includes('ce2k')) return '#f472b6';
    if (c.includes('orange') || c.includes('cam') || c.includes('vitality') || c.includes('ce1e')) return '#ea580c';
    if (c.includes('yellow') || c.includes('vàng') || c.includes('jaune') || c.includes('ce16')) return '#eab308';
    if (c.includes('purple') || c.includes('tím') || c.includes('violet') || c.includes('iris')) return '#9333ea';
    return '#94a3b8';
};



export const MobileInvoiceView: React.FC<MobileInvoiceViewProps> = ({
    orders,
    onAction,
    showToast: _showToast,
    onOpenFilePreview,
    selectedFolder,
    selectedOrderId,
    onFolderChange,
    onOrderSelect,
    processingId,
    processingActionType: _processingActionType,
    isLoading = false,
    onBackToAdminHome,
    onOpenActionMenu,
    onBatchFetchInvoices,
    onBatchCheckDms,
    isBatchFetching = false,
    isCheckingDms = false
}) => {
    const [mobileScreen, setMobileScreen] = useState<'list' | 'detail'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>('all');
    const [selectedTvbh, setSelectedTvbh] = useState<string>('all');
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [isCommonActionsOpen, setIsCommonActionsOpen] = useState(false);

    // Danh sách các folder / thư mục xử lý hóa đơn
    const folderTabs = useMemo(() => {
        const counts = {
            pending_approval: 0,
            approved: 0,
            pending_signature: 0,
            completed: 0,
            request_supplement: 0,
            supplemented: 0,
            all: orders.length
        };

        orders.forEach(o => {
            const s = (o['Trạng thái xử lý'] || o['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
            if (s === 'chờ phê duyệt') counts.pending_approval++;
            else if (s === 'đã phê duyệt') counts.approved++;
            else if (s === 'chờ ký hóa đơn' || s === 'chờ ký hóa đơn') counts.pending_signature++;
            else if (s === 'đã xuất hóa đơn') counts.completed++;
            else if (s === 'yêu cầu bổ sung') counts.request_supplement++;
            else if (s === 'đã bổ sung') counts.supplemented++;
        });

        return [
            { id: 'pending_approval', label: 'Chờ duyệt', count: counts.pending_approval },
            { id: 'approved', label: 'Đã duyệt', count: counts.approved },
            { id: 'pending_signature', label: 'Chờ ký', count: counts.pending_signature },
            { id: 'completed', label: 'Đã xuất HĐ', count: counts.completed },
        ];
    }, [orders]);

    // Lọc theo folder hiện tại
    const currentFolderOrders = useMemo(() => {
        const list = orders.filter(order => {
            const status = (order['Trạng thái xử lý'] || order['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
            switch (selectedFolder) {
                case 'pending_approval': return status === 'chờ phê duyệt';
                case 'approved': return status === 'đã phê duyệt';
                case 'pending_signature': return status === 'chờ ký hóa đơn' || status === 'chờ ký hóa đơn';
                case 'completed': return status === 'đã xuất hóa đơn';
                case 'request_supplement': return status === 'yêu cầu bổ sung';
                case 'supplemented': return status === 'đã bổ sung';
                case 'all': return true;
                default: return true;
            }
        });

        return list.sort((a, b) => {
            const dateA = a['Ngày xuất hóa đơn'] ? new Date(a['Ngày xuất hóa đơn']).getTime() : 0;
            const dateB = b['Ngày xuất hóa đơn'] ? new Date(b['Ngày xuất hóa đơn']).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA;
            const timeA = a['Thời gian nhập'] ? new Date(a['Thời gian nhập']).getTime() : 0;
            const timeB = b['Thời gian nhập'] ? new Date(b['Thời gian nhập']).getTime() : 0;
            return timeB - timeA;
        });
    }, [orders, selectedFolder]);

    // Danh sách các Dòng xe & TVBH để đưa vào bộ lọc
    const availableModels = useMemo(() => {
        const set = new Set<string>();
        orders.forEach(o => {
            const m = formatCarModel(o['Dòng xe']);
            if (m) set.add(m);
        });
        return Array.from(set).sort();
    }, [orders]);

    const availableTvbhs = useMemo(() => {
        const set = new Set<string>();
        orders.forEach(o => {
            const tvbh = (o['Tên tư vấn bán hàng'] || '').trim();
            if (tvbh) set.add(tvbh);
        });
        return Array.from(set).sort();
    }, [orders]);

    // Lọc theo Search Query và Filter
    const filteredOrders = useMemo(() => {
        let list = currentFolderOrders;

        if (selectedModel !== 'all') {
            list = list.filter(o => formatCarModel(o['Dòng xe']) === selectedModel);
        }

        if (selectedTvbh !== 'all') {
            list = list.filter(o => (o['Tên tư vấn bán hàng'] || '').trim().toLowerCase() === selectedTvbh.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = normalizeStr(searchQuery).toLowerCase();
            list = list.filter(o => {
                const customer = normalizeStr(o['Tên khách hàng']).toLowerCase();
                const orderNum = normalizeStr(o['Số đơn hàng']).toLowerCase();
                const tvbh = normalizeStr(o['Tên tư vấn bán hàng']).toLowerCase();
                const model = normalizeStr(o['Dòng xe']).toLowerCase();
                const vin = normalizeStr(o['VIN'] || o['Số VIN'] || '').toLowerCase();
                const exterior = normalizeStr(o['Ngoại thất']).toLowerCase();
                const contract = normalizeStr(o['Mã HĐ Cyber'] || o['Số hợp đồng'] || '').toLowerCase();
                return customer.includes(q) || orderNum.includes(q) || tvbh.includes(q) || model.includes(q) || vin.includes(q) || exterior.includes(q) || contract.includes(q);
            });
        }

        return list;
    }, [currentFolderOrders, selectedModel, selectedTvbh, searchQuery]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedModel !== 'all') count++;
        if (selectedTvbh !== 'all') count++;
        return count;
    }, [selectedModel, selectedTvbh]);

    const handleResetFilters = () => {
        setSelectedModel('all');
        setSelectedTvbh('all');
        setSearchQuery('');
    };

    const selectedOrder = useMemo(() => {
        return orders.find(o => o['Số đơn hàng'] === selectedOrderId) || null;
    }, [selectedOrderId, orders]);

    const handleSelectOrder = (order: Order) => {
        onOrderSelect(order['Số đơn hàng']);
        setMobileScreen('detail');
    };

    const handleBackToList = () => {
        setMobileScreen('list');
        onOrderSelect(null);
    };

    // Kiểm tra các tài liệu đính kèm
    const orderDocuments = useMemo(() => {
        if (!selectedOrder) return [];
        const docs = [
            {
                key: 'LinkDeNghiXHD',
                title: 'Đề Nghị Xuất HĐ',
                url: (selectedOrder.LinkDeNghiXHD || (selectedOrder as any).link_de_nghi_xhd || '') as string,
                icon: 'fa-file-invoice text-amber-600'
            },
            {
                key: 'LinkHopDong',
                title: 'Hợp Đồng Mua Bán',
                url: (selectedOrder.LinkHopDong || (selectedOrder as any).link_hop_dong || '') as string,
                icon: 'fa-file-contract text-blue-600'
            },
            {
                key: 'LinkHoaDonDaXuat',
                title: 'Hóa Đơn Red (VAT)',
                url: (selectedOrder.LinkHoaDonDaXuat || (selectedOrder as any).link_hoa_don_da_xuat || (selectedOrder as any).url_hoa_don_da_xuat || '') as string,
                icon: 'fa-file-invoice-dollar text-emerald-600'
            }
        ];
        return docs.filter(d => Boolean(d.url));
    }, [selectedOrder]);

    const orderStatus = (selectedOrder?.['Trạng thái xử lý'] || selectedOrder?.['Kết quả'] || '').toLowerCase().trim().normalize('NFC');

    const batchInvoiceCount = useMemo(() => filteredOrders.filter(order => {
        const status = (order['Trạng thái xử lý'] || order['Kết quả'] || '').toLowerCase().trim().normalize('NFC');
        const hasInvoice = Boolean(order['Link hóa đơn đã xuất'] || order.link_hoa_don_da_xuat || order.url_hoa_don_da_xuat || order.LinkHoaDonDaXuat);
        return (status === 'chờ ký hóa đơn' || status === 'chờ ký hóa đơn') && !hasInvoice;
    }).length, [filteredOrders]);

    const mobileInvoiceDetails = useMemo(() => {
        if (!selectedOrder) return null;

        const read = (...keys: string[]) => {
            for (const key of keys) {
                const value = selectedOrder[key];
                if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
            }
            return '';
        };
        const formatDate = (value: string) => {
            if (!value) return '';
            const parsed = moment(value);
            return parsed.isValid() ? parsed.format('DD/MM/YYYY') : value;
        };
        const formatNumber = (value: string, suffix = '') => {
            if (!value) return '';
            const numeric = Number(value.replace(/[^0-9.-]/g, ''));
            return Number.isFinite(numeric) ? `${numeric.toLocaleString('vi-VN')}${suffix}` : value;
        };

        return {
            engineNumber: read('Số máy', 'so_may', 'SỐ MÁY'),
            dmsCode: read('Mã DMS', 'ma_dms', 'MÃ DMS'),
            depositDate: formatDate(read('Ngày cọc', 'ngay_coc')),
            invoiceDate: formatDate(read('Ngày xuất hóa đơn', 'ngay_xuat_hoa_don')),
            phone: read('SĐT', 'Điện thoại', 'dien_thoai', 'phone'),
            identity: read('CCCD', 'CMND', 'cccd', 'cmnd'),
            address: read('Địa chỉ', 'Địa chỉ khách hàng', 'dia_chi'),
            commission: formatNumber(read('Hoa hồng ứng', 'Số tiền hoa hồng ứng trước', 'hoa_hong_ung'), 'đ'),
            vpoint: formatNumber(read('Điểm Vpoint sử dụng', 'vpoint')),
            voucher: read('Mã VC', 'ma_vc'),
            policies: read('CHÍNH SÁCH', 'chinh_sach').split(/;|\n|,(?=\s*[A-ZÀ-Ỹ])/).map(item => item.trim()).filter(Boolean),
            note: read('Ghi chú Admin', 'ghi_chu_admin').replace(/\[(?:COC về|YÊU CẦU SCAN LẠI):?[^\]]*\]/gi, '').trim(),
            mailResult: read('KẾT QUẢ GỬI MAIL', 'ket_qua_gui_mail')
        };
    }, [selectedOrder]);

    return (
        <div
            style={{
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
            className="flex h-full w-full flex-col overflow-hidden bg-[#f2f2f7] text-slate-800 select-none"
        >
            {/* ========================================================================= */}
            {/* 🍏 1. APPLE NAVIGATION BAR TRONG SUỐT (FROSTED GLASS IOS HEADER) */}
            {/* ========================================================================= */}
            {mobileScreen === 'list' || !selectedOrder ? (
                <header className="w-full bg-white/85 backdrop-blur-xl border-b border-black/[0.08] px-3.5 pt-2 pb-2.5 flex-shrink-0 z-30 shadow-2xs">
                    <div className="flex items-center justify-between">
                        {/* Back button sang Quản trị */}
                        <div className="w-20 flex justify-start">
                            <button
                                type="button"
                                onClick={onBackToAdminHome}
                                className="flex items-center space-x-0.5 text-slate-700 hover:text-slate-900 active:scale-95 transition-all text-[13px] font-semibold py-1 px-1.5 -ml-1 rounded-lg hover:bg-black/[0.04]"
                            >
                                <ChevronLeft size={17} strokeWidth={2.4} className="-mr-0.5 text-slate-600" />
                                <span>Quản trị</span>
                            </button>
                        </div>

                        {/* Tiêu đề mục căn giữa chuẩn xác 100% phong cách Ghép Xe / Kho Xe */}
                        <h1 className="text-xs font-bold uppercase tracking-wider text-slate-700 text-center flex-1">
                            HÓA ĐƠN
                        </h1>

                        {/* Nút công cụ quản trị */}
                        <div className="w-20 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsCommonActionsOpen(true)}
                                className="w-8 h-8 rounded-full bg-slate-100/90 text-slate-600 hover:text-blue-600 flex items-center justify-center active:scale-90 transition-all"
                                title="Công cụ quản trị"
                            >
                                <i className="fas fa-ellipsis-h text-[12px]" />
                            </button>
                        </div>
                    </div>
                </header>
            ) : (
                <header className="w-full bg-white/85 backdrop-blur-xl border-b border-black/[0.08] px-3.5 pt-2 pb-2.5 flex-shrink-0 z-30 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <div className="w-24 flex justify-start">
                            <button
                                type="button"
                                onClick={handleBackToList}
                                className="flex items-center space-x-0.5 text-slate-700 hover:text-slate-900 active:scale-95 transition-all text-[13px] font-semibold py-1 px-1.5 -ml-1 rounded-lg hover:bg-black/[0.04]"
                            >
                                <ChevronLeft size={17} strokeWidth={2.4} className="-mr-0.5 text-slate-600" />
                                <span>Hóa Đơn</span>
                            </button>
                        </div>

                        <h1 className="text-xs font-bold text-slate-800 tracking-tight text-center flex-1 truncate px-2">
                            {formatCustomerName(selectedOrder['Tên khách hàng'])}
                        </h1>

                        <div className="w-20 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsCommonActionsOpen(true)}
                                className="w-8 h-8 rounded-full bg-slate-100/90 text-slate-600 flex items-center justify-center active:scale-90 transition-all"
                                title="Tác vụ"
                            >
                                <i className="fas fa-ellipsis-h text-[12px]" />
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* Screen Content: List View vs Detail View */}
            {mobileScreen === 'list' || !selectedOrder ? (
                <>
                    {/* iOS Top Segmented Control (Pill Switcher) */}
                    <div className="shrink-0 px-3.5 pt-2 pb-1.5 bg-[#f2f2f7]">
                        <div className="flex items-center gap-1 p-[3px] rounded-xl bg-slate-200/80">
                            {folderTabs.map(tab => {
                                const isActive = selectedFolder === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => onFolderChange(tab.id)}
                                        className={`flex-1 h-[28px] rounded-[9px] text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                                            isActive
                                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                                : 'text-slate-600 active:text-slate-900'
                                        }`}
                                    >
                                        <span className="truncate">{tab.label}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                            isActive 
                                                ? tab.id === 'completed' 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : 'bg-blue-100 text-blue-700' 
                                                : 'bg-black/[0.05] text-slate-500'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 📋 2. DANH SÁCH BẢNG CHUẨN 1-1 GHÉP XE (SMARTPHONE INSET TABLE) */}
                    {/* ========================================================================= */}
                    <main className="flex-1 overflow-y-auto px-3.5 pt-1 pb-2 no-scrollbar">
                        {isLoading ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                                <p className="text-xs font-bold text-slate-700">Đang nạp dữ liệu hóa đơn...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                    <Car size={26} strokeWidth={1.8} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700">Không tìm thấy đơn hàng</h3>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                    Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc.
                                </p>
                                {activeFiltersCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="mt-3.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95"
                                    >
                                        Đặt lại bộ lọc
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                                {/* 🏷️ THANH TIÊU ĐỀ CỘT CHUẨN DẠNG BẢNG (APPLE INSET TABLE HEADER) */}
                                <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                    <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Cấu hình xe</div>
                                    <div className="flex-1 min-w-0 pl-3 pr-1">Khách hàng / TVBH</div>
                                    <div className="w-3 shrink-0"></div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {filteredOrders.map((order, idx) => {
                                        const carModel = (order['Dòng xe'] || '').trim();
                                        const carTrim = (order['Phiên bản'] || '').trim();
                                        const exterior = order['Ngoại thất'] || 'Tiêu chuẩn';
                                        const interior = order['Nội thất'] || 'Tiêu chuẩn';
                                        const customerName = formatCustomerName(order['Tên khách hàng']);
                                        const tvbhName = order['Tên tư vấn bán hàng'] ? formatCustomerName(order['Tên tư vấn bán hàng']) : 'Chưa phân bổ';
                                        const vin = (order['VIN'] || order['Số VIN'] || '').trim();

                                        return (
                                            <div
                                                key={order['Số đơn hàng'] || idx}
                                                onClick={() => handleSelectOrder(order)}
                                                className="flex min-h-[62px] cursor-pointer select-none items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70"
                                            >
                                                {/* 1. CỘT 1: CẤU HÌNH XE (DÒNG XE & MÀU SẮC & VIN) */}
                                                <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 pr-3">
                                                    {/* Dòng 1: Dòng xe & Phiên bản */}
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="font-bold text-[13px] tracking-tight text-slate-900 truncate">
                                                            {formatCarModel(carModel)}
                                                        </span>
                                                        {carTrim && carTrim.toLowerCase() !== carModel.toLowerCase() && (
                                                            <span className="text-[11px] font-semibold text-slate-600 truncate">
                                                                {carTrim}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Dòng 2: Chấm màu + Tên màu ngoại thất & VIN */}
                                                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium truncate">
                                                        <span
                                                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                                                            style={{ backgroundColor: getExteriorSwatchColor(exterior) }}
                                                            title={`${exterior} / ${interior}`}
                                                        />
                                                        <span className="truncate text-slate-600" title={exterior}>
                                                            {exterior}
                                                        </span>
                                                        {vin && (
                                                            <span className="font-mono text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                                                {vin.slice(-8)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 2. CỘT 2: KHÁCH HÀNG & TVBH */}
                                                <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch pl-3 pr-1">
                                                    {/* Dòng 1: Tên khách hàng */}
                                                    <div className="font-semibold text-[12.5px] text-slate-800 truncate" title={order['Tên khách hàng']}>
                                                        {customerName}
                                                    </div>

                                                    {/* Dòng 2: Tên TVBH */}
                                                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium truncate" title={order['Tên tư vấn bán hàng']}>
                                                        <i className="fas fa-user-tie text-[9px] text-slate-400 flex-shrink-0" />
                                                        <span className="truncate">{tvbhName}</span>
                                                    </div>
                                                </div>

                                                {/* 3. CỘT 3: ICON CHEVRON NHỎ GỌN */}
                                                <div className="flex items-center justify-end shrink-0 pl-1 text-slate-300 w-3">
                                                    <i className="fas fa-chevron-right text-[10px]" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* ========================================================================= */}
                    {/* 🔍 3. APPLE FLOATING BOTTOM DOCK: TÌM KIẾM & BỘ LỌC ĐỒNG BỘ GHÉP XE */}
                    {/* ========================================================================= */}
                    <div className="w-full bg-white/92 backdrop-blur-2xl border-t border-black/[0.08] px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-30 flex-shrink-0 space-y-1">
                        {/* Dải tags bộ lọc đang áp dụng */}
                        {activeFiltersCount > 0 && (
                            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                                    Đang lọc:
                                </span>
                                {selectedModel !== 'all' && (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                                        <span>Xe: {selectedModel}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedModel('all')}
                                            className="hover:text-slate-900 active:scale-90 ml-0.5"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                )}
                                {selectedTvbh !== 'all' && (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                                        <span>TVBH: {selectedTvbh}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTvbh('all')}
                                            className="hover:text-slate-900 active:scale-90 ml-0.5"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="text-[10px] font-medium text-slate-500 hover:text-slate-800 active:scale-95 px-1 py-0.5 flex-shrink-0"
                                >
                                    Xóa tất cả
                                </button>
                            </div>
                        )}

                        {/* Thanh tìm kiếm & Nút Lọc thu nhỏ theo phong cách Apple */}
                        <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                    <Search size={13} strokeWidth={2} />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Tìm số VIN, HĐ, dòng xe, màu, TVBH, khách..."
                                    className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsFilterSheetOpen(true)}
                                className={`h-[34px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${
                                    activeFiltersCount > 0
                                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                        : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'
                                }`}
                            >
                                <SlidersHorizontal size={12} strokeWidth={2} />
                                <span>Lọc</span>
                                {activeFiltersCount > 0 && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-white text-slate-700 font-bold text-[9px] flex items-center justify-center -mr-0.5">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 🎛️ 4. APPLE FILTER BOTTOM SHEET (ĐỒNG BỘ 1-1 VỚI KHO XE & ĐƠN HÀNG) */}
                    {/* ========================================================================= */}
                    {isFilterSheetOpen && (
                        <div className="fixed inset-0 z-50 flex flex-col justify-end">
                            <div
                                className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                                onClick={() => setIsFilterSheetOpen(false)}
                            />

                            <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[55dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
                                <div className="pt-2 pb-0.5 flex justify-center">
                                    <div className="w-8 h-1 rounded-full bg-slate-300" />
                                </div>

                                <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                                    <div className="w-16 flex justify-start">
                                        {activeFiltersCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={handleResetFilters}
                                                className="text-[12.5px] font-medium text-slate-500 hover:text-slate-800 active:opacity-60 transition-opacity"
                                            >
                                                Đặt lại
                                            </button>
                                        ) : (
                                            <span className="w-1" />
                                        )}
                                    </div>
                                    <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">
                                        Bộ Lọc Hóa Đơn
                                    </h3>
                                    <div className="w-16 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsFilterSheetOpen(false)}
                                            className="text-[13.5px] font-bold text-slate-700 hover:text-slate-900 active:opacity-60 transition-opacity"
                                        >
                                            Xong
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
                                    {/* Nhóm 1: Dòng Xe */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                            Dòng xe ({availableModels.length})
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedModel('all')}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                    selectedModel === 'all'
                                                        ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                        : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                }`}
                                            >
                                                Tất cả xe
                                            </button>
                                            {availableModels.map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setSelectedModel(m)}
                                                    className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                        selectedModel === m
                                                            ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                            : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                    }`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Nhóm 2: Tư Vấn Bán Hàng */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                            Tư vấn bán hàng ({availableTvbhs.length})
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTvbh('all')}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                    selectedTvbh === 'all'
                                                        ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                        : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                }`}
                                            >
                                                Tất cả TVBH
                                            </button>
                                            {availableTvbhs.map(tvbh => (
                                                <button
                                                    key={tvbh}
                                                    type="button"
                                                    onClick={() => setSelectedTvbh(tvbh)}
                                                    className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border max-w-[180px] truncate ${
                                                        selectedTvbh === tvbh
                                                            ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                            : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                    }`}
                                                >
                                                    <span className="truncate">{formatCustomerName(tvbh)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 border-t border-black/[0.06] bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setIsFilterSheetOpen(false)}
                                        className="w-full h-[38px] rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
                                    >
                                        <span>Xem {filteredOrders.length} Đơn Hóa Đơn</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* ========================================================================= */
                /* 🔍 5. APPLE DETAIL VIEW FOR INVOICE (CHI TIẾT ĐƠN HÓA ĐƠN) */
                /* ========================================================================= */
                <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-2 overflow-hidden p-2">
                    {/* Thẻ xe & Khách hàng */}
                    <div className="space-y-2 rounded-[18px] border border-black/[0.06] bg-white p-2.5 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-blue-100/80 bg-blue-50 text-blue-600">
                                <i className="fas fa-file-invoice-dollar text-[15px]" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="truncate text-[13px] font-bold leading-tight text-slate-900">
                                    {formatCarModel(selectedOrder['Dòng xe'])} {selectedOrder['Phiên bản']}
                                </h2>
                                <p className="mt-0.5 truncate text-[9.5px] font-medium text-slate-500">
                                    {selectedOrder['Ngoại thất']} • {selectedOrder['Nội thất']}
                                </p>
                            </div>
                        </div>

                        {/* Thông tin khách hàng & TVBH */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-[10px]">
                            <div>
                                <span className="block text-[8px] font-bold uppercase text-slate-400">Khách hàng</span>
                                <span className="font-semibold text-slate-800 block truncate">
                                    {formatCustomerName(selectedOrder['Tên khách hàng'])}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[8px] font-bold uppercase text-slate-400">TVBH phụ trách</span>
                                <span className="font-semibold text-slate-800 block truncate">
                                    {formatCustomerName(selectedOrder['Tên tư vấn bán hàng'])}
                                </span>
                            </div>
                            {selectedOrder['Mã HĐ Cyber'] && (
                                <div>
                                    <span className="block text-[8px] font-bold uppercase text-slate-400">Mã HĐ Cyber</span>
                                    <span className="font-mono font-semibold text-slate-700 block truncate">
                                        {selectedOrder['Mã HĐ Cyber']}
                                    </span>
                                </div>
                            )}
                            {selectedOrder['Ngày xuất hóa đơn'] && (
                                <div>
                                    <span className="block text-[8px] font-bold uppercase text-slate-400">Ngày xuất HĐ</span>
                                    <span className="font-semibold text-slate-700 block truncate">
                                        {moment(selectedOrder['Ngày xuất hóa đơn']).format('DD/MM/YYYY')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {selectedOrder['VIN'] && (
                            <div className="flex items-center justify-between rounded-[10px] border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Số khung (VIN)</span>
                                <span className="max-w-[70%] truncate font-mono text-[9.5px] font-bold tracking-wide text-blue-700" title={selectedOrder['VIN']}>
                                    {selectedOrder['VIN']}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Thông tin nghiệp vụ đầy đủ tương đương giao diện laptop */}
                    {mobileInvoiceDetails && (
                        <div className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-2xs">
                            <div className="border-b border-slate-100 px-3 py-1.5">
                                <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Thông tin nghiệp vụ</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-px bg-slate-100">
                                {[
                                    ['Số đơn hàng', selectedOrder['Số đơn hàng'], true],
                                    ['Số máy', mobileInvoiceDetails.engineNumber, true],
                                    ['Mã DMS', mobileInvoiceDetails.dmsCode, true],
                                    ['Ngày cọc', mobileInvoiceDetails.depositDate, false],
                                    ['Ngày xuất HĐ', mobileInvoiceDetails.invoiceDate, false],
                                    ['Điện thoại', mobileInvoiceDetails.phone, false],
                                    ['CCCD / MST', mobileInvoiceDetails.identity, true],
                                    ['Hoa hồng ứng', mobileInvoiceDetails.commission, false],
                                    ['VPoint sử dụng', mobileInvoiceDetails.vpoint, false],
                                    ['Mã voucher', mobileInvoiceDetails.voucher, true],
                                    ['Kết quả gửi mail', mobileInvoiceDetails.mailResult, false]
                                ].filter(([, value]) => Boolean(value)).map(([label, value, mono]) => (
                                    <div key={String(label)} className="min-w-0 bg-white px-2.5 py-1.5">
                                        <span className="block text-[7px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                                        <span className={`block truncate text-[9.5px] font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`} title={String(value)}>{value}</span>
                                    </div>
                                ))}
                            </div>
                            {mobileInvoiceDetails.address && (
                                <div className="border-t border-slate-100 px-2.5 py-1.5">
                                    <span className="block text-[7px] font-bold uppercase tracking-wide text-slate-400">Địa chỉ khách hàng</span>
                                    <span className="block truncate text-[9px] font-medium text-slate-700" title={mobileInvoiceDetails.address}>{mobileInvoiceDetails.address}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {mobileInvoiceDetails && (mobileInvoiceDetails.policies.length > 0 || mobileInvoiceDetails.note) && (
                        <div className="min-h-0 overflow-hidden rounded-[18px] border border-black/[0.06] bg-white p-2.5 shadow-2xs">
                            {mobileInvoiceDetails.policies.length > 0 && (
                                <div>
                                    <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Chính sách áp dụng</h3>
                                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                                        {mobileInvoiceDetails.policies.map((policy, index) => (
                                            <div key={`${policy}-${index}`} className="flex min-w-0 items-start gap-1.5 text-[8.5px] leading-tight text-slate-700">
                                                <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-blue-500" />
                                                <span className="line-clamp-2" title={policy}>{policy}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {mobileInvoiceDetails.note && (
                                <div className={`${mobileInvoiceDetails.policies.length ? 'mt-2 border-t border-slate-100 pt-1.5' : ''}`}>
                                    <span className="block text-[7px] font-bold uppercase tracking-wide text-slate-400">Ghi chú nghiệp vụ</span>
                                    <p className="line-clamp-1 text-[8.5px] text-slate-700" title={mobileInvoiceDetails.note}>{mobileInvoiceDetails.note}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Danh sách Tài Liệu Chứng Từ */}
                    <div className="rounded-[18px] border border-black/[0.06] bg-white p-2.5 shadow-2xs">
                        <h3 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            Tài liệu & Chứng từ ({orderDocuments.length})
                        </h3>
                        {orderDocuments.length === 0 ? (
                            <p className="py-1 text-center text-[9px] italic text-slate-400">
                                Chưa có file đính kèm cho đơn hàng này.
                            </p>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {orderDocuments.map(doc => (
                                    <div
                                        key={doc.key}
                                        onClick={() => onOpenFilePreview(doc.url, doc.title)}
                                        className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-slate-200/60 bg-slate-50 px-2 py-1.5 transition-colors active:bg-slate-200"
                                    >
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <i className={`fas ${doc.icon} flex-shrink-0 text-[11px]`} />
                                            <span className="truncate text-[8px] font-semibold text-slate-700">
                                                {doc.title}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Các Nút Hành Động Nghiệp Vụ Chính (Action CTAs) */}
                    <div className="rounded-[18px] border border-black/[0.06] bg-white p-2 shadow-2xs">
                        <div className="grid grid-cols-2 gap-1.5">
                            {(orderStatus === 'chờ phê duyệt' || orderStatus === 'đã bổ sung') && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onAction('approve', selectedOrder)}
                                        disabled={processingId === selectedOrder['Số đơn hàng']}
                                        className="col-span-2 h-10 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                                    >
                                        <CheckCircle2 size={15} />
                                        <span>Phê Duyệt Xuất HĐ</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onAction('supplement', selectedOrder)}
                                        disabled={processingId === selectedOrder['Số đơn hàng']}
                                        className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                                    >
                                        <AlertCircle size={13} />
                                        <span>Yêu cầu bổ sung</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onAction('rescan', selectedOrder)}
                                        disabled={processingId === selectedOrder['Số đơn hàng']}
                                        className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                                    >
                                        <FileText size={13} />
                                        <span>Y/C Scan lại</span>
                                    </button>
                                </>
                            )}

                            {orderStatus === 'đã phê duyệt' && (
                                <button
                                    type="button"
                                    onClick={() => onAction('pendingSignature', selectedOrder)}
                                    disabled={processingId === selectedOrder['Số đơn hàng']}
                                    className="col-span-2 h-10 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                                >
                                    <FileCheck size={15} />
                                    <span>Chuyển Sang Chờ Ký</span>
                                </button>
                            )}

                            {(orderStatus === 'chờ ký hóa đơn' || orderStatus === 'chờ ký hóa đơn') && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onAction('autoMInvoice', selectedOrder)}
                                        disabled={processingId === selectedOrder['Số đơn hàng']}
                                        className="col-span-2 h-10 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                                    >
                                        <Zap size={15} />
                                        <span>Lấy Hóa Đơn M-Invoice</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onAction('uploadInvoice', selectedOrder)}
                                        disabled={processingId === selectedOrder['Số đơn hàng']}
                                        className="col-span-2 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                                    >
                                        <Download size={13} />
                                        <span>Tải lên file hóa đơn thủ công</span>
                                    </button>
                                </>
                            )}

                            {orderStatus === 'đã xuất hóa đơn' && (
                                <button
                                    type="button"
                                    onClick={() => onAction('resend', selectedOrder)}
                                    disabled={processingId === selectedOrder['Số đơn hàng']}
                                    className="col-span-2 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                                >
                                    <i className="fas fa-paper-plane text-xs" />
                                    <span>Gửi lại Email hóa đơn</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isCommonActionsOpen && (
                <div className="fixed inset-0 z-[120] flex items-end bg-black/30 backdrop-blur-[2px]" onClick={() => setIsCommonActionsOpen(false)}>
                    <div className="w-full rounded-t-[28px] bg-[#f2f2f7] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(15,23,42,0.18)]" onClick={event => event.stopPropagation()}>
                        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-slate-300" />
                        <div className="mb-2 px-1 text-center">
                            <h2 className="text-[14px] font-bold text-slate-900">Tác vụ chung Hóa đơn</h2>
                            <p className="mt-0.5 text-[10px] text-slate-500">Áp dụng cho danh sách đang hiển thị</p>
                        </div>

                        <div className="overflow-hidden rounded-[16px] border border-black/[0.06] bg-white">
                            <button
                                type="button"
                                disabled={isBatchFetching || batchInvoiceCount === 0}
                                onClick={() => {
                                    setIsCommonActionsOpen(false);
                                    onBatchFetchInvoices?.();
                                }}
                                className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-slate-50 disabled:opacity-45"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-blue-50 text-blue-600">
                                    <i className={`fas ${isBatchFetching ? 'fa-spinner fa-spin' : 'fa-bolt'} text-[14px]`} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] font-bold text-slate-900">{isBatchFetching ? 'Đang quét M-Invoice…' : 'Quét hóa đơn tất cả xe'}</span>
                                    <span className="block text-[9.5px] text-slate-500">{batchInvoiceCount} xe đang chờ ký chưa có hóa đơn</span>
                                </span>
                                <ChevronLeft size={15} className="rotate-180 text-slate-300" />
                            </button>

                            <button
                                type="button"
                                disabled={isCheckingDms || filteredOrders.length === 0}
                                onClick={() => {
                                    setIsCommonActionsOpen(false);
                                    onBatchCheckDms?.();
                                }}
                                className="flex w-full items-center gap-3 border-t border-slate-100 px-3.5 py-3 text-left active:bg-slate-50 disabled:opacity-45"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-600">
                                    <i className={`fas ${isCheckingDms ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'} text-[14px]`} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] font-bold text-slate-900">{isCheckingDms ? 'Đang đối soát DMS…' : 'Đối soát lại DMS'}</span>
                                    <span className="block text-[9.5px] text-slate-500">Kiểm tra {filteredOrders.length} đơn trong mục hiện tại</span>
                                </span>
                                <ChevronLeft size={15} className="rotate-180 text-slate-300" />
                            </button>

                            {onOpenActionMenu && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCommonActionsOpen(false);
                                        onOpenActionMenu();
                                    }}
                                    className="flex w-full items-center gap-3 border-t border-slate-100 px-3.5 py-3 text-left active:bg-slate-50"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-slate-100 text-slate-600"><i className="fas fa-ellipsis text-[13px]" /></span>
                                    <span className="text-[12px] font-bold text-slate-900">Công cụ quản trị khác</span>
                                </button>
                            )}
                        </div>

                        <button type="button" onClick={() => setIsCommonActionsOpen(false)} className="mt-2 h-11 w-full rounded-[14px] bg-white text-[12px] font-semibold text-slate-700 shadow-2xs active:bg-slate-100">Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileInvoiceView;
