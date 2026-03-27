declare var Tesseract: any;


/**
 * Compresses an image file client-side before uploading.
 * Resizes the image to a max dimension and converts it to a JPEG with a specific quality.
 * @param file The original image File object.
 * @param options Configuration for compression.
 * @returns A promise that resolves to the compressed image as a File object.
 */
export const compressImage = (
    file: File,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> => {
    return new Promise((resolve, reject) => {
        // Only compress images, return other file types as-is
        if (!file.type.startsWith('image/')) {
            return resolve(file);
        }

        const { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = options;
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    return reject(new Error('Không thể lấy context của canvas.'));
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Get the blob from canvas
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return reject(new Error('Tạo blob từ canvas thất bại.'));
                        }
                        // Create a new file with a .jpg extension to reflect the compression format
                        const newFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg';
                        const newFile = new File([blob], newFileName, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = (error) => reject(error);
            img.src = event.target?.result as string;
        };

        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};


// Import pdfjs from react-pdf for reading PDF files
import { pdfjs } from 'react-pdf';
import '../utils/pdfWorkerSetup'; // Centrally configured worker

// Declare global jsPDF variable (loaded via CDN in index.html)
declare var jspdf: any;

/**
 * Compresses a PDF file by rasterizing each page to a JPEG image and reconstructing the PDF.
 * This significantly reduces size for scanned documents but converts text to images.
 * @param file The original PDF File object.
 * @returns A promise that resolves to the compressed PDF as a new File object.
 */
export const compressPdf = async (file: File, onProgress?: (percent: number) => void): Promise<File> => {
    // Check if jsPDF is loaded
    if (typeof jspdf === 'undefined') {
        console.error('jsPDF library not found. Skipping compression.');
        return file;
    }

    try {
        console.log(`Starting PDF compression for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // 1. Load the PDF document using pdfjs
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdfDocument = await loadingTask.promise;

        const numPages = pdfDocument.numPages;
        console.log(`PDF has ${numPages} pages.`);

        // 2. Initialize jsPDF
        // Default to A4, but we will adjust page size per page if needed or scale content
        const { jsPDF } = jspdf;
        const newPdf = new jsPDF();

        // We'll delete the initial default page added by new jsPDF() or just add pages as we go.
        // jsPDF usually starts with one page.

        // OPTIMIZATION: Scale 1.5 and Quality 0.5 for aggressive compression
        const scale = 1.5;
        const quality = 0.5;

        // Mobile-safe canvas limits (iOS Safari has stricter limits)
        const MAX_CANVAS_AREA = 16777216; // ~16MP
        const MAX_CANVAS_DIMENSION = 4096;

        for (let i = 1; i <= numPages; i++) {
            // Report progress
            if (onProgress) {
                const percent = Math.round((i / numPages) * 100);
                onProgress(percent);
            }

            const page = await pdfDocument.getPage(i);

            // Adaptive scaling: Check if default scale result is too big for mobile canvas
            let currentScale = scale;
            let viewport = page.getViewport({ scale: currentScale });

            while (
                (viewport.width * viewport.height > MAX_CANVAS_AREA) ||
                (viewport.width > MAX_CANVAS_DIMENSION) ||
                (viewport.height > MAX_CANVAS_DIMENSION)
            ) {
                // Reduce scale step-wise until it fits safely
                currentScale *= 0.8;
                viewport = page.getViewport({ scale: currentScale });
                console.warn(`Page ${i} is too large for canvas. Reduced scale to ${currentScale.toFixed(2)}`);
            }

            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) continue;

            // Render page to canvas
            // Fix: Some type definitions require 'canvas' property in RenderParameters
            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas as any // Cast to any to satisfy potential type mismatches
            }).promise;

            // Convert canvas to compressed JPEG Data URL
            const imgData = canvas.toDataURL('image/jpeg', quality);

            // Add page to new PDF
            // Calculate aspect ratio to fit into PDF page
            // Add page to new PDF
            // Use current viewport dimensions for PDF page size to match the image
            const widthMm = viewport.width * 0.264583;
            const heightMm = viewport.height * 0.264583;
            const orientation = widthMm > heightMm ? 'l' : 'p';

            if (i === 1) {
                newPdf.deletePage(1); // Remove default page
            }
            newPdf.addPage([widthMm, heightMm], orientation);
            newPdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);
        }

        const compressedPdfBytes = newPdf.output('arraybuffer');
        const compressedFile = new File([compressedPdfBytes], file.name, {
            type: 'application/pdf',
            lastModified: Date.now()
        });

        console.log(`Compression complete. New size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        // Return compressed file if it is smaller, otherwise original
        if (compressedFile.size < file.size) {
            return compressedFile;
        } else {
            console.log('Compressed file is larger than original. Keeping original.');
            return file;
        }

    } catch (error) {
        console.error('Error during PDF compression:', error);
        return file;
    }
};

const parseAndValidateDate = (
    dayStr: string,
    monthStr: string,
    yearStr: string,
    hourStr?: string,
    minuteStr?: string,
    secondStr?: string
): string | null => {
    let day = parseInt(dayStr?.trim(), 10);
    let month = -1;
    let year = parseInt(yearStr?.trim(), 10);
    let hour = parseInt(hourStr?.trim() || '00', 10);
    let minute = parseInt(minuteStr?.trim() || '00', 10);
    let second = parseInt(secondStr?.trim() || '00', 10);

    if (isNaN(day) || isNaN(year) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
        return null;
    }

    const monthText = monthStr?.trim().toLowerCase().replace(/[.,]/g, '');
    const monthMap: { [key: string]: number } = {
        '1': 1, 'tháng 1': 1, 'thg 1': 1, 't1': 1, 'jan': 1, 'january': 1,
        '2': 2, 'tháng 2': 2, 'thg 2': 2, 't2': 2, 'feb': 2, 'february': 2,
        '3': 3, 'tháng 3': 3, 'thg 3': 3, 't3': 3, 'mar': 3, 'march': 3,
        '4': 4, 'tháng 4': 4, 'thg 4': 4, 't4': 4, 'apr': 4, 'april': 4,
        '5': 5, 'tháng 5': 5, 'thg 5': 5, 't5': 5, 'may': 5,
        '6': 6, 'tháng 6': 6, 'thg 6': 6, 't6': 6, 'jun': 6, 'june': 6,
        '7': 7, 'tháng 7': 7, 'thg 7': 7, 't7': 7, 'jul': 7, 'july': 7,
        '8': 8, 'tháng 8': 8, 'thg 8': 8, 't8': 8, 'aug': 8, 'august': 8,
        '9': 9, 'tháng 9': 9, 'thg 9': 9, 't9': 9, 'sep': 9, 'september': 9,
        '10': 10, 'tháng 10': 10, 'thg 10': 10, 't10': 10, 'oct': 10, 'october': 10,
        '11': 11, 'tháng 11': 11, 'thg 11': 11, 't11': 11, 'nov': 11, 'november': 11,
        '12': 12, 'tháng 12': 12, 'thg 12': 12, 't12': 12, 'dec': 12, 'december': 12,
    };

    // FIX: Sort keys by length descending to match "10" before "1".
    const sortedKeys = Object.keys(monthMap).sort((a, b) => b.length - a.length);
    const foundMonthKey = sortedKeys.find(key => monthText.includes(key));

    if (foundMonthKey) {
        month = monthMap[foundMonthKey];
    } else {
        const monthNum = parseInt(monthText, 10);
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            month = monthNum;
        } else {
            return null;
        }
    }

    if (year < 100) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        year += currentCentury;
        if (year > currentYear + 5) {
            year -= 100;
        }
    }

    if (year < 2000 || year > new Date().getFullYear() + 5 || month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return null;
    }

    const testDate = new Date(year, month - 1, day, hour, minute, second);
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
        return null;
    }

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

export const extractDateFromImageTesseract = async (
    file: File,
    onProgress: (status: string) => void
): Promise<string | null> => {
    if (typeof Tesseract === 'undefined') {
        throw new Error('Thư viện Tesseract chưa tải.');
    }

    try {
        onProgress('Đang nhận dạng... (0%)');
        const { data: { text } } = await Tesseract.recognize(file, 'vie+eng', {
            logger: (m: any) => {
                if (m.status === 'recognizing text') {
                    onProgress(`Đang nhận dạng... (${Math.round(m.progress * 100)}%)`);
                }
            }
        });
        onProgress('Đang tìm ngày giờ...');

        // --- TEXT CLEANING AND NORMALIZATION ---
        // Replace newlines with spaces for easier regex matching
        let cleanedText = text.replace(/\n+/g, ' ');

        // Normalize various time expressions into HH:MM:SS format
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(giờ|h|hr|g)\s*(\d{1,2})\s*(?:phút|phut|ph|p|min|m)?\s*(?:(\d{1,2})\s*(?:giây|giay|s|sec)?)?/gi, (_match: string, h: string, _hourWord: string, m: string, s: string) => `${h}:${m}${s ? ':' + s : ''}`);
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(?:giờ|h|hr|g)\s*(\d{1,2})(?!\s*(?:phút|phut|ph|p|min|m))/gi, '$1:$2'); // Handle "14 giờ 30"
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(phút|phut|ph|p|min|m)\s*(\d{1,2})/gi, '$1:$2'); // Handle "30 phút 15"
        cleanedText = cleanedText.replace(/(\d{1,2})\s*:\s*(\d{1,2})\s*(?:phút|phut|ph|p|min|m)/gi, '$1:$2'); // Handle "14:30 phút"
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(phút|phut|ph|p|min|m)/gi, '$1'); // clean up dangling "phút"
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(giây|giay|s|sec)/gi, '$1'); // clean up dangling "giây"

        // Normalize separators
        cleanedText = cleanedText.replace(/\s*:\s*/g, ':').replace(/\s*-\s*/g, '-').replace(/\s*\/\s*/g, '/').replace(/\s*\.\s*/g, '.');

        // Try to fix 2-digit years by assuming current century. e.g. 12/05/24 -> 12/05/2024
        cleanedText = cleanedText.replace(/(\d{1,2})([\/.-])(\d{1,2})\2(\d{2})(?!\d)/g, (_match: string, day: string, _sep: string, month: string, yearYY: string) => {
            const cY = new Date().getFullYear();
            const yYI = parseInt(yearYY, 10);
            let fY;
            // Guess century. If yy > current_yy + 15, assume last century. Otherwise this century.
            // e.g. if current is 2024, '40' becomes 1940. '25' becomes 2025.
            if (yYI > (cY % 100 + 15) && yYI <= 99) {
                fY = 1900 + yYI;
            } else {
                fY = Math.floor(cY / 100) * 100 + yYI;
            }
            return `${day}/${month}/${fY}`;
        });

        // Fix more specific OCR errors
        cleanedText = cleanedText.replace(/(\d{1,2})\.(\d{1,2})\/(\d{1,2})\/(\d{4})/g, '$2/$3/$4'); // e.g. 29.08/08/2024 -> 08/08/2024
        cleanedText = cleanedText.replace(/(\d{1,2})\/(\d{1,2})\.(\d{1,2})\/(\d{4})/g, '$1/$2/$4'); // e.g. 29/08.08/2024 -> 29/08/2024

        // Remove zero-width spaces that can break regex
        cleanedText = cleanedText.replace(/[\u200B-\u200D\uFEFF]/g, '');


        let extractedDateTime = null;
        let bestMatchScore = -1;
        let bestMatchDetails: any = {};

        const monthTextRegexPart = `(?:tháng|thg|t|Tháng|Thg\\.?|T\\.)?\\s*\\d{1,2}[\\.,]{0,2}|[A-Za-zÀ-ỹ]{3,}`;
        const dateSeparatorRegexPart = `[\\s\\/\\.-]+`;

        const patternsWithParsers = [
            // --- HIGHEST CONFIDENCE (Specific keywords + full timestamp) ---
            { regex: new RegExp(`Ngày in:?\\s*(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 20, name: "BIDV Print Date (Ngày in)" },
            { regex: new RegExp(`\\b(\\d{2})(\\d{2})(\\d{2})-(\\d{2}):(\\d{2}):(\\d{2})\\b`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 18, name: "DDMMYY-HH:MM:SS format" },
            { regex: new RegExp(`(\\d{1,2})-(\\d{1,2})-(\\d{4})`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: '00', minute: '00', second: '00' }), score: 16, name: "BIDV/Specific DD-MM-YYYY with Keyword" },
            { regex: new RegExp(`(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?\\s*-\\s*(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3], day: m[4], month: m[5], year: m[6] }), score: 15.5, name: "HH:MM(:SS) - DD/MM/YYYY (MB Bank, etc.)" },
            { regex: new RegExp(`(?:Ngày\\s*chuyển|Ngày\\s*thực hiện|Transaction Date)\\s*[:\\s]*?(\\d{1,2})\\s*(?:tháng|thg|/|-|\\.)\\s*(\\d{1,2})(?:,\\s*|\\s+|/|-|\\.)(\\d{4})\\s*(?:lúc|\\@|at|\\s)\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 15, name: "Techcombank & similar" },
            { regex: new RegExp(`(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})-(\\d{1,2}):(\\d{1,2})`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: '00' }), score: 14.9, name: "DD/MM/YYYY-HH:MM (Cleaned Vietinbank iPay style)" },
            { regex: new RegExp(`\\b(\\d{1,2})${dateSeparatorRegexPart}(\\d{1,2})${dateSeparatorRegexPart}(\\d{4})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})\\b`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 14.8, name: "DD/MM/YYYY HH:MM:SS (Common, Boosted)" },
            { regex: new RegExp(`(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?\\s+(?:Thứ\\s*[2-7CNTtBbSsHhNn]{1,7}|Chủ\\s*Nhật|Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\\s*,?\\s*(?:ngày\\s*|date\\s*)?(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3] || '00', day: m[4], month: m[5], year: m[6] }), score: 14.5, name: "HH:MM(:SS) [DayOfWeek] DD/MM/YYYY (VCB)" },
            { regex: new RegExp(`Chuyển\\s*nhanh\\s*Napas\\s*247\\s*:?\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?\\s+(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3], day: m[4], month: m[5], year: m[6] }), score: 14, name: "TPBank Napas" },

            // --- MEDIUM CONFIDENCE (Keywords with date/time or reliable formats) ---
            { regex: new RegExp(`(\\d{4})${dateSeparatorRegexPart}(\\d{1,2})${dateSeparatorRegexPart}(\\d{1,2})[\\sT]+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ year: m[1], month: m[2], day: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 13.5, name: "YYYY-MM-DD[ T]HH:MM:SS (Sacombank, ISO)" },
            { regex: new RegExp(`(?:Ngày\\s*thực\\s*hiện|Date\\s*of\\s*transaction)\\s*:?\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?\\s+(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3], day: m[4], month: m[5], year: m[6] }), score: 13, name: "Ngày thực hiện HH:MM:SS DD/MM/YYYY" },
            { regex: new RegExp(`(?:vào\\s*lúc|lúc|at)\\s*(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})\\s*,?\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 12.5, name: "(vào) lúc/at DD/MM/YYYY HH:MM:SS (BIDV)" },
            { regex: new RegExp(`(?:Thời\\s*gian|Time)\\s*:?\\s*(\\d{1,2}):(\\d{1,2}):(\\d{1,2}),\\s*(?:ngày\\s*)?(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3], day: m[4], month: m[5], year: m[6] }), score: 12, name: "SHB Thời gian/Time" },
            { regex: new RegExp(`(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2})(?!\\d)\\s+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 11.2, name: "DD/MM/YY HH:MM:SS (2-digit year)" },
            { regex: new RegExp(`(?:Ngày\\s*giao dịch|GD|lập lệnh|tạo|thanh toán|chuyển tiền|hạch toán|lập|hiệu lực|ghi nhận|transaction|payment|value)\\s*:?\\s*(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})(?:\\s*,?\\s*(?:lúc|at|@|thời gian|time)|\\s*-)?\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 11, name: "Ngày GD/Keyword DD/MM/YYYY lúc/time HH:MM(:SS)" },
            { regex: new RegExp(`(?:Thời\\s*gian|Time)\\s*(?:lập|tạo|giao dịch|thanh toán|GD|thực hiện|record)\\s*:?\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?\\s*(?:ngày|,|on)?\\s*(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3], day: m[4], month: m[5], year: m[6] }), score: 10, name: "Thời gian/Time ... HH:MM:SS ngày/on DD/MM/YYYY" },

            // --- LOWER CONFIDENCE (More generic, less context) ---
            { regex: new RegExp(`(?<![:\\d\\w])(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{4})\\s+(\\d{1,2}):(\\d{1,2})(?![:\\d])`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: '00' }), score: 9.5, name: "DD/MM/YYYY HH:MM (Standalone, Vietinbank)" },
            { regex: new RegExp(`(?:Ngày\\s*)?(\\d{1,2})\\s*(?:tháng|Thg\\.?|T)?\\s*(${monthTextRegexPart})\\s*(?:năm|nam)?\\s*(\\d{2,4})\\s*(?:vào\\s*lúc|lúc|Time|@)?\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 9, name: "Ngày DD tháng MM năm Yokohama lúc HHMMSS" },
            { regex: new RegExp(`(${monthTextRegexPart})\\s+(\\d{1,2}),\\s*(\\d{4})\\s+(?:at|lúc)\\s+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?\\s*(AM|PM)?`, "i"), parser: (m: any) => { let h = parseInt(m[4], 10); if (m[7] && m[7].toUpperCase() === 'PM' && h < 12) h += 12; if (m[7] && m[7].toUpperCase() === 'AM' && h === 12) h = 0; return { month: m[1], day: m[2], year: m[3], hour: String(h), minute: m[5], second: m[6] }; }, score: 8.8, name: "Month DD, YYYY at HH:MM(:SS) AM/PM" },
            { regex: new RegExp(`(?:Ngày|Date\\s*Time)?:?\\s*(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})[\\s,T]+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 8.5, name: "DD/MM/YYYY[ T]HH:MM:SS (Generic)" },
            { regex: new RegExp(`(?:Vào\\s*lúc|Time):?\\s*(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?,\\s*(?:ngày)?\\s*(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3], day: m[4], month: m[5], year: m[6] }), score: 8, name: "Vào lúc HH:MM, ngày DD/MM/YYYY" },
            { regex: new RegExp(`(?:Date:|Ngày:)?\\s*(\\d{4})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{1,2})[\\sT,]+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?`, "i"), parser: (m: any) => ({ year: m[1], month: m[2], day: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 7.5, name: "YYYY/MM/DD[ T]HH:MM:SS (Generic)" },
            { regex: new RegExp(`(?:^|\\s|[^\\d\\w.,])(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?(?!=\\d{3}[,\\.])\\s+(?:ngày\\s*)?(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ hour: m[1], minute: m[2], second: m[3], day: m[4], month: m[5], year: m[6] }), score: 7, name: "HH:MM:SS DD/MM/YYYY (Improved)" },
            { regex: new RegExp(`(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})\\s+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?\\s*(AM|PM|SA|CH)`, "i"), parser: (m: any) => { let h = parseInt(m[4], 10); const ampm = m[7] ? m[7].toUpperCase() : null; if (ampm) { if ((ampm === 'PM' || ampm === 'CH') && h < 12) h += 12; if ((ampm === 'AM' || ampm === 'SA') && h === 12) h = 0; } return { day: m[1], month: m[2], year: m[3], hour: String(h), minute: m[5], second: m[6] }; }, score: 6.5, name: "DD/MM/YYYY HH:MM(:SS) AM/PM/SA/CH" },

            // --- LOWEST CONFIDENCE (Date only or ambiguous formats) ---
            { regex: new RegExp(`(?:Ngày\\s*giao dịch|GD|lập lệnh|tạo|thanh toán|chuyển tiền|hạch toán|lập|hiệu lực|ghi nhận|transaction|payment|value)\\s*:?\\s*(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})(?!\\s*[:\\d])(?!\\s*\\d{1,2}\\s*VND)`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: '00', minute: '00', second: '00' }), score: 5, name: "Date only with keyword" },
            { regex: new RegExp(`(?<![\\d:\\/\\.-])(\\d{1,2})([\\/\\.-])(${monthTextRegexPart})\\2(\\d{2,4})(?![.,:\\/\\.-]?\\d)(?!\\s*VND|\\s*USD)`, "i"), parser: (m: any) => ({ day: m[1], month: m[3], year: m[4], hour: '00', minute: '00', second: '00' }), score: 4, name: "Date only DD/MM/YYYY (generic)" },
            { regex: new RegExp(`(?:Ngày|Date):?\\s*(\\d{2})(\\d{2})(\\d{4})(?!\\d)`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: '00', minute: '00', second: '00' }), score: 3.5, name: "Date only DDMMYYYY with keyword" },
            { regex: new RegExp(`(?:Ngày|Date):?\\s*(\\d{4})(\\d{2})(\\d{2})(?!\\d)`, "i"), parser: (m: any) => ({ year: m[1], month: m[2], day: m[3], hour: '00', minute: '00', second: '00' }), score: 3, name: "Date only YYYYMMDD with keyword" }
        ];

        // --- MATCHING LOGIC ---
        for (const item of patternsWithParsers) {
            let match;
            const gRegex = new RegExp(item.regex.source, item.regex.flags + (item.regex.flags.includes('g') ? '' : 'g'));

            while ((match = gRegex.exec(cleanedText)) !== null) {
                const components = item.parser(match);
                if (components) {
                    const tempDateTime = parseAndValidateDate(
                        components.day,
                        components.month,
                        components.year,
                        components.hour,
                        components.minute,
                        components.second
                    );

                    if (tempDateTime) {
                        // Prioritize better scores
                        if (item.score > bestMatchScore) {
                            bestMatchScore = item.score;
                            extractedDateTime = tempDateTime;
                            bestMatchDetails = { name: item.name, score: item.score, components, match, rawText: match[0] };
                        }
                        // If scores are equal, prefer matches with a time component over date-only matches
                        else if (item.score === bestMatchScore) {
                            const currentHasTime = bestMatchDetails.components && (bestMatchDetails.components.hour !== '00' || bestMatchDetails.components.minute !== '00');
                            const newHasTime = components.hour && (components.hour !== '00' || components.minute !== '00');
                            if (newHasTime && !currentHasTime) {
                                extractedDateTime = tempDateTime;
                                bestMatchDetails = { name: item.name, score: item.score, components, match, rawText: match[0] };
                            }
                        }
                    }
                }
            }
            // Early exit if a high-confidence match is found
            if (bestMatchScore >= 15 && extractedDateTime) {
                break;
            }
        }

        return extractedDateTime;

    } catch (error) {
        console.error('Lỗi OCR:', error);
        throw new Error('Xử lý ảnh thất bại.');
    }
};