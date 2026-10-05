import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../lib/adminSettings';

export default function SystemSettingsScreen({ onBack }) {
  const [minWithdraw, setMinWithdraw] = useState('50000');
  const [maxWithdraw, setMaxWithdraw] = useState('5000000');
  const [pendingDays, setPendingDays] = useState('7');
  const [autoPassHours, setAutoPassHours] = useState('3');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setMinWithdraw(s.min_withdraw || '50000');
      setMaxWithdraw(s.max_withdraw || '5000000');
      setPendingDays(s.pending_days || '7');
      setAutoPassHours(s.auto_pass_hours || '3');
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    const min = parseInt(minWithdraw);
    const max = parseInt(maxWithdraw);
    if (min < 10000) return Alert.alert('Lỗi', 'Min rút tối thiểu 10.000đ');
    if (max <= min) return Alert.alert('Lỗi', 'Max phải lớn hơn Min');

    setSaving(true);
    const res = await updateSettings({
      min_withdraw: min,
      max_withdraw: max,
      pending_days: parseInt(pendingDays) || 7,
      auto_pass_hours: parseInt(autoPassHours) || 3,
    });
    setSaving(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    Alert.alert('Thành công', 'Đã lưu cài đặt hệ thống');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Cài đặt hệ thống</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Rút tiền</Text>

        <Text style={styles.label}>Số tiền rút tối thiểu (VND)</Text>
        <View style={styles.inputBox}>
          <Ionicons name="arrow-down-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            value={minWithdraw}
            onChangeText={setMinWithdraw}
            keyboardType="number-pad"
          />
          <Text style={styles.unit}>đ</Text>
        </View>

        <Text style={styles.label}>Số tiền rút tối đa (VND)</Text>
        <View style={styles.inputBox}>
          <Ionicons name="arrow-up-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            value={maxWithdraw}
            onChangeText={setMaxWithdraw}
            keyboardType="number-pad"
          />
          <Text style={styles.unit}>đ</Text>
        </View>

        <Text style={styles.label}>Số ngày admin duyệt khiếu nại</Text>
        <View style={styles.inputBox}>
          <Ionicons name="time-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            value={pendingDays}
            onChangeText={setPendingDays}
            keyboardType="number-pad"
          />
          <Text style={styles.unit}>ngày</Text>
        </View>
        <Text style={styles.hint}>Sau số ngày này, admin không duyệt được đơn nữa</Text>

        <Text style={styles.sectionTitle}>Buổi học</Text>

        <Text style={styles.label}>Số giờ HS phải xác nhận buổi học</Text>
        <View style={styles.inputBox}>
          <Ionicons name="hourglass-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            value={autoPassHours}
            onChangeText={setAutoPassHours}
            keyboardType="number-pad"
          />
          <Text style={styles.unit}>giờ</Text>
        </View>
        <Text style={styles.hint}>
          Sau số giờ này, gia sư có thể gửi yêu cầu duyệt bằng chứng
        </Text>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Thay đổi cài đặt sẽ áp dụng cho toàn bộ người dùng. Cân nhắc kỹ trước khi lưu.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveText}>Lưu cài đặt</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#8B5CF6',
    marginTop: 8, marginBottom: 12,
  },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  unit: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: -6, marginBottom: 16, paddingHorizontal: 4 },
  warningBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB',
    borderRadius: 12, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 12,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
