import React, { useEffect, useCallback } from 'react';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileLabel: string;
}

const toEmbeddableDriveUrl = (url: string): string => {
    if (!url || !url.includes('drive.google.com')) {
        // For non-google drive URLs, including data URLs, return as is.
        // Browsers can often display them in iframes.
        return url;
    }
    
    // Use the /preview URL for embedding in an iframe
    // Handles /d/ and /uc?id= formats
    const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }
    
    // Fallback if no ID is found or it's another format (like /open?id=)
    return url.replace('/open?', '/preview?');
};

const toDownloadableDriveUrl = (url: string): string => {
    if (!url || !url.includes('drive.google.com')) {
        return url;
    }
    const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
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

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-2 sm:p-4 animate-fade-in" onClick={onClose}>
            <header className="flex-shrink-0 text-white flex items-center justify-between p-2 sm:p-4">
                <h3 className="font-bold text-lg truncate">{fileLabel}</h3>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={handleDownload} title="Tải về" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                        <i className="fas fa-download"></i>
                    </button>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" title="Mở trong tab mới" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                        <i className="fas fa-external-link-alt"></i>
                    </a>
                    <button onClick={onClose} title="Đóng (Esc)" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-xl">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </header>
            <main className="flex-grow flex items-center justify-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <iframe
                    src={embedUrl}
                    className="w-full h-full bg-white rounded-lg border-none"
                    title={fileLabel}
                ></iframe>
            </main>
        </div>
    );
};

export default FilePreviewModal;
