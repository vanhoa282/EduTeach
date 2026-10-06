import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getMyFavorites, toggleFavorite } from '../lib/favorites';

export default function WishlistScreen({ user, onBack, onSelectTutor }) {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    const data = await getMyFavorites(user.id);
    setTutors(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemove = (tutor) => {
    Alert.alert(
      'Bỏ yêu thích',
      `Bỏ ${tutor.name} khỏi danh sách yêu thích?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Bỏ', style: 'destructive',
          onPress: async () => {
            const res = await toggleFavorite(user.id, tutor.id);
            if (res.error) return Alert.alert('Lỗi', res.error);
            load();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Gia sư yêu thích</Text>
          <View style={{ width: 40 }} />
        </View>
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
        <Text style={styles.topBarTitle}>Gia sư yêu thích</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Danh sách yêu thích</Text>
        <Text style={styles.subtitle}>{tutors.length} gia sư đã lưu</Text>

        {tutors.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="heart-outline" size={48} color="#EC4899" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có gia sư yêu thích</Text>
            <Text style={styles.emptyDesc}>
              Bấm icon trái tim ở trang chi tiết gia sư để lưu vào đây
            </Text>
          </View>
        ) : (
          tutors.map(t => (
            <View key={t.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardTop}
                onPress={() => onSelectTutor && onSelectTutor(t)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: t.avatar }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.subject}>{t.subject} · {t.experience}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.rating}> {t.rating}</Text>
                    <Text style={styles.reviews}>({t.reviews} đánh giá)</Text>
                  </View>
                </View>
                <View style={styles.priceBox}>
                  <Text style={styles.price}>{(t.price / 1000).toFixed(0)}k</Text>
                  <Text style={styles.priceUnit}>/buổi</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(t)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="heart-dislike-outline" size={18} color="#EF4444" />
                  <Text style={styles.removeText}>Bỏ yêu thích</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => onSelectTutor && onSelectTutor(t)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailText}>Xem chi tiết</Text>
                  <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>
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
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FDF2F8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptyDesc: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 30, lineHeight: 19,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E5E7EB' },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 2 },
  subject: { fontSize: 13, color: '#666', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  rating: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  reviews: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  priceUnit: { fontSize: 11, color: '#9CA3AF' },
  actionsRow: {
    flexDirection: 'row', gap: 8, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  removeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FEF2F2', paddingVertical: 10, borderRadius: 10,
  },
  removeText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  detailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 10,
  },
  detailText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
});
