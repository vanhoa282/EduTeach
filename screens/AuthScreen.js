import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { signInStudent, signUpStudent, signInTutor } from '../lib/auth';
import { sendPhoneOtp, confirmPhoneOtp, clearFirebaseSession, mapOtpError, toLocalPhone } from '../lib/phoneOtp';
import { ScaleButton, FadeInView } from '../components/Animated';

export default function AuthScreen({ onLogin }) {
  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  // OTP đăng ký (chỉ học sinh tự đăng ký mới cần xác minh SĐT)
  const [otpStep, setOtpStep] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const resetOtp = () => { setOtpStep(false); setConfirmation(null); setOtpCode(''); setResendIn(0); };
  const reset = () => { setPhone(''); setPassword(''); setFullName(''); resetOtp(); };
  const switchRole = (r) => { setRole(r); setMode('login'); reset(); };

  const handleSubmit = async () => {
    if (phone.length < 10) return Alert.alert('Lỗi', 'SĐT phải 10 số');
    if (password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu phải từ 6 ký tự');
    setLoading(true);
    try {
      let result;
      if (role === 'student' && mode === 'login') {
        result = await signInStudent({ phone, password });
      } else {
        result = await signInTutor({ phone, password });
      }
      setLoading(false);
      if (result.error) return Alert.alert('Lỗi', result.error);
      onLogin(result.user);
    } catch (e) {
      setLoading(false);
      Alert.alert('Lỗi', e.message || 'Có lỗi xảy ra');
    }
  };

  // Bước 1 đăng ký: validate form rồi gửi mã OTP qua SMS (Firebase Phone Auth)
  const handleSendOtp = async () => {
    if (!fullName.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
    if (phone.length < 10) return Alert.alert('Lỗi', 'SĐT phải 10 số');
    if (password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu phải từ 6 ký tự');
    setLoading(true);
    try {
      const conf = await sendPhoneOtp(phone);
      setConfirmation(conf);
      setOtpStep(true);
      setOtpCode('');
      setResendIn(60);
    } catch (e) {
      Alert.alert('Lỗi', e.code ? mapOtpError(e) : (e.message || 'Không gửi được mã OTP'));
    }
    setLoading(false);
  };

  // Bước 2 đăng ký: xác nhận mã → server verify → tạo tài khoản kèm firebase_uid
  const handleConfirmOtp = async () => {
    if (!confirmation) return Alert.alert('Lỗi', 'Phiên xác minh đã mất. Bấm gửi lại mã.');
    if (otpCode.trim().length < 6) return Alert.alert('Lỗi', 'Nhập đủ 6 số trong mã OTP');
    setLoading(true);
    try {
      const verified = await confirmPhoneOtp(confirmation, otpCode);
      if (toLocalPhone(verified.phone) !== phone) {
        setLoading(false);
        return Alert.alert('Lỗi', 'Số điện thoại xác minh không khớp số đã nhập');
      }
      const result = await signUpStudent({ phone, password, fullName, firebaseUid: verified.uid });
      setLoading(false);
      if (result.error) return Alert.alert('Lỗi', result.error);
      await clearFirebaseSession();
      onLogin(result.user);
    } catch (e) {
      setLoading(false);
      Alert.alert('Lỗi', e.code ? mapOtpError(e) : (e.message || 'Có lỗi xảy ra'));
    }
  };

  const isOtpSignup = role === 'student' && mode === 'signup';
  const mainAction = isOtpSignup ? (otpStep ? handleConfirmOtp : handleSendOtp) : handleSubmit;
  const mainLabel = isOtpSignup
    ? (otpStep ? 'Xác nhận & Tạo tài khoản' : 'Gửi mã OTP')
    : (mode === 'signup' ? 'Đăng ký' : 'Đăng nhập');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <FadeInView delay={100}>
            <View style={styles.logoBox}>
              <Text style={styles.logo}>📚</Text>
              <Text style={styles.appName}>EduTeach</Text>
              <Text style={styles.tagline}>Gia sư tin cậy</Text>
            </View>
          </FadeInView>

          <FadeInView delay={200}>
            <View style={styles.roleTabs}>
              <TouchableOpacity style={[styles.roleTab, role === 'student' && styles.roleTabActive]} onPress={() => switchRole('student')} activeOpacity={0.7}>
                <Ionicons name="school-outline" size={18} color={role === 'student' ? '#2563EB' : '#9CA3AF'} />
                <Text style={[styles.roleTabText, role === 'student' && styles.roleTabTextActive]}>Học sinh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roleTab, role === 'tutor' && styles.roleTabActive]} onPress={() => switchRole('tutor')} activeOpacity={0.7}>
                <Ionicons name="briefcase-outline" size={18} color={role === 'tutor' ? '#2563EB' : '#9CA3AF'} />
                <Text style={[styles.roleTabText, role === 'tutor' && styles.roleTabTextActive]}>Gia sư</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>

          <FadeInView delay={300}>
            <Text style={styles.title}>
              {mode === 'signup' ? 'Đăng ký' : 'Đăng nhập'}{role === 'tutor' ? ' Gia sư' : ' Học sinh'}
            </Text>
            <Text style={styles.subtitle}>
              {role === 'tutor'
                ? 'Tài khoản gia sư do admin tạo. Liên hệ admin nếu chưa có.'
                : mode === 'signup'
                ? 'Tạo tài khoản để bắt đầu tìm gia sư'
                : 'Nhập số điện thoại và mật khẩu để tiếp tục'}
            </Text>
          </FadeInView>

          <FadeInView delay={400}>
            {mode === 'signup' && role === 'student' && (
              <>
                <Text style={styles.label}>Họ và tên</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                  <TextInput style={styles.input} placeholder="Nguyễn Văn A" value={fullName} onChangeText={setFullName} placeholderTextColor="#9CA3AF" />
                </View>
              </>
            )}

            <Text style={styles.label}>Số điện thoại</Text>
            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} placeholder="0901234567" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={10} placeholderTextColor="#9CA3AF" editable={!otpStep} />
            </View>

            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} placeholder="Tối thiểu 6 ký tự" secureTextEntry={!showPass} value={password} onChangeText={setPassword} placeholderTextColor="#9CA3AF" />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {isOtpSignup && otpStep && (
              <>
                <Text style={styles.label}>Mã OTP (6 số)</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
                  <TextInput style={styles.input} placeholder="Nhập mã trong tin nhắn SMS" keyboardType="number-pad" value={otpCode} onChangeText={setOtpCode} maxLength={6} placeholderTextColor="#9CA3AF" />
                </View>
                <Text style={styles.otpHint}>Mã đã gửi tới số +84{phone.slice(1)}. Kiểm tra tin nhắn SMS nhé.</Text>
                <View style={styles.otpRow}>
                  {resendIn > 0
                    ? <Text style={styles.otpMuted}>Gửi lại mã sau {resendIn}s</Text>
                    : <TouchableOpacity onPress={handleSendOtp} disabled={loading}><Text style={styles.switchTextBold}>Gửi lại mã</Text></TouchableOpacity>}
                  <TouchableOpacity onPress={resetOtp}><Text style={styles.otpMuted}>Đổi số điện thoại</Text></TouchableOpacity>
                </View>
              </>
            )}

            <ScaleButton style={[styles.button, loading && { opacity: 0.6 }]} onPress={mainAction} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mainLabel}</Text>}
            </ScaleButton>

            {role === 'student' && (
              <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); reset(); }} style={styles.switchMode}>
                <Text style={styles.switchText}>
                  {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                  <Text style={styles.switchTextBold}>{mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}</Text>
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.note}>Bằng việc tiếp tục, bạn đồng ý với{'\n'}Điều khoản & Chính sách của EduTeach</Text>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 24, paddingTop: 40 },
  logoBox: { alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 64 },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#2563EB', marginTop: 8 },
  tagline: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  roleTabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  roleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  roleTabActive: { backgroundColor: '#EFF6FF' },
  roleTabText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  roleTabTextActive: { color: '#2563EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 24, lineHeight: 19 },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  button: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchMode: { alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: '#6B7280' },
  switchTextBold: { color: '#2563EB', fontWeight: '600' },
  otpHint: { fontSize: 12, color: '#6B7280', marginTop: -6, marginBottom: 10, lineHeight: 17 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  otpMuted: { fontSize: 13, color: '#6B7280' },
  note: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 32, lineHeight: 18 },
});
