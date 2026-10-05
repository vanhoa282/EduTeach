import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetWithdraws, adminApproveWithdraw, adminRejectWithdraw } from '../../lib/wallet';

const STATUS_CFG = {
  pending: { label: 'Chờ duyệt', color: '#F59E0B', bg: '#FFFBEB' },
  processing: { label: 'Đang xử lý', color: '#2563EB', bg: '#EFF6FF' },
  done: { label: 'Đã chuyển', color: '#10B981', bg: '#F0FDF4' },
  rejected: { label: 'Từ chối', color: '#EF4444', bg: '#FEF2F2' },
};

export default function WithdrawsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);

  const load = async () => {
    const res = await adminGetWithdraws();
    if (res.withdraws) setItems(res.withdraws);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleApprove = (w) => {
    Alert.alert(
      'Duyệt rút tiền',
      `Chuyển ${w.amount.toLocaleString('vi-VN')}đ cho ${w.user?.full_name || w.user?.phone}?\n\n${w.bank_name} · ${w.bank_account} · ${w.bank_holder}`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setProcessing(w.id);
            const res = await adminApproveWithdraw(w.id);
            setProcessing(null);
            if (res.error) return Alert.alert('Lỗi', res.error);
            Alert.alert('Xong', 'Đã duyệt. Nhớ chuyển khoản tay cho gia sư.');
            load();
          },
        },
      ]
    );
  };

  const handleReject = (w) => {
    Alert.alert(
      'Từ chối rút',
      `Từ chối yêu cầu rút ${w.amount.toLocaleString('vi-VN')}đ?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            setProcessing(w.id);
            const res = await adminRejectWithdraw(w.id, 'Admin từ chối');
            setProcessing(null);
            if (res.error) return Alert.alert('Lỗi', res.error);
            load();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Duyệt rút tiền</Text>
        <Text style={styles.subtitle}>{pendingCount} yêu cầu chờ duyệt / {items.length} tổng</Text>

        {items.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Chưa có yêu cầu rút</Text>
            <Text style={styles.emptyDesc}>Gia sư chưa tạo yêu cầu rút nào</Text>
          </View>
        )}

        {items.map(w => {
          const cfg = STATUS_CFG[w.status] || STATUS_CFG.pending;
          const isPending = w.status === 'pending';
          const isProcessing = processing === w.id;
          return (
            <View key={w.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{w.user?.full_name || 'Gia sư'}</Text>
                  <Text style={styles.userPhone}>{w.user?.phone}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Số tiền rút</Text>
                <Text style={styles.amountValue}>{w.amount.toLocaleString('vi-VN')}đ</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>{w.bank_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>{w.bank_account}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>{w.bank_holder}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  {new Date(w.created_at).toLocaleString('vi-VN')}
                </Text>
              </View>

              {isPending && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => handleReject(w)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text style={[styles.btnText, { color: '#EF4444' }]}>Từ chối</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => handleApprove(w)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={[styles.btnText, { color: '#fff' }]}>Duyệt</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {w.status === 'rejected' && w.note && (
                <Text style={styles.rejectNote}>Lý do: {w.note}</Text>
              )}
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  userPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  amountBox: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12,
    alignItems: 'center', marginTop: 12,
  },
  amountLabel: { fontSize: 11, color: '#2563EB' },
  amountValue: { fontSize: 22, fontWeight: 'bold', color: '#2563EB', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { fontSize: 13, color: '#6B7280' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  rejectBtn: { backgroundColor: '#FEF2F2' },
  approveBtn: { backgroundColor: '#10B981' },
  btnText: { fontSize: 13, fontWeight: '600' },
  rejectNote: { fontSize: 12, color: '#EF4444', marginTop: 8, fontStyle: 'italic' },
});
