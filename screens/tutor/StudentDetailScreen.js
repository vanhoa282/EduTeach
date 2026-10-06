import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getStudentReviews, getRatingStats, maskName } from '../../lib/reviews';

const STATUS_CFG = {
  pending_payment: { label: 'Chờ TT', color: '#F59E0B', bg: '#FFFBEB' },
  active: { label: 'Đang học', color: '#2563EB', bg: '#EFF6FF' },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#F0FDF4' },
  cancelled: { label: 'Đã huỷ', color: '#EF4444', bg: '#FEF2F2' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2' },
};

const SESSION_STATUS = {
  pending: { label: 'Chưa học', color: '#9CA3AF', bg: '#F3F4F6', icon: 'ellipse-outline' },
  confirmed: { label: 'Đã học', color: '#10B981', bg: '#F0FDF4', icon: 'checkmark-circle' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
  auto_passed: { label: 'Tự động', color: '#F59E0B', bg: '#FFFBEB', icon: 'time' },
  cancelled: { label: 'Đã huỷ', color: '#6B7280', bg: '#F3F4F6', icon: 'close-circle' },
};

export default function StudentDetailScreen({ user, student, onBack, onOpenChat, onReview }) {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, total: 0, avg: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id || !student?.id) return;

    const { data: cData } = await supabase
      .from('courses')
      .select('*')
      .eq('tutor_id', user.id)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    setCourses(cData || []);

    if (cData && cData.length > 0) {
      const courseIds = cData.map(c => c.id);
      const { data: sData } = await supabase
        .from('sessions')
        .select('*')
        .in('course_id', courseIds)
        .order('scheduled_at', { ascending: true });
      setSessions(sData || []);
    } else {
      setSessions([]);
    }

    // Lấy review về HS (từ GV khác)
    const r = await getStudentReviews(student.id);
    setReviews(r);
    setStats(getRatingStats(r));
    setLoading(false);
  };

  useEffect(() => { load(); }, [student?.id, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmedSessions = sessions.filter(s => s.status === 'confirmed');
  const totalEarned = confirmedSessions.reduce((sum, s) => sum + (s.tutor_payout || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  const StarRow = ({ value, size = 14 }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= value ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết học sinh</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => onReview && onReview(student)}>
          <Ionicons name="star-outline" size={20} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.profileCard}>
          <Image source={{ uri: student.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{student.name}</Text>
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={14} color="#6B7280" />
            <Text style={styles.phone}>{student.phone}</Text>
          </View>

          {stats.total > 0 && (
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{stats.avg.toFixed(1)}</Text>
              <Text style={styles.ratingSub}>({stats.total} đánh giá từ GV)</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => onOpenChat && onOpenChat(student)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
              <Text style={styles.chatBtnText}>Nhắn tin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => onReview && onReview(student)}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={18} color="#8B5CF6" />
              <Text style={styles.reviewBtnText}>Đánh giá</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Tổng buổi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{confirmedSessions.length}</Text>
            <Text style={styles.statLabel}>Đã dạy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#2563EB' }]}>
              {(totalEarned / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.statLabel}>Thu nhập</Text>
          </View>
        </View>

        {/* Reviews */}
        {stats.total > 0 && (
          <>
            <Text style={styles.sectionTitle}>Đánh giá từ GV khác ({stats.total})</Text>
            {reviews.slice(0, 5).map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {(r.tutor?.full_name || 'G').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{maskName(r.tutor?.full_name)}</Text>
                    <View style={styles.reviewMeta}>
                      <StarRow value={Math.round(r.rating)} size={12} />
                      <Text style={styles.reviewTime}>
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </View>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Khóa học ({courses.length})</Text>

        {courses.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="book-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Chưa có khóa học</Text>
          </View>
        )}

        {courses.map(c => {
          const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending_payment;
          const courseSessions = sessions.filter(s => s.course_id === c.id);
          const doneCount = courseSessions.filter(s => s.status === 'confirmed').length;
          return (
            <View key={c.id} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View style={styles.courseIconBox}>
                  <Ionicons name="book" size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseSubject}>{c.subject}</Text>
                  <Text style={styles.courseMeta}>
                    {doneCount}/{c.total_sessions} buổi · {c.schedule || 'Chưa có lịch'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.coursePriceRow}>
                <Text style={styles.coursePriceLabel}>Học phí</Text>
                <Text style={styles.coursePrice}>{c.total_price.toLocaleString('vi-VN')}đ</Text>
              </View>

              {courseSessions.length > 0 && (
                <View style={styles.sessionsList}>
                  <Text style={styles.sessionsListTitle}>Buổi học</Text>
                  {courseSessions.slice(0, 5).map(s => {
                    const scfg = SESSION_STATUS[s.status] || SESSION_STATUS.pending;
                    const dt = s.scheduled_at ? new Date(s.scheduled_at) : null;
                    const dateStr = dt
                      ? dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                      : '---';
                    return (
                      <View key={s.id} style={styles.sessionRow}>
                        <Text style={styles.sessionNum}>Buổi {s.session_number}</Text>
                        <Text style={styles.sessionDate}>{dateStr}</Text>
                        <View style={[styles.sessionStatus, { backgroundColor: scfg.bg }]}>
                          <Ionicons name={scfg.icon} size={11} color={scfg.color} />
                          <Text style={[styles.sessionStatusText, { color: scfg.color }]}>
                            {scfg.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  {courseSessions.length > 5 && (
                    <Text style={styles.moreText}>+{courseSessions.length - 5} buổi khác...</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

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
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  phone: { fontSize: 14, color: '#6B7280' },
  ratingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#FFFBEB', borderRadius: 20,
  },
  ratingText: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  ratingSub: { fontSize: 12, color: '#9CA3AF' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  chatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 12,
  },
  chatBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  reviewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F5F3FF', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#8B5CF6',
  },
  reviewBtnText: { color: '#8B5CF6', fontSize: 14, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#F3F4F6' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  reviewTop: { flexDirection: 'row', gap: 10 },
  reviewAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#111' },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  reviewTime: { fontSize: 11, color: '#9CA3AF' },
  reviewComment: {
    fontSize: 13, color: '#4B5563', lineHeight: 20,
    marginTop: 10, paddingLeft: 50,
  },
  courseCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  courseSubject: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  courseMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  coursePriceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  coursePriceLabel: { fontSize: 13, color: '#6B7280' },
  coursePrice: { fontSize: 15, fontWeight: 'bold', color: '#2563EB' },
  sessionsList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sessionsListTitle: { fontSize: 13, fontWeight: '600', color: '#111', marginBottom: 8 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6,
  },
  sessionNum: { fontSize: 13, color: '#374151', flex: 1 },
  sessionDate: { fontSize: 12, color: '#9CA3AF' },
  sessionStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  sessionStatusText: { fontSize: 10, fontWeight: '600' },
  moreText: { fontSize: 12, color: '#2563EB', marginTop: 6, fontWeight: '500' },
});
