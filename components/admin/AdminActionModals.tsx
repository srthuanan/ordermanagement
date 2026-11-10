import React, { useState, useCallback, useEffect } from 'react';
import { Order } from '../../types';
import SimpleFileUpload from '../ui/SimpleFileUpload';
// import { compressImage } from '../../services/ocrService';
import { useModalBackground } from '../../utils/styleUtils';
import AnchoredCyberSheet from '../ui/AnchoredCyberSheet';

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
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    anchor?: HTMLElement | null;
}

const SUPPLEMENT_OPTIONS = [
    { id: 'HDMB', label: 'HĐMB', icon: 'fa-file-contract' },
    { id: 'DNXHD', label: 'ĐNXHĐ', icon: 'fa-file-invoice' },
    { id: 'CHINH_SACH', label: 'Chính sách', icon: 'fa-tags' },
    { id: 'HOA_HONG', label: 'Hoa hồng', icon: 'fa-money-bill-wave' },
    { id: 'VPOINT', label: 'Vpoint', icon: 'fa-coins' },
    { id: 'MA_VC', label: 'Mã Voucher', icon: 'fa-ticket-alt' },
    { id: 'XE_XANG', label: 'Xe xăng cũ', icon: 'fa-car' },
    { id: 'VTLX', label: 'Hồ sơ VTLX', icon: 'fa-leaf' },
];

const RESCAN_OPTIONS = [
    { id: 'HDMB', label: 'HĐMB', icon: 'fa-file-contract' },
    { id: 'DNXHD', label: 'ĐNXHĐ', icon: 'fa-file-invoice' },
    { id: 'VTLX', label: 'Hồ sơ VTLX', icon: 'fa-leaf' },
    { id: 'XE_XANG', label: 'Xe xăng cũ', icon: 'fa-car' },
    { id: 'CHINH_SACH', label: 'Chính sách', icon: 'fa-tags' },
    { id: 'HOA_HONG', label: 'Hoa hồng', icon: 'fa-money-bill-wave' },
];

