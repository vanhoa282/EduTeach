import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SECTIONS = [
  {
    title: '1. Điều khoản sử dụng',
    content: 'EduTeach là nền tảng kết nối học sinh với gia sư. Bằng việc sử dụng app, bạn đồng ý tuân thủ các quy định sau:\n\n• Không sử dụng để lừa đảo, quấy rối\n• Cung cấp thông tin chính xác\n• Tôn trọng gia sư và học sinh khác',
  },
  {
    title: '2. Chính sách thanh toán',
    content: 'Học sinh thanh toán trước 50% hoặc 100% học phí. Số tiền được giữ và giải ngân cho gia sư sau mỗi buổi học được xác nhận.\n\nHoa hồng nền tảng: 10% (có thể thay đổi, thông báo trước).',
  },
  {
    title: '3. Chính sách hoàn tiền',
    content: 'Khi có tranh chấp, admin xử lý như sau:\n\n• HS khiếu nại: Admin gọi xác minh\n• Hoàn tiền = 50% học phí - (số buổi đã dạy × giá buổi)\n• Thời gian xử lý: 3-7 ngày làm việc',
  },
  {
    title: '4. Quyền và nghĩa vụ gia sư',
    content: '• Dạy đúng giờ, đúng chất lượng\n• Không tự ý nghỉ buổi không báo\n• Nhận tiền sau khi HS xác nhận buổi\n• Tiền vào ví chờ 7 ngày trước khi rút được',
  },
  {
    title: '5. Bảo mật thông tin',
    content: 'EduTeach cam kết bảo mật thông tin cá nhân của người dùng. Chúng tôi không chia sẻ dữ liệu cho bên thứ 3 mà không có sự đồng ý.',
  },
  {
    title: '6. Xử lý vi phạm',
    content: 'Người dùng vi phạm có thể bị:\n\n• Cảnh cáo lần 1\n• Khoá tài khoản tạm thời\n• Khoá vĩnh viễn + báo cơ quan chức năng (nếu nghiêm trọng)',
  },
];

export default function TermsScreen({ onBack }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Điều khoản & Chính sách</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerBox}>
          <View style={styles.headerIconBox}>
            <Ionicons name="document-text" size={32} color="#6B7280" />
          </View>
          <Text style={styles.headerTitle}>Điều khoản & Chính sách</Text>
          <Text style={styles.headerDate}>Cập nhật lần cuối: 05/10/2026</Text>
        </View>

        <Text style={styles.intro}>
          Chào mừng bạn đến với EduTeach. Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng dịch vụ.
        </Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionContent}>{s.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Mọi thắc mắc xin liên hệ support@eduteach.vn
          </Text>
        </View>

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
  headerBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  headerIconBox: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  headerDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  intro: {
    fontSize: 14, color: '#4B5563', lineHeight: 22,
    marginBottom: 20, paddingHorizontal: 4,
  },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  sectionContent: { fontSize: 13, color: '#4B5563', lineHeight: 21 },
  footer: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, marginTop: 12,
  },
  footerText: { fontSize: 13, color: '#2563EB', textAlign: 'center', fontWeight: '500' },
});
