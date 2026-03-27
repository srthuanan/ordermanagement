import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as apiService from '../../services/apiService';
import { supabase } from '../../services/supabaseClient';
import moment from 'moment';
import AnimatedBackground from '../ui/AnimatedBackground';
import Filters from '../ui/Filters';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';

interface DonHangTonViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    isActive?: boolean;
    pairedData?: any[];
    processedInvoices?: any[];
}

const CopyableField: React.FC<{ text: string; showToast?: Function; className?: string; label?: string; wrap?: boolean }> = ({ text, className, label, wrap = false }) => {
    const copyWithFeedback = useCopyFeedback();
    if (!text || text === 'N/A') {
        return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    }
    return (
        <div
            className={`cursor-pointer ${className}`}
            title={`Click để sao chép: ${text}`}
            onClick={(e) => { e.stopPropagation(); copyWithFeedback(text, e); }}
        >
            <span>{label ? `${label}: ` : ''}</span>
            <span className={wrap ? 'break-words' : 'truncate'}>{text}</span>
        </div>
    );
};

const DonHangTonView: React.FC<DonHangTonViewProps> = ({ showToast, isActive = true, pairedData = [], processedInvoices = [] }) => {
    const [backlogOrders, setBacklogOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTVBH, setSelectedTVBH] = useState('all');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    
    // Detailed Filters
    const [filters, setFilters] = useState<Record<string, string[]>>({
        dongXe: [],
        phienBan: [],
        mauSac: []
    });

    // const copyWithFeedback = useCopyFeedback(); // Removed to fix build error

    const fetchBacklogOrders = async () => {
        setIsLoading(true);
        try {
            const res = await apiService.getBacklogOrders();
            if (res.status === 'SUCCESS' && res.data) {
                // Enrich data with split Model/Version
                const enriched = res.data.map((o: any) => {
                    const full = o.phien_ban || '';
                    let model = 'N/A';
                    let version = full;

                    const knownModels = ['VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'VFe34', 'VF e34', '6 ECO', 'Limo Green'];
                    for (const m of knownModels) {
                        if (full.toUpperCase().includes(m.toUpperCase())) {
                            model = m;
                            version = full.replace(new RegExp(m, 'gi'), '').trim() || 'Tiêu chuẩn';
                            break;
                        }
                    }

                    if (model === 'N/A' && full) {
                        const parts = full.split(' ');
                        model = parts[0];
                        version = parts.slice(1).join(' ') || 'Tiêu chuẩn';
                    }

                    const isProcessed = processedInvoices.some(inv => inv['Số đơn hàng'] === o.so_don_hang) || full.toUpperCase().includes('ĐÃ XUẤT HÓA ĐƠN');
                    
                    // Auto-delete if processed
                    if (isProcessed) {
                        try {
                            supabase.from('donhang_ton').delete().eq('id', o.id).then();
                        } catch (e) {
                            console.error('Failed to auto-delete processed backlog order:', e);
                        }
                    }

                    // Find actual VIN from paired data
                    const pairedInfo = pairedData.find(pd => pd['Số đơn hàng'] === o.so_don_hang);
                    const realVin = pairedInfo?.VIN || o.donhanghienhuu?.so_vin || 'N/A';

                    return { 
                        ...o, 
                        displayModel: model, 
                        displayVersion: version, 
                        vin: realVin, 
                        isProcessed 
                    };
                });
                
                setBacklogOrders(enriched.filter(o => !o.isProcessed));
            } else {
                showToast('Lỗi', res.message || 'Lỗi khi tải đơn hàng tồn', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Exception loading backlog orders', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBacklogOrders();

        const channel = supabase
            .channel('donhang_ton_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'donhang_ton' }, (payload) => {
                console.log('Realtime donhang_ton update:', payload);
                fetchBacklogOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Extract unique values for filters based on all data
    const filterOptions = useMemo(() => {
        const baseList = backlogOrders.filter(o => selectedTVBH === 'all' || o.tvbh_name === selectedTVBH);
        
        return {
            dongXe: ['all', ...new Set(baseList.map(o => o.displayModel))].filter(Boolean),
            phienBan: ['all', ...new Set(baseList.map(o => o.displayVersion))].filter(Boolean),
            mauSac: ['all', ...new Set(baseList.map(o => `${o.ngoai_that} / ${o.noi_that}`))].filter(Boolean)
        };
    }, [backlogOrders, selectedTVBH]);

    const tvbhList = useMemo(() => {
        const names = [...new Set(backlogOrders.map(o => o.tvbh_name))].sort();
        return names.map(name => ({
            id: name,
            label: name,
            count: backlogOrders.filter(o => o.tvbh_name === name).length
        }));
    }, [backlogOrders]);

    const filteredOrders = useMemo(() => {
        return backlogOrders.filter(order => {
            const matchTVBH = selectedTVBH === 'all' || order.tvbh_name === selectedTVBH;
            const matchDongXe = filters.dongXe.length === 0 || filters.dongXe.includes(order.displayModel);
            const matchPhienBan = filters.phienBan.length === 0 || filters.phienBan.includes(order.displayVersion);
            const colorCombo = `${order.ngoai_that} / ${order.noi_that}`;
            const matchMauSac = filters.mauSac.length === 0 || filters.mauSac.includes(colorCombo);
            
            return matchTVBH && matchDongXe && matchPhienBan && matchMauSac;
        });
    }, [backlogOrders, selectedTVBH, filters]);

    const selectedOrder = useMemo(() => backlogOrders.find(o => o.id === selectedOrderId), [backlogOrders, selectedOrderId]);

    useEffect(() => {
        if (filteredOrders.length > 0) {
            const currentInList = filteredOrders.find(o => o.id === selectedOrderId);
            if (!currentInList) {
                setSelectedOrderId(filteredOrders[0].id);
            }
        } else {
            setSelectedOrderId(null);
        }
    }, [filteredOrders, selectedOrderId]);

    const renderOrderListItem = (order: any) => {
        const isSelected = selectedOrderId === order.id;
        return (
            <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`px-4 py-4 cursor-pointer transition-all duration-300 group relative border-l-2 ${isSelected
                    ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-accent-primary z-10'
                    : 'bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200'
                    }`}
            >
                <div className="flex flex-col gap-1.5 min-w-0">
                    <div className={`text-[13px] font-bold truncate transition-colors ${isSelected ? 'text-accent-primary' : 'text-slate-700 group-hover:text-accent-primary'}`}>
                        {order.khach_hang}
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded uppercase leading-none">{order.displayModel}</span>
                            <span className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{order.displayVersion}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                            <i className="fas fa-palette text-[8px] opacity-40"></i>
                            <span>{order.ngoai_that} / {order.noi_that}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const filterPortalTarget = document.getElementById('admin-filter-portal-target');

    const dropdownConfigs = [
        { id: 'don-ton-dongxe', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.dongXe.filter(o => o !== 'all'), icon: 'fa-car' },
        { id: 'don-ton-phienban', key: 'phienBan', label: 'Phiên Bản', options: filterOptions.phienBan.filter(o => o !== 'all'), icon: 'fa-cogs' },
        { id: 'don-ton-mausac', key: 'mauSac', label: 'Màu Sắc', options: filterOptions.mauSac.filter(o => o !== 'all'), icon: 'fa-palette' }
    ];

    const handleFilterChange = (newFilters: any) => setFilters(prev => ({ ...prev, ...newFilters }));
    const handleFilterReset = () => setFilters({ dongXe: [], phienBan: [], mauSac: [] });

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-border-primary overflow-hidden animate-fade-in relative z-0">
            {isActive && filterPortalTarget && createPortal(
                <Filters
                    filters={filters as any}
                    onFilterChange={handleFilterChange}
                    onReset={handleFilterReset}
                    dropdowns={dropdownConfigs}
                    searchPlaceholder=""
                    totalCount={filteredOrders.length}
                    onRefresh={fetchBacklogOrders}
                    isLoading={isLoading}
                    hideSearch={true}
                    size="compact"
                    variant="modern"
                    dropdownClassName="w-24 md:w-28 lg:w-32"
                    searchable={false}
                />,
                filterPortalTarget
            )}
            <AnimatedBackground />
            
            {/* Column 1: Sales Consultants */}
            <div className="w-full md:w-64 flex-shrink-0 border-r border-border-primary bg-surface-ground/90 flex flex-col relative z-10">
                <div className="hidden md:flex p-4 border-b border-border-secondary">
                    <span className="font-black text-[11px] uppercase tracking-widest text-slate-400">DS Tư Vấn Bán Hàng</span>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    <button
                        onClick={() => setSelectedTVBH('all')}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${selectedTVBH === 'all' ? 'bg-accent-primary text-white shadow-lg' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                    >
                        <div className="flex items-center gap-3">
                            <i className="fas fa-users w-5 text-center"></i>
                            <span>Tất Cả Sales</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedTVBH === 'all' ? 'bg-white/20' : 'bg-surface-hover text-text-secondary'}`}>
                            {backlogOrders.length}
                        </span>
                    </button>
                    
                    <div className="h-px bg-slate-200/50 my-2 mx-2"></div>
                    
                    {tvbhList.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedTVBH(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedTVBH === item.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold">
                                    {item.label[0].toUpperCase()}
                                </div>
                                <span className="truncate max-w-[120px]">{item.label}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedTVBH === item.id ? 'bg-accent-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>
                                {item.count}
                            </span>
                        </button>
                    ))}
                </nav>

            </div>

            {/* Column 2: Filterable List */}
            <div className="w-full md:w-80 flex-shrink-0 border-r border-border-primary flex flex-col bg-white/95 relative z-10">

                <div className="flex-1 overflow-y-auto divide-y divide-border-secondary no-scrollbar">
                    {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 h-full bg-slate-50/30">
                            <i className="fas fa-filter text-slate-200 text-3xl mb-4 opacity-50"></i>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Không tìm thấy đơn phù hợp</p>
                        </div>
                    ) : (
                        filteredOrders.map(renderOrderListItem)
                    )}
                </div>
            </div>

            {/* Column 3: Detailed View */}
            <div className="flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10">
                {selectedOrder ? (
                    <>
                        <div className="bg-white border-b border-gray-100 z-10 shadow-sm">
                            <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black text-lg md:text-xl flex-shrink-0 shadow-sm ring-4 ring-white">
                                        {selectedOrder.khach_hang?.[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-base font-black text-slate-800 truncate tracking-tight mb-0.5">{selectedOrder.khach_hang}</h2>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 border border-slate-200/50">
                                                <i className="fas fa-user-tie text-[8px] opacity-60"></i>
                                                <span className="uppercase tracking-tighter">TVBH: {selectedOrder.tvbh_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded text-[9px] font-bold text-blue-600 border border-blue-100/50">
                                                <i className="fas fa-history text-[8px] opacity-60"></i>
                                                <span className="uppercase tracking-tighter">BÁO CÁO TỒN</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-3 flex flex-col gap-3 min-h-0 overflow-y-auto bg-gray-50/30 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
                                        <i className="fas fa-car text-accent-primary text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cấu hình xe tồn</h3>
                                    </div>
                                    <div className="p-3 space-y-2">
                                         <div className="flex flex-col gap-0.5 py-1 px-2 bg-slate-50/50 rounded-lg">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Dòng xe</span>
                                            <span className="text-xs font-black text-slate-800">{selectedOrder.displayModel}</span>
                                        </div>
                                         <div className="flex flex-col gap-0.5 py-1 px-2 bg-slate-50/50 rounded-lg">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Phiên bản</span>
                                            <span className="text-xs font-black text-slate-800">{selectedOrder.displayVersion}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 py-1 px-2 bg-slate-50/50 rounded-lg">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Màu sắc (Ngoại/Nội)</span>
                                            <span className="text-xs font-black text-slate-700">{selectedOrder.ngoai_that} / {selectedOrder.noi_that}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
                                        <i className="fas fa-hashtag text-accent-primary text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Giao dịch</h3>
                                    </div>
                                    <div className="p-3 space-y-3">
                                        <div className="text-center px-2 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Số đơn hàng DMS</div>
                                            <CopyableField text={selectedOrder.so_don_hang} showToast={showToast} className="text-[13px] font-black text-accent-primary font-mono" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                                            <div className="p-2">
                                                 <div className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Số VIN</div>
                                                 <CopyableField text={selectedOrder.vin || 'N/A'} className="text-[10px] font-bold text-accent-primary truncate" />
                                            </div>
                                            <div className="p-2">
                                                 <div className="text-[7px] font-black text-blue-400 uppercase mb-0.5">DMS Date</div>
                                                 <div className="text-[10px] font-bold text-blue-600">{moment(selectedOrder.ngay_giao_dich).format('DD/MM/YYYY')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-gray-50/50 px-3 py-1.5 border-b border-gray-100 flex items-center gap-2">
                                        <i className="fas fa-comment-alt text-accent-primary text-[10px]"></i>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ghi chú từ TVBH</h3>
                                    </div>
                                    <div className="p-3 flex-1">
                                        <div className="text-xs text-slate-600 leading-relaxed font-semibold bg-amber-50/30 p-4 rounded-xl border border-amber-100/50 h-full min-h-[100px] flex items-center justify-center text-center">
                                            "{selectedOrder.ghi_chu || 'Trống'}"
                                        </div>
                                    </div>
                                </div>

                            </div>
                            
                            <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Báo cáo lúc</p>
                                <p className="text-[13px] font-black text-slate-600">{moment(selectedOrder.created_at).format('HH:mm:ss - DD/MM/YYYY')}</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300">
                        <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4 text-slate-200">
                            <i className="fas fa-layer-group text-2xl"></i>
                        </div>
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Chọn báo cáo để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DonHangTonView;
