import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { Order } from '../../types';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { versionsMap, allPossibleVersions, defaultExteriors, defaultInteriors, interiorColorRules } from '../../constants';
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
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultInteriors);

    const [filterModel, setFilterModel] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

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
                const versions = versionsMap[value as keyof typeof versionsMap] || [];
                if (versions.length === 1) newState['Phiên bản'] = versions[0];
            }
            return newState;
        });
    };

    useEffect(() => {
        const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban } = formData;
        if (!dong_xe) { setAvailableInteriors(defaultInteriors); return; }
        const lowerDongXe = (dong_xe as string).toLowerCase();
        const lowerPhienBan = (phien_ban as string).toLowerCase();
        let interiors = defaultInteriors;
        for (const rule of interiorColorRules) {
            if (rule.models.includes(lowerDongXe) && (!rule.versions || rule.versions.includes(lowerPhienBan))) {
                interiors = rule.colors; break;
            }
        }
        setAvailableInteriors(interiors);
    }, [formData['Dòng xe'], formData['Phiên bản']]);

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
                            {Object.keys(versionsMap).map(m => <option key={m} value={m}>{m}</option>)}
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
                                                    {Object.keys(versionsMap).map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Phiên Bản</label>
                                                <select name="Phiên bản" value={formData["Phiên bản"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Chọn phiên bản...</option>
                                                    {(formData["Dòng xe"] ? versionsMap[formData["Dòng xe"] as keyof typeof versionsMap] || allPossibleVersions : allPossibleVersions).map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className={labelClass}>Ngoại Thất</label>
                                                <select name="Ngoại thất" value={formData["Ngoại thất"] || ''} onChange={handleInputChange} className={inputClass}>
                                                    <option value="">Màu ngoại thất...</option>
                                                    {defaultExteriors.map(c => <option key={c} value={c}>{c}</option>)}
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
        </div>
    );
};

export default SuperManagementView;
