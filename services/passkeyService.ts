import { supabase } from './supabaseClient';
import { restoreSession } from './authService';

const PASSKEY_PROFILE_KEY = 'vf_passkey_profile';

// Display hint only. Identity, roles and sessions always come from the server.
export interface PasskeyProfile {
  id: string;
  username: string;
  consultantName: string;
  email: string;
  registeredAt: string;
  version: 2;
}

export const isPasskeySupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.isSecureContext ||
      !window.PublicKeyCredential || !navigator.credentials) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
};

export const getSavedPasskeyProfile = (): PasskeyProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PASSKEY_PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    // Legacy credentials were never registered on the server; require enrollment again.
    if (profile.version !== 2 || typeof profile.id !== 'string' ||
        typeof profile.username !== 'string' || typeof profile.email !== 'string') {
      localStorage.removeItem(PASSKEY_PROFILE_KEY);
      return null;
    }
    return profile;
  } catch { return null; }
};

export const clearPasskeyProfile = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem(PASSKEY_PROFILE_KEY);
};

const errorMessage = (error: unknown): string => {
  const info = error as { name?: string; code?: string; message?: string };
  const description = `${info?.code || ''} ${info?.name || ''} ${info?.message || ''}`;
  if (/NotAllowed|cancel|aborted|timed out/i.test(description))
    return 'Xác thực đã bị hủy hoặc hết thời gian. Bạn có thể thử lại hoặc đăng nhập bằng mật khẩu.';
  if (/disabled|not enabled/i.test(description))
    return 'Hệ thống chưa bật đăng nhập Passkey. Vui lòng liên hệ quản trị viên và đăng nhập bằng mật khẩu.';
  if (/origin|rp_id|SecurityError/i.test(description))
    return 'Tên miền này chưa được cấu hình cho Face ID. Vui lòng liên hệ quản trị viên.';
  return 'Không thể xác thực Face ID. Vui lòng thử lại hoặc đăng nhập bằng mật khẩu.';
};

export const registerPasskey = async (user: {
  username: string; consultantName: string; role: string; email: string; token?: string;
}): Promise<{ success: boolean; message?: string }> => {
  if (!await isPasskeySupported())
    return { success: false, message: 'Thiết bị cần hỗ trợ sinh trắc học và truy cập bằng HTTPS để kích hoạt Face ID.' };
  try {
    const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !verifiedUser?.email || verifiedUser.email.toLowerCase() !== user.email.toLowerCase())
      return { success: false, message: 'Vui lòng đăng nhập lại trước khi kích hoạt Face ID.' };
    const { data, error } = await supabase.auth.registerPasskey();
    if (error) return { success: false, message: errorMessage(error) };
    if (!data) return { success: false, message: 'Không thể tạo Passkey. Vui lòng thử lại.' };
    const profile: PasskeyProfile = {
      id: data.id, username: user.username, consultantName: user.consultantName,
      email: verifiedUser.email, registeredAt: new Date().toISOString(), version: 2,
    };
    // Enrollment remains valid even if the browser blocks local storage.
    try { localStorage.setItem(PASSKEY_PROFILE_KEY, JSON.stringify(profile)); } catch { /* optional hint */ }
    return { success: true };
  } catch (error) { return { success: false, message: errorMessage(error) }; }
};

export const loginWithPasskey = async (rememberMe = true): Promise<{
  success: boolean; message?: string; profile?: PasskeyProfile;
}> => {
  if (!await isPasskeySupported())
    return { success: false, message: 'Thiết bị hoặc trình duyệt chưa hỗ trợ Face ID / Touch ID. Vui lòng đăng nhập bằng mật khẩu.' };
  try {
    const { data, error } = await supabase.auth.signInWithPasskey();
    if (error) return { success: false, message: errorMessage(error) };
    if (!data?.session || !data.user?.email)
      return { success: false, message: 'Không thể tạo phiên đăng nhập. Vui lòng thử lại.' };
    localStorage.setItem('rememberMe', String(rememberMe));
    // Re-fetch server identity and enforce the existing device limits.
    if (!await restoreSession())
      return { success: false, message: 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã đạt giới hạn thiết bị.' };
    return {
      success: true,
      profile: {
        id: data.user.id, email: data.user.email,
        username: sessionStorage.getItem('currentUser') || '',
        consultantName: sessionStorage.getItem('currentConsultant') || '',
        registeredAt: new Date().toISOString(), version: 2,
      },
    };
  } catch (error) { return { success: false, message: errorMessage(error) }; }
};
