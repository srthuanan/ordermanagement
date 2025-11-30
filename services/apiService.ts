import { API_URL, MONTHS, ADMIN_USER } from '../constants';
import { Order } from '../types';

declare const axios: any;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        // Return the full data URL, as the Google Apps Script backend likely expects it.
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

interface ApiResult {
    status: 'SUCCESS' | 'ERROR';
    message: string;
    [key: string]: any;
}

// The new, separate API endpoint for the "Xe Đã Bán" data.
const SOLD_CARS_API_URL = "https://script.google.com/macros/s/AKfycbxOA5IJ8VYSM5WfA_eTbFm0oXmmRSFrn9HL-Gtf71uLqX4BPUambHzxmwLLW7U3dWN_Pw/exec";


// FIX: Replaced fetch with axios for more robust handling of network requests and errors,
// which should resolve the "Failed to fetch" errors. Axios is already loaded globally.
export const postApi = async (payload: Record<string, any>, url: string = API_URL): Promise<ApiResult> => {
    try {
        const bodyParams = new URLSearchParams();
        for (const key in payload) {
            if (payload[key] !== null && payload[key] !== undefined) {
                bodyParams.append(key, String(payload[key]));
            }
        }

        const response = await axios.post(url, bodyParams);
        
        // Handle cases where Google Apps Script returns a stringified JSON
        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;

        if (result.status !== 'SUCCESS') {
            throw new Error(result.message || 'API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'An unknown API error occurred.';
        console.error('API service error (POST):', error);
        throw new Error(errorMessage);
    }
};

// FIX: Replaced fetch with axios for GET requests.
export const getApi = async (params: Record<string, any>, baseUrl: string = API_URL): Promise<ApiResult> => {
    try {
        // FIX: Manually construct the URL to ensure parameters are correctly passed to Google Apps Script.
        // This avoids potential issues with how axios's `params` config interacts with the backend.
        const url = new URL(baseUrl);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                 url.searchParams.append(key, String(params[key]));
            }
        });
        
        const response = await axios.get(url.toString());

        // Handle cases where Google Apps Script returns a stringified JSON
        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
        
        if (result.status !== 'SUCCESS') {
            throw new Error(result.message || 'API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'An unknown API error occurred.';
        console.error('API service error (GET):', error);
        throw new Error(errorMessage);
    }
};

export const getLogData = async (): Promise<ApiResult> => {
    return getApi({ action: 'getLogData' });
};

export const getActiveUsers = async (): Promise<ApiResult> => {
    return getApi({ action: 'getActiveUsers' });
};

export const recordUserPresence = async (): Promise<void> => {
    try {
        const userEmail = sessionStorage.getItem("userEmail");
        if (userEmail) {
            // This is a fire-and-forget call, so no need to await or handle response
            postApi({ action: 'recordUserPresence', userEmail });
        }
    } catch (error) {
        console.warn('Failed to record user presence:', error);
    }
};

export const getPaginatedData = async (usersToView?: string[]): Promise<ApiResult> => {
    const filters: Record<string, any> = {};
    if (usersToView && usersToView.length > 0) {
        filters.usersToView = usersToView;
    }

    const params: Record<string, any> = {
        action: 'getPaginatedData',
        page: '1',
        pageSize: '9999',
        sortBy: 'Thời gian nhập',
        sortOrder: 'desc',
        filters: JSON.stringify(filters),
        isAdmin: 'true', // Always fetch as admin to get all data for client-side filtering and stats.
    };

    return getApi(params);
};

export const getXuathoadonData = async (): Promise<ApiResult> => {
    return getApi({ action: 'getXuathoadonData' });
};

export const getSalesPolicies = async (): Promise<ApiResult> => {
    return getApi({ action: 'getChinhSachData' });
};

export const getYeuCauVcData = async (): Promise<ApiResult> => {
    return getApi({ action: 'getYeuCauVcData' });
};

export const getStockData = async (): Promise<ApiResult> => {
    const currentUser = sessionStorage.getItem("currentConsultant") || ADMIN_USER;
    const isAdmin = currentUser === ADMIN_USER;
    const params = {
        action: 'getKhoXeData',
        currentUser: currentUser,
        isAdmin: String(isAdmin),
    };
    return getApi(params);
};

export const holdCar = async (vin: string) => {
    const params = {
        action: 'holdCar',
        vin,
        updatedBy: sessionStorage.getItem("currentConsultant") || ADMIN_USER
    };
    return postApi(params);
};

export const releaseCar = async (vin: string) => {
    const params = {
        action: 'releaseCar',
        vin,
        updatedBy: sessionStorage.getItem("currentConsultant") || ADMIN_USER
    };
    return postApi(params);
};

export const addRequest = async (formData: Record<string, string>, chicFile: File) => {
    const chicFileBase64 = await fileToBase64(chicFile);
    
    // Create a mutable copy of the form data to avoid side effects
    const payloadData: Record<string, string> = { ...formData };

    // If a specific VIN is provided (from a held car), map it to the backend parameter
    if (payloadData.vin) {
        payloadData.vin_giu_yeu_cau = payloadData.vin;
        delete payloadData.vin; // Remove the original 'vin' key to avoid confusion
    }
    
    const payload = {
        ...payloadData,
        thoi_gian_nhap: new Date().toISOString(),
        action: 'addRequest',
        chic_file_base64: chicFileBase64,
        chic_file_name: chicFile.name,
        chic_file_type: chicFile.type,
    };
    return postApi(payload);
};

export const pairVinToOrder = async (orderNumber: string, vin: string) => {
    const payload = {
        action: 'pairVin',
        orderNumber: orderNumber,
        vin: vin,
        pairedBy: sessionStorage.getItem("currentConsultant") || "Unknown",
    };
    return postApi(payload);
};


export const cancelRequest = async (orderNumber: string, reason: string) => {
    const payload = {
        action: 'cancelRequest',
        orderNumber: orderNumber,
        reason: reason,
        cancelledBy: sessionStorage.getItem("currentConsultant") || "Unknown",
        fromUI: 'true'
    };
    return postApi(payload);
};

export const requestInvoice = async (orderNumber: string, contractFile: File, proposalFile: File, policy: string, commission: string, vpoint: string) => {
    const [contractBase64, proposalBase64] = await Promise.all([
        fileToBase64(contractFile),
        fileToBase64(proposalFile)
    ]);

    const payload = {
        action: 'requestInvoice',
        orderNumber: orderNumber,
        requestedBy: sessionStorage.getItem("currentConsultant") || "Unknown User",
        hop_dong_file_base64: contractBase64,
        hop_dong_file_name: contractFile.name,
        hop_dong_file_type: contractFile.type,
        denghi_xhd_file_base64: proposalBase64,
        denghi_xhd_file_name: proposalFile.name,
        denghi_xhd_file_type: proposalFile.type,
        selectedPolicies: policy,
        commissionAmount: commission,
        vpointAmount: vpoint,
    };
    
    return postApi(payload);
};

export const uploadSupplementaryFiles = async (orderNumber: string, contractFile: File | null, proposalFile: File | null) => {
    const payload: Record<string, any> = {
        action: 'updateInvoiceFiles',
        orderNumber: orderNumber,
        updatedBy: sessionStorage.getItem("currentConsultant") || "Unknown User",
    };

    if (contractFile) {
        payload.hop_dong_file_base64 = await fileToBase64(contractFile);
        payload.hop_dong_file_name = contractFile.name;
        payload.hop_dong_file_type = contractFile.type;
    }
    if (proposalFile) {
        payload.denghi_xhd_file_base64 = await fileToBase64(proposalFile);
        payload.denghi_xhd_file_name = proposalFile.name;
        payload.denghi_xhd_file_type = proposalFile.type;
    }

    return postApi(payload);
};

export const updateOrderDetails = async (orderNumber: string, details: Partial<Order>): Promise<ApiResult> => {
    const payload = {
        action: 'updateOrderDetails',
        updatedBy: sessionStorage.getItem("currentConsultant") || "Unknown User",
        orderNumber,
        ...details
    };
    return postApi(payload);
};

export const fetchAllArchivedData = async (): Promise<ApiResult> => {
    const currentUser = sessionStorage.getItem("currentConsultant") || "Unknown User";
    const params = {
        action: 'getAllArchivedDataForUser',
        currentUser: currentUser,
        isAdmin: String(currentUser === ADMIN_USER),
    };
    return getApi(params);
};

export const fetchNotifications = async (): Promise<ApiResult> => {
    const currentUser = sessionStorage.getItem("currentConsultant") || ADMIN_USER;
    const params = {
        action: 'getNotifications',
        currentUser: currentUser,
        isAdmin: String(currentUser === ADMIN_USER),
    };
    return getApi(params);
};

export const markAllNotificationsAsRead = async () => {
    const payload = {
        action: 'markAllNotificationsAsRead',
        currentUser: sessionStorage.getItem("currentConsultant") || ADMIN_USER,
        timestamp: new Date().toISOString(),
    };
    return postApi(payload);
};

export const markNotificationAsRead = async (notificationId: string) => {
    const payload = {
        action: 'markNotificationAsRead',
        notificationId: notificationId,
        currentUser: sessionStorage.getItem("currentConsultant") || ADMIN_USER,
        timestamp: new Date().toISOString(),
    };
    return postApi(payload);
};

// --- SOLD CARS API FUNCTIONS ---

// Helper to fetch raw data for a specific month from the sold cars sheet
const getSoldDataForMonth = async (sheetName: string): Promise<any[]> => {
    const url = `${SOLD_CARS_API_URL}?sheet=${sheetName}`;
    try {
        const response = await axios.get(url);
        const data = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
        // The API can return an object with the sheet name as a key, or just an array
        if (data && data[sheetName] && Array.isArray(data[sheetName])) return data[sheetName];
        if (Array.isArray(data)) return data;
        return [];
    } catch (error) {
        console.warn(`Error fetching sold data for ${sheetName}:`, error);
        return [];
    }
};

// Helper to map raw array row to Order object, mimicking legacy file logic
const mapSoldDataRowToOrder = (row: any[], index: number, month?: string): Order => {
    let saleDate = new Date().toISOString();
    if (month) {
        const monthIndex = MONTHS.indexOf(month);
        if (monthIndex > -1) {
            const year = new Date().getFullYear();
            // Set to middle of the month as a placeholder to satisfy the type
            saleDate = new Date(year, monthIndex, 15).toISOString();
        }
    }
    return {
        "Tên khách hàng": String(row[0] || ''),
        "Số đơn hàng": String(row[2] || `SOLD-${month}-${index}`), // Ensure a unique key
        "Dòng xe": String(row[3] || ''),
        "Phiên bản": String(row[4] || ''),
        "Ngoại thất": String(row[5] || ''),
        "Nội thất": String(row[6] || ''),
        "Tên tư vấn bán hàng": String(row[7] || ''),
        "VIN": String(row[8] || ''),
        "CHÍNH SÁCH": String(row[9] || ''),
        // Mock required fields from Order type for consistency
        "Ngày cọc": saleDate, 
        "Thời gian nhập": saleDate,
        "Thời gian ghép": saleDate,
        "Kết quả": "Đã xuất hóa đơn",
    };
};

// New function to get data for a specific month, used by the SoldCarsView component
export const getSoldCarsDataByMonth = async (month: string): Promise<ApiResult> => {
    try {
        const rawData = await getSoldDataForMonth(month);
        const mappedData: Order[] = rawData
            .filter(row => Array.isArray(row) && row.length > 8 && row[8]) // Filter for rows with a VIN
            .map((row, index) => mapSoldDataRowToOrder(row, index, month));
        return {
            status: 'SUCCESS',
            message: `Successfully fetched data for ${month}.`,
            data: mappedData,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `An unknown error occurred while fetching data for ${month}.`;
        return { status: 'ERROR', message: errorMessage };
    }
};

// This function will be used by the useSoldCarsApi hook to get all yearly data
export const getAllSoldCarsData = async (): Promise<ApiResult> => {
    try {
        const fetchPromises = MONTHS.map(month => 
            getSoldDataForMonth(month).then(data => ({ month, data }))
        );
        const monthlyResults = await Promise.all(fetchPromises);
        
        const allSoldDataWithMonth = monthlyResults.flatMap(({ month, data }) => 
            data
                .filter(row => Array.isArray(row) && row.length > 8 && row[8]) // Filter for rows with a VIN
                .map(row => ({ row, month }))
        );

        const mappedData: Order[] = allSoldDataWithMonth.map(({row, month}, index) => mapSoldDataRowToOrder(row, index, month));

        return {
            status: 'SUCCESS',
            message: 'Successfully fetched all sold car data.',
            data: mappedData
        };
    } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching sold cars data.';
        return {
            status: 'ERROR',
            message: errorMessage
        }
    }
};


export const requestVinClub = async (payload: Record<string, any>): Promise<ApiResult> => {
    const apiPayload = {
        action: 'requestVinClub',
        ...payload,
        requestedBy: sessionStorage.getItem("currentConsultant") || "Unknown User",
    };
    return postApi(apiPayload);
};


// --- Admin Actions ---

// Helper for user management API which returns a different response format { success: true }
const postUserApi = async (payload: Record<string, any>): Promise<ApiResult> => {
    try {
        const bodyParams = new URLSearchParams();
        for (const key in payload) {
            if (payload[key] !== null && payload[key] !== undefined) {
                bodyParams.append(key, String(payload[key]));
            }
        }

        const response = await axios.post(API_URL, bodyParams);
        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;

        if (!result.success) {
            throw new Error(result.message || 'User API returned an unspecified error.');
        }

        // Translate the response to the standard ApiResult format
        const { success, ...apiResultData } = result;
        return {
            status: 'SUCCESS',
            ...apiResultData,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown user API error occurred.';
        throw new Error(errorMessage);
    }
};

export const getTeamData = async (): Promise<ApiResult> => {
    return getApi({ action: 'getTeamData' });
};

export const getUsers = async (): Promise<ApiResult> => {
    return getApi({ action: 'getUsers' });
};


export const performAdminAction = async (action: string, params: Record<string, any>): Promise<ApiResult> => {
    const currentUser = sessionStorage.getItem("currentUser") || "Unknown Admin";
    
    // Actions related to user/team management use a different API format but same URL now
    if (['addUser', 'updateTeams'].includes(action)) {
        return postUserApi({ action, ...params, adminUser: currentUser });
    }

    // All other admin actions use the standard API_URL and format
    return postApi({ action, ...params, adminUser: currentUser });
};

export const getOrderHistory = async (orderNumber: string): Promise<ApiResult> => {
    return getApi({ action: 'getOrderHistory', orderNumber });
}

export const uploadBulkInvoices = async (filesData: any[]): Promise<ApiResult> => {
    const payload = {
        action: 'handleBulkUploadIssuedInvoices',
        filesData: JSON.stringify(filesData),
        uploadedBy: sessionStorage.getItem("currentConsultant") || "Admin",
    };
    return postApi(payload);
};

// --- Test Drive Actions ---

/**
 * Generic POST helper for Test Drive and Auth actions which may use a different success response format.
 * It normalizes various success responses to the standard { status: 'SUCCESS' } format.
 * @param payload The data to post.
 * @returns A promise that resolves to an ApiResult.
 */
const postLegacyApi = async (payload: Record<string, any>): Promise<ApiResult> => {
    try {
        const bodyParams = new URLSearchParams();
        for (const key in payload) {
            if (payload[key] !== undefined && payload[key] !== null) {
                bodyParams.append(key, String(payload[key]));
            }
        }

        const response = await axios.post(API_URL, bodyParams);
        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
        
        // FIX: Accommodate inconsistent backend responses for success status.
        // Some functions return `success: true`, while others return `status: 'SUCCESS'`.
        const isSuccess = result.success === true || result.status === 'SUCCESS';

        if (!isSuccess) {
            throw new Error(result.message || 'API returned a failure response.');
        }

        // Normalize the response to the standard ApiResult format
        const { success, ...apiResultData } = result;
        return {
            status: 'SUCCESS',
            ...apiResultData,
        };
    } catch (error) {
        const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'An unknown API error occurred.';
        console.error('Legacy API service error (POST):', error);
        throw new Error(errorMessage);
    }
};


export const getTestDriveSchedule = async (): Promise<ApiResult> => {
    return getApi({ action: 'getTestDriveSchedule' });
};

export const saveTestDriveBooking = async (bookingData: any): Promise<ApiResult> => {
    return postLegacyApi({ action: 'saveTestDriveBooking', ...bookingData });
};

export const updateTestDriveCheckin = async (payload: {
    soPhieu: string;
    odoBefore?: string;
    imagesBefore?: { name: string; type: string; data: string }[];
    odoAfter?: string;
    imagesAfter?: { name: string; type: string; data: string }[];
    updateMode?: 'append';
}): Promise<ApiResult> => {
    const apiPayload: Record<string, any> = {
        action: 'submitTestDriveCheckin',
        soPhieu: payload.soPhieu,
        updatedBy: sessionStorage.getItem("currentConsultant") || "Unknown User",
    };

    if (payload.odoBefore) apiPayload.odoBefore = payload.odoBefore;
    if (payload.imagesBefore) apiPayload.imagesBefore = JSON.stringify(payload.imagesBefore);
    if (payload.odoAfter) apiPayload.odoAfter = payload.odoAfter;
    if (payload.imagesAfter) apiPayload.imagesAfter = JSON.stringify(payload.imagesAfter);
    
    return postLegacyApi(apiPayload);
};

export const deleteTestDriveBooking = async (soPhieu: string): Promise<ApiResult> => {
    return postLegacyApi({ action: 'deleteTestDriveBooking', soPhieu, deletedBy: sessionStorage.getItem("currentConsultant") || "Unknown User" });
};