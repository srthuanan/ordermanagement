/**
 * A robust helper to extract a file ID from various Google Drive URL formats.
 * @param url The Google Drive URL.
 * @returns The extracted file ID or null if not found.
 */
export const getDriveFileId = (url: string): string | null => {
    if (!url || typeof url !== 'string' || !url.includes('drive.google.com')) {
        return null;
    }
    // Tries to match /d/FILE_ID, /file/d/FILE_ID, and ?id=FILE_ID or &id=FILE_ID
    const match = url.match(/\/d\/([a-zA-Z0-9_-]{25,})|[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (match) {
        // The ID will be in capture group 1 or 2
        return match[1] || match[2];
    }
    return null;
};

/**
 * Transforms a Google Drive URL into a directly embeddable image URL using the Google User Content endpoint.
 * This is often the most reliable method.
 * @param url The original Google Drive URL.
 * @param size Optional desired width for the image.
 * @returns An embeddable image URL.
 */
export const toEmbeddableUrl = (url: string, size?: number): string => {
    // If it's already a data URL, return it directly
    if (url && url.startsWith('data:image')) {
        return url;
    }
    const fileId = getDriveFileId(url);
    if (fileId) {
        let embedUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
        if (size) {
            embedUrl += `=w${size}`; // Append size parameter for optimization
        }
        return embedUrl;
    }
    // If it's not a known Google Drive URL, return it as is.
    return url;
};

/**
 * Transforms a Google Drive URL into a direct download link.
 * @param url The original Google Drive URL.
 * @returns A direct download URL.
 */
export const toDownloadableUrl = (url: string): string => {
    const fileId = getDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url; // Fallback to original if not a recognizable Drive URL
};

/**
 * Creates a clean filename for downloading.
 * @param customerName The customer's name.
 * @param fileLabel A label for the file (e.g., 'UNC', 'ID Card').
 * @returns A sanitized filename string.
 */
export const getSanitizedFilename = (customerName?: string, fileLabel?: string): string => {
    if (!customerName || !fileLabel) return 'image.jpg';
    
    const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d");
    const cleanCustomer = removeDiacritics(customerName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanLabel = fileLabel.replace(/\s+/g, '_');
    return `${cleanCustomer}_${cleanLabel}.jpg`;
};
