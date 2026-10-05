import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getTutorReviews, getRatingStats, maskName } from '../lib/reviews';
import { getMySlots, formatSlots } from '../lib/tutorSchedule';

export default function TutorDetailScreen({ user, tutor, onBack, onBook, onChat }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, total: 0, avg: 0 });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [filterStar, setFilterStar] = useState(0);
  const [slots, setSlots] = useState({});

  useEffect(() => {
    (async () => {
      const [data, slotData] = await Promise.all([
        getTutorReviews(tutor.id),
        getMySlots(tutor.id),
      ]);
      setReviews(data);
      setStats(getRatingStats(data));
      setSlots(slotData || {});
      setLoadingReviews(false);
    })();
  }, [tutor.id]);

  const filteredReviews = filterStar === 0
    ? reviews
    : reviews.filter(r => Math.round(r.rating) === filterStar);

  const displayRating = stats.total > 0 ? stats.avg.toFixed(1) : (tutor.rating || 0);
  const displayCount = stats.total > 0 ? stats.total : (tutor.reviews || 0);

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  };

  const StarRow = ({ value, size = 14 }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= value ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );

  const renderBar = (star) => {
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
  };

  const hasSlots = Object.keys(slots).length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết gia sư</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="heart-outline" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.profileBox}>
          <Image source={{ uri: tutor.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{tutor.name}</Text>
          <Text style={styles.subject}>{tutor.subject}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statTop}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.statValue}> {displayRating}</Text>
              </View>
              <Text style={styles.statLabel}>{displayCount} đánh giá</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{tutor.experience}</Text>
              <Text style={styles.statLabel}>Kinh nghiệm</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{(tutor.price / 1000).toFixed(0)}k</Text>
              <Text style={styles.statLabel}>Mỗi buổi</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giới thiệu</Text>
          <Text style={styles.sectionText}>
            {tutor.bio || `Gia sư nhiệt tình, có ${tutor.experience} kinh nghiệm giảng dạy môn ${tutor.subject}.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chuyên môn</Text>
          <View style={styles.tagsRow}>
            {['Luyện thi', 'Cơ bản', 'Nâng cao', 'Online'].map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch rảnh</Text>
          {hasSlots ? (
            <View style={styles.scheduleBox}>
              <Ionicons name="time-outline" size={18} color="#2563EB" />
              <Text style={styles.scheduleText}>{formatSlots(slots)}</Text>
            </View>
          ) : (
            <View style={styles.noSlotsBox}>
              <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
              <Text style={styles.noSlotsText}>Gia sư chưa cập nhật lịch rảnh</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đánh giá ({stats.total})</Text>

          {loadingReviews ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : stats.total === 0 ? (
            <View style={styles.emptyReviews}>
              <Ionicons name="chatbubble-outline" size={36} color="#D1D5DB" />
              <Text style={styles.emptyReviewText}>Chưa có đánh giá nào</Text>
            </View>
          ) : (
            <>
              <View style={styles.summaryBox}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.bigAvg}>{stats.avg.toFixed(1)}</Text>
                  <StarRow value={Math.round(stats.avg)} size={16} />
                  <Text style={styles.summaryCount}>{stats.total} đánh giá</Text>
                </View>
                <View style={styles.summaryRight}>
                  {[5, 4, 3, 2, 1].map(renderBar)}
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

              {filteredReviews.map(r => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
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
                    <View style={styles.reviewTagRow}>
                      <Ionicons name="book-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.reviewTagText}>{r.subject} · Buổi {r.session_number}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => onChat(tutor)} activeOpacity={0.8}>
          <Ionicons name="chatbubble-ellipses" size={22} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={() => onBook(tutor)}>
          <Text style={styles.bookBtnText}>Đăng ký học</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
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
  content: { paddingBottom: 20 },
  profileBox: {
    alignItems: 'center', backgroundColor: '#fff',
    paddingVertical: 28, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: '#E5E7EB' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  subject: { fontSize: 14, color: '#666', marginBottom: 20 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 20, width: '100%',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statTop: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  section: {
    backgroundColor: '#fff', marginTop: 12, paddingHorizontal: 20, paddingVertical: 18,
    marginHorizontal: 16, borderRadius: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 10 },
  sectionText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  scheduleBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  scheduleText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 22 },
  noSlotsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  noSlotsText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  emptyReviews: { alignItems: 'center', paddingVertical: 24 },
  emptyReviewText: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 8 },
  summaryBox: {
    flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 14,
    padding: 16, marginBottom: 12, gap: 16,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', width: 100 },
  bigAvg: { fontSize: 36, fontWeight: 'bold', color: '#F59E0B' },
  summaryCount: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  summaryRight: { flex: 1, justifyContent: 'center', gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 11, color: '#6B7280', width: 22 },
  barTrack: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  barCount: { fontSize: 11, color: '#9CA3AF', width: 24, textAlign: 'right' },
  filterChips: { gap: 8, paddingVertical: 4, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  chipTextActive: { color: '#2563EB' },
  reviewCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8 },
  reviewTop: { flexDirection: 'row', gap: 10 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#111' },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  reviewTime: { fontSize: 11, color: '#9CA3AF' },
  reviewComment: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginTop: 10, paddingLeft: 46 },
  reviewTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: 46 },
  reviewTagText: { fontSize: 11, color: '#9CA3AF' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  chatBtn: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12,
  },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
