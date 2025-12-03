import React, { useEffect, useCallback } from 'react';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileLabel: string;
}

const toEmbeddableDriveUrl = (url: string): string => {
    if (!url || !url.includes('drive.google.com')) {
        return url;
    }
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|id=([a-zA-Z0-9_-]{25,})/);
    if (idMatch) {
        const fileId = idMatch[1] || idMatch[2];
        if (fileId) {
            return `https://drive.google.com/file/d/${fileId}/preview`;
        }
    }
    return url.replace('/open?', '/preview?');
};

const toDownloadableDriveUrl = (url: string): string => {
    if (!url || !url.includes('drive.google.com')) {
        return url;
    }
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|id=([a-zA-Z0-9_-]{25,})/);
    if (idMatch) {
        const fileId = idMatch[1] || idMatch[2];
        if (fileId) {
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
    }
    return url;
};

const getFilename = (label: string): string => {
    const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d");
    return removeDiacritics(label).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
};


const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, fileUrl, fileLabel }) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const embedUrl = toEmbeddableDriveUrl(fileUrl);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const downloadUrl = toDownloadableDriveUrl(fileUrl);
        const filename = getFilename(fileLabel);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [showControls, setShowControls] = React.useState(true);

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in overflow-hidden" onClick={() => setShowControls(prev => !prev)}>
            {/* Main Content Area */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
                <iframe
                    src={embedUrl}
                    className="w-full h-full md:max-w-[90vw] md:max-h-[90vh] bg-white md:rounded-lg shadow-2xl border-none"
                    title={fileLabel}
                ></iframe>
            </div>

            {/* Top Bar - Floating */}
            <div className={`absolute top-0 left-0 right-0 p-4 transition-all duration-300 transform ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="flex items-start justify-between max-w-7xl mx-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white shadow-lg">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <i className="fas fa-file-pdf text-sm"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm truncate max-w-[150px] sm:max-w-xs">{fileLabel}</span>
                            <span className="text-[10px] text-white/70">Xem trước tài liệu</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDownload}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors shadow-lg"
                            title="Tải về"
                        >
                            <i className="fas fa-download"></i>
                        </button>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg"
                            title="Mở tab mới"
                        >
                            <i className="fas fa-external-link-alt text-sm"></i>
                        </a>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                            title="Đóng (Esc)"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;