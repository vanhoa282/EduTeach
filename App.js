import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import MainTabs from './screens/MainTabs';

export default function App() {
  const [screen, setScreen] = useState('splash');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => setScreen('login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  if (screen === 'splash') {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.logo}>📚</Text>
        <Text style={styles.appName}>EduTeach</Text>
        <Text style={styles.tagline}>Gia sư tin cậy</Text>
        <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (screen === 'login') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.loginBox}>
          <Text style={styles.logoSmall}>📚</Text>
          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.subtitle}>Nhập số điện thoại để tiếp tục</Text>

          <TextInput
            style={styles.input}
            placeholder="Số điện thoại"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!otpSent}
            maxLength={10}
          />

          {otpSent && (
            <TextInput
              style={styles.input}
              placeholder="Mã OTP (6 số)"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
            />
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (!otpSent) {
                if (phone.length < 10) {
                  Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại 10 số');
                  return;
                }
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  setOtpSent(true);
                  Alert.alert('Thành công', 'OTP đã gửi (demo: 123456)');
                }, 1000);
              } else {
                if (otp === '123456') {
                  setScreen('main');
                } else {
                  Alert.alert('Lỗi', 'OTP không đúng. Demo: 123456');
                }
              }
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{otpSent ? 'Xác nhận OTP' : 'Gửi OTP'}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>Bằng việc đăng nhập, bạn đồng ý với Điều khoản & Chính sách</Text>
        </View>
        <StatusBar style="dark" />
      </KeyboardAvoidingView>
    );
  }

  return (
    <MainTabs
      phone={phone}
      onLogout={() => {
        setScreen('login');
        setOtpSent(false);
        setOtp('');
        setPhone('');
      }}
    />
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 80 },
  logoSmall: { fontSize: 50, marginBottom: 10 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#2563EB', marginTop: 10 },
  tagline: { fontSize: 14, color: '#666', marginTop: 5 },
  container: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', padding: 20 },
  loginBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#F9FAFB',
  },
  button: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  note: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
