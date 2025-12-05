import React, { useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { getDriveFileId, toDownloadableUrl } from '../../utils/imageUtils';

// Configure worker using local file resolved by Vite
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfThumbnailProps {
    url: string;
    width?: number;
    height?: number;
    className?: string;
}

const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ url, width, height, className }) => {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [useIframeFallback, setUseIframeFallback] = useState(false);

    // Default to width=100 if neither width nor height is provided
    if (!width && !height) {
        width = 100;
    }

    const fileId = useMemo(() => getDriveFileId(url), [url]);
    const isGoogleDrive = useMemo(() => !!fileId, [fileId]);

    // Convert Google Drive URLs to downloadable format
    const pdfUrl = useMemo(() => {
        if (!url) return url;

        // Check if it's a Google Drive URL
        if (fileId) {
            // Use direct download URL for Google Drive files
            return toDownloadableUrl(url);
        }

        return url;
    }, [url, fileId]);

    // Google Drive preview URL for iframe fallback
    const drivePreviewUrl = useMemo(() => {
        if (fileId) {
            return `https://drive.google.com/file/d/${fileId}/preview`;
        }
        return null;
    }, [fileId]);

    function onDocumentLoadSuccess() {
        setLoading(false);
        setError(false);
    }

    function onDocumentLoadError(error: Error) {
        console.error('PDF load error:', error);

        // If it's a Google Drive file and we haven't tried iframe yet, use iframe fallback
        if (isGoogleDrive && !useIframeFallback) {
            console.log('Switching to iframe fallback for Google Drive PDF');
            setUseIframeFallback(true);
            setLoading(false);
        } else {
            setError(true);
            setLoading(false);
        }
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-red-400 ${className}`} style={{ width: width || 'auto', height: height || (width ? width * 1.4 : 'auto') }}>
                <i className="fas fa-file-pdf text-2xl"></i>
            </div>
        );
    }

    // Use iframe fallback for Google Drive PDFs when direct loading fails
    if (useIframeFallback && drivePreviewUrl) {
        return (
            <div className={`relative overflow-hidden ${className}`} style={{ width: width || '100%', height: height || '100%' }}>
                <iframe
                    src={drivePreviewUrl}
                    className="w-full h-full border-0 pointer-events-none scale-[2] origin-top-left"
                    title="PDF Preview"
                    tabIndex={-1}
                />
                {/* Overlay to prevent interaction */}
                <div className="absolute inset-0 bg-transparent"></div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <i className="fas fa-spinner fa-spin text-gray-400"></i>
                </div>
            )}
            <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="w-full h-full bg-gray-100" />}
                className="flex items-center justify-center"
            >
                <Page
                    pageNumber={1}
                    width={width}
                    height={height}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                />
            </Document>
        </div>
    );
};

export default React.memo(PdfThumbnail);
