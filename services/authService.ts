import { LOGIN_API_URL } from '../constants';
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


interface LoginResult {
    success: boolean;
    message?: string;
}

const postAuthRequest = async (params: Record<string, string>): Promise<any> => {
    const body = new URLSearchParams(params);
    const response = await axios.post(LOGIN_API_URL, body);
    return response.data;
};


export const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
        const data = await postAuthRequest({ action: "login", username: username.toLowerCase(), password });
        if (data.success) {
            // Get consultant name and role from the API response.
            // Fallback to username and a default role if not provided.
            const consultantName = data.consultantName || data.username;
            const role = data.role || 'Tư vấn bán hàng';

            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("currentUser", data.username);
            sessionStorage.setItem("currentConsultant", consultantName);
            sessionStorage.setItem("userRole", role);
            return { success: true };
        } else {
            return { success: false, message: data.message || "Tên đăng nhập hoặc mật khẩu không đúng." };
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
