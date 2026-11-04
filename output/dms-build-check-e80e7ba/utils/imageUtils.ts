/**
 * A robust helper to extract a file ID from various Google Drive URL formats.
 * @param url The Google Drive URL.
 * @returns The extracted file ID or null if not found.
 */
export const getDriveFileId = (url: string): string | null => {
    if (!url || typeof url !== 'string') {
        return null;
    }
    // Relaxed check to support both drive.google.com and docs.google.com
    if (!url.includes('google.com')) {
        // If it doesn't look like a google url, we might still want to check regex if we are sure, 
        // but for now let's keep it safe.
        // return null; 
    }
    // Tries to match /d/FILE_ID, /file/d/FILE_ID, /folders/FOLDER_ID and ?id=FILE_ID or &id=FILE_ID
    const match = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|\/folders\/([a-zA-Z0-9_-]{25,})|[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (match) {
        // The ID will be in capture group 1, 2, or 3
        return match[1] || match[2] || match[3];
    }
    return null;
};

/**
 * Checks if a Google Drive URL is a folder.
 * @param url The Google Drive URL.
 * @returns boolean
 */
export const isDriveFolder = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('/folders/') || url.includes('embeddedfolderview');
};

/**
 * Transforms a Google Drive URL into a directly embeddable image URL using the Google Drive Thumbnail endpoint.
 * This endpoint is more reliable than lh3.googleusercontent.com as it handles auth cookies better.
 * @param url The original Google Drive URL.
 * @param size Optional desired width for the image.
 * @returns An embeddable image URL.
 */
/**
 * Transforms a Google Drive URL into an embeddable URL.
 * For images, it can use the thumbnail endpoint.
 * For PDFs or general file viewing, it uses the /preview endpoint.
 * @param url The original Google Drive URL or other file URL.
 * @param size Optional desired width for the image.
 * @returns An embeddable URL.
 */
export const toEmbeddableUrl = (url: string, size?: number): string => {
    if (!url || typeof url !== 'string') return '';
    
    // If it's already a data URL, return it directly
    if (url.startsWith('data:image')) {
        return url;
    }

    const fileId = getDriveFileId(url);
    if (fileId) {
        const lowerUrl = url.toLowerCase();
        // If it's a folder, return the embedded folder view
        if (isDriveFolder(url)) {
            return `https://drive.google.com/embeddedfolderview?id=${fileId}#grid`;
        }
        
        // If it looks like a PDF or a document, or if no size/large size is requested, use /preview
        if (lowerUrl.includes('.pdf') || !size || size > 1000) {
            return `https://drive.google.com/file/d/${fileId}/preview`;
        }
        
        // For small thumbnails (e.g. in lists), use the thumbnail endpoint
        const sizeParam = size ? `w${size}` : 'w1920';
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=${sizeParam}`;
    }
    
    // If it's not a known Google Drive URL, return it as is.
    return url;
};

/**
 * Transforms a Google Drive URL into a direct view link (uc?export=view).
 * This can be used as a fallback if the thumbnail endpoint fails.
 * @param url The original Google Drive URL.
 * @returns A direct view URL.
 */
export const toViewableUrl = (url: string): string => {
    const fileId = getDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
};

/**
 * Transforms a Google Drive or Supabase URL into a direct download link.
 * @param url The original file URL.
 * @returns A direct download URL.
 */
export const toDownloadableUrl = (url: string): string => {
    if (!url) return '';
    const fileId = getDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    // For Supabase Storage URLs, we can append download query parameter to force it
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        return url.includes('?') ? `${url}&download=` : `${url}?download=`;
    }
    return url; // Fallback to original if not a recognizable specialized URL
};

/**
 * Robustly forces a file download by fetching the blob.
 * This bypasses browser internal viewers for PDFs and images.
 * @param url The file URL.
 * @param filename The desired filename.
 */
export const forceDownload = async (url: string, filename: string) => {
    try {
        // First try the specialized download URL if it's drive
        let targetUrl = url;
        const fileId = getDriveFileId(url);
        if (fileId) {
            targetUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            // Drive uc?export=download usually works with direct window.open or a simple link,
            // but for consistency we can try to fetch it if CORS allows.
            // However, Drive CORS is strict, so we might just use window.open for Drive.
            window.open(targetUrl, '_blank');
            return;
        }

        // For Supabase and others, try to fetch to force download name and bypass viewer
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
        console.error('Download failed, falling back to window.open:', e);
        // Fallback: Add ?download= for Supabase if not present
        let fallbackUrl = url;
        if (url.includes('supabase.co/storage/v1/object/public/') && !url.includes('download=')) {
            fallbackUrl = url.includes('?') ? `${url}&download=${filename}` : `${url}?download=${filename}`;
        }
        window.open(fallbackUrl, '_blank');
    }
};

/**
 * Creates a clean filename for downloading.
 * @param customerName The customer's name.
 * @param fileLabel A label for the file (e.g., 'UNC', 'ID Card').
 * @returns A sanitized filename string.
 */
export const getSanitizedFilename = (customerName?: string, fileLabel?: string, fileUrl?: string): string => {
    if (!customerName && !fileLabel) return 'document.pdf';

    const cleanCustomer = customerName ? customerName.trim() : 'KhachHang';
    let cleanLabel = fileLabel ? fileLabel.trim() : 'TaiLieu';

    // Map labels to requested shorthand formats
    if (cleanLabel === 'Hợp đồng MB') cleanLabel = 'HĐMB';
    else if (cleanLabel === 'Đề nghị XHĐ') cleanLabel = 'ĐNXHĐ';

    // Remove only characters that are invalid in Windows filenames
    const safeCustomer = cleanCustomer.replace(/[\\/:*?"<>|]/g, '');
    const safeLabel = cleanLabel.replace(/[\\/:*?"<>|]/g, '');

    // Decide extension based on URL or label
    let extension = 'pdf';
    if (fileUrl) {
        const lowerUrl = fileUrl.toLowerCase();
        if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) extension = 'jpg';
        else if (lowerUrl.includes('.png')) extension = 'png';
    } else {
        if (fileLabel?.toLowerCase().includes('png') || fileLabel?.toLowerCase().includes('jpg')) extension = 'jpg';
    }

    return `${safeLabel} ${safeCustomer}.${extension}`;
};
