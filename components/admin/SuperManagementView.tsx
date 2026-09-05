import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { Order } from '../../types';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import * as apiService from '../../services/apiService';
import moment from 'moment';
import MarqueeText from '../ui/MarqueeText';

interface SuperManagementViewProps {
    allOrders: Order[];
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess: () => void;
}

const SuperManagementView: React.FC<SuperManagementViewProps> = ({ allOrders, showToast, onSuccess }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const copyWithFeedback = useCopyFeedback();

    const [formData, setFormData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { versionsMap, allPossibleVersions, vehicleLines, vehicleColors, vehicleInteriors } = useVehicleConfig();
    const [availableInteriors, setAvailableInteriors] = useState<string[]>([]);

    const [filterModel, setFilterModel] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditIssues, setAuditIssues] = useState<any[]>([]);
    const [auditStats, setAuditStats] = useState<any>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [isBackgroundAuditing, setIsBackgroundAuditing] = useState(false);
    const [lastAuditTime, setLastAuditTime] = useState<Date | null>(null);

    const handleAudit = async () => {
        setIsAuditing(true);
        setShowAuditModal(true);
        try {
            const result = await (apiService as any).performAdminAction('auditDataConsistency', {});
            if (result.status === 'SUCCESS') {
                setAuditIssues(result.data || []);
                setAuditStats(result.stats || null);
            } else {
                showToast('Lỗi', result.message || 'Không thể quét đồng bộ.', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message, 'error');
        } finally {
            setIsAuditing(false);
        }
    };

    const handleFixIssues = async () => {
        setIsFixing(true);
        try {
            const result = await (apiService as any).performAdminAction('fixDataConsistency', { issues: JSON.stringify(auditIssues) });
            if (result.status === 'SUCCESS') {
                showToast('Thành Công', result.message, 'success');
                setAuditIssues([]);
                setShowAuditModal(false);
                onSuccess(); // refresh data
            } else {
                showToast('Lỗi', result.message || 'Sửa lỗi thất bại.', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message, 'error');
        } finally {
            setIsFixing(false);
        }
    };

    const [isSyncingEngine, setIsSyncingEngine] = useState(false);

    const handleSyncEngineNumbers = async () => {
        setIsSyncingEngine(true);
        try {
            const result = await (apiService as any).performAdminAction('syncEngineNumbers', {});
            if (result.status === 'SUCCESS') {
                showToast('Thành Công', result.message, 'success');
                onSuccess(); // refresh data
            } else {
                showToast('Lỗi', result.message || 'Đồng bộ thất bại.', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message, 'error');
        } finally {
            setIsSyncingEngine(false);
        }
    };

    // --- TRỢ LÝ CHẠY NGẦM (BACKGROUND AUTO-SYNC) ---
    useEffect(() => {
        let isMounted = true;
        
        const runBackgroundAudit = async () => {
            if (!isMounted) return;
            setIsBackgroundAuditing(true);
            console.log("🔍 [Auto-Sync] Trợ lý ngầm bắt đầu quét dữ liệu toàn hệ thống...");
            
            try {
                // 1. Quét lỗi âm thầm (Không làm ảnh hưởng UI)
                const result = await (apiService as any).performAdminAction('auditDataConsistency', {});
                
                if (result.status === 'SUCCESS') {
                    console.log(`✅ [Auto-Sync] Quét xong. Tìm thấy ${result.data?.length || 0} vấn đề bất đồng bộ.`);
                    
                    if (result.data && result.data.length > 0) {
                        const issues = result.data;
                        console.log(`🛠️ [Auto-Sync] Bắt đầu tự động sửa ${issues.length} lỗi...`);
                        
                        // 2. Tự động gọi API sửa lỗi ngay lập tức
                        const fixResult = await (apiService as any).performAdminAction('fixDataConsistency', { issues: JSON.stringify(issues) });
                        
                        if (fixResult.status === 'SUCCESS' && isMounted) {
                            console.log(`✨ [Auto-Sync] Sửa lỗi thành công!`);
                            showToast(
                                'Trợ lý Ảo (Auto-Sync)', 
                                `Vừa dọn dẹp âm thầm ${issues.length} lỗi rác dữ liệu/bất đồng bộ. Hệ thống đã an toàn.`, 
                                'info',
                                8000
                            );
                            // Cập nhật lại dữ liệu giao diện
                            onSuccess(); 
                        }
                    }
                }
            } catch (e) {
                console.error("❌ [Auto-Sync] Lỗi khi chạy Audit ngầm:", e);
            } finally {
                if (isMounted) {
                    setIsBackgroundAuditing(false);
                    setLastAuditTime(new Date());
                }
            }
        };

        // Chạy lần quét đầu tiên sau 15 giây (để nhường tài nguyên cho trang load xong hẳn)
        const initialTimer = setTimeout(() => {
            runBackgroundAudit();
        }, 15000);

        // Chạy lặp lại định kỳ mỗi 15 phút
        const intervalTimer = setInterval(() => {
            runBackgroundAudit();
        }, 15 * 60 * 1000);

        return () => {
            isMounted = false;
            clearTimeout(initialTimer);
            clearInterval(intervalTimer);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredOrders = useMemo(() => {
        let result = allOrders.filter(o => {
            const statusStr = ((o['Kết quả'] || '') + ' ' + (o['Trạng thái VC'] || '')).toLowerCase().trim().normalize('NFC');
            const isPendingSig = statusStr.includes('chờ ký');
            const isInvoiced = statusStr.includes('đã xuất hóa đơn') || statusStr.includes('đã xuất hđ');
            return !isPendingSig && !isInvoiced;
        });

        if (filterModel) {
            result = result.filter(o => o['Dòng xe'] === filterModel);
        }

        if (filterStatus) {
            if (filterStatus === 'Đã ghép') {
                result = result.filter(o => o['VIN'] && o['VIN'] !== 'N/A' && o['VIN'] !== '');
            } else if (filterStatus === 'Chưa ghép') {
                result = result.filter(o => !o['VIN'] || o['VIN'] === 'N/A' || o['VIN'] === '');
            } else {
                result = result.filter(o => (o['Kết quả'] || '').includes(filterStatus));
            }
        }

        if (!searchTerm.trim()) return result.slice(0, 100); 
        
        const term = searchTerm.toLowerCase().trim();
        return result.filter(o => 
            o['Số đơn hàng']?.toLowerCase().includes(term) || 
            (o['VIN'] && o['VIN'].toLowerCase().includes(term)) ||
            (o['Số máy'] && o['Số máy'].toLowerCase().includes(term)) ||
            o['Tên khách hàng']?.toLowerCase().includes(term) ||
            o['Tên tư vấn bán hàng']?.toLowerCase().includes(term)
        );
    }, [allOrders, searchTerm, filterModel, filterStatus]);

    const selectedOrder = useMemo(() => filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId), [filteredOrders, selectedOrderId]);

    const isInvoiced = useMemo(() => {
        return selectedOrder && (selectedOrder['Kết quả'] || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn';
    }, [selectedOrder]);

    // Auto-select first order
    useEffect(() => {
        if (filteredOrders.length > 0 && !selectedOrder) {
            setSelectedOrderId(filteredOrders[0]['Số đơn hàng']);
        }
    }, [filteredOrders, selectedOrder]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleOrderSelect = (orderId: string) => {
        if (orderId === selectedOrderId) return;
        setSelectedOrderId(orderId);
        setMobileView('detail');
    };

    useEffect(() => {
        if (selectedOrder) {
            setFormData({
                "Tên khách hàng": selectedOrder["Tên khách hàng"],
                "Số đơn hàng": selectedOrder["Số đơn hàng"],
                "Dòng xe": selectedOrder["Dòng xe"],
                "Phiên bản": selectedOrder["Phiên bản"],
                "Ngoại thất": selectedOrder["Ngoại thất"],
                "Nội thất": selectedOrder["Nội thất"],
                "Ngày cọc": selectedOrder["Ngày cọc"] ? moment(selectedOrder["Ngày cọc"]).format('YYYY-MM-DDTHH:mm') : '',
                "Tên tư vấn bán hàng": selectedOrder["Tên tư vấn bán hàng"],
                "VIN": selectedOrder["VIN"] || selectedOrder["SỐ VIN"] || '',
                "Số máy": selectedOrder["Số máy"] || selectedOrder["SỐ MÁY"] || '',
                "Mã DMS": selectedOrder["Mã DMS"] || '',
                "Kết quả": selectedOrder["Kết quả"],
                "Trạng thái VC": selectedOrder["Trạng thái VC"],
                "Ngày xuất hóa đơn": selectedOrder["Ngày xuất hóa đơn"] ? moment(selectedOrder["Ngày xuất hóa đơn"], ["DD/MM/YYYY", "YYYY-MM-DD"]).format('YYYY-MM-DD') : '',
                "LinkHoaDonDaXuat": selectedOrder["LinkHoaDonDaXuat"] || selectedOrder["url_hoa_don_da_xuat"] || '',
                "Thời gian cần xe": selectedOrder["Thời gian cần xe"] ? moment(selectedOrder["Thời gian cần xe"]).format('YYYY-MM-DD') : ''
            });
        }
    }, [selectedOrder]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => {
            const newState = { ...prev, [name]: value };
            if (name === 'Dòng xe') {
                const versions = versionsMap[value] || [];
                if (versions.length === 1) newState['Phiên bản'] = versions[0];
            }
            return newState;
        });
    };

    useEffect(() => {
        setAvailableInteriors(vehicleInteriors);
    }, [vehicleInteriors]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        setIsSubmitting(true);
//         showToast('Đang xử lý siêu đồng bộ...', 'Vui lòng chờ trong giây lát.', 'loading');

        try {
            const result = await apiService.superUpdateOrderDetails(selectedOrder['Số đơn hàng'], formData);
            showToast('Thành Công', result.message, 'success', 4000);
            onSuccess();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định.";
            showToast('Thất Bại', message, 'error', 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-medium text-xs";
    const labelClass = "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-0.5 flex items-center justify-between";

    return (
        <div className="flex h-full bg-slate-50 rounded-2xl shadow-md border border-border-primary overflow-hidden relative isolate">
            <AnimatedBackground />

            {/* Column 1: List / Search */}
            <div className={`w-full md:w-80 lg:w-[380px] flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 backdrop-blur-md relative z-10 transition-transform duration-300 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Search & Filters Header */}
                <div className="shrink-0 p-3 border-b border-slate-200 bg-white space-y-2">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i className="fas fa-search text-slate-400 group-focus-within:text-blue-600 transition-colors text-sm"></i>
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm Số ĐH, VIN, Máy, KH..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-xs font-medium placeholder:text-slate-400 text-slate-900"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <select 
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium outline-none focus:border-blue-600 text-slate-700"
                            value={filterModel}
                            onChange={(e) => setFilterModel(e.target.value)}
                        >
                            <option value="">Tất cả dòng xe</option>
                            {vehicleLines.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select 
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-medium outline-none focus:border-blue-600 text-slate-700"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="Đã ghép">Đã ghép</option>
                            <option value="Chưa ghép">Chưa ghép</option>
                            <option value="Đã hủy">Đã hủy</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="relative group/audit">
                            {isBackgroundAuditing && (
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 animate-pulse"></div>
                        )}
                        <button 
                            type="button" 
                            onClick={handleAudit}
                            className={`w-full mt-2 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all relative overflow-hidden ${
                                isBackgroundAuditing 
                                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-inner' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/10'
                            }`}
                        >
                            <div className="flex items-center gap-2 font-bold">
                                {isBackgroundAuditing ? (
                                    <i className="fas fa-radar fa-spin text-indigo-600"></i>
                                ) : (
                                    <i className="fas fa-shield-check text-emerald-500"></i>
                                )}
                                <span className="text-sm">Trợ Lý Kiểm Toán AI</span>
                            </div>
                            <div className="text-[10px] font-medium mt-1 flex items-center gap-1 opacity-80">
                                {isBackgroundAuditing ? (
                                    <span className="font-bold text-indigo-600 animate-pulse">Đang phân tích dữ liệu...</span>
                                ) : lastAuditTime ? (
                                    <span>Lần quét cuối: {lastAuditTime.toLocaleTimeString('vi-VN')}</span>
                                ) : (
                                    <span>Sẽ tự động quét sau 15s</span>
                                )}
                            </div>
                            {!isBackgroundAuditing && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full group-hover/audit:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                            )}
                        </button>
                        </div>
                        <div className="relative group/sync">
                            <button 
                                type="button" 
                                onClick={handleSyncEngineNumbers}
                                disabled={isSyncingEngine}
                                className={`w-full flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all relative overflow-hidden h-full ${
                                    isSyncingEngine 
                                        ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-inner' 
                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10'
                                }`}
                            >
                                <div className="flex items-center gap-2 font-bold">
                                    {isSyncingEngine ? (
                                        <i className="fas fa-spinner fa-spin text-blue-600"></i>
                                    ) : (
                                        <i className="fas fa-microchip text-blue-500"></i>
                                    )}
                                    <span className="text-xs">Đồng Bộ Số Máy</span>
                                </div>
                                <div className="text-[9px] font-medium mt-1 opacity-80 text-center">
                                    {isSyncingEngine ? 'Đang cập nhật...' : 'Cập nhật thủ công'}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    {filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            <i className="fas fa-search mb-2 text-2xl opacity-50"></i>
                            <p>Không tìm thấy đơn hàng</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-secondary px-2 py-2 space-y-1">
                            {filteredOrders.map(order => {
                                const isSelected = selectedOrderId === order['Số đơn hàng'];
                                return (
                                    <div
                                        key={order['Số đơn hàng']}
                                        onClick={(e) => {
                                            handleOrderSelect(order['Số đơn hàng']);
                                            copyWithFeedback(order['Tên khách hàng'] || order['Số đơn hàng'], e);
                                        }}
                                        className={`p-3 cursor-pointer transition-all duration-150 relative border-l-4 ${isSelected
                                            ? 'bg-slate-100/90 border-blue-600 font-semibold'
                                            : 'border-transparent hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <MarqueeText 
                                                    text={order['Tên khách hàng'] || '—'}
                                                    className="text-xs font-bold text-slate-900"
                                                />
                                            </div>
                                            <StatusBadge status={order['Kết quả']} size="sm" />
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-normal truncate">
                                            ĐH: {order['Số đơn hàng']} • {order['Dòng xe']} {order['Phiên bản']}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: Detail / Form Component (Zero-Scroll Auto-Fit Layout) */}
            <div className={`flex-1 flex flex-col bg-slate-50 min-w-0 h-full overflow-hidden relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedOrder ? (
                    <>
                        {/* Header Details (Compact Bar) */}
                        <div className="bg-white border-b border-slate-200 z-20 shadow-2xs shrink-0 px-4 py-2.5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                        onClick={() => setMobileView('list')}
                                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-90 transition-all"
                                    >
                                        <i className="fas fa-arrow-left text-xs"></i>
                                    </button>

                                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-xs">
                                        {selectedOrder['Tên khách hàng'].charAt(0)}
                                    </div>

                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <MarqueeText 
                                                    text={selectedOrder['Tên khách hàng'] || '—'}
                                                    className="text-sm font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                                    title="Click để sao chép"
                                                    onClick={(e) => { e.stopPropagation(); copyWithFeedback(selectedOrder['Tên khách hàng'], e); }}
                                                />
                                            </div>
                                            <StatusBadge status={selectedOrder['Kết quả'] || ''} size="sm" />
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-normal">
                                            <span><i className="fas fa-hashtag text-[9px] text-slate-400 mr-1"></i>{selectedOrder['Số đơn hàng']}</span>
                                            <span>•</span>
                                            <span><i className="fas fa-user-tie text-[9px] text-slate-400 mr-1"></i>{selectedOrder['Tên tư vấn bán hàng']}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 flex items-center gap-2">
                                    {!isInvoiced && (
                                        <Button 
                                            type="submit" 
                                            form="super-edit-form"
                                            variant="primary" 
                                            size="sm"
                                            className="font-bold shadow-xs bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white border-none py-2 px-4 rounded-xl whitespace-nowrap text-xs flex items-center gap-2"
                                            leftIcon={<i className="fas fa-save text-xs"></i>}
                                            isLoading={isSubmitting}
                                            disabled={isSubmitting}
                                        >
                                            ÉP LƯU & ĐỒNG BỘ
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Editable Form Content (Zero-Scroll Canvas) */}
                        <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden bg-slate-50">
                            {isInvoiced && (
                                <div className="bg-amber-50 text-amber-800 border border-amber-200/80 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0 mb-2">
                                    <i className="fas fa-lock text-amber-500 text-sm flex-shrink-0"></i> 
                                    <span>Đơn hàng đã xuất hóa đơn. Hệ thống khóa chỉnh sửa để bảo vệ dữ liệu.</span>
                                </div>
                            )}
                            <form id="super-edit-form" onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                                <fieldset disabled={isInvoiced} className="flex-1 flex flex-col justify-between h-full gap-2.5 disabled:opacity-80">
                                    
                                    {/* SECTION 1: CORE ORDER INFORMATION */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex-1 flex flex-col justify-center">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-clipboard-list text-blue-600 text-xs"></i>
                                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">1. Thông Tin Đơn Hàng & Khách Hàng</h3>
                                            </div>
                                            <span className="text-[9px] font-mono text-slate-400">THÔNG TIN CHÍNH</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Số Đơn Hàng</span>
                                                    <i className="fas fa-hashtag text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Số đơn hàng" value={formData["Số đơn hàng"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono font-bold text-blue-600`} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Tên Khách Hàng</span>
                                                    <i className="fas fa-user text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Tên khách hàng" value={formData["Tên khách hàng"] || ''} onChange={handleInputChange} className={`${inputClass} font-bold`} placeholder="Tên khách hàng..." />
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Tư Vấn Bán Hàng</span>
                                                    <i className="fas fa-user-tie text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Tên tư vấn bán hàng" value={formData["Tên tư vấn bán hàng"] || ''} onChange={handleInputChange} className={inputClass} placeholder="Tên TVBH..." />
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Ngày Cọc</span>
                                                    <i className="fas fa-calendar-alt text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Ngày cọc" type="datetime-local" value={formData["Ngày cọc"] || ''} onChange={handleInputChange} className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 2: VEHICLE CONFIGURATION */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex-1 flex flex-col justify-center">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-car text-purple-600 text-xs"></i>
                                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">2. Cấu Hình & Màu Sắc Xe</h3>
                                            </div>
                                            <span className="text-[9px] font-mono text-slate-400">SẢN PHẨM</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Dòng Xe</span>
                                                    <i className="fas fa-car-side text-[9px] text-slate-400"></i>
                                                </label>
                                                <select name="Dòng xe" value={formData["Dòng xe"] || ''} onChange={handleInputChange} className={`${inputClass} font-bold text-slate-800`}>
                                                    <option value="">Chọn dòng xe...</option>
                                                    {vehicleLines.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Phiên Bản</span>
                                                    <i className="fas fa-layer-group text-[9px] text-slate-400"></i>
                                                </label>
                                                <select name="Phiên bản" value={formData["Phiên bản"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Chọn phiên bản...</option>
                                                    {(formData["Dòng xe"] ? versionsMap[formData["Dòng xe"]] || allPossibleVersions : allPossibleVersions).map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Ngoại Thất</span>
                                                    <i className="fas fa-palette text-[9px] text-slate-400"></i>
                                                </label>
                                                <select name="Ngoại thất" value={formData["Ngoại thất"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Màu ngoại thất...</option>
                                                    {vehicleColors.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Nội Thất</span>
                                                    <i className="fas fa-couch text-[9px] text-slate-400"></i>
                                                </label>
                                                <select name="Nội thất" value={formData["Nội thất"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Màu nội thất...</option>
                                                    {availableInteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 3: TECHNICAL IDENTIFICATION & INVOICING */}
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex-[1.2] flex flex-col justify-center">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-barcode text-emerald-600 text-xs"></i>
                                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">3. Số Khung VIN, Số Máy & Hóa Đơn</h3>
                                            </div>
                                            <span className="text-[9px] font-mono text-slate-400">ĐỊNH DANH & HÓA ĐƠN</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-2">
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Số Khung (VIN)</span>
                                                    <i className="fas fa-barcode text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="VIN" value={formData["VIN"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono font-bold`} placeholder="Số khung VIN..." />
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Số Máy</span>
                                                    <i className="fas fa-cogs text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Số máy" value={formData["Số máy"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono font-bold`} placeholder="Số máy..." />
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Mã DMS</span>
                                                    <i className="fas fa-database text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Mã DMS" value={formData["Mã DMS"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono`} placeholder="Mã DMS..." />
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Kết Quả (TT ĐH)</span>
                                                    <i className="fas fa-flag text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Kết quả" value={formData["Kết quả"] || ''} onChange={handleInputChange} className={inputClass} placeholder="Trạng thái..." />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Ngày Xuất HĐ</span>
                                                    <i className="fas fa-calendar-check text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Ngày xuất hóa đơn" type="date" value={formData["Ngày xuất hóa đơn"] || ''} onChange={handleInputChange} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>
                                                    <span>Thời gian cần xe</span>
                                                    <i className="fas fa-clock text-[9px] text-slate-400"></i>
                                                </label>
                                                <input name="Thời gian cần xe" type="date" value={formData["Thời gian cần xe"] || ''} onChange={handleInputChange} className={inputClass} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClass}>
                                                    <span>Link Hóa Đơn (URL)</span>
                                                    <i className="fas fa-link text-[9px] text-slate-400"></i>
                                                </label>
                                                <div className="relative">
                                                    <input name="LinkHoaDonDaXuat" value={formData["LinkHoaDonDaXuat"] || ''} onChange={handleInputChange} className={`${inputClass} pr-16`} placeholder="https://..." />
                                                    {formData["LinkHoaDonDaXuat"] && (
                                                        <a 
                                                            href={formData["LinkHoaDonDaXuat"]} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
                                                        >
                                                            <span>Mở link</span>
                                                            <i className="fas fa-external-link-alt text-[7px]"></i>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </fieldset>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[400px]">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                            <i className="fas fa-shield-alt text-3xl"></i>
                        </div>
                        <h3 className="text-base font-bold text-slate-700 mb-1">Chưa chọn đơn hàng</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                            Sử dụng thanh tìm kiếm và chọn một đơn hàng từ danh sách bên trái để can thiệp Siêu Quản Trị.
                        </p>
                    </div>
                )}
            </div>

            {/* Audit Modal */}
            {showAuditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center shrink-0">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <i className="fas fa-satellite-dish"></i>
                                </div>
                                <div className="flex flex-col">
                                    <span>Hệ Thống Kiểm Toán Dữ Liệu</span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Deep Scan Protocol</span>
                                </div>
                            </h3>
                            <button onClick={() => setShowAuditModal(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors hover:text-slate-700">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
                            {isAuditing ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] relative overflow-hidden bg-slate-900">
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                    <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                        <div className="absolute inset-4 rounded-full border border-indigo-400/50 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                        <div className="w-20 h-20 bg-indigo-600 rounded-full shadow-[0_0_40px_rgba(79,70,229,0.8)] flex items-center justify-center animate-pulse z-10 relative overflow-hidden">
                                            <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
                                            <i className="fas fa-radar text-3xl text-white"></i>
                                        </div>
                                    </div>
                                    <h4 className="font-black text-2xl text-white mb-3 tracking-wide z-10 shadow-black drop-shadow-md">ĐANG ĐỐI CHIẾU DỮ LIỆU</h4>
                                    <p className="text-sm text-indigo-200 max-w-md text-center z-10 font-medium">
                                        AI đang kiểm tra chéo hàng nghìn bản ghi giữa Kho Xe, Đơn Hàng Hoạt Động và Lưu Trữ để tìm ra các lỗ hổng...
                                    </p>
                                    <div className="w-64 h-2 bg-slate-800 rounded-full mt-8 overflow-hidden z-10 border border-slate-700">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[pulse_1s_ease-in-out_infinite] w-full" style={{ transformOrigin: 'left', animation: 'scaleX 2s infinite alternate' }}></div>
                                    </div>
                                </div>
                            ) : auditIssues.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] py-12 px-6 text-center">
                                    <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[2rem] shadow-xl shadow-emerald-500/20 flex items-center justify-center mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                                        <i className="fas fa-shield-check text-6xl text-white"></i>
                                    </div>
                                    <h4 className="font-black text-2xl text-slate-800 mb-2">Hệ Sinh Thái Hoàn Hảo</h4>
                                    <p className="text-slate-500 mb-8 max-w-md">Thuật toán không tìm thấy bất kỳ sự sai lệch nào. Dữ liệu của bạn đang được bảo vệ tuyệt đối và đồng bộ hoàn toàn.</p>
                                    
                                    {auditStats && (
                                        <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <div className="text-2xl font-black text-slate-700 mb-1">{auditStats.totalStock}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Xe trong kho</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <div className="text-2xl font-black text-slate-700 mb-1">{auditStats.totalOrders}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn hàng HĐ</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <div className="text-2xl font-black text-slate-700 mb-1">{auditStats.totalArchived}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn Lưu trữ</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-rose-100 text-rose-600 flex items-center justify-center rounded-xl">
                                                <i className="fas fa-exclamation-triangle text-xl"></i>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg text-slate-800">Phát hiện {auditIssues.length} vấn đề!</h4>
                                                <p className="text-sm text-slate-500 font-medium">Hệ thống ghi nhận sự cố bất đồng bộ cần được xử lý ngay.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {auditIssues.map((issue, idx) => {
                                            const typeLabels: Record<string, string> = {
                                                duplicated_vin_in_stock: 'Trùng lặp Kho',
                                                ghost_car: 'Xe kẹt (Ghost)',
                                                zombie_car: 'Xe đã bán (Zombie)',
                                                cancelled_with_vin: 'Đơn hủy dính VIN',
                                                missing_car: 'Mất tích xe',
                                                unmatched_car_in_stock: 'Lệch trạng thái',
                                                owner_mismatch: 'Lệch chủ xe'
                                            };
                                            const severityColors: Record<string, string> = {
                                                high: 'bg-rose-500 text-white shadow-rose-500/30',
                                                medium: 'bg-amber-500 text-white shadow-amber-500/30',
                                                low: 'bg-blue-500 text-white shadow-blue-500/30'
                                            };
                                            const severityIcons: Record<string, string> = {
                                                high: 'fa-skull-crossbones',
                                                medium: 'fa-exclamation-circle',
                                                low: 'fa-info-circle'
                                            };

                                            return (
                                                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${issue.severity === 'high' ? 'bg-rose-500' : issue.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                                    
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${severityColors[issue.severity || 'medium']}`}>
                                                                <i className={`fas ${severityIcons[issue.severity || 'medium']}`}></i>
                                                                {issue.severity === 'high' ? 'Nghiêm trọng' : issue.severity === 'medium' ? 'Cảnh báo' : 'Ghi nhận'}
                                                            </span>
                                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                                {typeLabels[issue.type] || issue.type}
                                                            </span>
                                                        </div>
                                                        <div className="font-mono font-black text-sm text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                                                            {issue.vin}
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-sm text-slate-700 font-medium mb-4 leading-relaxed">
                                                        {issue.description}
                                                    </p>
                                                    
                                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                                            <i className="fas fa-magic"></i>
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-700">
                                                            <span className="text-slate-400 font-medium mr-1">Giải pháp AI:</span> 
                                                            {issue.actionLabel}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10">
                            <Button variant="secondary" onClick={() => setShowAuditModal(false)} className="font-bold">
                                KẾT THÚC
                            </Button>
                            {auditIssues.length > 0 && !isAuditing && (
                                <Button 
                                    variant="primary" 
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-black shadow-lg shadow-emerald-500/30 px-6"
                                    onClick={handleFixIssues}
                                    isLoading={isFixing}
                                    disabled={isFixing}
                                    leftIcon={<i className="fas fa-tools"></i>}
                                >
                                    SỬA TOÀN BỘ LỖI
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperManagementView;
