import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ScanFace } from 'lucide-react-native';
import { login, loginWithFaceId, getFaceIdStatus, enableFaceId } from '../services/authService';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [faceIdInfo, setFaceIdInfo] = useState<{ enabled: boolean; profile: UserProfile | null }>({
    enabled: false,
    profile: null,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);

  useEffect(() => {
    const checkFaceId = async () => {
      const status = await getFaceIdStatus();
      setFaceIdInfo(status);
    };
    checkFaceId();
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    const cleanInput = emailOrUser.trim().toLowerCase();
    if (!cleanInput) {
      setErrorMessage('Vui lòng nhập Email.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanInput, password);
      if (result.success && result.user) {
        // Nếu thiết bị chưa cài đặt Face ID và hỗ trợ sinh trắc học
        if (!faceIdInfo.enabled && Platform.OS !== 'web') {
          Alert.alert(
            'Kích hoạt Face ID',
            `Bạn có muốn cài đặt Face ID để đăng nhập nhanh cho tài khoản @${result.user.username} trong các lần sau không?`,
            [
              {
                text: 'Để sau',
                style: 'cancel',
                onPress: () => onLoginSuccess(result.user!),
              },
              {
                text: 'Kích hoạt ngay',
                onPress: async () => {
                  const enableRes = await enableFaceId(result.user!);
                  if (enableRes.success) {
                    Alert.alert('Thành công', 'Đã cài đặt Face ID thành công!');
                  }
                  onLoginSuccess(result.user!);
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          onLoginSuccess(result.user);
        }
      } else {
        setErrorMessage(result.message || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể kết nối đến máy chủ Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceIdLogin = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    // Nếu chưa từng liên kết Face ID với tài khoản nào
    if (!faceIdInfo.enabled || !faceIdInfo.profile) {
      Alert.alert(
        'Chưa cài đặt Face ID',
        'Thiết bị chưa liên kết Face ID với tài khoản TVBH nào.\n\n👉 Cách cài đặt:\n1. Nhập Email & Mật khẩu bên trên rồi bấm "Đăng nhập".\n2. Ứng dụng sẽ tự động kích hoạt Face ID cho tài khoản của bạn để sử dụng từ lần sau.',
        [{ text: 'Đã hiểu' }]
      );
      return;
    }

    setFaceIdLoading(true);
    try {
      const result = await loginWithFaceId();
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.message || 'Xác thực Face ID không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi cảm biến Face ID.');
    } finally {
      setFaceIdLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Subtle Ambient Glow */}
      <View style={styles.ambientBackdrop} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            {/* Top Brand Header */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/logo_showroom_animated.webp')}
                  style={styles.animatedLogo}
                  contentFit="contain"
                  autoplay={true}
                />
              </View>

              <Text style={styles.pageTitle}>Đăng nhập</Text>
              <Text style={styles.pageSubtitle}>
                Hệ thống điều hành đơn hàng & kho xe VinFast Thuận An
              </Text>
            </View>

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Field Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => emailInputRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.inputWrapperFocused,
                  ]}
                >
                  <Mail
                    size={18}
                    color={focusedField === 'email' ? '#38bdf8' : '#64748b'}
                    style={styles.fieldIcon}
                  />
                  <TextInput
                    ref={emailInputRef}
                    style={styles.inputField}
                    placeholder="tvbh@vinfast.vn"
                    placeholderTextColor="#475569"
                    value={emailOrUser}
                    onChangeText={(val) => {
                      setEmailOrUser(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    textContentType="none"
                    spellCheck={false}
                    editable={!loading}
                    returnKeyType="next"
                  />
                  {emailOrUser.length > 0 && !loading && (
                    <TouchableOpacity
                      onPress={() => setEmailOrUser('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.clearBtn}
                    >
                      <Text style={styles.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              {/* Field Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu</Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => passwordInputRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.inputWrapperFocused,
                  ]}
                >
                  <Lock
                    size={18}
                    color={focusedField === 'password' ? '#38bdf8' : '#64748b'}
                    style={styles.fieldIcon}
                  />
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.inputField, { paddingRight: 40 }]}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="#475569"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    textContentType="none"
                    spellCheck={false}
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#94a3b8" />
                    ) : (
                      <Eye size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Khôi phục mật khẩu',
                      'Vui lòng liên hệ Quản trị viên IT hoặc Kế toán trưởng để được cấp lại mật khẩu tài khoản VinFast của bạn.',
                      [{ text: 'Đã hiểu' }]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button - Luxury Automotive Edition */}
              <TouchableOpacity
                style={[styles.loginBtnWrapper, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#1e3a8a', '#172554', '#0a0f1d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loginBtnGradient}
                >
                  {/* Micro Specular Highlight */}
                  <View style={styles.specularBevel} />

                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.loginBtnText}>Đang xác thực...</Text>
                    </View>
                  ) : (
                    <View style={styles.btnContentRow}>
                      <Text style={styles.loginBtnText}>Đăng nhập</Text>
                      <View style={styles.arrowBadge}>
                        <ArrowRight size={13} color="#ffffff" strokeWidth={2.5} />
                      </View>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>HOẶC</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Face ID Button */}
              <TouchableOpacity
                style={[
                  styles.faceIdBtn,
                  faceIdInfo.enabled && styles.faceIdBtnActive,
                ]}
                onPress={handleFaceIdLogin}
                disabled={faceIdLoading || loading}
                activeOpacity={0.8}
              >
                {faceIdLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#38bdf8" />
                    <Text style={styles.faceIdText}>Đang quét Face ID...</Text>
                  </View>
                ) : (
                  <View style={styles.faceIdContent}>
                    <ScanFace
                      size={19}
                      color={faceIdInfo.enabled ? '#38bdf8' : '#64748b'}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.faceIdText,
                        !faceIdInfo.enabled && { color: '#94a3b8' },
                      ]}
                    >
                      {faceIdInfo.enabled && faceIdInfo.profile
                        ? `Đăng nhập Face ID (@${faceIdInfo.profile.username})`
                        : 'Đăng nhập bằng Face ID'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {!faceIdInfo.enabled && (
                <Text style={styles.faceIdHintText}>
                  * Cần đăng nhập bằng Email lần đầu để kích hoạt Face ID
                </Text>
              )}
            </View>

            {/* Security Trust Footnote */}
            <View style={styles.trustFooter}>
              <ShieldCheck size={13} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.trustText}>VinFast Thuận An</Text>
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090a0f',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  ambientBackdrop: {
    position: 'absolute',
    top: -100,
    left: '15%',
    right: '15%',
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  headerSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  logoContainer: {
    width: '100%',
    height: 48,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  animatedLogo: {
    width: 230,
    height: 44,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: '#94a3b8',
    lineHeight: 20,
    fontWeight: '400',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  errorText: {
    fontSize: 12.5,
    color: '#fca5a5',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12141c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2433',
    paddingHorizontal: 12,
    height: 50,
    cursor: Platform.OS === 'web' ? 'text' : undefined,
  } as any,
  inputWrapperFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#141824',
  },
  fieldIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    color: '#f8fafc',
    fontWeight: '400',
    paddingVertical: 0,
    outlineStyle: 'none',
  } as any,
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1f2433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: '#12141c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#38bdf8',
  },
  checkMark: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '900',
    lineHeight: 13,
  },
  rememberText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontWeight: '400',
  },
  forgotPasswordText: {
    fontSize: 12.5,
    color: '#38bdf8',
    fontWeight: '500',
  },
  loginBtnWrapper: {
    borderRadius: 16,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 8,
    marginTop: 4,
  },
  loginBtnGradient: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  specularBevel: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loginBtnDisabled: {
    opacity: 0.5,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  arrowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e2433',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginHorizontal: 12,
    letterSpacing: 0.8,
  },
  faceIdBtn: {
    backgroundColor: '#12141c',
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#1f2433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceIdBtnActive: {
    borderColor: '#0284c7',
    backgroundColor: '#0c1a2e',
  },
  faceIdContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faceIdText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#f8fafc',
  },
  faceIdHintText: {
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  trustText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '400',
  },
});
