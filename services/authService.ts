import { LOGIN_API_URL } from '../constants';
declare const axios: any;

export const userToConsultantMap: Record<string, string> = {
    'admin': 'PHẠM THÀNH NHÂN', 'bachttn': 'TRẦN THỊ NGUYỆT BẠCH', 'thangtq': 'TỐNG QUỐC THẮNG', 'vinhtn': 'THÀNH NGỌC VINH',
    'taone': 'PHẠM NHÂN', 'thaont': 'NGUYỄN THIỆN THẢO', 'tuanna': 'NGUYỄN ANH TUẤN', 'nhandt': 'ĐINH TRỌNG NHÂN',
    'thanhnth': 'NGUYỄN TRẦN HOÀNG THANH', 'phucnh': 'NGUYỄN HOÀNG PHÚC', 'phuongtd': 'TRẦN DANH PHƯƠNG', 'tuongtb': 'TẤT BÁCH TƯỜNG',
    'vinhl': 'LÝ KIM VINH', 'nguyenhtt': 'HỒ THỊ THẢO NGUYÊN', 'huypt': 'PHẠM TRỌNG HUY', 'giapnv': 'NGUYỄN VĂN GIÁP',
    'haivv': 'VŨ VIẾT HẢI', 'nhungnth': 'NGUYỄN THỊ HỒNG NHUNG', 'kydm': 'ĐÀO MINH KÝ', 'ngaptt': 'PHẠM THỊ THÚY NGA',
    'tannd': 'NGUYỄN DUY TÂN', 'ducdt': 'ĐINH TÀI ĐỨC', 'dattt': 'TỐNG THÀNH ĐẠT', 'haink': 'NGUYỄN KIM HẢI',
    'xuyennb': 'NGUYỄN BẢO XUYÊN', 'diennt': 'NGUYỄN THỊ DIỆN', 'trungnm': 'NGUYỄN MINH TRUNG', 'cant': 'NGUYỄN THANH CẢ',
    'tienna': 'NGUYỄN ANH TIẾN', 'namlv': 'LÊ VĂN NAM', 'tramhdt': 'HUỲNH DIỆP THANH TRÂM', 'thanhldv': 'LÊ DƯ VĂN THÀNH', 'chinhtc': 'TRANG CÔNG CHÍNH',
    'lanvt': 'VÕ THẾ LÂN', 'vynty': 'NGUYỄN THỊ YẾN VY', 'huyhkn': 'NGUYỄN HOÀNG KHANG HUY',
    'thanhdn': 'ĐỒNG NGỌC THÀNH',
};

export const userRoleMap: Record<string, string> = {
    'admin': 'Quản trị viên',
    'bachttn': 'Tư vấn bán hàng',
    'thangtq': 'Tư vấn bán hàng',
    'vinhtn': 'Tư vấn bán hàng',
    'taone': 'Tư vấn bán hàng',
    'thaont': 'Tư vấn bán hàng',
    'tuanna': 'Tư vấn bán hàng',
    'nhandt': 'Trưởng Phòng Kinh Doanh',
    'thanhnth': 'Tư vấn bán hàng',
    'phucnh': 'Tư vấn bán hàng',
    'phuongtd': 'Tư vấn bán hàng',
    'tuongtb': 'Trưởng Phòng Kinh Doanh',
    'vinhl': 'Tư vấn bán hàng',
    'nguyenhtt': 'Tư vấn bán hàng',
    'huypt': 'Tư vấn bán hàng',
    'giapnv': 'Tư vấn bán hàng',
    'haivv': 'Tư vấn bán hàng',
    'nhungnth': 'Tư vấn bán hàng',
    'kydm': 'Tư vấn bán hàng',
    'ngaptt': 'Tư vấn bán hàng',
    'tannd': 'Tư vấn bán hàng',
    'ducdt': 'Tư vấn bán hàng',
    'dattt': 'Tư vấn bán hàng',
    'haink': 'Tư vấn bán hàng',
    'xuyennb': 'Tư vấn bán hàng',
    'diennt': 'Tư vấn bán hàng',
    'trungnm': 'Tư vấn bán hàng',
    'cant': 'Tư vấn bán hàng',
    'tienna': 'Tư vấn bán hàng',
    'namlv': 'Tư vấn bán hàng',
    'tramhdt': 'Tư vấn bán hàng',
    'thanhldv': 'Tư vấn bán hàng',
    'chinhtc': 'Tư vấn bán hàng',
    'lanvt': 'Tư vấn bán hàng',
    'vynty': 'Tư vấn bán hàng',
    'huyhkn': 'Tư vấn bán hàng',
    'thanhdn': 'Tư vấn bán hàng',
};

