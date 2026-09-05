import React, { useState, useMemo, useEffect } from 'react';
import { Order } from '../../types';
import { exportOrdersToExcel } from '../../utils/excelUtils';
import moment from 'moment';
import StatusBadge from '../ui/StatusBadge';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import MarqueeText from '../ui/MarqueeText';

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

export const PolicySummaryView: React.FC<PolicySummaryViewProps> = ({ orders, showToast }) => {
    const copyWithFeedback = useCopyFeedback();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

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
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in relative z-0">
            {/* Column 1: Navigation Sidebar */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    <button
                        onClick={() => setMobileView('list')}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-blue-600 text-white shadow-xs"
                    >
                        <div className="flex items-center gap-2.5">
                            <i className="fa-solid fa-file-contract text-xs opacity-90"></i>
                            <span>Tất cả chính sách</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-700 text-white">
                            {filteredOrders.length}
                        </span>
                    </button>
                </nav>
            </div>

            {/* Column 2: Order List (Minimalist 2-line cards) */}
            <div className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button onClick={() => setMobileView('folders')} className="md:hidden p-1 text-slate-500 hover:text-slate-800">
                            <i className="fas fa-arrow-left text-xs"></i>
                        </button>
                        <div className="relative flex-1">
                            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                            <input
                                type="text"
                                placeholder="Tìm kiếm đơn hàng, KH, CS..."
                                className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-2.5 py-1 text-[11px] font-medium text-slate-800 focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <button onClick={handleExport} className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors" title="Xuất Excel">
                        <i className="fa-solid fa-file-excel text-sm"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <i className="fa-solid fa-file-circle-xmark text-3xl mb-2 text-slate-300"></i>
                            <span className="text-xs font-bold">Không có chính sách nào</span>
                        </div>
                    ) : (
                        filteredOrders.map(order => {
                            const isSelected = selectedOrderId === order['Số đơn hàng'];
                            return (
                                <div 
                                    key={order['Số đơn hàng']}
                                    onClick={(e) => {
                                        setSelectedOrderId(order['Số đơn hàng']);
                                        setMobileView('detail');
                                        copyWithFeedback(order['Tên khách hàng'], e);
                                    }}
                                    className={`p-3 cursor-pointer transition-all duration-150 relative border-l-4 ${
                                        isSelected
                                            ? 'bg-slate-100/90 border-blue-600 font-semibold'
                                            : 'border-transparent hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="text-xs font-bold text-slate-900 mb-1 overflow-hidden">
                                        <MarqueeText
                                            text={order['Tên khách hàng'] || '—'}
                                            className="text-xs font-bold text-slate-900"
                                        />
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-normal truncate">
                                        {order['Dòng xe']} {order['Phiên bản']}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Column 3: Policy Detail View */}
            <div className={`flex-1 flex flex-col bg-slate-50 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedOrder ? (
                    <div className="flex-1 flex flex-col h-full overflow-y-auto">
                        {/* Header Banner - Phân Bố 2 Dòng Thoáng Sạch */}
                        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-3.5">
                                <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 text-slate-500 hover:text-slate-800">
                                    <i className="fas fa-arrow-left text-xs"></i>
                                </button>
                                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-base font-bold shadow-2xs">
                                    {selectedOrder['Tên khách hàng'].charAt(0)}
                                </div>
                                <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2.5">
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <MarqueeText 
                                                text={selectedOrder['Tên khách hàng'] || '—'}
                                                className="font-bold text-base text-slate-900 leading-none cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                                title="Click để sao chép tên khách hàng"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                                }}
                                            />
                                        </div>
                                        <StatusBadge status={selectedOrder['Kết quả'] || ''} size="sm" />
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                                        <span>Đơn hàng: <strong className="font-mono text-slate-900">{selectedOrder['Số đơn hàng']}</strong></span>
                                        <span className="text-slate-300">|</span>
                                        <span>TVBH: <strong className="text-slate-900">{selectedOrder['Tên tư vấn bán hàng']}</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Left Info Card (Col 7) */}
                                <div className="lg:col-span-7 space-y-4">
                                    {/* Thông tin xe */}
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                                            <i className="fa-solid fa-car text-blue-600 text-xs"></i>
                                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Thông Tin Xe</h3>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Dòng Xe / Phiên Bản</span>
                                                <span className="font-extrabold text-slate-900">{selectedOrder['Dòng xe']} – {selectedOrder['Phiên bản']}</span>
                                            </div>
                                            <CopyableField label="Số VIN" text={selectedOrder['VIN'] || 'N/A'} className="space-y-0.5 font-mono" />
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Màu Sắc</span>
                                                <span className="font-bold text-slate-800">{selectedOrder['Ngoại thất']} / {selectedOrder['Nội thất']}</span>
                                            </div>
                                            <CopyableField label="Số Máy" text={selectedOrder['Số máy'] || 'N/A'} className="space-y-0.5 font-mono" />
                                        </div>
                                    </div>

                                    {/* Danh sách chính sách */}
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                                            <i className="fa-solid fa-file-contract text-blue-600 text-xs"></i>
                                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Danh Sách Chính Sách Áp Dụng</h3>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            {selectedOrder['CHÍNH SÁCH']?.split('; ').map((p, i) => (
                                                <div key={i} className="flex items-start gap-2.5 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                                    <i className="fa-solid fa-circle-check text-blue-600 text-xs mt-0.5"></i>
                                                    <span className="text-xs font-bold text-slate-800 leading-snug">{p}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side Giao Dịch Card (Col 5) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                                            <i className="fa-solid fa-right-left text-blue-600 text-xs"></i>
                                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Thông Tin Giao Dịch</h3>
                                        </div>
                                        <div className="p-4 space-y-3 text-xs">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Mã Số Đơn Hàng</span>
                                                <CopyableField text={selectedOrder['Số đơn hàng']} className="text-xs text-blue-700 font-mono font-black" />
                                            </div>
                                            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Ngày Ghép</span>
                                                    <span className="font-extrabold text-slate-800">{selectedOrder['Thời gian ghép'] ? moment(selectedOrder['Thời gian ghép']).format('DD/MM/YYYY') : 'N/A'}</span>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Ngày Dự XHĐ</span>
                                                    <span className="font-extrabold text-slate-800">{selectedOrder['Ngày xuất hóa đơn'] ? moment(selectedOrder['Ngày xuất hóa đơn']).format('DD/MM/YYYY') : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                        <i className="fa-solid fa-hand-pointer text-3xl mb-2 text-slate-300"></i>
                        <span className="text-xs font-bold">Vui lòng chọn một đơn hàng để xem chính sách</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PolicySummaryView;
