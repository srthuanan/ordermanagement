import React, { useState, useMemo } from 'react';
import { TestDriveBooking } from '../../types';
import { normalizeName } from '../../services/authService';
import { compressImage } from '../../services/ocrService';
import { toEmbeddableUrl } from '../../utils/imageUtils';
import { useModalBackground } from '../../utils/styleUtils';
import Button from '../ui/Button';

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


const MultiImageUpload: React.FC<{ onFilesChange: (files: File[]) => void, label: string }> =
    ({ onFilesChange, label }) => {
        const [files, setFiles] = useState<File[]>([]);
        const [previews, setPreviews] = useState<string[]>([]);
        const fileInputRef = React.useRef<HTMLInputElement>(null);
        const cameraInputRef = React.useRef<HTMLInputElement>(null);

        React.useEffect(() => {
            // Cleanup object URLs on unmount
            return () => {
                previews.forEach(url => URL.revokeObjectURL(url));
            };
        }, [previews]);

        const handleFiles = async (newFilesList: FileList | null) => {
            if (!newFilesList) return;

            const newFilesArray = Array.from(newFilesList);
            // Prevent duplicates by checking name, size, and last modified date
            const uniqueNewFiles = newFilesArray.filter(nf => !files.some(f => f.name === nf.name && f.size === nf.size && f.lastModified === nf.lastModified));

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
            // Reset the input value to allow selecting/capturing the same file again in some browsers
            if (event.target) event.target.value = '';
        };

        const handleRemoveImage = (index: number) => {
            const newFiles = files.filter((_, i) => i !== index);
            const newPreviews = previews.filter((_, i) => i !== index);

            URL.revokeObjectURL(previews[index]); // Revoke the object URL of the removed image

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
            <div>
                <label className="block text-sm font-medium text-text-primary mb-2">{label} <span className="text-danger">*</span></label>
                {/* Hidden Inputs */}
                <input type="file" multiple accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                <input type="file" accept="image/*" capture onChange={handleFileChange} ref={cameraInputRef} className="hidden" />

                {/* Action Buttons */}
                <div className="flex gap-2 mb-2">
                    <Button type="button" onClick={() => fileInputRef.current?.click()} variant="secondary" className="flex-1 !py-2 !text-xs" leftIcon={<i className="fas fa-images"></i>}>
                        Chọn từ thư viện
                    </Button>
                    <Button type="button" onClick={() => cameraInputRef.current?.click()} variant="secondary" className="flex-1 !py-2 !text-xs" leftIcon={<i className="fas fa-camera"></i>}>
                        Chụp ảnh
                    </Button>
                </div>

                {previews.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {previews.map((src, index) => (
                            <div key={index} className="relative group aspect-square">
                                <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-md border border-border-primary" />
                                <Button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    variant="ghost"
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 !p-0"
                                    title="Xóa ảnh này"
                                >
                                    <i className="fas fa-times"></i>
                                </Button>
                            </div>
                        ))}
                        <div className="relative group aspect-square">
                            <Button onClick={handleRemoveAll} variant="ghost" className="w-full h-full bg-surface-hover rounded-md flex items-center justify-center text-text-secondary hover:bg-danger-bg hover:text-danger-hover transition-colors !p-0" title="Xóa tất cả ảnh đã chọn">
                                <i className="fas fa-trash-alt text-2xl"></i>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

const ImageGallery: React.FC<{
    images: string[];
    onImageClick: (url: string, index: number) => void;
    label: string;
}> = ({ images, onImageClick, label }) => (
    <div>
        <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {images.map((url, index) => (
                <div key={index} className="relative group aspect-square cursor-pointer" onClick={() => onImageClick(url, index)}>
                    <img src={toEmbeddableUrl(url, 200)} alt={`${label} ${index + 1}`} className="w-full h-full object-cover rounded-md border border-border-primary" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                        <i className="fas fa-search-plus text-white text-2xl"></i>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const parseImageData = (jsonString: string | undefined): string[] => {
    if (!jsonString) return [];
    try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
            // This now correctly handles an array of strings, which is the new format from the server.
            return parsed.filter((item): item is string => typeof item === 'string');
        }
    } catch (e) {
        console.error("Failed to parse image data:", e, "Data was:", jsonString);
    }
    return [];
};


const TestDriveCheckinModal: React.FC<TestDriveCheckinModalProps> = ({ booking, mode, onClose, onSubmit, showToast, onOpenImagePreview, currentUser, isAdmin }) => {
    const [odoBefore, setOdoBefore] = useState(booking.odoBefore || '');
    const [imagesBefore, setImagesBefore] = useState<File[]>([]);
    const [odoAfter, setOdoAfter] = useState(booking.odoAfter || '');
    const [imagesAfter, setImagesAfter] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

    const canUpdate = useMemo(() => isAdmin || normalizeName(currentUser) === normalizeName(booking.tenTuVan), [isAdmin, currentUser, booking.tenTuVan]);
    const isViewOnly = mode === 'view' || !canUpdate;

    const existingImagesBefore = useMemo(() => parseImageData(booking.imagesBefore), [booking.imagesBefore]);
    const existingImagesAfter = useMemo(() => parseImageData(booking.imagesAfter), [booking.imagesAfter]);

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
                if (imagesBefore.length === 0 && imagesAfter.length === 0) {
                    showToast('Không có ảnh mới', 'Vui lòng chọn hoặc chụp ảnh mới để cập nhật.', 'warning');
                    setIsSubmitting(false);
                    return;
                }
                if (imagesBefore.length > 0) {
                    payload.imagesBefore = await Promise.all(imagesBefore.map(async (file) => ({ name: file.name, type: file.type, data: await fileToBase64(file) })));
                }
                if (imagesAfter.length > 0) {
                    payload.imagesAfter = await Promise.all(imagesAfter.map(async (file) => ({ name: file.name, type: file.type, data: await fileToBase64(file) })));
                }
            } else {
                setIsSubmitting(false);
                return; // View mode, no submission
            }

            const success = await onSubmit(payload);
            if (!success) {
                setIsSubmitting(false); // Re-enable button on submission failure from API
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Xử lý ảnh thất bại. Vui lòng thử lại.";
            showToast('Lỗi Xử Lý Ảnh', message, 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4" onClick={onClose}>
            <div
                className="bg-surface-card w-full md:max-w-5xl h-[85vh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl shadow-xl animate-fade-in-up flex flex-col"
                onClick={e => e.stopPropagation()}
                style={bgStyle}
            >
                <header className="flex-shrink-0 px-6 py-4 border-b border-border-primary/50 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-2xl">
                    <h2 className="text-xl font-bold text-text-primary">
                        {mode === 'view' ? 'Chi Tiết Lái Thử' : 'Cập Nhật Lái Thử'}
                    </h2>
                    <Button onClick={onClose} variant="ghost" className="text-text-secondary hover:text-text-primary !p-2"><i className="fas fa-times text-lg"></i></Button>
                </header>

                <main className="p-4 md:p-6 overflow-y-auto flex-grow min-h-0 bg-surface-ground/50">
                    <div className="p-4 bg-white rounded-xl border border-border-primary/60 shadow-sm text-sm mb-6 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full border border-accent-primary/20">
                            <i className="fas fa-ticket-alt text-xs"></i>
                            <span className="font-bold font-mono">{booking.soPhieu}</span>
                        </div>
                        <span className="text-border-primary hidden md:inline">|</span>
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary font-medium">Khách hàng:</span>
                            <span className="font-bold text-text-primary text-base">{booking.tenKhachHang}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* BEFORE SECTION */}
                        <div className={`group relative bg-white rounded-xl p-5 border border-border-primary/60 shadow-sm hover:shadow-md transition-all duration-300 ${isViewOnly && mode !== 'update' ? 'opacity-80' : ''}`}>
                            <div className="mb-4 flex items-center gap-3 border-b border-border-primary/50 pb-3">
                                <i className="fas fa-car-side text-lg text-accent-primary"></i>
                                <legend className="font-bold text-lg text-text-primary">Trước Khi Đi</legend>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="odoBefore" className="block text-sm font-medium text-text-secondary mb-2">Số ODO (km) {mode === 'checkin' && <span className="text-danger">*</span>}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="odoBefore"
                                            value={odoBefore}
                                            readOnly={mode !== 'checkin' || isViewOnly}
                                            onChange={e => setOdoBefore(e.target.value)}
                                            className="w-full futuristic-input read-only:bg-surface-input read-only:cursor-not-allowed"
                                            placeholder="Nhập số km hiện tại"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-placeholder text-sm font-medium">km</span>
                                    </div>
                                </div>

                                {existingImagesBefore.length > 0 && (
                                    <div className="bg-surface-ground rounded-xl p-3 border border-border-primary/30">
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
                                    </div>
                                )}
                                {(mode === 'checkin' || mode === 'update') && canUpdate && (
                                    <MultiImageUpload label={mode === 'update' ? 'Thêm ảnh mới' : 'Chụp ảnh xe'} onFilesChange={setImagesBefore} />
                                )}
                            </div>
                        </div>

                        {/* AFTER SECTION */}
                        <div className={`group relative bg-white rounded-xl p-5 border border-border-primary/60 shadow-sm hover:shadow-md transition-all duration-300 ${isViewOnly && mode !== 'update' ? 'opacity-80' : ''}`}>
                            <div className="mb-4 flex items-center gap-3 border-b border-border-primary/50 pb-3">
                                <i className="fas fa-flag-checkered text-lg text-accent-secondary"></i>
                                <legend className="font-bold text-lg text-text-primary">Sau Khi Về</legend>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="odoAfter" className="block text-sm font-medium text-text-secondary mb-2">Số ODO (km) {mode === 'checkout' && <span className="text-danger">*</span>}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="odoAfter"
                                            value={odoAfter}
                                            readOnly={mode !== 'checkout' || isViewOnly}
                                            onChange={e => setOdoAfter(e.target.value)}
                                            className="w-full futuristic-input read-only:bg-surface-input read-only:cursor-not-allowed"
                                            placeholder="Nhập số km sau khi lái thử"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-placeholder text-sm font-medium">km</span>
                                    </div>
                                </div>
                                {existingImagesAfter.length > 0 && (
                                    <div className="bg-surface-ground rounded-xl p-3 border border-border-primary/30">
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
                                    </div>
                                )}
                                {(mode === 'checkout' || mode === 'update') && canUpdate && (
                                    <MultiImageUpload label={mode === 'update' ? 'Thêm ảnh mới' : 'Chụp ảnh xe'} onFilesChange={setImagesAfter} />
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {mode !== 'view' && canUpdate && (
                    <footer className="flex-shrink-0 px-6 py-4 border-t border-border-primary/50 flex justify-end gap-3 bg-white rounded-b-2xl">
                        <Button onClick={onClose} disabled={isSubmitting} variant="secondary" size="md" className="min-w-[100px]">Hủy</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            variant="primary"
                            size="md"
                            className="min-w-[140px]"
                            leftIcon={!isSubmitting ? <i className="fas fa-save"></i> : undefined}
                        >
                            {mode === 'update' ? 'Cập Nhật' : 'Lưu Thông Tin'}
                        </Button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default TestDriveCheckinModal;