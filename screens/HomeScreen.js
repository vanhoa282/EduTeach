import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getTutors } from '../lib/auth';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { TutorCardSkeleton } from '../components/Skeleton';
import { FadeInView } from '../components/Animated';

const categories = [
  { id: 'all', name: 'Tất cả', icon: 'apps-outline', color: '#6B7280', bg: '#F3F4F6' },
  { id: 'Toán', name: 'Toán', icon: 'calculator-outline', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'Văn', name: 'Văn', icon: 'book-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'Anh', name: 'Anh', icon: 'language-outline', color: '#EF4444', bg: '#FEF2F2' },
  { id: 'Lý', name: 'Lý', icon: 'nuclear-outline', color: '#06B6D4', bg: '#ECFEFF' },
  { id: 'Hóa', name: 'Hóa', icon: 'flask-outline', color: '#10B981', bg: '#ECFDF5' },
  { id: 'Tin', name: 'Tin', icon: 'laptop-outline', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'Sinh', name: 'Sinh', icon: 'leaf-outline', color: '#22C55E', bg: '#F0FDF4' },
];

export default function HomeScreen({ user, onSelectTutor, onOpenAllTutors }) {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  const load = async () => {
    const data = await getTutors();
    setTutors(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredTutors = tutors.filter(t => {
    if (activeCat !== 'all') {
      const inCat = (t.subject || '').toLowerCase().includes(activeCat.toLowerCase());
      if (!inCat) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSeeAll = () => {
    if (onOpenAllTutors) onOpenAllTutors({ category: activeCat, search });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.username}>{user?.full_name || user?.phone || 'bạn'}</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSeeAll}>
            <Ionicons name="search" size={22} color="#111" />
          </TouchableOpacity>
        </View>

        <AnnouncementBanner user={user} />

        <Text style={styles.hero}>Tìm gia sư phù hợp{'\n'}cho con bạn</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm môn, lớp, gia sư..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSeeAll}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSeeAll}>
            <Ionicons name="options-outline" size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <TouchableOpacity onPress={() => setActiveCat('all')}>
            <Text style={styles.sectionMore}>Bỏ lọc</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {categories.map(cat => {
            const active = cat.id === activeCat;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => setActiveCat(cat.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categoryIconBox,
                    { backgroundColor: cat.bg },
                    active && { borderWidth: 2, borderColor: cat.color },
                  ]}
                >
                  <Ionicons name={cat.icon} size={26} color={cat.color} />
                </View>
                <Text style={[styles.categoryName, active && { color: cat.color, fontWeight: '700' }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeCat === 'all' ? 'Gia sư nổi bật' : `Gia sư ${activeCat}`}
          </Text>
          <TouchableOpacity onPress={handleSeeAll}>
            <Text style={styles.sectionMore}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <>
            <TutorCardSkeleton />
            <TutorCardSkeleton />
            <TutorCardSkeleton />
          </>
        ) : filteredTutors.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Không tìm thấy gia sư</Text>
            <Text style={styles.emptyDesc}>
              {activeCat !== 'all'
                ? `Chưa có gia sư dạy môn ${activeCat}`
                : 'Thử tìm với từ khoá khác'}
            </Text>
          </View>
        ) : (
          filteredTutors.slice(0, 5).map((tutor, index) => (
            <FadeInView key={tutor.id} delay={index * 80}>
            <TouchableOpacity
              style={styles.tutorCard}
              activeOpacity={0.75}
              onPress={() => onSelectTutor(tutor)}
            >
              <Image source={{ uri: tutor.avatar }} style={styles.tutorAvatar} />
              <View style={styles.tutorInfo}>
                <Text style={styles.tutorName} numberOfLines={1}>{tutor.name}</Text>
                <Text style={styles.tutorSubject} numberOfLines={1}>
                  {tutor.subject} · {tutor.experience}
                </Text>
                <View style={styles.tutorMeta}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.tutorRating}> {tutor.rating}</Text>
                  <Text style={styles.tutorReviews}>({tutor.reviews} đánh giá)</Text>
                </View>
              </View>
              <View style={styles.tutorPriceBox}>
                <Text style={styles.tutorPrice}>{(tutor.price / 1000).toFixed(0)}k</Text>
                <Text style={styles.tutorPriceUnit}>/buổi</Text>
              </View>
            </TouchableOpacity>
            </FadeInView>
          ))
        )}

        {filteredTutors.length > 5 && (
          <TouchableOpacity style={styles.seeMoreBtn} onPress={handleSeeAll}>
            <Text style={styles.seeMoreText}>Xem thêm {filteredTutors.length - 5} gia sư</Text>
            <Ionicons name="arrow-forward" size={16} color="#2563EB" />
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  username: { fontSize: 20, fontWeight: '800', color: '#111', marginTop: 4, letterSpacing: -0.3 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  hero: { fontSize: 28, fontWeight: '800', color: '#111', lineHeight: 36, marginBottom: 22, letterSpacing: -0.5 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 26,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#111', letterSpacing: -0.2 },
  sectionMore: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
  categoriesContent: { paddingRight: 20, marginBottom: 26 },
  categoryCard: { alignItems: 'center', marginRight: 14, width: 68 },
  categoryIconBox: {
    width: 62, height: 62, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  categoryName: { fontSize: 12, color: '#374151', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  tutorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  tutorAvatar: { width: 62, height: 62, borderRadius: 31, marginRight: 14, backgroundColor: '#E5E7EB' },
  tutorInfo: { flex: 1 },
  tutorName: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 4, letterSpacing: -0.2 },
  tutorSubject: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  tutorMeta: { flexDirection: 'row', alignItems: 'center' },
  tutorRating: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },
  tutorReviews: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
  tutorPriceBox: { alignItems: 'flex-end' },
  tutorPrice: { fontSize: 19, fontWeight: '800', color: '#2563EB', letterSpacing: -0.3 },
  tutorPriceUnit: { fontSize: 11, color: '#9CA3AF' },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 16, backgroundColor: '#EFF6FF', borderRadius: 14, marginTop: 4,
  },
  seeMoreText: { fontSize: 14, color: '#2563EB', fontWeight: '700' },
});
