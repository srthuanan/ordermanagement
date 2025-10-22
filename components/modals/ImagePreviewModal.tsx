import React, { useState, useEffect, useCallback, useRef } from 'react';

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

// Helper to create a clean filename
const getFilename = (customerName?: string, fileLabel?: string): string => {
    if (!customerName || !fileLabel) return 'image';
    
    const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d");
    const cleanCustomer = removeDiacritics(customerName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanLabel = fileLabel.replace(/\s+/g, '_');
    return `${cleanCustomer}_${cleanLabel}`;
};

// Helper to get a high-quality viewable URL from Google Drive that works in <img> tags
const toHighQualityDriveUrl = (url: string): string => {
    if (!url || !url.includes('drive.google.com')) return url;

    // Extract file ID
    const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (idMatch && idMatch[1]) {
        // Use the thumbnail endpoint which is designed for embedding and allows specifying size.
        // 's0' requests the original size, providing high quality without cross-origin issues.
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=s0`;
    }
    // Fallback for URLs that are already in a different format or don't match
    return url;
};

// Helper to get a thumbnail URL for performance in the strip
const toThumbnailDriveUrl = (url: string): string => {
    if (!url || !url.includes('drive.google.com')) return url;
    
    const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (idMatch && idMatch[1]) {
        // Request a slightly larger thumbnail for better clarity in the filmstrip.
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w320`;
    }
    return url;
};

const toDownloadableDriveUrl = (url: string): string | null => {
    if (!url || !url.includes('drive.google.com')) return null;
    const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }
    return null;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, images = [], startIndex = 0, customerName }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0, rotate: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    const resetTransform = () => setTransform({ scale: 1, x: 0, y: 0, rotate: 0 });

    const goTo = useCallback((index: number) => {
        const newIndex = (index + images.length) % images.length;
        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            resetTransform();
        }
    }, [images.length, currentIndex]);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(startIndex);
        }
    }, [isOpen, startIndex]);

    useEffect(() => {
        if (!isOpen || images.length === 0) return;

        setIsLoading(true);
        setError(null);
        setDisplayUrl(null);

        const currentImage = images[currentIndex];
        const url = toHighQualityDriveUrl(currentImage.src);
        setDisplayUrl(url);

    }, [isOpen, images, currentIndex]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') goTo(currentIndex + 1);
        if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
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
        
        // If zooming out makes it smaller than original, reset pan
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
        e.preventDefault();
        setIsDragging(false);
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

    const handleDownload = () => {
        const currentImage = images[currentIndex];
        const downloadUrl = toDownloadableDriveUrl(currentImage.originalUrl || currentImage.src) || currentImage.src;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', getFilename(customerName, currentImage.label));
        // For data URLs or blobs, we might not want to set download attribute.
        // For external URLs, this is fine. For cross-origin, may need more handling.
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    const currentImage = images[currentIndex];
    const downloadUrl = toDownloadableDriveUrl(currentImage?.originalUrl || currentImage?.src);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-0 sm:p-4 animate-fade-in" onWheel={handleWheel} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}>
            {/* Header */}
            <header className="flex-shrink-0 text-white flex items-center justify-between p-4" onClick={e => e.stopPropagation()}>
                <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate">{currentImage?.label}</h3>
                    <p className="text-sm opacity-80 truncate">{customerName} ({currentIndex + 1} / {images.length})</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    {downloadUrl && <button onClick={handleDownload} title="Tải về" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"><i className="fas fa-download"></i></button>}
                    <a href={currentImage?.originalUrl || currentImage?.src} target="_blank" rel="noopener noreferrer" title="Mở trong tab mới" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"><i className="fas fa-external-link-alt"></i></a>
                    <button onClick={onClose} title="Đóng (Esc)" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-xl"><i className="fas fa-times"></i></button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center relative overflow-hidden" onClick={onClose}>
                {isLoading && <i className="fas fa-spinner fa-spin text-4xl text-white"></i>}
                {error && !isLoading && (
                    <div className="text-center p-6 bg-red-900/50 border border-red-500/50 rounded-lg max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                        <i className="fas fa-exclamation-triangle text-3xl text-red-400 mb-3"></i>
                        <p className="font-semibold text-red-300">{error}</p>
                        {currentImage?.originalUrl && (
                            <a 
                                href={currentImage.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-block px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm"
                            >
                                Thử mở trong tab mới <i className="fas fa-external-link-alt ml-2 text-xs"></i>
                            </a>
                        )}
                    </div>
                )}
                {displayUrl && !error && (
                    <img 
                        ref={imageRef}
                        src={displayUrl} 
                        alt={currentImage?.label} 
                        className={`max-w-[95vw] max-h-[95vh] object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        style={{
                            transform: `scale(${transform.scale}) translate(${transform.x / transform.scale}px, ${transform.y / transform.scale}px) rotate(${transform.rotate}deg)`,
                            cursor: isDragging ? 'grabbing' : (transform.scale > 1 ? 'grab' : 'default'),
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out, opacity 0.3s',
                            willChange: 'transform',
                        }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setIsLoading(false); setError('Không thể tải ảnh. File có thể đã bị xóa hoặc quyền truy cập bị hạn chế.'); }}
                        onMouseDown={handleMouseDown}
                        onClick={e => e.stopPropagation()}
                    />
                )}
                
                {/* Prev/Next buttons */}
                {images.length > 1 && (
                    <>
                    <button onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 text-white rounded-full flex items-center justify-center text-2xl hover:bg-black/50 transition-colors"><i className="fas fa-chevron-left"></i></button>
                    <button onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 text-white rounded-full flex items-center justify-center text-2xl hover:bg-black/50 transition-colors"><i className="fas fa-chevron-right"></i></button>
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="flex-shrink-0 flex flex-col items-center gap-4 p-4" onClick={e => e.stopPropagation()}>
                {/* Control bar (zoom, rotate) */}
                <div className="flex items-center gap-2 bg-black/40 p-2 rounded-full text-white">
                    <button onClick={() => handleZoom('out')} title="Thu nhỏ (-)" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50" disabled={transform.scale <= 0.2}><i className="fas fa-search-minus"></i></button>
                    <button onClick={() => setTransform({ scale: 1, x: 0, y: 0, rotate: transform.rotate })} title="Reset Zoom" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">{Math.round(transform.scale * 100)}%</button>
                    <button onClick={() => handleZoom('in')} title="Phóng to (+)" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50" disabled={transform.scale >= 10}><i className="fas fa-search-plus"></i></button>
                    <div className="w-px h-6 bg-white/20 mx-2"></div>
                    <button onClick={() => handleRotate('left')} title="Xoay trái" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"><i className="fas fa-undo"></i></button>
                    <button onClick={() => handleRotate('right')} title="Xoay phải" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"><i className="fas fa-redo"></i></button>
                    <button onClick={resetTransform} title="Reset tất cả" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"><i className="fas fa-expand"></i></button>
                </div>
                {/* Thumbnail strip */}
                {images.length > 1 && (
                    <div className="w-full max-w-2xl overflow-x-auto p-2">
                        <div className="flex justify-center gap-2">
                            {images.map((img, index) => (
                                <button 
                                    key={index}
                                    onClick={() => goTo(index)}
                                    className={`w-16 h-16 flex-shrink-0 rounded-md border-2 bg-black/20 transition-all duration-200 ${currentIndex === index ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={toThumbnailDriveUrl(img.src)} alt={img.label} className="w-full h-full object-cover rounded-sm" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};

export default ImagePreviewModal;