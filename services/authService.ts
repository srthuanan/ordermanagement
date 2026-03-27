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

import { supabase } from './supabaseClient';

// Đã loại bỏ AuthResponse dư thừa

interface LoginResult {
    success: boolean;
    message?: string;
    token?: string;
    // Mở rộng để trả về đầy đủ thông tin AuthResponse
    username?: string;
    consultantName?: string;
    role?: string;
    email?: string;
}

const postAuthRequest = async (params: Record<string, string>): Promise<any> => {
    // Tự động chèn token vào request nếu có
    const token = sessionStorage.getItem("token");
    if (token && !params.token) {
        params.token = token;
    }
    
    const body = new URLSearchParams(params);
    const response = await axios.post(API_URL, body);
    return response.data;
};

export const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
        const normalizedUsername = username.toLowerCase().trim();
        
        // GỌI TRỰC TIẾP SUPABASE ĐỂ AUTH SIÊU TỐC TRÊN WEB
        const { data, error } = await supabase.rpc('user_login', {
            p_username: normalizedUsername,
            p_password: password
        });

        if (error) {
            console.error("Supabase RPC error:", error);
            // Fallback sang GAS nếu Supabase RPC lỗi mạng
            const fallbackData = await postAuthRequest({ action: "login", username: normalizedUsername, password });
            if (fallbackData.success) {
                return applyLoginState(fallbackData);
            }
            return { success: false, message: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
        }

        // data trả về là Object JSONB từ hàm SQL user_login
        if (data && data.success) {
            // KIỂM TRA XEM USER CÓ BỊ KHÓA KHÔNG
            const { data: userRecord } = await supabase
                .from('users')
                .select('is_blocked, block_reason, blocked_until')
                .eq('username', normalizedUsername)
                .maybeSingle();

            if (userRecord?.is_blocked) {
                const now = new Date();
                const blockedUntil = userRecord.blocked_until ? new Date(userRecord.blocked_until) : null;

                // Nếu có thời hạn mở khóa và đã hết hạn -> Tự động cho qua (nhưng Admin vẫn có thể khóa vĩnh viễn nếu blocked_until null)
                if (blockedUntil && now > blockedUntil) {
                    // Tự động giải phóng trạng thái blocked trong DB cho sạch dữ liệu (optional but recommended)
                    await supabase.from('users').update({ is_blocked: false, blocked_until: null, block_reason: null }).eq('username', normalizedUsername);
                } else {
                    let timeMsg = "";
                    if (blockedUntil) {
                        const diffMs = blockedUntil.getTime() - now.getTime();
                        const diffMins = Math.ceil(diffMs / (1000 * 60));
                        timeMsg = ` (Dự kiến mở khóa sau ${diffMins} phút nữa).`;
                    }

                    return { 
                        success: false, 
                        message: `Tài khoản đang bị khóa. Lý do: ${userRecord.block_reason || 'Vi phạm quy định.'}${timeMsg}` 
                    };
                }
            }

            // Sử dụng một Bypass Token đặc biệt để GAS cho phép
            data.token = "FAST_SUPABASE_LOGIN_TOKEN_2026";
            return applyLoginState(data);
        } else {
            return { success: false, message: data?.message || "Tên đăng nhập hoặc mật khẩu không đúng." };
        }
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "Đã xảy ra lỗi hệ thống." };
    }
};

function applyLoginState(data: any): LoginResult {
    const consultantName = data.consultantName || data.username;
    const role = data.role || 'Tư vấn bán hàng';
    const email = data.email; 
    const token = data.token;

    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("currentUser", data.username);
    sessionStorage.setItem("currentConsultant", consultantName);
    sessionStorage.setItem("userRole", role);

    if (email) sessionStorage.setItem("userEmail", email);
    if (token) sessionStorage.setItem("token", token);

    return {
        success: true,
        token: token,
        username: data.username,
        consultantName: consultantName,
        role: role,
        email: email
    };
}

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