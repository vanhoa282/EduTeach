import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetStats } from '../../lib/auth';
import { adminGetRevenueStats } from '../../lib/adminSettings';

export default function DashboardScreen({ user, onBack, onOpenProfile, onOpenScreen }) {
  const [stats, setStats] = useState({ students: 0, tutors: 0, courses: 0, paidOrders: 0 });
  const [revenue, setRevenue] = useState({
    totalFee: 0, totalRevenue: 0,
    paidOrdersCount: 0, pendingOrdersCount: 0, disputesCount: 0,
    monthly: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [s, r] = await Promise.all([adminGetStats(), adminGetRevenueStats()]);
    setStats(s);
    setRevenue(r);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const maxFee = Math.max(...(revenue.monthly || []).map(m => m.fee), 1);

  const actions = [
    {
      key: 'commission',
      icon: 'cash-outline',
      color: '#10B981',
      bg: '#F0FDF4',
      title: 'Cấu hình hoa hồng',
      desc: 'Thay đổi % app giữ',
    },
    {
      key: 'settings',
      icon: 'settings-outline',
      color: '#8B5CF6',
      bg: '#F5F3FF',
      title: 'Cài đặt hệ thống',
      desc: 'Min/max rút, auto duyệt',
    },
    {
      key: 'disputes',
      icon: 'alert-circle-outline',
      color: '#EF4444',
      bg: '#FEF2F2',
      title: 'Khiếu nại',
      desc: 'Xử lý tranh chấp HS',
      badge: revenue.disputesCount,
    },
    {
      key: 'announcements',
      icon: 'megaphone-outline',
      color: '#EC4899',
      bg: '#FDF2F8',
      title: 'Thông báo',
      desc: 'Đăng tin hệ thống',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Trang quản trị</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onOpenProfile}>
          <Ionicons name="person" size={20} color="#7C3AED" />
        </TouchableOpacity>
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
        </View>

        {/* Doanh thu card */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <View>
              <Text style={styles.revenueLabel}>Doanh thu app 6 tháng</Text>
              <Text style={styles.revenueValue}>
                {revenue.totalFee.toLocaleString('vi-VN')}đ
              </Text>
            </View>
            <View style={styles.revenueIconBox}>
              <Ionicons name="trending-up" size={26} color="#fff" />
            </View>
          </View>

          <View style={styles.revenueDivider} />

          <View style={styles.revenueStats}>
            <View style={styles.revenueStatBox}>
              <Text style={styles.revenueStatValue}>
                {(revenue.totalRevenue / 1000000).toFixed(1)}M
              </Text>
              <Text style={styles.revenueStatLabel}>Tổng thu</Text>
            </View>
            <View style={styles.revenueStatDivider} />
            <View style={styles.revenueStatBox}>
              <Text style={styles.revenueStatValue}>{revenue.paidOrdersCount}</Text>
              <Text style={styles.revenueStatLabel}>Đơn đã trả</Text>
            </View>
            <View style={styles.revenueStatDivider} />
            <View style={styles.revenueStatBox}>
              <Text style={[styles.revenueStatValue, { color: '#FBBF24' }]}>
                {revenue.pendingOrdersCount}
              </Text>
              <Text style={styles.revenueStatLabel}>Chờ duyệt</Text>
            </View>
          </View>
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

        {/* Biểu đồ */}
        <Text style={styles.sectionTitle}>Biểu đồ doanh thu 6 tháng</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartRow}>
            {(revenue.monthly || []).map((m, i) => {
              const h = maxFee > 0 ? (m.fee / maxFee) * 100 : 0;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>
                    {m.fee > 0 ? `${(m.fee / 1000).toFixed(0)}k` : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: Math.max(h, 3) }]} />
                  </View>
                  <Text style={styles.barLabel}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>

        {actions.map(a => (
          <TouchableOpacity
            key={a.key}
            style={styles.actionCard}
            onPress={() => onOpenScreen && onOpenScreen(a.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon} size={22} color={a.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{a.title}</Text>
              <Text style={styles.actionDesc}>{a.desc}</Text>
            </View>
            {a.badge > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{a.badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#7C3AED',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 6,
  },
  adminBadgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold', letterSpacing: 0.5 },
  greeting: { fontSize: 14, color: '#666' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111', marginTop: 2 },
  revenueCard: {
    backgroundColor: '#7C3AED', borderRadius: 20, padding: 22, marginBottom: 24,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 12, color: '#DDD6FE' },
  revenueValue: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginTop: 6 },
  revenueIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  revenueDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 16,
  },
  revenueStats: { flexDirection: 'row' },
  revenueStatBox: { flex: 1, alignItems: 'center' },
  revenueStatValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  revenueStatLabel: { fontSize: 11, color: '#DDD6FE', marginTop: 2 },
  revenueStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '48%', borderRadius: 16, padding: 14 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  chartRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: 140,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, color: '#6B7280', marginBottom: 4, fontWeight: '600' },
  barTrack: {
    width: 22, height: 100, justifyContent: 'flex-end',
    backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: '#7C3AED', borderRadius: 6 },
  barLabel: { fontSize: 10, color: '#374151', marginTop: 6, fontWeight: '600' },
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
    marginRight: 6,
  },
  badgeCountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
