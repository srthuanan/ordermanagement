import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, mapOrderDbToUi, ApiResult, ADMIN_USER, SOLD_CARS_API_URL, getApi } from './baseService';
import { MONTHS } from '../../constants';
import axios from 'axios';

const getSoldDataForMonth = async (month: string, year: number): Promise<any[]> => {
    const sheetName = `${month} ${year}`;
    const url = `${SOLD_CARS_API_URL}?sheet=${sheetName}`;
    try {
        const response = await axios.get(url);
        const data = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
        if (data && data[sheetName] && Array.isArray(data[sheetName])) return data[sheetName];
        if (data && data[sheetName]) return data[sheetName];
        if (Array.isArray(data)) return data;
        return [];
    } catch (error) {
        console.warn(`Error fetching sold data for ${sheetName}:`, error);
        return [];
    }
};

const mapSoldDataRowToOrder = (row: any[], index: number, month?: string, year?: number): any => {
    let saleDate = new Date().toISOString();
    if (month) {
        const monthIndex = MONTHS.indexOf(month);
        if (monthIndex > -1) {
            const y = year || new Date().getFullYear();
            saleDate = new Date(y, monthIndex, 15).toISOString();
        }
    }
    return {
        "Tên khách hàng": String(row[0] || ''), "Số đơn hàng": String(row[2] || `SOLD-${month}-${year}-${index}`),
        "Dòng xe": String(row[3] || ''), "Phiên bản": String(row[4] || ''), "Ngoại thất": String(row[5] || ''),
        "Nội thất": String(row[6] || ''), "Tên tư vấn bán hàng": String(row[7] || ''), "VIN": String(row[8] || ''),
        "CHÍNH SÁCH": String(row[9] || ''), "Ngày cọc": saleDate, "Thời gian nhập": saleDate, "Thời gian ghép": saleDate, "Kết quả": "Đã xuất hóa đơn",
    };
};

