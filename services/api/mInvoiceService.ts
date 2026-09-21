import { uploadBulkInvoices } from './adminService';

export interface MInvoiceFetchResult {
    success: boolean;
    status: string;
    message: string;
    data?: {
        vin: string;
        invoiceNumber: string | number;
        serial: string;
        dateSign: string | null;
        isSigned: boolean;
        buyer: string;
        totalAmount: number;
        fileName: string;
        fileSize: number;
        base64Pdf?: string;
    };
}

const getEndpoints = (apiPath: string): string[] => {
    const customUrl = (typeof window !== 'undefined' ? localStorage.getItem('cyber_api_url') : '') || '';
    const cloudApiUrl = ((import.meta as any).env?.VITE_CYBER_API_URL || customUrl || 'https://cybersync-api.onrender.com').trim();
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const isLocal = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '5173'
    );

    if (isLocal) {
        return [
            `${currentOrigin}${apiPath}`,
            `http://localhost:3001${apiPath}`,
            `http://localhost:5173${apiPath}`,
            ...(cloudApiUrl ? [`${cloudApiUrl.replace(/\/+$/, '')}${apiPath}`] : [])
        ];
    }

    // On static hosting like GitHub Pages, currentOrigin has no /api backend
    const isStaticHosting = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
    if (isStaticHosting) {
        return cloudApiUrl ? [`${cloudApiUrl.replace(/\/+$/, '')}${apiPath}`] : [];
    }

    return [
        ...(cloudApiUrl ? [`${cloudApiUrl.replace(/\/+$/, '')}${apiPath}`] : []),
        `${currentOrigin}${apiPath}`
    ];
};

export const base64ToFile = (base64Str: string, fileName: string, mimeType = 'application/pdf'): File => {
    const cleanBase64 = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
};

export const fetchMInvoiceByVin = async (vin: string, onlySigned = true): Promise<MInvoiceFetchResult> => {
    const cleanVin = (vin || '').trim().toUpperCase();
    if (!cleanVin) {
        return { success: false, status: 'NO_VIN', message: 'Đơn hàng chưa có số VIN (Số khung).' };
    }

    const endpoints = getEndpoints('/api/minvoice/fetch-invoice');
    let lastErrorMsg = '';

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vin: cleanVin, only_signed: onlySigned }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                return data;
            } else {
                const errData = await res.json().catch(() => ({}));
                lastErrorMsg = errData.message || errData.error || `HTTP ${res.status}`;
            }
        } catch (err: any) {
            lastErrorMsg = err.name === 'AbortError' ? 'Hết thời gian kết nối (Timeout)' : (err.message || 'Lỗi kết nối Local Server');
        }
    }

    return {
        success: false,
        status: 'SERVER_UNAVAILABLE',
        message: `Không thể kết nối dịch vụ lấy hóa đơn: ${lastErrorMsg}. Vui lòng đảm bảo đã bật file Tai_Hoa_Don_Minvoice.bat hoặc start-cyber-sync.bat!`
    };
};

export const syncAndNotifyMInvoice = async (
    vin: string,
    orderNumber?: string
): Promise<{ success: boolean; status?: string; message: string; data?: any }> => {
    const cleanVin = (vin || '').trim().toUpperCase();
    const cleanOrderNo = (orderNumber || '').trim();
    if (!cleanVin && !cleanOrderNo) {
        return { success: false, status: 'NO_VIN', message: 'Cần cung cấp số VIN hoặc số đơn hàng.' };
    }

    const endpoints = getEndpoints('/api/minvoice/sync-and-notify');
    let lastErrorMsg = '';

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vin: cleanVin, orderNumber: cleanOrderNo }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                return data;
            } else {
                const errData = await res.json().catch(() => ({}));
                lastErrorMsg = errData.message || errData.error || `HTTP ${res.status}`;
            }
        } catch (err: any) {
            lastErrorMsg = err.name === 'AbortError' ? 'Hết thời gian kết nối (Timeout)' : (err.message || 'Lỗi kết nối máy chủ');
        }
    }

    return {
        success: false,
        status: 'SERVER_UNAVAILABLE',
        message: `Không thể kết nối máy chủ xuất hóa đơn: ${lastErrorMsg}`
    };
};

export const autoFetchAndUploadInvoice = async (
    order: any, 
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string; invoiceNumber?: string | number }> => {
    const vin = (order.VIN || order.vin || order['SỐ VIN'] || order['Số VIN'] || '').trim().toUpperCase();
    const orderNo = (order['Số đơn hàng'] || order.so_don_hang || '').trim();

    if (!vin && !orderNo) {
        return { success: false, message: `Đơn hàng chưa có thông tin số đơn hàng hoặc số VIN!` };
    }

    onProgress?.(`Đang tự động lấy hóa đơn M-Invoice, lưu Supabase và gửi email...`);
    
    // Ưu tiên 1: Gọi server Python (Render / Local) thực hiện trọn gói end-to-end
    const syncRes = await syncAndNotifyMInvoice(vin, orderNo);
    if (syncRes.success) {
        return {
            success: true,
            message: syncRes.message,
            invoiceNumber: syncRes.data?.invoiceNumber
        };
    }

    // Nếu M-Invoice phản hồi trạng thái nghiệp vụ (chưa ký, không tìm thấy...), trả về ngay
    if (syncRes.status && syncRes.status !== 'SERVER_UNAVAILABLE') {
        return { success: false, message: syncRes.message };
    }

    // Ưu tiên 2 (Dự phòng): Quy trình client tải file và upload thông thường
    onProgress?.(`Đang tra cứu số VIN ${vin} trên M-Invoice...`);
    const res = await fetchMInvoiceByVin(vin, true);

    if (!res.success) {
        return { success: false, message: res.message };
    }

    const invoiceData = res.data;
    if (!invoiceData?.base64Pdf) {
        return { success: false, message: 'Không nhận được dữ liệu file PDF từ M-Invoice.' };
    }

    onProgress?.(`Đã tìm thấy HĐ ${invoiceData.invoiceNumber} (${invoiceData.serial}). Đang tự động đính kèm và xuất hóa đơn...`);
    
    try {
        const file = base64ToFile(invoiceData.base64Pdf, invoiceData.fileName, 'application/pdf');
        const uploadRes = await uploadBulkInvoices([{
            orderNumber: orderNo,
            fileObject: file,
            mimeType: 'application/pdf',
            fileName: file.name
        }]);

        if (uploadRes.status === 'SUCCESS') {
            return {
                success: true,
                message: `Thành công! Đã tự động lấy hóa đơn số ${invoiceData.invoiceNumber} (${invoiceData.serial}) và cập nhật đơn hàng sang "Đã xuất hóa đơn".`,
                invoiceNumber: invoiceData.invoiceNumber
            };
        } else {
            return {
                success: false,
                message: uploadRes.message || 'Tải file lên hệ thống thất bại.'
            };
        }
    } catch (err: any) {
        return {
            success: false,
            message: `Lỗi xử lý file hóa đơn: ${err.message || String(err)}`
        };
    }
};
