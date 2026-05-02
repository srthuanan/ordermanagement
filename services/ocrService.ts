import { supabase } from './supabaseClient';
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
            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas as any
            }).promise;

            // Convert canvas to compressed JPEG Data URL
            const imgData = canvas.toDataURL('image/jpeg', quality);

            // Add page to new PDF
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

/**
 * Chuyển đổi một tệp PDF thành danh sách các ảnh Base64 (JPEG)
 * Hàm này rất quan trọng để AI có thể đọc được nội dung các tệp PDF đã tách trang.
 * @param file Đối tượng File PDF
 * @returns Mảng các đối tượng chứa base64Data và mimeType
 */
export const convertPdfToImages = async (
    file: File, 
    onPageProcessed?: (img: { base64Data: string; mimeType: string }) => Promise<void>
): Promise<{ base64Data: string; mimeType: string }[]> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdfDocument = await loadingTask.promise;
        const numPages = pdfDocument.numPages;

        const results: { base64Data: string; mimeType: string }[] = [];

        // Xử lý tuần tự để có thể gọi callback ngay lập tức và tránh quá tải bộ nhớ
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            
            // Tính toán scale để giới hạn chiều rộng/cao tối đa 1600px
            const unscaledViewport = page.getViewport({ scale: 1.0 });
            const maxDimension = 1600;
            const scale = Math.min(maxDimension / unscaledViewport.width, maxDimension / unscaledViewport.height, 1.2);
            
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if (!context) throw new Error('Canvas context error');
            
            await page.render({ canvasContext: context, viewport: viewport, canvas: canvas as any }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
            const img = { base64Data: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
            
            results.push(img);
            
            // Gọi callback ngay khi xử lý xong một trang
            if (onPageProcessed) {
                await onPageProcessed(img);
            }
        }

        return results;
    } catch (error) {
        console.error('Lỗi khi chuyển đổi PDF sang ảnh:', error);
        throw new Error('Không thể xử lý tệp PDF.');
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

/**
 * Sử dụng AI Gemini (qua Edge Function) để nhận diện ngày cọc chính xác hơn Tesseract.
 * Thường dùng cho các tài liệu khó đọc hoặc chữ viết tay.
 */
export const extractDateWithGemini = async (
    file: File,
    onProgress: (status: string) => void
): Promise<string | null> => {
    try {
        console.log(`[extractDateWithGemini] Starting for file: ${file.name} (${file.type})`);
        onProgress('Đang xử lý');
        
        // Chuyển file sang Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = (e) => reject(new Error('Lỗi đọc file: ' + e));
            reader.readAsDataURL(file);
        });
        
        const base64Data = await base64Promise;
        
        if (!supabase || !supabase.functions) {
            throw new Error('Supabase client chưa được khởi tạo đúng cách.');
        }

        const { data: result, error } = await supabase.functions.invoke('extract-date', {
            body: {
                files: [
                    { base64Data, mimeType: file.type || 'image/jpeg', fileName: file.name }
                ]
            }
        });

        if (error) throw error;
        
        if (result && result.data && result.data.ngay_coc) {
            return result.data.ngay_coc;
        }

        return null;
    } catch (error: any) {
        console.error('Gemini OCR Error:', error);
        return null;
    }
};

export const extractDateFromImageTesseract = async (
    file: File,
    onProgress: (status: string) => void
): Promise<string | null> => {
    if (typeof Tesseract === 'undefined') {
        throw new Error('Thư viện Tesseract chưa tải.');
    }

    try {
        onProgress('Đang xử lý');
        const { data: { text } } = await Tesseract.recognize(file, 'vie+eng', {
            logger: (m: any) => {
                if (m.status === 'recognizing text') {
                    onProgress('Đang xử lý');
                }
            }
        });
        onProgress('Đang xử lý');

        let cleanedText = text.replace(/\n+/g, ' ');
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(giờ|h|hr|g)\s*(\d{1,2})\s*(?:phút|phut|ph|p|min|m)?\s*(?:(\d{1,2})\s*(?:giây|giay|s|sec)?)?/gi, (_match: string, h: string, _hourWord: string, m: string, s: string) => `${h}:${m}${s ? ':' + s : ''}`);
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(?:giờ|h|hr|g)\s*(\d{1,2})(?!\s*(?:phút|phut|ph|p|min|m))/gi, '$1:$2');
        cleanedText = cleanedText.replace(/(\d{1,2})\s*(phút|phut|ph|p|min|m)\s*(\d{1,2})/gi, '$1:$2');
        cleanedText = cleanedText.replace(/(\d{1,2})\s*:\s*(\d{1,2})\s*(?:phút|phut|ph|p|min|m)/gi, '$1:$2');
        cleanedText = cleanedText.replace(/\s*:\s*/g, ':').replace(/\s*-\s*/g, '-').replace(/\s*\/\s*/g, '/').replace(/\s*\.\s*/g, '.');
        cleanedText = cleanedText.replace(/[\u200B-\u200D\uFEFF]/g, '');

        let extractedDateTime = null;
        let bestMatchScore = -1;

        const monthTextRegexPart = `(?:tháng|thg|t|Tháng|Thg\\.?|T\\.)?\\s*\\d{1,2}[\\.,]{0,2}|[A-Za-zÀ-ỹ]{3,}`;
        const dateSeparatorRegexPart = `[\\s\\/\\.-]+`;

        const patternsWithParsers = [
            { regex: new RegExp(`(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: m[6] }), score: 20 },
            { regex: new RegExp(`(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s+(\\d{1,2}):(\\d{1,2})`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5], second: '00' }), score: 15 },
            { regex: new RegExp(`(\\d{1,2})${dateSeparatorRegexPart}(${monthTextRegexPart})${dateSeparatorRegexPart}(\\d{2,4})`, "i"), parser: (m: any) => ({ day: m[1], month: m[2], year: m[3], hour: '00', minute: '00', second: '00' }), score: 10 }
        ];

        for (const item of patternsWithParsers) {
            let match;
            const gRegex = new RegExp(item.regex.source, item.regex.flags + (item.regex.flags.includes('g') ? '' : 'g'));
            while ((match = gRegex.exec(cleanedText)) !== null) {
                const components = item.parser(match);
                const tempDateTime = parseAndValidateDate(components.day, components.month, components.year, components.hour, components.minute, components.second);
                if (tempDateTime && item.score > bestMatchScore) {
                    bestMatchScore = item.score;
                    extractedDateTime = tempDateTime;
                }
            }
        }
        return extractedDateTime;
    } catch (error) {
        console.error('Lỗi OCR:', error);
        throw new Error('Xử lý ảnh thất bại.');
    }
};