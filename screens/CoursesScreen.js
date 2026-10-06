import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CourseCardSkeleton } from '../components/Skeleton';

const STATUS_CFG = {
  pending_payment: { label: 'Chờ thanh toán', color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' },
  active: { label: 'Đang học', color: '#2563EB', bg: '#EFF6FF', icon: 'play-circle-outline' },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#F0FDF4', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Đã huỷ', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle-outline' },
};

export default function CoursesScreen({ user, onFindTutor, onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('courses')
      .select(`*, tutor:users!courses_tutor_id_fkey (id, full_name, phone)`)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setCourses(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Khóa học của tôi</Text>
          <Text style={styles.subtitle}>Đang tải...</Text>
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (courses.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Khóa học của tôi</Text>
          <Text style={styles.subtitle}>Các khóa học bạn đã đăng ký</Text>

          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="book-outline" size={48} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có khóa học</Text>
            <Text style={styles.emptyDesc}>Đăng ký khóa học đầu tiên để bắt đầu</Text>
            <TouchableOpacity style={styles.btn} onPress={onFindTutor}>
              <Ionicons name="search-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Tìm gia sư ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Khóa học của tôi</Text>
        <Text style={styles.subtitle}>{courses.length} khóa học đã đăng ký</Text>

        {courses.map(course => {
          const cfg = STATUS_CFG[course.status] || STATUS_CFG.pending_payment;
          const tutorName = course.tutor?.full_name || 'Gia sư';
          return (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => onSelectCourse(course.id)}
              activeOpacity={0.75}
            >
              <View style={styles.courseHeader}>
                <View style={styles.tutorAvatarMini}>
                  <Ionicons name="person" size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseTutorName}>{tutorName}</Text>
                  <Text style={styles.courseSubject}>{course.subject}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.courseDivider} />

              <View style={styles.courseInfoRow}>
                <View style={styles.courseInfoItem}>
                  <Ionicons name="book-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.courseInfoLabel}>{course.total_sessions} buổi</Text>
                </View>
                {course.schedule && (
                  <View style={styles.courseInfoItem}>
                    <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.courseInfoLabel}>{course.schedule}</Text>
                  </View>
                )}
              </View>

              <View style={styles.courseFooter}>
                <View>
                  <Text style={styles.coursePriceLabel}>Tổng tiền</Text>
                  <Text style={styles.coursePrice}>{course.total_price.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={styles.detailBtn}>
                  <Text style={styles.detailBtnText}>Chi tiết</Text>
                  <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                </View>
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
  scroll: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  courseCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tutorAvatarMini: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  courseTutorName: { fontSize: 16, fontWeight: '800', color: '#111' },
  courseSubject: { fontSize: 13, color: '#666', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  courseDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  courseInfoRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  courseInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  courseInfoLabel: { fontSize: 13, color: '#6B7280' },
  courseFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  coursePriceLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  coursePrice: { fontSize: 16, fontWeight: '800', color: '#2563EB', marginTop: 2 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
});