export const getSoldCarsDataByMonth = async (month: string, year: number): Promise<ApiResult> => {
    try {
        const currentUser = (getStorageItem("currentConsultant") || "Unknown User").trim();
        const currentUserName = (getStorageItem("currentUser") || "").toLowerCase();
        const userRole = getStorageItem("userRole");
        const lowerRole = String(userRole).toLowerCase();
        
        // --- PHÂN QUYỀN ---
        // 1. Admin/Giám Đốc: Xem được tất cả
        const isTrueAdmin = 
            currentUser === ADMIN_USER || 
            currentUserName === 'nhanpt' ||
            currentUserName === 'admin' ||
            lowerRole.includes('quản trị') || 
            lowerRole.includes('admin') ||
            lowerRole.includes('giám đốc');

        // 2. TPKD (Trưởng Phòng Kinh Doanh): Xem được của cả PKD mình
        const isManager = lowerRole.includes('trưởng phòng');
        
        // Danh sách tên TVBH cần filter (nếu không phải Admin)
        let teamMembers: string[] = [currentUser];
        if (isManager && !isTrueAdmin) {
            // Lấy danh sách nhân viên trong phòng từ bảng users
            const { data: teamData } = await supabaseAdmin
                .from('users')
                .select('full_name')
                .eq('manager_id', currentUserName);
            
            if (teamData && teamData.length > 0) {
                teamMembers = [currentUser, ...teamData.map(u => u.full_name)];
            }
        }
        
        const monthNum = MONTHS.indexOf(month);
        const m = (monthNum !== -1) ? monthNum : (parseInt(month) - 1);
        
        // --- DATA FETCHING ---
        // Từ tháng 1/2026 trở về trước thì lấy từ Google Sheets
        if (year < 2026 || (year === 2026 && m === 0)) {
            const rawData = await getSoldDataForMonth(month, year);
            let mappedData = rawData.filter(row => Array.isArray(row) && row.length > 2 && row[2]).map((row, index) => mapSoldDataRowToOrder(row, index, month, year));
            
            if (!isTrueAdmin) {
                const lowerTeamMembers = teamMembers.map(name => name.toLowerCase().trim());
                mappedData = mappedData.filter((order: any) => 
                    lowerTeamMembers.includes(String(order["Tên tư vấn bán hàng"]).toLowerCase().trim())
                );
            }

            return { status: 'SUCCESS', message: `Fetched data from Google Sheets for ${month} ${year}.`, data: mappedData };
        }

        // Tạo định dạng YYYY-MM-DD an toàn để tránh lỗi time zone của Postgres 
        const startMonthStr = `${m + 1}`.padStart(2, '0');
        const endDateObj = new Date(year, m + 1, 0);
        const endDayStr = `${endDateObj.getDate()}`.padStart(2, '0');
        
        const startDateString = `${year}-${startMonthStr}-01`;
        const endDateString = `${year}-${startMonthStr}-${endDayStr}T23:59:59.999Z`;

        // Truy vấn bảng yeucauxhd (cho xe hiện tại)
        let queryYeucau = supabase.from('yeucauxhd').select('*').not('ngay_xuat_hoa_don', 'is', null).gte('ngay_xuat_hoa_don', startDateString).lte('ngay_xuat_hoa_don', endDateString);
        
        // Apply Filters
        if (!isTrueAdmin) {
            if (isManager) {
                queryYeucau = queryYeucau.in('tvbh', teamMembers);
            } else {
                queryYeucau = queryYeucau.eq('tvbh', currentUser);
            }
        }
        
        const { data: yeucauData, error: err1 } = await queryYeucau;
        if (err1) console.warn("Yeucauxhd query issue:", err1);

        // Truy vấn bảng archived_orders (cho xe cũ qua 1 tháng)
        let queryArchived = supabase.from('archived_orders').select('*').not('ngay_xuat_hoa_don', 'is', null).gte('ngay_xuat_hoa_don', startDateString).lte('ngay_xuat_hoa_don', endDateString);
        
        if (!isTrueAdmin) {
            if (isManager) {
                queryArchived = queryArchived.in('tvbh', teamMembers);
            } else {
                queryArchived = queryArchived.eq('tvbh', currentUser);
            }
        }
        
        const { data: archivedData, error: err2 } = await queryArchived;
        if (err2) console.warn("Archived query issue:", err2);

        // Cả 2 bảng này đều có cột tvbh thay vì ten_tu_van_ban_hang, cần map lại.
        const combinedRawData = [...(yeucauData || []), ...(archivedData || [])];
        const normalizedData = combinedRawData.map(row => ({
             ...row,
             ket_qua: 'Đã xuất hóa đơn', // Hardcode cho UI vì table yeucauxhd không giữ cột ket_qua
             ten_tu_van_ban_hang: row.tvbh,
             link_hoa_don_da_xuat: row.url_hoa_don_da_xuat
        }));

        return { status: 'SUCCESS', message: 'Fetched sold cars FROM Supabase', data: normalizedData.map(mapOrderDbToUi) };
    } catch (err: any) {
        console.error("GET_SOLD_CARS_ERROR Supabase failed, falling back to GAS:", err);
        return getApi({ action: 'getSoldCarsData', month, year, isAdmin: String(getStorageItem("userRole")).includes('Quản trị viên') }, SOLD_CARS_API_URL);
    }
};

