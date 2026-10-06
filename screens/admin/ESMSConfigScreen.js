import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { getAdminConfig, setAdminConfig } from '../../lib/adminConfig';

export default function ESMSConfigScreen({ user, onBack }) {
  const [adminPass, setAdminPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [brandname, setBrandname] = useState('');
  const [sandbox, setSandbox] = useState('1');
  const [rateHour, setRateHour] = useState('3');
  const [rateDay, setRateDay] = useState('5');
  const [expireMin, setExpireMin] = useState('5');
  const [maxAttempts, setMaxAttempts] = useState('5');
  const [apiKeyHasValue, setApiKeyHasValue] = useState(false);
  const [secretKeyHasValue, setSecretKeyHasValue] = useState(false);

  const handleUnlock = async () => {
    if (!adminPass) return Alert.alert('Lỗi', 'Nhập mật khẩu admin');
    setLoading(true);
    const res = await getAdminConfig(user.phone, adminPass);
    setLoading(false);
    if (res.error) return Alert.alert('Lỗi', res.error);

    const map = {};
    (res.configs || []).forEach(c => { map[c.key] = c; });
    setApiKeyHasValue(map.esms_api_key?.has_value || false);
    setSecretKeyHasValue(map.esms_secret_key?.has_value || false);
    setBrandname(map.esms_brandname?.value || '');
    setSandbox(map.esms_sandbox?.value || '1');
    setRateHour(map.otp_rate_per_hour?.value || '3');
    setRateDay(map.otp_rate_per_day?.value || '5');
    setExpireMin(map.otp_expire_minutes?.value || '5');
    setMaxAttempts(map.otp_max_attempts?.value || '5');
    setUnlocked(true);
  };

  const handleSave = async () => {
    const cfg = {
      esms_brandname: brandname,
      esms_sandbox: sandbox,
      otp_rate_per_hour: rateHour,
      otp_rate_per_day: rateDay,
      otp_expire_minutes: expireMin,
      otp_max_attempts: maxAttempts,
    };
    if (apiKey.trim()) cfg.esms_api_key = apiKey.trim();
    if (secretKey.trim()) cfg.esms_secret_key = secretKey.trim();

    setSaving(true);
    const res = await setAdminConfig(user.phone, adminPass, cfg);
    setSaving(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    Alert.alert('Thành công', 'Đã lưu cấu hình eSMS');
    setApiKey('');
    setSecretKey('');
    handleUnlock();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Cấu hình eSMS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!unlocked ? (
          <>
            <View style={styles.lockBox}>
              <View style={styles.lockIcon}>
                <Ionicons name="chatbox-ellipses" size={48} color="#F59E0B" />
              </View>
              <Text style={styles.lockTitle}>Xác thực Admin</Text>
              <Text style={styles.lockDesc}>Nhập mật khẩu để cấu hình eSMS</Text>
            </View>
            <Text style={styles.label}>Mật khẩu admin</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} placeholder="Nhập mật khẩu" secureTextEntry={!showPass} value={adminPass} onChangeText={setAdminPass} placeholderTextColor="#9CA3AF" />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleUnlock} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Mở khóa</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.infoText}>API Key sẽ không hiện lại sau khi lưu. Bật Sandbox để test không tốn tiền.</Text>
            </View>

            <Text style={styles.sectionTitle}>eSMS Credentials</Text>

            <Text style={styles.label}>API Key {apiKeyHasValue && '✓ Đã có'}</Text>
            <View style={styles.inputBox}>
              <Ionicons name="key-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} placeholder={apiKeyHasValue ? 'Để trống nếu không đổi' : 'Nhập API Key'} value={apiKey} onChangeText={setApiKey} autoCapitalize="none" placeholderTextColor="#9CA3AF" />
            </View>

            <Text style={styles.label}>Secret Key {secretKeyHasValue && '✓ Đã có'}</Text>
            <View style={styles.inputBox}>
              <Ionicons name="shield-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} placeholder={secretKeyHasValue ? 'Để trống nếu không đổi' : 'Nhập Secret Key'} value={secretKey} onChangeText={setSecretKey} autoCapitalize="none" placeholderTextColor="#9CA3AF" />
            </View>

            <Text style={styles.label}>Brandname</Text>
            <View style={styles.inputBox}>
              <Ionicons name="business-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} placeholder="VD: EduTeach" value={brandname} onChangeText={setBrandname} placeholderTextColor="#9CA3AF" />
            </View>

            <Text style={styles.label}>Chế độ</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity style={[styles.toggleBtn, sandbox === '1' && styles.toggleBtnActive]} onPress={() => setSandbox('1')}>
                <Ionicons name="flask-outline" size={18} color={sandbox === '1' ? '#fff' : '#F59E0B'} />
                <Text style={[styles.toggleText, sandbox === '1' && { color: '#fff' }]}>Sandbox</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, sandbox === '0' && styles.toggleBtnActiveGreen]} onPress={() => setSandbox('0')}>
                <Ionicons name="checkmark-circle" size={18} color={sandbox === '0' ? '#fff' : '#10B981'} />
                <Text style={[styles.toggleText, sandbox === '0' && { color: '#fff' }]}>Thật</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Giới hạn OTP</Text>

            <Text style={styles.label}>OTP tối đa / giờ</Text>
            <View style={styles.inputBox}>
              <Ionicons name="time-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} keyboardType="number-pad" value={rateHour} onChangeText={setRateHour} placeholderTextColor="#9CA3AF" />
              <Text style={styles.unit}>lần/giờ</Text>
            </View>

            <Text style={styles.label}>OTP tối đa / ngày</Text>
            <View style={styles.inputBox}>
              <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} keyboardType="number-pad" value={rateDay} onChangeText={setRateDay} placeholderTextColor="#9CA3AF" />
              <Text style={styles.unit}>lần/ngày</Text>
            </View>

            <Text style={styles.label}>OTP hiệu lực</Text>
            <View style={styles.inputBox}>
              <Ionicons name="hourglass-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} keyboardType="number-pad" value={expireMin} onChangeText={setExpireMin} placeholderTextColor="#9CA3AF" />
              <Text style={styles.unit}>phút</Text>
            </View>

            <Text style={styles.label}>Số lần nhập sai tối đa</Text>
            <View style={styles.inputBox}>
              <Ionicons name="alert-circle-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} keyboardType="number-pad" value={maxAttempts} onChangeText={setMaxAttempts} placeholderTextColor="#9CA3AF" />
              <Text style={styles.unit}>lần</Text>
            </View>

            <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.btnText}>Lưu cấu hình</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  content: { padding: 20 },
  lockBox: { alignItems: 'center', paddingVertical: 30 },
  lockIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  lockTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  lockDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A' },
  infoText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#F59E0B', marginTop: 16, marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  unit: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#FDE68A' },
  toggleBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  toggleBtnActiveGreen: { backgroundColor: '#10B981', borderColor: '#10B981' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', paddingVertical: 16, borderRadius: 12, marginTop: 20 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
