import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

const BANK_INFO = {
  bankName: 'ACB - Ngân hàng Á Châu',
  accountNumber: '123456789',
  accountHolder: 'NGUYEN VAN HOA',
  branch: 'Chi nhánh TP.HCM',
};

const PAYMENT_TIMEOUT = 30 * 60; // 30 phút

export default function PaymentScreen({ tutor, booking, onBack, onSuccess }) {
  const [orderCode] = useState(() => 'EDT' + Math.floor(100000 + Math.random() * 900000));
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT);
  const [billUploaded, setBillUploaded] = useState(false);
  const [copied, setCopied] = useState(null);

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

  const handleUploadBill = () => {
    Alert.alert('Upload bill chuyển khoản', 'Chọn ảnh từ thư viện hoặc chụp mới', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Thư viện', onPress: () => setBillUploaded(true) },
      { text: 'Chụp ảnh', onPress: () => setBillUploaded(true) },
    ]);
  };

  const handleConfirm = () => {
    if (!billUploaded) {
      Alert.alert('Chưa có bill', 'Vui lòng upload bill chuyển khoản trước');
      return;
    }
    Alert.alert(
      'Đã gửi',
      'Hệ thống đang kiểm tra tự động. Nếu sau 30 phút chưa match được, admin sẽ duyệt thủ công từ bill bạn đã upload.',
      [{ text: 'OK', onPress: () => onSuccess && onSuccess() }]
    );
  };

  const handleRenew = () => {
    Alert.alert('Tạo đơn mới', 'Đơn cũ đã hết hạn. Tạo đơn mới?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đồng ý', onPress: onBack },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
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

        {expired ? (
          <View style={styles.expiredBox}>
            <Ionicons name="close-circle" size={64} color="#DC2626" />
            <Text style={styles.expiredTitle}>Đơn hàng hết hạn</Text>
            <Text style={styles.expiredDesc}>
              Vui lòng tạo đơn mới để tiếp tục đăng ký khóa học
            </Text>
            <TouchableOpacity style={styles.renewBtn} onPress={handleRenew}>
              <Text style={styles.renewText}>Tạo đơn mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
              <Text style={styles.noteText}>
                Chuyển khoản <Text style={{ fontWeight: 'bold' }}>đúng số tiền</Text> và ghi{' '}
                <Text style={{ fontWeight: 'bold' }}>đúng mã đơn {orderCode}</Text> vào nội dung.
                Hệ thống sẽ tự xác nhận trong vài giây.
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

            <Text style={styles.sectionTitle}>Bill dự phòng</Text>

            <TouchableOpacity
              style={[styles.uploadBox, billUploaded && styles.uploadBoxDone]}
              onPress={handleUploadBill}
              activeOpacity={0.7}
            >
              {billUploaded ? (
                <>
                  <View style={styles.uploadIconDone}>
                    <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                  </View>
                  <Text style={styles.uploadTitleDone}>Đã upload bill</Text>
                  <Text style={styles.uploadDesc}>Bấm để chọn ảnh khác</Text>
                </>
              ) : (
                <>
                  <View style={styles.uploadIcon}>
                    <Ionicons name="cloud-upload-outline" size={32} color="#2563EB" />
                  </View>
                  <Text style={styles.uploadTitle}>Upload bill (dự phòng)</Text>
                  <Text style={styles.uploadDesc}>
                    Nếu hệ thống không tự match được, admin sẽ duyệt từ bill này
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </>
        )}
      </ScrollView>

      {!expired && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.confirmText}>Tôi đã chuyển khoản</Text>
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
  expiredBox: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 20,
    padding: 40, marginTop: 20,
  },
  expiredTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginTop: 16 },
  expiredDesc: {
    fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24,
  },
  renewBtn: {
    backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12,
  },
  renewText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
  uploadBoxDone: { borderColor: '#10B981', borderStyle: 'solid', backgroundColor: '#F0FDF4' },
  uploadIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  uploadIconDone: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  uploadTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 4 },
  uploadTitleDone: { fontSize: 15, fontWeight: '600', color: '#10B981', marginBottom: 4 },
  uploadDesc: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
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
