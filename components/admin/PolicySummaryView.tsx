import React, { useState, useMemo, useEffect } from 'react';
import { Order } from '../../types';
import { exportOrdersToExcel } from '../../utils/excelUtils';
import moment from 'moment';
import StatusBadge from '../ui/StatusBadge';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';

interface PolicySummaryViewProps {
    orders: Order[];
    showToast: (title: string, message: string, type: any) => void;
}

const CopyableField: React.FC<{ text: string; label?: string; className?: string }> = ({ text, label, className }) => {
    const copyWithFeedback = useCopyFeedback();
    if (!text || text === 'N/A') return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    return (
        <div 
            className={`cursor-pointer ${className}`} 
            onClick={(e) => { e.stopPropagation(); copyWithFeedback(text, e); }}
            title={`Click để sao chép: ${text}`}
        >
            {label && <span className="text-slate-400 mr-2">{label}</span>}
            <span className="font-bold border-b border-dashed border-slate-300 pb-0.5">{text}</span>
        </div>
    );
};

const PolicySummaryView: React.FC<PolicySummaryViewProps> = ({ orders, showToast }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // Chỉ lấy các đơn hàng có chính sách
    const policyOrders = useMemo(() => {
        return orders.filter(o => 
            o['CHÍNH SÁCH'] && 
            o['CHÍNH SÁCH'].trim() !== '' && 
            (o['Kết quả'] === 'Đã ghép' || o['Kết quả'] === 'Chưa ghép')
        );
    }, [orders]);

    const filteredOrders = useMemo(() => {
        return policyOrders.filter(o => {
            const matchSearch = 
                o['Số đơn hàng']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o['Tên khách hàng']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o['CHÍNH SÁCH']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o['Tên tư vấn bán hàng']?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchSearch;
        }).sort((a, b) => {
            // Sắp xếp theo số đơn hàng giảm dần
            return (b['Số đơn hàng'] || '').localeCompare(a['Số đơn hàng'] || '');
        });
    }, [policyOrders, searchQuery]);

    const selectedOrder = useMemo(() => {
        return filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId) || filteredOrders[0] || null;
    }, [filteredOrders, selectedOrderId]);

    useEffect(() => {
        if (!selectedOrderId && filteredOrders.length > 0) {
            setSelectedOrderId(filteredOrders[0]['Số đơn hàng']);
        }
    }, [filteredOrders, selectedOrderId]);

    const handleExport = () => {
        if (filteredOrders.length === 0) return;
        const exportData = filteredOrders.map(o => ({
            'Số Đơn Hàng': o['Số đơn hàng'],
            'Khách Hàng': o['Tên khách hàng'],
            'TVBH': o['Tên tư vấn bán hàng'],
            'Dòng Xe': o['Dòng xe'],
            'VIN': o['VIN'],
            'Chính Sách': o['CHÍNH SÁCH'],
            'Ngày Ghép': o['Thời gian ghép'] ? moment(o['Thời gian ghép']).format('DD/MM/YYYY') : ''
        }));
        exportOrdersToExcel(exportData, `Tong_hop_CS_${moment().format('DDMMYY')}`);
        showToast('Thành công', 'Đã xuất file Excel', 'success');
    };

    return (
        <div className="flex h-full bg-[#f8fafc] overflow-hidden">
            {/* 1. Left Sidebar (Folders Style) */}
            <div className="w-56 bg-[#f8fafc] border-r border-slate-200 flex flex-col pt-4">
                <div className="px-4 mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Danh mục</h3>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-slate-200 text-indigo-600 shadow-sm cursor-pointer">
                            <i className="fas fa-file-contract text-xs"></i>
                            <span className="text-[11px] font-bold">Tất cả chính sách</span>
                            <span className="ml-auto text-[10px] font-bold opacity-60">{filteredOrders.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Middle Column (Order List Style) */}
            <div className="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="relative flex-1 group">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] focus:bg-white focus:border-indigo-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={handleExport} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Xuất Excel">
                        <i className="fas fa-file-excel"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredOrders.map(order => (
                        <div 
                            key={order['Số đơn hàng']}
                            onClick={() => setSelectedOrderId(order['Số đơn hàng'])}
                            className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex items-center gap-3 ${selectedOrderId === order['Số đơn hàng'] ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-sm font-black text-slate-700 uppercase truncate pr-2">{order['Tên khách hàng']}</h3>
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded leading-none flex-shrink-0">{order['Số đơn hàng']}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">{order['Dòng xe']} • {order['Phiên bản']}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <i className="fas fa-user-tie text-[8px] opacity-60"></i> {order['Tên tư vấn bán hàng']}
                                    </p>
                                    <span className="text-[9px] font-bold text-slate-300">{order['Thời gian ghép'] ? moment(order['Thời gian ghép']).format('DD/MM/YY') : ''}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Right Column (Order Details Style) */}
            <div className="flex-1 bg-white overflow-y-auto custom-scrollbar flex flex-col">
                {selectedOrder ? (
                    <div className="p-6 lg:p-8 max-w-5xl">
                        {/* Header Section */}
                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black border border-indigo-100 shadow-sm">
                                {selectedOrder['Tên khách hàng'].charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedOrder['Tên khách hàng']}</h2>
                                    <StatusBadge status={selectedOrder['Kết quả'] || ''} size="sm" />
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <i className="fas fa-user-tie text-indigo-500"></i> TVBH: {selectedOrder['Tên tư vấn bán hàng']}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Main Info Columns */}
                            <div className="md:col-span-8 space-y-6">
                                {/* Thông tin xe Card */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                                        <i className="fas fa-car text-indigo-500 text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Thông tin xe</h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Dòng xe / PB</span>
                                            <span className="text-[11px] font-black">{selectedOrder['Dòng xe']} – {selectedOrder['Phiên bản']}</span>
                                        </div>
                                        <CopyableField label="Số VIN" text={selectedOrder['VIN'] || 'N/A'} className="text-[11px] flex flex-col gap-1" />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Màu sắc</span>
                                            <span className="text-[11px] font-black">{selectedOrder['Ngoại thất']} / {selectedOrder['Nội thất']}</span>
                                        </div>
                                        <CopyableField label="Số máy" text={selectedOrder['Số máy'] || 'N/A'} className="text-[11px] flex flex-col gap-1" />
                                    </div>
                                </div>

                                {/* Chính sách Card */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                                        <i className="fas fa-file-contract text-indigo-500 text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Danh sách chính sách</h3>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {selectedOrder['CHÍNH SÁCH']?.split('; ').map((p, i) => (
                                            <div key={i} className="flex items-start gap-3 p-2 bg-indigo-50/30 rounded-lg border border-indigo-100/50">
                                                <i className="fas fa-check-circle text-indigo-500 text-[10px] mt-0.5"></i>
                                                <span className="text-[11px] font-bold text-slate-700 leading-normal">{p}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Info Column */}
                            <div className="md:col-span-4 space-y-6">
                                {/* Giao dịch Card */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                                        <i className="fas fa-exchange-alt text-indigo-500 text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Giao dịch</h3>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Số đơn hàng</span>
                                            <CopyableField text={selectedOrder['Số đơn hàng']} className="text-[11px] text-indigo-600 font-black" />
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter leading-none mb-1">Ngày ghép</span>
                                                <span className="text-[11px] font-black">{selectedOrder['Thời gian ghép'] ? moment(selectedOrder['Thời gian ghép']).format('DD/MM/YYYY') : 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter leading-none mb-1">Ngày dự XHĐ</span>
                                                <span className="text-[11px] font-black">{selectedOrder['Ngày xuất hóa đơn'] ? moment(selectedOrder['Ngày xuất hóa đơn']).format('DD/MM/YYYY') : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <i className="fas fa-inbox text-5xl mb-4"></i>
                        <p className="text-sm font-bold uppercase tracking-widest">Chọn đơn hàng để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PolicySummaryView;
