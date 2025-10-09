import React, { useState, useCallback } from 'react';
import * as apiService from '../../services/apiService';

interface BulkInvoiceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]); // Return only base64 part
        reader.onerror = error => reject(error);
    });
};

const BulkInvoiceUploadModal: React.FC<BulkInvoiceUploadModalProps> = ({ isOpen, onClose, onSuccess, showToast, hideToast }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const addFiles = useCallback((newFiles: FileList | null) => {
        if (!newFiles) return;
        const uniqueNewFiles = Array.from(newFiles).filter(
            newFile => !files.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
        );
        setFiles(prev => [...prev, ...uniqueNewFiles]);
    }, [files]);

    const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFiles(e.dataTransfer.files); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { e.preventDefault(); addFiles(e.target.files); };
    const handleRemoveFile = (fileName: string) => setFiles(prev => prev.filter(f => f.name !== fileName));

    const handleSubmit = async () => {
        if (files.length === 0) {
            showToast('Chưa có tệp', 'Vui lòng chọn hoặc kéo thả tệp hóa đơn.', 'warning');
            return;
        }

        setIsSubmitting(true);
        showToast('Đang tải lên', `Đang xử lý ${files.length} tệp...`, 'loading');

        try {
            const filesData = await Promise.all(
                files.map(async (file) => {
                    const base64Data = await fileToBase64(file);
                    const orderNumber = file.name.substring(0, file.name.lastIndexOf('.'));
                    return { orderNumber, base64Data, mimeType: file.type, fileName: file.name };
                })
            );

            const result = await apiService.bulkUploadInvoices(filesData);
            hideToast();
            showToast('Thành công', result.message, 'success', 5000);
            onSuccess();

        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
            showToast('Tải lên thất bại', message, 'error', 6000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-5 border-b border-border-primary flex-shrink-0">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                            <i className="fas fa-file-upload text-lg text-accent-primary"></i>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">Tải Lên Hóa Đơn Hàng Loạt</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <p className="text-sm text-text-secondary p-3 bg-surface-ground rounded-lg border border-border-primary">
                        <strong>QUAN TRỌNG:</strong> Tên của mỗi tệp phải là <strong>Số Đơn Hàng</strong> tương ứng (ví dụ: <code>N31913-VSO-25-08-0161.pdf</code>).
                    </p>
                    <div onDragEnter={handleDrag} className="relative">
                        <input id="bulk-upload-input" type="file" multiple accept=".pdf,.jpeg,.png,.jpg" className="hidden" onChange={handleChange} />
                        <label htmlFor="bulk-upload-input"
                            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragActive ? 'border-accent-primary bg-surface-accent' : 'border-border-primary hover:border-accent-primary'}`}
                        >
                            <i className="fas fa-cloud-upload-alt text-4xl text-text-placeholder mb-3"></i>
                            <span className="font-semibold text-text-primary">Chọn Tệp hoặc Kéo Thả Tại Đây</span>
                            <span className="text-xs text-text-secondary mt-1">Chấp nhận PDF, PNG, JPG</span>
                        </label>
                        {dragActive && <div className="absolute inset-0" onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}></div>}
                    </div>
                    {files.length > 0 && (
                        <div className="space-y-2 pt-2">
                             <h4 className="font-semibold text-sm text-text-primary">Tệp đã chọn ({files.length}):</h4>
                             <div className="max-h-48 overflow-y-auto border border-border-primary rounded-lg p-2 bg-surface-ground">
                                {files.map(file => (
                                    <div key={file.name} className="flex items-center justify-between p-2 text-sm hover:bg-surface-hover rounded-md">
                                        <span className="truncate"><i className="fas fa-file-alt mr-2 text-text-secondary"></i>{file.name}</span>
                                        <button onClick={() => handleRemoveFile(file.name)} className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-red-500 hover:bg-danger-bg"><i className="fas fa-times"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-end items-center gap-4 bg-surface-ground rounded-b-2xl flex-shrink-0">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || files.length === 0} className="btn-primary">
                        {isSubmitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-upload mr-2"></i>}
                        {isSubmitting ? `Đang tải lên ${files.length} tệp...` : `Bắt Đầu Tải Lên (${files.length})`}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default BulkInvoiceUploadModal;