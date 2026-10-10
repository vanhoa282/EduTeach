import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMySlots } from '../lib/tutorSchedule';
import { listFreeSlots, validateSelectedSlots } from '../lib/booking/availability';
import {
  summarizeScheduleLabel,
  formatSlotPreview,
  groupSlotsByDay,
  sameWeekdaySlots,
  slotKey,
  vnPartsFromIso,
  overlaps,
} from '../lib/booking/schedule';
import { AUTH_SESSION_KEY } from '../lib/auth/serverLogin';

const SESSION_OPTIONS = [
  { sessions: 10, label: '10 buổi', discount: 0 },
  { sessions: 20, label: '20 buổi', discount: 5 },
  { sessions: 30, label: '30 buổi', discount: 10 },
];

export default function BookingScreen({ user, tutor, onBack, onSuccess }) {
  const [sessions, setSessions] = useState(10);
  const [paymentType, setPaymentType] = useState('full');
  const [tutorSlots, setTutorSlots] = useState(null);
  const [freeSlots, setFreeSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingFree, setLoadingFree] = useState(false);
  const [planError, setPlanError] = useState('');
  const [sessionReady, setSessionReady] = useState(true);
  const [changeSlot, setChangeSlot] = useState(null);

  const option = SESSION_OPTIONS.find(o => o.sessions === sessions);
  const baseTotal = tutor.price * sessions;
  const discount = Math.round(baseTotal * (option.discount / 100));
  const total = baseTotal - discount;
  const payNow = paymentType === 'full' ? total : Math.round(total / 2);
  const payLater = paymentType === 'half' ? total - payNow : 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSlots(true);
      try {
        const token = await AsyncStorage.getItem(AUTH_SESSION_KEY);
        if (mounted) {
          setSessionReady(!!token && /^[a-f0-9]{64}$/.test(token));
        }
        const data = await getMySlots(tutor.id);
        if (!mounted) return;
        setTutorSlots(data || {});
      } catch (_) {
        if (!mounted) return;
        setTutorSlots({});
        setPlanError('Không tải được lịch rảnh của gia sư.');
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    })();
    return () => { mounted = false; };
  }, [tutor.id]);

  useEffect(() => {
    if (!tutorSlots) return;

    let mounted = true;
    (async () => {
      setLoadingFree(true);
      setPlanError('');
      setFreeSlots([]);
      setSelectedSlots([]);

      const hasHours = Object.values(tutorSlots).some(
        hours => Array.isArray(hours) && hours.length > 0
      );
      if (!hasHours) {
        if (mounted) {
          setPlanError('Gia sư chưa mở lịch rảnh. Vui lòng chọn gia sư khác hoặc quay lại sau.');
          setLoadingFree(false);
        }
        return;
      }

      try {
        const slots = await listFreeSlots(
          tutor.id,
          tutorSlots,
          new Date()
        );
        if (!mounted) return;
        setFreeSlots(slots);
      } catch (e) {
        if (!mounted) return;
        setPlanError(e?.message || 'Không tải được danh sách khung giờ trống.');
      } finally {
        if (mounted) setLoadingFree(false);
      }
    })();

    return () => { mounted = false; };
  }, [tutor.id, tutorSlots]);

  const toggleSlot = (slot) => {
    const key = `${slot.start_at}`;
    const exists = selectedSlots.some(s => s.start_at === key);
    if (exists) {
      setSelectedSlots(selectedSlots.filter(s => s.start_at !== key));
    } else {
      if (selectedSlots.length >= sessions) {
        Alert.alert('Đã đủ số buổi', `Bạn đã chọn đủ ${sessions} buổi. Bỏ chọn buổi khác nếu muốn đổi.`);
        return;
      }
      if (selectedSlots.some(s => overlaps(slot, s))) {
        Alert.alert(
          'Trùng giờ với buổi đã chọn',
          'Khung giờ này chồng với một buổi khác trong lịch của bạn. Bấm "Thay đổi" ở buổi đó nếu muốn đổi giờ.'
        );
        return;
      }
      setSelectedSlots([...selectedSlots, slot].sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at)));
    }
  };

  const handleChangeSlot = (slot) => {
    if (loadingFree) return;
    setChangeSlot(slot);
  };

  const applyChangeSlot = (newSlot) => {
    if (!changeSlot) return;

    const others = selectedSlots.filter(
      s => slotKey(s) !== slotKey(changeSlot)
    );
    const next = [...others, newSlot].sort(
      (a, b) => Date.parse(a.start_at) - Date.parse(b.start_at)
    );

    try {
      validateSelectedSlots(next, freeSlots, sessions);
    } catch (e) {
      Alert.alert('Không thể đổi buổi', e.message);
      return;
    }

    setSelectedSlots(next);
    setChangeSlot(null);
    Alert.alert(
      'Đã đổi buổi',
      `Buổi học chuyển sang: ${formatSlotPreview(newSlot)}`
    );
  };

  const handleConfirm = () => {
    if (!user?.id) {
      return Alert.alert('Lỗi', 'Bạn chưa đăng nhập');
    }
    if (!sessionReady) {
      return Alert.alert(
        'Cần đăng nhập lại',
        'Phiên đặt lịch chưa sẵn sàng. Đăng xuất rồi đăng nhập lại (cần Edge Function auth-login).'
      );
    }
    
    try {
      const validated = validateSelectedSlots(selectedSlots, freeSlots, sessions);
      const schedule = summarizeScheduleLabel(validated);
      const booking = {
        sessions,
        total,
        payNow,
        payLater,
        paymentType,
        schedule,
        slots: validated,
      };

      Alert.alert(
        'Xác nhận đăng ký',
        `Bạn đăng ký ${sessions} buổi với ${tutor.name}\nLịch: ${schedule}\nThanh toán: ${payNow.toLocaleString('vi-VN')}đ${paymentType === 'half' ? `\nCòn lại: ${payLater.toLocaleString('vi-VN')}đ` : ''}\n\nHệ thống sẽ giữ chỗ 30 phút khi tạo mã đơn.`,
        [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Xác nhận', onPress: () => onSuccess(booking) },
        ]
      );
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    }
  };

  const canConfirm = sessionReady && !loadingSlots && !loadingFree && selectedSlots.length === sessions;

  // Nút "Thay đổi": slot trống khác cùng thứ (VN) của gia sư
  const changeIndex = changeSlot
    ? selectedSlots.findIndex(s => slotKey(s) === slotKey(changeSlot))
    : -1;
  const changeWeekday = changeSlot
    ? (vnPartsFromIso(changeSlot.start_at)?.weekday ?? null)
    : null;
  const changeOptions = changeSlot && changeWeekday !== null
    ? sameWeekdaySlots(
        freeSlots,
        changeWeekday,
        selectedSlots.map(slotKey),
        selectedSlots.filter(s => slotKey(s) !== slotKey(changeSlot))
      )
    : [];

  // Lưới slot gom theo ngày (tối đa 50 khung giờ)
  const gridGroups = [];
  {
    let shownCount = 0;
    for (const group of groupSlotsByDay(freeSlots)) {
      if (shownCount >= 50) break;
      const take = Math.min(group.slots.length, 50 - shownCount);
      shownCount += take;
      gridGroups.push({ ...group, slots: group.slots.slice(0, take) });
    }
  }

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
                onPress={() => {
                  setSessions(opt.sessions);
                  // Reset selected slots if count changes? 
                  // For better UX, we could keep them and let the user add/remove
                  if (selectedSlots.length > opt.sessions) {
                    setSelectedSlots(selectedSlots.slice(0, opt.sessions));
                  }
                }}
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

        {!sessionReady && (
          <View style={styles.warnCard}>
            <Ionicons name="warning-outline" size={18} color="#B45309" />
            <Text style={styles.warnText}>
              Phiên đặt lịch chưa kích hoạt. Đăng xuất → đăng nhập lại trước khi tạo đơn (cần auth-login).
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Chọn lịch học ({selectedSlots.length}/{sessions})</Text>
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            <Text style={styles.planHeaderText}>Chọn khung giờ trống · mỗi buổi 2 giờ</Text>
          </View>

          {loadingSlots || loadingFree ? (
            <View style={styles.planLoading}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.planHint}>Đang tải danh sách giờ trống...</Text>
            </View>
          ) : planError ? (
            <Text style={styles.planError}>{planError}</Text>
          ) : freeSlots.length === 0 ? (
            <Text style={styles.planError}>Gia sư không còn lịch trống nào trong 90 ngày tới.</Text>
          ) : (
            <View>
              {gridGroups.map(group => (
                <View key={group.key} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Ionicons name="calendar-outline" size={13} color="#64748B" />
                    <Text style={styles.dayLabel}>{group.label}</Text>
                  </View>
                  <View style={styles.slotGrid}>
                    {group.slots.map((slot, idx) => {
                      const isSelected = selectedSlots.some(
                        s => slotKey(s) === slotKey(slot)
                      );
                      return (
                        <TouchableOpacity
                          key={`${slot.start_at}-${idx}`}
                          style={[styles.slotItem, isSelected && styles.slotItemActive]}
                          onPress={() => toggleSlot(slot)}
                        >
                          <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                            {formatSlotPreview(slot)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              {freeSlots.length > 50 && (
                <Text style={styles.planHint}>... còn {freeSlots.length - 50} khung giờ khác</Text>
              )}
            </View>
          )}
        </View>

        {selectedSlots.length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Lịch đã chọn — bấm "Thay đổi" để đổi giờ buổi (không mất các buổi khác):</Text>
            {selectedSlots.map((slot, idx) => (
              <View key={slotKey(slot)} style={styles.previewRow}>
                <View style={styles.previewLeft}>
                  <Text style={styles.previewIndex}>Buổi {idx + 1}</Text>
                  <Text style={styles.previewTime}>{formatSlotPreview(slot)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => handleChangeSlot(slot)}
                >
                  <Ionicons name="swap-horizontal" size={13} color="#2563EB" />
                  <Text style={styles.changeBtnText}>Thay đổi</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
        >
          <Text style={styles.confirmText}>{selectedSlots.length === sessions ? 'Xác nhận' : `Chọn thêm ${sessions - selectedSlots.length} buổi`}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!changeSlot}
        animationType="slide"
        transparent
        onRequestClose={() => setChangeSlot(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {changeIndex >= 0 ? `Đổi buổi ${changeIndex + 1}` : 'Đổi buổi'}
                </Text>
                <Text style={styles.modalSub}>
                  Buổi hiện tại: {changeSlot ? formatSlotPreview(changeSlot) : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setChangeSlot(null)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>
              Chọn khung giờ trống khác cùng thứ với buổi đang đổi (theo lịch rảnh của gia sư). Các buổi còn lại được giữ nguyên.
            </Text>

            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {changeOptions.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Ionicons name="calendar-outline" size={36} color="#D1D5DB" />
                  <Text style={styles.modalEmptyText}>
                    Không còn khung giờ trống nào cùng thứ này trong 90 ngày tới.
                  </Text>
                </View>
              ) : (
                changeOptions.slice(0, 40).map(slot => (
                  <TouchableOpacity
                    key={slotKey(slot)}
                    style={styles.modalOption}
                    onPress={() => applyChangeSlot(slot)}
                  >
                    <Ionicons name="time-outline" size={16} color="#2563EB" />
                    <Text style={styles.modalOptionText}>
                      {formatSlotPreview(slot)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  warnCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  warnText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  planCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#DBEAFE', gap: 8,
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  planHeaderText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
  planLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  planHint: { fontSize: 13, color: '#64748B' },
  planError: { fontSize: 13, color: '#DC2626', lineHeight: 19 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  slotItem: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  slotItemActive: { borderColor: '#2563EB', backgroundColor: '#2563EB' },
  slotText: { fontSize: 12, color: '#374151' },
  slotTextActive: { color: '#fff', fontWeight: 'bold' },
  previewCard: {
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 24,
  },
  previewTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  previewRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  previewIndex: { fontSize: 12, color: '#6B7280' },
  previewTime: { fontSize: 13, color: '#111', fontWeight: '500' },
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
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dayGroup: { marginBottom: 14 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dayLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  previewLeft: { flex: 1 },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
  },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(17,24,39,0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28,
    maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  modalSub: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  modalClose: { padding: 4 },
  modalHint: {
    fontSize: 13, color: '#475569', lineHeight: 19,
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginTop: 14,
  },
  modalList: { marginTop: 12, flexGrow: 0 },
  modalEmpty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  modalEmptyText: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center',
    marginTop: 10, lineHeight: 19,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalOptionText: { fontSize: 14, color: '#111827', fontWeight: '500' },
});

