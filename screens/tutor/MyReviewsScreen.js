import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getTutorReviews, getRatingStats, maskName } from '../../lib/reviews';

export default function MyReviewsScreen({ user, onBack }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, total: 0, avg: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStar, setFilterStar] = useState(0);

  const load = async () => {
    const data = await getTutorReviews(user.id);
    setReviews(data);
    setStats(getRatingStats(data));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = filterStar === 0
    ? reviews
    : reviews.filter(r => Math.round(r.rating) === filterStar);

  const StarRow = ({ value, size = 14 }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= value ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#EC4899" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Đánh giá của học sinh</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {stats.total === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="star-outline" size={48} color="#EC4899" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có đánh giá</Text>
            <Text style={styles.emptyDesc}>Học sinh sẽ đánh giá sau mỗi buổi học</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <Text style={styles.bigAvg}>{stats.avg.toFixed(1)}</Text>
                <StarRow value={Math.round(stats.avg)} size={16} />
                <Text style={styles.summaryCount}>{stats.total} đánh giá</Text>
              </View>
              <View style={styles.summaryRight}>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats[star] || 0;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <View key={star} style={styles.barRow}>
                      <Text style={styles.barLabel}>{star} ★</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              <TouchableOpacity
                style={[styles.chip, filterStar === 0 && styles.chipActive]}
                onPress={() => setFilterStar(0)}
              >
                <Text style={[styles.chipText, filterStar === 0 && styles.chipTextActive]}>
                  Tất cả ({stats.total})
                </Text>
              </TouchableOpacity>
              {[5, 4, 3, 2, 1].map(s => {
                const c = stats[s] || 0;
                if (c === 0) return null;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, filterStar === s && styles.chipActive]}
                    onPress={() => setFilterStar(s)}
                  >
                    <Text style={[styles.chipText, filterStar === s && styles.chipTextActive]}>
                      {s} ★ ({c})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filtered.map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(r.student?.full_name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{maskName(r.student?.full_name)}</Text>
                    <View style={styles.reviewMeta}>
                      <StarRow value={Math.round(r.rating)} size={12} />
                      <Text style={styles.reviewTime}>{formatDate(r.created_at)}</Text>
                    </View>
                  </View>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                {r.subject && (
                  <View style={styles.reviewTag}>
                    <Ionicons name="book-outline" size={11} color="#9CA3AF" />
                    <Text style={styles.reviewTagText}>
                      {r.subject} · Buổi {r.session_number}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

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
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FDF2F8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  summaryCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 18, marginBottom: 16, gap: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', width: 100 },
  bigAvg: { fontSize: 42, fontWeight: 'bold', color: '#F59E0B' },
  summaryCount: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  summaryRight: { flex: 1, justifyContent: 'center', gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 11, color: '#6B7280', width: 22 },
  barTrack: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  barCount: { fontSize: 11, color: '#9CA3AF', width: 24, textAlign: 'right' },
  filterChips: { gap: 8, paddingVertical: 4, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#FDF2F8', borderColor: '#EC4899' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  chipTextActive: { color: '#EC4899' },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  reviewTop: { flexDirection: 'row', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#EC4899',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#111' },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  reviewTime: { fontSize: 11, color: '#9CA3AF' },
  reviewComment: {
    fontSize: 13, color: '#4B5563', lineHeight: 20,
    marginTop: 10, paddingLeft: 50,
  },
  reviewTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, paddingLeft: 50,
  },
  reviewTagText: { fontSize: 11, color: '#9CA3AF' },
});
