import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:3000';

const BANK_INFO = {
  bankName: 'ACB - Ngân hàng Á Châu',
  accountNumber: '25317541',
  accountHolder: 'NGUYEN VAN HOA',
  branch: 'Chi nhánh TP.HCM',
};

const PAYMENT_TIMEOUT = 30 * 60;
const CHECK_TIMEOUT = 120; // 2 phút

export default function PaymentScreen({ tutor, booking, onBack, onSuccess }) {
  const [orderCode] = useState(() => 'EDT' + Math.floor(100000 + Math.random() * 900000));
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT);
  const [billUploaded, setBillUploaded] = useState(false);
  const [copied, setCopied] = useState(null);

  // State cho màn hình check
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState('idle'); // idle | checking | success | timeout
  const [checkLeft, setCheckLeft] = useState(CHECK_TIMEOUT);
  const pollRef = useRef(null);

  useEffect(() => {
    if (checking || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, checking]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

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

  const handleConfirm = async () => {
    if (!billUploaded) {
      Alert.alert('Chưa có bill', 'Vui lòng upload bill chuyển khoản trước');
      return;
    }

    setChecking(true);
    setCheckStatus('checking');
    setCheckLeft(CHECK_TIMEOUT);

    // Đăng ký order với backend
    try {
      await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode, amount: booking.payNow }),
      });
      console.log('📤 Order registered:', orderCode);
    } catch (e) {
      console.log('⚠️ Order create failed:', e.message);
    }

    // Poll backend mỗi 5 giây
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 5;
      setCheckLeft(Math.max(0, CHECK_TIMEOUT - elapsed));

      try {
        const res = await fetch(`${API_URL}/api/orders/${orderCode}`);
        const data = await res.json();
        console.log('🔍 Poll:', data.order?.status);

        if (data.order?.status === 'paid') {
          clearInterval(pollRef.current);
          setCheckStatus('success');
          setTimeout(() => onSuccess && onSuccess(), 2500);
          return;
        }
      } catch (e) {
        console.log('⚠️ Poll error:', e.message);
      }

      if (elapsed >= CHECK_TIMEOUT) {
        clearInterval(pollRef.current);
        setCheckStatus('timeout');
        setTimeout(() => onSuccess && onSuccess(), 3000);
      }
    }, 5000);
  };

  const handleRenew = () => {
    Alert.alert('Tạo đơn mới', 'Đơn cũ đã hết hạn. Tạo đơn mới?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đồng ý', onPress: onBack },
    ]);
  };

  // ============ MÀN HÌNH CHECK ============
  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.checkContainer}>
          {checkStatus === 'checking' && (
            <>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.checkTitle}>Đang kiểm tra giao dịch</Text>
              <Text style={styles.checkDesc}>
                Hệ thống đang đối soát với ngân hàng. Vui lòng đợi trong giây lát...
              </Text>
              <View style={styles.checkTimerBox}>
                <Ionicons name="time-outline" size={20} color="#2563EB" />
                <Text style={styles.checkTimerText}>{formatTime(checkLeft)}</Text>
              </View>
              <View style={styles.checkInfoBox}>
                <Text style={styles.checkInfoLabel}>Mã đơn</Text>
                <Text style={styles.checkInfoValue}>{orderCode}</Text>
              </View>
              <View style={styles.checkInfoBox}>
                <Text style={styles.checkInfoLabel}>Số tiền</Text>
                <Text style={styles.checkInfoValue}>{booking.payNow.toLocaleString('vi-VN')}đ</Text>
              </View>
            </>
          )}

          {checkStatus === 'success' && (
            <>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.checkTitle}>Thanh toán thành công!</Text>
              <Text style={styles.checkDesc}>
                Đã nhận được {booking.payNow.toLocaleString('vi-VN')}đ cho đơn {orderCode}
              </Text>
              <Text style={styles.checkDescSmall}>
                Đang kích hoạt khóa học...
              </Text>
              <ActivityIndicator color="#2563EB" style={{ marginTop: 16 }} />
            </>
          )}

          {checkStatus === 'timeout' && (
            <>
              <View style={styles.timeoutIcon}>
                <Ionicons name="hourglass-outline" size={64} color="#F59E0B" />
              </View>
              <Text style={styles.checkTitle}>Chờ admin xác nhận</Text>
              <Text style={styles.checkDesc}>
                Hệ thống chưa đối soát được giao dịch tự động. Bill bạn đã upload sẽ được admin
                duyệt thủ công trong vòng 24h.
              </Text>
              <View style={styles.noteBoxSmall}>
                <Ionicons name="information-circle-outline" size={18} color="#92400E" />
                <Text style={styles.noteTextSmall}>
                  Đơn {orderCode} đã được ghi nhận, bạn sẽ nhận thông báo khi admin xác nhận.
                </Text>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ============ MÀN HÌNH CHÍNH ============
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
            <Text style={styles.expiredDesc}>Vui lòng tạo đơn mới để tiếp tục</Text>
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
                    Nếu hệ thống không match được, admin duyệt từ bill này
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

  // Màn hình check
  checkContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  checkTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginTop: 24, textAlign: 'center' },
  checkDesc: {
    fontSize: 14, color: '#666', textAlign: 'center', marginTop: 12, lineHeight: 20,
  },
  checkDescSmall: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  checkTimerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12, marginTop: 24,
  },
  checkTimerText: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  checkInfoBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12, marginTop: 10,
  },
  checkInfoLabel: { fontSize: 13, color: '#9CA3AF' },
  checkInfoValue: { fontSize: 15, fontWeight: '600', color: '#111' },
  successIcon: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  timeoutIcon: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  noteBoxSmall: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB',
    borderRadius: 12, padding: 14, marginTop: 24,
    borderWidth: 1, borderColor: '#FEF3C7', alignItems: 'flex-start',
  },
  noteTextSmall: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
});
