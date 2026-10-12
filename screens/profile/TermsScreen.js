import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, COMPANY } from '../../lib/legal';


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
          <Text style={styles.headerDate}>Cập nhật lần cuối: {COMPANY.updatedAt}</Text>
        </View>

        <Text style={styles.intro}>
          Chào mừng bạn đến với EduTeach. Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng dịch vụ.
        </Text>

        <Text style={styles.blockTitle}>Chính sách quyền riêng tư</Text>
        {PRIVACY_POLICY.map((s, i) => (
          <View key={'pp-' + i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionContent}>{s.content}</Text>
          </View>
        ))}

        <Text style={styles.blockTitle}>Điều khoản sử dụng</Text>
        {TERMS_OF_SERVICE.map((s, i) => (
          <View key={'tos-' + i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionContent}>{s.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {'Mọi thắc mắc xin liên hệ ' + COMPANY.email}
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
  blockTitle: {
    fontSize: 16, fontWeight: '800', color: '#2563EB',
    marginBottom: 12, marginTop: 10, paddingHorizontal: 4,
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
