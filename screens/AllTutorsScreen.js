import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getTutors } from '../lib/auth';

const categories = [
  { id: 'all', name: 'Tất cả' },
  { id: 'Toán', name: 'Toán' },
  { id: 'Văn', name: 'Văn' },
  { id: 'Anh', name: 'Anh' },
  { id: 'Lý', name: 'Lý' },
  { id: 'Hóa', name: 'Hóa' },
  { id: 'Tin', name: 'Tin' },
  { id: 'Sinh', name: 'Sinh' },
];

const SORTS = [
  { key: 'rating', label: 'Đánh giá cao', icon: 'star' },
  { key: 'price_asc', label: 'Giá thấp → cao', icon: 'arrow-up' },
  { key: 'price_desc', label: 'Giá cao → thấp', icon: 'arrow-down' },
  { key: 'reviews', label: 'Nhiều đánh giá', icon: 'chatbubbles' },
];

export default function AllTutorsScreen({ user, onBack, onSelectTutor, initialCategory, initialSearch }) {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState(initialSearch || '');
  const [activeCat, setActiveCat] = useState(initialCategory || 'all');
  const [sort, setSort] = useState('rating');
  const [showSort, setShowSort] = useState(false);

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

  // Filter + Sort
  let filtered = tutors.filter(t => {
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

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'rating') return b.rating - a.rating;
    if (sort === 'reviews') return b.reviews - a.reviews;
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    return 0;
  });

  const currentSort = SORTS.find(s => s.key === sort);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tất cả gia sư</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, môn học..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catFilters}>
          {categories.map(cat => {
            const active = cat.id === activeCat;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catPill, active && styles.catPillActive]}
                onPress={() => setActiveCat(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catPillText, active && styles.catPillTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name={currentSort?.icon || 'funnel'} size={16} color="#2563EB" />
          <Text style={styles.sortBtnText}>Sắp xếp</Text>
        </TouchableOpacity>
      </View>

      {showSort && (
        <View style={styles.sortPanel}>
          {SORTS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortItem, sort === s.key && styles.sortItemActive]}
              onPress={() => { setSort(s.key); setShowSort(false); }}
            >
              <Ionicons name={s.icon} size={18} color={sort === s.key ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.sortItemText, sort === s.key && styles.sortItemTextActive]}>
                {s.label}
              </Text>
              {sort === s.key && <Ionicons name="checkmark" size={18} color="#2563EB" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.resultBar}>
        <Text style={styles.resultText}>
          <Text style={{ fontWeight: 'bold', color: '#111' }}>{filtered.length}</Text> gia sư
          {activeCat !== 'all' && ` · môn ${activeCat}`}
        </Text>
        {(activeCat !== 'all' || search) && (
          <TouchableOpacity onPress={() => { setActiveCat('all'); setSearch(''); }}>
            <Text style={styles.clearText}>Xoá lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Không tìm thấy gia sư</Text>
            <Text style={styles.emptyDesc}>Thử tìm với từ khoá khác</Text>
          </View>
        ) : (
          filtered.map(tutor => (
            <TouchableOpacity
              key={tutor.id}
              style={styles.tutorCard}
              activeOpacity={0.7}
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
                  <Text style={styles.tutorReviews}>({tutor.reviews})</Text>
                </View>
              </View>
              <View style={styles.tutorPriceBox}>
                <Text style={styles.tutorPrice}>{(tutor.price / 1000).toFixed(0)}k</Text>
                <Text style={styles.tutorPriceUnit}>/buổi</Text>
              </View>
            </TouchableOpacity>
          ))
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
  searchWrap: { paddingHorizontal: 20, paddingTop: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  catFilters: { gap: 8, paddingRight: 10 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  catPillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  catPillText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  catPillTextActive: { color: '#fff', fontWeight: '600' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  sortBtnText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  sortPanel: {
    backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12,
    padding: 8, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  sortItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8,
  },
  sortItemActive: { backgroundColor: '#EFF6FF' },
  sortItemText: { flex: 1, fontSize: 14, color: '#374151' },
  sortItemTextActive: { color: '#2563EB', fontWeight: '600' },
  resultBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  resultText: { fontSize: 13, color: '#6B7280' },
  clearText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  tutorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tutorAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12, backgroundColor: '#E5E7EB' },
  tutorInfo: { flex: 1 },
  tutorName: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 2 },
  tutorSubject: { fontSize: 13, color: '#666', marginBottom: 4 },
  tutorMeta: { flexDirection: 'row', alignItems: 'center' },
  tutorRating: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  tutorReviews: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
  tutorPriceBox: { alignItems: 'flex-end' },
  tutorPrice: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  tutorPriceUnit: { fontSize: 11, color: '#9CA3AF' },
});
