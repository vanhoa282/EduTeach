import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TRANSACTIONS = [
  { id: '1', type: 'income', title: 'Buổi dạy Toán 12', sub: 'Trần Minh Khang', amount: 180000, time: '2 giờ trước' },
  { id: '2', type: 'income', title: 'Buổi dạy Toán 11', sub: 'Lê Thu Hà', amount: 162000, time: 'Hôm qua' },
  { id: '3', type: 'withdraw', title: 'Rút tiền về ACB', sub: '25317541', amount: -500000, time: '2 ngày trước' },
  { id: '4', type: 'income', title: 'Buổi dạy Toán 12', sub: 'Phạm Quốc Bảo', amount: 180000, time: '3 ngày trước' },
  { id: '5', type: 'fee', title: 'Hoa hồng EduTeach', sub: '10% tháng 9', amount: -20000, time: '5 ngày trước' },
];

export default function WalletScreen() {
  const balance = 2340000;
  const pending = 480000;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ví của tôi</Text>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
            <View style={styles.eyeBtn}>
              <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
          <Text style={styles.balanceValue}>{balance.toLocaleString('vi-VN')}đ</Text>

          <View style={styles.pendingRow}>
            <Ionicons name="time-outline" size={14} color="#DBEAFE" />
            <Text style={styles.pendingText}>
              Đang chờ: <Text style={{ fontWeight: 'bold' }}>{pending.toLocaleString('vi-VN')}đ</Text>
            </Text>
          </View>

          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionText}>Rút tiền</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="time-outline" size={20} color="#fff" />
              <Text style={styles.actionText}>Lịch sử</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoIconBox, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Rút tiền trong 7 ngày</Text>
            <Text style={styles.infoDesc}>
              Tiền buổi học sẽ chờ 7 ngày trước khi khả dụng (bảo vệ tranh chấp)
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>

        {TRANSACTIONS.map(tx => {
          const isIncome = tx.amount > 0;
          return (
            <View key={tx.id} style={styles.txCard}>
              <View style={[
                styles.txIconBox,
                { backgroundColor: isIncome ? '#F0FDF4' : '#FEF2F2' }
              ]}>
                <Ionicons
                  name={
                    tx.type === 'income' ? 'arrow-down' :
                    tx.type === 'withdraw' ? 'arrow-up' : 'receipt'
                  }
                  size={18}
                  color={isIncome ? '#10B981' : '#EF4444'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txSub}>{tx.sub} · {tx.time}</Text>
              </View>
              <Text style={[
                styles.txAmount,
                { color: isIncome ? '#10B981' : '#EF4444' }
              ]}>
                {isIncome ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  balanceCard: {
    backgroundColor: '#2563EB', borderRadius: 20, padding: 22, marginBottom: 16,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: '#DBEAFE' },
  eyeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  balanceValue: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginTop: 6 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  pendingText: { fontSize: 12, color: '#DBEAFE' },
  balanceActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12, borderRadius: 10,
  },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  infoIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  infoDesc: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 17 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  txIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  txSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold' },
});
