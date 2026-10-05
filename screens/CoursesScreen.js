import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CoursesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Khóa học của tôi</Text>
      <Text style={styles.subtitle}>Các khóa học bạn đã đăng ký</Text>

      <View style={styles.emptyBox}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="book-outline" size={48} color="#2563EB" />
        </View>
        <Text style={styles.emptyTitle}>Chưa có khóa học</Text>
        <Text style={styles.emptyDesc}>Đăng ký khóa học đầu tiên để bắt đầu</Text>
        <TouchableOpacity style={styles.btn}>
          <Ionicons name="search-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>Tìm gia sư ngay</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