export const teamMap: Record<string, string[]> = {
    'ĐINH TRỌNG NHÂN': [
        'NGUYỄN THIỆN THẢO',
        'THÀNH NGỌC VINH',
        'TRẦN DANH PHƯƠNG',
        'NGUYỄN HOÀNG PHÚC',
        'NGUYỄN ANH TIẾN',
        'PHẠM THỊ THÚY NGA',
        'VÕ THẾ LÂN',
        'NGUYỄN THỊ YẾN VY',
        'NGUYỄN HOÀNG KHANG HUY',
    ],
    'TẤT BÁCH TƯỜNG': [
        'NGUYỄN ANH TUẤN',
        'NGUYỄN TRẦN HOÀNG THANH',
        'PHẠM TRỌNG HUY',
        'ĐÀO MINH KÝ',
        'TỐNG THÀNH ĐẠT',
        'HUỲNH DIỆP THANH TRÂM',
        'TRANG CÔNG CHÍNH',
        'TỐNG QUỐC THẮNG',
        'ĐỒNG NGỌC THÀNH',
    ]
};

/**
 * Normalizes a name string by trimming whitespace, collapsing multiple spaces, and ensuring consistent Unicode representation.
 * This is crucial for matching names between the local teamMap and the remote data source.
 * @param name The name to normalize.
 * @returns The normalized name.
 */
export const normalizeName = (name: string): string => {
    if (typeof name !== 'string') return '';
    return name
        .trim() // Remove leading/trailing whitespace
        .replace(/\s+/g, ' ') // Collapse multiple spaces into one
        .normalize('NFC'); // Normalize Unicode characters
};


interface LoginResult {
    success: boolean;
    message?: string;
}

export const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
        const response = await axios.post(LOGIN_API_URL, null, { params: { action: "login", username, password } });
        if (response.data.success) {
            const loggedInUsername = response.data.username.toLowerCase();
            const consultantName = userToConsultantMap[loggedInUsername] || response.data.username;
            const role = userRoleMap[loggedInUsername] || 'Tư vấn bán hàng';

            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("currentUser", response.data.username);
            sessionStorage.setItem("currentConsultant", consultantName);
            sessionStorage.setItem("userRole", role);
            return { success: true };
        } else {
            return { success: false, message: response.data.message || "Tên đăng nhập hoặc mật khẩu không đúng." };
        }
    } catch (error) {
        console.error("Login API error:", error);
        return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
};

export const logout = () => {
    sessionStorage.clear();
};

interface ForgotPasswordResult {
    success: boolean;
    message?: string;
    username?: string;
}

export const forgotPassword = async (email: string): Promise<ForgotPasswordResult> => {
    try {
        const response = await axios.post(LOGIN_API_URL, null, { params: { action: "forgotPassword", email } });
        if (response.data.success) {
            return { success: true, username: response.data.username, message: response.data.message };
        } else {
            return { success: false, message: response.data.message || "Email không tồn tại trong hệ thống." };
        }
    } catch (error) {
        console.error("Forgot Password API error:", error);
        return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
};

interface ResetPasswordResult {
    success: boolean;
    message?: string;
}

export const resetPassword = async (username: string, otp: string, newPassword: string): Promise<ResetPasswordResult> => {
    try {
        const response = await axios.post(LOGIN_API_URL, null, { params: { action: "resetPassword", username, otp, newPassword } });
        if (response.data.success) {
            return { success: true, message: response.data.message };
        } else {
            return { success: false, message: response.data.message || "Đặt lại mật khẩu thất bại." };
        }
    } catch (error) {
        console.error("Reset Password API error:", error);
        return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
};

interface ChangePasswordResult {
    success: boolean;
    message?: string;
}

export const changePassword = async (username: string, oldPassword: string, newPassword: string): Promise<ChangePasswordResult> => {
    try {
        const response = await axios.post(LOGIN_API_URL, null, { params: { action: "changePassword", username, oldPassword, newPassword } });
        if (response.data.success) {
            return { success: true, message: response.data.message };
        } else {
            return { success: false, message: response.data.message || "Đổi mật khẩu thất bại." };
        }
    } catch (error) {
        console.error("Change Password API error:", error);
        return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
};