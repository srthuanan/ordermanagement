export interface CrmUser {
    userId: number;
    userName: string;
    fullName: string;
}

export interface CrmModel {
    maKx: string;
    tenKx: string;
}

export interface CrmSource {
    maPtlh: string;
    tenPtlh: string;
}

export interface CrmStatus {
    maTtkh: string;
    tenTtkh: string;
}

export interface CrmPaymentMethod {
    maHttt: string;
    tenHttt: string;
}

export interface CrmColor {
    maMau: string;
    tenMau: string;
}

export interface CrmMetadata {
    users: CrmUser[];
    models: CrmModel[];
    sources: CrmSource[];
    statuses: CrmStatus[];
    colors?: CrmColor[];
    paymentMethods: CrmPaymentMethod[];
}

export interface CrmLeadInput {
    fullName: string;
    phone: string;
    phone2?: string;
    model?: string;         // mã hoặc tên dòng xe
    color?: string;         // mã hoặc tên màu xe
    source?: string;        // mã hoặc tên nguồn
    status?: string;        // mã hoặc tên trạng thái
    paymentMethod?: string; // mã hoặc tên hình thức TT
    note?: string;
    address?: string;
}

export interface CrmDuplicateInfo {
    phone: string;
    idKh: string;
    tenKh: string;
    userName: string;
    ngayTao: string;
    tenKx: string;
    tenTtkh: string;
    tenPtlh: string;
}

export interface CrmCheckDuplicateResponse {
    success: boolean;
    duplicates: Record<string, CrmDuplicateInfo>;
    error?: string;
}

export interface CrmImportResponse {
    success: boolean;
    data?: {
        createdCount: number;
        errorCount: number;
        created: Array<{ idKh: string; tenKh: string; phone: string }>;
        errors: Array<{ tenKh: string; phone: string; error: string }>;
    };
    message?: string;
    error?: string;
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

    const isStaticHosting = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
    if (isStaticHosting) {
        return cloudApiUrl ? [`${cloudApiUrl.replace(/\/+$/, '')}${apiPath}`] : [];
    }

    return [
        ...(cloudApiUrl ? [`${cloudApiUrl.replace(/\/+$/, '')}${apiPath}`] : []),
        `${currentOrigin}${apiPath}`
    ];
};

/**
 * Lấy danh mục metadata Cyber CRM (TVBH, Dòng xe, Nguồn tiếp cận, Trạng thái khách, Hình thức TT)
 */
export const fetchCrmMetadata = async (force = false): Promise<{ success: boolean; data?: CrmMetadata; error?: string }> => {
    const endpoints = getEndpoints(`/api/cyber/crm-metadata${force ? '?force=true' : ''}`);
    let lastErrorMsg = '';

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const res = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    return { success: true, data: json.data };
                }
                if (json.error) lastErrorMsg = json.error;
            } else {
                lastErrorMsg = `HTTP ${res.status}`;
            }
        } catch (err: any) {
            lastErrorMsg = err.name === 'AbortError' ? 'Timeout' : (err.message || 'Lỗi kết nối');
        }
    }

    return {
        success: false,
        error: `Không thể tải danh mục Cyber CRM: ${lastErrorMsg}. Vui lòng kiểm tra kết nối Cyber.`
    };
};

/**
 * Kiểm tra trùng lặp số điện thoại trên hệ thống Cyber CRM
 */
export const checkCrmDuplicates = async (phones: string[]): Promise<CrmCheckDuplicateResponse> => {
    const cleanPhones = Array.from(new Set(
        phones
            .map(p => (p || '').replace(/[^\d]/g, '').trim())
            .filter(p => p.length >= 9)
    ));

    if (cleanPhones.length === 0) {
        return { success: true, duplicates: {} };
    }

    const endpoints = getEndpoints('/api/cyber/crm-check-duplicates');
    let lastErrorMsg = '';

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones: cleanPhones }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    return { success: true, duplicates: json.duplicates || {} };
                }
                if (json.error) lastErrorMsg = json.error;
            } else {
                lastErrorMsg = `HTTP ${res.status}`;
            }
        } catch (err: any) {
            lastErrorMsg = err.name === 'AbortError' ? 'Timeout' : (err.message || 'Lỗi kết nối');
        }
    }

    return {
        success: false,
        duplicates: {},
        error: `Kiểm tra trùng SĐT thất bại: ${lastErrorMsg}`
    };
};

/**
 * Nạp danh sách khách hàng tiềm năng vào Cyber CRM
 */
export const importCrmLeads = async (
    userName: string,
    leads: CrmLeadInput[],
    maDvcs = '02',
    maTtcp = '02.01.08'
): Promise<CrmImportResponse> => {
    if (!userName) {
        return { success: false, error: 'Chưa chọn tài khoản TVBH tiếp nhận khách hàng!' };
    }
    if (!leads || leads.length === 0) {
        return { success: false, error: 'Danh sách khách hàng trống!' };
    }

    const endpoints = getEndpoints('/api/cyber/crm-import-khtn');
    let lastErrorMsg = '';

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            // Cho phép timeout dài hơn (60s) nếu nạp số lượng lớn
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName,
                    leads,
                    maDvcs,
                    maTtcp
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const json = await res.json();
                return json;
            } else {
                const errData = await res.json().catch(() => ({}));
                lastErrorMsg = errData.message || errData.error || `HTTP ${res.status}`;
            }
        } catch (err: any) {
            lastErrorMsg = err.name === 'AbortError' ? 'Hết thời gian chờ phản hồi từ Cyber (Timeout)' : (err.message || 'Lỗi kết nối');
        }
    }

    return {
        success: false,
        error: `Không thể nạp dữ liệu vào Cyber: ${lastErrorMsg}. Vui lòng kiểm tra lại.`
    };
};
