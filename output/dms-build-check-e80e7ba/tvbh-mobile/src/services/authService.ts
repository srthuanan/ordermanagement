import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { UserProfile, UserPermissions } from '../types';

const USER_STORAGE_KEY = '@vf_tvbh_user';
const BIOMETRIC_PROFILE_KEY = '@vf_saved_biometric_profile';

export const computePermissions = (role: string, username: string): UserPermissions => {
  const normUser = (username || '').toLowerCase().trim();
  const normRole = (role || '').trim();

  const isAdmin = normRole === 'Admin' || normUser === 'admin' || normUser === 'nhanpt';
  const isManager = normRole === 'Trưởng Phòng Kinh Doanh';
  const isTvbh = !isAdmin && !isManager;

  return {
    isAdmin,
    isManager,
    isTvbh,
    canHoldCar: true,
    canRequestInvoice: true,
    canViewAllOrders: isAdmin,
    canViewTeamOrders: isAdmin || isManager,
    canApproveInvoice: isAdmin,
  };
};

export const login = async (
  usernameOrEmail: string,
  pass: string
): Promise<{ success: boolean; message?: string; user?: UserProfile }> => {
  try {
    const input = (usernameOrEmail || '').toLowerCase().trim();
    if (!input) {
      return { success: false, message: 'Vui lòng nhập tên đăng nhập hoặc email.' };
    }
    if (!pass) {
      return { success: false, message: 'Vui lòng nhập mật khẩu.' };
    }

    let email = input;
    let userRow: any = null;

    // 1. Kiểm tra tài khoản trong bảng 'users'
    if (!input.includes('@')) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', input)
        .maybeSingle();

      if (error || !data) {
        return { success: false, message: 'Tên đăng nhập không tồn tại trên hệ thống VinFast.' };
      }
      userRow = data;
      email = data.email;
    } else {
      const { data } = await supabase
        .from('users')
        .select('*')
        .ilike('email', input)
        .maybeSingle();
      if (data) {
        userRow = data;
      }
    }

    // 2. Kiểm tra nếu tài khoản bị khóa
    if (userRow?.is_blocked) {
      const reason = userRow.block_reason ? ` Lý do: ${userRow.block_reason}` : '';
      return {
        success: false,
        message: `Tài khoản đã bị tạm khóa.${reason}. Vui lòng liên hệ Admin.`,
      };
    }

    // 3. Xác thực bảo mật qua Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (authErr) {
      return {
        success: false,
        message: 'Mật khẩu không chính xác hoặc tài khoản chưa kích hoạt Auth.',
      };
    }

    // 4. Nếu chưa có userRow thì lấy lại theo email
    if (!userRow) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .maybeSingle();
      userRow = data;
    }

    const resolvedUsername = userRow?.username || email.split('@')[0];
    const resolvedFullName = userRow?.full_name?.trim() || authData.user?.user_metadata?.full_name || resolvedUsername;
    const resolvedRole = userRow?.role || 'Tư vấn bán hàng';
    const permissions = computePermissions(resolvedRole, resolvedUsername);

    // 5. Nếu là Trưởng phòng, lấy danh sách TVBH trong nhóm phụ trách
    let teamMembers: string[] = [resolvedFullName];
    if (permissions.isManager) {
      try {
        const { data: teamData } = await supabase
          .from('users')
          .select('full_name, username')
          .eq('manager_id', resolvedUsername);

        if (teamData && teamData.length > 0) {
          const names = teamData.map((u) => u.full_name || u.username);
          teamMembers = [resolvedFullName, ...names];
        }
      } catch (err) {
        console.warn('Could not fetch team members:', err);
      }
    }

    const userProfile: UserProfile = {
      id: authData.user?.id || userRow?.uid || '',
      username: resolvedUsername,
      full_name: resolvedFullName,
      email: email,
      role: resolvedRole,
      manager_id: userRow?.manager_id || null,
      is_blocked: !!userRow?.is_blocked,
      block_reason: userRow?.block_reason || null,
      created_at: userRow?.created_at,
      permissions,
      teamMembers,
    };

    // 6. Lưu vào AsyncStorage để duy trì phiên và lưu profile cho Face ID
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
    await AsyncStorage.setItem(BIOMETRIC_PROFILE_KEY, JSON.stringify(userProfile));
    return { success: true, user: userProfile };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, message: err.message || 'Lỗi kết nối máy chủ Supabase.' };
  }
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!json) return null;
    const user = JSON.parse(json);
    if (user && !user.permissions) {
      user.permissions = computePermissions(user.role || 'Tư vấn bán hàng', user.username || '');
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  } catch {
    return null;
  }
};

