import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PdfThumbnailProps {
    url: string;
    width?: number;
    className?: string;
}

const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ url, width = 100, className }) => {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    function onDocumentLoadSuccess() {
        setLoading(false);
    }

    function onDocumentLoadError() {
        setError(true);
        setLoading(false);
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-red-400 ${className}`} style={{ width, height: width * 1.4 }}>
                <i className="fas fa-file-pdf text-2xl"></i>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`} style={{ width, height: width * 1.4 }}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <i className="fas fa-spinner fa-spin text-gray-400"></i>
                </div>
            )}
            <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="w-full h-full bg-gray-100" />}
                className="w-full h-full"
            >
                <Page
                    pageNumber={1}
                    width={width}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                />
            </Document>
        </div>
    );
};

export default React.memo(PdfThumbnail);
