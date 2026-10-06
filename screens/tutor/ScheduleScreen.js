import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import { SessionCardSkeleton } from '../../components/Skeleton';

const STATUS_CFG = {
  pending: { label: 'Sắp dạy', color: '#2563EB', bg: '#EFF6FF' },
  confirmed: { label: 'Đã dạy', color: '#10B981', bg: '#F0FDF4' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2' },
  auto_passed: { label: 'Tự động', color: '#F59E0B', bg: '#FFFBEB' },
  cancelled: { label: 'Đã huỷ', color: '#6B7280', bg: '#F3F4F6' },
};

const FILTERS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: 'Tuần này' },
  { key: 'all', label: 'Tất cả' },
  { key: 'done', label: 'Đã dạy' },
];

export default function ScheduleScreen({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('today');

  const load = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        course:courses (
          id, subject, total_sessions, student_id,
          student:users!courses_student_id_fkey (full_name, phone)
        )
      `)
      .eq('course.tutor_id', user.id)
      .order('scheduled_at', { ascending: true });

    if (!error && data) setSessions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const filtered = sessions.filter(s => {
    if (filter === 'done') return s.status === 'confirmed';
    if (!s.scheduled_at) return false;
    const d = new Date(s.scheduled_at);
    if (filter === 'today') return d.toDateString() === now.toDateString();
    if (filter === 'week') return d >= startOfWeek && d < endOfWeek;
    return true;
  });

  const todayCount = sessions.filter(s => {
    if (!s.scheduled_at) return false;
    return new Date(s.scheduled_at).toDateString() === now.toDateString();
  }).length;

  const weekCount = sessions.filter(s => {
    if (!s.scheduled_at) return false;
    const d = new Date(s.scheduled_at);
    return d >= startOfWeek && d < endOfWeek;
  }).length;

  const totalEarned = sessions
    .filter(s => s.status === 'confirmed')
    .reduce((sum, s) => sum + (s.tutor_payout || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.name}>{user?.full_name || 'Gia sư'}</Text>
          </View>
        </View>

        <AnnouncementBanner />

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar" size={20} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{todayCount}</Text>
            <Text style={styles.statLabel}>Hôm nay</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{weekCount}</Text>
            <Text style={styles.statLabel}>Tuần này</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="cash" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{(totalEarned / 1000).toFixed(0)}k</Text>
            <Text style={styles.statLabel}>Thu nhập</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          {filter === 'today' ? 'Buổi học hôm nay' :
           filter === 'week' ? 'Buổi học tuần này' :
           filter === 'done' ? 'Buổi đã dạy' : 'Tất cả buổi học'}
        </Text>

        {loading ? (
          <>
            <SessionCardSkeleton />
            <SessionCardSkeleton />
            <SessionCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {filter === 'today' ? 'Hôm nay không có buổi dạy' :
               filter === 'week' ? 'Tuần này chưa có buổi' :
               filter === 'done' ? 'Chưa có buổi nào đã dạy' :
               'Chưa có buổi dạy nào'}
            </Text>
          </View>
        ) : (
          filtered.slice(0, 30).map(s => {
            const cfg = STATUS_CFG[s.status] || STATUS_CFG.pending;
            const studentName = s.course?.student?.full_name || 'Học sinh';
            const subject = s.course?.subject || 'Môn';
            const dt = s.scheduled_at ? new Date(s.scheduled_at) : null;
            const timeStr = dt
              ? `${dt.getHours().toString().padStart(2, '0')}:00 - ${(dt.getHours() + 2).toString().padStart(2, '0')}:00`
              : '---';
            const dateStr = dt
              ? dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
              : '---';

            return (
              <View key={s.id} style={styles.sessionCard}>
                <View style={styles.sessionNumber}>
                  <Text style={styles.sessionNumberText}>{s.session_number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionName}>{studentName}</Text>
                  <Text style={styles.sessionSubject}>{subject}</Text>
                  <View style={styles.sessionMeta}>
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.sessionMetaText}>{timeStr}</Text>
                    <Text style={styles.sessionDot}>·</Text>
                    <Text style={styles.sessionMetaText}>{dateStr}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '800', color: '#111', marginTop: 4, letterSpacing: -0.3 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  statIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  filterRow: { gap: 8, paddingBottom: 14 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 14 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, color: '#9CA3AF', marginTop: 12, textAlign: 'center' },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  sessionNumber: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionNumberText: { fontSize: 18, fontWeight: '800', color: '#2563EB' },
  sessionName: { fontSize: 15, fontWeight: '700', color: '#111' },
  sessionSubject: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  sessionMetaText: { fontSize: 12, color: '#9CA3AF' },
  sessionDot: { color: '#D1D5DB' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
