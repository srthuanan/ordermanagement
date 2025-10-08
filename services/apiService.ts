import { API_URL, STOCK_API_URL, ADMIN_USER, SOLD_CARS_API_URL, MONTHS } from '../constants';
import { VcRequestData } from '../components/modals/VcRequestModal';
import { Order } from '../types';

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

const postApi = async (payload: Record<string, any>): Promise<ApiResult> => {
    try {
        const bodyParams = new URLSearchParams();
        for (const key in payload) {
            if (payload[key] !== null && payload[key] !== undefined) {
                bodyParams.append(key, String(payload[key]));
            }
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            body: bodyParams,
        });
        
        const resultText = await response.text();
        let result: ApiResult;
        try {
            result = JSON.parse(resultText);
        } catch (e) {
            console.error("Failed to parse API response as JSON:", resultText);
            throw new Error("API returned an invalid response that was not JSON.");
        }

        if (result.status !== 'SUCCESS') {
            throw new Error(result.message || 'API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown API error occurred.';
        throw new Error(errorMessage);
    }
};

const getApi = async (params: Record<string, any>, baseUrl: string = API_URL): Promise<ApiResult> => {
    const queryParams = new URLSearchParams();
    for (const key in params) {
        if (params[key] !== null && params[key] !== undefined) {
            queryParams.append(key, String(params[key]));
        }
    }
    
    try {
        const response = await fetch(`${baseUrl}?${queryParams.toString()}`, {
            method: 'GET',
        });
        
        const resultText = await response.text();
        let result: ApiResult;
        try {
            result = JSON.parse(resultText);
        } catch (e) {
            console.error("Failed to parse API response as JSON:", resultText);
            throw new Error("API returned an invalid response that was not JSON.");
        }

        if (result.status !== 'SUCCESS') {
            throw new Error(result.message || 'API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        console.error('API service error (GET):', error);
        throw error;
    }
};

const postStockApiWithParams = async (params: Record<string, any>): Promise<ApiResult> => {
    try {
        const bodyParams = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== null && params[key] !== undefined) {
                bodyParams.append(key, String(params[key]));
            }
        }

        const response = await fetch(STOCK_API_URL, {
            method: 'POST',
            body: bodyParams,
        });
        
        const resultText = await response.text();
        let result: ApiResult;
        try {
            result = JSON.parse(resultText);
        } catch (e) {
            console.error("Failed to parse stock API response as JSON:", resultText);
            throw new Error("Stock API returned an invalid response that was not JSON.");
        }

        if (result.status !== 'SUCCESS') {
            throw new Error(result.message || 'Stock API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        console.error('Stock API service error (POST with params):', error);
        throw error;
    }
};

export const getPaginatedData = async (): Promise<ApiResult> => {
    const currentUser = sessionStorage.getItem("currentConsultant") || ADMIN_USER;
    const isAdmin = currentUser === ADMIN_USER;
    const params = {
        action: 'getPaginatedData',
        page: '1',
        pageSize: '9999',
        sortBy: 'Thời gian nhập',
        sortOrder: 'desc',
        filters: JSON.stringify({}),
        currentUser: currentUser,
        isAdmin: String(isAdmin),
    };
    return getApi(params);
};

export const getStockData = async (): Promise<ApiResult> => {
    const currentUser = sessionStorage.getItem("currentConsultant") || ADMIN_USER;
    const isAdmin = currentUser === ADMIN_USER;
    const params = {
        action: 'getKhoXeData',
        currentUser: currentUser,
        isAdmin: String(isAdmin),
    };
    return getApi(params, STOCK_API_URL);
};

export const holdCar = async (vin: string) => {
    const params = {
        action: 'holdCar',
        vin,
        updatedBy: sessionStorage.getItem("currentConsultant") || ADMIN_USER
    };
    return postStockApiWithParams(params);
};

export const releaseCar = async (vin: string) => {
    const params = {
        action: 'releaseCar',
        vin,
        updatedBy: sessionStorage.getItem("currentConsultant") || ADMIN_USER
    };
    return postStockApiWithParams(params);
};

export const addRequest = async (formData: Record<string, string>, chicFile: File) => {
    const chicFileBase64 = await fileToBase64(chicFile);
    const payload = {
        ...formData,
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

export const requestInvoice = async (orderNumber: string, contractFile: File, proposalFile: File) => {
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

export const confirmVinClubVerification = async (orderNumber: string) => {
    const payload = {
        action: 'confirmVinClubVerification',
        orderNumber: orderNumber,
        updatedBy: sessionStorage.getItem("currentConsultant") || "Unknown User",
    };
    return postApi(payload);
};

export const requestVcIssuance = async (orderNumber: string, data: VcRequestData) => {
    const payload: Record<string, any> = {
        action: 'requestVcIssuance',
        orderNumber: orderNumber,
        requestedBy: sessionStorage.getItem("currentConsultant") || "Unknown User",
        customerType: data.customerType,
    };

    const [cavetFrontBase64, cavetBackBase64] = await Promise.all([
        fileToBase64(data.cavetFront),
        fileToBase64(data.cavetBack),
    ]);
    payload.cavetFrontBase64 = cavetFrontBase64;
    payload.cavetFrontName = data.cavetFront.name;
    payload.cavetFrontType = data.cavetFront.type;
    payload.cavetBackBase64 = cavetBackBase64;
    payload.cavetBackName = data.cavetBack.name;
    payload.cavetBackType = data.cavetBack.type;

    if (data.customerType === 'Cá nhân' && data.cccdFront && data.cccdBack) {
        const [cccdFrontBase64, cccdBackBase64] = await Promise.all([
            fileToBase64(data.cccdFront),
            fileToBase64(data.cccdBack),
        ]);
        payload.cccdFrontBase64 = cccdFrontBase64;
        payload.cccdFrontName = data.cccdFront.name;
        payload.cccdFrontType = data.cccdFront.type;
        payload.cccdBackBase64 = cccdBackBase64;
        payload.cccdBackName = data.cccdBack.name;
        payload.cccdBackType = data.cccdBack.type;
    } else if (data.customerType === 'Công ty' && data.gpkd && data.dmsCode) {
        payload.dmsCustomerCode = data.dmsCode;
        payload.gpkdBase64 = await fileToBase64(data.gpkd);
        payload.gpkdName = data.gpkd.name;
        payload.gpkdType = data.gpkd.type;
    }

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

const mapSoldDataRowToOrder = (row: any[], index: number): Order => ({
    "Tên khách hàng": String(row[0] || ''),
    "Số đơn hàng": String(row[2] || `SOLD-${index}`),
    "Dòng xe": String(row[3] || ''),
    "Phiên bản": String(row[4] || ''),
    "Ngoại thất": String(row[5] || ''),
    "Nội thất": String(row[6] || ''),
    "Tên tư vấn bán hàng": String(row[7] || ''),
    "VIN": String(row[8] || ''),
    "Ngày cọc": new Date().toISOString(), 
    "Thời gian nhập": new Date().toISOString(),
    "Thời gian ghép": new Date().toISOString(),
    "Kết quả": "Đã xuất hóa đơn",
    "Trạng thái VC": "Đã xuất hóa đơn",
    "Số ngày ghép": 0,
});


const getSoldDataForMonth = async (sheetName: string): Promise<any[]> => {
    const url = `${SOLD_CARS_API_URL}?sheet=${sheetName}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
             console.warn(`Failed to fetch sold data for ${sheetName}: ${response.statusText}`);
             return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.warn(`Error fetching sold data for ${sheetName}:`, error);
        return [];
    }
};

export const getSoldCarsDataByMonth = async (month: string): Promise<ApiResult> => {
    try {
        const rawData = await getSoldDataForMonth(month);
        const mappedData: Order[] = rawData
            .filter(row => Array.isArray(row) && row.length > 8 && row[8])
            .map(mapSoldDataRowToOrder);
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

export const getAllSoldCarsData = async (): Promise<ApiResult> => {
    try {
        const fetchPromises = MONTHS.map(month => getSoldDataForMonth(month));
        const monthlyResults = await Promise.all(fetchPromises);
        
        const allSoldData: any[][] = monthlyResults.flat().filter(row => Array.isArray(row) && row.length > 8 && row[8]);

        const mappedData: Order[] = allSoldData.map(mapSoldDataRowToOrder);

        return {
            status: 'SUCCESS',
            message: 'Successfully fetched all sold car data.',
            data: mappedData
        };
    } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'An unknown API error occurred while fetching sold cars data.';
        return {
            status: 'ERROR',
            message: errorMessage
        }
    }
};