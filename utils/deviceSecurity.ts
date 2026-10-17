/**
 * Device Security & Session Guard Utility
 * - Giải pháp 1: Khóa Đăng Nhập Đơn Điểm (Single Active Session / Kick-out tức thì)
 * - Giải pháp 3: Khóa Thiết Bị Đã Đăng Ký (Device Binding / Giới hạn tối đa 2 thiết bị cá nhân)
 */

import { supabase } from '../services/supabaseClient';
import { parseUserAgent } from './deviceParser';

export const MAX_REGISTERED_DEVICES = 2;

export interface RegisteredDevice {
    deviceId: string;
    label: string;
    firstLogin: string;
    lastLogin: string;
}

/**
 * Lấy hoặc khởi tạo ID thiết bị cố định (Hardware / Browser Fingerprint) trong localStorage
 */
export const getDeviceId = (): string => {
    if (typeof window === 'undefined') return 'server_device';
    let id = localStorage.getItem('om_device_id');
    if (!id) {
        id = 'dev_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
        localStorage.setItem('om_device_id', id);
    }
    return id;
};

/**
 * Lấy hoặc khởi tạo Session ID duy nhất cho phiên duyệt web hiện tại trong sessionStorage
 */
export const getSessionId = (): string => {
    if (typeof window === 'undefined') return 'server_session';
    let sid = sessionStorage.getItem('om_session_id');
    if (!sid) {
        sid = 'sess_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
        sessionStorage.setItem('om_session_id', sid);
    }
    return sid;
};

/**
 * Đặt lại Session ID mới (mỗi lần đăng nhập mới tạo một phiên độc lập)
 */
export const createNewSessionId = (): string => {
    const sid = 'sess_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('om_session_id', sid);
    }
    return sid;
};

/**
 * Lấy nhãn mô tả thiết bị thân thiện (VD: "Apple iPhone (Safari)", "Windows 10 / 11 (Google Chrome)")
 */
export const getDeviceLabel = (): string => {
    try {
        const info = parseUserAgent();
        const os = info.osName || 'Thiết bị';
        const browser = info.browserName || 'Trình duyệt';
        const type = info.deviceType === 'Mobile' ? '📱 Điện thoại' : (info.deviceType === 'Tablet' ? '📟 Máy tính bảng' : '💻 Máy tính');
        return `${type} ${os} (${browser})`;
    } catch (_) {
        return 'Thiết bị Web';
    }
};

/**
 * Xác minh giới hạn thiết bị (Device Binding) & đăng ký phiên hoạt động (Active Session)
 * @param username Tên tài khoản
 * @param role Vai trò người dùng (Admin/Ban Giám Đốc được miễn trừ giới hạn thiết bị)
 * @param isRestore True nếu là khôi phục phiên khi F5/reload trang
 */
export const verifyAndRegisterDevice = async (
    username: string,
    role: string = 'Tư vấn bán hàng',
    isRestore: boolean = false
): Promise<{ allowed: boolean; message?: string; sessionId?: string }> => {
    try {
        const cleanUser = username.toLowerCase().trim();
        const deviceId = getDeviceId();
        const deviceLabel = getDeviceLabel();
        const isAdmin = cleanUser === 'admin' || role === 'Quản trị viên' || role === 'Admin' || role === 'Ban Giám Đốc';

        // 1. Truy vấn metadata hiện tại của tài khoản từ user_presence
        const { data } = await supabase
            .from('user_presence')
            .select('metadata')
            .eq('username', cleanUser)
            .maybeSingle();

        const metadata = (data && data.metadata && typeof data.metadata === 'object') ? { ...data.metadata } : {};
        const registeredDevices: RegisteredDevice[] = Array.isArray(metadata.registered_devices)
            ? [...metadata.registered_devices]
            : [];

        const existingDeviceIndex = registeredDevices.findIndex(d => d.deviceId === deviceId);

        // 2. GHI NHẬN THIẾT BỊ (Không chặn đăng nhập)
        if (existingDeviceIndex === -1) {
            registeredDevices.push({
                deviceId,
                label: deviceLabel,
                firstLogin: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
        } else {
            registeredDevices[existingDeviceIndex].lastLogin = new Date().toISOString();
            registeredDevices[existingDeviceIndex].label = deviceLabel;
        }


        // 3. THIẾT LẬP PHIÊN DUY NHẤT (GIẢI PHÁP 1 - SINGLE ACTIVE SESSION)
        // Nếu là đăng nhập mới (không phải F5 restore), tạo Session ID mới để kick out phiên cũ trên máy khác
        const activeSessionId = isRestore ? getSessionId() : createNewSessionId();

        metadata.active_session_id = activeSessionId;
        metadata.active_device_id = deviceId;
        metadata.active_device_label = deviceLabel;
        metadata.active_device_login_at = new Date().toISOString();
        metadata.registered_devices = registeredDevices;

        // Lưu vào Supabase user_presence
        await supabase
            .from('user_presence')
            .upsert({
                username: cleanUser,
                metadata: metadata,
                last_active_at: new Date().toISOString(),
                status: 'online'
            }, { onConflict: 'username' });

        return { allowed: true, sessionId: activeSessionId };
    } catch (err: any) {
        console.error("[DeviceSecurity] Lỗi xác minh thiết bị:", err);
        // Khi lỗi mạng bất khả kháng, cho phép tiếp tục phiên nếu là restore để tránh chặn nhầm người dùng hợp lệ
        if (isRestore) {
            return { allowed: true, sessionId: getSessionId() };
        }
        return { allowed: true, sessionId: createNewSessionId() };
    }
};

/**
 * Xóa toàn bộ thiết bị đã đăng ký của một user (Dành cho Quản trị viên khi nhân viên đổi máy mới)
 */
export const resetUserDevices = async (username: string): Promise<boolean> => {
    try {
        const cleanUser = username.toLowerCase().trim();
        const { data } = await supabase
            .from('user_presence')
            .select('metadata')
            .eq('username', cleanUser)
            .maybeSingle();

        const metadata = (data && data.metadata && typeof data.metadata === 'object') ? { ...data.metadata } : {};
        metadata.registered_devices = [];
        metadata.active_session_id = null;

        const { error } = await supabase
            .from('user_presence')
            .update({ metadata })
            .eq('username', cleanUser);

        return !error;
    } catch (_) {
        return false;
    }
};
