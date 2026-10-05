import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_CONFIG = {
  pending: { label: 'Chờ xác nhận', color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' },
  active: { label: 'Đang học', color: '#2563EB', bg: '#EFF6FF', icon: 'play-circle-outline' },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#F0FDF4', icon: 'checkmark-circle-outline' },
};

export default function CoursesScreen({ courses, onFindTutor }) {
  if (!courses || courses.length === 0) {
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
          <TouchableOpacity style={styles.btn} onPress={onFindTutor}>
            <Ionicons name="search-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Tìm gia sư ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Khóa học của tôi</Text>
      <Text style={styles.subtitle}>{courses.length} khóa học đã đăng ký</Text>

      {courses.map(course => {
        const cfg = STATUS_CONFIG[course.status];
        return (
          <TouchableOpacity key={course.id} style={styles.courseCard} activeOpacity={0.7}>
            <View style={styles.courseHeader}>
              <View style={styles.tutorAvatarMini}>
                <Ionicons name="person" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseTutorName}>{course.tutorName}</Text>
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
                <Text style={styles.courseInfoLabel}>{course.totalSessions} buổi</Text>
              </View>
              <View style={styles.courseInfoItem}>
                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                <Text style={styles.courseInfoLabel}>{course.schedule}</Text>
              </View>
            </View>

            {course.status === 'active' && (
              <View style={styles.progressBox}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Tiến độ</Text>
                  <Text style={styles.progressValue}>
                    {course.completedSessions}/{course.totalSessions} buổi
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(course.completedSessions / course.totalSessions) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            <View style={styles.courseFooter}>
              <View>
                <Text style={styles.coursePriceLabel}>Tổng tiền</Text>
                <Text style={styles.coursePrice}>{course.total.toLocaleString('vi-VN')}đ</Text>
              </View>
              <TouchableOpacity style={styles.detailBtn}>
                <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                <Ionicons name="chevron-forward" size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 20 }} />
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
  courseCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tutorAvatarMini: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  courseTutorName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  courseSubject: { fontSize: 13, color: '#666', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  courseDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  courseInfoRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  courseInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  courseInfoLabel: { fontSize: 13, color: '#6B7280' },
  progressBox: { marginBottom: 14 },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  progressLabel: { fontSize: 12, color: '#9CA3AF' },
  progressValue: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  progressBar: {
    height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 3 },
  courseFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  coursePriceLabel: { fontSize: 11, color: '#9CA3AF' },
  coursePrice: { fontSize: 15, fontWeight: 'bold', color: '#2563EB', marginTop: 2 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
});
