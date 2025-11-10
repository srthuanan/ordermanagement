import { API_URL } from '../constants';
declare const axios: any;

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

// Định nghĩa cấu trúc dữ liệu trả về khi đăng nhập thành công
interface AuthResponse {
    success: boolean;
    username: string;
    consultantName: string;
    role: string;
    email?: string; // Thêm trường email
}

interface LoginResult {
    success: boolean;
    message?: string;
    // Mở rộng để trả về đầy đủ thông tin AuthResponse
    username?: string;
    consultantName?: string;
    role?: string;
    email?: string;
}


const postAuthRequest = async (params: Record<string, string>): Promise<any> => {
    const body = new URLSearchParams(params);
    const response = await axios.post(API_URL, body);
    return response.data;
};


export const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
        // data sẽ có kiểu AuthResponse từ backend
        const data: AuthResponse = await postAuthRequest({ action: "login", username: username.toLowerCase(), password });
        
        if (data.success && data.username && data.consultantName) {
            // Lấy consultant name và role từ API response.
            // Fallback về username và vai trò mặc định nếu không có.
            const consultantName = data.consultantName || data.username;
            const role = data.role || 'Tư vấn bán hàng';
            const email = data.email; // Lấy email từ phản hồi

            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("currentUser", data.username);
            sessionStorage.setItem("currentConsultant", consultantName);
            sessionStorage.setItem("userRole", role);
            
            // LƯU EMAIL VÀO SESSIONSTORAGE
            if (email) {
                sessionStorage.setItem("userEmail", email);
            }
            
            return { 
                success: true, 
                username: data.username, 
                consultantName: consultantName, 
                role: role, 
                email: email 
            };
        } else {
            return { success: false, message: (data as any).message || "Tên đăng nhập hoặc mật khẩu không đúng." };
        }
    } catch (error) {
        console.error("Login API error:", error);
        return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
};

export const logout = () => {
    sessionStorage.clear();
};

interface ChangePasswordResult {
    success: boolean;
    message?: string;
}

export const changePassword = async (username: string, oldPassword: string, newPassword: string): Promise<ChangePasswordResult> => {
    try {
        const data = await postAuthRequest({ action: "changePassword", username: username.toLowerCase(), oldPassword, newPassword });
        if (data.success) {
            return { success: true, message: data.message };
        } else {
            return { success: false, message: data.message || "Đổi mật khẩu thất bại." };
        }
    } catch (error) {
        console.error("Change Password API error:", error);
        return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
};

export const forgotPassword = async (email: string): Promise<LoginResult> => {
    try {
        const data = await postAuthRequest({ action: "forgotPassword", email });
        if (data.success) {
            return { success: true, message: data.message };
        } else {
            return { success: false, message: data.message || "Yêu cầu mã OTP thất bại." };
        }
    } catch (error) {
        console.error("Forgot Password API error:", error);
        const message = error instanceof Error ? error.message : "Không thể kết nối đến máy chủ.";
        return { success: false, message };
    }
};

export const resetPassword = async (email: string, otp: string, newPassword: string): Promise<LoginResult> => {
    try {
        const data = await postAuthRequest({ action: "resetPassword", email, otp, newPassword });
        if (data.success) {
            return { success: true, message: data.message };
        } else {
            return { success: false, message: data.message || "Đặt lại mật khẩu thất bại." };
        }
    } catch (error) {
        console.error("Reset Password API error:", error);
        const message = error instanceof Error ? error.message : "Không thể kết nối đến máy chủ.";
        return { success: false, message };
    }
};