export const getAllSoldCarsData = async (year: number): Promise<ApiResult> => {
    try {
        const currentUser = (getStorageItem("currentConsultant") || "Unknown User").trim();
        const currentUserName = (getStorageItem("currentUser") || "").toLowerCase();
        const userRole = getStorageItem("userRole");
        const lowerRole = String(userRole).toLowerCase();
        
        const isTrueAdmin = 
            currentUser === ADMIN_USER || 
            currentUserName === 'nhanpt' ||
            currentUserName === 'admin' ||
            lowerRole.includes('quản trị') || 
            lowerRole.includes('admin') ||
            lowerRole.includes('giám đốc');

        const isManager = lowerRole.includes('trưởng phòng');
        
        let teamMembers: string[] = [currentUser];
        if (isManager && !isTrueAdmin) {
            const { data: teamData } = await supabaseAdmin
                .from('users')
                .select('full_name')
                .eq('manager_id', currentUserName);
            
            if (teamData && teamData.length > 0) {
                teamMembers = [currentUser, ...teamData.map(u => u.full_name)];
            }
        }
        
        // --- TRANSITION LOGIC 2026 ---
        if (year < 2026) {
           const fallbackResult = await getApi({ action: 'getAllSoldCarsData', year, isAdmin: isTrueAdmin }, SOLD_CARS_API_URL);
           if (!isTrueAdmin && fallbackResult.status === 'SUCCESS' && Array.isArray(fallbackResult.data)) {
               const lowerTeamMembers = teamMembers.map(name => name.toLowerCase().trim());
               fallbackResult.data = fallbackResult.data.filter((order: any) => 
                   lowerTeamMembers.includes(String(order["Tên tư vấn bán hàng"]).toLowerCase().trim())
               );
           }
           return fallbackResult;
        }

        // If year is 2026: January from Sheets, Feb-Dec from Supabase
        let sheetsData: any[] = [];
        if (year === 2026) {
            const janRaw = await getSoldDataForMonth("January", 2026);
            sheetsData = janRaw
                .filter(row => Array.isArray(row) && row.length > 2 && row[2])
                .map((row, index) => mapSoldDataRowToOrder(row, index, "January", 2026));
            
            if (!isTrueAdmin) {
                const lowerTeamMembers = teamMembers.map(name => name.toLowerCase().trim());
                sheetsData = sheetsData.filter((order: any) => 
                    lowerTeamMembers.includes(String(order["Tên tư vấn bán hàng"]).toLowerCase().trim())
                );
            }
        }

        const startDateString = (year === 2026) ? `${year}-02-01` : `${year}-01-01`;
        const endDateString = `${year}-12-31T23:59:59.999Z`;
        
        // Current Query
        let queryYeucau = supabase.from('yeucauxhd').select('*').not('ngay_xuat_hoa_don', 'is', null).gte('ngay_xuat_hoa_don', startDateString).lte('ngay_xuat_hoa_don', endDateString);
        if (!isTrueAdmin) {
            if (isManager) queryYeucau = queryYeucau.in('tvbh', teamMembers);
            else queryYeucau = queryYeucau.eq('tvbh', currentUser);
        }
        const { data: yeucauData, error: err1 } = await queryYeucau;
        if (err1) console.warn("Yeucauxhd query issue in getAll:", err1);

        // Archived Query
        let queryArchived = supabase.from('archived_orders').select('*').not('ngay_xuat_hoa_don', 'is', null).gte('ngay_xuat_hoa_don', startDateString).lte('ngay_xuat_hoa_don', endDateString);
        if (!isTrueAdmin) {
            if (isManager) queryArchived = queryArchived.in('tvbh', teamMembers);
            else queryArchived = queryArchived.eq('tvbh', currentUser);
        }
        const { data: archivedData, error: err2 } = await queryArchived;
        if (err2) console.warn("Archived query issue in getAll:", err2);

        const combinedRawData = [...(yeucauData || []), ...(archivedData || [])];
        const supabaseNormalized = combinedRawData.map(row => ({
             ...row,
             ket_qua: 'Đã xuất hóa đơn',
             ten_tu_van_ban_hang: row.tvbh,
             link_hoa_don_da_xuat: row.url_hoa_don_da_xuat
        })).map(mapOrderDbToUi);

        const finalData = [...sheetsData, ...supabaseNormalized];

        return { 
            status: 'SUCCESS', 
            message: `Fetched data for ${year} (${sheetsData.length} from Sheets, ${supabaseNormalized.length} from Supabase)`, 
            data: finalData 
        };
    } catch (err: any) {
        console.error("GET_ALL_SOLD_CARS_ERROR Supabase failed, falling back to GAS:", err);
        return getApi({ action: 'getAllSoldCarsData', year, isAdmin: String(getStorageItem("userRole")).includes('Quản trị viên') }, SOLD_CARS_API_URL);
    }
};
