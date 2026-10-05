import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetStats } from '../../lib/auth';

export default function DashboardScreen({ user, onBack }) {
  const [stats, setStats] = useState({ students: 0, tutors: 0, courses: 0, paidOrders: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const s = await adminGetStats();
    setStats(s);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Trang quản trị</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.name}>{user?.full_name || 'Admin'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#111" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Tổng quan</Text>

        <View style={styles.grid}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#2563EB' }]}>
              <Ionicons name="school" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats.students}</Text>
            <Text style={styles.statLabel}>Học sinh</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F5F3FF' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="briefcase" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats.tutors}</Text>
            <Text style={styles.statLabel}>Gia sư</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#10B981' }]}>
              <Ionicons name="book" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats.courses}</Text>
            <Text style={styles.statLabel}>Khóa học</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="card" size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stats.paidOrders}</Text>
            <Text style={styles.statLabel}>Đơn đã trả</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="people-outline" size={22} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Quản lý người dùng</Text>
            <Text style={styles.actionDesc}>Xem, đổi role, khoá tài khoản</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="card-outline" size={22} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Duyệt thanh toán</Text>
            <Text style={styles.actionDesc}>Xác nhận bill chuyển khoản</Text>
          </View>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>3</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="alert-circle-outline" size={22} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Khiếu nại</Text>
            <Text style={styles.actionDesc}>Xử lý tranh chấp học sinh</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>

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
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#7C3AED' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#7C3AED',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 6,
  },
  adminBadgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold', letterSpacing: 0.5 },
  greeting: { fontSize: 14, color: '#666' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111', marginTop: 2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '48%', borderRadius: 16, padding: 14 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  actionDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  badgeCount: {
    backgroundColor: '#EF4444', minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeCountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
