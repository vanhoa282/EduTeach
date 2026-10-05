import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const STUDENTS = [
  { id: '1', name: 'Trần Minh Khang', subject: 'Toán 12', sessionsLeft: 8, avatar: 'https://i.pravatar.cc/150?img=68', phone: '0901111111' },
  { id: '2', name: 'Lê Thu Hà', subject: 'Toán 11', sessionsLeft: 5, avatar: 'https://i.pravatar.cc/150?img=49', phone: '0902222222' },
  { id: '3', name: 'Phạm Quốc Bảo', subject: 'Toán 12', sessionsLeft: 10, avatar: 'https://i.pravatar.cc/150?img=52', phone: '0903333333' },
  { id: '4', name: 'Nguyễn Văn Nam', subject: 'Toán 10', sessionsLeft: 0, avatar: 'https://i.pravatar.cc/150?img=33', phone: '0904444444' },
];

export default function StudentsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Học sinh của tôi</Text>
        <Text style={styles.subtitle}>{STUDENTS.length} học sinh đang theo học</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm học sinh..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {STUDENTS.map(s => (
          <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.7}>
            <Image source={{ uri: s.avatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.subject}>{s.subject}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                <Text style={styles.metaText}>{s.phone}</Text>
              </View>
            </View>
            <View style={styles.rightBox}>
              <Text style={styles.sessionsNum}>{s.sessionsLeft}</Text>
              <Text style={styles.sessionsLabel}>buổi còn</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  subject: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: '#9CA3AF' },
  rightBox: { alignItems: 'flex-end' },
  sessionsNum: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  sessionsLabel: { fontSize: 11, color: '#9CA3AF' },
});
