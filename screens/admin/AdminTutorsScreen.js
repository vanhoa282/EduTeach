import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { adminSetStatus, adminResetPassword } from '../../lib/adminTutor';

export default function AdminTutorsScreen({ onOpenCreate }) {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('users')
      .select(`
        id, phone, full_name, avatar_url, status, is_available, created_at,
        tutor_profiles (subjects, price_per_session, rating_avg, rating_count, experience_years, verify_status)
      `)
      .eq('role', 'tutor')
      .order('created_at', { ascending: false });

    const enriched = (data || []).map(u => {
      const p = Array.isArray(u.tutor_profiles) ? u.tutor_profiles[0] : u.tutor_profiles;
      const prof = p || {};
      return {
        id: u.id,
        name: u.full_name || 'Chưa có tên',
        phone: u.phone,
        avatar: u.avatar_url || `https://i.pravatar.cc/150?u=${u.id}`,
        status: u.status,
        isAvailable: u.is_available !== false,
        subjects: prof.subjects || [],
        price: prof.price_per_session || 0,
        rating: parseFloat(prof.rating_avg) || 0,
        reviews: prof.rating_count || 0,
        experience: prof.experience_years || 0,
        verifyStatus: prof.verify_status || 'pending',
        createdAt: u.created_at,
      };
    });

    setTutors(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleToggleBan = (tutor) => {
    const newStatus = tutor.status === 'banned' ? 'active' : 'banned';
    Alert.alert(
      newStatus === 'banned' ? 'Khoá tài khoản' : 'Mở khoá',
      `${newStatus === 'banned' ? 'Khoá' : 'Mở khoá'} ${tutor.name}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'OK', style: newStatus === 'banned' ? 'destructive' : 'default',
          onPress: async () => {
            const res = await adminSetStatus(tutor.id, newStatus);
            if (res.error) return Alert.alert('Lỗi', res.error);
            load();
          },
        },
      ]
    );
  };

  const handleResetPassword = (tutor) => {
    Alert.alert(
      'Reset mật khẩu',
      `Đặt mật khẩu mới cho ${tutor.name}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Random',
          onPress: async () => {
            const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
            let p = '';
            for (let i = 0; i < 8; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
            const res = await adminResetPassword(tutor.id, p);
            if (res.error) return Alert.alert('Lỗi', res.error);
            Alert.alert('Mật khẩu mới', `SĐT: ${tutor.phone}\nMật khẩu: ${p}\n\nGửi cho gia sư ngay.`);
          },
        },
      ]
    );
  };

  const filtered = tutors.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.phone || '').includes(q) ||
      t.subjects.some(s => s.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = tutors.filter(t => t.status === 'active').length;
  const bannedCount = tutors.filter(t => t.status === 'banned').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Gia sư</Text>
            <Text style={styles.subtitle}>
              {tutors.length} tổng · {activeCount} active · {bannedCount} khoá
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={onOpenCreate}>
            <Ionicons name="person-add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, SĐT, môn..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {tutors.length === 0 ? 'Chưa có gia sư' : 'Không tìm thấy'}
            </Text>
            <Text style={styles.emptyDesc}>
              {tutors.length === 0 ? 'Bấm nút + để tạo tài khoản gia sư đầu tiên' : ''}
            </Text>
          </View>
        )}

        {filtered.map(t => {
          const banned = t.status === 'banned';
          return (
            <View key={t.id} style={[styles.card, banned && styles.cardBanned]}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: t.avatar }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{t.name}</Text>
                    {banned && (
                      <View style={styles.bannedBadge}>
                        <Text style={styles.bannedText}>KHOÁ</Text>
                      </View>
                    )}
                    {t.isAvailable && !banned && (
                      <View style={styles.availableBadge}>
                        <Text style={styles.availableText}>NHẬN LỚP</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.metaText}>{t.phone}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.metaText}>{t.rating} ({t.reviews})</Text>
                  </View>
                  <View style={styles.subjectsRow}>
                    {t.subjects.slice(0, 3).map((sub, i) => (
                      <View key={i} style={styles.subjectTag}>
                        <Text style={styles.subjectTagText}>{sub}</Text>
                      </View>
                    ))}
                    {t.subjects.length > 3 && (
                      <Text style={styles.moreText}>+{t.subjects.length - 3}</Text>
                    )}
                  </View>
                  {t.price > 0 && (
                    <Text style={styles.priceText}>
                      {(t.price / 1000).toFixed(0)}k/buổi · {t.experience} năm KN
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleResetPassword(t)}
                >
                  <Ionicons name="key-outline" size={16} color="#7C3AED" />
                  <Text style={styles.actionBtnText}>Reset pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, banned && { backgroundColor: '#F0FDF4' }]}
                  onPress={() => handleToggleBan(t)}
                >
                  <Ionicons
                    name={banned ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={16}
                    color={banned ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[styles.actionBtnText, { color: banned ? '#10B981' : '#EF4444' }]}>
                    {banned ? 'Mở khoá' : 'Khoá'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardBanned: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  bannedBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  bannedText: { fontSize: 9, color: '#DC2626', fontWeight: 'bold' },
  availableBadge: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  availableText: { fontSize: 9, color: '#059669', fontWeight: 'bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: '#9CA3AF' },
  metaDot: { color: '#D1D5DB' },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  subjectTag: { backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subjectTagText: { fontSize: 10, color: '#7C3AED', fontWeight: '600' },
  moreText: { fontSize: 10, color: '#9CA3AF', alignSelf: 'center' },
  priceText: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 6 },
  actionsRow: {
    flexDirection: 'row', gap: 8, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#F5F3FF', paddingVertical: 10, borderRadius: 10,
  },
  actionBtnText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
});
