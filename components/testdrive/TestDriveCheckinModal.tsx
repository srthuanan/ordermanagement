import React, { useState, useMemo } from 'react';
import { TestDriveBooking } from '../../types';
import { normalizeName } from '../../services/authService';
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
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 btn-secondary !py-2 !text-xs">
                    <i className="fas fa-images mr-2"></i>Chọn từ thư viện
                </button>
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 btn-secondary !py-2 !text-xs">
                    <i className="fas fa-camera mr-2"></i>Chụp ảnh
                </button>
            </div>
            
            {previews.length > 0 && (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {previews.map((src, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-md border border-border-primary"/>
                            <button 
                                type="button" 
                                onClick={() => handleRemoveImage(index)} 
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                title="Xóa ảnh này"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    ))}
                    <div className="relative group aspect-square">
                        <button onClick={handleRemoveAll} className="w-full h-full bg-surface-hover rounded-md flex items-center justify-center text-text-secondary hover:bg-danger-bg hover:text-danger-hover transition-colors" title="Xóa tất cả ảnh đã chọn">
                            <i className="fas fa-trash-alt text-2xl"></i>
                        </button>
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-5xl rounded-2xl shadow-xl animate-fade-in-scale-up max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-5 border-b border-border-primary flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary">
                        {mode === 'view' ? 'Xem Thông Tin Lái Thử' : 'Cập Nhật Thông Tin Lái Thử'}
                    </h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>

                <main className="p-6 flex-grow overflow-y-auto">
                    <div className="p-3 bg-surface-ground rounded-lg border border-border-primary text-sm mb-6">
                        <span className="font-semibold">Số phiếu:</span> <span className="font-mono text-accent-primary">{booking.soPhieu}</span> | <span className="font-semibold">KH:</span> {booking.tenKhachHang}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* BEFORE SECTION */}
                        <div className={`space-y-4 p-4 border border-border-primary rounded-lg ${isViewOnly && mode !== 'update' ? 'opacity-70 bg-surface-input' : ''}`}>
                            <legend className="font-bold text-lg text-text-primary px-2 -mx-2">Trước Khi Đi</legend>
                            <div>
                                <label htmlFor="odoBefore" className="block text-sm font-medium text-text-primary mb-2">Số ODO (km) {mode === 'checkin' && <span className="text-danger">*</span>}</label>
                                <input type="number" id="odoBefore" value={odoBefore} readOnly={mode !== 'checkin' || isViewOnly} onChange={e => setOdoBefore(e.target.value)} className="w-full futuristic-input read-only:bg-surface-input read-only:cursor-not-allowed" placeholder="Nhập số km hiện tại" />
                            </div>
                            
                            {existingImagesBefore.length > 0 && (
                                <ImageGallery
                                    images={existingImagesBefore}
                                    label="Hình ảnh đã tải lên"
                                    onImageClick={(_, index) => {
                                        const imageSources = existingImagesBefore.map((imgUrl, i) => ({
                                            src: imgUrl, originalUrl: imgUrl, label: `Ảnh trước khi đi ${i + 1}`
                                        }));
                                        onOpenImagePreview(imageSources, index, booking.tenKhachHang);
                                    }}
                                />
                            )}
                            {(mode === 'checkin' || mode === 'update') && canUpdate && (
                                <MultiImageUpload label={mode === 'update' ? 'Thêm ảnh trước khi đi' : 'Hình ảnh xe'} onFilesChange={setImagesBefore} />
                            )}
                        </div>

                        {/* AFTER SECTION */}
                         <div className={`space-y-4 p-4 border border-border-primary rounded-lg ${isViewOnly && mode !== 'update' ? 'opacity-70 bg-surface-input' : ''}`}>
                            <legend className="font-bold text-lg text-text-primary px-2 -mx-2">Sau Khi Về</legend>
                             <div>
                                <label htmlFor="odoAfter" className="block text-sm font-medium text-text-primary mb-2">Số ODO (km) {mode === 'checkout' && <span className="text-danger">*</span>}</label>
                                <input type="number" id="odoAfter" value={odoAfter} readOnly={mode !== 'checkout' || isViewOnly} onChange={e => setOdoAfter(e.target.value)} className="w-full futuristic-input read-only:bg-surface-input read-only:cursor-not-allowed" placeholder="Nhập số km sau khi lái thử"/>
                            </div>
                             {existingImagesAfter.length > 0 && (
                                <ImageGallery
                                    images={existingImagesAfter}
                                    label="Hình ảnh đã tải lên"
                                    onImageClick={(_, index) => {
                                        const imageSources = existingImagesAfter.map((imgUrl, i) => ({
                                            src: imgUrl, originalUrl: imgUrl, label: `Ảnh sau khi về ${i + 1}`
                                        }));
                                        onOpenImagePreview(imageSources, index, booking.tenKhachHang);
                                    }}
                                />
                            )}
                            {(mode === 'checkout' || mode === 'update') && canUpdate && (
                                <MultiImageUpload label={mode === 'update' ? 'Thêm ảnh sau khi về' : 'Hình ảnh xe'} onFilesChange={setImagesAfter} />
                            )}
                        </div>
                    </div>
                </main>

                 {mode !== 'view' && canUpdate && (
                    <footer className="flex-shrink-0 p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                        <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang lưu...</> : <><i className="fas fa-save mr-2"></i> {mode === 'update' ? 'Cập Nhật Ảnh' : 'Lưu Thông Tin'}</>}
                        </button>
                    </footer>
                 )}
            </div>
        </div>
    );
};

export default TestDriveCheckinModal;
