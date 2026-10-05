import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const SESSION_OPTIONS = [
  { sessions: 10, label: '10 buổi', discount: 0 },
  { sessions: 20, label: '20 buổi', discount: 5 },
  { sessions: 30, label: '30 buổi', discount: 10 },
];

const TIME_SLOTS = [
  { id: '1', label: 'T2, T4, T6', sub: '18h - 20h' },
  { id: '2', label: 'T3, T5, T7', sub: '18h - 20h' },
  { id: '3', label: 'T7, CN', sub: '8h - 10h' },
  { id: '4', label: 'T7, CN', sub: '14h - 16h' },
];

export default function BookingScreen({ user, tutor, onBack, onSuccess }) {
  const [sessions, setSessions] = useState(10);
  const [timeSlot, setTimeSlot] = useState('1');
  const [paymentType, setPaymentType] = useState('full');

  const option = SESSION_OPTIONS.find(o => o.sessions === sessions);
  const baseTotal = tutor.price * sessions;
  const discount = Math.round(baseTotal * (option.discount / 100));
  const total = baseTotal - discount;
  const payNow = paymentType === 'full' ? total : Math.round(total / 2);
  const payLater = paymentType === 'half' ? total - payNow : 0;

  const handleConfirm = () => {
    const slot = TIME_SLOTS.find(s => s.id === timeSlot);
    const booking = {
      sessions,
      total,
      payNow,
      payLater,
      paymentType,
      schedule: `${slot.label} · ${slot.sub}`,
    };
    Alert.alert(
      'Xác nhận đăng ký',
      `Bạn đăng ký ${sessions} buổi với ${tutor.name}\nThanh toán: ${payNow.toLocaleString('vi-VN')}đ${paymentType === 'half' ? `\nCòn lại: ${payLater.toLocaleString('vi-VN')}đ` : ''}`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => onSuccess(booking) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Đăng ký khóa học</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.tutorBox}>
          <View style={styles.avatarMini}>
            <Ionicons name="person" size={24} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tutorName}>{tutor.name}</Text>
            <Text style={styles.tutorSubject}>{tutor.subject}</Text>
          </View>
          <Text style={styles.priceSmall}>
            {(tutor.price / 1000).toFixed(0)}k
            <Text style={styles.priceUnit}>/buổi</Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Chọn số buổi</Text>
        <View style={styles.sessionRow}>
          {SESSION_OPTIONS.map(opt => {
            const active = opt.sessions === sessions;
            return (
              <TouchableOpacity
                key={opt.sessions}
                style={[styles.sessionCard, active && styles.sessionCardActive]}
                onPress={() => setSessions(opt.sessions)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sessionNum, active && styles.sessionNumActive]}>
                  {opt.sessions}
                </Text>
                <Text style={[styles.sessionLabel, active && styles.sessionLabelActive]}>
                  buổi
                </Text>
                {opt.discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{opt.discount}%</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Chọn lịch học</Text>
        <View style={styles.slotGrid}>
          {TIME_SLOTS.map(slot => {
            const active = slot.id === timeSlot;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotCard, active && styles.slotCardActive]}
                onPress={() => setTimeSlot(slot.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={active ? '#2563EB' : '#9CA3AF'}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.slotLabel, active && styles.slotLabelActive]}>
                    {slot.label}
                  </Text>
                  <Text style={styles.slotSub}>{slot.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        <TouchableOpacity
          style={[styles.payCard, paymentType === 'full' && styles.payCardActive]}
          onPress={() => setPaymentType('full')}
          activeOpacity={0.7}
        >
          <View style={styles.radioOuter}>
            {paymentType === 'full' && <View style={styles.radioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.payTitle}>Trả 100%</Text>
            <Text style={styles.payDesc}>Thanh toán toàn bộ khóa học ngay</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={paymentType === 'full' ? '#2563EB' : '#E5E7EB'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payCard, paymentType === 'half' && styles.payCardActive]}
          onPress={() => setPaymentType('half')}
          activeOpacity={0.7}
        >
          <View style={styles.radioOuter}>
            {paymentType === 'half' && <View style={styles.radioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.payTitle}>Trả 50% trước</Text>
            <Text style={styles.payDesc}>Trả 50% còn lại khi kết thúc khóa</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={paymentType === 'half' ? '#2563EB' : '#E5E7EB'} />
        </TouchableOpacity>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Tổng kết</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{sessions} buổi × {(tutor.price / 1000).toFixed(0)}k</Text>
            <Text style={styles.summaryValue}>{baseTotal.toLocaleString('vi-VN')}đ</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#10B981' }]}>
                Giảm giá {option.discount}%
              </Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                -{discount.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Tổng cộng</Text>
            <Text style={styles.summaryTotalValue}>{total.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thanh toán ngay</Text>
            <Text style={[styles.summaryValue, { color: '#2563EB', fontWeight: 'bold' }]}>
              {payNow.toLocaleString('vi-VN')}đ
            </Text>
          </View>
          {payLater > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Còn lại cuối khóa</Text>
              <Text style={styles.summaryValue}>{payLater.toLocaleString('vi-VN')}đ</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Thanh toán ngay</Text>
          <Text style={styles.priceBig}>{payNow.toLocaleString('vi-VN')}đ</Text>
        </View>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmText}>Xác nhận</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
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
  tutorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatarMini: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  tutorName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  tutorSubject: { fontSize: 13, color: '#666', marginTop: 2 },
  priceSmall: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
  priceUnit: { fontSize: 11, fontWeight: 'normal', color: '#9CA3AF' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  sessionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  sessionCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB',
    position: 'relative',
  },
  sessionCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  sessionNum: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  sessionNumActive: { color: '#2563EB' },
  sessionLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  sessionLabelActive: { color: '#2563EB' },
  discountBadge: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  slotGrid: { gap: 10, marginBottom: 24 },
  slotCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  slotCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  slotLabel: { fontSize: 14, fontWeight: '600', color: '#111' },
  slotLabelActive: { color: '#2563EB' },
  slotSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  payCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 10,
  },
  payCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB' },
  payTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  payDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  summary: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 14 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, color: '#111', fontWeight: '500' },
  summaryDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  summaryTotal: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  summaryTotalValue: { fontSize: 17, fontWeight: 'bold', color: '#111' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  priceLabel: { fontSize: 12, color: '#9CA3AF' },
  priceBig: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 12,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
