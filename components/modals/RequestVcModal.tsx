import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import Button from '../ui/Button';
import { useModalBackground } from '../../utils/styleUtils';

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
        plateImage?: File | null;
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
    const [plateImage, setPlateImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

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
            setPlateImage(null);
            setIsSubmitting(false);
        }
    }, [order]);

    if (!order) return null;

    const isFormValid = () => {
        if (!regFront || !regBack || !plateImage) return false;
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
                plateImage,
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            {/* Expanded Width Container: max-w-7xl (approx 1280px) to reduce vertical scrolling */}
            <div
                className="bg-surface-card w-full md:max-w-[90vw] lg:max-w-7xl h-[95vh] md:h-auto md:max-h-[850px] rounded-2xl shadow-2xl animate-fade-in-scale-up flex flex-col md:flex-row overflow-hidden border border-border-primary/50"
                onClick={e => e.stopPropagation()}
                style={bgStyle}
            >
                {/* Left Panel: Info & Context (Premium Gradient Look) */}
                <aside className="w-full md:w-[25%] lg:w-[25%] bg-gradient-to-br from-[#1a237e] to-[#0d1b2a] text-white p-4 md:p-5 lg:p-6 flex flex-col justify-between relative overflow-hidden shrink-0 transition-all">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-accent-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />

                    <div className="relative z-10 flex flex-row md:flex-col items-center md:items-start justify-between gap-4">
                        {/* Elegant Icon Container - Hidden on Mobile */}
                        <div className="hidden md:flex w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl items-center justify-center mb-0 md:mb-6 border border-white/10 shadow-lg shadow-black/20 group cursor-default transition-transform hover:scale-105 duration-500">
                            <i className="fas fa-ticket-alt text-xl md:text-2xl text-accent-primary transition-all duration-500 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"></i>
                        </div>

                        <div className="space-y-1 md:space-y-3 flex-1">
                            {/* Decorative Line/Tag - Hidden on Mobile */}
                            <div className="hidden md:flex items-center gap-3 mb-2">
                                <div className="h-[1px] w-8 bg-accent-primary"></div>
                                <span className="text-[10px] font-bold tracking-[0.25em] text-accent-primary uppercase">VinFast Campaign</span>
                            </div>

                            {/* Main Title - Responsive Typography */}
                            <h2 className="text-lg md:text-2xl lg:text-3xl font-black font-display text-white leading-none tracking-tight drop-shadow-lg">
                                YÊU CẦU <br className="hidden md:block" />
                                <span className="md:block bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">CẤP VOUCHER</span>
                            </h2>

                            {/* Subtitle - Simplified on Mobile */}
                            <p className="hidden md:block text-xs md:text-sm font-medium text-white/60 leading-relaxed pt-3 md:pt-4 border-t border-white/10">
                                Chính Sách <br />
                                <span className="text-white font-bold text-base bg-gradient-to-r from-accent-primary to-green-400 bg-clip-text text-transparent">Sài Gòn Xanh</span> <span className="text-white/40 mx-1">&</span> <span className="text-white font-bold text-base bg-gradient-to-r from-accent-primary to-green-400 bg-clip-text text-transparent">Thủ Đô Trong Xanh</span>
                            </p>
                        </div>
                    </div>

                    {/* Order Info - Grid on Mobile, Stack on Desktop */}
                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3 md:space-y-0 mt-3 md:mt-6">
                        <div className="p-2 md:p-3 lg:p-4 rounded-xl bg-white/10 backdrop-blur border border-white/10">
                            <label className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-0.5 md:mb-1 block">Số Đơn Hàng</label>
                            <div className="font-mono text-xs md:text-sm lg:text-lg font-bold text-white tracking-wide truncate">{order["Số đơn hàng"]}</div>
                        </div>
                        <div className="p-2 md:p-3 lg:p-4 rounded-xl bg-white/10 backdrop-blur border border-white/10">
                            <label className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-0.5 md:mb-1 block">Khách Hàng</label>
                            <div className="font-medium text-xs md:text-sm lg:text-lg text-white truncate">{order["Tên khách hàng"]}</div>
                        </div>
                        {order["VIN"] && (
                            <div className="hidden md:block p-3 md:p-4 rounded-xl bg-white/10 backdrop-blur border border-white/10">
                                <label className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-1 block">Số VIN</label>
                                <div className="font-mono text-sm text-white/80">{order["VIN"]}</div>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 mt-auto pt-8 flex items-center gap-2 text-xs text-white/40">
                        {/* Footer info removed */}
                    </div>
                </aside>

                {/* Right Panel: Form Actions */}
                <main className="flex-1 flex flex-col min-h-0 bg-surface-ground relative w-full overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:128px_128px] pointer-events-none"></div>
                    {/* Header for Mobile only */}
                    <div className="p-4 md:p-6 border-b border-border-primary/50 flex justify-between items-center bg-surface-card/50 backdrop-blur z-20 sticky top-0 md:hidden">
                        <h3 className="font-bold text-base md:text-lg text-text-primary">Thông Tin Hồ Sơ</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {/* Desktop Close Button (Floating) */}
                    <button onClick={onClose} className="hidden md:flex absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-surface-hover items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors">
                        <i className="fas fa-times"></i>
                    </button>

                    <div className="flex-grow overflow-y-auto p-3 md:p-6 lg:p-8 custom-scrollbar">
                        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
                            {/* Top Section: Customer Type & DMS Code (Row Layout if space allows) */}
                            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                                <div className="space-y-2 md:space-y-3 shrink-0 w-full md:w-auto">
                                    <label className="text-xs md:text-sm font-semibold text-text-secondary uppercase tracking-wide">Đối Tượng Khách Hàng</label>
                                    <div className="flex bg-surface-ground/50 p-1 rounded-full border border-border-primary/50 w-full md:w-fit backdrop-blur-sm shadow-inner relative justify-between md:justify-start">
                                        <button
                                            onClick={() => setCustomerType('personal')}
                                            className={`relative z-10 flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-500 ${customerType === 'personal' ? 'bg-gradient-to-r from-blue-700 to-cyan-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                                        >
                                            <i className="fas fa-user text-[10px]"></i> Cá Nhân
                                        </button>
                                        <button
                                            onClick={() => setCustomerType('company')}
                                            className={`relative z-10 flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-500 ${customerType === 'company' ? 'bg-gradient-to-r from-blue-700 to-cyan-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                                        >
                                            <i className="fas fa-building text-[10px]"></i> Công Ty
                                        </button>
                                    </div>
                                </div>

                                {customerType === 'company' && (
                                    <div className="space-y-2 md:space-y-3 flex-grow w-full md:w-auto animate-fade-in-right">
                                        <label htmlFor="dms-code" className="text-sm font-semibold text-text-secondary uppercase tracking-wide block">
                                            Mã Khách Hàng DMS <span className="text-danger">*</span>
                                        </label>
                                        <div className="relative w-full md:max-w-sm">
                                            <input
                                                id="dms-code"
                                                type="text"
                                                value={dmsCode}
                                                onChange={e => setDmsCode(e.target.value)}
                                                className="w-full bg-surface-card border border-border-primary rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none futuristic-input"

                                                required
                                            />
                                            <i className="fas fa-hashtag absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="border-border-primary/30" />

                            <div className="space-y-4 md:space-y-6 animate-fade-in-up delay-100">
                                {/* File Upload Grid - Expanded to 3 cols for less vertical space */}
                                <div>
                                    <label className="text-xs md:text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3 md:mb-4 block">Hồ Sơ Đính Kèm</label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
                                        {customerType === 'personal' ? (
                                            <>
                                                <SimpleFileUpload id="cccd-front" label="CCCD Mặt Trước" onFileSelect={setIdCardFront} required accept="image/*" showPreview={true} />
                                                <SimpleFileUpload id="cccd-back" label="CCCD Mặt Sau" onFileSelect={setIdCardBack} required accept="image/*" showPreview={true} />
                                            </>
                                        ) : (
                                            <div className="lg:col-span-1">
                                                <SimpleFileUpload id="biz-license" label="Giấy Phép Kinh Doanh" onFileSelect={setBusinessLicense} required accept="image/*" showPreview={true} />
                                            </div>
                                        )}

                                        <SimpleFileUpload id="reg-front" label="Cavet Xe (Trước)" onFileSelect={setRegFront} required accept="image/*" showPreview={true} />
                                        <SimpleFileUpload id="reg-back" label="Cavet Xe (Sau)" onFileSelect={setRegBack} required accept="image/*" showPreview={true} />

                                        <div className="lg:col-span-1">
                                            <SimpleFileUpload id="plate-image" label="Ảnh Biển Số Xe" onFileSelect={setPlateImage} required accept="image/*" showPreview={true} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="shrink-0 p-3 md:p-4 border-t border-blue-200/30 bg-gradient-to-r from-blue-50/95 via-white/95 to-blue-50/95 backdrop-blur-xl flex justify-end items-center gap-3 relative z-10 shadow-inner">
                        <Button onClick={onClose} disabled={isSubmitting} variant="secondary" size="sm">
                            Đóng
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!isFormValid() || isSubmitting}
                            variant="primary"
                            size="sm"
                            isLoading={isSubmitting}
                            leftIcon={!isSubmitting ? <i className="fas fa-paper-plane"></i> : undefined}
                        >
                            Gửi Yêu Cầu
                        </Button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default RequestVcModal;