import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { Order } from '../../types';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import * as apiService from '../../services/apiService';
import moment from 'moment';

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
        let result = allOrders;

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

    const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-[13px]";
    const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-0.5 shadow-sm";

    return (
        <div className="flex h-full bg-slate-50 rounded-2xl shadow-md border border-border-primary overflow-hidden relative isolate">
            <AnimatedBackground />

            {/* Column 1: List / Search */}
            <div className={`w-full md:w-80 lg:w-[380px] flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 backdrop-blur-md relative z-10 transition-transform duration-300 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Search & Filters Header */}
                <div className="shrink-0 p-3 border-b border-border-secondary bg-white space-y-2">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i className="fas fa-search text-slate-400 group-focus-within:text-red-500 transition-colors text-sm"></i>
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm Số ĐH, VIN, Máy, KH..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium placeholder:text-slate-400"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <select 
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-red-500"
                            value={filterModel}
                            onChange={(e) => setFilterModel(e.target.value)}
                        >
                            <option value="">Tất cả dòng xe</option>
                            {vehicleLines.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select 
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-red-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="Đã ghép">Đã ghép</option>
                            <option value="Chưa ghép">Chưa ghép</option>
                            <option value="Đã xuất hóa đơn">Đã xuất HĐ</option>
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
                                        onClick={() => handleOrderSelect(order['Số đơn hàng'])}
                                        className={`px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 group relative border ${isSelected
                                            ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-red-200 z-10 scale-[1.02]'
                                            : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className={`text-[9px] font-black font-mono uppercase tracking-widest px-1.5 py-0.5 rounded transition-colors ${isSelected ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {order['Số đơn hàng']}
                                            </div>
                                            <StatusBadge status={order['Kết quả'] || ''} size="sm" />
                                        </div>
                                        
                                        <div className="flex items-center justify-between gap-3 mt-1.5">
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-bold truncate mb-0.5 transition-colors ${isSelected ? 'text-red-600' : 'text-slate-700 group-hover:text-red-500'}`}>
                                                    {order['Tên khách hàng']}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 truncate">
                                                    <span>{order['Dòng xe']} - {order['Phiên bản']}</span>
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-mono mt-1">
                                                    VIN: <span className={order['VIN'] ? 'text-slate-600 font-bold' : ''}>{order['VIN'] || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: Detail / Form Component */}
            <div className={`flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedOrder ? (
                    <>
                        {/* Header Details */}
                        <div className="bg-white border-b border-gray-100/80 z-20 shadow-sm sticky top-0 shrink-0">
                            <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                        onClick={() => setMobileView('list')}
                                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-90 transition-all"
                                    >
                                        <i className="fas fa-arrow-left text-xs"></i>
                                    </button>

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100/50 flex items-center justify-center text-red-600 font-black text-xl flex-shrink-0 shadow-sm ring-2 ring-white">
                                        {selectedOrder['Tên khách hàng'].charAt(0)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-lg font-black text-slate-800 truncate cursor-pointer hover:text-red-600 transition-colors" title="Click để sao chép" onClick={(e) => { e.stopPropagation(); copyWithFeedback(selectedOrder['Tên khách hàng'], e); }}>
                                                {selectedOrder['Tên khách hàng']}
                                            </h2>
                                            <StatusBadge status={selectedOrder['Kết quả'] || ''} size="sm" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <i className="fas fa-user-tie text-[10px] opacity-60"></i>
                                            {selectedOrder['Tên tư vấn bán hàng']}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-xl border border-slate-100">
                                    {!isInvoiced && (
                                        <Button 
                                            type="submit" 
                                            form="super-edit-form"
                                            variant="primary" 
                                            size="sm"
                                            className="font-bold shadow-md shadow-red-500/20 bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white border-none py-2 px-4 whitespace-nowrap"
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

                        {/* Editable Form Content */}
                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-3">
                                {isInvoiced && (
                                    <div className="bg-amber-50 text-amber-700 border border-amber-200 p-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-3 shadow-sm">
                                        <i className="fas fa-lock text-amber-500 text-sm"></i> 
                                        Đơn hàng này đã hoàn tất xuất hóa đơn. Hệ thống khóa chức năng chỉnh sửa để đảm bảo an toàn dữ liệu.
                                    </div>
                                )}
                                <form id="super-edit-form" onSubmit={handleSubmit} className="space-y-3 pb-8">
                                    <fieldset disabled={isInvoiced} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 relative overflow-hidden group disabled:opacity-80">
                                        {/* Subtle background element */}
                                        <div className="absolute right-0 top-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-20 pointer-events-none"></div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-4 relative z-10">
                                            
                                            {/* Row 1: Core Order Context */}
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Số Đơn Hàng</label>
                                                <input name="Số đơn hàng" value={formData["Số đơn hàng"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono font-bold`} />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Tên Khách Hàng</label>
                                                <input name="Tên khách hàng" value={formData["Tên khách hàng"] || ''} onChange={handleInputChange} className={inputClass} placeholder="Nhập tên..." />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Tư Vấn Bán Hàng</label>
                                                <input name="Tên tư vấn bán hàng" value={formData["Tên tư vấn bán hàng"] || ''} onChange={handleInputChange} className={inputClass} placeholder="Tên TVBH..." />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Ngày Cọc</label>
                                                <input name="Ngày cọc" type="datetime-local" value={formData["Ngày cọc"] || ''} onChange={handleInputChange} className={inputClass} />
                                            </div>

                                            {/* Divider */}
                                            <div className="md:col-span-4 border-b border-slate-100/80 my-0.5"></div>

                                            {/* Row 2: Vehicle Configuration */}
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Dòng Xe</label>
                                                <select name="Dòng xe" value={formData["Dòng xe"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Chọn dòng xe...</option>
                                                    {vehicleLines.map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Phiên Bản</label>
                                                <select name="Phiên bản" value={formData["Phiên bản"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Chọn phiên bản...</option>
                                                    {(formData["Dòng xe"] ? versionsMap[formData["Dòng xe"]] || allPossibleVersions : allPossibleVersions).map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Ngoại Thất</label>
                                                <select name="Ngoại thất" value={formData["Ngoại thất"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Màu ngoại thất...</option>
                                                    {vehicleColors.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Nội Thất</label>
                                                <select name="Nội thất" value={formData["Nội thất"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Màu nội thất...</option>
                                                    {availableInteriors.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>

                                            {/* Divider */}
                                            <div className="md:col-span-4 border-b border-slate-100/80 my-0.5"></div>

                                            {/* Row 3: Technical & Status Details */}
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Số Khung (VIN)</label>
                                                <input name="VIN" value={formData["VIN"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono`} placeholder="Nhập số khung..." />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Số Máy</label>
                                                <input name="Số máy" value={formData["Số máy"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono`} placeholder="Nhập số máy..." />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Mã DMS</label>
                                                <input name="Mã DMS" value={formData["Mã DMS"] || ''} onChange={handleInputChange} className={`${inputClass} font-mono`} placeholder="Nhập mã DMS..." />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Kết Quả (TT ĐH)</label>
                                                <input name="Kết quả" value={formData["Kết quả"] || ''} onChange={handleInputChange} className={inputClass} placeholder="Trạng thái..." />
                                            </div>


                                            {/* Row 4: Invoice specifics */}
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Ngày Xuất HĐ</label>
                                                <input name="Ngày xuất hóa đơn" type="date" value={formData["Ngày xuất hóa đơn"] || ''} onChange={handleInputChange} className={inputClass} />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Thời gian cần xe</label>
                                                <input name="Thời gian cần xe" type="date" value={formData["Thời gian cần xe"] || ''} onChange={handleInputChange} className={inputClass} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClass}>Link Hóa Đơn (URL)</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <i className="fas fa-link text-slate-300 text-xs"></i>
                                                    </div>
                                                    <input name="LinkHoaDonDaXuat" value={formData["LinkHoaDonDaXuat"] || ''} onChange={handleInputChange} className={`${inputClass} pl-8`} placeholder="https://..." />
                                                </div>
                                            </div>

                                        </div>
                                    </fieldset>
                                </form>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[400px]">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                            <i className="fas fa-shield-alt text-4xl opacity-50"></i>
                        </div>
                        <h3 className="text-lg font-black text-slate-700 mb-2">Chưa chọn đơn hàng</h3>
                        <p className="text-sm text-slate-400 max-w-sm">
                            Hãy sử dụng thanh tìm kiếm và chọn một đơn hàng từ danh sách bên trái để can thiệp Siêu Quản Trị.
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
