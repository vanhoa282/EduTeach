import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { saveBankAccount, getBankAccount } from '../../lib/auth';

export default function BankScreen({ user, onBack }) {
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const b = await getBankAccount(user.id);
      if (b) {
        setBankName(b.bank_name || '');
        setBankAccount(b.bank_account || '');
        setBankHolder(b.bank_holder || '');
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!bankName.trim() || !bankAccount.trim() || !bankHolder.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
    }

    setSaving(true);
    const res = await saveBankAccount(user.id, {
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankHolder: bankHolder.trim().toUpperCase(),
    });
    setSaving(false);

    if (res.error) return Alert.alert('Lỗi', res.error);

    Alert.alert('Thành công', 'Đã lưu thông tin ngân hàng', [
      { text: 'OK', onPress: onBack },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10B981" />
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
        <Text style={styles.topBarTitle}>Tài khoản ngân hàng</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="card" size={36} color="#10B981" />
          </View>
          <Text style={styles.headerTitle}>Thông tin nhận tiền</Text>
          <Text style={styles.headerDesc}>
            Dùng để nhận tiền khi rút từ ví. Vui lòng nhập chính xác.
          </Text>
        </View>

        <Text style={styles.label}>Tên ngân hàng</Text>
        <View style={styles.inputBox}>
          <Ionicons name="business-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="VD: ACB, Vietcombank, Techcombank..."
            value={bankName}
            onChangeText={setBankName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text style={styles.label}>Số tài khoản</Text>
        <View style={styles.inputBox}>
          <Ionicons name="keypad-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Nhập số tài khoản"
            keyboardType="number-pad"
            value={bankAccount}
            onChangeText={setBankAccount}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text style={styles.label}>Chủ tài khoản</Text>
        <View style={styles.inputBox}>
          <Ionicons name="person-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="NGUYEN VAN A (viết hoa không dấu)"
            value={bankHolder}
            onChangeText={setBankHolder}
            autoCapitalize="characters"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="warning-outline" size={20} color="#EF4444" />
          <Text style={styles.noteText}>
            Nhập SAI thông tin ngân hàng có thể khiến việc rút tiền bị chậm. Kiểm tra kỹ trước khi lưu.
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
              <Text style={styles.saveText}>Lưu thông tin</Text>
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
  iconHeader: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  headerDesc: {
    fontSize: 13, color: '#6B7280', textAlign: 'center',
    marginTop: 6, paddingHorizontal: 20, lineHeight: 18,
  },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  noteBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  noteText: { flex: 1, fontSize: 13, color: '#991B1B', lineHeight: 19 },
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
