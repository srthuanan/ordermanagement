import React, { useEffect, useCallback, useState } from 'react';
import { toEmbeddableUrl, forceDownload, getSanitizedFilename } from '../../utils/imageUtils';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileLabel: string;
}

const isImageUrl = (url: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.png') || 
           lower.endsWith('.jpg') || 
           lower.endsWith('.jpeg') || 
           lower.endsWith('.webp') || 
           lower.endsWith('.gif') || 
           lower.startsWith('data:image');
};

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
    const [showPrintHint, setShowPrintHint] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [iframeFailed, setIframeFailed] = useState(false);

    useEffect(() => {
        setIframeFailed(false);
    }, [fileUrl, isOpen]);

    const handlePrint = useCallback(() => {
        const printUrl = toPrintableDriveUrl(fileUrl);
        window.open(printUrl, '_blank');
        setShowPrintHint(true);
        setTimeout(() => setShowPrintHint(false), 4000);
    }, [fileUrl]);

    const handleOpenNewTab = useCallback(() => {
        if (fileUrl) window.open(fileUrl, '_blank');
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
    const isImg = isImageUrl(fileUrl);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        forceDownload(fileUrl, getSanitizedFilename(undefined, fileLabel, fileUrl));
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[99999] flex flex-col animate-fade-in overflow-hidden">
            {/* Main Content Area */}
            <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden p-0 md:p-8"
                onClick={() => setShowControls(prev => !prev)}
            >
                <div className="relative w-full h-full md:max-w-6xl md:max-h-[88vh] shadow-2xl md:rounded-2xl overflow-hidden bg-[#1e1e1e] border border-white/10 flex items-center justify-center">
                    {isImg ? (
                        <img 
                            src={fileUrl} 
                            alt={fileLabel} 
                            className="max-w-full max-h-full object-contain p-4 shadow-xl"
                        />
                    ) : iframeFailed ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-3xl mb-4 border border-blue-500/30">
                                <i className="fas fa-file-invoice"></i>
                            </div>
                            <h4 className="text-white text-base font-black mb-2">{fileLabel}</h4>
                            <p className="text-slate-400 text-xs leading-relaxed mb-6">
                                Tài liệu hoặc hóa đơn này không cho phép hiển thị trực tiếp trong khung xem nhúng. Bạn có thể mở trực tiếp trong tab mới hoặc tải về máy.
                            </p>
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={handleOpenNewTab}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-external-link-alt"></i> Mở Tab Mới
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-download"></i> Tải Về
                                </button>
                            </div>
                        </div>
                    ) : (
                        <iframe
                            src={embedUrl}
                            className="w-full h-full border-0"
                            title={fileLabel}
                            onError={() => setIframeFailed(true)}
                        ></iframe>
                    )}

                    {/* Mask for Google Drive Pop-out Button if Google Drive */}
                    {embedUrl.includes('drive.google.com') && (
                        <div className="absolute top-0 right-0 w-14 h-14 bg-[#1e1e1e] z-20 pointer-events-none"></div>
                    )}
                </div>
            </div>

            {/* Top Control Bar */}
            <div
                className={`absolute top-0 left-0 right-0 h-24 z-50 flex items-start pt-6 px-6 justify-between transition-all duration-500 transform ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
                style={{ pointerEvents: 'none' }}
            >
                {/* File Title Info */}
                <div className="flex items-center gap-4 animate-slide-in-left" style={{ pointerEvents: 'auto' }}>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-glow-sm">
                        <i className={`fas ${isImg ? 'fa-image text-emerald-400' : 'fa-file-pdf text-red-500'} text-xl drop-shadow-md`}></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white tracking-wide drop-shadow-sm line-clamp-1 max-w-[200px] md:max-w-md">{fileLabel}</h3>
                        <p className="text-xs text-white/60 font-medium tracking-wider uppercase">Xem trước hồ sơ</p>
                    </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2.5 animate-slide-in-right" style={{ pointerEvents: 'auto' }}>
                    <button
                        onClick={handleOpenNewTab}
                        className="px-3.5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white text-xs font-bold transition-all duration-300 shadow-lg flex items-center gap-2 hover:scale-105"
                        title="Mở trong tab mới"
                    >
                        <i className="fas fa-external-link-alt text-xs text-blue-300"></i>
                        <span className="hidden sm:inline">Mở Tab Mới</span>
                    </button>

                    <button
                        onClick={handleDownload}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:scale-110"
                        title="Tải về"
                    >
                        <i className="fas fa-download text-sm text-cyan-300"></i>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:scale-110"
                        title="In (Ctrl+P)"
                    >
                        <i className="fas fa-print text-sm text-emerald-300"></i>
                    </button>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/30 backdrop-blur-md border border-white/15 hover:border-red-500/50 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:scale-110"
                        title="Đóng (Esc)"
                    >
                        <i className="fas fa-times text-base text-white"></i>
                    </button>
                </div>
            </div>

            {/* Top Bar Background Gradient */}
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
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-500 pointer-events-none z-40 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white/60 text-xs font-medium">
                    Nhấn vào màn hình để ẩn/hiện công cụ • Nhấn Esc để đóng
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;