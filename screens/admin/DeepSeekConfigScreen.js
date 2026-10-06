import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { getAdminConfig, setAdminConfig } from '../../lib/adminConfig';

export default function DeepSeekConfigScreen({ user, onBack }) {
  const [adminPass, setAdminPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [proLimit, setProLimit] = useState('100');
  const [flashLimit, setFlashLimit] = useState('20');
  const [hasKey, setHasKey] = useState(false);

  const handleUnlock = async () => {
    if (!adminPass) return Alert.alert('Lỗi', 'Nhập mật khẩu admin');
    setLoading(true);
    const res = await getAdminConfig(user.phone, adminPass);
    setLoading(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    const map = {};
    (res.configs || []).forEach(c => { map[c.key] = c; });
    setHasKey(map.deepseek_api_key?.has_value || false);
    setProLimit(map.deepseek_pro_rate_limit?.value || '100');
    setFlashLimit(map.deepseek_flash_rate_limit?.value || '20');
    setUnlocked(true);
  };

  const handleSave = async () => {
    const cfg = {
      deepseek_pro_rate_limit: proLimit,
      deepseek_flash_rate_limit: flashLimit,
    };
    if (apiKey.trim()) cfg.deepseek_api_key = apiKey.trim();
    setSaving(true);
    const res = await setAdminConfig(user.phone, adminPass, cfg);
    setSaving(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    Alert.alert('Thành công', 'Đã lưu cấu hình DeepSeek');
    setApiKey('');
    handleUnlock();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Cấu hình DeepSeek AI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!unlocked ? (
          <>
            <View style={styles.lockBox}>
              <View style={styles.lockIcon}>
                <Ionicons name="sparkles" size={48} color="#7C3AED" />
              </View>
              <Text style={styles.lockTitle}>Xác thực Admin</Text>
              <Text style={styles.lockDesc}>Nhập mật khẩu để cấu hình DeepSeek AI</Text>
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
              <Text style={styles.infoText}>API Key không hiện lại sau khi lưu. User Pro (có khóa học) dùng V4-Pro, user Flash dùng V4-Flash.</Text>
            </View>
            <Text style={styles.sectionTitle}>DeepSeek API</Text>
            <Text style={styles.label}>API Key {hasKey && '✓ Đã có'}</Text>
            <View style={styles.inputBox}>
              <Ionicons name="key-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} placeholder={hasKey ? 'Để trống nếu không đổi' : 'Nhập API Key (sk-...)'} value={apiKey} onChangeText={setApiKey} autoCapitalize="none" placeholderTextColor="#9CA3AF" />
            </View>
            <Text style={styles.sectionTitle}>Giới hạn</Text>
            <Text style={styles.label}>User Pro (có ≥1 khóa học)</Text>
            <View style={styles.inputBox}>
              <Ionicons name="star-outline" size={20} color="#F59E0B" />
              <TextInput style={styles.input} keyboardType="number-pad" value={proLimit} onChangeText={setProLimit} placeholderTextColor="#9CA3AF" />
              <Text style={styles.unit}>câu/ngày</Text>
            </View>
            <Text style={styles.label}>User Flash (chưa có khóa)</Text>
            <View style={styles.inputBox}>
              <Ionicons name="flash-outline" size={20} color="#9CA3AF" />
              <TextInput style={styles.input} keyboardType="number-pad" value={flashLimit} onChangeText={setFlashLimit} placeholderTextColor="#9CA3AF" />
              <Text style={styles.unit}>câu/ngày</Text>
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
  lockIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  lockTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  lockDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A' },
  infoText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#7C3AED', marginTop: 16, marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  unit: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 12, marginTop: 20 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
