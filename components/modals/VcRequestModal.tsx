import React, { useState, useMemo } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';

type CustomerType = 'Cá nhân' | 'Công ty';

export interface VcRequestData {
    customerType: CustomerType;
    dmsCode?: string;
    cccdFront?: File | null;
    cccdBack?: File | null;
    cavetFront: File;
    cavetBack: File;
    gpkd?: File | null;
}

interface VcRequestModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, data: VcRequestData) => void;
}

const InfoRow: React.FC<{ label: string; value: string; icon: string; isMono?: boolean }> = ({ label, value, icon, isMono = false }) => (
    <div className="flex items-center gap-3 text-sm">
        <i className={`fas ${icon} fa-fw w-4 text-center text-accent-secondary`}></i>
        <span className="text-text-secondary">{label}:</span>
        <span className={`font-semibold text-text-primary ${isMono ? 'font-mono' : ''}`}>{value}</span>
    </div>
);

const VcRequestModal: React.FC<VcRequestModalProps> = ({ order, onClose, onConfirm }) => {
    const [customerType, setCustomerType] = useState<CustomerType>('Cá nhân');
    const [dmsCode, setDmsCode] = useState('');
    const [cccdFront, setCccdFront] = useState<File | null>(null);
    const [cccdBack, setCccdBack] = useState<File | null>(null);
    const [cavetFront, setCavetFront] = useState<File | null>(null);
    const [cavetBack, setCavetBack] = useState<File | null>(null);
    const [gpkd, setGpkd] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isFormValid = useMemo(() => {
        if (!cavetFront || !cavetBack) return false;
        if (customerType === 'Cá nhân') {
            return !!cccdFront && !!cccdBack;
        }
        if (customerType === 'Công ty') {
            return !!gpkd && dmsCode.trim() !== '';
        }
        return false;
    }, [customerType, dmsCode, cccdFront, cccdBack, cavetFront, cavetBack, gpkd]);


    const handleSubmit = () => {
        if (!isFormValid) {
            // This case should ideally not happen due to the disabled button, but as a safeguard:
            alert("Vui lòng điền đầy đủ thông tin và tải lên các tệp bắt buộc.");
            return;
        }
        
        let submissionData: VcRequestData;

        if (customerType === 'Cá nhân' && cccdFront && cccdBack) {
            submissionData = { customerType, cccdFront, cccdBack, cavetFront: cavetFront!, cavetBack: cavetBack! };
        } else if (customerType === 'Công ty' && gpkd) {
            submissionData = { customerType, gpkd, dmsCode, cavetFront: cavetFront!, cavetBack: cavetBack! };
        } else {
            return; // Should not happen
        }
        
        setIsSubmitting(true);
        onConfirm(order, submissionData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <header className="relative flex flex-col items-center justify-center p-6 text-center bg-surface-card border-b border-border-primary">
                    <div className="animate-fade-in-down">
                        <h2 className="text-xl font-bold text-gradient">Yêu Cầu Cấp Voucher VinClub</h2>
                        <p className="text-sm text-text-secondary mt-1">Cung cấp chứng từ để đăng ký VinClub cho khách hàng.</p>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <main className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                     {/* Order Summary */}
                    <div className="p-4 bg-surface-ground rounded-lg border border-border-primary space-y-2">
                        <h3 className="font-semibold text-text-primary text-base mb-2">Tóm tắt yêu cầu</h3>
                        <InfoRow label="Số đơn hàng" value={order["Số đơn hàng"]} icon="fa-barcode" isMono />
                        <InfoRow label="Khách hàng" value={order["Tên khách hàng"]} icon="fa-user" />
                        <InfoRow label="Số VIN" value={order.VIN || 'N/A'} icon="fa-car" isMono />
                    </div>

                    {/* Customer Info */}
                    <div>
                        <h3 className="font-semibold text-text-primary text-base mb-3">Thông tin khách hàng</h3>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center cursor-pointer p-2">
                                <input type="radio" name="customerType" value="Cá nhân" checked={customerType === 'Cá nhân'} onChange={() => setCustomerType('Cá nhân')} className="focus:ring-accent-primary h-4 w-4 text-accent-primary border-border-secondary"/>
                                <span className="ml-2 text-text-primary">Cá nhân</span>
                            </label>
                             <label className="flex items-center cursor-pointer p-2">
                                <input type="radio" name="customerType" value="Công ty" checked={customerType === 'Công ty'} onChange={() => setCustomerType('Công ty')} className="focus:ring-accent-primary h-4 w-4 text-accent-primary border-border-secondary"/>
                                <span className="ml-2 text-text-primary">Công ty</span>
                            </label>
                        </div>
                        {customerType === 'Công ty' && (
                            <div className="animate-fade-in-up">
                                <label htmlFor="dms_customer_code_input" className="block text-sm font-medium text-text-primary mb-2">
                                    Mã khách hàng DMS <span className="text-danger">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="dms_customer_code_input" 
                                    value={dmsCode} 
                                    onChange={e => setDmsCode(e.target.value)} 
                                    placeholder="Nhập mã KH DMS..." 
                                    className="w-full bg-surface-card border border-border-primary rounded-lg shadow-sm p-2.5 focus:ring-accent-primary focus:border-accent-primary transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* File Uploads */}
                    <div>
                        <h3 className="font-semibold text-text-primary text-base mb-3">Tải lên chứng từ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {customerType === 'Cá nhân' ? (
                                <>
                                    <SimpleFileUpload id="cccd_front_file_input" label="1. CCCD/CMND (Mặt trước)" onFileSelect={setCccdFront} required accept="image/*" />
                                    <SimpleFileUpload id="cccd_back_file_input" label="2. CCCD/CMND (Mặt sau)" onFileSelect={setCccdBack} required accept="image/*" />
                                    <SimpleFileUpload id="cavet_front_file_input" label="3. Cavet xe (Mặt trước)" onFileSelect={setCavetFront} required accept="image/*" />
                                    <SimpleFileUpload id="cavet_back_file_input" label="4. Cavet xe (Mặt sau)" onFileSelect={setCavetBack} required accept="image/*" />
                                </>
                            ) : (
                                <>
                                    <SimpleFileUpload id="gpkd_file_input" label="1. Giấy phép kinh doanh" onFileSelect={setGpkd} required accept="image/*" />
                                    <SimpleFileUpload id="cavet_front_file_input" label="2. Cavet xe (Mặt trước)" onFileSelect={setCavetFront} required accept="image/*" />
                                    <SimpleFileUpload id="cavet_back_file_input" label="3. Cavet xe (Mặt sau)" onFileSelect={setCavetBack} required accept="image/*" />
                                </>
                            )}
                        </div>
                    </div>
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        className="btn-primary"
                    >
                         {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang gửi...</> : <><i className="fas fa-paper-plane mr-2"></i> Xác nhận & Gửi</>}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default VcRequestModal;