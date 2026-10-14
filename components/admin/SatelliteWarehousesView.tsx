import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    fetchDnxReconciliationData, 
    DnxReconciliationItem,
    fetchTd4ReconciliationData,
    Td4ReconciliationItem,
    fetchInvoicedMissingYardReconciliationData,
    InvoicedMissingYardItem
} from '../../services/api/satelliteWarehouseService';

export interface SatelliteCarItem {
    id: string;
    khoKey: 'q12' | 'ql13' | 'tada';
    khoName: string;
    stt: number | string;
    thangNhap: string;
    khoXe: string;
    showroomQuanLy: string;
    loaiXe: string;
    soKhung: string;
    mauSac: string;
    mucPin: string;
    mucPinPercent: number | null;
    benGiao: string;
    ngayNhan: string;
    ngayGiao: string;
    khoaSo: string;
    soNgayTonKho: number | string;
    note: string;
    tinhTrang: string;
    isThuanAn: boolean;
    isTonKho: boolean;
}

interface SatelliteWarehousesViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    isActive?: boolean;
    allOrders?: any[];
    stockData?: any[];
    initialViewMode?: 'inventory' | 'reconcile';
    initialReconcileTab?: 'td4' | 'dnx' | 'missing_yard' | 'all';
    onCountsChange?: (counts: { carsCount: number; td4Count: number; dnxCount: number; missingYardCount: number; allAlertCount: number }) => void;
}

const API_URL = "https://script.google.com/macros/s/AKfycbyQ8PIQx9DEI0Caps3q0GBGKcgo7DOV9rP_ykFbCr30WX5kaG8F8SjhblSGgKzadef9/exec";
const CACHE_KEY = "satellite_warehouses_cache_v1";

const formatDate = (val: any): string => {
    if (!val) return '';
    const str = String(val).trim();
    if (str.includes('T') && str.endsWith('Z')) {
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            }
        } catch {
            return str;
        }
    }
    return str;
};

const parsePin = (val: any): { display: string; percent: number | null } => {
    if (val === undefined || val === null || val === '') return { display: '-', percent: null };
    if (typeof val === 'number') {
        const pct = val <= 1 ? Math.round(val * 100) : Math.round(val);
        return { display: `${pct}%`, percent: pct };
    }
    const str = String(val).trim();
    const numMatch = str.match(/(\d+)%/);
    if (numMatch) {
        return { display: str, percent: parseInt(numMatch[1], 10) };
    }
    const rawNum = parseFloat(str);
    if (!isNaN(rawNum)) {
        const pct = rawNum <= 1 ? Math.round(rawNum * 100) : Math.round(rawNum);
        return { display: `${pct}%`, percent: pct };
    }
    return { display: str, percent: null };
};

