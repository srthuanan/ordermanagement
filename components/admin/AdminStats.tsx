import React, { useMemo, useState, useRef } from 'react';
import { Order } from '../../types';
import moment from 'moment';
import html2canvas from 'html2canvas';

interface AdminStatsProps {
    xuathoadonData: Order[];
    pendingData: Order[];
    pairedData: Order[];
}

const AdminStats: React.FC<AdminStatsProps> = ({ xuathoadonData, pendingData, pairedData }) => {
    // Modal State
    const [detailModal, setDetailModal] = useState<{
        isOpen: boolean;
        title: string;
        data: Order[];
        showDaysColumn?: boolean;
        isMatchedView?: boolean;
    }>({
        isOpen: false,
        title: '',
        data: [],
        showDaysColumn: false,
        isMatchedView: true
    });

    const tableRef = useRef<HTMLDivElement>(null);
    const [isCopying, setIsCopying] = useState(false);

    const handleCopyImage = async () => {
        if (!tableRef.current) return;
        setIsCopying(true);
        try {
            const canvas = await html2canvas(tableRef.current, {
                scale: 2, // Tăng chất lượng ảnh
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({
                                'image/png': blob
                            })
                        ]);
                        alert('Đã copy hình ảnh bảng thành công!');
                    } catch (err) {
                        console.warn('Không thể copy ảnh vào clipboard, chuyển sang tải xuống:', err);
                        // Fallback: Tự động tải ảnh xuống
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Bang_Ghep_Xe_${moment().format('DD_MM_YYYY_HHmm')}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                        alert('Trình duyệt không hỗ trợ copy trực tiếp. Đã tự động TẢI ẢNH XUỐNG máy tính thay thế!');
                    }
                }
            }, 'image/png');
        } catch (error) {
            console.error('Lỗi khi tạo ảnh:', error);
            alert('Có lỗi xảy ra khi tạo ảnh.');
        } finally {
            setIsCopying(false);
        }
    };

    // 1. Thống kê Số lượng Yêu cầu Xuất hóa đơn (XHĐ) 
    const tvbhInvoiceStats = useMemo(() => {
        const stats: Record<string, Record<string, number> & { total: number }> = {};

        const currentInvoices = xuathoadonData || [];

        currentInvoices.forEach(order => {
            const tvbhNameRaw = order['Tên tư vấn bán hàng'] || order['Người YC'] || order['Tư vấn bán hàng'] || 'Không rõ';
            // Chuẩn hóa tên giống SoldCarsView
            const tvbh = String(tvbhNameRaw).normalize("NFC").trim().toLowerCase().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            const model = order['Dòng xe'] || 'Khác';

            if (!stats[tvbh]) stats[tvbh] = { total: 0 };
            stats[tvbh][model] = (stats[tvbh][model] || 0) + 1;
            stats[tvbh].total += 1;
        });

        return stats;
    }, [xuathoadonData]);

    // Lọc ra các Dòng xe thực sự có yêu cầu XHĐ > 0 trong tháng này
    const invoiceModels = useMemo(() => {
        const models = new Set<string>();
        Object.values(tvbhInvoiceStats).forEach(tvbhModels => {
            Object.entries(tvbhModels).forEach(([m, count]) => {
                if (m !== 'total' && typeof count === 'number' && count > 0) {
                    models.add(m);
                }
            });
        });
        return Array.from(models).sort();
    }, [tvbhInvoiceStats]);

    // 2. Thống kê ghép xe TIẾP CẬN TRỰC TIẾP TỪ TAB GHÉP XE
    const currentMonthStats = useMemo(() => {
        const stats: Record<string, { matched: number, unmatched: number }> = {};

        // Lấy số lượng từ "Chờ Ghép"
        pendingData.forEach(order => {
            const model = order['Dòng xe'] || 'Khác';
            if (!stats[model]) stats[model] = { matched: 0, unmatched: 0 };
            stats[model].unmatched++;
        });

        // Lấy số lượng từ "Đã Ghép"
        pairedData.forEach(order => {
            const model = order['Dòng xe'] || 'Khác';
            if (!stats[model]) stats[model] = { matched: 0, unmatched: 0 };
            stats[model].matched++;
        });

        return stats;
    }, [pendingData, pairedData]);

    // Lọc ra các Dòng xe thực sự có (Ghép + Chưa ghép) > 0 trong tháng này
    const matchingModels = useMemo(() => {
        return Object.keys(currentMonthStats)
            .filter(model => (currentMonthStats[model].matched + currentMonthStats[model].unmatched) > 0)
            .sort();
    }, [currentMonthStats]);

    // Click handlers
    const showInvoiceDetails = (tvbh?: string, model?: string) => {
        const filtered = xuathoadonData.filter(order => {
            const tvbhNameRaw = order['Tên tư vấn bán hàng'] || order['Người YC'] || order['Tư vấn bán hàng'] || 'Không rõ';
            const orderTvbh = String(tvbhNameRaw).normalize("NFC").trim().toLowerCase().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            const orderModel = order['Dòng xe'] || 'Khác';

            if (tvbh && model) return orderTvbh === tvbh && orderModel === model;
            if (tvbh) return orderTvbh === tvbh;
            if (model) return orderModel === model;
            return true;
        });

        setDetailModal({
            isOpen: true,
            title: `Chi tiết XHĐ: ${tvbh || 'Tất cả'} - ${model || 'Tất cả'}`,
            data: filtered
        });
    };

    const showMatchingDetails = (model: string | null, type: 'matched' | 'unmatched' | 'total' | 'total_all' | 'unmatched_all') => {
        let filtered: Order[] = [];
        if (type === 'total_all') {
            // Tất cả đã ghép, mọi dòng xe
            filtered = [...pairedData];
        } else if (type === 'unmatched_all') {
            // Tất cả chờ ghép, mọi dòng xe
            filtered = [...pendingData];
        } else if (type === 'matched') {
            filtered = pairedData.filter(o => (o['Dòng xe'] || 'Khác') === model);
        } else if (type === 'unmatched') {
            filtered = pendingData.filter(o => (o['Dòng xe'] || 'Khác') === model);
        } else {
            filtered = [...pairedData, ...pendingData].filter(o => (o['Dòng xe'] || 'Khác') === model);
        }

        // Sort: đã ghép lâu nhất lên đầu
        filtered.sort((a, b) => {
            const dA = a['Thời gian ghép'] ? moment(a['Thời gian ghép']).valueOf() : 0;
            const dB = b['Thời gian ghép'] ? moment(b['Thời gian ghép']).valueOf() : 0;
            return dA - dB; // lâu nhất (nhỏ nhất) lên đầu
        });

        const titleMap: Record<string, string> = {
            'total_all': 'Tất Cả Đơn Đã Ghép',
            'unmatched_all': 'Tất Cả Đơn Chờ Ghép',
            'matched': `Đã Ghép — ${model}`,
            'unmatched': `Chờ Ghép — ${model}`,
            'total': `Tổng — ${model}`,
        };

        setDetailModal({
            isOpen: true,
            title: `Chi tiết Ghép xe: ${titleMap[type] ?? model}`,
            data: filtered,
            showDaysColumn: type === 'matched' || type === 'total_all',
            isMatchedView: type === 'matched' || type === 'total_all'
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden relative">
            <div className="flex-1 overflow-auto p-4 md:p-5 custom-scrollbar">

                {/* 5:5 Grid Layout for Desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full lg:min-h-0">

                    {/* SECTION 1: TVBH INVOICE STATS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
                        <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <i className="fas fa-file-invoice-dollar text-sm"></i>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight">XUẤT HÓA ĐƠN THEO TVBH</h3>
                            </div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest bg-slate-50 px-2 py-1 rounded">Tất cả</span>
                        </div>

                        <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[480px]">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-slate-50">
                                        <th className="sticky left-0 z-30 bg-slate-50 px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200">Tư Vấn</th>
                                        {invoiceModels.map(model => (
                                            <th key={model} className="px-2 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200 text-center">{model}</th>
                                        ))}
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider border border-slate-200 text-center bg-blue-50/40">Tổng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(tvbhInvoiceStats).length > 0 ? (
                                        Object.entries(tvbhInvoiceStats).sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0])).map(([tvbh, models]) => (
                                            <tr key={tvbh} className="hover:bg-blue-50/20 transition-colors group">
                                                <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 shadow-[1px_0_3px_-1px_rgba(0,0,0,0.05)] whitespace-nowrap overflow-hidden text-ellipsis">
                                                    <button onClick={() => showInvoiceDetails(tvbh)} className="hover:text-blue-600 transition-colors">{tvbh}</button>
                                                </td>
                                                {invoiceModels.map(model => {
                                                    const count = models[model] || 0;
                                                    return (
                                                        <td key={model} className={`px-2 py-2 text-xs text-center font-medium border border-slate-100 ${count > 0 ? 'text-slate-900 font-bold bg-emerald-50/5' : 'text-slate-300'}`}>
                                                            {count > 0 ? (
                                                                <button onClick={() => showInvoiceDetails(tvbh, model)} className="w-full h-full hover:text-blue-600 hover:scale-110 transition-all">
                                                                    {count}
                                                                </button>
                                                            ) : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-2 text-xs font-black text-blue-600 text-center bg-blue-50/10 border border-slate-200">
                                                    <button onClick={() => showInvoiceDetails(tvbh)} className="hover:scale-110 transition-transform">{models.total}</button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={invoiceModels.length + 2} className="px-5 py-12 text-center text-slate-400 italic text-xs border border-slate-200">Chưa có yêu cầu XHĐ</td>
                                        </tr>
                                    )}
                                </tbody>
                                {Object.entries(tvbhInvoiceStats).length > 0 && (
                                    <tfoot className="sticky bottom-0 z-30 bg-slate-100">
                                        <tr>
                                            <td className="sticky left-0 z-30 bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-800 border border-slate-200 text-center">TỔNG</td>
                                            {invoiceModels.map(model => {
                                                const modelTotal = Object.values(tvbhInvoiceStats).reduce((sum, stats) => sum + (stats[model] || 0), 0);
                                                return (
                                                    <td key={model} className="px-2 py-2.5 text-xs font-black text-slate-800 text-center border border-slate-200">
                                                        <button onClick={() => showInvoiceDetails(undefined, model)} className="hover:text-blue-600">{modelTotal || '-'}</button>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-2.5 text-xs font-black text-blue-700 text-center bg-blue-100 border border-slate-300">
                                                <button onClick={() => showInvoiceDetails()} className="hover:scale-110 transition-transform">
                                                    {Object.values(tvbhInvoiceStats).reduce((sum, stats) => sum + stats.total, 0)}
                                                </button>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: MONTHLY MATCHING STATS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
                        <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <i className="fas fa-layer-group text-sm"></i>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight">TIẾN ĐỘ GHÉP XE (TẤT CẢ ĐƠN)</h3>
                            </div>
                            <div className="hidden sm:flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-[8px] font-bold text-emerald-700 uppercase">Khớp</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">Chưa</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[320px]">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-slate-50">
                                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200">Dòng Xe</th>
                                        <th className="px-2 py-2.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider border border-slate-200 text-center w-20">Đã Ghép</th>
                                        <th className="px-2 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-200 text-center w-20">Chờ Ghép</th>
                                        <th className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200 text-center w-36">Tiến Độ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matchingModels.length > 0 ? (
                                        matchingModels.sort((a, b) => (currentMonthStats[b].matched + currentMonthStats[b].unmatched) - (currentMonthStats[a].matched + currentMonthStats[a].unmatched)).map(model => {
                                            const data = currentMonthStats[model];
                                            const total = data.matched + data.unmatched;
                                            const percent = total > 0 ? (data.matched / total) * 100 : 0;
                                            return (
                                                <tr key={model} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-5 py-3 text-xs font-bold text-slate-700 border border-slate-100">
                                                        <button onClick={() => showMatchingDetails(model, 'total')} className="hover:text-emerald-600 transition-colors">{model}</button>
                                                    </td>
                                                    <td className="px-2 py-3 text-xs font-bold text-emerald-600 text-center border border-slate-100">
                                                        <button onClick={() => showMatchingDetails(model, 'matched')} className="w-full h-full hover:scale-110 transition-transform">{data.matched}</button>
                                                    </td>
                                                    <td className="px-2 py-3 text-xs font-bold text-slate-400 text-center border border-slate-100">
                                                        <button onClick={() => showMatchingDetails(model, 'unmatched')} className="w-full h-full hover:scale-110 transition-transform">{data.unmatched}</button>
                                                    </td>
                                                    <td className="px-5 py-3 border border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all duration-1000 ${percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${percent}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-400 w-6">{Math.round(percent)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-xs border border-slate-200">Không có dữ liệu tháng này</td>
                                        </tr>
                                    )}
                                </tbody>
                                {matchingModels.length > 0 && (
                                    <tfoot className="sticky bottom-0 z-20 bg-slate-100">
                                        <tr>
                                            <td className="px-5 py-2.5 text-xs font-black text-slate-800 border border-slate-200 text-center">TỔNG</td>
                                            <td className="px-2 py-2.5 text-xs font-black text-emerald-700 text-center border border-slate-200">
                                                <button
                                                    onClick={() => showMatchingDetails(null, 'total_all')}
                                                    className="w-full h-full px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black transition-colors cursor-pointer"
                                                    title="Bấm để xem chi tiết toàn bộ xe đã ghép"
                                                >
                                                    {matchingModels.reduce((sum, m) => sum + currentMonthStats[m].matched, 0)}
                                                </button>
                                            </td>
                                            <td className="px-2 py-2.5 text-xs font-black text-slate-500 text-center border border-slate-200">
                                                <button
                                                    onClick={() => showMatchingDetails(null, 'unmatched_all')}
                                                    className="w-full h-full px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-black transition-colors cursor-pointer"
                                                    title="Bấm để xem chi tiết toàn bộ xe chờ ghép"
                                                >
                                                    {matchingModels.reduce((sum, m) => sum + currentMonthStats[m].unmatched, 0)}
                                                </button>
                                            </td>
                                            <td className="px-5 py-2.5 text-center border border-slate-200">
                                                <span className="text-[10px] font-black text-slate-700">
                                                    Tổng: {matchingModels.reduce((sum, m) => sum + currentMonthStats[m].matched + currentMonthStats[m].unmatched, 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {detailModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl xl:max-w-7xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800">{detailModal.title}</h3>
                            <button
                                onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-0 custom-scrollbar bg-slate-50">
                            <div className="overflow-x-auto p-4" ref={tableRef}>
                                {/* Bọc thêm 1 div bg-white để khi chụp ảnh có viền trắng đẹp */}
                                <div className="bg-white overflow-hidden">
                            <table className="w-full text-left border-collapse border-2 border-slate-400 min-w-[800px] text-[11px] font-medium bg-white font-sans">
                                <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-2 py-2 font-bold text-slate-800 uppercase border border-slate-300 text-center w-8 bg-slate-200">STT</th>
                                        <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 bg-slate-200">Số đơn</th>
                                        <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 bg-slate-200">Khách hàng / TVBH</th>
                                        <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 bg-slate-200">Dòng xe / Phiên bản</th>
                                        <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 bg-slate-200">Màu sắc (Ngoại/Nội)</th>
                                        {detailModal.isMatchedView ? (
                                            <>
                                                <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 bg-slate-200 text-center">Số VIN</th>
                                                <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 text-center bg-slate-200">Trạng thái</th>
                                                {detailModal.showDaysColumn && (
                                                    <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 text-center bg-slate-200">Số ngày ghép</th>
                                                )}
                                                <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 text-center bg-slate-200">Ngày ghép</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 text-center bg-slate-200">Trạng thái</th>
                                                <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 text-center bg-slate-200">Ngày Yêu Cầu</th>
                                                <th className="px-3 py-2 font-bold text-slate-800 uppercase border border-slate-300 text-center bg-slate-200">Ngày Cọc</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detailModal.data.map((order, index) => {
                                        const matchedDate = order['Thời gian ghép'];
                                        const daysSinceMatch = matchedDate
                                            ? Math.max(0, moment().diff(moment(matchedDate), 'days'))
                                            : null;
                                        return (
                                        <tr key={order['Số đơn hàng'] || order.VIN || index} className="hover:bg-slate-50">
                                            <td className="px-2 py-2 text-center text-slate-600 border border-slate-300">{index + 1}</td>
                                            <td className="px-3 py-2 text-slate-900 border border-slate-300 whitespace-nowrap">{order['Số đơn hàng']}</td>
                                            <td className="px-3 py-2 text-slate-900 border border-slate-300">
                                                <div>{order['Tên khách hàng'] || order['TÊN KHÁCH HÀNG']}</div>
                                                <div className="text-slate-500">{order['Tên tư vấn bán hàng'] || order['Tư vấn bán hàng'] || order['Người YC']}</div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-900 border border-slate-300">
                                                <div>{order['Dòng xe'] || order['DÒNG XE']}</div>
                                                <div className="text-slate-500">{order['Phiên bản'] || order['PHIÊN BẢN']}</div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-900 border border-slate-300">
                                                <div>{order['Ngoại thất']}</div>
                                                <div className="text-slate-500">{order['Nội thất']}</div>
                                            </td>
                                            {detailModal.isMatchedView ? (
                                                <>
                                                    <td className="px-3 py-2 text-slate-900 font-mono whitespace-nowrap border border-slate-300 text-center">
                                                        {order.VIN || order['SỐ VIN'] || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-center border border-slate-300 whitespace-nowrap text-emerald-700 font-bold">
                                                        {order['Kết quả'] || order['Trạng thái VC'] || 'Đã ghép'}
                                                    </td>
                                                    {detailModal.showDaysColumn && (
                                                        <td className={`px-3 py-2 text-center border border-slate-300 font-bold ${daysSinceMatch !== null && daysSinceMatch >= 20 ? 'text-red-600' : daysSinceMatch !== null && daysSinceMatch >= 10 ? 'text-amber-600' : 'text-slate-800'}`}>
                                                            {daysSinceMatch !== null ? `${daysSinceMatch}` : '-'}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2 text-center text-slate-800 border border-slate-300 whitespace-nowrap font-medium">
                                                        {matchedDate ? moment(matchedDate).format('DD/MM/YYYY') : '-'}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-3 py-2 text-center border border-slate-300 whitespace-nowrap text-amber-600 font-bold">
                                                        {order['Kết quả'] || order['Trạng thái VC'] || 'Chưa ghép'}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-slate-800 border border-slate-300 whitespace-nowrap font-medium">
                                                        {moment(order['Thời gian YC'] || order['Thời gian nhập']).format('DD/MM/YYYY')}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-slate-800 border border-slate-300 whitespace-nowrap font-medium">
                                                        {order['Ngày cọc'] ? moment(order['Ngày cọc']).format('DD/MM/YYYY') : <span className="text-slate-300">-</span>}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                        );
                                    })}
                                    {detailModal.data.length === 0 && (
                                        <tr>
                                            <td colSpan={detailModal.showDaysColumn ? 9 : 8} className="px-6 py-12 text-center text-slate-400 italic border border-slate-300">Không có dữ liệu chi tiết</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span>Tổng cộng: <strong className="text-slate-800">{detailModal.data.length}</strong> mục</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCopyImage}
                                    disabled={isCopying || detailModal.data.length === 0}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCopying ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-copy"></i>}
                                    Copy Ảnh
                                </button>
                                <button
                                    onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-5 py-2 bg-slate-800 border border-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 active:bg-slate-900 transition-all shadow-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER LEGEND */}
            <div className="px-6 py-2 bg-white border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-medium">
                <div>Cập nhật: {moment().format('HH:mm:ss DD/MM')} | Dữ liệu thời gian thực</div>
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><i className="fas fa-info-circle text-blue-400"></i> Bấm vào số liệu để xem chi tiết</span>
                    <span className="flex items-center gap-1"><i className="fas fa-shield-alt"></i> Dữ liệu bảo mật tuyệt đối</span>
                </div>
            </div>
        </div>
    );
};

export default AdminStats;
