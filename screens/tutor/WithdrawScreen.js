import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { requestWithdraw } from '../../lib/wallet';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export default function WithdrawScreen({ user, balance, onBack, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;

  const handleQuick = (v) => setAmount(v.toString());

  const handleSubmit = async () => {
    if (numericAmount < 50000) {
      return Alert.alert('Lỗi', 'Số tiền tối thiểu 50.000đ');
    }
    if (numericAmount > balance) {
      return Alert.alert('Lỗi', 'Số dư khả dụng không đủ');
    }
    if (!bankName.trim() || !bankAccount.trim() || !bankHolder.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin ngân hàng');
    }

    setSubmitting(true);
    const res = await requestWithdraw({
      userId: user.id,
      amount: numericAmount,
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankHolder: bankHolder.trim().toUpperCase(),
    });
    setSubmitting(false);

    if (res.error) return Alert.alert('Lỗi', res.error);

    Alert.alert(
      'Đã gửi yêu cầu',
      'Admin sẽ xử lý trong 24h. Tiền sẽ được chuyển vào tài khoản ngân hàng của bạn.',
      [{ text: 'OK', onPress: onSuccess }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Rút tiền</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          <Text style={styles.balanceValue}>{balance.toLocaleString('vi-VN')}đ</Text>
        </View>

        <Text style={styles.label}>Số tiền rút</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.inputAmount}
            placeholder="0"
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.currency}>đ</Text>
        </View>

        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map(v => (
            <TouchableOpacity
              key={v}
              style={[
                styles.quickBtn,
                numericAmount === v && styles.quickBtnActive,
                v > balance && styles.quickBtnDisabled,
              ]}
              onPress={() => handleQuick(v)}
              disabled={v > balance}
            >
              <Text style={[
                styles.quickText,
                numericAmount === v && styles.quickTextActive,
                v > balance && styles.quickTextDisabled,
              ]}>
                {(v / 1000).toFixed(0)}k
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Ngân hàng</Text>
        <View style={styles.inputBox2}>
          <Ionicons name="business-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="VD: ACB, Vietcombank..."
            value={bankName}
            onChangeText={setBankName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text style={styles.label}>Số tài khoản</Text>
        <View style={styles.inputBox2}>
          <Ionicons name="card-outline" size={20} color="#9CA3AF" />
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
        <View style={styles.inputBox2}>
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
          <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
          <Text style={styles.noteText}>
            Yêu cầu rút sẽ được admin xử lý trong 24h. Phí chuyển khoản do admin set.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="arrow-up-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>Gửi yêu cầu rút</Text>
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
  balanceBox: {
    backgroundColor: '#2563EB', borderRadius: 16, padding: 20, marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  balanceLabel: { fontSize: 13, color: '#DBEAFE' },
  balanceValue: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 6 },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  inputAmount: { flex: 1, fontSize: 22, fontWeight: 'bold', color: '#111', padding: 0 },
  currency: { fontSize: 18, fontWeight: 'bold', color: '#9CA3AF', marginLeft: 8 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  quickBtnDisabled: { opacity: 0.4 },
  quickText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  quickTextActive: { color: '#2563EB' },
  quickTextDisabled: { color: '#9CA3AF' },
  inputBox2: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  noteBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  noteText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
