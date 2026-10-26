/**
 * Passkey / WebAuthn Service for VinFast TVBH
 * Cho phép đăng nhập bằng Face ID / Touch ID trực tiếp trên Safari iOS (iPhone)
 * và Chrome / Android mà không cần mua tài khoản Apple Developer 99$.
 */

import { applyLoginState } from './authService';

const PASSKEY_PROFILE_KEY = 'vf_passkey_profile';

export interface PasskeyProfile {
  id: string;
  username: string;
  consultantName: string;
  role: string;
  email: string;
  token?: string;
  credentialId?: string;
  registeredAt: string;
}

// Chuyển chuỗi thành Uint8Array
const strToBuffer = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

/**
 * Kiểm tra xem thiết bị và trình duyệt có hỗ trợ Face ID / Touch ID (WebAuthn Platform Authenticator) hay không
 */
export const isPasskeySupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Lấy thông tin tài khoản đã kích hoạt Face ID trên thiết bị này
 */
export const getSavedPasskeyProfile = (): PasskeyProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PASSKEY_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Xóa Passkey khỏi thiết bị
 */
export const clearPasskeyProfile = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PASSKEY_PROFILE_KEY);
};

/**
 * Kích hoạt Face ID / Passkey cho tài khoản hiện tại trên iPhone / Android
 */
export const registerPasskey = async (user: {
  username: string;
  consultantName: string;
  role: string;
  email: string;
  token?: string;
}): Promise<{ success: boolean; message?: string }> => {
  if (typeof window === 'undefined' || !navigator.credentials) {
    return { success: false, message: 'Trình duyệt của bạn không hỗ trợ công nghệ Face ID WebAuthn.' };
  }

  try {
    const supported = await isPasskeySupported();
    if (!supported) {
      return { success: false, message: 'Thiết bị chưa cài đặt hoặc không hỗ trợ Face ID / sinh trắc học.' };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBuffer = strToBuffer(user.username || user.email);

    const publicKeyCredentialCreationOptions: any = {
      challenge,
      rp: {
        name: 'VinFast Thuận An',
        id: window.location.hostname,
      },
      user: {
        id: userIdBuffer,
        name: user.email,
        displayName: user.consultantName || user.username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Bắt buộc Face ID / Touch ID của máy
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    // iPhone sẽ bật camera Face ID quét khuôn mặt ngay tại đây!
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions as any,
    })) as PublicKeyCredential;

    if (credential) {
      const profile: PasskeyProfile = {
        id: credential.id,
        username: user.username,
        consultantName: user.consultantName,
        role: user.role,
        email: user.email,
        token: user.token,
        credentialId: credential.id,
        registeredAt: new Date().toISOString(),
      };

      localStorage.setItem(PASSKEY_PROFILE_KEY, JSON.stringify(profile));
      return { success: true };
    }

    return { success: false, message: 'Không thể tạo khóa bảo mật Face ID.' };
  } catch (err: any) {
    console.warn('[Passkey] Lỗi đăng ký:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, message: 'Bạn đã bấm hủy hoặc Face ID chưa nhận diện được khuôn mặt.' };
    }
    return { success: false, message: err.message || 'Lỗi hệ thống sinh trắc học.' };
  }
};

/**
 * Đăng nhập bằng Face ID trên iPhone / Android
 */
export const loginWithPasskey = async (): Promise<{
  success: boolean;
  message?: string;
  profile?: PasskeyProfile;
}> => {
  if (typeof window === 'undefined' || !navigator.credentials) {
    return { success: false, message: 'Trình duyệt không hỗ trợ Face ID.' };
  }

  const savedProfile = getSavedPasskeyProfile();
  if (!savedProfile) {
    return {
      success: false,
      message: 'Thiết bị này chưa kích hoạt Face ID. Vui lòng đăng nhập bằng Email lần đầu.',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions: any = {
      challenge,
      rpId: window.location.hostname,
      userVerification: 'required',
      timeout: 60000,
    };

    if (savedProfile.credentialId) {
      publicKeyCredentialRequestOptions.allowCredentials = [
        {
          id: strToBuffer(savedProfile.credentialId),
          type: 'public-key',
        },
      ];
    }

    // iPhone sẽ bật camera Face ID quét khuôn mặt để xác thực!
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions as any,
    });

    if (assertion) {
      // Đăng nhập thành công, phục hồi session
      applyLoginState(
        {
          username: savedProfile.username,
          consultantName: savedProfile.consultantName,
          role: savedProfile.role,
          email: savedProfile.email,
          token: savedProfile.token,
        },
        true
      );

      return { success: true, profile: savedProfile };
    }

    return { success: false, message: 'Xác thực Face ID không khớp.' };
  } catch (err: any) {
    console.warn('[Passkey] Lỗi đăng nhập Face ID:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, message: 'Bạn đã bấm hủy xác thực Face ID.' };
    }
    return { success: false, message: err.message || 'Không thể xác thực Face ID.' };
  }
};
