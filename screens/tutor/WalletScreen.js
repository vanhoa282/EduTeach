import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getWallet, getMyWithdraws } from '../../lib/wallet';

const TYPE_CFG = {
  session_earning: { icon: 'arrow-down', income: true, label: 'Thu nhập buổi học' },
  app_fee: { icon: 'receipt', income: false, label: 'Hoa hồng app' },
  withdraw: { icon: 'arrow-up', income: false, label: 'Rút tiền' },
  payout: { icon: 'arrow-up', income: false, label: 'Thanh toán' },
  refund: { icon: 'arrow-down', income: true, label: 'Hoàn tiền' },
  topup: { icon: 'arrow-down', income: true, label: 'Nạp tiền' },
};

export default function WalletScreen({ user, onOpenWithdraw }) {
  const [wallet, setWallet] = useState({ balance_available: 0, balance_pending: 0 });
  const [transactions, setTransactions] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [tab, setTab] = useState('transactions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    const [w, wd] = await Promise.all([getWallet(user.id), getMyWithdraws(user.id)]);
    setWallet(w.wallet);
    setTransactions(w.transactions);
    setWithdraws(wd);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Ví của tôi</Text>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
            <View style={styles.eyeBtn}>
              <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
          <Text style={styles.balanceValue}>{(wallet.balance_available || 0).toLocaleString('vi-VN')}đ</Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={onOpenWithdraw}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down-circle" size={20} color="#2563EB" />
              <Text style={styles.actionTextPrimary}>Rút tiền</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setTab('withdraws')}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={20} color="#fff" />
              <Text style={styles.actionText}>Lịch sử rút</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="information-circle" size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Thu nhập vào ví ngay</Text>
            <Text style={styles.infoDesc}>
              Khi HS xác nhận buổi học, tiền vào ví ngay. Admin có 7 ngày để kiểm tra nếu có khiếu nại.
            </Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'transactions' && styles.tabBtnActive]}
            onPress={() => setTab('transactions')}
          >
            <Text style={[styles.tabText, tab === 'transactions' && styles.tabTextActive]}>
              Giao dịch
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'withdraws' && styles.tabBtnActive]}
            onPress={() => setTab('withdraws')}
          >
            <Text style={[styles.tabText, tab === 'withdraws' && styles.tabTextActive]}>
              Rút tiền ({withdraws.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'transactions' && (
          <>
            {transactions.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
              </View>
            )}
            {transactions.map(tx => {
              const cfg = TYPE_CFG[tx.type] || { icon: 'swap-horizontal', income: tx.amount > 0, label: tx.type };
              const isIncome = tx.amount > 0;
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={[styles.txIconBox, { backgroundColor: isIncome ? '#F0FDF4' : '#FEF2F2' }]}>
                    <Ionicons name={cfg.icon} size={18} color={isIncome ? '#10B981' : '#EF4444'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>{cfg.label}</Text>
                    <Text style={styles.txSub} numberOfLines={1}>
                      {tx.note || new Date(tx.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: isIncome ? '#10B981' : '#EF4444' }]}>
                    {isIncome ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {tab === 'withdraws' && (
          <>
            {withdraws.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="arrow-up-circle-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Chưa có yêu cầu rút</Text>
              </View>
            )}
            {withdraws.map(w => {
              const statusCfg = {
                pending: { label: 'Chờ duyệt', color: '#F59E0B', bg: '#FFFBEB' },
                processing: { label: 'Đang xử lý', color: '#2563EB', bg: '#EFF6FF' },
                done: { label: 'Đã chuyển', color: '#10B981', bg: '#F0FDF4' },
                rejected: { label: 'Từ chối', color: '#EF4444', bg: '#FEF2F2' },
              }[w.status] || { label: w.status, color: '#6B7280', bg: '#F3F4F6' };

              return (
                <View key={w.id} style={styles.txCard}>
                  <View style={[styles.txIconBox, { backgroundColor: statusCfg.bg }]}>
                    <Ionicons name="arrow-up" size={18} color={statusCfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>{w.amount.toLocaleString('vi-VN')}đ</Text>
                    <Text style={styles.txSub} numberOfLines={1}>
                      {w.bank_name} · {w.bank_account}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

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
  balanceActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  actionBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 10,
  },
  actionTextPrimary: { color: '#2563EB', fontSize: 13, fontWeight: '700' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 10,
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
  tabsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    padding: 4, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#EFF6FF' },
  tabText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  tabTextActive: { color: '#2563EB' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginTop: 12 },
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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
