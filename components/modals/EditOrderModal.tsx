import React, { useState, useEffect, FormEvent } from 'react';
import { Order } from '../../types';
import { useVehicleConfig } from '../../hooks/useVehicleConfig';
import * as apiService from '../../services/apiService';
import moment from 'moment';

import Button from '../ui/Button';


interface EditOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string, updatedOrder?: any) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    order: Order | null;
    existingOrderNumbers: string[];
    isAdmin?: boolean;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onClose, onSuccess, showToast, order, existingOrderNumbers, isAdmin }) => {
    const [formData, setFormData] = useState<Partial<Order>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { versionsMap, allPossibleVersions, vehicleLines, vehicleColors, vehicleInteriors } = useVehicleConfig();
    const [availableInteriors, setAvailableInteriors] = useState<string[]>([]);

    useEffect(() => {
        if (order) {
            setFormData({
                "Tên khách hàng": order["Tên khách hàng"],
                "Số đơn hàng": order["Số đơn hàng"],
                "Dòng xe": order["Dòng xe"],
                "Phiên bản": order["Phiên bản"],
                "Ngoại thất": order["Ngoại thất"],
                "Nội thất": order["Nội thất"],
                "Ngày cọc": order["Ngày cọc"] ? moment(order["Ngày cọc"]).format('YYYY-MM-DDTHH:mm') : '',
                "Tên tư vấn bán hàng": order["Tên tư vấn bán hàng"],
            });
        }
    }, [order]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newState: Partial<Order> = { ...prev, [name]: value };
            if (name === 'Dòng xe') {
                newState['Phiên bản'] = '';
                newState['Ngoại thất'] = '';
                newState['Nội thất'] = '';
                const versions = versionsMap[value] || [];
                if (versions.length === 1) newState['Phiên bản'] = versions[0];
            }
            if (name === 'Phiên bản') {
                newState['Ngoại thất'] = '';
                newState['Nội thất'] = '';
            }
            return newState;
        });
    };

    useEffect(() => {
        setAvailableInteriors(vehicleInteriors);
    }, [vehicleInteriors]);


    if (!isOpen || !order) return null;

    const hasVin = !!order.VIN;
    const isConfigChanged = order && (
        formData['Dòng xe'] !== order['Dòng xe'] ||
        formData['Phiên bản'] !== order['Phiên bản'] ||
        formData['Ngoại thất'] !== order['Ngoại thất'] ||
        formData['Nội thất'] !== order['Nội thất']
    );

    const inputClass = "w-full bg-gray-50 border border-gray-200 text-slate-900 rounded-xl px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 font-medium text-sm";
    const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 ml-1";

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const requiredFields: (keyof Order)[] = ['Tên khách hàng', 'Số đơn hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất', 'Nội thất', 'Ngày cọc'];
        if (isAdmin) requiredFields.push('Tên tư vấn bán hàng');

        if (requiredFields.some(field => !formData[field])) {
            showToast('Thiếu Thông Tin', 'Vui lòng điền đầy đủ thông tin.', 'warning'); return;
        }

        const pattern = new RegExp("^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$");
        if (!pattern.test(formData['Số đơn hàng']!)) {
            showToast('Sai Định Dạng', 'Số đơn hàng không đúng định dạng. VD: N31913-VSO-25-04-0028', 'warning'); return;
        }
        if (existingOrderNumbers.includes(formData['Số đơn hàng']!)) {
            showToast('Đơn Hàng Trùng Lặp', `Số đơn hàng "${formData['Số đơn hàng']}" đã tồn tại.`, 'error'); return;
        }

        setIsSubmitting(true);
