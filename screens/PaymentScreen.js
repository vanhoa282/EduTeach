import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BANK_INFO = {
  bankName: 'ACB - Ngân hàng Á Châu',
  accountNumber: '25317541',
  accountHolder: 'HO VAN HOA',
  branch: 'Chi nhánh TP.HCM',
};

const PAYMENT_TIMEOUT = 30 * 60;

export default function PaymentScreen({ user, tutor, booking, onBack, onSuccess }) {
  const [orderCode] = useState(() => 'EDT' + Math.floor(100000 + Math.random() * 900000));
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT);
  const [copied, setCopied] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const expired = timeLeft <= 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text, label) => {
    setCopied(label);
    Alert.alert('Đã copy', `${label}: ${text}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirm = async () => {
    if (!user?.id) return Alert.alert('Lỗi', 'Bạn chưa đăng nhập');
    setSubmitting(true);

    try {
      // 1. Tạo course
      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .insert({
          student_id: user.id,
          tutor_id: tutor.id,
          subject: tutor.subject,
          total_sessions: booking.sessions,
          price_per_session: tutor.price,
          total_price: booking.total,
          payment_type: booking.paymentType,
          paid_amount: 0,
          commission_rate: 10,
          status: 'pending_payment',
          schedule: booking.schedule,
        })
        .select()
        .single();

      if (courseErr) throw courseErr;

      // 2. Tạo order
      const { error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          student_id: user.id,
          course_id: courseData.id,
          amount: booking.payNow,
          status: 'pending',
        });

      if (orderErr) throw orderErr;

      setSubmitting(false);

      Alert.alert(
        'Đã gửi yêu cầu',
        `Mã đơn: ${orderCode}\nAdmin sẽ xác nhận trong 24h. Theo dõi ở tab Khóa học.`,
        [{
          text: 'OK',
          onPress: () => onSuccess({
            id: courseData.id,
            tutorName: tutor.name,
            subject: tutor.subject,
            totalSessions: booking.sessions,
            completedSessions: 0,
            schedule: booking.schedule,
            total: booking.total,
            status: 'pending_payment',
          }),
        }]
      );
    } catch (e) {
      setSubmitting(false);
      console.error('Create order error:', e);
      Alert.alert('Lỗi', e.message || 'Không thể tạo đơn hàng');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Thanh toán</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Số tiền cần chuyển</Text>
          <Text style={styles.amountValue}>{booking.payNow.toLocaleString('vi-VN')}đ</Text>

          <View style={styles.codeBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.codeLabel}>Mã đơn hàng</Text>
              <Text style={styles.codeValue}>{orderCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.codeCopyBtn}
              onPress={() => copyToClipboard(orderCode, 'Mã đơn')}
            >
              <Ionicons
                name={copied === 'Mã đơn' ? 'checkmark' : 'copy-outline'}
                size={16}
                color="#fff"
              />
              <Text style={styles.codeCopyText}>{copied === 'Mã đơn' ? 'Đã copy' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {!expired ? (
            <View style={styles.timerBox}>
              <Ionicons name="time-outline" size={16} color="#FEF3C7" />
              <Text style={styles.timerText}>
                Hết hạn sau <Text style={styles.timerBold}>{formatTime(timeLeft)}</Text>
              </Text>
            </View>
          ) : (
            <View style={[styles.timerBox, { backgroundColor: '#DC2626' }]}>
              <Ionicons name="alert-circle" size={16} color="#fff" />
              <Text style={styles.timerText}>Đơn đã hết hạn</Text>
            </View>
          )}
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
          <Text style={styles.noteText}>
            Chuyển khoản <Text style={{ fontWeight: 'bold' }}>đúng số tiền</Text> và ghi{' '}
            <Text style={{ fontWeight: 'bold' }}>đúng mã đơn {orderCode}</Text> vào nội dung.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Thông tin chuyển khoản</Text>

        <View style={styles.bankCard}>
          <View style={styles.bankHeader}>
            <View style={styles.bankIcon}>
              <Ionicons name="business" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.bankName}>{BANK_INFO.bankName}</Text>
              <Text style={styles.bankBranch}>{BANK_INFO.branch}</Text>
            </View>
          </View>

          <View style={styles.bankDivider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => copyToClipboard(BANK_INFO.accountNumber, 'Số tài khoản')}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.infoLabel}>Số tài khoản</Text>
              <Text style={styles.infoValue}>{BANK_INFO.accountNumber}</Text>
            </View>
            <View style={styles.copyBtn}>
              <Ionicons
                name={copied === 'Số tài khoản' ? 'checkmark' : 'copy-outline'}
                size={16}
                color="#2563EB"
              />
              <Text style={styles.copyText}>
                {copied === 'Số tài khoản' ? 'Đã copy' : 'Copy'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => copyToClipboard(BANK_INFO.accountHolder, 'Chủ tài khoản')}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.infoLabel}>Chủ tài khoản</Text>
              <Text style={styles.infoValue}>{BANK_INFO.accountHolder}</Text>
            </View>
            <View style={styles.copyBtn}>
              <Ionicons
                name={copied === 'Chủ tài khoản' ? 'checkmark' : 'copy-outline'}
                size={16}
                color="#2563EB"
              />
              <Text style={styles.copyText}>
                {copied === 'Chủ tài khoản' ? 'Đã copy' : 'Copy'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => copyToClipboard(orderCode, 'Nội dung CK')}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Nội dung chuyển khoản</Text>
              <Text style={styles.infoValue}>{orderCode}</Text>
            </View>
            <View style={styles.copyBtn}>
              <Ionicons
                name={copied === 'Nội dung CK' ? 'checkmark' : 'copy-outline'}
                size={16}
                color="#2563EB"
              />
              <Text style={styles.copyText}>
                {copied === 'Nội dung CK' ? 'Đã copy' : 'Copy'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {!expired && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.confirmText}>Tôi đã chuyển khoản</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  amountBox: {
    backgroundColor: '#2563EB', borderRadius: 20, padding: 24, marginBottom: 20,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  amountLabel: { fontSize: 13, color: '#DBEAFE', marginBottom: 6 },
  amountValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 18 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12,
    marginBottom: 12,
  },
  codeLabel: { fontSize: 11, color: '#DBEAFE', marginBottom: 2 },
  codeValue: { fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 1.5 },
  codeCopyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  codeCopyText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  timerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
  },
  timerText: { fontSize: 13, color: '#FEF3C7' },
  timerBold: { fontWeight: 'bold', color: '#fff' },
  noteBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB',
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  noteText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  bankCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bankIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  bankName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  bankBranch: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  bankDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  copyText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
