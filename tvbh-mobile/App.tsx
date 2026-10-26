import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { ScanFace } from 'lucide-react-native';
import { UserProfile } from './src/types';
import {
  getCurrentUser,
  signOut,
  refreshUserProfile,
  computePermissions,
  getFaceIdStatus,
  enableFaceId,
  disableFaceId,
} from './src/services/authService';
import { LoginScreen } from './src/screens/LoginScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
        const faceIdStatus = await getFaceIdStatus();
        setIsFaceIdEnabled(faceIdStatus.enabled);
      } catch (err) {
        console.warn('Init auth error:', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    initAuth();
  }, []);

  const handleToggleFaceId = async (val: boolean) => {
    if (!currentUser) return;
    if (val) {
      const res = await enableFaceId(currentUser);
      if (res.success) {
        setIsFaceIdEnabled(true);
        Alert.alert('Thành công', `Đã kích hoạt Face ID cho TVBH @${currentUser.username}!`);
      } else {
        Alert.alert('Không thể bật Face ID', res.message || 'Lỗi cảm biến.');
      }
    } else {
      await disableFaceId();
      setIsFaceIdEnabled(false);
      Alert.alert('Đã tắt Face ID', 'Đã hủy liên kết Face ID trên thiết bị này.');
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const handleRefreshPermissions = async () => {
    setRefreshing(true);
    try {
      const updated = await refreshUserProfile();
      if (updated) {
        setCurrentUser(updated);
        Alert.alert('Thành công', 'Đã đồng bộ thông tin và quyền hạn mới nhất từ Supabase!');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể làm mới quyền hạn lúc này.');
    } finally {
      setRefreshing(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.splashText}>VinFast Thuận An TVBH Mobile...</Text>
      </View>
    );
  }

  // Nếu chưa đăng nhập, hiển thị LoginScreen
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  // Khi đã đăng nhập: Hiển thị đầy đủ thông tin User Profile và Bảng Phân Quyền từ Supabase
  const permissions =
    currentUser.permissions ||
    computePermissions(currentUser.role || 'Tư vấn bán hàng', currentUser.username || '');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>VINFAST THUẬN AN</Text>
          <Text style={styles.subTitle}>Hồ Sơ & Phân Quyền Người Dùng</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeaderRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>
                {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{currentUser.full_name}</Text>
              <Text style={styles.userUsername}>@{currentUser.username}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{currentUser.role.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Chi tiết liên hệ & định danh */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Email Supabase:</Text>
            <Text style={styles.metaValue}>{currentUser.email}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Auth UID:</Text>
            <Text style={styles.metaValueMonospace} numberOfLines={1}>
              {currentUser.id}
            </Text>
          </View>
          {currentUser.manager_id && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Trưởng phòng quản lý:</Text>
              <Text style={styles.metaValue}>@{currentUser.manager_id}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.viewLoginScreenBtn} onPress={handleLogout}>
            <Text style={styles.viewLoginScreenText}>✨ Xem Giao Diện Đăng Nhập Sang Trọng</Text>
          </TouchableOpacity>
        </View>

        {/* Cài đặt Bảo Mật & Face ID */}
        <Text style={styles.sectionHeader}>BẢO MẬT SINH TRẮC HỌC</Text>
        <View style={styles.faceIdCard}>
          <View style={styles.faceIdLeft}>
            <ScanFace size={24} color="#38bdf8" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.faceIdTitle}>Đăng nhập bằng Face ID</Text>
              <Text style={styles.faceIdDesc}>
                {isFaceIdEnabled
                  ? `Đã kích hoạt cho TVBH @${currentUser.username}`
                  : 'Gạt công tắc để kích hoạt Face ID cho máy này'}
              </Text>
            </View>
          </View>
          <Switch
            value={isFaceIdEnabled}
            onValueChange={handleToggleFaceId}
            trackColor={{ false: '#334155', true: '#0284c7' }}
            thumbColor={isFaceIdEnabled ? '#38bdf8' : '#94a3b8'}
          />
        </View>

        {/* Bảng phân quyền chi tiết từ Supabase */}
        <Text style={styles.sectionHeader}>MA TRẬN PHÂN QUYỀN HỆ THỐNG</Text>

        <View style={styles.permCard}>
          {/* Quyền Giữ xe FIFO */}
          <View style={styles.permItem}>
            <View style={styles.permIconBox}>
              <Text style={styles.permIcon}>🚗</Text>
            </View>
            <View style={styles.permTextContainer}>
              <Text style={styles.permTitle}>Giữ xe 2 Giờ (FIFO)</Text>
              <Text style={styles.permDesc}>Kiểm tra ràng buộc xe cùng cấu hình nhập trước</Text>
            </View>
            <View style={[styles.statusPill, styles.statusActive]}>
              <Text style={styles.statusTextActive}>KHẢ DỤNG</Text>
            </View>
          </View>

          {/* Quyền Yêu cầu XHĐ */}
          <View style={styles.permItem}>
            <View style={styles.permIconBox}>
              <Text style={styles.permIcon}>📄</Text>
            </View>
            <View style={styles.permTextContainer}>
              <Text style={styles.permTitle}>Yêu Cầu Xuất Hóa Đơn</Text>
              <Text style={styles.permDesc}>Chụp chứng từ camera & đẩy hồ sơ Kế toán</Text>
            </View>
            <View style={[styles.statusPill, styles.statusActive]}>
              <Text style={styles.statusTextActive}>KHẢ DỤNG</Text>
            </View>
          </View>

          {/* Phạm vi xem Đơn hàng */}
          <View style={styles.permItem}>
            <View style={styles.permIconBox}>
              <Text style={styles.permIcon}>📊</Text>
            </View>
            <View style={styles.permTextContainer}>
              <Text style={styles.permTitle}>Phạm Vi Xem Đơn Hàng</Text>
              <Text style={styles.permDesc}>
                {permissions.isAdmin
                  ? 'Toàn bộ showroom (Quyền Quản Trị)'
                  : permissions.isManager
                  ? 'Toàn bộ đơn hàng thuộc Nhóm / Phòng KD'
                  : 'Chỉ các đơn hàng do bản thân phụ trách'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                permissions.isAdmin
                  ? styles.statusPillPurple
                  : permissions.isManager
                  ? styles.statusPillCyan
                  : styles.statusPillBlue,
              ]}
            >
              <Text
                style={[
                  styles.statusTextCommon,
                  permissions.isAdmin
                    ? styles.textPurple
                    : permissions.isManager
                    ? styles.textCyan
                    : styles.textBlue,
                ]}
              >
                {permissions.isAdmin ? 'TOÀN BỘ' : permissions.isManager ? 'NHÓM' : 'CÁ NHÂN'}
              </Text>
            </View>
          </View>

          {/* Quyền Duyệt lệnh Kế toán */}
          <View style={styles.permItemNoBorder}>
            <View style={styles.permIconBox}>
              <Text style={styles.permIcon}>🛡️</Text>
            </View>
            <View style={styles.permTextContainer}>
              <Text style={styles.permTitle}>Phê Duyệt XHĐ & Quản Trị</Text>
              <Text style={styles.permDesc}>Duyệt hồ sơ đề nghị & gán hóa đơn M-Invoice</Text>
            </View>
            <View
              style={[
                styles.statusPill,
                permissions.canApproveInvoice ? styles.statusActive : styles.statusDisabled,
              ]}
            >
              <Text
                style={
                  permissions.canApproveInvoice ? styles.statusTextActive : styles.statusTextDisabled
                }
              >
                {permissions.canApproveInvoice ? 'CHO PHÉP' : 'GIỚI HẠN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Nếu là Trưởng Phòng: Hiển thị danh sách TVBH trong nhóm */}
        {permissions.isManager && currentUser.teamMembers && (
          <>
            <Text style={styles.sectionHeader}>THÀNH VIÊN NHÓM PHỤ TRÁCH</Text>
            <View style={styles.teamCard}>
              <Text style={styles.teamSubtitle}>
                Bạn có thể theo dõi đơn hàng và hỗ trợ cho các TVBH sau:
              </Text>
              <View style={styles.teamChipsContainer}>
                {currentUser.teamMembers.map((member: string, index: number) => (
                  <View key={index} style={styles.teamChip}>
                    <Text style={styles.teamChipText}>👤 {member}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Nút hành động */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefreshPermissions}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.refreshBtnText}>🔄 Làm Mới Quyền Hạn Từ Supabase</Text>
          )}
        </TouchableOpacity>

        <View style={styles.stepNoteCard}>
          <Text style={styles.stepNoteTitle}>✅ Bước 1: Đăng nhập & Phân quyền hoàn tất</Text>
          <Text style={styles.stepNoteDesc}>
            Thông tin tài khoản và quyền hạn đã được lấy trực tiếp từ bảng <Text style={styles.codeText}>users</Text> và hệ thống Supabase Auth. Sẵn sàng để xây dựng tiếp màn hình Kho Xe và Đơn Hàng theo phân quyền này.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    marginTop: 14,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1.2,
  },
  subTitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  userCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
  },
  userUsername: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  metaValueMonospace: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: 180,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  permCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 18,
  },
  permItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  permItemNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  permIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permIcon: {
    fontSize: 18,
  },
  permTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  permDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 0.5,
  },
  statusDisabled: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  statusTextDisabled: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  statusPillPurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  statusPillCyan: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  statusPillBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  statusTextCommon: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textPurple: {
    color: '#c084fc',
  },
  textCyan: {
    color: '#22d3ee',
  },
  textBlue: {
    color: '#60a5fa',
  },
  teamCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 18,
  },
  teamSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
  },
  teamChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  teamChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  refreshBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  stepNoteCard: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.25)',
  },
  stepNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 4,
  },
  stepNoteDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#f8fafc',
    fontWeight: '700',
  },
  viewLoginScreenBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLoginScreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  faceIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  faceIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  faceIdTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  faceIdDesc: {
    fontSize: 11.5,
    color: '#94a3b8',
  },
});