//         showToast('Đang cập nhật...', 'Vui lòng chờ trong giây lát.', 'loading');

        try {
            const changes: Partial<Order> = {};
            // Compare formData with the original order prop to find what changed
            Object.keys(formData).forEach(key => {
                const formKey = key as keyof Order;
                const originalValue = order[formKey];
                const newValue = formData[formKey];

                if (formKey === 'Ngày cọc') {
                    const oldDate = originalValue ? moment(originalValue).format('YYYY-MM-DDTHH:mm') : '';
                    const newDate = newValue ? moment(newValue as string).format('YYYY-MM-DDTHH:mm') : '';
                    if (oldDate !== newDate) {
                        changes[formKey] = new Date(newValue as string).toISOString();
                    }
                } else if (String(newValue || '') !== String(originalValue || '')) {
                    changes[formKey] = newValue;
                }
            });

            if (Object.keys(changes).length === 0) {
                showToast('Thông Báo', 'Không có thay đổi nào để lưu.', 'info');
                onClose();
                return;
            }

            let result;
            if (isConfigChanged) {
                // If config changed, we use a specialized function that handles VIN release
                // We also include other field changes in details if needed, 
                // but changeOrderConfiguration usually handles just config.
                // However, we can call updateOrderDetails for other fields first or combine.
                
                // Let's call changeOrderConfiguration first (it handles config + VIN release)
                const configData = {
                    "Dòng xe": formData["Dòng xe"],
                    "Phiên bản": formData["Phiên bản"],
                    "Ngoại thất": formData["Ngoại thất"],
                    "Nội thất": formData["Nội thất"]
                };
                
                result = await apiService.changeOrderConfiguration(order['Số đơn hàng'], configData);
                
                // Then handle other field changes (Customer Name, Order Number, etc.)
                const otherChanges: any = { ...changes };
                delete otherChanges["Dòng xe"];
                delete otherChanges["Phiên bản"];
                delete otherChanges["Ngoại thất"];
                delete otherChanges["Nội thất"];
                
                if (Object.keys(otherChanges).length > 0) {
                    await apiService.updateOrderDetails(order['Số đơn hàng'], otherChanges);
                }
            } else {
                result = await apiService.updateOrderDetails(order['Số đơn hàng'], changes);
            }

            onSuccess(result.message, result.updatedOrder);

        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định.";
            showToast('Cập Nhật Thất Bại', message, 'error', 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableVersions = formData['Dòng xe'] ? (versionsMap[formData['Dòng xe']] || allPossibleVersions) : [];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden" onClick={onClose}>
            {/* Full-Screen Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/20 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8 flex flex-col justify-center h-full md:h-auto pointer-events-none">
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col w-full max-h-[90vh] bg-white md:bg-white/95 md:backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl border border-white/20 pointer-events-auto animate-fade-in-scale-up relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:128px_128px] pointer-events-none"></div>
                    <header className="shrink-0 relative flex items-center justify-between p-4 md:p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-white to-blue-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                                <i className="fas fa-edit text-lg"></i>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Chỉnh Sửa Đơn Hàng</h2>
                                <p className="text-[11px] text-slate-500 font-medium">Cập nhật thông tin đơn hàng</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm">
                            <i className="fas fa-times"></i>
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar bg-white/50">
                        {hasVin && !isConfigChanged && (
                            <div className="p-3 mb-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3 shadow-sm">
                                <div className="w-6 h-6 bg-amber-100 rounded-full flex-shrink-0 flex items-center justify-center">
                                    <i className="fas fa-lock text-amber-600 text-xs"></i>
                                </div>
                                <div className="pt-0.5">
                                    <h4 className="font-bold text-amber-800 text-xs text-left">Đơn hàng đã ghép xe</h4>
                                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed text-left">
                                        Đơn hàng đã có VIN: <b>{order.VIN}</b>. Thông tin xe hiện đang được khóa. 
                                        Nếu bạn thay đổi cấu hình, VIN này sẽ được giải phóng.
                                    </p>
                                </div>
                            </div>
                        )}

                        {hasVin && isConfigChanged && (
                            <div className="p-3 mb-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3 shadow-sm animate-pulse-subtle">
                                <div className="w-6 h-6 bg-red-100 rounded-full flex-shrink-0 flex items-center justify-center">
                                    <i className="fas fa-exclamation-triangle text-red-600 text-xs"></i>
                                </div>
                                <div className="pt-0.5">
                                    <h4 className="font-bold text-red-800 text-xs text-left">CẢNH BÁO GIẢI PHÓNG XE</h4>
                                    <p className="text-xs text-red-700 mt-0.5 leading-relaxed text-left">
                                        Bạn đang thay đổi cấu hình cho đơn hàng <b>đã ghép VIN ({order.VIN})</b>. 
                                        Khi lưu, xe này sẽ được <b>nhả lại vào kho</b> và đơn hàng sẽ về trạng thái chờ ghép.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                            <div className="md:col-span-2 pb-2 border-b border-gray-100">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Thông tin khách hàng</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {isAdmin && (
                                        <div className="md:col-span-2">
                                            <label className={labelClass} htmlFor="Tên tư vấn bán hàng">Tư vấn bán hàng (Admin Only)</label>
                                            <div className="relative">
                                                <i className="fas fa-user-tie absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                                <input id="Tên tư vấn bán hàng" type="text" name="Tên tư vấn bán hàng" value={formData["Tên tư vấn bán hàng"] || ''} onChange={handleInputChange} required className={inputClass} />
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className={labelClass} htmlFor="Tên khách hàng">Tên khách hàng</label>
                                        <div className="relative">
                                            <i className="fas fa-user absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                            <input id="Tên khách hàng" type="text" name="Tên khách hàng" value={formData["Tên khách hàng"] || ''} onChange={handleInputChange} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} required className={inputClass} placeholder="VD: NGUYEN VAN A" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="Số đơn hàng">Số đơn hàng</label>
                                        <div className="relative">
                                            <i className="fas fa-barcode absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                            <input id="Số đơn hàng" type="text" name="Số đơn hàng" value={formData["Số đơn hàng"] || ''} onChange={handleInputChange} required pattern="^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$" title="Định dạng: Nxxxxx-XXX-yy-mm-zzzz" className={inputClass} placeholder="VD: N12345-VSO-24-01-0001" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 mt-1">Thông tin xe</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass} htmlFor="Dòng xe">Dòng xe</label>
                                        <div className="relative">
                                            <i className="fas fa-car absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                            <select id="Dòng xe" name="Dòng xe" value={formData["Dòng xe"] || ''} onChange={handleInputChange} required className={`${inputClass} appearance-none cursor-pointer`}><option value="" disabled>Chọn dòng xe</option>{vehicleLines.map(car => <option key={car} value={car}>{car}</option>)}</select>
                                            <i className="fas fa-chevron-down absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="Phiên bản">Phiên bản</label>
                                        <div className="relative">
                                            <i className="fas fa-code-branch absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                            <select id="Phiên bản" name="Phiên bản" value={formData["Phiên bản"] || ''} onChange={handleInputChange} required disabled={!formData["Dòng xe"]} className={`${inputClass} appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400`}><option value="" disabled>Chọn phiên bản</option>{availableVersions.map(v => <option key={v} value={v}>{v}</option>)}</select>
                                            <i className="fas fa-chevron-down absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="Ngoại thất">Màu ngoại thất</label>
                                        <div className="relative">
                                            <i className="fas fa-palette absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                            <select id="Ngoại thất" name="Ngoại thất" value={formData["Ngoại thất"] || ''} onChange={handleInputChange} required disabled={!formData["Phiên bản"]} className={`${inputClass} appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400`}><option value="" disabled>Chọn màu ngoại thất</option>{vehicleColors.map(color => <option key={color} value={color}>{color}</option>)}</select>
                                            <i className="fas fa-chevron-down absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor="Nội thất">Màu nội thất</label>
                                        <div className="relative">
                                            <i className="fas fa-chair absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                            <select id="Nội thất" name="Nội thất" value={formData["Nội thất"] || ''} onChange={handleInputChange} required disabled={!formData["Phiên bản"]} className={`${inputClass} appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400`}><option value="" disabled>Chọn nội thất</option>{availableInteriors.map(color => <option key={color} value={color}>{color}</option>)}</select>
                                            <i className="fas fa-chevron-down absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-2 border-t border-gray-100">
                                <label className={labelClass} htmlFor="Ngày cọc">Thời gian đặt cọc</label>
                                <div className="relative">
                                    <i className="fas fa-calendar-alt absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400 text-xs"></i>
                                    <input id="Ngày cọc" name="Ngày cọc" type="datetime-local" value={formData["Ngày cọc"] || ''} onChange={handleInputChange} required className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`} disabled={!isAdmin} />
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="shrink-0 p-3 md:p-4 border-t border-blue-200/30 bg-gradient-to-r from-blue-50/95 via-white/95 to-blue-50/95 backdrop-blur-xl flex items-center justify-between z-10 shadow-inner">
                        <Button type="button" onClick={onClose} variant="secondary" size="sm">
                            Hủy bỏ
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} isLoading={isSubmitting} leftIcon={!isSubmitting ? <i className="fas fa-save"></i> : undefined}>
                            Lưu Thay Đổi
                        </Button>
                    </footer>
                </form>
            </div>
        </div>
    );
};
export default EditOrderModal;