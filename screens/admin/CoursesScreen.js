import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetCourses } from '../../lib/auth';

const STATUS_CFG = {
  pending_payment: { label: 'Chờ thanh toán', color: '#F59E0B', bg: '#FFFBEB' },
  active: { label: 'Đang học', color: '#2563EB', bg: '#EFF6FF' },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#F0FDF4' },
  cancelled: { label: 'Đã huỷ', color: '#EF4444', bg: '#FEF2F2' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2' },
};

export default function CoursesScreen() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const res = await adminGetCourses();
    if (res.courses) setCourses(res.courses);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Khóa học</Text>
        <Text style={styles.subtitle}>{courses.length} khóa học</Text>

        {courses.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="book-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Chưa có khóa học</Text>
            <Text style={styles.emptyDesc}>Khi học sinh đăng ký, khóa sẽ hiện ở đây</Text>
          </View>
        )}

        {courses.map(c => {
          const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending_payment;
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subject}>{c.subject}</Text>
                  <Text style={styles.sessions}>{c.total_sessions} buổi</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Ionicons name="cash-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.rowText}>{c.total_price.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={styles.rowItem}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.rowText}>Đã trả: {c.paid_amount.toLocaleString('vi-VN')}đ</Text>
                </View>
              </View>

              <Text style={styles.metaText}>Tạo: {new Date(c.created_at).toLocaleDateString('vi-VN')}</Text>
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
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  subject: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  sessions: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowText: { fontSize: 12, color: '#6B7280' },
  metaText: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
});