export const RequestWithImageModal: React.FC<RequestWithImageModalProps> = ({ isOpen, onClose, onSubmit, title, orderNumber, reasonLabel, icon, theme: _theme, showToast, anchor }) => {
    const isSupplementModal = (title || '').toLowerCase().includes('bổ sung');
    const isRescanModal = (title || '').toLowerCase().includes('scan lại') || (title || '').toLowerCase().includes('rescan');
    const isSelectableModal = isSupplementModal || isRescanModal;
    const activeOptions = isRescanModal ? RESCAN_OPTIONS : SUPPLEMENT_OPTIONS;

    const [reason, setReason] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>(['HDMB', 'DNXHD']);
    const [images, setImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
            if (isSelectableModal) {
                setSelectedItems(['HDMB', 'DNXHD']);
            }
        }
    }, [isOpen, isSelectableModal]);

    const handleImagePaste = useCallback(async (event: React.ClipboardEvent<HTMLDivElement>) => {
        const items = event.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                event.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    const file = new File([blob], "pasted_image.jpg", { type: blob.type });
                    try {
                        const reader = new FileReader();
                        reader.onload = (e) => setImages(prev => [...prev, e.target?.result as string]);
                        reader.readAsDataURL(file);
                    } catch (err) {
                        console.error("Paste handling failed", err);
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
        if (isSelectableModal && selectedItems.length === 0) {
            showToast?.('Chưa chọn mục', `Vui lòng tick chọn ít nhất 1 mục cần TVBH ${isRescanModal ? 'scan lại' : 'bổ sung'}.`, 'warning');
            return;
        }

        if (!reason.trim() && reasonLabel.includes('bắt buộc') && !isSelectableModal) {
            if (showToast) {
                showToast('Thông tin không hợp lệ', 'Vui lòng nhập nội dung yêu cầu.', 'warning');
            } else {
                alert('Vui lòng nhập nội dung yêu cầu.');
            }
            return;
        }

        let finalReason = reason.trim();
        if (isSelectableModal && selectedItems.length > 0) {
            const tag = isRescanModal
                ? `[MỤC CẦN SCAN LẠI: ${selectedItems.join(', ')}]`
                : `[MỤC CẦN BỔ SUNG: ${selectedItems.join(', ')}]`;
            finalReason = finalReason ? `${tag} ${finalReason}` : tag;
        }

        setIsSubmitting(true);
        const success = await onSubmit(finalReason, images);
        if (!success) {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const activeThemeClass = isRescanModal
        ? {
            badge: 'bg-sky-50 text-sky-700 border-sky-200',
            iconColor: 'text-sky-600',
            btn: 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white',
            chipActive: 'is-active-rescan'
          }
        : isSupplementModal
        ? {
            badge: 'bg-amber-50 text-amber-800 border-amber-200',
            iconColor: 'text-amber-600',
            btn: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white',
            chipActive: 'is-active-supplement'
          }
        : {
            badge: 'bg-rose-50 text-rose-700 border-rose-200',
            iconColor: 'text-rose-600',
            btn: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white',
            chipActive: 'is-active-danger'
          };

    const displayTitle = isRescanModal
        ? 'Y/C scan lại hồ sơ'
        : isSupplementModal
        ? 'Yêu cầu bổ sung'
        : title;

    return (
        <AnchoredCyberSheet
            anchor={anchor}
            className="is-request-sheet"
            label={title}
            onClose={() => { if (!isSubmitting) onClose(); }}
        >
            <div className="request-action-sheet flex flex-col bg-white overflow-hidden text-slate-800">
                {/* Header */}
                <div className="request-sheet-header">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${activeThemeClass.badge}`}>
                            <i className={`fas ${icon} text-xs ${activeThemeClass.iconColor}`}></i>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-xs text-slate-900 truncate">{displayTitle}</span>
                            {orderNumber && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 border border-slate-200/80">
                                    #{orderNumber}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={isSubmitting}
                        className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors text-xs"
                        title="Đóng (Esc)"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-3 space-y-2.5 max-h-[380px] overflow-y-auto">
                    {/* Options chips */}
                    {isSelectableModal && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <i className="fas fa-check-square text-[9px] text-slate-400"></i>
                                    <span>Mục cần {isRescanModal ? 'scan lại' : 'bổ sung'}:</span>
                                </span>
                                <span className="text-[10px] text-slate-400">({selectedItems.length}/{activeOptions.length})</span>
                            </div>
                            <div className="request-sheet-chips">
                                {activeOptions.map((opt) => {
                                    const isChecked = selectedItems.includes(opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedItems(prev =>
                                                    prev.includes(opt.id)
                                                        ? prev.filter(x => x !== opt.id)
                                                        : [...prev, opt.id]
                                                );
                                            }}
                                            className={`request-sheet-chip ${isChecked ? activeThemeClass.chipActive : ''}`}
                                        >
                                            <span className={`w-3.5 h-3.5 rounded text-[9px] flex items-center justify-center shrink-0 ${
                                                isChecked 
                                                    ? (isRescanModal ? 'bg-sky-500 text-white' : 'bg-amber-500 text-white') 
                                                    : 'border border-slate-300'
                                            }`}>
                                                {isChecked && <i className="fas fa-check"></i>}
                                            </span>
                                            <span>{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Reason input */}
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            Ghi chú chi tiết {isSelectableModal ? <span className="text-slate-400 font-normal">(tùy chọn)</span> : <span className="text-rose-500">*</span>}:
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={2}
                            placeholder={
                                isRescanModal 
                                    ? "VD: Trang 2 mờ số khung, chụp thiếu trang cam kết..." 
                                    : isSupplementModal 
                                    ? "VD: Thiếu hóa đơn thu cũ, bổ sung phụ lục HĐMB..." 
                                    : "Nhập lý do chi tiết..."
                            }
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none resize-none transition-colors"
                        />
                    </div>

                    {/* Paste zone */}
                    <div>
                        <div 
                            onPaste={handleImagePaste} 
                            contentEditable 
                            suppressContentEditableWarning 
                            className="request-sheet-pastezone"
                            tabIndex={0}
                        >
                            <i className="fas fa-camera mr-1.5 text-slate-400"></i>
                            <span>Click vào đây & nhấn <strong>Ctrl+V</strong> để dán ảnh minh họa</span>
                        </div>
                        {images.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {images.map((src, i) => (
                                    <div key={i} className="relative group w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                                        <img src={src} className="w-full h-full object-cover" alt={`Minh họa ${i}`} />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(i)}
                                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center shadow-xs"
                                            title="Xóa ảnh"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-3 py-2 bg-slate-50 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={isSubmitting}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${activeThemeClass.btn} disabled:opacity-50`}
                    >
                        {isSubmitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin text-[10px]"></i>
                                <span>Đang gửi...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-paper-plane text-[10px]"></i>
                                <span>{isRescanModal ? 'Gửi Y/C scan lại' : isSupplementModal ? 'Gửi Y/C bổ sung' : 'Gửi yêu cầu'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </AnchoredCyberSheet>
    );
};


// --- Modal 2: Upload Issued Invoice ---

interface UploadInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (file: File) => Promise<boolean>;
    order: Order;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

export const UploadInvoiceModal: React.FC<UploadInvoiceModalProps> = ({ isOpen, onClose, onSubmit, order, showToast }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

    const handleSubmit = async () => {
        if (!file) {
            if (showToast) {
                showToast('Chưa chọn tệp', 'Vui lòng chọn một tệp hóa đơn.', 'warning');
            } else {
                alert('Vui lòng chọn một tệp hóa đơn.');
            }
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
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 md:p-4" onClick={onClose}>
            <div className="bg-surface-card w-full md:max-w-lg h-full md:h-auto rounded-none md:rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col" onClick={e => e.stopPropagation()} style={bgStyle}>
                <div className="h-1.5 rounded-t-none md:rounded-t-2xl bg-success flex-shrink-0"></div>
                <header className="flex items-start justify-between p-3">
                    <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-success-bg">
                            <i className="fas fa-upload text-2xl text-success"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Tải Lên Hóa Đơn Đã Xuất</h2>
                            <p className="text-sm text-text-secondary mt-1">Tải file hóa đơn (PDF, ảnh...) cho ĐH: <strong className="font-mono text-text-primary">{order['Số đơn hàng']}</strong>.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover -mt-1 -mr-1"><i className="fas fa-times"></i></button>
                </header>
                <main className="px-3 pb-3 space-y-2">
                    <SimpleFileUpload
                        id="issued-invoice-upload"
                        label="File Hóa Đơn"
                        onFileSelect={setFile}
                        required
                        accept=".pdf,.jpeg,.png,.jpg"
                        disableCompression={true}
                    />
                </main>
                <footer className="px-4 py-3 flex justify-end items-center gap-3 bg-slate-50 rounded-none md:rounded-b-2xl border-t border-slate-200/60 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all disabled:opacity-50"
                    >
                        HỦY
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !file}
                        className={`px-6 py-2 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 bg-success hover:brightness-110 flex items-center justify-center min-w-[120px] h-[40px]`}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>ĐANG TẢI LÊN...</span>
                            </div>
                        ) : (
                            "TẢI LÊN & HOÀN TẤT"
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};


// --- Modal 3: Edit Specific Invoice Details (No/Policy/PO) ---

interface EditInvoiceDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
    onSubmit: (data: { engineNumber: string; policy: string; commission: string; vpoint: string }) => Promise<boolean>;
}

export const EditInvoiceDetailsModal: React.FC<EditInvoiceDetailsModalProps> = ({ isOpen, onClose, order, onSubmit }) => {
    const [engineNumber, setEngineNumber] = useState('');
    const [policy, setPolicy] = useState('');
    const [commission, setCommission] = useState('');
    const [vpoint, setVpoint] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

    useEffect(() => {
        if (isOpen && order) {
            setEngineNumber(order["Số máy"] || '');
            setPolicy(order["CHÍNH SÁCH"] || '');
            setCommission(order["Hoa hồng ứng"] || '');
            setVpoint(order["Điểm Vpoint sử dụng"] || '');
        }
    }, [isOpen, order]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const success = await onSubmit({ engineNumber, policy, commission, vpoint });
        if (success) {
            onClose();
        } else {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 md:p-4" onClick={onClose}>
            <div className="bg-surface-card w-full md:max-w-md h-full md:h-auto rounded-none md:rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col" onClick={e => e.stopPropagation()} style={bgStyle}>
                <div className="h-1.5 rounded-t-none md:rounded-t-2xl bg-accent-secondary flex-shrink-0"></div>
                <header className="flex items-start justify-between p-3">
                    <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                            <i className="fas fa-edit text-2xl text-accent-secondary"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Cập Nhật Thông Tin Hóa Đơn</h2>
                            <p className="text-sm text-text-secondary mt-1">SĐH: <strong className="font-mono">{order['Số đơn hàng']}</strong></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover -mt-1 -mr-1"><i className="fas fa-times"></i></button>
                </header>
                <main className="px-3 pb-3 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Số Máy</label>
                        <input
                            type="text"
                            value={engineNumber}
                            onChange={e => setEngineNumber(e.target.value)}
                            className="w-full bg-surface-ground border border-border-primary rounded-lg p-2 futuristic-input"
                            placeholder="Nhập số máy..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Chính Sách</label>
                        <input
                            type="text"
                            value={policy}
                            onChange={e => setPolicy(e.target.value)}
                            className="w-full bg-surface-ground border border-border-primary rounded-lg p-2 futuristic-input"
                            placeholder="Nhập chính sách..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Hoa Hồng Ứng</label>
                        <input
                            type="text"
                            value={commission}
                            onChange={e => setCommission(e.target.value)}
                            className="w-full bg-surface-ground border border-border-primary rounded-lg p-2 futuristic-input"
                            placeholder="Nhập số tiền hoa hồng..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Điểm Vpoint Sử Dụng</label>
                        <input
                            type="text"
                            value={vpoint}
                            onChange={e => setVpoint(e.target.value)}
                            className="w-full bg-surface-ground border border-border-primary rounded-lg p-2 futuristic-input"
                            placeholder="Nhập điểm Vpoint..."
                        />
                    </div>
                </main>
                <footer className="px-4 py-3 flex justify-end items-center gap-3 bg-slate-50 rounded-none md:rounded-b-2xl border-t border-slate-200/60 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all disabled:opacity-50"
                    >
                        HỦY
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 bg-accent-primary hover:brightness-110 flex items-center justify-center min-w-[120px] h-[40px]`}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>ĐANG LƯU...</span>
                            </div>
                        ) : (
                            "LƯU THAY ĐỔI"
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};