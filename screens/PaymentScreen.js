import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { pickImage, takePhoto, uploadImage } from '../lib/upload';

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
  const [billUri, setBillUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

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

  const handlePickFromLibrary = async () => {
    setShowPicker(false);
    const res = await pickImage();
    if (res.cancelled) return;
    if (res.error) return Alert.alert('Lỗi', res.error);
    setBillUri(res.uri);
  };

  const handleTakePhoto = async () => {
    setShowPicker(false);
    const res = await takePhoto();
    if (res.cancelled) return;
    if (res.error) return Alert.alert('Lỗi', res.error);
    setBillUri(res.uri);
  };

  const handleConfirm = async () => {
    if (!user?.id) return Alert.alert('Lỗi', 'Bạn chưa đăng nhập');
    if (!billUri) return Alert.alert('Lỗi', 'Vui lòng upload bill chuyển khoản');

    setSubmitting(true);
    setUploading(true);

    try {
      // 1. Upload ảnh bill
      const uploadRes = await uploadImage({
        uri: billUri,
        bucket: 'bills',
        folder: orderCode,
      });

      if (uploadRes.error) {
        setSubmitting(false);
        setUploading(false);
        return Alert.alert('Lỗi upload', uploadRes.error);
      }

      setUploading(false);

      // 2. Tạo course
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

      // 3. Tạo order với bill URL
      const { error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          student_id: user.id,
          course_id: courseData.id,
          amount: booking.payNow,
          status: 'pending',
          bill_url: uploadRes.url,
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
      setUploading(false);
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

        <Text style={styles.sectionTitle}>Upload bill chuyển khoản</Text>

        {billUri ? (
          <View style={styles.billPreviewBox}>
            <Image source={{ uri: billUri }} style={styles.billImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removeBillBtn}
              onPress={() => setBillUri(null)}
            >
              <Ionicons name="close-circle" size={28} color="#EF4444" />
            </TouchableOpacity>
            <View style={styles.billSuccessBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.billSuccessText}>Đã chọn bill</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIcon}>
              <Ionicons name="cloud-upload-outline" size={32} color="#2563EB" />
            </View>
            <Text style={styles.uploadTitle}>Chọn ảnh bill chuyển khoản</Text>
            <Text style={styles.uploadDesc}>
              Chụp ảnh hoặc chọn từ thư viện. Admin sẽ dùng bill này để xác nhận.
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {!expired && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.confirmBtn, (submitting || !billUri) && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={submitting || !billUri}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.confirmText}>
                  {uploading ? 'Đang upload...' : 'Gửi xác nhận'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Chọn ảnh bill</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={[styles.modalIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="camera" size={22} color="#2563EB" />
              </View>
              <Text style={styles.modalOptionText}>Chụp ảnh mới</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handlePickFromLibrary}
              activeOpacity={0.7}
            >
              <View style={[styles.modalIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="images" size={22} color="#10B981" />
              </View>
              <Text style={styles.modalOptionText}>Chọn từ thư viện</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.modalCancelText}>Huỷ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  uploadBox: {
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 32, paddingHorizontal: 20,
    alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  uploadIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  uploadTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 6 },
  uploadDesc: {
    fontSize: 12, color: '#9CA3AF', textAlign: 'center',
    paddingHorizontal: 20, lineHeight: 18,
  },
  billPreviewBox: {
    borderRadius: 16, overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  billImage: {
    width: '100%', height: 220, backgroundColor: '#F3F4F6',
  },
  removeBillBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#fff', borderRadius: 14,
  },
  billSuccessBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
  },
  billSuccessText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  modalIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  modalOptionText: { flex: 1, fontSize: 15, color: '#111', fontWeight: '500' },
  modalCancel: {
    marginTop: 12, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 12,
  },
  modalCancelText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
});
