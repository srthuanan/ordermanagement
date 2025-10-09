import React, { useState, useCallback } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';

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

    const handleImagePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const items = event.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                event.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (e) => setImages(prev => [...prev, e.target?.result as string]);
                    reader.readAsDataURL(blob);
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
        primary: { iconBg: 'bg-blue-100', iconText: 'text-accent-primary', btn: 'btn-primary' },
        danger: { iconBg: 'bg-danger-bg', iconText: 'text-danger', btn: 'btn-danger' },
        warning: { iconBg: 'bg-warning-bg', iconText: 'text-warning', btn: 'btn-primary' }, // Primary button for warning action
    };
    const currentTheme = themeClasses[theme] || themeClasses.primary;

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-5 border-b border-border-primary">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentTheme.iconBg}`}>
                            <i className={`fas ${icon} text-lg ${currentTheme.iconText}`}></i>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>
                <main className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-text-secondary">Đang thực hiện cho đơn hàng: <strong className="font-mono text-text-primary">{orderNumber}</strong></p>
                    <div>
                        <label htmlFor="modal-reason-input" className="block text-sm font-medium text-text-primary mb-2">{reasonLabel}</label>
                        <textarea id="modal-reason-input" value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full bg-surface-ground border border-border-primary rounded-lg p-2 futuristic-input" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Dán ảnh minh họa (Tùy chọn)</label>
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
                <footer className="p-4 border-t flex justify-end items-center gap-4 bg-surface-ground rounded-b-2xl"><button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button><button onClick={handleSubmit} disabled={isSubmitting} className={currentTheme.btn}>{isSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}</button></footer>
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
                 <header className="flex items-center justify-between p-5 border-b border-border-primary">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-success-bg">
                            <i className="fas fa-upload text-lg text-success"></i>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">Tải Lên Hóa Đơn Đã Xuất</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>
                <main className="p-6 space-y-4">
                    <p className="text-sm text-text-secondary">Tải lên file hóa đơn (PDF, ảnh...) cho đơn hàng <strong className="font-mono text-text-primary">{order['Số đơn hàng']}</strong>.</p>
                    <SimpleFileUpload
                        id="issued-invoice-upload"
                        label="File Hóa Đơn"
                        onFileSelect={setFile}
                        required
                        accept=".pdf,.jpeg,.png,.jpg"
                    />
                </main>
                <footer className="p-4 border-t flex justify-end items-center gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || !file} className="btn-primary">
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang tải lên...</> : <><i className="fas fa-check-circle mr-2"></i> Tải Lên & Hoàn Tất</>}
                    </button>
                </footer>
            </div>
        </div>
    );
};