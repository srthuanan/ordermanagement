import { supabase, supabaseAdmin } from './supabaseClient';
export { supabase };

/**
 * Normalizes a name string by trimming whitespace, collapsing multiple spaces, and ensuring consistent Unicode representation.
 */
export const normalizeName = (name: string): string => {
    if (typeof name !== 'string') return '';
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFC');
};

interface LoginResult {
    success: boolean;
    message?: string;
    token?: string;
    username?: string;
    consultantName?: string;
    role?: string;
    email?: string;
}

/**
 * PURE SUPABASE AUTH LOGIN
 * Đăng nhập trực tiếp qua hệ thống bảo mật của Supabase.
 */
export const login = async (emailOrUsername: string, password: string, rememberMe: boolean = false): Promise<LoginResult> => {
    try {
        const input = emailOrUsername.toLowerCase().trim();
        let email = input;

        // 1. Nếu người dùng nhập Username, chúng ta tìm Email tương ứng trong Profile
        if (!input.includes('@')) {
            const { data: profile } = await supabase
                .from('users')
                .select('email')
                .eq('username', input)
                .maybeSingle();
            
            if (profile?.email) {
                email = profile.email;
            } else {
                return { success: false, message: "Tên đăng nhập không tồn tại trên hệ thống mới." };
            }
        }

        console.log(`[Auth] 🚀 Đang đăng nhập hệ thống mới cho: ${email}`);

        // 2. Xác thực trực tiếp với Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (authError) {
            console.warn("[Auth] ❌ Lỗi xác thực:", authError.message);
            return { success: false, message: "Email hoặc mật khẩu không chính xác." };
        }

        if (authData.user) {
            // 3. Lấy thông tin Profile để hiển thị trên giao diện
            const { data: profile } = await supabase
                .from('users')
                .select('username, full_name, role')
                .eq('email', email)
                .maybeSingle();

            console.log("[Auth] ✅ Đăng nhập THÀNH CÔNG!");
            return applyLoginState({
                username: profile?.username || email.split('@')[0],
                consultantName: profile?.full_name || 'Nhân viên',
                role: profile?.role || 'Tư vấn bán hàng',
                email: email,
                token: authData.session?.access_token
            }, rememberMe);
        }

        return { success: false, message: "Không thể xác định danh tính." };
    } catch (error) {
        console.error("[Auth] 🚨 Lỗi hệ thống:", error);
        return { success: false, message: "Đã xảy ra lỗi kết nối." };
    }
};

export function applyLoginState(data: any, rememberMe: boolean = false): LoginResult {
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("currentUser", data.username);
    sessionStorage.setItem("currentConsultant", data.consultantName);
    sessionStorage.setItem("userRole", data.role);
    sessionStorage.setItem("userEmail", data.email);
    if (data.token) sessionStorage.setItem("token", data.token);

    if (rememberMe) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", data.username);
        localStorage.setItem("currentConsultant", data.consultantName);
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userEmail", data.email);
        if (data.token) localStorage.setItem("token", data.token);
        localStorage.setItem("rememberMe", "true");
    } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("currentConsultant");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("token");
        localStorage.removeItem("rememberMe");
    }

    return { success: true, ...data };
}

export const logout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentConsultant");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
};

/**
 * Khôi phục phiên đăng nhập từ Supabase (nếu có)
 */
export const restoreSession = async (): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return false;

        const { data: profile } = await supabase
            .from('users')
            .select('username, full_name, role')
            .eq('email', session.user.email)
            .maybeSingle();

        const rememberMe = localStorage.getItem('rememberMe') === 'true';

        applyLoginState({
            username: profile?.username || session.user.email?.split('@')[0],
            consultantName: profile?.full_name || 'Nhân viên',
            role: profile?.role || 'Tư vấn bán hàng',
            email: session.user.email,
            token: session.access_token
        }, rememberMe);
        return true;
    } catch (e) {
        console.error("Restore session error:", e);
        return false;
    }
};

export const changePassword = async (username: string, oldPassword: string, newPassword: string): Promise<any> => {
    try {
        console.log(`[Auth] Đang đổi mật khẩu cho ${username} qua Supabase...`);
        // Note: Supabase's updateUser doesn't strictly require oldPassword verify on client side, 
        // but we receive it from UI for consistency.
        if (oldPassword) console.debug("[Auth] Old password provided for verification flow.");
        
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (!error) return { success: true, message: 'Đổi mật khẩu thành công.' };
        return { success: false, message: "Lỗi bảo mật: " + error.message };
    } catch (error) { return { success: false, message: "Lỗi hệ thống." }; }
};