export const SatelliteWarehousesView: React.FC<SatelliteWarehousesViewProps> = ({ 
    showToast, 
    isActive = true,
    allOrders = [],
    stockData: _stockData = [],
    initialViewMode = 'inventory',
    initialReconcileTab = 'td4',
    onCountsChange
}) => {
    // 2 View Modes chính:
    // 'inventory': Tồn kho 3 kho bãi vệ tinh
    // 'reconcile': Trung tâm Đối chiếu & Cảnh báo lệch kho (Cyber vs Bãi thực tế)
    const [viewMode, setViewMode] = useState<'inventory' | 'reconcile'>(initialViewMode);

    // Sub-Tab bên trong Trung tâm Đối Chiếu:
    // 'td4': Chi tiết Đầu Ra: Xe đã có phiếu TD4 nhưng bãi vẫn báo tồn kho
    // 'dnx': Chi tiết Đầu Vào: Xe ĐNX về bãi Thuận An chưa nhập K83 trên Cyber
    // 'missing_yard': Cảnh báo Xuất HĐ nhưng chưa có TD4 mà mất tồn bãi
    // 'all': Bảng tổng hợp toàn bộ sai lệch
    const [reconcileSubTab, setReconcileSubTab] = useState<'td4' | 'dnx' | 'missing_yard' | 'all'>(initialReconcileTab);

    // Đồng bộ khi parent truyền prop thay đổi
    useEffect(() => {
        if (initialViewMode) setViewMode(initialViewMode);
    }, [initialViewMode]);

    useEffect(() => {
        if (initialReconcileTab) setReconcileSubTab(initialReconcileTab);
    }, [initialReconcileTab]);

    // Filters cho Bảng Tổng Hợp ('all')
    const [allAlertFilter, setAllAlertFilter] = useState<'all' | 'dnx' | 'td4' | 'missing_yard'>('all');
    const [allAlertSearch, setAllAlertSearch] = useState('');
    const [selectedAllRowIdx, setSelectedAllRowIdx] = useState<number>(0);

    // 1. DỮ LIỆU 3 KHO VỆ TINH (GOOGLE SHEETS)
    const [isLoading, setIsLoading] = useState(false);
    const [cars, setCars] = useState<SatelliteCarItem[]>([]);
    
    // Filters kho vệ tinh
    const [khoFilter, setKhoFilter] = useState<'all' | 'q12' | 'ql13' | 'tada'>('all');
    const [modelFilter, setModelFilter] = useState<string>('all');
    const [showroomFilter, setShowroomFilter] = useState<string>('thuan_an');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ton' | 'giao'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedVin, setCopiedVin] = useState<string | null>(null);
    const [selectedRowIdx, setSelectedRowIdx] = useState<number>(0);

    // 2. DỮ LIỆU BẢNG ĐỐI CHIẾU ĐNX XUẤT ĐIỀU CHUYỂN
    const [reconcileItems, setReconcileItems] = useState<DnxReconciliationItem[]>([]);
    const [isLoadingReconcile, setIsLoadingReconcile] = useState(false);
    const [reconcileStatusFilter, setReconcileStatusFilter] = useState<'all' | 'thuan_an' | 'transit_yard' | 'in_transit'>('thuan_an');
    const [reconcileTvbhFilter, setReconcileTvbhFilter] = useState<string>('all');
    const [reconcileModelFilter, setReconcileModelFilter] = useState<string>('all');
    const [reconcileSearch, setReconcileSearch] = useState('');
    const [selectedReconcileRowIdx, setSelectedReconcileRowIdx] = useState<number>(0);

    // 3. DỮ LIỆU ĐỐI CHIẾU VI PHẠM TỒN KHO TD4
    const [td4Items, setTd4Items] = useState<Td4ReconciliationItem[]>([]);
    const [isLoadingTd4, setIsLoadingTd4] = useState(false);
    const [td4YardFilter, setTd4YardFilter] = useState<'all' | 'thuan_an' | 'other'>('all');
    const [td4TvbhFilter, setTd4TvbhFilter] = useState<string>('all');
    const [td4ModelFilter, setTd4ModelFilter] = useState<string>('all');
    const [td4Search, setTd4Search] = useState('');
    const [selectedTd4RowIdx, setSelectedTd4RowIdx] = useState<number>(0);

    // 4. DỮ LIỆU CẢNH BÁO XE XUẤT HÓA ĐƠN — CHƯA TD4 NHƯNG MẤT TỒN BÃI THỰC TẾ
    const [missingYardItems, setMissingYardItems] = useState<InvoicedMissingYardItem[]>([]);
    const [isLoadingMissingYard, setIsLoadingMissingYard] = useState(false);
    const [missingYardTvbhFilter, setMissingYardTvbhFilter] = useState<string>('all');
    const [missingYardModelFilter, setMissingYardModelFilter] = useState<string>('all');
    const [missingYardSearch, setMissingYardSearch] = useState('');
    const [selectedMissingYardRowIdx, setSelectedMissingYardRowIdx] = useState<number>(0);

    // Parser for API Data
    const parseApiResponse = useCallback((warehouses: Record<string, any>): SatelliteCarItem[] => {
        const parsedList: SatelliteCarItem[] = [];

        Object.entries(warehouses).forEach(([khoKey, info]) => {
            const data: any[][] = info.data || [];
            if (!data || data.length === 0) return;

            let headerIdx = 0;
            for (let idx = 0; idx < Math.min(3, data.length); idx++) {
                const joined = (data[idx] || []).join(' ').toLowerCase();
                if (joined.includes('số khung') || joined.includes('loại xe') || joined.includes('tháng nhập')) {
                    headerIdx = idx;
                    break;
                }
            }

            const rows = data.slice(headerIdx + 1);
            rows.forEach((r, rIdx) => {
                if (!r || r.length === 0) return;
                const vin = String(r[5] || '').trim();
                const loaiXe = String(r[4] || '').trim();
                const showroom = String(r[3] || '').trim();

                if (!vin && !loaiXe) return;

                const ngayGiao = String(r[10] || '').trim();
                const isTonKho = !ngayGiao || ngayGiao === '' || ngayGiao.toLowerCase() === 'none';
                const isThuanAn = showroom.toLowerCase().includes('thuận an') || showroom.toLowerCase().includes('thuan an');
                const pinInfo = parsePin(r[7]);

                let cleanKhoName = (info.khoName || khoKey || '').replace(/Kho /gi, '').trim();
                cleanKhoName = cleanKhoName
                    .replace(/Dĩ An/gi, '')
                    .replace(/Di An/gi, '')
                    .replace(/TA\s*-\s*DA/gi, 'Thuận An')
                    .replace(/-DA/gi, '')
                    .replace(/-\s*DA/gi, '')
                    .trim();
                if (!cleanKhoName || khoKey === 'tada' || cleanKhoName.toLowerCase() === 'tada') {
                    cleanKhoName = 'Thuận An';
                }

                parsedList.push({
                    id: `${khoKey}-${rIdx}-${vin}`,
                    khoKey: khoKey as any,
                    khoName: `Kho ${cleanKhoName}`,
                    stt: r[0] || (rIdx + 1),
                    thangNhap: String(r[1] || ''),
                    khoXe: String(r[2] || ''),
                    showroomQuanLy: showroom,
                    loaiXe: loaiXe,
                    soKhung: vin,
                    mauSac: String(r[6] || ''),
                    mucPin: pinInfo.display,
                    mucPinPercent: pinInfo.percent,
                    benGiao: String(r[8] || ''),
                    ngayNhan: formatDate(r[9]),
                    ngayGiao: formatDate(r[10]),
                    khoaSo: formatDate(r[11]),
                    soNgayTonKho: r[12] || '',
                    note: String(r[13] || ''),
                    tinhTrang: String(r[18] || r[17] || ''),
                    isThuanAn,
                    isTonKho
                });
            });
        });

        return parsedList;
    }, []);

    // Load from cache on mount
    useEffect(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const obj = JSON.parse(cached);
                if (obj.warehouses) {
                    const parsed = parseApiResponse(obj.warehouses);
                    setCars(parsed);
                }
            }
        } catch (e) {
            console.error('Error loading warehouse cache', e);
        }
    }, [parseApiResponse]);

    // Fetch fresh satellite data
    const handleFetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const json = await res.json();
            if (json.status !== 'SUCCESS') throw new Error(json.message || 'Lỗi lấy dữ liệu');

            localStorage.setItem(CACHE_KEY, JSON.stringify(json));
            const parsed = parseApiResponse(json.warehouses || {});
            setCars(parsed);
            if (!silent) {
                showToast('Thành công', `Đã cập nhật ${parsed.length} xe từ 3 kho thành công!`, 'success');
            }
            // Tự động làm mới cả đối chiếu ĐNX, TD4 và Missing Yard
            handleFetchReconcile(parsed, true);
            handleFetchTd4(parsed, true);
            handleFetchMissingYard(parsed, true);
        } catch (err: any) {
            console.error('Fetch error:', err);
            if (!silent) {
                showToast('Lỗi cập nhật', err.message || 'Không thể kết nối đến Google Sheets', 'error');
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Fetch fresh Missing Yard violation data
    const handleFetchMissingYard = useCallback(async (currentCars?: SatelliteCarItem[], silent = false) => {
        if (!silent) setIsLoadingMissingYard(true);
        try {
            const carList = currentCars || cars;
            const data = await fetchInvoicedMissingYardReconciliationData(allOrders, carList);
            setMissingYardItems(data);
            if (!silent) {
                showToast('Kiểm soát hóa đơn', `Phát hiện ${data.length} xe đã xuất HĐ, chưa có TD4 nhưng bãi thực tế không có xe!`, data.length > 0 ? 'warning' : 'success');
            }
        } catch (err: any) {
            console.error('Missing yard fetch error:', err);
            if (!silent) {
                showToast('Lỗi đối soát', err.message || 'Không thể tải dữ liệu kiểm soát hóa đơn bãi ngoài', 'error');
            }
        } finally {
            if (!silent) setIsLoadingMissingYard(false);
        }
    }, [allOrders, cars, showToast]);

    // Fetch fresh reconciliation data (ĐNX)
    const handleFetchReconcile = useCallback(async (currentCars?: SatelliteCarItem[], silent = false) => {
        if (!silent) setIsLoadingReconcile(true);
        try {
            const carList = currentCars || cars;
            const data = await fetchDnxReconciliationData(allOrders, carList);
            const unreceived = data.filter(d => !d.isTonKhoCyberK83);
            setReconcileItems(unreceived);
            if (!silent) {
                const alertCount = unreceived.filter(d => d.reconcileStatus === 'AT_THUAN_AN').length;
                showToast('Đối chiếu hoàn tất', `Tìm thấy ${unreceived.length} xe ĐNX chưa nhập K83 (${alertCount} xe đã về bãi Thuận An).`, 'success');
            }
        } catch (err: any) {
            console.error('Reconcile fetch error:', err);
            if (!silent) {
                showToast('Lỗi đối chiếu', err.message || 'Không thể tải dữ liệu đối chiếu ĐNX', 'error');
            }
        } finally {
            if (!silent) setIsLoadingReconcile(false);
        }
    }, [allOrders, cars, showToast]);

    // Fetch fresh TD4 violation data
    const handleFetchTd4 = useCallback(async (currentCars?: SatelliteCarItem[], silent = false) => {
        if (!silent) setIsLoadingTd4(true);
        try {
            const carList = currentCars || cars;
            const data = await fetchTd4ReconciliationData(allOrders, carList);
            setTd4Items(data);
            if (!silent) {
                showToast('Cảnh báo TD4', `Phát hiện ${data.length} xe có phiếu TD4 nhưng vẫn còn tồn bãi thực tế!`, data.length > 0 ? 'warning' : 'success');
            }
        } catch (err: any) {
            console.error('TD4 fetch error:', err);
            if (!silent) {
                showToast('Lỗi đối chiếu TD4', err.message || 'Không thể tải dữ liệu xe tồn TD4', 'error');
            }
        } finally {
            if (!silent) setIsLoadingTd4(false);
        }
    }, [allOrders, cars, showToast]);

    // Auto fetch on first open
    useEffect(() => {
        if (isActive) {
            if (cars.length === 0) {
                handleFetchData(true);
            }
            if (reconcileItems.length === 0) {
                handleFetchReconcile(undefined, true);
            }
            if (td4Items.length === 0) {
                handleFetchTd4(undefined, true);
            }
            if (missingYardItems.length === 0) {
                handleFetchMissingYard(undefined, true);
            }
        }
    }, [isActive, cars.length, reconcileItems.length, td4Items.length, missingYardItems.length, handleFetchReconcile, handleFetchTd4, handleFetchMissingYard]);

    // Copy VIN
    const copyVin = (vin: string) => {
        if (!vin) return;
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        showToast('Đã copy', `Đã copy số VIN: ${vin}`, 'info', 1500);
        setTimeout(() => setCopiedVin(null), 2000);
    };

    // Copy Danh Sách Gửi Zalo (ĐNX)
    const handleCopyZaloDnxList = () => {
        const alertCars = reconcileItems.filter(c => c.reconcileStatus === 'AT_THUAN_AN');
        if (alertCars.length === 0) {
            showToast('Thông báo', 'Hiện không có xe nào tại bãi Thuận An chưa nhập Cyber', 'info');
            return;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 DANH SÁCH XE ĐÃ VỀ BÃI THỰC TẾ THUẬN AN — TVBH CHƯA BÁO NHẬP KHO CYBER\n`;
        text += `(Cập nhật lúc: ${timeStr} - Tổng: ${alertCars.length} xe)\n`;
        text += `----------------------------------------\n`;
        
        alertCars.forEach((c, i) => {
            const pin = c.satelliteYard?.mucPin || '-';
            const ngayNhan = c.satelliteYard?.ngayNhan || '';
            text += `${i + 1}. VIN: ${c.vin}\n`;
            text += `   - ĐNX: ${c.soCtDnx || 'Chưa rõ'}\n`;
            text += `   - TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
            text += `   - Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Pin: ${pin} | Về bãi: ${ngayNhan}\n`;
        });
        
        text += `----------------------------------------\n`;
        text += `👉 Đề nghị các TVBH có tên trên khẩn trương liên hệ Admin/Kế toán để làm thủ tục PNK nhập kho Cyber kịp thời giao xe cho khách hàng!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách ${alertCars.length} xe để gửi nhóm Zalo!`, 'success', 2500);
    };

    // Copy Danh Sách Gửi Zalo (Cảnh Báo Tồn TD4)
    const handleCopyZaloTd4List = () => {
        if (td4Items.length === 0) {
            showToast('Thông báo', 'Tuyệt vời! Không có xe nào vi phạm tồn kho TD4.', 'success');
            return;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 CẢNH BÁO VI PHẠM TỒN KHO TD4 (XE CÓ PHIẾU GIAO XE TD4 NHƯNG VẪN CÒN TỒN BÃI)\n`;
        text += `(Cập nhật lúc: ${timeStr} - Tổng: ${td4Items.length} xe vi phạm)\n`;
        text += `QUY TẮC: "Phiếu TD4 có nghĩa là đã giao xe, KHÔNG ĐƯỢC PHÉP TỒN Ở BẤT KỲ ĐÂU!"\n`;
        text += `----------------------------------------\n`;
        
        td4Items.forEach((c, i) => {
            const sat = c.satelliteYard;
            text += `${i + 1}. VIN: ${c.vin}\n`;
            text += `   - TD4: ${c.soCtTd4} (Ngày lập: ${c.ngayCtTd4 || 'N/A'})\n`;
            text += `   - TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}${c.orderNumber ? ` | HĐ: ${c.orderNumber}` : ''}\n`;
            text += `   - Vị trí tồn: ${sat.khoName} | Pin: ${sat.pin} | Ngày nhận bãi: ${sat.ngayNhan || 'N/A'}\n`;
        });
        
        text += `----------------------------------------\n`;
        text += `👉 Đề nghị các TVBH và bộ phận Kho/Giao xe kiểm tra khẩn cấp: Nếu xe đã giao thực tế thì cập nhật ngày xuất bãi ngay, nếu xe chưa giao thì báo cáo lý do xe có TD4 vẫn còn tồn bãi!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách ${td4Items.length} xe vi phạm tồn TD4!`, 'warning', 2500);
    };

    // Export CSV 3 Kho
    const exportCsv = () => {
        if (filteredCars.length === 0) {
            showToast('Thông báo', 'Không có dữ liệu để xuất', 'warning');
            return;
        }

        const headers = ['Kho', 'STT', 'SR Quản Lý', 'Loại Xe', 'Số Khung (VIN)', 'Màu Sắc', 'Mức Pin', 'Bên Giao', 'Ngày Nhận', 'Ngày Giao', 'Số Ngày Tồn', 'Trạng Thái', 'Ghi Chú'];
        const rows = filteredCars.map(c => [
            c.khoName,
            c.stt,
            c.showroomQuanLy,
            c.loaiXe,
            c.soKhung,
            c.mauSac,
            c.mucPin,
            c.benGiao,
            c.ngayNhan,
            c.ngayGiao,
            c.soNgayTonKho,
            c.isTonKho ? 'Còn tồn bãi' : 'Đã giao',
            c.note
        ]);

        const csvContent = '\uFEFF' + [headers, ...rows]
            .map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ton_kho_bai_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Thành công', 'Đã xuất file dữ liệu 3 kho thành công', 'success');
    };

    // Export CSV Bảng Đối Chiếu ĐNX
    const exportReconcileCsv = () => {
        if (filteredReconcileItems.length === 0) {
            showToast('Thông báo', 'Không có dữ liệu đối chiếu để xuất', 'warning');
            return;
        }

        const headers = [
            'STT', 'Số Khung (VIN)', 'Số ĐNX', 'Ngày Lập ĐNX', 'TVBH Phụ Trách', 
            'Khách Hàng', 'Số Hợp Đồng', 'Dòng Xe', 'Màu Sắc', 'Kho Xuất', 
            'Kho Nhập Cyber', 'Tồn Kho Cyber (K83)', 'Vị Trí Thực Tế (Bãi Ngoài)', 
            'Ngày Nhận Bãi', 'Mức Pin', 'Kết Quả Đối Chiếu / Cảnh Báo'
        ];

        const rows = filteredReconcileItems.map((c, idx) => [
            idx + 1,
            c.vin,
            c.soCtDnx,
            c.ngayCtDnx,
            c.tvbh,
            c.customerName,
            c.orderNumber || '',
            c.carModel,
            c.color,
            c.khoXuat,
            c.khoNhan,
            c.isTonKhoCyberK83 ? 'Đã có tồn K83' : `Chưa nhập K83 (${c.tenKhoCyber || c.maKhoCyber || 'Đang vận tải'})`,
            c.satelliteYard ? c.satelliteYard.khoName : 'Chưa ghi nhận bãi',
            c.satelliteYard?.ngayNhan || '',
            c.satelliteYard?.mucPin || '',
            c.reconcileNote
        ]);

        const csvContent = '\uFEFF' + [headers, ...rows]
            .map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `doi_chieu_dnx_bai_thuan_an_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Thành công', 'Đã xuất file đối chiếu thành công', 'success');
    };

    // Export CSV Xe Tồn TD4
    const exportTd4Csv = () => {
        if (filteredTd4Items.length === 0) {
            showToast('Thông báo', 'Không có dữ liệu tồn TD4 để xuất', 'warning');
            return;
        }

        const headers = [
            'STT', 'Số Khung (VIN)', 'Số Phiếu TD4', 'Ngày Lập TD4', 'TVBH Phụ Trách',
            'Khách Hàng', 'Số Hợp Đồng', 'Dòng Xe', 'Màu Sắc', 'Kho Cyber',
            'Bãi Thực Tế Vẫn Còn Tồn', 'Ngày Nhận Bãi', 'Mức Pin', 'Tình Trạng Bãi', 'Cảnh Báo Vi Phạm'
        ];

        const rows = filteredTd4Items.map((c, idx) => [
            idx + 1,
            c.vin,
            c.soCtTd4,
            c.ngayCtTd4,
            c.tvbh,
            c.customerName,
            c.orderNumber,
            c.carModel,
            c.color,
            c.tenKhoCyber || c.maKhoCyber || '',
            c.satelliteYard.khoName,
            c.satelliteYard.ngayNhan,
            c.satelliteYard.pin,
            c.satelliteYard.tinhTrang,
            c.warningNote
        ]);

        const csvContent = '\uFEFF' + [headers, ...rows]
            .map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `canh_bao_xe_ton_td4_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Thành công', 'Đã xuất file danh sách xe tồn TD4 thành công', 'success');
    };

    // =========================================================================
    // DỮ LIỆU TỔNG HỢP TOÀN BỘ CẢNH BÁO LỆCH KHO (ĐẦU VÀO ĐNX & ĐẦU RA TD4)
    // =========================================================================
    const allCombinedAlerts = useMemo(() => {
        const list: {
            id: string;
            type: 'DNX' | 'TD4';
            typeLabel: string;
            vin: string;
            carModel: string;
            color: string;
            tvbh: string;
            customerName: string;
            orderNumber: string;
            soChungTu: string;
            ngayChungTu: string;
            khoCyber: string;
            khoThucTe: string;
            mucPin: string;
            ngayNhanBai: string;
            alertTitle: string;
            actionRequired: string;
            severity: 'critical' | 'warning';
        }[] = [];

        // Tập hợp các số khung đã có TD4 để loại bỏ hoàn toàn khỏi đối chiếu ĐNX
        // Quy tắc: "Nếu xe đã có TD4 thì bỏ qua phiếu ĐNX"
        const td4VinSet = new Set<string>();
        td4Items.forEach(t => {
            const v = (t.vin || '').trim().toUpperCase();
            if (v) {
                td4VinSet.add(v);
                if (v.length >= 6) td4VinSet.add(v.slice(-6));
            }
        });

        // 1. Chiều Nhập: Các xe ĐNX chưa có tồn K83 trên Cyber (Đã tự động bỏ qua nếu xe đã có TD4)
        reconcileItems.forEach(item => {
            const v = (item.vin || '').trim().toUpperCase();
            if (td4VinSet.has(v) || (v.length >= 6 && td4VinSet.has(v.slice(-6)))) {
                return; // Bỏ qua phiếu ĐNX nếu xe đã có phiếu TD4
            }
            const isAtThuanAn = item.reconcileStatus === 'AT_THUAN_AN';
            list.push({
                id: `dnx-${item.vin}`,
                type: 'DNX',
                typeLabel: isAtThuanAn ? 'ĐNX Chưa Nhập K83' : 'ĐNX Đang Luân Chuyển',
                vin: item.vin,
                carModel: item.carModel,
                color: item.color,
                tvbh: item.tvbh || 'Chưa rõ',
                customerName: item.customerName || 'Chưa rõ',
                orderNumber: item.orderNumber || '',
                soChungTu: item.soCtDnx || 'Chưa rõ',
                ngayChungTu: item.ngayCtDnx || '',
                khoCyber: item.isTonKhoCyberK83 ? 'Đã có tồn K83' : `Chưa có tồn K83 (${item.tenKhoCyber || item.maKhoCyber || 'Đang vận tải'})`,
                khoThucTe: item.satelliteYard ? item.satelliteYard.khoName : 'Chưa ghi nhận bãi',
                mucPin: item.satelliteYard?.mucPin || '-',
                ngayNhanBai: item.satelliteYard?.ngayNhan || '',
                alertTitle: isAtThuanAn ? 'XE ĐÃ VỀ BÃI THUẬN AN — CHƯA LÀM PNK CYBER' : (item.satelliteYard ? 'Tại bãi trung chuyển QL13/Q12' : 'Đang vận chuyển'),
                actionRequired: isAtThuanAn ? 'TVBH báo Admin/Kế toán làm phiếu PNK nhập kho Cyber để kịp tiến độ giao xe' : 'Theo dõi điều phối xe về Showroom Thuận An',
                severity: isAtThuanAn ? 'critical' : 'warning'
            });
        });

        // 2. Chiều Xuất: Các xe đã có phiếu TD4 (đã giao xe) nhưng bãi thực tế vẫn báo tồn kho
        td4Items.forEach(item => {
            list.push({
                id: `td4-${item.vin}`,
                type: 'TD4',
                typeLabel: 'TD4 Vi Phạm Tồn Bãi',
                vin: item.vin,
                carModel: item.carModel,
                color: item.color,
                tvbh: item.tvbh || 'Chưa rõ',
                customerName: item.customerName || 'Chưa rõ',
                orderNumber: item.orderNumber || '',
                soChungTu: item.soCtTd4 || 'Chưa rõ',
                ngayChungTu: item.ngayCtTd4 || '',
                khoCyber: `Đã xuất TD4 (${item.tenKhoCyber || item.maKhoCyber || 'Cyber'})`,
                khoThucTe: item.satelliteYard.khoName,
                mucPin: item.satelliteYard.pin || '-',
                ngayNhanBai: item.satelliteYard.ngayNhan || '',
                alertTitle: 'VI PHẠM QUY ĐỊNH: ĐÃ CÓ PHIẾU TD4 NHƯNG BÃI VẪN BÁO TỒN KHO',
                actionRequired: 'Khẩn trương kiểm tra thực tế: Nếu xe đã giao thì cập nhật ngày xuất bãi ngay, nếu chưa giao thì báo cáo lý do!',
                severity: 'critical'
            });
        });

        // 3. Chiều Xuất Hóa Đơn: Đã xuất HĐ nhưng chưa có TD4 mà mất tồn bãi thực tế
        missingYardItems.forEach(item => {
            list.push({
                id: `missing-${item.vin}`,
                type: 'MISSING_YARD' as any,
                typeLabel: 'Xuất HĐ Mất Tồn Bãi',
                vin: item.vin,
                carModel: item.carModel,
                color: item.color,
                tvbh: item.tvbh || 'Chưa rõ',
                customerName: item.customerName || 'Chưa rõ',
                orderNumber: item.orderNumber || '',
                soChungTu: item.maHdCyber || 'HĐ',
                ngayChungTu: item.ngayXuatHoaDon || '',
                khoCyber: `Kho Cyber: ${item.tenKhoCyber || item.maKhoCyber}`,
                khoThucTe: item.khoBaiThucTe || 'Không có trong 3 bãi',
                mucPin: '-',
                ngayNhanBai: item.ngayXuatBaiThucTe || '',
                alertTitle: 'NGUY HIỂM: ĐÃ XUẤT HÓA ĐƠN NHƯNG CHƯA CÓ LỆNH TD4 MÀ MẤT TỒN BÃI THỰC TẾ',
                actionRequired: 'Khẩn trương kiểm tra vị trí xe thực tế! Nguy cơ giao xe chui trái quy trình hoặc thất lạc!',
                severity: 'critical'
            });
        });

        return list;
    }, [reconcileItems, td4Items, missingYardItems]);

    // Filter cho Bảng Tổng Hợp
    const filteredAllAlerts = useMemo(() => {
        return allCombinedAlerts.filter(item => {
            if (allAlertFilter === 'dnx' && item.type !== 'DNX') return false;
            if (allAlertFilter === 'td4' && item.type !== 'TD4') return false;
            if (allAlertFilter === 'missing_yard' && (item.type as any) !== 'MISSING_YARD') return false;

            if (allAlertSearch.trim()) {
                const q = allAlertSearch.toLowerCase().trim();
                const matchVin = item.vin.toLowerCase().includes(q);
                const matchCt = item.soChungTu.toLowerCase().includes(q);
                const matchTvbh = item.tvbh.toLowerCase().includes(q);
                const matchKh = item.customerName.toLowerCase().includes(q);
                const matchHd = item.orderNumber.toLowerCase().includes(q);
                const matchModel = item.carModel.toLowerCase().includes(q);
                const matchKho = item.khoThucTe.toLowerCase().includes(q);
                if (!matchVin && !matchCt && !matchTvbh && !matchKh && !matchHd && !matchModel && !matchKho) return false;
            }
            return true;
        });
    }, [allCombinedAlerts, allAlertFilter, allAlertSearch]);

    // Làm mới toàn bộ đối chiếu (kéo dữ liệu mới nhất từ Google Sheets 3 bãi và CSDL CyberSoft)
    const handleFetchAllReconcile = async () => {
        setIsLoadingReconcile(true);
        setIsLoadingTd4(true);
        setIsLoadingMissingYard(true);
        try {
            // 1. Tải mới nhất trực tiếp từ Google Sheets của 3 bãi xe
            let freshCars = cars;
            try {
                const res = await fetch(API_URL);
                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'SUCCESS' && json.warehouses) {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(json));
                        freshCars = parseApiResponse(json.warehouses || {});
                        setCars(freshCars);
                    }
                }
            } catch (sheetErr) {
                console.warn('Lỗi tải Google Sheets, sử dụng cache/state hiện tại:', sheetErr);
            }

            // 2. Chạy đối soát song song cả 3 phân hệ với dữ liệu bãi mới nhất và CSDL Cyber/Supabase
            await Promise.all([
                handleFetchReconcile(freshCars, true),
                handleFetchTd4(freshCars, true),
                handleFetchMissingYard(freshCars, true)
            ]);
            showToast('Làm mới hoàn tất', 'Đã tải dữ liệu mới nhất từ Google Sheets và CSDL đối chiếu CyberSoft!', 'success');
        } catch (err: any) {
            console.error('Refresh all error:', err);
            showToast('Lỗi làm mới', err.message || 'Không thể làm mới dữ liệu đối chiếu', 'error');
        } finally {
            setIsLoadingReconcile(false);
            setIsLoadingTd4(false);
            setIsLoadingMissingYard(false);
        }
    };

    // Copy Báo Cáo Tổng Hợp Gửi Zalo (Cả ĐNX & TD4)
    const handleCopyZaloAllReconcile = () => {
        const dnxAlerts = reconcileItems.filter(c => c.reconcileStatus === 'AT_THUAN_AN');
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 BÁO CÁO TỔNG HỢP SAI LỆCH KHO: CYBERSOFT vs BÃI XE THỰC TẾ\n`;
        text += `(Thời điểm kiểm tra: ${timeStr} - Tổng cộng: ${dnxAlerts.length + td4Items.length} trường hợp lệch)\n`;
        text += `========================================\n\n`;

        // 1. Chiều Nhập (ĐNX Chưa Nhập Cyber)
        text += `📥 1. ĐẦU VÀO (ĐNX ĐÃ VỀ BÃI THUẬN AN — CHƯA NHẬP K83 CYBER): ${dnxAlerts.length} xe\n`;
        text += `👉 Đề nghị TVBH khẩn trương báo Admin/Kế toán làm PNK để kịp tiến độ giao xe:\n`;
        text += `----------------------------------------\n`;
        if (dnxAlerts.length === 0) {
            text += `   (Không có xe nào tồn đọng)\n`;
        } else {
            dnxAlerts.forEach((c, i) => {
                const pin = c.satelliteYard?.mucPin || '-';
                const ngayNhan = c.satelliteYard?.ngayNhan || '';
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • ĐNX: ${c.soCtDnx || 'Chưa rõ'} (Ngày: ${c.ngayCtDnx || 'N/A'})\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `    • Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Pin: ${pin} | Về bãi: ${ngayNhan}\n`;
            });
        }
        text += `\n`;

        // 2. Chiều Xuất (TD4 Vi Phạm Tồn)
        text += `🚨 2. ĐẦU RA (ĐÃ LẬP PHIẾU TD4 — BÃI THỰC TẾ VẪN BÁO TỒN KHO): ${td4Items.length} xe\n`;
        text += `👉 QUY TẮC: Phiếu TD4 là đã giao xe, KHÔNG ĐƯỢC PHÉP TỒN Ở BẤT KỲ ĐÂU!\n`;
        text += `----------------------------------------\n`;
        if (td4Items.length === 0) {
            text += `   (Tuyệt vời! Không có xe nào vi phạm tồn TD4)\n`;
        } else {
            td4Items.forEach((c, i) => {
                const sat = c.satelliteYard;
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • TD4: ${c.soCtTd4} (Ngày lập: ${c.ngayCtTd4 || 'N/A'})\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}${c.orderNumber ? ` | HĐ: ${c.orderNumber}` : ''}\n`;
                text += `    • Bãi tồn: ${sat.khoName} | Pin: ${sat.pin} | Nhận bãi: ${sat.ngayNhan || 'N/A'}\n`;
            });
        }
        text += `\n`;

        // 3. Chiều Xuất Hóa Đơn (Đã Xuất HĐ nhưng chưa có TD4 mà mất tồn bãi)
        text += `⚠️ 3. XUẤT HÓA ĐƠN CHƯA TD4 — MẤT TỒN BÃI THỰC TẾ: ${missingYardItems.length} xe\n`;
        text += `👉 CẢNH BÁO NGUY CƠ: Xe chưa có phiếu TD4 không được phép rời bãi!\n`;
        text += `----------------------------------------\n`;
        if (missingYardItems.length === 0) {
            text += `   (Tuyệt vời! Không có xe vi phạm)\n`;
        } else {
            missingYardItems.forEach((c, i) => {
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `    • Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Ngày xuất HĐ: ${c.ngayXuatHoaDon ? c.ngayXuatHoaDon.slice(0, 10) : 'N/A'}\n`;
                text += `    • Tình trạng: ${c.satelliteStatusLabel}\n`;
            });
        }
        text += `\n========================================\n`;
        text += `👉 Đề nghị Quản lý bãi, Kế toán và các TVBH phối hợp xử lý dứt điểm các trường hợp lệch trên!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép Báo cáo tổng hợp đối soát (${dnxAlerts.length + td4Items.length + missingYardItems.length} xe)!`, 'success', 2500);
    };

    // Copy Zalo Danh Sách Xe Xuất HĐ Mất Tồn Bãi
    const handleCopyZaloMissingYardList = () => {
        if (missingYardItems.length === 0) {
            showToast('Thông báo', 'Tuyệt vời! Không có xe nào đã xuất HĐ mà mất tồn bãi.', 'success');
            return;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 CẢNH BÁO NGUY HIỂM: XE ĐÃ XUẤT HÓA ĐƠN — CHƯA LẬP PHIẾU TD4 NHƯNG MẤT TỒN BÃI THỰC TẾ\n`;
        text += `(Cập nhật lúc: ${timeStr} - Tổng: ${missingYardItems.length} xe vi phạm/nguy cơ)\n`;
        text += `QUY TẮC: "Xe chưa có phiếu TD4 KHÔNG ĐƯỢC PHÉP rời khỏi bãi xe showroom!"\n`;
        text += `----------------------------------------\n`;
        
        missingYardItems.forEach((c, i) => {
            text += `${i + 1}. VIN: ${c.vin}\n`;
            text += `   - TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
            text += `   - Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Ngày xuất HĐ: ${c.ngayXuatHoaDon ? c.ngayXuatHoaDon.slice(0, 10) : 'N/A'}\n`;
            text += `   - Tình trạng: ${c.satelliteStatusLabel}\n`;
            text += `   - Kho Cyber từng lưu: ${c.tenKhoCyber || c.maKhoCyber}\n`;
        });
        
        text += `----------------------------------------\n`;
        text += `👉 Đề nghị TVBH và Bộ phận Quản lý Kho bãi kiểm tra khẩn cấp vị trí hiện tại của các xe trên và báo cáo Ban Giám Đốc ngay trong ngày!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách ${missingYardItems.length} xe xuất HĐ mất tồn bãi!`, 'warning', 2500);
    };

    // Export CSV Xe Xuất HĐ Mất Tồn Bãi
    const exportMissingYardCsv = () => {
        if (filteredMissingYardItems.length === 0) {
            showToast('Thông báo', 'Không có dữ liệu để xuất', 'warning');
            return;
        }

        const headers = [
            'STT', 'Số Khung (VIN)', 'Dòng Xe', 'Màu Sắc', 'Số HĐ / Hóa Đơn', 
            'Ngày Xuất Hóa Đơn', 'TVBH Phụ Trách', 'Khách Hàng', 'Kho Cyber Từng Có', 
            'Tình Trạng Bãi Thực Tế', 'Ngày Xuất Bãi (Nếu Có)', 'Cảnh Báo Vi Phạm'
        ];

        const rows = filteredMissingYardItems.map((c, idx) => [
            idx + 1,
            c.vin,
            c.carModel,
            c.color,
            c.maHdCyber || c.orderNumber,
            c.ngayXuatHoaDon ? c.ngayXuatHoaDon.slice(0, 10) : '',
            c.tvbh,
            c.customerName,
            c.tenKhoCyber || c.maKhoCyber,
            c.satelliteStatusLabel,
            c.ngayXuatBaiThucTe || '',
            c.warningNote
        ]);

        const csvContent = '\uFEFF' + [headers, ...rows]
            .map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `canh_bao_xuat_hd_mat_ton_bai_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Thành công', 'Đã xuất file cảnh báo thành công', 'success');
    };

    // Xuất Excel Báo Cáo Toàn Bộ Sai Lệch
    const exportAllAlertsCsv = () => {
        if (filteredAllAlerts.length === 0) {
            showToast('Thông báo', 'Không có dữ liệu cảnh báo để xuất', 'warning');
            return;
        }

        const headers = [
            'STT', 'Phân Loại', 'Số Khung (VIN)', 'Số Chứng Từ (ĐNX/TD4)', 'Ngày Chứng Từ', 
            'Dòng Xe', 'Màu Sắc', 'TVBH Phụ Trách', 'Khách Hàng', 'Số Hợp Đồng', 
            'Trạng Thái CyberSoft', 'Vị Trí Thực Tế (Bãi Ngoài)', 'Mức Pin', 'Ngày Nhận Bãi', 
            'Tình Trạng Sai Lệch', 'Yêu Cầu Hành Động'
        ];

        const rows = filteredAllAlerts.map((c, idx) => [
            idx + 1,
            c.type === 'DNX' ? 'Đầu vào (ĐNX chưa nhập K83)' : 'Đầu ra (TD4 vi phạm tồn bãi)',
            c.vin,
            c.soChungTu,
            c.ngayChungTu,
            c.carModel,
            c.color,
            c.tvbh,
            c.customerName,
            c.orderNumber,
            c.khoCyber,
            c.khoThucTe,
            c.mucPin,
            c.ngayNhanBai,
            c.alertTitle,
            c.actionRequired
        ]);

        const csvContent = '\uFEFF' + [headers, ...rows]
            .map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bao_cao_lech_kho_cyber_vs_thuc_te_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Thành công', 'Đã xuất file đối soát tổng hợp thành công', 'success');
    };

    // Models for dropdown (3 Kho)
    const uniqueModels = useMemo(() => {
        const set = new Set<string>();
        cars.forEach(c => {
            if (c.loaiXe) set.add(c.loaiXe.trim());
        });
        return Array.from(set).sort();
    }, [cars]);

    // TVBHs for dropdown (ĐNX)
    const uniqueReconcileTvbhs = useMemo(() => {
        const set = new Set<string>();
        reconcileItems.forEach(c => {
            if (c.tvbh) set.add(c.tvbh.trim());
        });
        return Array.from(set).sort();
    }, [reconcileItems]);

    // Models for dropdown (ĐNX)
    const uniqueReconcileModels = useMemo(() => {
        const set = new Set<string>();
        reconcileItems.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [reconcileItems]);

    // TVBHs for dropdown (TD4)
    const uniqueTdTvbhs = useMemo(() => {
        const set = new Set<string>();
        td4Items.forEach(c => {
            if (c.tvbh) set.add(c.tvbh.trim());
        });
        return Array.from(set).sort();
    }, [td4Items]);

    // Models for dropdown (TD4)
    const uniqueTdModels = useMemo(() => {
        const set = new Set<string>();
        td4Items.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [td4Items]);

    // Filtered cars (3 Kho)
    const filteredCars = useMemo(() => {
        return cars.filter(c => {
            if (khoFilter !== 'all' && c.khoKey !== khoFilter) return false;
            if (modelFilter !== 'all' && c.loaiXe.trim() !== modelFilter) return false;
            
            if (showroomFilter === 'thuan_an' && !c.isThuanAn) return false;
            if (showroomFilter === 'other' && c.isThuanAn) return false;

            if (statusFilter === 'ton' && !c.isTonKho) return false;
            if (statusFilter === 'giao' && c.isTonKho) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchVin = c.soKhung.toLowerCase().includes(q);
                const matchModel = c.loaiXe.toLowerCase().includes(q);
                const matchColor = c.mauSac.toLowerCase().includes(q);
                const matchSr = c.showroomQuanLy.toLowerCase().includes(q);
                const matchNote = c.note.toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchColor && !matchSr && !matchNote) return false;
            }
            return true;
        });
    }, [cars, khoFilter, modelFilter, showroomFilter, statusFilter, searchQuery]);

    // Filtered cars (ĐNX)
    const filteredReconcileItems = useMemo(() => {
        return reconcileItems.filter(c => {
            if (reconcileStatusFilter === 'thuan_an' && c.reconcileStatus !== 'AT_THUAN_AN') return false;
            if (reconcileStatusFilter === 'transit_yard' && c.reconcileStatus !== 'AT_TRANSIT_YARD') return false;
            if (reconcileStatusFilter === 'in_transit' && c.reconcileStatus !== 'IN_TRANSIT') return false;

            if (reconcileTvbhFilter !== 'all' && c.tvbh.trim() !== reconcileTvbhFilter) return false;
            if (reconcileModelFilter !== 'all' && c.carModel.trim() !== reconcileModelFilter) return false;

            if (reconcileSearch.trim()) {
                const q = reconcileSearch.toLowerCase().trim();
                const matchVin = c.vin.toLowerCase().includes(q);
                const matchDnx = c.soCtDnx.toLowerCase().includes(q);
                const matchTvbh = c.tvbh.toLowerCase().includes(q);
                const matchKh = c.customerName.toLowerCase().includes(q);
                const matchHd = (c.orderNumber || '').toLowerCase().includes(q);
                const matchModel = c.carModel.toLowerCase().includes(q);
                if (!matchVin && !matchDnx && !matchTvbh && !matchKh && !matchHd && !matchModel) return false;
            }
            return true;
        });
    }, [reconcileItems, reconcileStatusFilter, reconcileTvbhFilter, reconcileModelFilter, reconcileSearch]);

    // Filtered cars (TD4)
    const filteredTd4Items = useMemo(() => {
        return td4Items.filter(c => {
            if (td4YardFilter === 'thuan_an' && !c.isTonThuanAn) return false;
            if (td4YardFilter === 'other' && c.isTonThuanAn) return false;

            if (td4TvbhFilter !== 'all' && c.tvbh.trim() !== td4TvbhFilter) return false;
            if (td4ModelFilter !== 'all' && c.carModel.trim() !== td4ModelFilter) return false;

            if (td4Search.trim()) {
                const q = td4Search.toLowerCase().trim();
                const matchVin = c.vin.toLowerCase().includes(q);
                const matchTd4 = c.soCtTd4.toLowerCase().includes(q);
                const matchTvbh = c.tvbh.toLowerCase().includes(q);
                const matchKh = c.customerName.toLowerCase().includes(q);
                const matchHd = (c.orderNumber || '').toLowerCase().includes(q);
                const matchModel = c.carModel.toLowerCase().includes(q);
                if (!matchVin && !matchTd4 && !matchTvbh && !matchKh && !matchHd && !matchModel) return false;
            }
            return true;
        });
    }, [td4Items, td4YardFilter, td4TvbhFilter, td4ModelFilter, td4Search]);

    // Counts for status bar (3 Kho)
    const countThuanAn = useMemo(() => filteredCars.filter(c => c.isThuanAn).length, [filteredCars]);
    const countTonBai = useMemo(() => filteredCars.filter(c => c.isTonKho).length, [filteredCars]);
    const countDaGiao = useMemo(() => filteredCars.filter(c => !c.isTonKho).length, [filteredCars]);

    // Counts for Reconciliation Stats (ĐNX)
    const countAlertThuanAn = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'AT_THUAN_AN').length, [reconcileItems]);
    const countTransitYard = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'AT_TRANSIT_YARD').length, [reconcileItems]);
    const countInTransit = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'IN_TRANSIT').length, [reconcileItems]);

    // Counts for TD4 Stats
    const countTd4ThuanAn = useMemo(() => td4Items.filter(c => c.isTonThuanAn).length, [td4Items]);
    const countTd4Other = useMemo(() => td4Items.filter(c => !c.isTonThuanAn).length, [td4Items]);

    // TVBHs for dropdown (Missing Yard)
    const uniqueMissingYardTvbhs = useMemo(() => {
        const set = new Set<string>();
        missingYardItems.forEach(c => {
            if (c.tvbh) set.add(c.tvbh.trim());
        });
        return Array.from(set).sort();
    }, [missingYardItems]);

    // Models for dropdown (Missing Yard)
    const uniqueMissingYardModels = useMemo(() => {
        const set = new Set<string>();
        missingYardItems.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [missingYardItems]);

    // Filtered cars (Missing Yard)
    const filteredMissingYardItems = useMemo(() => {
        return missingYardItems.filter(c => {
            if (missingYardTvbhFilter !== 'all' && c.tvbh.trim() !== missingYardTvbhFilter) return false;
            if (missingYardModelFilter !== 'all' && c.carModel.trim() !== missingYardModelFilter) return false;

            if (missingYardSearch.trim()) {
                const q = missingYardSearch.toLowerCase().trim();
                const matchVin = c.vin.toLowerCase().includes(q);
                const matchTvbh = c.tvbh.toLowerCase().includes(q);
                const matchKh = c.customerName.toLowerCase().includes(q);
                const matchHd = (c.orderNumber || '').toLowerCase().includes(q) || (c.maHdCyber || '').toLowerCase().includes(q);
                const matchModel = c.carModel.toLowerCase().includes(q);
                const matchKho = c.khoBaiThucTe ? c.khoBaiThucTe.toLowerCase().includes(q) : false;
                if (!matchVin && !matchTvbh && !matchKh && !matchHd && !matchModel && !matchKho) return false;
            }
            return true;
        });
    }, [missingYardItems, missingYardTvbhFilter, missingYardModelFilter, missingYardSearch]);

    // Báo số lượng cho parent
    useEffect(() => {
        if (onCountsChange) {
            onCountsChange({
                carsCount: cars.length,
                td4Count: td4Items.length,
                dnxCount: countAlertThuanAn,
                missingYardCount: missingYardItems.length,
                allAlertCount: countAlertThuanAn + td4Items.length + missingYardItems.length
            });
        }
    }, [cars.length, td4Items.length, countAlertThuanAn, missingYardItems.length, onCountsChange]);

    return (
        <div className="flex-1 flex flex-col min-h-0 w-full bg-[#ECE9D8] rounded border border-[#CCCCCC] shadow-sm overflow-hidden font-sans select-none h-full">

            {/* ========================================================================= */}
            {/* CHẾ ĐỘ 1: TỒN KHO 3 KHO VỆ TINH */}
            {/* ========================================================================= */}
            {viewMode === 'inventory' && (
                <>
                    {/* CYBERSOFT TOOLBAR (Ribbon) */}
                    <div className="bg-[#F0F0F0] border-b border-[#CCCCCC] px-1.5 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-800 shrink-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button 
                                type="button" 
                                onClick={() => handleFetchData(false)}
                                disabled={isLoading}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer disabled:opacity-50"
                                title="Làm mới dữ liệu từ Google Sheets"
                            >
                                <i className={`fas fa-rotate text-blue-600 text-[10px] ${isLoading ? 'animate-spin' : ''}`}></i>
                                <span>Làm mới</span>
                            </button>

                            <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5 hidden sm:block"></div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Kho:</span>
                                <select
                                    value={khoFilter}
                                    onChange={e => setKhoFilter(e.target.value as any)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[135px]"
                                >
                                    <option value="all">Tất cả (3 kho - {cars.length})</option>
                                    <option value="q12">Kho Quận 12 ({cars.filter(c => c.khoKey === 'q12').length})</option>
                                    <option value="ql13">Kho QL 13 ({cars.filter(c => c.khoKey === 'ql13').length})</option>
                                    <option value="tada">Kho Thuận An ({cars.filter(c => c.khoKey === 'tada').length})</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                <select
                                    value={modelFilter}
                                    onChange={e => setModelFilter(e.target.value)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[110px]"
                                >
                                    <option value="all">Tất cả ({cars.length})</option>
                                    {uniqueModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">SR Quản lý:</span>
                                <select
                                    value={showroomFilter}
                                    onChange={e => setShowroomFilter(e.target.value)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[155px]"
                                >
                                    <option value="thuan_an">🟢 Thuận An ({cars.filter(c => c.isThuanAn).length} xe)</option>
                                    <option value="all">Tất cả các showroom ({cars.length})</option>
                                    <option value="other">Showroom khác</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Tình trạng:</span>
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[125px]"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="ton">⚡ Còn tồn bãi ({cars.filter(c => c.isTonKho).length})</option>
                                    <option value="giao">Đã xuất / Giao ({cars.filter(c => !c.isTonKho).length})</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">Tìm:</span>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="VIN, màu, SR, note..."
                                    className="h-5 w-36 sm:w-48 px-1.5 pr-4 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-900 outline-none focus:border-blue-600 shadow-inner"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[9px]"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DATA GRID */}
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {filteredCars.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fas fa-inbox text-3xl mb-2 text-slate-300"></i>
                                <span className="text-xs">
                                    {isLoading ? 'Đang tải dữ liệu từ Google Sheets...' : 'Không có xe nào khớp với điều kiện lọc'}
                                </span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#DDECFE] text-slate-900 sticky top-0 z-10 border-b border-[#9FBCEB] text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1.5 text-center w-8 border-r border-[#B9D5F7]">#</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Kho Bãi</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">SR Quản Lý</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] text-center whitespace-nowrap">Mức Pin</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Số VIN (Số Khung)</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Bên Giao</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Ngày Nhận</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Ngày Giao / Trạng Thái</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] text-center whitespace-nowrap">Tồn (Ngày)</th>
                                        <th className="py-1 px-2 whitespace-nowrap">Ghi Chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredCars.map((car, idx) => {
                                        const isSelected = selectedRowIdx === idx;
                                        const pinPct = car.mucPinPercent;
                                        let pinBadge = 'bg-slate-100 text-slate-700 border-slate-300';
                                        if (pinPct !== null) {
                                            if (pinPct >= 50) pinBadge = 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]';
                                            else if (pinPct >= 25) pinBadge = 'bg-[#FEF7E0] text-[#B06000] border-[#FCE8B2]';
                                            else pinBadge = 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]';
                                        }

                                        return (
                                            <tr
                                                key={car.id}
                                                onClick={() => setSelectedRowIdx(idx)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#CCE8FF] text-slate-900 font-medium' 
                                                        : idx % 2 === 1 
                                                            ? 'bg-[#F9FBFC] hover:bg-[#EBF4FF]' 
                                                            : 'bg-white hover:bg-[#EBF4FF]'
                                                }`}
                                            >
                                                <td className="py-1 px-1.5 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-bold text-slate-800 text-[10.5px]">
                                                        {car.khoName.replace('Kho ', '')}
                                                    </span>
                                                    {car.thangNhap && (
                                                        <span className="text-[9px] text-slate-400 block">
                                                            {car.thangNhap}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className={`px-1 py-0.2 rounded-xs font-semibold text-[10px] border ${
                                                        car.isThuanAn 
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {car.showroomQuanLy || 'Thuận An'}
                                                    </span>
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-bold text-slate-900">{car.loaiXe || '-'}</span>
                                                    {car.mauSac && (
                                                        <span className="text-slate-500 text-[10px] ml-1">
                                                            ({car.mauSac})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 text-center border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className={`inline-block px-1.5 py-0.2 rounded-xs text-[10px] font-bold border font-mono ${pinBadge}`}>
                                                        {car.mucPin}
                                                    </span>
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-[11px] font-bold text-blue-900 group">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{car.soKhung}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyVin(car.soKhung);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === car.soKhung ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap text-slate-600">
                                                    {car.benGiao || '-'}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-slate-700">
                                                    {car.ngayNhan || '-'}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    {car.isTonKho ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] rounded-xs font-semibold text-[10px]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            Còn tồn bãi
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-300 rounded-xs text-[10px]">
                                                            <i className="fas fa-check text-slate-400 text-[9px]"></i>
                                                            Đã giao ({car.ngayGiao})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 text-center border-r border-[#EBEBEB] whitespace-nowrap font-mono font-semibold text-slate-700">
                                                    {car.soNgayTonKho || '-'}
                                                </td>
                                                <td className="py-1 px-2 text-slate-600 max-w-[220px] truncate" title={car.note}>
                                                    {car.note || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (3 Kho) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng: <strong>{filteredCars.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-blue-700 font-bold hidden sm:inline">
                                Dòng: <strong>{filteredCars.length > 0 ? selectedRowIdx + 1 : 0}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-emerald-800 font-bold">
                                Thuận An: <strong className="font-mono text-emerald-900">{countThuanAn}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="px-1 py-0.1 rounded-xs text-[9.5px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                                ⚡ Tồn bãi: {countTonBai}
                            </span>
                            <span className="px-1 py-0.1 rounded-xs text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                Đã giao: {countDaGiao}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={exportCsv}
                                className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-400 rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Xuất file Excel/CSV danh sách xe đang xem"
                            >
                                <i className="fas fa-file-excel text-emerald-600"></i>
                                <span>Xuất Excel</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ========================================================================= */}
            {/* CHẾ ĐỘ 2: TRUNG TÂM ĐỐI CHIẾU & CẢNH BÁO LỆCH KHO (CYBER vs THỰC TẾ)       */}
            {/* Kết hợp logic toàn diện: Đầu Vào (ĐNX Chưa Nhập) & Đầu Ra (TD4 Vi Phạm Tồn) */}
            {/* ========================================================================= */}
            {viewMode === 'reconcile' && (
                <>
                    {/* THANH CÔNG CỤ DUY NHẤT (Single Ribbon Toolbar ~30px) */}
                    <div className="bg-[#F0F0F0] border-b border-[#CCCCCC] px-1.5 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-800 shrink-0">
                        {/* Nhóm Trái: Tab Chuyển Phân Hệ + Bộ Lọc */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Tiêu đề phân hệ hiện tại (Đã chuyển điều hướng sang Sidebar) */}
                            <div className="flex items-center gap-1.5 font-bold text-[11.5px] text-slate-800 pr-1">
                                {reconcileSubTab === 'td4' && (
                                    <>
                                        <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                                        <span>Xe Tồn TD4</span>
                                        <span className="px-1.5 py-0.2 text-[9.5px] rounded-full bg-purple-100 text-purple-800 border border-purple-300 font-mono">
                                            {td4Items.length}
                                        </span>
                                    </>
                                )}
                                {reconcileSubTab === 'dnx' && (
                                    <>
                                        <i className="fa-solid fa-arrow-down-to-bracket text-red-600"></i>
                                        <span>ĐNX Về Bãi Chưa Nhập</span>
                                        <span className="px-1.5 py-0.2 text-[9.5px] rounded-full bg-red-100 text-red-800 border border-red-300 font-mono">
                                            {countAlertThuanAn}
                                        </span>
                                    </>
                                )}
                                {reconcileSubTab === 'missing_yard' && (
                                    <>
                                        <i className="fa-solid fa-file-invoice-dollar text-amber-600"></i>
                                        <span>Xuất HĐ Mất Bãi</span>
                                        <span className="px-1.5 py-0.2 text-[9.5px] rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                                            {missingYardItems.length}
                                        </span>
                                    </>
                                )}
                                {reconcileSubTab === 'all' && (
                                    <>
                                        <i className="fa-solid fa-list-check text-slate-700"></i>
                                        <span>Tổng Hợp Lệch Kho</span>
                                        <span className="px-1.5 py-0.2 text-[9.5px] rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-mono">
                                            {countAlertThuanAn + td4Items.length + missingYardItems.length}
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5 hidden sm:block"></div>

                            {/* Bộ Lọc Tuỳ Biến Theo Phân Hệ Đang Chọn */}
                            {reconcileSubTab === 'td4' && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Bãi tồn:</span>
                                        <select
                                            value={td4YardFilter}
                                            onChange={e => setTd4YardFilter(e.target.value as any)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[145px]"
                                        >
                                            <option value="all">Tất cả ({td4Items.length} xe)</option>
                                            <option value="thuan_an">Bãi Thuận An ({countTd4ThuanAn})</option>
                                            <option value="other">Bãi QL13/Q12 ({countTd4Other})</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">TVBH:</span>
                                        <select
                                            value={td4TvbhFilter}
                                            onChange={e => setTd4TvbhFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                                        >
                                            <option value="all">Tất cả ({uniqueTdTvbhs.length})</option>
                                            {uniqueTdTvbhs.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                        <select
                                            value={td4ModelFilter}
                                            onChange={e => setTd4ModelFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[100px]"
                                        >
                                            <option value="all">Tất cả dòng</option>
                                            {uniqueTdModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {reconcileSubTab === 'dnx' && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Trạng thái:</span>
                                        <select
                                            value={reconcileStatusFilter}
                                            onChange={e => setReconcileStatusFilter(e.target.value as any)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[160px]"
                                        >
                                            <option value="thuan_an">🚨 Đã về Thuận An ({countAlertThuanAn})</option>
                                            <option value="all">Tất cả xe ĐNX ({reconcileItems.length})</option>
                                            <option value="transit_yard">Tại bãi QL13/Q12 ({countTransitYard})</option>
                                            <option value="in_transit">Đang vận chuyển ({countInTransit})</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">TVBH:</span>
                                        <select
                                            value={reconcileTvbhFilter}
                                            onChange={e => setReconcileTvbhFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                                        >
                                            <option value="all">Tất cả ({uniqueReconcileTvbhs.length})</option>
                                            {uniqueReconcileTvbhs.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                        <select
                                            value={reconcileModelFilter}
                                            onChange={e => setReconcileModelFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[100px]"
                                        >
                                            <option value="all">Tất cả dòng</option>
                                            {uniqueReconcileModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {reconcileSubTab === 'missing_yard' && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">TVBH:</span>
                                        <select
                                            value={missingYardTvbhFilter}
                                            onChange={e => setMissingYardTvbhFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                                        >
                                            <option value="all">Tất cả ({uniqueMissingYardTvbhs.length})</option>
                                            {uniqueMissingYardTvbhs.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                        <select
                                            value={missingYardModelFilter}
                                            onChange={e => setMissingYardModelFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[100px]"
                                        >
                                            <option value="all">Tất cả dòng</option>
                                            {uniqueMissingYardModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {reconcileSubTab === 'all' && (
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Lọc loại:</span>
                                    <select
                                        value={allAlertFilter}
                                        onChange={e => setAllAlertFilter(e.target.value as any)}
                                        className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[170px]"
                                    >
                                        <option value="all">Tất cả ({allCombinedAlerts.length})</option>
                                        <option value="td4">🚨 Chỉ TD4 vi phạm ({td4Items.length})</option>
                                        <option value="dnx">📥 Chỉ ĐNX chưa nhập ({reconcileItems.length})</option>
                                        <option value="missing_yard">⚠️ Chỉ Xuất HĐ mất bãi ({missingYardItems.length})</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Nhóm Phải: Ô Tìm Kiếm + Cụm Nút Hành Động */}
                        <div className="flex items-center gap-1.5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={
                                        reconcileSubTab === 'td4' ? td4Search :
                                        reconcileSubTab === 'dnx' ? reconcileSearch :
                                        reconcileSubTab === 'missing_yard' ? missingYardSearch : allAlertSearch
                                    }
                                    onChange={e => {
                                        if (reconcileSubTab === 'td4') setTd4Search(e.target.value);
                                        else if (reconcileSubTab === 'dnx') setReconcileSearch(e.target.value);
                                        else if (reconcileSubTab === 'missing_yard') setMissingYardSearch(e.target.value);
                                        else setAllAlertSearch(e.target.value);
                                    }}
                                    placeholder="Tìm VIN, số phiếu, TVBH, KH..."
                                    className="h-5 w-36 sm:w-48 px-1.5 pr-4 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-900 outline-none focus:border-blue-600 shadow-inner"
                                />
                                {(reconcileSubTab === 'td4' ? td4Search : reconcileSubTab === 'dnx' ? reconcileSearch : reconcileSubTab === 'missing_yard' ? missingYardSearch : allAlertSearch) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (reconcileSubTab === 'td4') setTd4Search('');
                                            else if (reconcileSubTab === 'dnx') setReconcileSearch('');
                                            else if (reconcileSubTab === 'missing_yard') setMissingYardSearch('');
                                            else setAllAlertSearch('');
                                        }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[9px]"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <button 
                                type="button" 
                                onClick={handleFetchAllReconcile}
                                disabled={isLoadingReconcile || isLoadingTd4 || isLoadingMissingYard}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer disabled:opacity-50 text-[10px] sm:text-[11px]"
                                title="Nạp lại dữ liệu"
                            >
                                <i className={`fas fa-rotate text-blue-600 text-[10px] ${isLoadingReconcile || isLoadingTd4 || isLoadingMissingYard ? 'animate-spin' : ''}`}></i>
                                <span className="hidden sm:inline">Làm mới</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (reconcileSubTab === 'td4') handleCopyZaloTd4List();
                                    else if (reconcileSubTab === 'dnx') handleCopyZaloDnxList();
                                    else if (reconcileSubTab === 'missing_yard') handleCopyZaloMissingYardList();
                                    else handleCopyZaloAllReconcile();
                                }}
                                className={`px-2 py-0.5 text-white rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer ${
                                    reconcileSubTab === 'td4' ? 'bg-purple-700 hover:bg-purple-800' : reconcileSubTab === 'dnx' ? 'bg-red-600 hover:bg-red-700' : reconcileSubTab === 'missing_yard' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                title="Sao chép nội dung gửi nhóm Zalo"
                            >
                                <i className="fa-solid fa-copy"></i>
                                <span>Copy Zalo</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (reconcileSubTab === 'td4') exportTd4Csv();
                                    else if (reconcileSubTab === 'dnx') exportReconcileCsv();
                                    else if (reconcileSubTab === 'missing_yard') exportMissingYardCsv();
                                    else exportAllAlertsCsv();
                                }}
                                className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-400 rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Xuất file Excel"
                            >
                                <i className="fas fa-file-excel text-emerald-600"></i>
                                <span>Xuất Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* SUB-VIEW 1: BẢNG TỔNG HỢP TOÀN BỘ SAI LỆCH */}
                    {reconcileSubTab === 'all' && (
                        <>

                            {/* BẢNG DỮ LIỆU TỔNG HỢP */}
                            <div className="flex-1 overflow-auto bg-white relative">
                                {isLoadingReconcile || isLoadingTd4 ? (
                                    <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                                        <i className="fas fa-rotate animate-spin text-2xl text-blue-600"></i>
                                        <span className="text-xs">Đang đối soát dữ liệu CyberSoft và các bãi xe...</span>
                                    </div>
                                ) : filteredAllAlerts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2"></i>
                                        <div className="text-sm font-bold text-slate-700">Tuyệt vời! Không có sai lệch kho nào.</div>
                                        <div className="text-xs text-slate-500 mt-1">Toàn bộ dữ liệu chứng từ trên CyberSoft và bãi thực tế đều khớp nhau.</div>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse text-[11px] font-sans">
                                        <thead className="bg-[#EBEADB] text-slate-700 sticky top-0 z-10 select-none border-b border-[#CCCCCC] text-[10px] sm:text-[11px]">
                                            <tr>
                                                <th className="p-1 border-r border-[#CCCCCC] w-8 text-center font-bold">STT</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold text-center w-32">PHÂN LOẠI LỆCH</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold w-36">SỐ KHUNG (VIN)</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold w-28">DÒNG XE & MÀU</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold w-28">CHỨNG TỪ</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold w-28">TVBH</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold w-32">KHÁCH HÀNG / HĐ</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold w-36">TRẠNG THÁI CYBER</th>
                                                <th className="p-1 border-r border-[#CCCCCC] font-bold w-36">BÃI THỰC TẾ & PIN</th>
                                                <th className="p-1 font-bold">TÌNH TRẠNG & YÊU CẦU XỬ LÝ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filteredAllAlerts.map((c, idx) => {
                                                const isSelected = selectedAllRowIdx === idx;
                                                const isDnx = c.type === 'DNX';
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        onClick={() => setSelectedAllRowIdx(idx)}
                                                        onDoubleClick={() => copyVin(c.vin)}
                                                        className={`hover:bg-blue-50/70 transition-colors cursor-pointer ${
                                                            isSelected ? 'bg-blue-100/90 font-medium' : idx % 2 === 1 ? 'bg-[#F9F9F6]' : 'bg-white'
                                                        }`}
                                                    >
                                                        <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 text-center whitespace-nowrap">
                                                            {isDnx ? (
                                                                <span className="px-1.5 py-0.2 text-[9px] bg-red-100 text-red-700 font-extrabold rounded border border-red-300 shadow-2xs">
                                                                    📥 ĐNX CHỜ NHẬP
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.2 text-[9px] bg-purple-100 text-purple-900 font-extrabold rounded border border-purple-300 shadow-2xs animate-pulse">
                                                                    🚨 TD4 TỒN BÃI
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span>{c.vin}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); copyVin(c.vin); }}
                                                                    className="text-slate-400 hover:text-blue-600 text-[10px] p-0.5"
                                                                    title="Copy số khung"
                                                                >
                                                                    <i className={`fa-regular ${copiedVin === c.vin ? 'fa-check text-green-600' : 'fa-copy'}`}></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 whitespace-nowrap">
                                                            <div className="font-semibold text-slate-800">{c.carModel}</div>
                                                            <div className="text-[9.5px] text-slate-500">{c.color || '-'}</div>
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 font-mono text-[10px] whitespace-nowrap">
                                                            <div className="font-bold text-blue-700">{c.soChungTu}</div>
                                                            <div className="text-[9px] text-slate-500">{formatDate(c.ngayChungTu)}</div>
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap truncate max-w-[110px]" title={c.tvbh}>
                                                            {c.tvbh}
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 whitespace-nowrap truncate max-w-[130px]">
                                                            <div className="font-semibold text-slate-900 truncate" title={c.customerName}>{c.customerName}</div>
                                                            {c.orderNumber && <div className="text-[9px] text-slate-500 font-mono">HĐ: {c.orderNumber}</div>}
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 text-[10px]">
                                                            <div className="font-semibold text-slate-800 truncate" title={c.khoCyber}>{c.khoCyber}</div>
                                                        </td>
                                                        <td className="p-1 border-r border-slate-200 text-[10px] whitespace-nowrap">
                                                            <div className="font-bold text-slate-900">{c.khoThucTe}</div>
                                                            <div className="text-[9.5px] text-slate-600">
                                                                Pin: <strong className="text-blue-700">{c.mucPin}</strong> {c.ngayNhanBai ? `| Về: ${formatDate(c.ngayNhanBai)}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="p-1 text-[10.5px]">
                                                            <div className={`font-bold ${isDnx ? 'text-red-700' : 'text-purple-900'}`}>
                                                                {c.alertTitle}
                                                            </div>
                                                            <div className="text-[9.5px] text-slate-600">
                                                                👉 {c.actionRequired}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* STATUS BAR CHO BẢNG TỔNG HỢP */}
                            <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                                <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                                    <span className="font-bold">
                                        Tổng sai lệch: <strong className="text-red-700 font-mono">{filteredAllAlerts.length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-red-700 font-bold">
                                        ĐNX chưa nhập K83: <strong className="font-mono">{countAlertThuanAn}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-purple-800 font-bold">
                                        TD4 vi phạm tồn bãi: <strong className="font-mono">{td4Items.length}</strong> xe
                                    </span>
                                </div>
                                <div className="text-slate-500 text-[10px] italic">
                                    * Chọn dòng hoặc nhấp đúp để sao chép số khung. Bấm vào các thẻ chỉ số trên để lọc riêng từng phân hệ.
                                </div>
                            </div>
                        </>
                    )}

                    {/* SUB-VIEW 2: CHI TIẾT ĐỐI CHIẾU ĐNX XUẤT ĐIỀU CHUYỂN */}
                    {reconcileSubTab === 'dnx' && (
                        <>
                            {/* DATA GRID */}
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {filteredReconcileItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fa-solid fa-clipboard-check text-4xl mb-2 text-emerald-400"></i>
                                <span className="text-xs font-semibold text-slate-600">
                                    {isLoadingReconcile ? 'Đang phân tích và đối chiếu dữ liệu...' : 'Không có xe nào khớp điều kiện đối chiếu'}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    Tất cả các xe ĐNX đã được nhập kho Cyber hoặc không có dữ liệu trùng khớp.
                                </span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#DDECFE] text-slate-900 sticky top-0 z-10 border-b border-[#9FBCEB] text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1 text-center w-7 border-r border-[#B9D5F7]">#</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Số VIN (Số Khung)</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Phiếu ĐNX & Ngày Lập</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">TVBH Phụ Trách</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Khách Hàng / Hợp Đồng</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Kho Xuất ➔ Kho Nhập</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] text-center whitespace-nowrap">Tồn Cyber (K83)</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] whitespace-nowrap">Vị Trí Thực Tế (Bãi Ngoài)</th>
                                        <th className="py-1 px-2 whitespace-nowrap min-w-[280px]">KẾT QUẢ ĐỐI CHIẾU & CẢNH BÁO (GHI CHÚ)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredReconcileItems.map((item, idx) => {
                                        const isSelected = selectedReconcileRowIdx === idx;
                                        const isThuanAnAlert = item.reconcileStatus === 'AT_THUAN_AN';
                                        const isTransitYard = item.reconcileStatus === 'AT_TRANSIT_YARD';
                                        const sat = item.satelliteYard;

                                        return (
                                            <tr
                                                key={item.id || item.vin}
                                                onClick={() => setSelectedReconcileRowIdx(idx)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#CCE8FF] text-slate-900 font-medium' 
                                                        : isThuanAnAlert
                                                            ? 'bg-[#FFF9E6] hover:bg-[#FFF0B3]'
                                                            : idx % 2 === 1 
                                                                ? 'bg-[#F9FBFC] hover:bg-[#EBF4FF]' 
                                                                : 'bg-white hover:bg-[#EBF4FF]'
                                                }`}
                                            >
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-[11px] font-bold text-blue-900 group">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{item.vin}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyVin(item.vin);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === item.vin ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 py-0.2 rounded border border-slate-300 text-[10.5px]">
                                                        {item.soCtDnx || 'DNX'}
                                                    </span>
                                                    {item.ngayCtDnx && (
                                                        <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                                                            {item.ngayCtDnx.slice(0, 10)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-bold text-slate-900">
                                                        {item.tvbh || <span className="text-slate-400 italic">Chưa gán</span>}
                                                    </span>
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800">
                                                        {item.customerName || '-'}
                                                    </div>
                                                    {item.orderNumber && (
                                                        <div className="text-[9.5px] text-slate-500 font-mono">
                                                            HĐ: {item.orderNumber}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-bold text-slate-900">{item.carModel || '-'}</span>
                                                    {item.color && (
                                                        <span className="text-slate-500 text-[10px] ml-1">
                                                            ({item.color})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-[10px]">
                                                    <span className="text-slate-600 font-semibold">{item.khoXuat || 'K87'}</span>
                                                    <span className="text-slate-400 mx-1">➔</span>
                                                    <span className="text-blue-700 font-bold">{item.khoNhan || 'K83'}</span>
                                                </td>
                                                <td className="py-1 px-2 text-center border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-red-50 text-red-700 border border-red-200 rounded-xs font-bold text-[9.5px]">
                                                        <i className="fa-solid fa-xmark text-red-500 text-[8px]"></i>
                                                        Chưa nhập K83
                                                    </span>
                                                    <div className="text-[9px] text-slate-400 truncate max-w-[110px]" title={item.tenKhoCyber || item.maKhoCyber}>
                                                        Cyber: {item.tenKhoCyber || item.maKhoCyber || 'Đang vận tải'}
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    {sat && sat.isTonKho ? (
                                                        <div>
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs font-bold text-[10px] border ${
                                                                sat.khoKey === 'tada' 
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                                            }`}>
                                                                <i className="fa-solid fa-location-dot"></i>
                                                                {sat.khoName}
                                                            </span>
                                                            <div className="text-[9.5px] text-slate-600 font-mono mt-0.5 flex items-center gap-1.5">
                                                                {sat.ngayNhan && <span>Nhận: {sat.ngayNhan.slice(0, 10)}</span>}
                                                                {sat.mucPin && sat.mucPin !== '-' && (
                                                                    <span className="font-bold text-blue-700">Pin: {sat.mucPin}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-[10px] italic">
                                                            <i className="fa-solid fa-truck text-slate-300 mr-1"></i>
                                                            Đang trên đường
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 whitespace-nowrap">
                                                    {isThuanAnAlert ? (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-100 text-red-800 border-2 border-red-500 rounded font-bold text-[10.5px] shadow-2xs">
                                                            <i className="fa-solid fa-bell text-red-600 text-[11px] animate-bounce"></i>
                                                            <span>
                                                                XE ĐÃ VỀ BÃI THUẬN AN — TVBH ({item.tvbh || 'Chưa rõ'}) CHƯA BÁO NHẬP KHO CYBER!
                                                            </span>
                                                        </div>
                                                    ) : isTransitYard ? (
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded font-semibold text-[10px]">
                                                            <i className="fa-solid fa-truck text-amber-600 text-[9.5px]"></i>
                                                            <span>
                                                                Xe còn tại bãi {sat?.khoName || 'trung chuyển'} — Chưa chuyển về bãi Thuận An
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-[10px]">
                                                            <i className="fa-solid fa-route text-slate-400 text-[9.5px]"></i>
                                                            <span>
                                                                Đang trên đường vận chuyển (chưa về bãi thực tế)
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (ĐNX) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng đối chiếu: <strong>{filteredReconcileItems.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-red-700 font-bold">
                                🚨 Về bãi Thuận An (Chưa nhập Cyber): <strong className="font-mono text-red-800">{countAlertThuanAn}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-amber-800 font-bold hidden sm:inline">
                                🚚 Bãi QL13/Q12: <strong className="font-mono">{countTransitYard}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-blue-800 font-bold hidden sm:inline">
                                ⏳ Trên đường: <strong className="font-mono">{countInTransit}</strong>
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={exportReconcileCsv}
                                className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-400 rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Xuất file Excel/CSV kết quả đối chiếu ĐNX"
                            >
                                <i className="fas fa-file-excel text-emerald-600"></i>
                                <span>Xuất Excel Đối Chiếu</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

                    {/* SUB-VIEW 3: CHI TIẾT CẢNH BÁO XE TỒN TD4 (XE ĐÃ GIAO NHƯNG VẪN CÒN TỒN BÃI) */}
                    {reconcileSubTab === 'td4' && (
                        <>
                            {/* TD4 DATA GRID */}
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {filteredTd4Items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fa-solid fa-circle-check text-4xl mb-2 text-emerald-500"></i>
                                <span className="text-xs font-bold text-slate-700">
                                    Tuyệt vời! Không có xe nào vi phạm tồn kho TD4.
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    Tất cả các xe đã lập phiếu TD4 đều đã xuất giao xe đúng quy chuẩn.
                                </span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#FBEAEB] text-slate-900 sticky top-0 z-10 border-b border-red-300 text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1 text-center w-7 border-r border-red-200">#</th>
                                        <th className="py-1 px-2 border-r border-red-200 whitespace-nowrap">Số VIN (Số Khung)</th>
                                        <th className="py-1 px-2 border-r border-red-200 whitespace-nowrap">Số Phiếu TD4 & Ngày Lập</th>
                                        <th className="py-1 px-2 border-r border-red-200 whitespace-nowrap">TVBH Phụ Trách</th>
                                        <th className="py-1 px-2 border-r border-red-200 whitespace-nowrap">Khách Hàng / Hợp Đồng</th>
                                        <th className="py-1 px-2 border-r border-red-200 whitespace-nowrap">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-red-200 whitespace-nowrap">Vị Trí Bãi Đang Tồn</th>
                                        <th className="py-1 px-2 border-r border-red-200 text-center whitespace-nowrap">Mức Pin</th>
                                        <th className="py-1 px-2 border-r border-red-200 whitespace-nowrap">Ngày Nhận Bãi</th>
                                        <th className="py-1 px-2 whitespace-nowrap min-w-[300px]">CẢNH BÁO VI PHẠM TỒN KHO TD4</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredTd4Items.map((item, idx) => {
                                        const isSelected = selectedTd4RowIdx === idx;
                                        const sat = item.satelliteYard;

                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => setSelectedTd4RowIdx(idx)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#CCE8FF] text-slate-900 font-medium' 
                                                        : item.isTonThuanAn
                                                            ? 'bg-[#FFF2F2] hover:bg-[#FFE5E5]'
                                                            : idx % 2 === 1 
                                                                ? 'bg-[#F9FBFC] hover:bg-[#EBF4FF]' 
                                                                : 'bg-white hover:bg-[#EBF4FF]'
                                                }`}
                                            >
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>

                                                {/* VIN */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-[11px] font-bold text-blue-900 group">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{item.vin}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyVin(item.vin);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === item.vin ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Phiếu TD4 & Ngày Lập */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-mono font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-300 text-[10.5px]">
                                                        {item.soCtTd4}
                                                    </span>
                                                    {item.ngayCtTd4 && (
                                                        <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                                                            {item.ngayCtTd4.slice(0, 10)}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* TVBH Phụ Trách */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-bold text-slate-900">
                                                        {item.tvbh || <span className="text-slate-400 italic">Chưa gán</span>}
                                                    </span>
                                                </td>

                                                {/* Khách Hàng / Hợp Đồng */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800">
                                                        {item.customerName || '-'}
                                                    </div>
                                                    {item.orderNumber && (
                                                        <div className="text-[9.5px] text-slate-500 font-mono">
                                                            HĐ: {item.orderNumber}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Dòng Xe & Màu */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-bold text-slate-900">{item.carModel || '-'}</span>
                                                    {item.color && (
                                                        <span className="text-slate-500 text-[10px] ml-1">
                                                            ({item.color})
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Vị Trí Bãi Đang Tồn */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs font-bold text-[10px] border ${
                                                        item.isTonThuanAn 
                                                            ? 'bg-red-50 text-red-800 border-red-300' 
                                                            : 'bg-amber-50 text-amber-800 border-amber-300'
                                                    }`}>
                                                        <i className="fa-solid fa-location-dot"></i>
                                                        {sat.khoName}
                                                    </span>
                                                    {sat.tinhTrang && (
                                                        <div className="text-[9.5px] text-slate-500 truncate max-w-[120px]" title={sat.tinhTrang}>
                                                            {sat.tinhTrang}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Mức Pin */}
                                                <td className="py-1 px-2 text-center border-r border-[#EBEBEB] whitespace-nowrap font-mono font-bold text-blue-800">
                                                    {sat.pin}
                                                </td>

                                                {/* Ngày Nhận Bãi */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-slate-600">
                                                    {sat.ngayNhan.slice(0, 10) || '-'}
                                                </td>

                                                {/* CẢNH BÁO VI PHẠM */}
                                                <td className="py-1 px-2 whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-900 border border-red-500 rounded font-bold text-[10px] shadow-2xs">
                                                        <i className="fa-solid fa-triangle-exclamation text-red-600 text-[11px] animate-bounce"></i>
                                                        <span>
                                                            VI PHẠM: ĐÃ CÓ PHIẾU GIAO XE TD4 NHƯNG VẪN CÒN TỒN BÃI THỰC TẾ!
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (TD4) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng vi phạm: <strong className="text-red-700">{filteredTd4Items.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-red-700 font-bold">
                                Bãi Thuận An: <strong className="font-mono">{countTd4ThuanAn}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-purple-800 font-bold hidden sm:inline">
                                Bãi QL13/Q12: <strong className="font-mono">{countTd4Other}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-slate-500 text-[10px] italic">
                                * TD4 có nghĩa là đã giao xe, không được phép tồn ở đâu hết.
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={exportTd4Csv}
                                className="px-2 py-0.5 bg-white hover:bg-red-50 text-red-800 border border-red-400 rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Xuất file Excel danh sách xe vi phạm tồn TD4"
                            >
                                <i className="fas fa-file-excel text-red-600"></i>
                                <span>Xuất Excel TD4</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* SUB-VIEW 4: CHI TIẾT CẢNH BÁO XE XUẤT HÓA ĐƠN — CHƯA TD4 MẤT TỒN BÃI THỰC TẾ */}
            {reconcileSubTab === 'missing_yard' && (
                <>
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {isLoadingMissingYard ? (
                            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                                <i className="fas fa-rotate animate-spin text-2xl text-amber-600"></i>
                                <span className="text-xs">Đang kiểm tra dữ liệu hóa đơn và bãi xe thực tế...</span>
                            </div>
                        ) : filteredMissingYardItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fa-solid fa-circle-check text-4xl mb-2 text-emerald-500"></i>
                                <span className="text-xs font-bold text-slate-700">
                                    Tuyệt vời! Không có xe nào xuất HĐ mà mất tồn bãi.
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    Tất cả các xe đã xuất hóa đơn nhưng chưa giao đều còn lưu tại bãi xe.
                                </span>
                            </div>
                        ) : (
                            <table className="w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#FFF8E1] text-slate-900 sticky top-0 z-10 border-b border-amber-300 text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1 text-center w-7 border-r border-amber-200">#</th>
                                        <th className="py-1 px-2 border-r border-amber-200 whitespace-nowrap">Số VIN (Số Khung)</th>
                                        <th className="py-1 px-2 border-r border-amber-200 whitespace-nowrap">Số HĐ & Ngày Xuất</th>
                                        <th className="py-1 px-2 border-r border-amber-200 whitespace-nowrap">TVBH Phụ Trách</th>
                                        <th className="py-1 px-2 border-r border-amber-200 whitespace-nowrap">Khách Hàng</th>
                                        <th className="py-1 px-2 border-r border-amber-200 whitespace-nowrap">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-amber-200 whitespace-nowrap">Kho Cyber Lưu Trữ</th>
                                        <th className="py-1 px-2 border-r border-amber-200 whitespace-nowrap">Tình Trạng Bãi Ngoài</th>
                                        <th className="py-1 px-2 whitespace-nowrap min-w-[300px]">CẢNH BÁO NGUY CƠ & YÊU CẦU XỬ LÝ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredMissingYardItems.map((item, idx) => {
                                        const isSelected = selectedMissingYardRowIdx === idx;
                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => setSelectedMissingYardRowIdx(idx)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#CCE8FF] text-slate-900 font-medium' 
                                                        : 'bg-[#FFFDF5] hover:bg-[#FFF8E1]'
                                                }`}
                                            >
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-[11px] font-bold text-blue-900 group">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{item.vin}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); copyVin(item.vin); }}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === item.vin ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <div className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300 text-[10.5px] inline-block">
                                                        {item.maHdCyber || item.orderNumber || 'Đã XHĐ'}
                                                    </div>
                                                    {item.ngayXuatHoaDon && (
                                                        <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                                                            {item.ngayXuatHoaDon.slice(0, 10)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-bold text-slate-900">
                                                    {item.tvbh || <span className="text-slate-400 italic">Chưa rõ</span>}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800">{item.customerName || '-'}</div>
                                                    {item.orderNumber && (
                                                        <div className="text-[9.5px] text-slate-500 font-mono">HĐ: {item.orderNumber}</div>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="font-bold text-slate-900">{item.carModel || '-'}</span>
                                                    {item.color && (
                                                        <span className="text-slate-500 text-[10px] ml-1">({item.color})</span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap font-mono text-[10.5px]">
                                                    <span className="font-bold text-slate-800">{item.tenKhoCyber || item.maKhoCyber || 'Cyber'}</span>
                                                    {item.maKhoCyber && (
                                                        <span className="text-slate-400 text-[9.5px] block">Mã: {item.maKhoCyber}</span>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs font-bold text-[10px] bg-rose-50 text-rose-800 border border-rose-300">
                                                        <i className="fa-solid fa-triangle-exclamation text-rose-600"></i>
                                                        {item.satelliteStatusLabel}
                                                    </span>
                                                    {item.ngayXuatBaiThucTe && (
                                                        <div className="text-[9.5px] text-slate-500 mt-0.5">
                                                            Xuất bãi: {item.ngayXuatBaiThucTe.slice(0, 10)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-1 px-2 whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-400 rounded font-bold text-[10px] shadow-2xs">
                                                        <i className="fa-solid fa-bell text-amber-600 text-[11px] animate-bounce"></i>
                                                        <span>{item.warningNote}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (Missing Yard) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng cảnh báo: <strong className="text-amber-800">{filteredMissingYardItems.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-slate-600 text-[10.5px]">
                                * Xe đã xuất hóa đơn nhưng chưa có phiếu giao xe TD4 mà mất tồn bãi thực tế.
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                            <button
                                type="button"
                                onClick={exportMissingYardCsv}
                                className="px-2 py-0.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-400 rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Xuất file Excel"
                            >
                                <i className="fas fa-file-excel text-amber-600"></i>
                                <span>Xuất Excel</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
                </>
            )}
        </div>
    );
};

export default SatelliteWarehousesView;
