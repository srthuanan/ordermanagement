import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toEmbeddableUrl, toViewableUrl, getDriveFileId, getSanitizedFilename, forceDownload } from '../../utils/imageUtils';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: ImageSource[];
    startIndex?: number;
    customerName?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, images = [], startIndex = 0, customerName }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isIframeMode, setIsIframeMode] = useState(false);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0, rotate: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showControls, setShowControls] = useState(true);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const resetTransform = () => setTransform({ scale: 1, x: 0, y: 0, rotate: 0 });

    const goTo = useCallback((index: number) => {
        if (images.length === 0) return;
        const newIndex = (index + images.length) % images.length;
        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            resetTransform();
        }
    }, [images, currentIndex]);

    useEffect(() => {
        if (isOpen) {
            const validStartIndex = (images.length > 0 && startIndex >= 0 && startIndex < images.length) ? startIndex : 0;
            setCurrentIndex(validStartIndex);
            setShowControls(true);
        }
    }, [isOpen, startIndex, images]);

    useEffect(() => {
        if (!isOpen || images.length === 0) return;

        setIsLoading(true);
        setError(null);
        setDisplayUrl(null);
        setRetryCount(0);
        setIsIframeMode(false);

        const currentImage = images[currentIndex];
        if (!currentImage) return;

        const url = toEmbeddableUrl(currentImage.src, 1920);
        setDisplayUrl(url);

    }, [isOpen, images, currentIndex]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') goTo(currentIndex + 1);
        if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
        if (e.key === ' ') {
            e.preventDefault();
            setShowControls(prev => !prev);
        }
    }, [onClose, goTo, currentIndex]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!imageRef.current) return;
        e.preventDefault();
        const zoomFactor = 0.1;
        const { deltaY } = e;
        const newScale = transform.scale - (deltaY > 0 ? zoomFactor : -zoomFactor);
        const clampedScale = Math.max(0.2, Math.min(newScale, 10));

        if (clampedScale <= 1) {
            setTransform(prev => ({ ...prev, scale: clampedScale, x: 0, y: 0 }));
        } else {
            setTransform(prev => ({ ...prev, scale: clampedScale }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
        if (transform.scale <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || transform.scale <= 1) return;
        e.preventDefault();
        setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    };

    const handleMouseUpOrLeave = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            setIsDragging(false);
        }
    };

    const handleZoom = (direction: 'in' | 'out') => {
        const newScale = transform.scale + (direction === 'in' ? 0.2 : -0.2);
        const clampedScale = Math.max(0.2, Math.min(newScale, 10));
        if (clampedScale <= 1) {
            setTransform(prev => ({ ...prev, scale: clampedScale, x: 0, y: 0 }));
        } else {
            setTransform(prev => ({ ...prev, scale: clampedScale }));
        }
    };

    const handleRotate = (direction: 'left' | 'right') => {
        setTransform(prev => ({ ...prev, rotate: prev.rotate + (direction === 'right' ? 90 : -90) }));
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const handleDownload = () => {
        const currentImage = images[currentIndex];
        if (!currentImage) return;

        forceDownload(currentImage.originalUrl || currentImage.src, getSanitizedFilename(customerName, currentImage.label, currentImage.originalUrl || currentImage.src));
    };

    if (!isOpen) return null;

    const currentImage = images.length > 0 ? images[currentIndex] : null;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-black/95 z-[9999] flex flex-col animate-fade-in overflow-hidden select-none"
            onClick={() => setShowControls(prev => !prev)}
            onWheel={handleWheel}
        >
            {/* Main Content Area */}
            <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
            >
                {isLoading && (
                    <div className="flex flex-col items-center gap-3 text-white/70">
                        <i className="fas fa-circle-notch fa-spin text-4xl"></i>
                        <span className="text-sm font-medium">Đang tải ảnh...</span>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="text-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 max-w-sm mx-4 text-white" onClick={e => e.stopPropagation()}>
                        <i className="fas fa-exclamation-triangle text-4xl text-amber-400 mb-4"></i>
                        <h3 className="font-bold text-lg mb-2">Không thể tải ảnh</h3>
                        <p className="text-sm text-white/70 mb-4">{error === 'IMAGE_LOAD_FAILED' ? 'Có lỗi xảy ra khi tải ảnh từ nguồn.' : error}</p>
                        {currentImage?.originalUrl && (
                            <a
                                href={currentImage.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors text-sm"
                            >
                                Mở trong tab mới <i className="fas fa-external-link-alt text-xs"></i>
                            </a>
                        )}
                    </div>
                )}

                {displayUrl && !error && !isIframeMode && (
                    <img
                        ref={imageRef}
                        src={displayUrl}
                        alt={currentImage?.label}
                        className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        style={{
                            transform: `scale(${transform.scale}) translate(${transform.x / transform.scale}px, ${transform.y / transform.scale}px) rotate(${transform.rotate}deg)`,
                            cursor: isDragging ? 'grabbing' : (transform.scale > 1 ? 'grab' : 'default'),
                            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                            willChange: 'transform',
                        }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            if (currentImage) {
                                if (retryCount === 0) {
                                    setRetryCount(1);
                                    const fallback = toViewableUrl(currentImage.src);
                                    if (fallback !== displayUrl) {
                                        setDisplayUrl(fallback);
                                        return;
                                    }
                                }
                                const fileId = getDriveFileId(currentImage.src);
                                if (fileId && !isIframeMode) {
                                    setIsIframeMode(true);
                                    setDisplayUrl(`https://drive.google.com/file/d/${fileId}/preview`);
                                    setIsLoading(false);
                                    return;
                                }
                            }
                            setIsLoading(false);
                            setError('IMAGE_LOAD_FAILED');
                        }}
                        onMouseDown={handleMouseDown}
                        onClick={e => e.stopPropagation()}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            toggleFullScreen();
                        }}
                    />
                )}

                {isIframeMode && displayUrl && (
                    <div className="w-full h-full md:max-w-6xl md:max-h-[85vh] relative shadow-2xl md:rounded-2xl overflow-hidden bg-[#1e1e1e] border border-white/10">
                        <iframe
                            src={displayUrl}
                            title="File Preview"
                            className="w-full h-full w-full h-full border-0"
                            allow="autoplay"
                            onLoad={() => setIsLoading(false)}
                        />
                        {/* Mask for Google Drive Pop-out Button */}
                        <div className="absolute top-0 right-0 w-14 h-14 bg-[#1e1e1e] z-20 pointer-events-none"></div>
                    </div>
                )}
            </div>

            {/* Top Bar - Premium Gradient Overlay */}
            <div
                className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-50 flex items-start pt-6 px-6 justify-between transition-all duration-500 transform ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
                style={{ pointerEvents: showControls ? 'auto' : 'none' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-4 animate-slide-in-left">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-glow-sm">
                        <i className="fas fa-image text-xl text-purple-500 drop-shadow-md"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white tracking-wide drop-shadow-sm line-clamp-1 max-w-[200px] md:max-w-md">{currentImage?.label}</h3>
                        <p className="text-xs text-white/60 font-medium tracking-wider uppercase">
                            {customerName} • {currentIndex + 1}/{images.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 animate-slide-in-right">
                    <button
                        onClick={handleDownload}
                        className="group relative w-12 h-12 rounded-full bg-white/5 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:shadow-cyan-500/20 hover:scale-110 active:scale-95"
                        title="Tải về"
                    >
                        <i className="fas fa-download text-lg group-hover:text-cyan-400 transition-colors"></i>
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Tải về</span>
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

            {/* Navigation Arrows */}
            {images.length > 1 && showControls && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-110 active:scale-95 z-10 hidden sm:flex"
                    >
                        <i className="fas fa-chevron-left text-xl"></i>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-110 active:scale-95 z-10 hidden sm:flex"
                    >
                        <i className="fas fa-chevron-right text-xl"></i>
                    </button>
                </>
            )}

            {/* Bottom Controls - Floating */}
            <div className={`absolute bottom-0 left-0 right-0 p-6 transition-all duration-300 transform ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`} onClick={e => e.stopPropagation()}>
                <div className="max-w-3xl mx-auto flex flex-col gap-4">

                    {/* Thumbnails */}
                    {images.length > 1 && (
                        <div className="flex justify-center overflow-x-auto py-2 px-4 gap-2 no-scrollbar mask-gradient">
                            {images.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => goTo(index)}
                                    className={`relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 border-2 ${currentIndex === index ? 'border-white scale-110 shadow-lg ring-2 ring-black/20' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
                                >
                                    <img src={toEmbeddableUrl(img.src, 320)} alt={img.label} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center justify-center gap-2 sm:gap-4 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl mx-auto">
                        <button onClick={() => handleZoom('out')} disabled={transform.scale <= 0.2} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30">
                            <i className="fas fa-minus"></i>
                        </button>

                        <span className="text-sm font-mono text-white/90 w-12 text-center select-none">{Math.round(transform.scale * 100)}%</span>

                        <button onClick={() => handleZoom('in')} disabled={transform.scale >= 10} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-30">
                            <i className="fas fa-plus"></i>
                        </button>

                        <div className="w-px h-6 bg-white/20"></div>

                        <button onClick={() => handleRotate('left')} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" title="Xoay trái">
                            <i className="fas fa-undo"></i>
                        </button>
                        <button onClick={() => handleRotate('right')} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" title="Xoay phải">
                            <i className="fas fa-redo"></i>
                        </button>

                        <div className="w-px h-6 bg-white/20"></div>

                        <button onClick={resetTransform} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" title="Đặt lại">
                            <i className="fas fa-compress"></i>
                        </button>
                        <button onClick={toggleFullScreen} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors" title="Toàn màn hình">
                            <i className="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                {/* Bottom Hint */}
                <div className="mt-4 text-center">
                    <span className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/5 text-white/50 text-xs inline-block">
                        Nhấn vào màn hình để ẩn/hiện công cụ
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ImagePreviewModal;
