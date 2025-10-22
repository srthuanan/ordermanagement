import React, { useState, useMemo } from 'react';
import { TestDriveBooking } from '../../types';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface TestDriveCheckinModalProps {
    booking: TestDriveBooking;
    onClose: () => void;
    onSubmit: (payload: any) => Promise<boolean>;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
}

const fileToBase64 = (file: File): Promise<{name: string, type: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        name: file.name,
        type: file.type,
        data: result.split(',')[1] // remove the "data:*/*;base64," part
      });
    };
    reader.onerror = error => reject(error);
  });
};

// Helper to convert Google Drive URLs to a directly embeddable format
const toEmbeddableDriveUrl = (url: string): string => {
    if (!url) return '';
    // If it's already a thumbnail URL, return it
    if (url.includes('/thumbnail?id=')) {
        return url;
    }
    // Try to extract file ID from other formats like /uc?id= or /d/
    const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w200`;
    }
    // Return original URL as a fallback if no ID is found
    return url;
};


const MultiImageUpload: React.FC<{ onFilesChange: (files: File[]) => void, label: string }> = 
({ onFilesChange, label }) => {
    const [previews, setPreviews] = useState<string[]>([]);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            onFilesChange(newFiles);
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreviews(newPreviews);
        }
    };

    const handleRemoveImages = () => {
        if (inputRef.current) inputRef.current.value = "";
        setPreviews([]);
        onFilesChange([]);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{label} <span className="text-danger">*</span></label>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} ref={inputRef} className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-primary/10 file:text-accent-primary hover:file:bg-accent-primary/20 cursor-pointer"/>
            {previews.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {previews.map((src, index) => (
                        <div key={index} className="relative group w-20 h-20">
                            <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-md border border-border-primary"/>
                        </div>
                    ))}
                    <button onClick={handleRemoveImages} className="w-20 h-20 bg-surface-hover rounded-md flex items-center justify-center text-text-secondary hover:bg-danger-bg hover:text-danger-hover transition-colors" title="Xóa tất cả ảnh đã chọn">
                        <i className="fas fa-trash-alt"></i>
                    </button>
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
                    <img src={toEmbeddableDriveUrl(url)} alt={`${label} ${index + 1}`} className="w-full h-full object-cover rounded-md border border-border-primary" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                        <i className="fas fa-search-plus text-white text-2xl"></i>
                    </div>
                </div>
            ))}
        </div>
    </div>
);


const TestDriveCheckinModal: React.FC<TestDriveCheckinModalProps> = ({ booking, onClose, onSubmit, showToast, onOpenImagePreview }) => {
    const [odoBefore, setOdoBefore] = useState(booking.odoBefore || '');
    const [imagesBefore, setImagesBefore] = useState<File[]>([]);
    const [odoAfter, setOdoAfter] = useState(booking.odoAfter || '');
    const [imagesAfter, setImagesAfter] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const mode = useMemo(() => {
        if (!booking.odoBefore) return 'checkin';
        if (!booking.odoAfter) return 'checkout';
        return 'view'; // Both are filled
    }, [booking]);

    const existingImagesBefore = useMemo(() => {
        try { return JSON.parse(booking.imagesBefore || '[]') as string[]; } catch { return []; }
    }, [booking.imagesBefore]);

    const existingImagesAfter = useMemo(() => {
        try { return JSON.parse(booking.imagesAfter || '[]') as string[]; } catch { return []; }
    }, [booking.imagesAfter]);
    
    const handleSubmit = async () => {
        const payload: any = { soPhieu: booking.soPhieu };
        
        if (mode === 'checkin') {
            if (!odoBefore.trim() || imagesBefore.length === 0) {
                showToast('Thiếu thông tin', 'Vui lòng nhập ODO và tải lên ít nhất 1 ảnh trước khi đi.', 'warning');
                return;
            }
            payload.odoBefore = odoBefore;
            payload.imagesBefore = await Promise.all(imagesBefore.map(fileToBase64));
        } else if (mode === 'checkout') {
            if (!odoAfter.trim() || imagesAfter.length === 0) {
                 showToast('Thiếu thông tin', 'Vui lòng nhập ODO và tải lên ít nhất 1 ảnh sau khi về.', 'warning');
                return;
            }
             if (parseFloat(odoAfter) <= parseFloat(odoBefore || booking.odoBefore || '0')) {
                showToast('Lỗi ODO', 'ODO sau khi về phải lớn hơn ODO trước khi đi.', 'error');
                return;
            }
            payload.odoAfter = odoAfter;
            payload.imagesAfter = await Promise.all(imagesAfter.map(fileToBase64));
        } else {
            return; // View mode, no submission
        }

        setIsSubmitting(true);
        const success = await onSubmit(payload);
        if (!success) {
            setIsSubmitting(false); // Re-enable button on failure
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-5xl rounded-2xl shadow-xl animate-fade-in-scale-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-5 border-b border-border-primary flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary">Cập Nhật Thông Tin Lái Thử</h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>

                <main className="p-6 flex-grow overflow-y-auto">
                    <div className="p-3 bg-surface-ground rounded-lg border border-border-primary text-sm mb-6">
                        <span className="font-semibold">Số phiếu:</span> <span className="font-mono text-accent-primary">{booking.soPhieu}</span> | <span className="font-semibold">KH:</span> {booking.tenKhachHang}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* BEFORE SECTION */}
                        <fieldset disabled={mode !== 'checkin' && existingImagesBefore.length > 0} className="space-y-4 p-4 border border-border-primary rounded-lg disabled:opacity-70 disabled:bg-surface-input">
                            <legend className="font-bold text-lg text-text-primary px-2">Trước Khi Đi</legend>
                            <div>
                                <label htmlFor="odoBefore" className="block text-sm font-medium text-text-primary mb-2">Số ODO (km) <span className="text-danger">*</span></label>
                                <input type="number" id="odoBefore" value={odoBefore} onChange={e => setOdoBefore(e.target.value)} className="w-full futuristic-input" placeholder="Nhập số km hiện tại" readOnly={mode !== 'checkin'} />
                            </div>
                            
                            {existingImagesBefore.length > 0 ? (
                                <ImageGallery
                                    images={existingImagesBefore}
                                    label="Hình ảnh đã tải lên"
                                    onImageClick={(_, index) => {
                                        const imageSources = existingImagesBefore.map((imgUrl, i) => ({
                                            src: imgUrl,
                                            originalUrl: imgUrl,
                                            label: `Ảnh trước khi đi ${i + 1}`
                                        }));
                                        onOpenImagePreview(imageSources, index, booking.tenKhachHang);
                                    }}
                                />
                            ) : (
                                <MultiImageUpload label="Hình ảnh xe" onFilesChange={setImagesBefore} />
                            )}
                        </fieldset>

                        {/* AFTER SECTION */}
                         <fieldset disabled={mode !== 'checkout'} className="space-y-4 p-4 border border-border-primary rounded-lg disabled:opacity-70 disabled:bg-surface-input">
                            <legend className="font-bold text-lg text-text-primary px-2">Sau Khi Về</legend>
                             <div>
                                <label htmlFor="odoAfter" className="block text-sm font-medium text-text-primary mb-2">Số ODO (km) <span className="text-danger">*</span></label>
                                <input type="number" id="odoAfter" value={odoAfter} onChange={e => setOdoAfter(e.target.value)} className="w-full futuristic-input" placeholder="Nhập số km sau khi lái thử" readOnly={mode !== 'checkout'}/>
                            </div>
                             {existingImagesAfter.length > 0 ? (
                                <ImageGallery
                                    images={existingImagesAfter}
                                    label="Hình ảnh đã tải lên"
                                    onImageClick={(_, index) => {
                                        const imageSources = existingImagesAfter.map((imgUrl, i) => ({
                                            src: imgUrl,
                                            originalUrl: imgUrl,
                                            label: `Ảnh sau khi về ${i + 1}`
                                        }));
                                        onOpenImagePreview(imageSources, index, booking.tenKhachHang);
                                    }}
                                />
                            ) : (
                                <MultiImageUpload label="Hình ảnh xe" onFilesChange={setImagesAfter} />
                            )}
                        </fieldset>
                    </div>
                </main>

                 {mode !== 'view' && (
                    <footer className="flex-shrink-0 p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                        <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang lưu...</> : <><i className="fas fa-save mr-2"></i> Lưu Thông Tin</>}
                        </button>
                    </footer>
                 )}
            </div>
        </div>
    );
};

export default TestDriveCheckinModal;