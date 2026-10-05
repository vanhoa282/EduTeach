import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getSettings, updateSetting } from '../../lib/adminSettings';

const PRESETS = [5, 10, 15, 20, 25, 30];

export default function CommissionScreen({ onBack }) {
  const [rate, setRate] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setRate(s.commission_rate || '10');
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    const num = parseFloat(rate);
    if (isNaN(num) || num < 0 || num > 50) {
      return Alert.alert('Lỗi', 'Hoa hồng từ 0% đến 50%');
    }
    setSaving(true);
    const res = await updateSetting('commission_rate', num);
    setSaving(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    Alert.alert('Thành công', `Hoa hồng đã được set thành ${num}%`);
  };

  const numRate = parseFloat(rate) || 0;
  const examplePrice = 200000;
  const fee = Math.round(examplePrice * numRate / 100);
  const tutorReceive = examplePrice - fee;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
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
        <Text style={styles.topBarTitle}>Cấu hình hoa hồng</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#10B981" />
          <Text style={styles.infoText}>
            Hoa hồng áp dụng cho tất cả khóa học mới. Khóa cũ giữ nguyên mức hoa hồng khi tạo.
          </Text>
        </View>

        <View style={styles.bigCard}>
          <Text style={styles.bigLabel}>Hoa hồng hiện tại</Text>
          <View style={styles.rateRow}>
            <TextInput
              style={styles.rateInput}
              value={rate}
              onChangeText={setRate}
              keyboardType="numeric"
              maxLength={4}
            />
            <Text style={styles.percentSign}>%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Chọn nhanh</Text>
        <View style={styles.presetsRow}>
          {PRESETS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.presetBtn, numRate === p && styles.presetBtnActive]}
              onPress={() => setRate(String(p))}
            >
              <Text style={[styles.presetText, numRate === p && styles.presetTextActive]}>
                {p}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>Ví dụ với khóa 200.000đ/buổi</Text>

          <View style={styles.exampleRow}>
            <Text style={styles.exampleLabel}>Học sinh trả</Text>
            <Text style={styles.exampleValue}>{examplePrice.toLocaleString('vi-VN')}đ</Text>
          </View>

          <View style={styles.exampleRow}>
            <Text style={styles.exampleLabel}>App giữ ({numRate}%)</Text>
            <Text style={[styles.exampleValue, { color: '#10B981' }]}>
              {fee.toLocaleString('vi-VN')}đ
            </Text>
          </View>

          <View style={[styles.exampleRow, styles.exampleDivider]}>
            <Text style={[styles.exampleLabel, { fontWeight: 'bold' }]}>Gia sư nhận</Text>
            <Text style={[styles.exampleValue, { color: '#2563EB', fontSize: 18 }]}>
              {tutorReceive.toLocaleString('vi-VN')}đ
            </Text>
          </View>
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
              <Text style={styles.saveText}>Lưu cấu hình</Text>
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
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#F0FDF4',
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  infoText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 19 },
  bigCard: {
    backgroundColor: '#10B981', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  bigLabel: { fontSize: 13, color: '#D1FAE5' },
  rateRow: {
    flexDirection: 'row', alignItems: 'baseline', marginTop: 10,
  },
  rateInput: {
    fontSize: 56, fontWeight: 'bold', color: '#fff',
    minWidth: 100, textAlign: 'right', padding: 0,
  },
  percentSign: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginLeft: 6 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  presetsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24,
  },
  presetBtn: {
    flex: 1, minWidth: '30%', paddingVertical: 12,
    borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  presetBtnActive: { backgroundColor: '#F0FDF4', borderColor: '#10B981' },
  presetText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  presetTextActive: { color: '#10B981' },
  exampleCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  exampleTitle: { fontSize: 14, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  exampleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  exampleLabel: { fontSize: 14, color: '#6B7280' },
  exampleValue: { fontSize: 15, fontWeight: '600', color: '#111' },
  exampleDivider: {
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
