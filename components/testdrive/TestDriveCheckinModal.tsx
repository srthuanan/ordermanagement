import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TestDriveBooking } from '../../types';
import { compressImage } from '../../services/ocrService';
import { toEmbeddableUrl } from '../../utils/imageUtils';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface TestDriveCheckinModalProps {
    booking: TestDriveBooking;
    mode: 'checkin' | 'checkout' | 'update' | 'view';
    onClose: () => void;
    onSubmit: (payload: any) => Promise<boolean>;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    currentUser: string;
    isAdmin: boolean;
    isReferenceAccount?: boolean;
    anchorEl?: HTMLElement | null;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const base64String = reader.result.split(',')[1];
                if (base64String) {
                    resolve(base64String);
                } else {
                    reject(new Error('Không thể chuyển đổi file thành base64.'));
                }
            } else {
                reject(new Error('Không thể đọc tệp.'));
            }
        };
        reader.onerror = error => reject(error);
    });
};

const MultiImageUpload: React.FC<{
    onFilesChange: (files: File[]) => void;
    label: string;
    required?: boolean;
}> = ({ onFilesChange, label, required }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            previews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [previews]);

    const handleFiles = async (newFilesList: FileList | null) => {
        if (!newFilesList) return;

        const newFilesArray = Array.from(newFilesList);
        const uniqueNewFiles = newFilesArray.filter(
            nf => !files.some(f => f.name === nf.name && f.size === nf.size && f.lastModified === nf.lastModified)
        );

        if (uniqueNewFiles.length === 0) return;

        try {
            const compressedFiles = await Promise.all(uniqueNewFiles.map(file => compressImage(file)));
            const allFiles = [...files, ...compressedFiles];
            setFiles(allFiles);

            const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);

            onFilesChange(allFiles);
        } catch (error) {
            console.error("Lỗi nén ảnh:", error);
            alert('Một hoặc nhiều ảnh không thể được xử lý. Vui lòng thử lại.');
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(event.target.files);
        if (event.target) event.target.value = '';
    };

    const handleRemoveImage = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);

        URL.revokeObjectURL(previews[index]);

        setFiles(newFiles);
        setPreviews(newPreviews);
        onFilesChange(newFiles);
    };

    const handleRemoveAll = () => {
        previews.forEach(url => URL.revokeObjectURL(url));
        setFiles([]);
        setPreviews([]);
        onFilesChange([]);
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-slate-700">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
                {files.length > 0 && (
                    <button
                        type="button"
                        onClick={handleRemoveAll}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-medium transition-colors"
                    >
                        Xóa tất cả ({files.length})
                    </button>
                )}
            </div>

            {/* Hidden Inputs */}
            <input type="file" multiple accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
            <input type="file" accept="image/*" capture onChange={handleFileChange} ref={cameraInputRef} className="hidden" />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                    <i className="fas fa-images text-blue-500 text-xs"></i>
                    <span>Thư viện ảnh</span>
                </button>
                <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                    <i className="fas fa-camera text-amber-500 text-xs"></i>
                    <span>Chụp ảnh xe</span>
                </button>
            </div>

            {/* Preview Thumbnails */}
            {previews.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                    {previews.map((src, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs">
                            <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-90 hover:opacity-100 shadow-sm transition-transform hover:scale-110"
                                title="Xóa ảnh này"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ImageGallery: React.FC<{
    images: string[];
    onImageClick: (url: string, index: number) => void;
    label: string;
}> = ({ images, onImageClick, label }) => {
    if (!images || images.length === 0) return null;

    return (
        <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600">
                {label} ({images.length})
            </label>
            <div className="grid grid-cols-4 gap-2">
                {images.map((url, index) => (
                    <div
                        key={index}
                        className="relative group aspect-square cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs"
                        onClick={() => onImageClick(url, index)}
                    >
                        <img
                            src={toEmbeddableUrl(url, 200)}
                            alt={`${label} ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <i className="fas fa-search-plus text-white text-sm"></i>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const parseImageData = (data: any): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
        return data.filter((item): item is string => typeof item === 'string');
    }
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string');
        }
    } catch (e) {
        console.error("Failed to parse image data:", e, "Data was:", data);
    }
    return [];
};

const TestDriveCheckinModal: React.FC<TestDriveCheckinModalProps> = ({
    booking,
    mode,
    onClose,
    onSubmit,
    showToast,
    onOpenImagePreview,
    currentUser: _currentUser,
    isAdmin: _isAdmin,
    isReferenceAccount,
    anchorEl
}) => {
    const [odoBefore, setOdoBefore] = useState(booking.odoBefore || '');
    const [imagesBefore, setImagesBefore] = useState<File[]>([]);
    const [odoAfter, setOdoAfter] = useState(booking.odoAfter || '');
    const [imagesAfter, setImagesAfter] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setOdoBefore(booking.odoBefore || '');
        setOdoAfter(booking.odoAfter || '');
        setImagesBefore([]);
        setImagesAfter([]);
    }, [booking.soPhieu, booking.odoBefore, booking.odoAfter]);

    const sheetRef = useRef<HTMLDivElement>(null);

    const canUpdate = useMemo(
        () => !isReferenceAccount,
        [isReferenceAccount]
    );
    const isViewOnly = mode === 'view' || !canUpdate;
    const canEditBefore = !isViewOnly && (mode === 'checkin' || mode === 'update' || !booking.odoBefore);
    const canEditAfter = !isViewOnly && (mode === 'checkout' || mode === 'update' || (mode !== 'checkin' && !booking.odoAfter));

    const existingImagesBefore = useMemo(() => parseImageData(booking.imagesBefore), [booking.imagesBefore]);
    const existingImagesAfter = useMemo(() => parseImageData(booking.imagesAfter), [booking.imagesAfter]);

    // Calculate Dynamic Sheet Placement relative to anchor button
    const [placement, setPlacement] = useState<React.CSSProperties>({
        position: 'fixed',
        bottom: '60px',
        right: '24px',
        width: '600px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 120px)',
        zIndex: 10050,
    });

    useEffect(() => {
        const updatePlacement = () => {
            if (typeof window === 'undefined') return;
            const isMobile = window.innerWidth < 640;
            if (isMobile) {
                setPlacement({
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    maxHeight: '88vh',
                    zIndex: 10050,
                });
                return;
            }

            if (anchorEl) {
                const rect = anchorEl.getBoundingClientRect();
                const targetWidth = 620;
                const width = Math.min(targetWidth, window.innerWidth - 32);
                const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
                const spaceAbove = rect.top - 16;
                const spaceBelow = window.innerHeight - rect.bottom - 16;
                const upwards = spaceAbove >= 280 || spaceAbove >= spaceBelow;

                setPlacement({
                    position: 'fixed',
                    width: `${width}px`,
                    left: `${left}px`,
                    maxHeight: `${Math.min(580, Math.max(260, upwards ? spaceAbove : spaceBelow))}px`,
                    zIndex: 10050,
                    ...(upwards
                        ? { bottom: `${window.innerHeight - rect.top + 8}px`, top: 'auto' }
                        : { top: `${rect.bottom + 8}px`, bottom: 'auto' }),
                });
            } else {
                setPlacement({
                    position: 'fixed',
                    bottom: '60px',
                    right: '24px',
                    width: `${Math.min(620, window.innerWidth - 32)}px`,
                    maxHeight: 'calc(100vh - 120px)',
                    zIndex: 10050,
                });
            }
        };

        updatePlacement();
        window.addEventListener('resize', updatePlacement);
        window.addEventListener('scroll', updatePlacement, true);
        return () => {
            window.removeEventListener('resize', updatePlacement);
            window.removeEventListener('scroll', updatePlacement, true);
        };
    }, [anchorEl]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload: any = { soPhieu: booking.soPhieu };

            if (mode === 'checkin') {
                if (!odoBefore.trim() || imagesBefore.length === 0) {
                    showToast('Thiếu thông tin', 'Vui lòng nhập ODO và tải lên ít nhất 1 ảnh trước khi đi.', 'warning');
                    setIsSubmitting(false);
                    return;
                }
                payload.odoBefore = odoBefore;
                payload.imagesBefore = await Promise.all(imagesBefore.map(async (file) => {
                    return { name: file.name, type: file.type, data: await fileToBase64(file) };
                }));
            } else if (mode === 'checkout') {
                if (!odoAfter.trim() || imagesAfter.length === 0) {
                    showToast('Thiếu thông tin', 'Vui lòng nhập ODO và tải lên ít nhất 1 ảnh sau khi về.', 'warning');
                    setIsSubmitting(false);
                    return;
                }
                if (parseFloat(odoAfter) <= parseFloat(odoBefore || booking.odoBefore || '0')) {
                    showToast('Lỗi ODO', 'ODO sau khi về phải lớn hơn ODO trước khi đi.', 'error');
                    setIsSubmitting(false);
                    return;
                }
                payload.odoAfter = odoAfter;
                payload.imagesAfter = await Promise.all(imagesAfter.map(async (file) => {
                    return { name: file.name, type: file.type, data: await fileToBase64(file) };
                }));
            } else if (mode === 'update') {
                const hasOdoChange = (odoBefore.trim() !== (booking.odoBefore || '').trim()) ||
                    (odoAfter.trim() !== (booking.odoAfter || '').trim());
                const hasNewImages = imagesBefore.length > 0 || imagesAfter.length > 0;

                if (!hasOdoChange && !hasNewImages) {
                    showToast('Không có thay đổi', 'Vui lòng thay đổi ODO hoặc chọn ảnh mới để cập nhật.', 'warning');
                    setIsSubmitting(false);
                    return;
                }
                if (odoBefore.trim()) {
                    payload.odoBefore = odoBefore;
                }
                if (odoAfter.trim()) {
                    const baseBefore = parseFloat(odoBefore || booking.odoBefore || '0');
                    if (baseBefore > 0 && parseFloat(odoAfter) <= baseBefore) {
                        showToast('Lỗi ODO', 'ODO sau khi về phải lớn hơn ODO trước khi đi.', 'error');
                        setIsSubmitting(false);
                        return;
                    }
                    payload.odoAfter = odoAfter;
                }
                if (imagesBefore.length > 0) {
                    payload.imagesBefore = await Promise.all(imagesBefore.map(async (file) => ({ name: file.name, type: file.type, data: await fileToBase64(file) })));
                }
                if (imagesAfter.length > 0) {
                    payload.imagesAfter = await Promise.all(imagesAfter.map(async (file) => ({ name: file.name, type: file.type, data: await fileToBase64(file) })));
                }
            } else {
                setIsSubmitting(false);
                return;
            }

            const success = await onSubmit(payload);
            if (!success) {
                setIsSubmitting(false);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Xử lý ảnh thất bại. Vui lòng thử lại.";
            showToast('Lỗi Xử Lý Ảnh', message, 'error');
            setIsSubmitting(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            {/* Subtle Click-outside Backdrop: cockpit background remains visible */}
            <div
                className="fixed inset-0 z-[10040] bg-slate-900/15 backdrop-blur-[1.5px] transition-opacity animate-in fade-in duration-150"
                onClick={onClose}
            />

            {/* Anchored Sheet Popover */}
            <div
                ref={sheetRef}
                className="testdrive-checkin-sheet"
                style={placement}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile drag handle */}
                <div className="flex justify-center pt-2 pb-0 sm:hidden">
                    <span className="h-1 w-10 rounded-full bg-slate-300" />
                </div>

                {/* Header */}
                <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${mode === 'checkin' ? 'bg-amber-50 text-amber-600' :
                                mode === 'checkout' ? 'bg-blue-50 text-blue-600' :
                                    mode === 'view' ? 'bg-emerald-50 text-emerald-600' :
                                        'bg-slate-100 text-slate-700'
                            }`}>
                            <i className={`fas ${mode === 'checkin' ? 'fa-camera' :
                                    mode === 'checkout' ? 'fa-flag-checkered' :
                                        mode === 'view' ? 'fa-images' : 'fa-edit'
                                } text-sm`}></i>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-800 leading-none">
                                    {mode === 'checkin' ? 'Check-in Nhận Xe' :
                                        mode === 'checkout' ? 'Check-out Trả Xe' :
                                            mode === 'view' ? 'Chi Tiết Ảnh Lái Thử' : 'Cập Nhật Lái Thử'}
                                </h2>
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                                    {booking.soPhieu || 'Chưa gán'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                KH: <strong className="text-slate-700">{booking.tenKhachHang}</strong> · {booking.loaiXe || 'VinFast'} {booking.bienSo ? `(${booking.bienSo})` : ''}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <i className="fas fa-times text-xs"></i>
                    </button>
                </header>

                {/* Main Scrollable Body */}
                <main className="min-h-0 flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* CARD 1: TRƯỚC KHI ĐI */}
                        <div className={`rounded-xl p-3 border transition-all duration-200 ${mode === 'checkin'
                                ? 'bg-white border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                                : 'bg-white border-slate-200/80 shadow-2xs'
                            }`}>
                            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-1.5">
                                    <i className="fas fa-car text-amber-500 text-xs"></i>
                                    <h3 className="font-bold text-xs text-slate-800">Trước Khi Đi</h3>
                                </div>
                                {mode === 'checkin' ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        Đang bàn giao
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {booking.odoBefore ? `ODO: ${booking.odoBefore} km` : 'Chưa có ODO'}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="odoBefore" className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        Số ODO nhận xe (km) {mode === 'checkin' && <span className="text-rose-500">*</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            id="odoBefore"
                                            value={odoBefore}
                                            readOnly={!canEditBefore}
                                            onChange={e => setOdoBefore(e.target.value.replace(/[^0-9]/g, ''))}
                                            className={`w-full h-8 px-2.5 pr-8 rounded-lg border text-xs font-mono outline-none transition-colors ${canEditBefore
                                                    ? 'bg-white border-slate-300 text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                                                }`}
                                            placeholder={canEditBefore ? "Nhập số km lúc giao" : "Chưa có ODO"}
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-semibold pointer-events-none">
                                            km
                                        </span>
                                    </div>
                                </div>

                                {/* Existing Before Images */}
                                {existingImagesBefore.length > 0 && (
                                    <ImageGallery
                                        images={existingImagesBefore}
                                        label="Ảnh đã lưu"
                                        onImageClick={(_, index) => {
                                            const imageSources = existingImagesBefore.map((imgUrl, i) => ({
                                                src: imgUrl, originalUrl: imgUrl, label: `Ảnh trước khi đi ${i + 1}`
                                            }));
                                            onOpenImagePreview(imageSources, index, booking.tenKhachHang);
                                        }}
                                    />
                                )}

                                {/* Image Uploader for Checkin or Update */}
                                {(mode === 'checkin' || mode === 'update') && canUpdate && (
                                    <MultiImageUpload
                                        label={mode === 'update' ? 'Thêm ảnh mới' : 'Chụp ảnh xe giao'}
                                        required={mode === 'checkin'}
                                        onFilesChange={setImagesBefore}
                                    />
                                )}
                            </div>
                        </div>

                        {/* CARD 2: SAU KHI VỀ */}
                        <div className={`rounded-xl p-3 border transition-all duration-200 ${mode === 'checkout'
                                ? 'bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                                : mode === 'checkin'
                                    ? 'bg-slate-50/70 border-slate-200/50 opacity-80'
                                    : 'bg-white border-slate-200/80 shadow-2xs'
                            }`}>
                            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-1.5">
                                    <i className="fas fa-flag-checkered text-blue-600 text-xs"></i>
                                    <h3 className="font-bold text-xs text-slate-800">Sau Khi Về</h3>
                                </div>
                                {mode === 'checkout' ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                        Đang trả xe
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {booking.odoAfter ? `ODO: ${booking.odoAfter} km` : 'Chưa trả xe'}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor="odoAfter" className="block text-[11px] font-semibold text-slate-700">
                                            Số ODO trả xe (km) {mode === 'checkout' && <span className="text-rose-500">*</span>}
                                        </label>
                                        {odoBefore && (
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                Lúc đi: {odoBefore} km
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            id="odoAfter"
                                            value={odoAfter}
                                            readOnly={!canEditAfter}
                                            onChange={e => setOdoAfter(e.target.value.replace(/[^0-9]/g, ''))}
                                            className={`w-full h-8 px-2.5 pr-8 rounded-lg border text-xs font-mono outline-none transition-colors ${canEditAfter
                                                    ? 'bg-white border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                                                }`}
                                            placeholder={mode === 'checkin' ? 'Sẽ nhập khi kết thúc lái thử' : canEditAfter ? 'Nhập số km lúc trả xe' : 'Chưa trả xe'}
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-semibold pointer-events-none">
                                            km
                                        </span>
                                    </div>
                                </div>

                                {/* Existing After Images */}
                                {existingImagesAfter.length > 0 && (
                                    <ImageGallery
                                        images={existingImagesAfter}
                                        label="Ảnh đã lưu"
                                        onImageClick={(_, index) => {
                                            const imageSources = existingImagesAfter.map((imgUrl, i) => ({
                                                src: imgUrl, originalUrl: imgUrl, label: `Ảnh sau khi về ${i + 1}`
                                            }));
                                            onOpenImagePreview(imageSources, index, booking.tenKhachHang);
                                        }}
                                    />
                                )}

                                {/* Image Uploader for Checkout or Update */}
                                {(mode === 'checkout' || mode === 'update') && canUpdate && (
                                    <MultiImageUpload
                                        label={mode === 'update' ? 'Thêm ảnh mới' : 'Chụp ảnh xe trả'}
                                        required={mode === 'checkout'}
                                        onFilesChange={setImagesAfter}
                                    />
                                )}

                                {mode === 'checkin' && !existingImagesAfter.length && (
                                    <div className="py-4 text-center text-slate-400 text-[11px] italic">
                                        Bước ghi nhận sau khi kết thúc chuyến lái thử.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer Toolbar */}
                <footer className="flex-shrink-0 border-t border-slate-200/80 bg-white px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500 truncate">
                        {mode === 'checkin' && <span className="text-amber-700 font-medium">* Yêu cầu ODO và ít nhất 1 ảnh xe</span>}
                        {mode === 'checkout' && <span className="text-blue-700 font-medium">* ODO trả xe phải lớn hơn ODO nhận xe</span>}
                        {mode === 'view' && <span className="text-slate-400 font-medium">Chế độ xem ảnh đã lưu</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            {mode === 'view' ? 'Đóng' : 'Hủy'}
                        </button>

                        {mode !== 'view' && canUpdate && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                                    } ${mode === 'checkin'
                                        ? 'bg-amber-500 hover:bg-amber-600'
                                        : mode === 'checkout'
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-slate-800 hover:bg-slate-900'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin text-xs"></i>
                                        <span>Đang lưu...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className={`fas ${mode === 'checkin' ? 'fa-camera' :
                                                mode === 'checkout' ? 'fa-check' : 'fa-save'
                                            } text-xs`}></i>
                                        <span>
                                            {mode === 'checkin' ? 'Lưu Check-in' :
                                                mode === 'checkout' ? 'Hoàn Tất Trả Xe' : 'Lưu Cập Nhật'}
                                        </span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </>,
        document.body
    );
};

export default TestDriveCheckinModal;
