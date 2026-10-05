import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CONTACTS = [
  { icon: 'call', label: 'Hotline', value: '1900 1234', color: '#2563EB', action: 'tel:19001234' },
  { icon: 'logo-whatsapp', label: 'Zalo', value: '0901 234 567', color: '#10B981', action: 'https://zalo.me/0901234567' },
  { icon: 'mail', label: 'Email', value: 'support@eduteach.vn', color: '#EF4444', action: 'mailto:support@eduteach.vn' },
  { icon: 'globe', label: 'Website', value: 'eduteach.vn', color: '#8B5CF6', action: 'https://eduteach.vn' },
];

const FAQS = [
  { q: 'Làm sao để đăng ký khóa học?', a: 'Vào Trang chủ, chọn gia sư, bấm "Đăng ký học", chọn số buổi và thanh toán.' },
  { q: 'Thanh toán như thế nào?', a: 'Chuyển khoản ACB theo mã đơn EDTxxxxxx, sau đó upload bill để admin duyệt.' },
  { q: 'Khi nào được hoàn tiền?', a: 'Hoàn tiền khi admin xác nhận có tranh chấp. Số tiền = 50% - (số buổi đã dạy × giá buổi).' },
  { q: 'Gia sư không dạy được thì sao?', a: 'Nhấn "Khiếu nại" trên buổi học đó. Admin sẽ xử lý trong 24h.' },
];

export default function SupportScreen({ onBack }) {
  const handleContact = (c) => {
    Linking.openURL(c.action).catch(() => Alert.alert('Lỗi', 'Không mở được'));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Hỗ trợ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Liên hệ với chúng tôi</Text>

        {CONTACTS.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={styles.contactCard}
            onPress={() => handleContact(c)}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIconBox, { backgroundColor: c.color + '15' }]}>
              <Ionicons name={c.icon} size={22} color={c.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>{c.label}</Text>
              <Text style={styles.contactValue}>{c.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Câu hỏi thường gặp</Text>

        {FAQS.map((f, i) => (
          <View key={i} style={styles.faqCard}>
            <View style={styles.faqHeader}>
              <View style={styles.faqNumber}>
                <Text style={styles.faqNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.faqQ}>{f.q}</Text>
            </View>
            <Text style={styles.faqA}>{f.a}</Text>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
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
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  contactIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  contactLabel: { fontSize: 12, color: '#9CA3AF' },
  contactValue: { fontSize: 15, fontWeight: '600', color: '#111', marginTop: 2 },
  faqCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  faqNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  faqNumberText: { fontSize: 12, color: '#2563EB', fontWeight: 'bold' },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111', lineHeight: 20 },
  faqA: { fontSize: 13, color: '#6B7280', lineHeight: 19, paddingLeft: 34 },
});