export const forgotPassword = async (email: string): Promise<any> => {
    try {
        console.log(`[Auth] Yêu cầu khôi phục mật khẩu (Native) cho: ${email}`);
        
        // SỬ DỤNG NATIVE SUPABASE AUTH FLOW
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
        });

        if (error) {
            console.error("[Auth] Reset Password Error:", error);
            return { success: false, message: error.message || "Email không tồn tại hoặc lỗi hệ thống." };
        }

        return { success: true, message: 'Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.' };
    } catch (error: any) { 
        console.error("[Auth] Unexpected Forgot Password Error:", error);
        return { success: false, message: "Lỗi hệ thống khi gửi yêu cầu." }; 
    }
};

/**
 * Xác thực mã OTP khôi phục (dành cho người dùng muốn nhập mã thay vì click link)
 */
export const verifyRecoveryOtp = async (email: string, token: string): Promise<any> => {
    try {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'recovery'
        });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message || "Mã xác thực không hợp lệ hoặc đã hết hạn." };
    }
};

export const getInvitationDetails = async (token: string): Promise<any> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('full_name, role, otp_expiry')
            .eq('otp_code', token)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { success: false, message: 'Link mời không tồn tại hoặc đã được sử dụng.' };

        const expiry = new Date(data.otp_expiry);
        if (expiry < new Date()) {
            return { success: false, message: 'Link mời đã hết hạn (sau 48 giờ).' };
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, message: 'Lỗi hệ thống khi kiểm tra Link mời.' };
    }
};

export const completeOnboarding = async (token: string, email: string, password: string): Promise<any> => {
    try {
        // 1. Kiểm tra lại token
        const { data: inv, error: invErr } = await supabase
            .from('users')
            .select('*')
            .eq('otp_code', token)
            .maybeSingle();

        if (invErr || !inv) return { success: false, message: 'Xác thực Link mời thất bại.' };

        // 2. Tạo tài khoản Auth chính thức bằng quyền Admin để bỏ qua việc gửi mail xác nhận
        let authUserId = '';
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: inv.full_name,
                role: inv.role
            }
        });

        if (authErr) {
            // Nếu lỗi do user đã tồn tại, ta lấy UID của user đó để tiếp tục cập nhật profile
            if (authErr.message.includes('already registered')) {
                const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = listData.users.find(u => u.email === email);
                if (existingUser) {
                    authUserId = existingUser.id;
                } else {
                    return { success: false, message: 'Email này đã được đăng ký nhưng không thể truy xuất thông tin.' };
                }
            } else {
                throw authErr;
            }
        } else {
            authUserId = authData.user?.id || '';
        }

        // 3. Cập nhật Profile chính thức bằng quyền Admin để đảm bảo lưu được tên
        const username = email.split('@')[0].toLowerCase();
        const { error: upErr } = await supabaseAdmin
            .from('users')
            .update({
                email: email,
                username: username,
                uid: authUserId,
                otp_code: null,
                otp_expiry: null,
                password_hash: 'SUPABASE_AUTH_ONLY'
            })
            .eq('otp_code', token);

        if (upErr) throw upErr;

        // 4. Đăng nhập thủ công sau khi đã tạo/xác thực tài khoản
        const { error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (signInErr) throw signInErr;

        return { success: true, message: 'Kích hoạt tài khoản thành công!' };
    } catch (error: any) {
        console.error('Onboarding error:', error);
        return { success: false, message: 'Lỗi: ' + error.message };
    }
};

export const resetPassword = async (newPassword: string): Promise<any> => {
    try {
        console.log("[Auth] Đang cập nhật mật khẩu mới qua recovery session...");
        
        // Trong luồng recovery, Supabase đã thiết lập session cho user sau khi họ click link hoặc verify OTP thành công.
        // Chúng ta chỉ cần update mật khẩu.
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        
        if (error) {
            console.error("[Auth] Update password error:", error);
            return { success: false, message: error.message || "Không thể đặt lại mật khẩu." };
        }

        return { success: true, message: 'Mật khẩu của bạn đã được cập nhật thành công.' };
    } catch (error: any) { 
        console.error("[Auth] System error during reset:", error);
        return { success: false, message: "Lỗi hệ thống khi đặt lại mật khẩu." }; 
    }
};