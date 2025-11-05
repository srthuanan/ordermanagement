import React, { useState, useCallback } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
import { compressImage } from '../../services/ocrService';
import yesAnimationUrl from '../../pictures/yes.json?url';
import noAnimationUrl from '../../pictures/no-animation.json?url';

// --- Modal 1: Request with Reason and Optional Image Paste ---

interface RequestWithImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string, images: string[]) => Promise<boolean>;
    title: string;
    orderNumber: string;
    reasonLabel: string;
    icon: string;
    theme: 'primary' | 'danger' | 'warning';
}

export const RequestWithImageModal: React.FC<RequestWithImageModalProps> = ({ isOpen, onClose, onSubmit, title, orderNumber, reasonLabel, icon, theme }) => {
    const [reason, setReason] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImagePaste = useCallback(async (event: React.ClipboardEvent<HTMLDivElement>) => {
        const items = event.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                event.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    const file = new File([blob], "pasted_image.jpg", { type: blob.type });
                    try {
                        const compressedFile = await compressImage(file);
                        const reader = new FileReader();
                        reader.onload = (e) => setImages(prev => [...prev, e.target?.result as string]);
                        reader.readAsDataURL(compressedFile);
                    } catch (err) {
                        console.error("Paste compression failed", err);
                        // Fallback to original blob if compression fails
                        const reader = new FileReader();
                        reader.onload = (e) => setImages(prev => [...prev, e.target?.result as string]);
                        reader.readAsDataURL(blob);
                    }
                }
            }
        }
    }, []);

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!reason.trim() && reasonLabel.includes('bắt buộc')) {
            alert('Vui lòng nhập nội dung yêu cầu.');
            return;
        }
        setIsSubmitting(true);
        const success = await onSubmit(reason, images);
        if (!success) {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

     const themeClasses = {
        primary: { iconBg: 'bg-blue-100', iconText: 'text-accent-primary', btn: 'btn-primary', barBg: 'bg-accent-primary' },
        danger: { iconBg: 'bg-danger-bg', iconText: 'text-danger', btn: 'btn-danger', barBg: 'bg-danger' },
        warning: { iconBg: 'bg-warning-bg', iconText: 'text-warning', btn: 'btn-primary', barBg: 'bg-warning' }, // Primary button for warning action
    };
    const currentTheme = themeClasses[theme] || themeClasses.primary;

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <div className={`h-1.5 rounded-t-2xl ${currentTheme.barBg}`}></div>
                <header className="flex items-start justify-between p-6">
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${currentTheme.iconBg}`}>
                            <i className={`fas ${icon} text-2xl ${currentTheme.iconText}`}></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
                            <p className="text-sm text-text-secondary mt-1">Đang thực hiện cho đơn hàng: <strong className="font-mono text-text-primary">{orderNumber}</strong></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover -mt-2 -mr-2"><i className="fas fa-times"></i></button>
                </header>
                <main className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label htmlFor="modal-reason-input" className="block text-sm font-medium text-text-primary mb-1.5">{reasonLabel}</label>
                        <textarea id="modal-reason-input" value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">Dán ảnh minh họa (Tùy chọn)</label>
                        <div onPaste={handleImagePaste} contentEditable suppressContentEditableWarning className="p-4 border-2 border-dashed border-border-primary rounded-lg min-h-[80px] text-center text-text-placeholder focus:outline-none focus:border-accent-primary">Click và nhấn Ctrl+V để dán</div>
                        {images.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {images.map((src, i) => (
                                    <div key={i} className="relative group"><img src={src} className="h-20 w-20 object-cover rounded-md" alt={`Pasted ${i}`} /><button onClick={() => handleRemoveImage(i)} className="absolute top-0 right-0 w-5 h-5 bg-danger text-white rounded-full text-xs hidden group-hover:flex items-center justify-center">&times;</button></div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
                <footer className="px-6 py-4 flex justify-end items-center gap-3 bg-surface-ground rounded-b-2xl border-t border-border-primary">
                    <div onClick={!isSubmitting ? onClose : undefined} title="Hủy" className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={noAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                    <div onClick={!isSubmitting ? handleSubmit : undefined} title="Gửi Yêu Cầu" className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={yesAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                </footer>
            </div>
        </div>
    );
};


// --- Modal 2: Upload Issued Invoice ---

interface UploadInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (file: File) => Promise<boolean>;
    order: Order;
}

export const UploadInvoiceModal: React.FC<UploadInvoiceModalProps> = ({ isOpen, onClose, onSubmit, order }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!file) {
            alert('Vui lòng chọn một tệp hóa đơn.');
            return;
        }
        setIsSubmitting(true);
        const success = await onSubmit(file);
        if (success) {
            setFile(null); // Reset file state
            onClose();
        } else {
            setIsSubmitting(false); // Re-enable button on failure
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                 <div className="h-1.5 rounded-t-2xl bg-success"></div>
                 <header className="flex items-start justify-between p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-success-bg">
                            <i className="fas fa-upload text-2xl text-success"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Tải Lên Hóa Đơn Đã Xuất</h2>
                            <p className="text-sm text-text-secondary mt-1">Tải file hóa đơn (PDF, ảnh...) cho ĐH: <strong className="font-mono text-text-primary">{order['Số đơn hàng']}</strong>.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover -mt-2 -mr-2"><i className="fas fa-times"></i></button>
                </header>
                <main className="px-6 pb-6 space-y-4">
                    <SimpleFileUpload
                        id="issued-invoice-upload"
                        label="File Hóa Đơn"
                        onFileSelect={setFile}
                        required
                        accept=".pdf,.jpeg,.png,.jpg"
                    />
                </main>
                <footer className="px-6 py-4 flex justify-end items-center gap-3 bg-surface-ground rounded-b-2xl border-t border-border-primary">
                    <div onClick={!isSubmitting ? onClose : undefined} title="Hủy" className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={noAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                    <div onClick={!isSubmitting && file ? handleSubmit : undefined} title="Tải Lên & Hoàn Tất" className={`cursor-pointer ${(isSubmitting || !file) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={yesAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                </footer>
            </div>
        </div>
    );
};