export const refreshUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const current = await getCurrentUser();
    if (!current) return null;

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('username', current.username)
      .maybeSingle();

    if (!userRow) return current;

    const permissions = computePermissions(userRow.role, userRow.username);
    let teamMembers: string[] = [userRow.full_name || userRow.username];

    if (permissions.isManager) {
      const { data: teamData } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('manager_id', userRow.username);

      if (teamData && teamData.length > 0) {
        teamMembers = [userRow.full_name || userRow.username, ...teamData.map((u) => u.full_name || u.username)];
      }
    }

    const updatedProfile: UserProfile = {
      ...current,
      full_name: userRow.full_name || current.full_name,
      role: userRow.role || current.role,
      manager_id: userRow.manager_id,
      is_blocked: !!userRow.is_blocked,
      block_reason: userRow.block_reason,
      permissions,
      teamMembers,
    };

    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedProfile));
    return updatedProfile;
  } catch (e) {
    console.warn('refreshUserProfile error:', e);
    return null;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.warn('SignOut error:', e);
  }
};

export const getFaceIdStatus = async (): Promise<{
  enabled: boolean;
  profile: UserProfile | null;
}> => {
  try {
    const json = await AsyncStorage.getItem(BIOMETRIC_PROFILE_KEY);
    if (!json) return { enabled: false, profile: null };
    const profile = JSON.parse(json);
    return { enabled: true, profile };
  } catch {
    return { enabled: false, profile: null };
  }
};

export const enableFaceId = async (
  user: UserProfile
): Promise<{ success: boolean; message?: string }> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { success: false, message: 'Thiết bị này không hỗ trợ Face ID / Touch ID.' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { success: false, message: 'Vui lòng cài đặt Face ID trong Cài đặt iPhone của máy trước.' };
    }

    // Luôn lưu liên kết hồ sơ của tài khoản đang đăng nhập
    await AsyncStorage.setItem(BIOMETRIC_PROFILE_KEY, JSON.stringify(user));

    // Gọi quét Face ID thử nghiệm để người dùng xác nhận
    try {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: `Kích hoạt Face ID cho TVBH @${user.username}`,
        cancelLabel: 'Hủy',
      });

      if (!authResult.success && (authResult as any).error === 'user_cancel') {
        // Nếu người dùng chủ động bấm Hủy thì hủy kích hoạt
        await AsyncStorage.removeItem(BIOMETRIC_PROFILE_KEY);
        return { success: false, message: 'Bạn đã bấm hủy kích hoạt Face ID.' };
      }
    } catch (e) {
      console.warn('Biometric prompt warning:', e);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi thiết lập Face ID.' };
  }
};

export const disableFaceId = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_PROFILE_KEY);
  } catch (e) {
    console.warn('disableFaceId error:', e);
  }
};

export const loginWithFaceId = async (): Promise<{
  success: boolean;
  message?: string;
  user?: UserProfile;
}> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { success: false, message: 'Thiết bị không hỗ trợ Face ID / sinh trắc học.' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { success: false, message: 'Chưa cài đặt Face ID trong Cài đặt iPhone.' };
    }

    // Lấy profile đã cài đặt Face ID
    const json = await AsyncStorage.getItem(BIOMETRIC_PROFILE_KEY);
    if (!json) {
      return {
        success: false,
        message: 'Bạn chưa cài đặt Face ID. Hãy đăng nhập bằng Email và bật Face ID trong mục Hồ sơ.',
      };
    }

    const savedProfile: UserProfile = JSON.parse(json);

    // Kích hoạt quét Face ID native trên iOS
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: `Xác thực Face ID cho TVBH @${savedProfile.username}`,
      cancelLabel: 'Hủy',
    });

    if (authResult.success) {
      // Khôi phục phiên làm việc
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(savedProfile));
      return { success: true, user: savedProfile };
    } else {
      if ((authResult as any).error === 'user_cancel') {
        return { success: false, message: 'Bạn đã hủy xác thực Face ID.' };
      }
      return { success: false, message: 'Xác thực Face ID không khớp với chủ máy.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi cảm biến Face ID.' };
  }
};
