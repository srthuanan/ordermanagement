import React, { useMemo, useState } from 'react';
import { Order } from '../../types';
import moment from 'moment';

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
    }>({
        isOpen: false,
        title: '',
        data: []
    });

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

    const showMatchingDetails = (model: string, type: 'matched' | 'unmatched' | 'total') => {
        let filtered: Order[] = [];
        if (type === 'matched') {
            filtered = pairedData.filter(o => (o['Dòng xe'] || 'Khác') === model);
        } else if (type === 'unmatched') {
            filtered = pendingData.filter(o => (o['Dòng xe'] || 'Khác') === model);
        } else {
            filtered = [...pairedData, ...pendingData].filter(o => (o['Dòng xe'] || 'Khác') === model);
        }

        setDetailModal({
            isOpen: true,
            title: `Chi tiết Ghép xe: ${model} (${type === 'matched' ? 'Đã ghép' : type === 'unmatched' ? 'Chưa ghép' : 'Tổng'})`,
            data: filtered
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
                            <table className="w-full text-left border-collapse min-w-[500px]">
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
                            <table className="w-full text-left border-collapse">
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
                                                {matchingModels.reduce((sum, m) => sum + currentMonthStats[m].matched, 0)}
                                            </td>
                                            <td className="px-2 py-2.5 text-xs font-black text-slate-500 text-center border border-slate-200">
                                                {matchingModels.reduce((sum, m) => sum + currentMonthStats[m].unmatched, 0)}
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
                        <div className="flex-1 overflow-auto p-0 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Số đơn</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Khách hàng / TVBH</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Dòng xe / Phân loại</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Màu sắc</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">VIN / Tình trạng</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 text-right">Ngày</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detailModal.data.map((order, index) => (
                                        <tr key={order['Số đơn hàng'] || order.VIN || index} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-xs font-bold text-blue-600 uppercase tracking-wider">{order['Số đơn hàng']}</td>
                                            <td className="px-4 py-3 text-xs text-slate-700">
                                                <div className="font-bold">{order['Tên khách hàng'] || order['TÊN KHÁCH HÀNG']}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5" title="Tư vấn bán hàng"><i className="fas fa-user-tie mr-1"></i>{order['Tên tư vấn bán hàng'] || order['Tư vấn bán hàng'] || order['Người YC']}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                <div className="font-bold text-slate-800">{order['Dòng xe'] || order['DÒNG XE']}</div>
                                                <div className="text-[10px] opacity-70">{order['Phiên bản'] || order['PHIÊN BẢN']}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">
                                                <div className="font-medium text-slate-700" title="Ngoại thất">{order['Ngoại thất']}</div>
                                                <div className="text-[10px] opacity-70" title="Nội thất">{order['Nội thất']}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                                                <div className="font-bold text-slate-600">{order.VIN || order['SỐ VIN'] || '-'}</div>
                                                <div className="mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(order['Kết quả'] || order['Trạng thái VC'] || '').toLowerCase().includes('chưa') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {order['Kết quả'] || order['Trạng thái VC'] || 'Không rõ'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[10px] text-slate-400 text-right font-medium">
                                                {moment(order['Thời gian YC'] || order['Thời gian nhập']).format('DD/MM/YYYY')}
                                            </td>
                                        </tr>
                                    ))}
                                    {detailModal.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-xs">Không có dữ liệu chi tiết</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <div className="text-xs text-slate-500">
                                Tổng cộng: <span className="font-bold text-slate-800">{detailModal.data.length}</span> mục
                            </div>
                            <button
                                onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-all shadow-sm"
                            >
                                Đóng
                            </button>
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
