import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SESSIONS = [
  { id: '1', studentName: 'Trần Minh Khang', subject: 'Toán 12', time: '18:00 - 20:00', date: 'Hôm nay', status: 'upcoming', avatar: 'https://i.pravatar.cc/150?img=68' },
  { id: '2', studentName: 'Lê Thu Hà', subject: 'Toán 11', time: '20:15 - 22:15', date: 'Hôm nay', status: 'upcoming', avatar: 'https://i.pravatar.cc/150?img=49' },
  { id: '3', studentName: 'Phạm Quốc Bảo', subject: 'Toán 12', time: '8:00 - 10:00', date: 'Ngày mai', status: 'scheduled', avatar: 'https://i.pravatar.cc/150?img=52' },
  { id: '4', studentName: 'Nguyễn Văn Nam', subject: 'Toán 10', time: '14:00 - 16:00', date: 'Hôm qua', status: 'done', avatar: 'https://i.pravatar.cc/150?img=33' },
];

const STATUS_CFG = {
  upcoming: { label: 'Sắp dạy', color: '#2563EB', bg: '#EFF6FF' },
  scheduled: { label: 'Đã lên lịch', color: '#8B5CF6', bg: '#F5F3FF' },
  done: { label: 'Đã dạy', color: '#10B981', bg: '#F0FDF4' },
};

export default function ScheduleScreen({ user }) {
  const stats = {
    today: SESSIONS.filter(s => s.date === 'Hôm nay').length,
    week: 12,
    earnings: 2400000,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.name}>{user?.full_name || 'Gia sư'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#111" />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar" size={20} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{stats.today}</Text>
            <Text style={styles.statLabel}>Buổi hôm nay</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="trending-up" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{stats.week}</Text>
            <Text style={styles.statLabel}>Buổi tuần này</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="cash" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{(stats.earnings / 1000).toFixed(0)}k</Text>
            <Text style={styles.statLabel}>Thu nhập</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Buổi học sắp tới</Text>

        {SESSIONS.map(session => {
          const cfg = STATUS_CFG[session.status];
          return (
            <TouchableOpacity key={session.id} style={styles.sessionCard} activeOpacity={0.7}>
              <Image source={{ uri: session.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionName}>{session.studentName}</Text>
                <Text style={styles.sessionSubject}>{session.subject}</Text>
                <View style={styles.sessionMeta}>
                  <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.sessionMetaText}>{session.time}</Text>
                  <Text style={styles.sessionDot}>·</Text>
                  <Text style={styles.sessionMetaText}>{session.date}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#666' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111', marginTop: 2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  badge: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#EF4444',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  sessionName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  sessionSubject: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  sessionMetaText: { fontSize: 12, color: '#9CA3AF' },
  sessionDot: { color: '#D1D5DB' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
