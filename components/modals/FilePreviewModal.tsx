import React, { useEffect, useCallback } from 'react';
import { toEmbeddableUrl, forceDownload, getSanitizedFilename } from '../../utils/imageUtils';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileLabel: string;
}

// Internal helper for printing specifically
const toPrintableDriveUrl = (url: string): string => {
    if (!url || !url.includes('drive.google.com')) {
        return url;
    }
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|id=([a-zA-Z0-9_-]{25,})/);
    if (idMatch) {
        const fileId = idMatch[1] || idMatch[2];
        if (fileId) {
            return `https://drive.google.com/file/d/${fileId}/view`;
        }
    }
    return url;
};

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, fileUrl, fileLabel }) => {
    const [showPrintHint, setShowPrintHint] = React.useState(false);

    const handlePrint = useCallback(() => {
        // Open PDF with print parameter to auto-trigger print dialog
        const printUrl = toPrintableDriveUrl(fileUrl);
        window.open(printUrl, '_blank');

        // Show hint to user
        setShowPrintHint(true);
        setTimeout(() => setShowPrintHint(false), 4000);
    }, [fileUrl]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            handlePrint();
        }
    }, [onClose, handlePrint]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const embedUrl = toEmbeddableUrl(fileUrl);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        forceDownload(fileUrl, getSanitizedFilename(undefined, fileLabel, fileUrl));
    };

    const [showControls, setShowControls] = React.useState(true);

    return (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col animate-fade-in overflow-hidden">
            {/* Main Content Area */}
            <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden p-0 md:p-8"
                onClick={() => setShowControls(prev => !prev)}
            >
                <div className="relative w-full h-full md:max-w-6xl md:max-h-[85vh] shadow-2xl md:rounded-2xl overflow-hidden bg-[#1e1e1e] border border-white/10 transition-all duration-300">
                    <iframe
                        src={embedUrl}
                        className="w-full h-full w-full h-full border-0"
                        title={fileLabel}
                    ></iframe>
                    {/* Mask for Google Drive Pop-out Button */}
                    <div className="absolute top-0 right-0 w-14 h-14 bg-[#1e1e1e] z-20 pointer-events-none"></div>
                </div>
            </div>

            {/* Top Bar - Content Layer (Transparent container) */}
            <div
                className={`absolute top-0 left-0 right-0 h-24 z-50 flex items-start pt-6 px-6 justify-between transition-all duration-500 transform ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
                style={{ pointerEvents: 'none' }} // Ensure the container itself doesn't block clicks to the iframe
            >
                {/* Info Section */}
                <div className="flex items-center gap-4 animate-slide-in-left" style={{ pointerEvents: 'auto' }}>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-glow-sm">
                        <i className="fas fa-file-pdf text-xl text-red-500 drop-shadow-md"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white tracking-wide drop-shadow-sm line-clamp-1 max-w-[200px] md:max-w-md">{fileLabel}</h3>
                        <p className="text-xs text-white/60 font-medium tracking-wider uppercase">Xem trước tài liệu</p>
                    </div>
                </div>

                {/* Buttons Section */}
                <div className="flex items-center gap-3 animate-slide-in-right" style={{ pointerEvents: 'auto' }}>
                    <button
                        onClick={handleDownload}
                        className="group relative w-12 h-12 rounded-full bg-white/5 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:shadow-cyan-500/20 hover:scale-110 active:scale-95"
                        title="Tải về"
                    >
                        <i className="fas fa-download text-lg group-hover:text-cyan-400 transition-colors"></i>
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Tải về</span>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="group relative w-12 h-12 rounded-full bg-white/5 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:shadow-green-500/20 hover:scale-110 active:scale-95"
                        title="In (Ctrl+P)"
                    >
                        <i className="fas fa-print text-lg group-hover:text-green-400 transition-colors"></i>
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">In (Ctrl+P)</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="group relative w-12 h-12 rounded-full bg-white/5 hover:bg-red-500/20 backdrop-blur-md border border-white/10 hover:border-red-500/50 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:shadow-red-500/20 hover:scale-110 active:scale-95"
                        title="Đóng (Esc)"
                    >
                        <i className="fas fa-times text-lg group-hover:text-red-400 transition-colors"></i>
                    </button>
                </div>
            </div>

            {/* Top Bar - Background Gradient Layer (Separate to prevent blocking) */}
            <div 
                className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-40 transition-all duration-500 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}
            ></div>

            {/* Print Instruction Notification */}
            {showPrintHint && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-slide-in-down pointer-events-none">
                    <div className="px-6 py-3 rounded-xl bg-green-500/90 backdrop-blur-md border border-green-400/50 text-white shadow-lg shadow-green-500/20">
                        <div className="flex items-center gap-3">
                            <i className="fas fa-check-circle text-xl"></i>
                            <div>
                                <div className="font-bold text-sm">Đang mở hộp thoại in...</div>
                                <div className="text-xs opacity-90">Vui lòng chờ trong giây lát</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Hint */}
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/5 text-white/50 text-xs">
                    Nhấn vào màn hình để ẩn/hiện công cụ
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;