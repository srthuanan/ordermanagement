import React, { useState, useCallback, useMemo } from 'react';
import * as apiService from '../../services/apiService';
import { compressImage } from '../../services/ocrService';

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
    
    const handleClose = () => {
        setFiles([]);
        onClose();
    }

    const validFileCount = useMemo(() => files.filter(f => f.status === 'valid').length, [files]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-surface-card w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-5 border-b border-border-primary">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100"><i className="fas fa-file-upload text-lg text-accent-primary"></i></div>
                        <h2 className="text-xl font-bold text-text-primary">Tải Lên Hóa Đơn Hàng Loạt</h2>
                    </div>
                    <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className="relative">
                        <input type="file" id="bulk-invoice-upload" multiple onChange={handleChange} className="hidden" accept=".pdf,image/*" />
                        <label htmlFor="bulk-invoice-upload" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragActive ? 'border-accent-primary bg-surface-accent' : 'border-border-primary hover:border-accent-primary'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                <i className="fas fa-cloud-upload-alt text-4xl text-text-placeholder mb-3"></i>
                                <p className="mb-2 text-sm text-text-secondary"><span className="font-semibold">Nhấn để chọn</span> hoặc kéo thả file vào đây</p>
                                <p className="text-xs text-text-placeholder">Định dạng tên tệp: SỐ_ĐƠN_HÀNG.pdf (VD: N12345-VSO-24-05-0001.pdf)</p>
                            </div>
                        </label>
                    </div>
                    {files.length > 0 && (
                        <div className="mt-4 max-h-64 overflow-y-auto border border-border-primary rounded-lg">
                            <table className="min-w-full text-sm responsive-table">
                                <thead className="bg-surface-hover sticky top-0"><tr><th className="py-2 px-3 text-left">Tên tệp</th><th className="py-2 px-3 text-left">Số Đơn Hàng</th><th className="py-2 px-3 text-left">Trạng thái</th><th className="py-2 px-3 text-right"></th></tr></thead>
                                <tbody className="divide-y divide-border-primary bg-surface-card">
                                    {files.map(({ file, orderNumber, status }) => (
                                        <tr key={file.name} className={status === 'invalid_name' ? 'bg-danger-bg/50' : ''}>
                                            <td data-label="Tên tệp" className="py-2 px-3 font-medium text-text-primary truncate max-w-xs">{file.name}</td>
                                            <td data-label="Số Đơn Hàng" className="py-2 px-3 font-mono">{orderNumber || 'N/A'}</td>
                                            <td data-label="Trạng thái" className="py-2 px-3">
                                                {status === 'valid' && <span className="text-xs font-semibold text-success">✓ Hợp lệ</span>}
                                                {status === 'invalid_name' && <span className="text-xs font-semibold text-danger">✗ Tên tệp sai</span>}
                                            </td>
                                            <td data-label="Hành động" className="py-2 px-3 text-right"><button onClick={() => handleRemoveFile(file.name)} className="text-danger hover:opacity-70 text-xs"><i className="fas fa-trash-alt"></i></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
                <footer className="p-4 border-t flex justify-between items-center bg-surface-ground rounded-b-2xl">
                    <span className="text-sm text-text-secondary">Đã chọn: {files.length} tệp ({validFileCount} hợp lệ)</span>
                    <div className="flex gap-4">
                        <button onClick={handleClose} disabled={isUploading} className="btn-secondary">Đóng</button>
                        <button onClick={handleUpload} disabled={isUploading || validFileCount === 0} className="btn-primary">
                            {isUploading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Đang tải lên...</> : <><i className="fas fa-upload mr-2"></i>Bắt đầu Tải lên</>}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default BulkUploadModal;