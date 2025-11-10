import React, { useState, useCallback, useRef } from 'react';
import * as apiService from '../../services/apiService';
import { compressImage } from '../../services/ocrService';
import yesAnimationUrl from '../../pictures/yes.json?url';
import noAnimationUrl from '../../pictures/no-animation.json?url';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
}

interface UploadableFile {
    file: File;
    orderNumber: string | null;
    status: 'valid' | 'invalid_name' | 'duplicate';
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess, showToast, hideToast }) => {
    const [files, setFiles] = useState<UploadableFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClose = useCallback(() => {
        setFiles([]);
        setIsUploading(false);
        onClose();
    }, [onClose]);

    const handleFiles = useCallback(async (incomingFiles: FileList | null) => {
        if (!incomingFiles) return;

        showToast('Đang xử lý', `Đang chuẩn bị và nén ${incomingFiles.length} tệp...`, 'loading');

        const newFilesArray = Array.from(incomingFiles);
        const processedFiles = await Promise.all(newFilesArray.map(async file => {
            if (file.type.startsWith('image/')) {
                try {
                    return await compressImage(file);
                } catch (e) {
                    console.error('Lỗi nén ảnh cho:', file.name, e);
                    showToast('Lỗi Nén Ảnh', `Không thể nén tệp ${file.name}.`, 'warning');
                    return file; // fallback to original on error
                }
            }
            return file;
        }));

        hideToast();

        const newUploadableFiles: UploadableFile[] = processedFiles.map(file => {
            const orderNumberRegex = /^(N\d{5}-VSO-\d{2}-\d{2}-\d{4})/i;
            const match = file.name.match(orderNumberRegex);
            const orderNumber = match ? match[1].toUpperCase() : null;
            const status = orderNumber ? 'valid' : 'invalid_name';
            return { file, orderNumber, status };
        });


        setFiles(prev => {
            const existingFileNames = new Set(prev.map(f => f.file.name));
            const uniqueNewFiles = newUploadableFiles.filter(nf => !existingFileNames.has(nf.file.name));
            return [...prev, ...uniqueNewFiles];
        });
    }, [showToast, hideToast]);

    const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { e.preventDefault(); if (e.target.files) handleFiles(e.target.files); };
    
    const handleRemoveFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.file.name !== fileName));
    };
    
    const handleUpload = async () => {
        const validFiles = files.filter(f => f.status === 'valid');
        if (validFiles.length === 0) {
            showToast('Không có tệp hợp lệ', 'Vui lòng chọn các tệp có tên đúng định dạng.', 'warning');
            return;
        }

        setIsUploading(true);
        showToast('Đang tải lên...', `Chuẩn bị tải lên ${validFiles.length} hóa đơn.`, 'loading');

        try {
            const filesData = await Promise.all(
                validFiles.map(async ({ file, orderNumber }) => ({
                    orderNumber: orderNumber!,
                    base64Data: await fileToBase64(file),
                    mimeType: file.type,
                    fileName: file.name,
                }))
            );

            const result = await apiService.uploadBulkInvoices(filesData);
            hideToast();
            showToast('Hoàn tất!', result.message, result.status === 'SUCCESS' ? 'success' : 'warning', 10000);
            if (result.status === 'SUCCESS') {
                onSuccess();
                handleClose();
            }
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
            showToast('Tải lên thất bại', message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    const validFiles = files.filter(f => f.status === 'valid');

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2" onClick={handleClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-2.5 border-b border-border-primary flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-primary">Tải Lên Hóa Đơn Hàng Loạt</h2>
                    <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>
                <main className="p-3 flex-grow overflow-y-auto hidden-scrollbar">
                    <div onDragEnter={handleDrag} className="w-full">
                        <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleChange} />
                        <div 
                            className={`relative w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300 group cursor-pointer overflow-hidden bg-surface-ground ${dragActive ? 'border-accent-primary bg-surface-accent' : 'border-border-primary'}`}
                            onClick={() => inputRef.current?.click()}
                            onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        >
                            <div className="text-center text-text-placeholder group-hover:text-text-primary transition-colors">
                                <i className="fas fa-file-upload fa-3x mb-2 group-hover:text-accent-primary"></i>
                                <p className="font-semibold text-text-primary">Kéo & thả hoặc nhấn để tải file</p>
                                <p className="text-xs">Định dạng tên file: SỐ_ĐƠN_HÀNG.pdf (VD: N31913-VSO-25-01-0001.pdf)</p>
                            </div>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold mb-2">Tệp đã chọn: ({files.length})</h3>
                            <div className="max-h-60 overflow-y-auto space-y-2 border p-1 rounded-lg bg-surface-ground hidden-scrollbar">
                                {files.map((f, i) => (
                                    <div key={i} className={`flex items-center gap-1.5 p-1 rounded-md border ${f.status === 'invalid_name' ? 'bg-danger-bg border-danger-bg' : 'bg-white border-border-secondary'}`}>
                                        <i className={`fas ${f.status === 'invalid_name' ? 'fa-exclamation-triangle text-danger' : 'fa-file-alt text-accent-secondary'}`}></i>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-medium truncate">{f.file.name}</p>
                                            <p className={`text-xs ${f.status === 'invalid_name' ? 'text-danger font-semibold' : 'text-text-secondary'}`}>
                                                {f.status === 'invalid_name' ? `Sai định dạng SĐH` : `SĐH: ${f.orderNumber}`}
                                            </p>
                                        </div>
                                        <button onClick={() => handleRemoveFile(f.file.name)} className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-surface-hover flex items-center justify-center"><i className="fas fa-times text-xs"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
                <footer className="flex-shrink-0 p-2 border-t border-border-primary flex justify-end items-center gap-1.5 bg-surface-ground rounded-b-2xl">
                    <div onClick={!isUploading ? handleClose : undefined} title="Hủy" className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={noAnimationUrl} background="transparent" speed="1" style={{ width: '52px', height: '52px' }} loop autoplay />
                    </div>
                    <div onClick={!isUploading && validFiles.length > 0 ? handleUpload : undefined} title="Tải Lên & Hoàn Tất" className={`cursor-pointer ${(isUploading || validFiles.length === 0) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={yesAnimationUrl} background="transparent" speed="1" style={{ width: '52px', height: '52px' }} loop autoplay />
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BulkUploadModal;