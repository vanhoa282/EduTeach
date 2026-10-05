import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetPendingOrders, adminApproveOrder, adminRejectOrder } from '../../lib/auth';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  const [billPreview, setBillPreview] = useState(null);

  const load = async () => {
    const res = await adminGetPendingOrders();
    if (res.orders) setOrders(res.orders);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleApprove = (order) => {
    Alert.alert(
      'Duyệt đơn',
      `Xác nhận đã nhận ${order.amount.toLocaleString('vi-VN')}đ cho đơn ${order.order_code}?\n\nHệ thống sẽ:\n• Đánh dấu đơn đã trả\n• Kích hoạt khóa học\n• Tạo ${order.course?.total_sessions || 0} buổi học`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            setProcessing(order.id);
            const res = await adminApproveOrder(order.id);
            setProcessing(null);
            if (res.error) return Alert.alert('Lỗi', res.error);
            Alert.alert('Thành công', 'Đã duyệt đơn và tạo buổi học');
            load();
          },
        },
      ]
    );
  };

  const handleReject = (order) => {
    Alert.alert(
      'Từ chối đơn',
      `Bạn chắc chắn muốn TỪ CHỐI đơn ${order.order_code}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            setProcessing(order.id);
            const res = await adminRejectOrder(order.id);
            setProcessing(null);
            if (res.error) return Alert.alert('Lỗi', res.error);
            Alert.alert('Đã từ chối', 'Đơn đã bị huỷ');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Duyệt thanh toán</Text>
        <Text style={styles.subtitle}>{orders.length} đơn chờ duyệt</Text>

        {orders.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Không có đơn chờ</Text>
            <Text style={styles.emptyDesc}>Tất cả đơn đã được xử lý</Text>
          </View>
        )}

        {orders.map(o => {
          const isProcessing = processing === o.id;
          return (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.orderCodeBox}>
                  <Text style={styles.orderCodeLabel}>Mã đơn</Text>
                  <Text style={styles.orderCode}>{o.order_code}</Text>
                </View>
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>Số tiền</Text>
                  <Text style={styles.amountValue}>{o.amount.toLocaleString('vi-VN')}đ</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  {o.student?.full_name || 'HS'} · {o.student?.phone || '---'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="book-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  {o.course?.subject || 'Khóa'} · {o.course?.total_sessions || 0} buổi
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  Tạo: {new Date(o.created_at).toLocaleString('vi-VN')}
                </Text>
              </View>

              {o.bill_url ? (
                <TouchableOpacity
                  style={styles.billThumbBox}
                  onPress={() => setBillPreview(o.bill_url)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: o.bill_url }} style={styles.billThumb} resizeMode="cover" />
                  <View style={styles.billThumbOverlay}>
                    <Ionicons name="expand-outline" size={16} color="#fff" />
                    <Text style={styles.billThumbText}>Xem bill</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.noBill}>
                  <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
                  <Text style={styles.noBillText}>Học sinh chưa upload bill</Text>
                </View>
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleReject(o)}
                  disabled={isProcessing}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                  <Text style={[styles.btnText, { color: '#EF4444' }]}>Từ chối</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleApprove(o)}
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
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={!!billPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setBillPreview(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setBillPreview(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {billPreview && (
            <Image
              source={{ uri: billPreview }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCodeBox: { flex: 1 },
  orderCodeLabel: { fontSize: 11, color: '#9CA3AF' },
  orderCode: { fontSize: 18, fontWeight: 'bold', color: '#7C3AED', marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, color: '#9CA3AF' },
  amountValue: { fontSize: 18, fontWeight: 'bold', color: '#10B981', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { fontSize: 13, color: '#6B7280' },
  billThumbBox: {
    marginTop: 10, borderRadius: 12, overflow: 'hidden',
    position: 'relative', height: 140,
  },
  billThumb: {
    width: '100%', height: '100%', backgroundColor: '#F3F4F6',
  },
  billThumbOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  billThumbText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  noBill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginTop: 10,
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  noBillText: { fontSize: 12, color: '#92400E' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  rejectBtn: { backgroundColor: '#FEF2F2' },
  approveBtn: { backgroundColor: '#10B981' },
  btnText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseBtn: {
    position: 'absolute', top: 40, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  modalImage: { width: '100%', height: '80%' },
});
