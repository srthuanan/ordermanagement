import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';

interface VcRequestPayload {
    orderNumber: string;
    customerType: 'personal' | 'company';
    dmsCode?: string;
    files: {
        idCardFront?: File | null;
        idCardBack?: File | null;
        businessLicense?: File | null;
        regFront?: File | null;
        regBack?: File | null;
    };
}

interface RequestVcModalProps {
    order: Order | null;
    onClose: () => void;
    onSubmit: (payload: VcRequestPayload, vin?: string) => Promise<boolean>;
}

const RequestVcModal: React.FC<RequestVcModalProps> = ({ order, onClose, onSubmit }) => {
    const [customerType, setCustomerType] = useState<'personal' | 'company'>('personal');
    const [dmsCode, setDmsCode] = useState('');
    const [idCardFront, setIdCardFront] = useState<File | null>(null);
    const [idCardBack, setIdCardBack] = useState<File | null>(null);
    const [businessLicense, setBusinessLicense] = useState<File | null>(null);
    const [regFront, setRegFront] = useState<File | null>(null);
    const [regBack, setRegBack] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!order) {
            // Reset state when modal is closed/order is null
            setCustomerType('personal');
            setDmsCode('');
            setIdCardFront(null);
            setIdCardBack(null);
            setBusinessLicense(null);
            setRegFront(null);
            setRegBack(null);
            setIsSubmitting(false);
        }
    }, [order]);

    if (!order) return null;

    const isFormValid = () => {
        if (!regFront || !regBack) return false;
        if (customerType === 'personal') {
            return idCardFront && idCardBack;
        }
        if (customerType === 'company') {
            return businessLicense && dmsCode.trim() !== '';
        }
        return false;
    };

    const handleSubmit = async () => {
        if (!isFormValid()) {
            alert("Vui lòng điền đầy đủ thông tin và tải lên tất cả các tệp cần thiết.");
            return;
        }

        setIsSubmitting(true);
        const payload: VcRequestPayload = {
            orderNumber: order["Số đơn hàng"],
            customerType,
            files: {
                idCardFront,
                idCardBack,
                businessLicense,
                regFront,
                regBack,
            },
        };
        if (customerType === 'company') {
            payload.dmsCode = dmsCode;
        }

        const success = await onSubmit(payload, order.VIN);
        if (!success) {
            setIsSubmitting(false); // Only re-enable button on failure
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-3xl rounded-2xl shadow-xl animate-fade-in-scale-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 relative flex flex-col items-center justify-center p-6 text-center border-b border-border-primary">
                    <h2 className="text-xl font-bold text-gradient">Yêu Cầu Cấp VinClub</h2>
                    <p className="text-sm text-text-secondary mt-1">Cung cấp chứng từ để tạo tài khoản VinClub cho khách hàng.</p>
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                
                <main className="p-6 space-y-6 flex-grow overflow-y-auto">
                    <div className="p-4 bg-surface-ground rounded-lg border border-border-primary text-sm">
                        Đang yêu cầu cho SĐH: <strong className="font-mono">{order["Số đơn hàng"]}</strong> - KH: <strong>{order["Tên khách hàng"]}</strong>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Loại khách hàng</label>
                        <div className="flex gap-4 p-1 bg-surface-ground rounded-lg border border-border-primary w-fit">
                            <button onClick={() => setCustomerType('personal')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${customerType === 'personal' ? 'bg-white shadow-sm text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                <i className="fas fa-user mr-2"></i>Cá Nhân
                            </button>
                            <button onClick={() => setCustomerType('company')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${customerType === 'company' ? 'bg-white shadow-sm text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                <i className="fas fa-building mr-2"></i>Công Ty
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        {customerType === 'personal' ? (
                            <>
                                <SimpleFileUpload id="cccd-front" label="CCCD Mặt Trước" onFileSelect={setIdCardFront} required accept="image/*" />
                                <SimpleFileUpload id="cccd-back" label="CCCD Mặt Sau" onFileSelect={setIdCardBack} required accept="image/*" />
                            </>
                        ) : (
                            <>
                                <SimpleFileUpload id="biz-license" label="Giấy Phép Kinh Doanh" onFileSelect={setBusinessLicense} required accept="image/*" />
                                <div>
                                    <label htmlFor="dms-code" className="block text-sm font-medium text-text-primary mb-2">Mã KH DMS <span className="text-danger">*</span></label>
                                    <input 
                                        id="dms-code"
                                        type="text"
                                        value={dmsCode}
                                        onChange={e => setDmsCode(e.target.value)}
                                        className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input"
                                        placeholder="Nhập mã khách hàng DMS"
                                        required
                                    />
                                </div>
                            </>
                        )}
                        <SimpleFileUpload id="reg-front" label="Cavet Xe Mặt Trước" onFileSelect={setRegFront} required accept="image/*" />
                        <SimpleFileUpload id="reg-back" label="Cavet Xe Mặt Sau" onFileSelect={setRegBack} required accept="image/*" />
                    </div>
                </main>
                
                <footer className="flex-shrink-0 p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button onClick={handleSubmit} disabled={!isFormValid() || isSubmitting} className="btn-primary">
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</> : <><i className="fas fa-paper-plane mr-2"></i> Gửi Yêu Cầu</>}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default RequestVcModal;