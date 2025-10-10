import React, { useState, useEffect } from 'react';

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl?: string;
    originalUrl?: string;
    fileLabel?: string;
    customerName?: string;
}

// Helper to create a clean filename
const getFilename = (customerName?: string, fileLabel?: string, imageData?: string | null): string => {
    if (!customerName || !fileLabel || !imageData) return 'image.png';
    const extMatch = imageData.match(/data:image\/(.+);base64,/);
    const ext = extMatch ? extMatch[1] : 'png';
    
    // Function to remove diacritics
    const removeDiacritics = (str: string) => {
        return str.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/Đ/g, "D")
                  .replace(/đ/g, "d");
    };

    const cleanCustomer = removeDiacritics(customerName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanLabel = fileLabel.replace(/\s+/g, '_');
    return `${cleanCustomer}_${cleanLabel}.${ext}`;
};

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, originalUrl, fileLabel, customerName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageData, setImageData] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && imageUrl) {
            setIsLoading(true);
            setError(null);
            setImageData(null);
            
            fetch(imageUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Lỗi mạng: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    const dataUri = `data:${data.mimeType};base64,${data.base64Data}`;
                    setImageData(dataUri);
                })
                .catch(err => {
                    console.error("Failed to fetch image for preview:", err);
                    setError(err.message || 'Không thể tải ảnh.');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, imageUrl]);

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-surface-card w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl animate-fade-in-scale-up overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-border-primary">
                    <h2 className="text-lg font-bold text-text-primary truncate">
                        {isLoading ? 'Đang tải...' : (error ? 'Lỗi' : `${fileLabel} - ${customerName}`)}
                    </h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                <main className="flex-grow p-4 flex items-center justify-center bg-surface-ground">
                    {isLoading && <i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i>}
                    {error && <div className="text-center text-danger"><i className="fas fa-exclamation-triangle fa-2x mb-2"></i><p>{error}</p></div>}
                    {imageData && <img src={imageData} alt={fileLabel} className="max-w-full max-h-full object-contain" />}
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-between items-center bg-surface-ground rounded-b-2xl">
                    <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-secondary hover:underline">Mở trong tab mới</a>
                    {imageData && (
                        <a href={imageData} download={getFilename(customerName, fileLabel, imageData)} className="btn-primary">
                            <i className="fas fa-download mr-2"></i> Tải về
                        </a>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default ImagePreviewModal;
