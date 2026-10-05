import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Thông báo</Text>
      <Text style={styles.subtitle}>Cập nhật mới nhất về khóa học</Text>

      <View style={styles.emptyBox}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="notifications-outline" size={48} color="#F59E0B" />
        </View>
        <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
        <Text style={styles.emptyDesc}>Khi có buổi học hoặc tin mới, bạn sẽ thấy ở đây</Text>
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
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#666', textAlign: 'center' },
});
