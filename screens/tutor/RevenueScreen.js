import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function RevenueScreen({ user, onBack }) {
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async () => {
    if (!user?.id) return;
    // Lấy transactions session_earning 6 tháng gần nhất
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('transactions')
      .select('amount, created_at, type')
      .eq('user_id', user.id)
      .eq('type', 'session_earning')
      .gte('created_at', sixMonthsAgo.toISOString());

    const buckets = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { total: 0, label: `T${d.getMonth() + 1}` };
    }

    let sum = 0;
    (data || []).forEach(tx => {
      const d = new Date(tx.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].total += tx.amount || 0;
      sum += tx.amount || 0;
    });

    setMonthly(Object.values(buckets));
    setTotal(sum);
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  const maxVal = Math.max(...monthly.map(m => m.total), 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Doanh thu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tổng thu nhập 6 tháng</Text>
          <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}đ</Text>
          <View style={styles.totalRow}>
            <Ionicons name="trending-up" size={16} color="#86EFAC" />
            <Text style={styles.totalSub}>Từ các buổi dạy đã xác nhận</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Biểu đồ 6 tháng</Text>
          <View style={styles.chartRow}>
            {monthly.map((m, i) => {
              const h = maxVal > 0 ? (m.total / maxVal) * 120 : 0;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>
                    {m.total > 0 ? `${(m.total / 1000).toFixed(0)}k` : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: Math.max(h, 4) }]} />
                  </View>
                  <Text style={styles.barLabel}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Chi tiết theo tháng</Text>
          {[...monthly].reverse().map((m, i) => (
            <View key={i} style={styles.listRow}>
              <View style={styles.monthBadge}>
                <Text style={styles.monthBadgeText}>{m.label}</Text>
              </View>
              <Text style={styles.monthTotal}>
                {m.total > 0 ? m.total.toLocaleString('vi-VN') + 'đ' : 'Chưa có'}
              </Text>
            </View>
          ))}
        </View>

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
  totalCard: {
    backgroundColor: '#10B981', borderRadius: 20, padding: 24, marginBottom: 16,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  totalLabel: { fontSize: 13, color: '#D1FAE5' },
  totalValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  totalSub: { fontSize: 12, color: '#D1FAE5' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  chartRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: 160,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: '600' },
  barTrack: {
    width: 24, height: 120, justifyContent: 'flex-end',
    backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: '#10B981', borderRadius: 6 },
  barLabel: { fontSize: 11, color: '#374151', marginTop: 6, fontWeight: '600' },
  listCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  listTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  monthBadge: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#EFF6FF', borderRadius: 20,
  },
  monthBadgeText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  monthTotal: { fontSize: 14, fontWeight: '600', color: '#111' },
});
