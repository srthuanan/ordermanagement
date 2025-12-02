import React, { useState, useEffect, FormEvent } from 'react';
import { Order } from '../../types';
import { versionsMap, allPossibleVersions, defaultExteriors, interiorColorRules } from '../../constants';
import * as apiService from '../../services/apiService';
import moment from 'moment';

import { useModalBackground } from '../../utils/styleUtils';
import Button from '../ui/Button';

const InputGroup: React.FC<{ icon: string; children: React.ReactNode; label: string; htmlFor: string; }> = ({ icon, children, label, htmlFor }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        <div className="relative">
            <i className={`fas ${icon} absolute top-1/2 left-4 -translate-y-1/2 text-slate-500 peer-focus:text-accent-primary transition-colors text-base z-10`}></i>
            {children}
        </div>
    </div>
);

interface EditOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    order: Order | null;
    existingOrderNumbers: string[];
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ isOpen, onClose, onSuccess, showToast, order, existingOrderNumbers }) => {
    const [formData, setFormData] = useState<Partial<Order>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableInteriors, setAvailableInteriors] = useState<string[]>(defaultExteriors);
    const bgStyle = useModalBackground();

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
                if (value === 'VF 3') newState['Phiên bản'] = 'Base';
                else if (value === 'VF 5') newState['Phiên bản'] = 'Plus';
            }
            if (name === 'Phiên bản') {
                newState['Ngoại thất'] = '';
                newState['Nội thất'] = '';
            }
            return newState;
        });
    };

    useEffect(() => {
        const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban } = formData;
        if (!dong_xe) { setAvailableInteriors(defaultExteriors); return; }
        const lowerDongXe = (dong_xe as string).toLowerCase();
        const lowerPhienBan = (phien_ban as string).toLowerCase();
        let interiors = defaultExteriors;
        for (const rule of interiorColorRules) {
            if (rule.models.includes(lowerDongXe) && (!rule.versions || rule.versions.includes(lowerPhienBan))) {
                interiors = rule.colors; break;
            }
        }
        setAvailableInteriors(interiors);
        if (interiors.length === 1 && formData['Nội thất'] !== interiors[0]) {
            setFormData(prev => ({ ...prev, 'Nội thất': interiors[0] }));
        }
    }, [formData['Dòng xe'], formData['Phiên bản']]);


    if (!isOpen || !order) return null;

    const isPaired = order['Kết quả']?.toLowerCase().includes('đã ghép');
    const inputClass = "peer w-full pl-11 pr-4 py-2.5 rounded-lg focus:outline-none transition-all placeholder:text-text-placeholder futuristic-input";

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const requiredFields: (keyof Order)[] = ['Tên khách hàng', 'Số đơn hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất', 'Nội thất', 'Ngày cọc'];
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
        showToast('Đang cập nhật...', 'Vui lòng chờ trong giây lát.', 'loading');

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

            const result = await apiService.updateOrderDetails(order['Số đơn hàng'], changes);
            onSuccess(result.message);

        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định.";
            showToast('Cập Nhật Thất Bại', message, 'error', 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableVersions = formData['Dòng xe'] ? (versionsMap[formData['Dòng xe'] as keyof typeof versionsMap] || allPossibleVersions) : [];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} style={bgStyle}>
                <header className="flex items-center justify-between p-5 border-b border-border-primary">
                    <h2 className="text-xl font-bold text-text-primary">Chỉnh Sửa Đơn Hàng</h2>
                    <button type="button" onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>

                <main className="p-6 space-y-4 overflow-y-auto">
                    {isPaired && (
                        <div className="p-3 mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 flex items-start gap-3 shadow-sm">
                            <i className="fas fa-info-circle text-amber-500 text-lg mt-1"></i>
                            <div>
                                <h4 className="font-bold text-amber-700 text-sm">Đơn hàng đã ghép xe</h4>
                                <p className="text-xs text-amber-600 mt-1">
                                    Thông tin xe (Dòng xe, Phiên bản, Màu sắc) không thể thay đổi. Vui lòng "Hủy ghép" nếu muốn thay đổi.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup icon="fa-user-tie" label="Tên khách hàng" htmlFor="Tên khách hàng"><input id="Tên khách hàng" type="text" name="Tên khách hàng" value={formData["Tên khách hàng"] || ''} onChange={handleInputChange} onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} required className={inputClass} placeholder="VD: NGUYEN VAN A" /></InputGroup>
                        <InputGroup icon="fa-barcode" label="Số đơn hàng" htmlFor="Số đơn hàng"><input id="Số đơn hàng" type="text" name="Số đơn hàng" value={formData["Số đơn hàng"] || ''} onChange={handleInputChange} required pattern="^N[0-9]{5}-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{4}$" title="Định dạng: Nxxxxx-XXX-yy-mm-zzzz" onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Số đơn hàng không đúng định dạng.')} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} className={inputClass} placeholder="VD: N12345-VSO-24-01-0001" /></InputGroup>
                        <InputGroup icon="fa-car" label="Dòng xe" htmlFor="Dòng xe"><select id="Dòng xe" name="Dòng xe" value={formData["Dòng xe"] || ''} onChange={handleInputChange} required className={`${inputClass} futuristic-select disabled:opacity-50`} disabled={isPaired}><option value="" disabled>Chọn dòng xe</option>{Object.keys(versionsMap).map(car => <option key={car} value={car}>{car}</option>)}</select></InputGroup>
                        <InputGroup icon="fa-sitemap" label="Phiên bản" htmlFor="Phiên bản"><select id="Phiên bản" name="Phiên bản" value={formData["Phiên bản"] || ''} onChange={handleInputChange} required disabled={!formData["Dòng xe"] || isPaired} className={`${inputClass} futuristic-select disabled:opacity-50`}><option value="" disabled>Chọn phiên bản</option>{availableVersions.map(v => <option key={v} value={v}>{v}</option>)}</select></InputGroup>
                        <InputGroup icon="fa-palette" label="Ngoại thất" htmlFor="Ngoại thất"><select id="Ngoại thất" name="Ngoại thất" value={formData["Ngoại thất"] || ''} onChange={handleInputChange} required disabled={!formData["Phiên bản"] || isPaired} className={`${inputClass} futuristic-select disabled:opacity-50`}><option value="" disabled>Chọn màu ngoại thất</option>{defaultExteriors.map(color => <option key={color} value={color}>{color}</option>)}</select></InputGroup>
                        <InputGroup icon="fa-chair" label="Nội thất" htmlFor="Nội thất"><select id="Nội thất" name="Nội thất" value={formData["Nội thất"] || ''} onChange={handleInputChange} required disabled={!formData["Phiên bản"] || isPaired} className={`${inputClass} futuristic-select disabled:opacity-50`}><option value="" disabled>Chọn nội thất</option>{availableInteriors.map(color => <option key={color} value={color}>{color}</option>)}</select></InputGroup>
                        <div className="md:col-span-2">
                            <InputGroup icon="fa-calendar-alt" label="Ngày cọc" htmlFor="Ngày cọc">
                                <input id="Ngày cọc" name="Ngày cọc" type="datetime-local" value={formData["Ngày cọc"] || ''} onChange={handleInputChange} required className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`} disabled />
                            </InputGroup>
                        </div>
                    </div>
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-end items-center gap-3 bg-surface-ground rounded-b-2xl">
                    <Button onClick={onClose} variant="secondary" disabled={isSubmitting} leftIcon={<i className="fas fa-times"></i>}>Hủy</Button>
                    <Button onClick={handleSubmit} variant="primary" isLoading={isSubmitting} leftIcon={<i className="fas fa-save"></i>}>Lưu Thay Đổi</Button>
                </footer>
            </form>
        </div>
    );
};

export default EditOrderModal;